import json
import re
import time
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

from app.config import get_settings
from app.core.context_extractor import (
    detect_cart_add_intent,
    match_brand_from_metadata,
    match_category_from_metadata,
    update_context_from_user_message,
)
from app.core.conversation_manager import conversation_manager
from app.core.intent_classifier import detect_language_hint, status_for_tool
from app.core.prompt_manager import build_system_prompt
from app.core.safety import detect_prompt_injection, sanitize_output_text
from app.core.tool_router import OPENAI_TOOLS, execute_tool
from app.dependencies import UserContext
from app.integrations.catalog_metadata import CatalogMetadata, catalog_metadata_store
from app.integrations.openai_client import OpenAIServiceError, openai_client
from app.models.response import (
    ChatResponse,
    OrderCardData,
    PendingActionData,
    ProductCardData,
    ProductComparisonData,
    TokenUsage,
)
from app.tools.cart_tools import prepare_add_to_cart_tool, register_pending_action
from app.tools.product_tools import search_products_tool
from app.tools.support_tools import get_coupon_information_tool, get_shipping_information_tool
from app.utils.logging import logger
from app.utils.validation import sanitize_conversation_id, sanitize_user_message


def _deduplicate_card_text(text: str, products: List[ProductCardData]) -> str:
    """
    When structured product cards are rendered alongside assistant text, remove redundant
    numbered/bulleted product-list dumps (Name + Price + Rating + Link) so products are
    shown once as interactive cards while preserving the concise intro & reasoning.
    """
    if not products or not text:
        return text

    # Check if text contains a numbered product list duplicating card details
    has_numbered_dump = bool(re.search(r"^\s*1\.\s+\*\*|^\s*-\s+\*\*Price\*\*:", text, re.MULTILINE))
    if not has_numbered_dump:
        return text

    # Keep the intro paragraph before item "1." and any closing question/recommendation after the list
    lines = text.splitlines()
    kept: List[str] = []
    in_list = False
    for line in lines:
        stripped = line.strip()
        if re.match(r"^\d+\.\s+", stripped):
            in_list = True
            continue
        if in_list:
            # Skip indented or bulleted detail lines belonging to the numbered product item
            if stripped == "" or re.match(r"^[-*•]\s+", stripped) or re.match(r"^(?:Price|Rating|Stock|Brand|Discount|\[View)", stripped, re.IGNORECASE):
                continue
            in_list = False
        kept.append(line)

    cleaned = "\n".join(kept).strip()
    if len(cleaned) >= 18:
        return cleaned

    best = max(products, key=lambda p: (p.rating, p.reviews_count))
    cheapest = min(products, key=lambda p: p.price)
    if best.id == cheapest.id or len(products) == 1:
        return f"I found {len(products)} matching option{'s' if len(products) != 1 else ''}. **{best.name}** stands out with a {best.rating:.1f}★ rating at ₹{best.price:,.0f}."
    return (
        f"I found {len(products)} matching options. **{best.name}** is the highest rated ({best.rating:.1f}★), "
        f"while **{cheapest.name}** is the most budget-friendly at ₹{cheapest.price:,.0f}."
    )


