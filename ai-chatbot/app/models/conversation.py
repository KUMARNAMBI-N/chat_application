from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class StoredMessage(BaseModel):
    id: Optional[int] = None
    role: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ConversationSummary(BaseModel):
    conversation_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class ConversationDetail(BaseModel):
    conversation_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[StoredMessage] = Field(default_factory=list)
