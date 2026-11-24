import time
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.ai_engine import ai_engine
from app.core.conversation_manager import conversation_manager
from app.dependencies import UserContext, enforce_rate_limit, get_user_context
from app.models.request import ChatRequest, ConfirmActionRequest
from app.models.response import ActionResultResponse, ChatResponse
from app.tools.cart_tools import PENDING_ACTION_TTL_SECONDS, execute_confirmed_cart_action

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse, dependencies=[Depends(enforce_rate_limit)])
async def post_chat(
    body: ChatRequest,
    user: UserContext = Depends(get_user_context),
):
    try:
        return await ai_engine.chat(
            raw_message=body.message,
            user=user,
            conversation_id=body.conversation_id,
            language=body.language,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/stream", dependencies=[Depends(enforce_rate_limit)])
async def post_chat_stream(
    body: ChatRequest,
    user: UserContext = Depends(get_user_context),
):
    return StreamingResponse(
        ai_engine.chat_stream(
            raw_message=body.message,
            user=user,
            conversation_id=body.conversation_id,
            language=body.language,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/confirm-action", response_model=ActionResultResponse, dependencies=[Depends(enforce_rate_limit)])
async def confirm_action(
    body: ConfirmActionRequest,
    user: UserContext = Depends(get_user_context),
):
    # Authoritative server-side Pending Action State Machine (isolated by conversation + owner)
    state = conversation_manager.get_context_state(body.conversation_id, user)
    pending_map = dict(state.get("pending_actions") or {})
    record = pending_map.get(body.action_id)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending action not found for this conversation or user.",
        )

    current_status = record.get("status")
    created_ts = float(record.get("created_ts", 0))

    # Idempotency: duplicate Confirm click / network retry does NOT execute twice
    if current_status == "EXECUTED":
        return ActionResultResponse(
            success=True,
            message="This action was already completed.",
            action_type=record["action_type"],
        )

    if current_status == "CANCELLED":
        return ActionResultResponse(
            success=False,
            message="This action was already cancelled.",
            action_type=record["action_type"],
        )

    # Expiration check (TTL = 10 minutes)
    if (time.time() - created_ts) > PENDING_ACTION_TTL_SECONDS:
        record["status"] = "EXPIRED"
        pending_map[body.action_id] = record
        state["pending_actions"] = pending_map
        conversation_manager.update_context_state(body.conversation_id, user, state)
        return ActionResultResponse(
            success=False,
            message="This confirmation has expired. Please ask again if you still want to update your cart.",
            action_type=record["action_type"],
        )

    if not body.confirmed:
        record["status"] = "CANCELLED"
        pending_map[body.action_id] = record
        state["pending_actions"] = pending_map
        state.pop("last_pending_action", None)
        conversation_manager.update_context_state(body.conversation_id, user, state)
        conversation_manager.append_message(
            body.conversation_id,
            "assistant",
            "Action cancelled. Let me know if you'd like anything else!",
        )
        return ActionResultResponse(success=True, message="Action cancelled.", action_type=record["action_type"])

    # Execute strictly using server-stored action_type & payload (NEVER trust client payload!)
    result = await execute_confirmed_cart_action(record["action_type"], record["payload"], user)
    if result.get("success"):
        record["status"] = "EXECUTED"
        pending_map[body.action_id] = record
        state["pending_actions"] = pending_map
        state.pop("last_pending_action", None)
        conversation_manager.update_context_state(body.conversation_id, user, state)
        conversation_manager.append_message(body.conversation_id, "assistant", result["message"])
    return ActionResultResponse(
        success=bool(result.get("success")),
        message=result.get("message", "Done."),
        action_type=record["action_type"],
        data=result.get("data"),
    )
