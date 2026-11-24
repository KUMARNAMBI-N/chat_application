from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(default=None, max_length=64)
    language: Optional[str] = Field(default=None, max_length=16)
    page_context: Optional[Dict[str, Any]] = None


class ConfirmActionRequest(BaseModel):
    conversation_id: str = Field(..., min_length=8, max_length=64)
    action_id: str = Field(..., min_length=4, max_length=64)
    action_type: Literal["add_to_cart", "update_cart_quantity", "remove_from_cart"]
    payload: Dict[str, Any] = Field(default_factory=dict)
    confirmed: bool = True