def _sse(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _default_suggestions(has_products: bool, is_auth: bool) -> List[str]:
    if has_products:
        return ["Compare the first two", "Show cheaper options", "Filter by 4★ and above", "Show my cart"]
    if is_auth:
        return ["Track my latest order", "Show top-rated deals", "Show active coupons", "Browse categories"]
    return ["Browse categories", "Show top-rated deals", "Show active coupons", "Shipping & GST policy"]


async def _degraded_catalog_fallback(
    message: str,
    user: UserContext,
    reason: str,
    metadata: Optional[CatalogMetadata] = None,
) -> Tuple[str, List[ProductCardData]]:
    """Graceful fallback when OpenAI API key is missing or OpenAI is temporarily unavailable."""
    low = message.lower()
    if any(k in low for k in ["shipping", "delivery", "gst", "tax"]):
        info = get_shipping_information_tool()
        return (
            f"{info['note']}\n\n_(AI conversational mode is currently running in fallback mode: {reason})_",
            [],
        )
    if any(k in low for k in ["coupon", "discount", "promo", "offer"]):
        info = await get_coupon_information_tool()
        coupons = info.get("active_coupons") or []
        if coupons:
            codes = ", ".join(f"**{c['code']}** ({c['discount']}, min ₹{c['min_order_inr']:,.0f})" for c in coupons[:6])
            return (
                f"Active ABC Cart coupons: {codes}. Apply them on the Cart page (/carrinho).\n\n_(Fallback mode: {reason})_",
                [],
            )
        return (
            f"{info.get('message') or info.get('error') or 'No active coupons found.'}\n\n_(Fallback mode: {reason})_",
            [],
        )

    max_price = None
    m_price = re.search(r"(?:under|below|less than|menos de|₹|rs\.?)\s*(\d[\d,]*)", low)
    if m_price:
        max_price = float(m_price.group(1).replace(",", ""))

    meta = metadata or await catalog_metadata_store.get_metadata()
    cat = match_category_from_metadata(message, meta.categories)
    brand = match_brand_from_metadata(message, meta.brands)

    try:
        search_term = None if (cat or brand) else message[:40]
        res = await search_products_tool(search=search_term, category=cat, brand=brand, max_price=max_price, limit=4)
        cards = [ProductCardData(**p) for p in res.get("_ui_products", [])]
        if cards:
            return (
                f"I searched the live ABC Cart catalog and found **{len(cards)} matching products** for you.\n\n"
                f"_(Note: OpenAI conversational reasoning is currently unavailable — {reason}.)_",
                cards,
            )
    except Exception as exc:
        logger.warning("Fallback catalog search failed: %s", exc)

    return (
        f"I couldn't reach the AI model right now ({reason}). Please check `OPENAI_API_KEY` in `ai-chatbot/.env` or browse the live catalog at `/produtos`.",
        [],
    )


class AIEngine:
    async def chat(
        self,
        raw_message: str,
        user: UserContext,
        conversation_id: Optional[str] = None,
        language: Optional[str] = None,
    ) -> ChatResponse:
        settings = get_settings()
        message = sanitize_user_message(raw_message, max_length=settings.max_message_length)
        cid_clean = sanitize_conversation_id(conversation_id)
        cid = conversation_manager.get_or_create_conversation(user, cid_clean, initial_title=message[:60])

        injected, refusal = detect_prompt_injection(message)
        if injected:
            conversation_manager.append_message(cid, "user", message)
            conversation_manager.append_message(cid, "assistant", refusal)
            return ChatResponse(
                conversation_id=cid,
                message=refusal,
                suggested_questions=_default_suggestions(False, user.is_authenticated),
            )

        lang_hint = language or detect_language_hint(message)
        history = conversation_manager.get_context_messages(cid, user)
        context_state = conversation_manager.get_context_state(cid, user)
        metadata = await catalog_metadata_store.get_metadata()
        update_context_from_user_message(message, context_state, metadata)
        if message.strip().lower() in ("cancel", "cancel.", "no", "nevermind"):
            context_state.pop("last_pending_action", None)
        conversation_manager.append_message(cid, "user", message)

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": build_system_prompt(user, lang_hint, context_state)},
            *history,
            {"role": "user", "content": message},
        ]

        ui_products: List[ProductCardData] = []
        ui_orders: List[OrderCardData] = []
        ui_comparison: Optional[ProductComparisonData] = None
        ui_pending_action: Optional[PendingActionData] = None
        usage = TokenUsage()

        try:
            final_text = ""
            for _ in range(4):
                completion = await openai_client.create_completion(messages=messages, tools=OPENAI_TOOLS)
                if getattr(completion, "usage", None):
                    usage.prompt_tokens += int(completion.usage.prompt_tokens or 0)
                    usage.completion_tokens += int(completion.usage.completion_tokens or 0)
                    usage.total_tokens += int(completion.usage.total_tokens or 0)

                choice_msg = completion.choices[0].message
                tool_calls = getattr(choice_msg, "tool_calls", None) or []

                if not tool_calls:
                    final_text = sanitize_output_text(choice_msg.content or "")
                    break

                messages.append(
                    {
                        "role": "assistant",
                        "content": choice_msg.content or "",
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                            }
                            for tc in tool_calls
                        ],
                    }
                )

                for tc in tool_calls:
                    result_payload, artifacts = await execute_tool(tc.function.name, tc.function.arguments, user, context_state)
                    if "_ui_products" in artifacts:
                        ui_products = [ProductCardData(**p) for p in artifacts["_ui_products"]]
                    if "_ui_orders" in artifacts:
                        ui_orders = [OrderCardData(**o) for o in artifacts["_ui_orders"]]
                    if "_ui_comparison" in artifacts:
                        ui_comparison = ProductComparisonData(**artifacts["_ui_comparison"])
                    if "_ui_pending_action" in artifacts:
                        ui_pending_action = PendingActionData(**artifacts["_ui_pending_action"])

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": json.dumps(result_payload, ensure_ascii=False),
                        }
                    )

            # Deterministic safety net: if user requested adding a referenced item to cart
            # and the LLM didn't emit a pending_action tool call, prepare it deterministically.
            if ui_pending_action is None:
                cart_intent = detect_cart_add_intent(message, context_state)
                if cart_intent:
                    slug_to_add, qty_to_add = cart_intent
                    try:
                        prep = await prepare_add_to_cart_tool(slug=slug_to_add, quantity=qty_to_add)
                        if prep.get("_ui_pending_action"):
                            ui_pending_action = PendingActionData(**prep["_ui_pending_action"])
                            register_pending_action(context_state, prep["_ui_pending_action"])
                            final_text = f"Would you like to add **{ui_pending_action.payload['name']}** (Qty: {qty_to_add}, ₹{ui_pending_action.payload['price']:,.0f}) to your cart? Please click **Confirm** or **Cancel** below."
                    except Exception as exc:
                        logger.warning("Deterministic cart intent prep failed: %s", exc)

            if ui_products:
                final_text = _deduplicate_card_text(final_text, ui_products)

            if not final_text:
                final_text = "Here is what I found for you on ABC Cart."

            conversation_manager.update_context_state(cid, user, context_state)
            conversation_manager.append_message(
                cid,
                "assistant",
                final_text,
                metadata={
                    "products": [p.model_dump() for p in ui_products],
                    "orders": [o.model_dump() for o in ui_orders],
                    "comparison": ui_comparison.model_dump() if ui_comparison else None,
                    "pending_action": ui_pending_action.model_dump() if ui_pending_action else None,
                },
            )
            if usage.total_tokens > 0:
                conversation_manager.record_usage(
                    cid, user, settings.openai_model, usage.prompt_tokens, usage.completion_tokens, usage.total_tokens
                )

            logger.info(
                "chat_turn %s",
                json.dumps(
                    {
                        "turn_id": uuid.uuid4().hex[:10],
                        "conversation_id": cid,
                        "authenticated": user.is_authenticated,
                        "products_returned": len(ui_products),
                        "orders_returned": len(ui_orders),
                        "has_comparison": ui_comparison is not None,
                        "pending_action_id": ui_pending_action.action_id if ui_pending_action else None,
                        "applied_filters": context_state.get("filters", {}),
                        "tokens": usage.total_tokens,
                        "degraded": False,
                    },
                    ensure_ascii=False,
                ),
            )

            return ChatResponse(
                conversation_id=cid,
                message=final_text,
                products=ui_products,
                orders=ui_orders,
                comparison=ui_comparison,
                pending_action=ui_pending_action,
                suggested_questions=_default_suggestions(bool(ui_products), user.is_authenticated),
                usage=usage,
                degraded=False,
            )

        except OpenAIServiceError as exc:
            fallback_text, fallback_products = await _degraded_catalog_fallback(message, user, str(exc))
            conversation_manager.append_message(
                cid,
                "assistant",
                fallback_text,
                metadata={"products": [p.model_dump() for p in fallback_products], "degraded": True},
            )
            return ChatResponse(
                conversation_id=cid,
                message=fallback_text,
                products=fallback_products,
                suggested_questions=_default_suggestions(bool(fallback_products), user.is_authenticated),
                degraded=True,
            )

    async def chat_stream(
        self,
        raw_message: str,
        user: UserContext,
        conversation_id: Optional[str] = None,
        language: Optional[str] = None,
    ) -> AsyncIterator[str]:
        settings = get_settings()
        try:
            message = sanitize_user_message(raw_message, max_length=settings.max_message_length)
            cid_clean = sanitize_conversation_id(conversation_id)
        except ValueError as exc:
            yield _sse("error", {"message": str(exc)})
            return

        cid = conversation_manager.get_or_create_conversation(user, cid_clean, initial_title=message[:60])
        yield _sse("meta", {"conversation_id": cid})
        yield _sse("status", {"message": "Understanding your request..."})

        injected, refusal = detect_prompt_injection(message)
        if injected:
            conversation_manager.append_message(cid, "user", message)
            conversation_manager.append_message(cid, "assistant", refusal)
            yield _sse("token", {"content": refusal})
            yield _sse("done", {"conversation_id": cid, "suggested_questions": _default_suggestions(False, user.is_authenticated)})
            return

        lang_hint = language or detect_language_hint(message)
        history = conversation_manager.get_context_messages(cid, user)
        context_state = conversation_manager.get_context_state(cid, user)
        metadata = await catalog_metadata_store.get_metadata()
        update_context_from_user_message(message, context_state, metadata)
        if message.strip().lower() in ("cancel", "cancel.", "no", "nevermind"):
            context_state.pop("last_pending_action", None)
        conversation_manager.append_message(cid, "user", message)

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": build_system_prompt(user, lang_hint, context_state)},
            *history,
            {"role": "user", "content": message},
        ]

        ui_products: List[ProductCardData] = []
        ui_orders: List[OrderCardData] = []
        ui_comparison: Optional[ProductComparisonData] = None
        ui_pending_action: Optional[PendingActionData] = None
        usage = TokenUsage()

        try:
            did_tools = False
            direct_text = ""

            for _ in range(4):
                completion = await openai_client.create_completion(messages=messages, tools=OPENAI_TOOLS)
                if getattr(completion, "usage", None):
                    usage.prompt_tokens += int(completion.usage.prompt_tokens or 0)
                    usage.completion_tokens += int(completion.usage.completion_tokens or 0)
                    usage.total_tokens += int(completion.usage.total_tokens or 0)

                choice_msg = completion.choices[0].message
                tool_calls = getattr(choice_msg, "tool_calls", None) or []

                if not tool_calls:
                    direct_text = sanitize_output_text(choice_msg.content or "")
                    break

                did_tools = True
                messages.append(
                    {
                        "role": "assistant",
                        "content": choice_msg.content or "",
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                            }
                            for tc in tool_calls
                        ],
                    }
                )

                for tc in tool_calls:
                    yield _sse("status", {"message": status_for_tool(tc.function.name)})
                    result_payload, artifacts = await execute_tool(tc.function.name, tc.function.arguments, user, context_state)

                    if "_ui_products" in artifacts:
                        ui_products = [ProductCardData(**p) for p in artifacts["_ui_products"]]
                        yield _sse("products", {"products": [p.model_dump() for p in ui_products]})
                    if "_ui_orders" in artifacts:
                        ui_orders = [OrderCardData(**o) for o in artifacts["_ui_orders"]]
                        yield _sse("orders", {"orders": [o.model_dump() for o in ui_orders]})
                    if "_ui_comparison" in artifacts:
                        ui_comparison = ProductComparisonData(**artifacts["_ui_comparison"])
                        yield _sse("comparison", ui_comparison.model_dump())
                    if "_ui_pending_action" in artifacts:
                        ui_pending_action = PendingActionData(**artifacts["_ui_pending_action"])
                        yield _sse("confirmation", ui_pending_action.model_dump())

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": json.dumps(result_payload, ensure_ascii=False),
                        }
                    )

            # Deterministic safety net for streaming cart confirmation
            if ui_pending_action is None:
                cart_intent = detect_cart_add_intent(message, context_state)
                if cart_intent:
                    slug_to_add, qty_to_add = cart_intent
                    try:
                        prep = await prepare_add_to_cart_tool(slug=slug_to_add, quantity=qty_to_add)
                        if prep.get("_ui_pending_action"):
                            ui_pending_action = PendingActionData(**prep["_ui_pending_action"])
                            register_pending_action(context_state, prep["_ui_pending_action"])
                            yield _sse("confirmation", ui_pending_action.model_dump())
                            if not direct_text and not did_tools:
                                direct_text = f"Would you like to add **{ui_pending_action.payload['name']}** (Qty: {qty_to_add}, ₹{ui_pending_action.payload['price']:,.0f}) to your cart? Please click **Confirm** or **Cancel** below."
                    except Exception as exc:
                        logger.warning("Deterministic stream cart intent prep failed: %s", exc)

            yield _sse("status", {"message": "Preparing response..."})

            # Stream final answer smoothly (deduplicating redundant product lists when cards are shown)
            accumulated = ""
            if direct_text:
                final_direct = _deduplicate_card_text(direct_text, ui_products) if ui_products else direct_text
                words = final_direct.split(" ")
                for idx, w in enumerate(words):
                    piece = w if idx == 0 else " " + w
                    accumulated += piece
                    yield _sse("token", {"content": piece})
            elif did_tools:
                if ui_products:
                    # Buffer short response when cards exist so duplicate bullet dumps are stripped cleanly before emitting
                    raw_buf = ""
                    async for chunk in openai_client.stream_completion(messages=messages):
                        raw_buf += sanitize_output_text(chunk)
                    cleaned_buf = _deduplicate_card_text(raw_buf, ui_products)
                    words = cleaned_buf.split(" ")
                    for idx, w in enumerate(words):
                        piece = w if idx == 0 else " " + w
                        accumulated += piece
                        yield _sse("token", {"content": piece})
                else:
                    async for chunk in openai_client.stream_completion(messages=messages):
                        safe_chunk = sanitize_output_text(chunk)
                        accumulated += safe_chunk
                        yield _sse("token", {"content": safe_chunk})

            final_text = accumulated or "Here is what I found for you on ABC Cart."
            conversation_manager.update_context_state(cid, user, context_state)
            conversation_manager.append_message(
                cid,
                "assistant",
                final_text,
                metadata={
                    "products": [p.model_dump() for p in ui_products],
                    "orders": [o.model_dump() for o in ui_orders],
                    "comparison": ui_comparison.model_dump() if ui_comparison else None,
                    "pending_action": ui_pending_action.model_dump() if ui_pending_action else None,
                },
            )
            if usage.total_tokens > 0:
                conversation_manager.record_usage(
                    cid, user, settings.openai_model, usage.prompt_tokens, usage.completion_tokens, usage.total_tokens
                )

            logger.info(
                "chat_turn %s",
                json.dumps(
                    {
                        "turn_id": uuid.uuid4().hex[:10],
                        "conversation_id": cid,
                        "authenticated": user.is_authenticated,
                        "products_returned": len(ui_products),
                        "orders_returned": len(ui_orders),
                        "has_comparison": ui_comparison is not None,
                        "pending_action_id": ui_pending_action.action_id if ui_pending_action else None,
                        "applied_filters": context_state.get("filters", {}),
                        "tokens": usage.total_tokens,
                        "degraded": False,
                    },
                    ensure_ascii=False,
                ),
            )

            yield _sse(
                "done",
                {
                    "conversation_id": cid,
                    "suggested_questions": _default_suggestions(bool(ui_products), user.is_authenticated),
                    "usage": usage.model_dump(),
                    "degraded": False,
                },
            )

        except OpenAIServiceError as exc:
            yield _sse("status", {"message": "Searching live catalog..."})
            fallback_text, fallback_products = await _degraded_catalog_fallback(message, user, str(exc))
            if fallback_products:
                yield _sse("products", {"products": [p.model_dump() for p in fallback_products]})
            yield _sse("token", {"content": fallback_text})
            conversation_manager.append_message(
                cid,
                "assistant",
                fallback_text,
                metadata={"products": [p.model_dump() for p in fallback_products], "degraded": True},
            )
            yield _sse(
                "done",
                {
                    "conversation_id": cid,
                    "suggested_questions": _default_suggestions(bool(fallback_products), user.is_authenticated),
                    "degraded": True,
                },
            )


ai_engine = AIEngine()
