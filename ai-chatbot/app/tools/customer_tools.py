from typing import Any, Dict

from app.dependencies import UserContext
from app.integrations.ecommerce_api import ecommerce_api


async def get_customer_addresses_tool(user: UserContext) -> Dict[str, Any]:
    if not user.is_authenticated or not user.token:
        return {
            "auth_required": True,
            "error": "Please sign in (/login) to view or manage your saved delivery addresses.",
        }
    addresses = await ecommerce_api.get_addresses(user.token)
    return {
        "count": len(addresses),
        "addresses": [
            {
                "id": a.get("id"),
                "full_name": a.get("full_name"),
                "city": a.get("city"),
                "state": a.get("state"),
                "pin_code": a.get("pin_code"),
                "is_default": bool(a.get("is_default")),
            }
            for a in addresses
        ],
        "manage_url": "/conta/enderecos",
    }


async def get_wishlist_and_preferences_tool(user: UserContext) -> Dict[str, Any]:
    if not user.is_authenticated or not user.token:
        return {
            "auth_required": True,
            "error": "Sign in (/login) so I can personalize recommendations from your wishlist and past orders.",
        }
    wishlist = await ecommerce_api.get_wishlist(user.token)
    orders = await ecommerce_api.get_orders(user.token)
    wish_items = wishlist.get("items") or []
    recent_ordered = [
        it.get("product_name")
        for o in orders[:5]
        for it in (o.get("items") or [])
        if it.get("product_name")
    ]
    preferred_categories = sorted({i.get("category_slug") for i in wish_items if i.get("category_slug")})
    return {
        "wishlist_count": len(wish_items),
        "wishlist_items": [
            {"id": i.get("id"), "slug": i.get("slug"), "name": i.get("name"), "category": i.get("category_slug"), "price_inr": float(i.get("price", 0))}
            for i in wish_items[:6]
        ],
        "preferred_categories": preferred_categories,
        "recent_purchased_items": recent_ordered[:6],
    }
