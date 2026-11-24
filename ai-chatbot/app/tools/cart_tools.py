import time
import uuid
from typing import Any, Dict, Optional

from app.dependencies import UserContext
from app.integrations.ecommerce_api import ecommerce_api
from app.models.response import PendingActionData

PENDING_ACTION_TTL_SECONDS = 600.0  # 10 minutes


def register_pending_action(state: Dict[str, Any], action: Dict[str, Any]) -> None:
    """Persist a server-authoritative pending action in conversation context_state."""
    actions = dict(state.get("pending_actions") or {})
    now = time.time()
    # Prune expired entries older than 1 hour to prevent unbounded state growth
    actions = {k: v for k, v in actions.items() if now - float(v.get("created_ts", 0)) < 3600}
    actions[action["action_id"]] = {
        "action_id": action["action_id"],
        "action_type": action["action_type"],
        "payload": action.get("payload", {}),
        "status": "PENDING_CONFIRMATION",
        "created_ts": now,
    }
    state["pending_actions"] = actions
    state["last_pending_action"] = action


async def get_cart_tool(user: UserContext) -> Dict[str, Any]:
    cart = await ecommerce_api.get_cart(token=user.token, session_id=user.session_id)
    return {
        "cart_id": cart.get("cartId"),
        "items": cart.get("items", []),
        "summary": cart.get("summary", {}),
    }


async def prepare_add_to_cart_tool(
    slug: str,
    quantity: int = 1,
    color: Optional[str] = None,
    size: Optional[str] = None,
) -> Dict[str, Any]:
    """Never mutates cart directly — validates fresh stock/price and returns a confirmation request."""
    qty = max(1, min(int(quantity), 20))
    product = await ecommerce_api.get_product_by_slug(slug, fresh=True)
    stock = int(product.get("stock", 0))
    if stock < qty:
        return {
            "error": f"Only {stock} units of {product['name']} are currently in stock.",
            "available_stock": stock,
        }

    price = float(product["price"])
    images = product.get("images") or []
    action = PendingActionData(
        action_id=f"act_{uuid.uuid4().hex[:12]}",
        action_type="add_to_cart",
        title="Confirm Add to Cart",
        summary=f"Add {qty} × {product['name']} (₹{price:,.0f} each) to your cart?",
        payload={
            "productId": int(product["id"]),
            "slug": product["slug"],
            "name": product["name"],
            "price": price,
            "quantity": qty,
            "color": color,
            "size": size,
            "stock": stock,
            "image": images[0] if images else "",
        },
    )
    return {
        "confirmation_required": True,
        "message": f"Ready to add {qty} × {product['name']} (₹{price:,.0f}) to cart. Awaiting user confirmation.",
        "_ui_pending_action": action.model_dump(),
    }


async def prepare_update_cart_quantity_tool(
    cart_item_id: int,
    product_name: str,
    quantity: int,
) -> Dict[str, Any]:
    qty = max(0, min(int(quantity), 20))
    action = PendingActionData(
        action_id=f"act_{uuid.uuid4().hex[:12]}",
        action_type="update_cart_quantity",
        title="Confirm Cart Quantity Update",
        summary=f"Update quantity of {product_name} to {qty}?",
        payload={"cartItemId": int(cart_item_id), "productName": product_name, "quantity": qty},
    )
    return {
        "confirmation_required": True,
        "message": f"Ready to update {product_name} quantity to {qty}. Awaiting user confirmation.",
        "_ui_pending_action": action.model_dump(),
    }


async def prepare_remove_from_cart_tool(
    cart_item_id: int,
    product_name: str,
) -> Dict[str, Any]:
    action = PendingActionData(
        action_id=f"act_{uuid.uuid4().hex[:12]}",
        action_type="remove_from_cart",
        title="Confirm Remove from Cart",
        summary=f"Remove {product_name} from your cart?",
        payload={"cartItemId": int(cart_item_id), "productName": product_name},
    )
    return {
        "confirmation_required": True,
        "message": f"Ready to remove {product_name} from cart. Awaiting user confirmation.",
        "_ui_pending_action": action.model_dump(),
    }


async def execute_confirmed_cart_action(
    action_type: str,
    payload: Dict[str, Any],
    user: UserContext,
) -> Dict[str, Any]:
    if action_type == "add_to_cart":
        res = await ecommerce_api.add_to_cart(
            product_id=int(payload["productId"]),
            quantity=max(1, int(payload.get("quantity", 1))),
            token=user.token,
            session_id=user.session_id,
            color=payload.get("color"),
            size=payload.get("size"),
        )
        return {"success": True, "message": f"Added {payload.get('quantity', 1)} × {payload.get('name', 'item')} to your cart.", "data": res}

    if action_type == "update_cart_quantity":
        res = await ecommerce_api.update_cart_item(
            item_id=int(payload["cartItemId"]),
            quantity=int(payload["quantity"]),
            token=user.token,
            session_id=user.session_id,
        )
        return {"success": True, "message": f"Updated {payload.get('productName', 'item')} quantity to {payload['quantity']}.", "data": res}

    if action_type == "remove_from_cart":
        res = await ecommerce_api.remove_cart_item(
            item_id=int(payload["cartItemId"]),
            token=user.token,
            session_id=user.session_id,
        )
        return {"success": True, "message": f"Removed {payload.get('productName', 'item')} from your cart.", "data": res}

    return {"success": False, "message": f"Unsupported action type: {action_type}"}
