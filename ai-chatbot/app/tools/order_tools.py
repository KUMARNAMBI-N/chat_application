from typing import Any, Dict, Optional

from app.dependencies import UserContext
from app.integrations.ecommerce_api import ecommerce_api


def _auth_required() -> Dict[str, Any]:
    return {
        "auth_required": True,
        "error": "Please sign in to your ABC Cart account (/login) to view or track your orders.",
    }


def _to_order_card(o: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": int(o.get("id", 0)),
        "order_number": str(o.get("order_number", "")),
        "status": str(o.get("status", "Confirmed")),
        "created_at": str(o.get("created_at", ""))[:10],
        "payment_method": str(o.get("payment_method", "")),
        "payment_status": str(o.get("payment_status", "")),
        "total": float(o.get("total", 0)),
        "shipping_address": o.get("shipping_address"),
        "items": [
            {
                "product_name": str(it.get("product_name", "Item")),
                "quantity": int(it.get("quantity", 1)),
                "price": float(it.get("price", 0)),
                "color": it.get("color"),
                "size": it.get("size"),
                "image_url": it.get("image_url"),
            }
            for it in (o.get("items") or [])
        ],
    }


async def get_order_history_tool(user: UserContext, limit: int = 5) -> Dict[str, Any]:
    if not user.is_authenticated or not user.token:
        return _auth_required()
    orders = await ecommerce_api.get_orders(user.token)
    top_orders = orders[: min(limit, 5)]
    slim = [
        {
            "id": o.get("id"),
            "order_number": o.get("order_number"),
            "status": o.get("status"),
            "payment_method": o.get("payment_method"),
            "payment_status": o.get("payment_status"),
            "total_inr": float(o.get("total", 0)),
            "created_at": str(o.get("created_at", ""))[:10],
            "item_count": len(o.get("items") or []),
            "items": [
                {"name": it.get("product_name"), "qty": it.get("quantity"), "price_inr": float(it.get("price", 0))}
                for it in (o.get("items") or [])
            ],
        }
        for o in top_orders
    ]
    return {
        "total_orders": len(orders),
        "orders": slim,
        "_ui_orders": [_to_order_card(o) for o in top_orders],
    }


async def get_order_details_tool(user: UserContext, order_id: Optional[int] = None, order_number: Optional[str] = None) -> Dict[str, Any]:
    if not user.is_authenticated or not user.token:
        return _auth_required()
    orders = await ecommerce_api.get_orders(user.token)
    target = None
    if order_id is not None:
        target = next((o for o in orders if int(o.get("id", -1)) == int(order_id)), None)
    elif order_number:
        num = order_number.strip().upper()
        target = next((o for o in orders if str(o.get("order_number", "")).upper() == num), None)
    elif orders:
        target = orders[0]

    if not target:
        return {"error": "No matching order found in your account."}

    detail = await ecommerce_api.get_order_by_id(int(target["id"]), user.token)
    return {
        "id": detail.get("id"),
        "order_number": detail.get("order_number"),
        "status": detail.get("status"),
        "payment_method": detail.get("payment_method"),
        "payment_status": detail.get("payment_status"),
        "subtotal_inr": float(detail.get("subtotal", 0)),
        "discount_inr": float(detail.get("discount", 0)),
        "shipping_inr": float(detail.get("shipping", 0)),
        "gst_inr": float(detail.get("gst", 0)),
        "total_inr": float(detail.get("total", 0)),
        "shipping_address": detail.get("shipping_address"),
        "created_at": str(detail.get("created_at", ""))[:10],
        "items": detail.get("items") or [],
        "_ui_orders": [_to_order_card(detail)],
    }


async def get_order_status_tool(user: UserContext, order_number: Optional[str] = None) -> Dict[str, Any]:
    return await get_order_details_tool(user=user, order_number=order_number)
