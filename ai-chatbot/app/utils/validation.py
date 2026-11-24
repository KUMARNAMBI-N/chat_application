import re
from typing import Optional


def sanitize_user_message(message: str, max_length: int = 2000) -> str:
    cleaned = (message or "").strip()
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)
    if len(cleaned) > max_length:
        raise ValueError(f"Message exceeds maximum length of {max_length} characters.")
    if not cleaned:
        raise ValueError("Message cannot be empty.")
    return cleaned


def sanitize_conversation_id(conversation_id: Optional[str]) -> Optional[str]:
    if not conversation_id:
        return None
    cid = conversation_id.strip()
    if not re.fullmatch(r"[a-zA-Z0-9_-]{8,64}", cid):
        raise ValueError("Invalid conversation ID format.")
    return cid
