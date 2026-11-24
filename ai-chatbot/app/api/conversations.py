from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.conversation_manager import conversation_manager
from app.dependencies import UserContext, get_user_context
from app.models.conversation import ConversationDetail, ConversationSummary

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=List[ConversationSummary])
async def list_conversations(user: UserContext = Depends(get_user_context)):
    return conversation_manager.list_conversations(user)


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(conversation_id: str, user: UserContext = Depends(get_user_context)):
    detail = conversation_manager.get_conversation(conversation_id, user)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return detail


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str, user: UserContext = Depends(get_user_context)):
    deleted = conversation_manager.delete_conversation(conversation_id, user)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return {"deleted": True, "conversation_id": conversation_id}
