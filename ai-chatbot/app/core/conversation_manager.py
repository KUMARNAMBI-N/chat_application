import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.rows import dict_row

from app.config import get_settings
from app.dependencies import UserContext
from app.models.conversation import ConversationDetail, ConversationSummary, StoredMessage
from app.utils.logging import logger

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    conversation_id VARCHAR(64) PRIMARY KEY,
    owner_key VARCHAR(128) NOT NULL,
    user_id INTEGER,
    session_id VARCHAR(128),
    title VARCHAR(200) NOT NULL DEFAULT 'New shopping chat',
    summary TEXT,
    context_state JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE chatbot_conversations
    ADD COLUMN IF NOT EXISTS context_state JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS chatbot_messages (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES chatbot_conversations(conversation_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chatbot_usage (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(64) REFERENCES chatbot_conversations(conversation_id) ON DELETE SET NULL,
    owner_key VARCHAR(128) NOT NULL,
    model VARCHAR(100),
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"""


class ConversationManager:
    """Stores conversations in PostgreSQL (abccart) with safe in-memory fallback."""

    def __init__(self) -> None:
        self._db_ready = False
        self._mem_convs: Dict[str, Dict[str, Any]] = {}
        self._mem_msgs: Dict[str, List[StoredMessage]] = {}

    def init_storage(self) -> None:
        settings = get_settings()
        if settings.disable_db_persistence:
            self._db_ready = False
            return
        try:
            with psycopg.connect(settings.pg_conninfo, autocommit=True) as conn:
                with conn.cursor() as cur:
                    cur.execute(SCHEMA_SQL)
            self._db_ready = True
            logger.info("Chatbot PostgreSQL tables initialized in %s", settings.pgdatabase)
        except Exception as exc:
            self._db_ready = False
            logger.warning("PostgreSQL unavailable for chatbot persistence; using memory fallback: %s", exc)

    def _connect(self):
        return psycopg.connect(get_settings().pg_conninfo, row_factory=dict_row, autocommit=True)

    def get_or_create_conversation(
        self,
        user: UserContext,
        conversation_id: Optional[str] = None,
        initial_title: Optional[str] = None,
    ) -> str:
        cid = conversation_id or f"conv_{uuid.uuid4().hex[:16]}"
        title = (initial_title or "New shopping chat").strip()[:120] or "New shopping chat"
        now = datetime.now(timezone.utc)

        if self._db_ready:
            with self._connect() as conn, conn.cursor() as cur:
                cur.execute(
                    "SELECT conversation_id, owner_key FROM chatbot_conversations WHERE conversation_id = %s",
                    (cid,),
                )
                row = cur.fetchone()
                if row:
                    if row["owner_key"] != user.owner_key:
                        # Ownership protection: issue a fresh conversation for this owner
                        cid = f"conv_{uuid.uuid4().hex[:16]}"
                    else:
                        return cid
                cur.execute(
                    """
                    INSERT INTO chatbot_conversations (conversation_id, owner_key, user_id, session_id, title, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (cid, user.owner_key, user.user_id, user.session_id, title, now, now),
                )
                return cid

        existing = self._mem_convs.get(cid)
        if existing and existing["owner_key"] == user.owner_key:
            return cid
        if existing and existing["owner_key"] != user.owner_key:
            cid = f"conv_{uuid.uuid4().hex[:16]}"
        self._mem_convs[cid] = {
            "conversation_id": cid,
            "owner_key": user.owner_key,
            "title": title,
            "context_state": {},
            "created_at": now,
            "updated_at": now,
        }
        self._mem_msgs.setdefault(cid, [])
        return cid

    def get_context_state(self, conversation_id: str, user: UserContext) -> Dict[str, Any]:
        if self._db_ready:
            try:
                with self._connect() as conn, conn.cursor() as cur:
                    cur.execute(
                        "SELECT context_state FROM chatbot_conversations WHERE conversation_id = %s AND owner_key = %s",
                        (conversation_id, user.owner_key),
                    )
                    row = cur.fetchone()
                    if row and isinstance(row.get("context_state"), dict):
                        return dict(row["context_state"])
            except Exception as exc:
                logger.warning("Failed to read context_state: %s", exc)
            return {}

        conv = self._mem_convs.get(conversation_id)
        if conv and conv["owner_key"] == user.owner_key:
            return dict(conv.get("context_state") or {})
        return {}

    def update_context_state(self, conversation_id: str, user: UserContext, state: Dict[str, Any]) -> None:
        now = datetime.now(timezone.utc)
        if self._db_ready:
            try:
                with self._connect() as conn, conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE chatbot_conversations
                        SET context_state = %s::jsonb, updated_at = %s
                        WHERE conversation_id = %s AND owner_key = %s
                        """,
                        (json.dumps(state, ensure_ascii=False), now, conversation_id, user.owner_key),
                    )
            except Exception as exc:
                logger.warning("Failed to update context_state: %s", exc)
            return

        conv = self._mem_convs.get(conversation_id)
        if conv and conv["owner_key"] == user.owner_key:
            conv["context_state"] = dict(state)
            conv["updated_at"] = now

    def append_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        meta = metadata or {}
        if self._db_ready:
            with self._connect() as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO chatbot_messages (conversation_id, role, content, metadata, created_at)
                    VALUES (%s, %s, %s, %s::jsonb, %s)
                    """,
                    (conversation_id, role, content, json.dumps(meta), now),
                )
                cur.execute(
                    "UPDATE chatbot_conversations SET updated_at = %s WHERE conversation_id = %s",
                    (now, conversation_id),
                )
            return

        self._mem_msgs.setdefault(conversation_id, []).append(
            StoredMessage(role=role, content=content, metadata=meta, created_at=now)
        )
        if conversation_id in self._mem_convs:
            self._mem_convs[conversation_id]["updated_at"] = now

    def record_usage(
        self,
        conversation_id: str,
        user: UserContext,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        total_tokens: int,
    ) -> None:
        if not self._db_ready:
            return
        try:
            with self._connect() as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO chatbot_usage (conversation_id, owner_key, model, prompt_tokens, completion_tokens, total_tokens)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (conversation_id, user.owner_key, model, prompt_tokens, completion_tokens, total_tokens),
                )
        except Exception as exc:
            logger.warning("Failed to record token usage: %s", exc)

    def get_context_messages(self, conversation_id: str, user: UserContext) -> List[Dict[str, str]]:
        """Return token-bounded message history (last N messages + compact summary of older turns)."""
        max_msgs = get_settings().max_history_messages
        detail = self.get_conversation(conversation_id, user)
        if not detail:
            return []

        msgs = detail.messages
        if len(msgs) <= max_msgs:
            return [{"role": m.role, "content": m.content} for m in msgs]

        older = msgs[:-max_msgs]
        recent = msgs[-max_msgs:]
        summary_lines = [
            f"{m.role}: {m.content[:120]}" for m in older[-6:]
        ]
        summary_msg = {
            "role": "system",
            "content": "Summary of earlier conversation context:\n" + "\n".join(summary_lines),
        }
        return [summary_msg] + [{"role": m.role, "content": m.content} for m in recent]

    def list_conversations(self, user: UserContext) -> List[ConversationSummary]:
        if self._db_ready:
            with self._connect() as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT c.conversation_id, c.title, c.created_at, c.updated_at,
                           COUNT(m.id)::int AS message_count
                    FROM chatbot_conversations c
                    LEFT JOIN chatbot_messages m ON m.conversation_id = c.conversation_id
                    WHERE c.owner_key = %s
                    GROUP BY c.conversation_id
                    ORDER BY c.updated_at DESC
                    LIMIT 30
                    """,
                    (user.owner_key,),
                )
                return [ConversationSummary(**row) for row in cur.fetchall()]

        out = []
        for cid, conv in self._mem_convs.items():
            if conv["owner_key"] == user.owner_key:
                out.append(
                    ConversationSummary(
                        conversation_id=cid,
                        title=conv["title"],
                        created_at=conv["created_at"],
                        updated_at=conv["updated_at"],
                        message_count=len(self._mem_msgs.get(cid, [])),
                    )
                )
        return sorted(out, key=lambda c: c.updated_at, reverse=True)

    def get_conversation(self, conversation_id: str, user: UserContext) -> Optional[ConversationDetail]:
        if self._db_ready:
            with self._connect() as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT conversation_id, title, created_at, updated_at
                    FROM chatbot_conversations
                    WHERE conversation_id = %s AND owner_key = %s
                    """,
                    (conversation_id, user.owner_key),
                )
                conv = cur.fetchone()
                if not conv:
                    return None
                cur.execute(
                    """
                    SELECT id, role, content, metadata, created_at
                    FROM chatbot_messages
                    WHERE conversation_id = %s
                    ORDER BY id ASC
                    """,
                    (conversation_id,),
                )
                messages = [StoredMessage(**r) for r in cur.fetchall()]
                return ConversationDetail(**conv, messages=messages)

        conv = self._mem_convs.get(conversation_id)
        if not conv or conv["owner_key"] != user.owner_key:
            return None
        return ConversationDetail(
            conversation_id=conv["conversation_id"],
            title=conv["title"],
            created_at=conv["created_at"],
            updated_at=conv["updated_at"],
            messages=list(self._mem_msgs.get(conversation_id, [])),
        )

    def delete_conversation(self, conversation_id: str, user: UserContext) -> bool:
        if self._db_ready:
            with self._connect() as conn, conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM chatbot_conversations WHERE conversation_id = %s AND owner_key = %s",
                    (conversation_id, user.owner_key),
                )
                return cur.rowcount > 0

        conv = self._mem_convs.get(conversation_id)
        if not conv or conv["owner_key"] != user.owner_key:
            return False
        del self._mem_convs[conversation_id]
        self._mem_msgs.pop(conversation_id, None)
        return True


conversation_manager = ConversationManager()
