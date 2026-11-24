from typing import Any, Dict

from app.integrations.ecommerce_api import ecommerce_api
from app.utils.logging import logger


def get_shipping_information_tool() -> Dict[str, Any]:
    return {
        "currency": "INR",
        "free_shipping_threshold_inr": 499,
        "standard_shipping_charge_inr": 49,
        "gst_rate_percent": 18,
        "coverage": "PAN India delivery",
        "note": "Orders of ₹499 or more qualify for Free Delivery. Orders below ₹499 incur a flat ₹49 shipping fee. 18% GST applies per Indian tax norms.",
    }


async def get_coupon_information_tool() -> Dict[str, Any]:
    """Fetch active coupons dynamically from PostgreSQL via Express GET /api/coupons."""
    try:
        raw_coupons = await ecommerce_api.get_coupons()
        if not isinstance(raw_coupons, list):
            raise ValueError("Unexpected coupons payload")

        formatted = []
        for c in raw_coupons:
            code = str(c.get("code", "")).strip()
            if not code:
                continue
            pct = float(c.get("discountPercent", 0))
            amt = float(c.get("discountAmount", 0))
            min_order = float(c.get("minOrderAmount", 0))
            if pct > 0:
                discount_label = f"{pct:g}% off"
            elif amt > 0:
                discount_label = f"₹{amt:,.0f} flat off"
            else:
                discount_label = "Special offer"
            formatted.append(
                {
                    "code": code,
                    "discount": discount_label,
                    "min_order_inr": min_order,
                }
            )

        if not formatted:
            return {
                "active_coupons": [],
                "message": "There are currently no active discount coupons available.",
                "how_to_apply": "When coupons are available, enter the code on the Cart page (/carrinho).",
            }

        return {
            "count": len(formatted),
            "active_coupons": formatted,
            "how_to_apply": "Enter the coupon code on the Cart page (/carrinho) before proceeding to Checkout (/checkout).",
        }
    except Exception as exc:
        logger.warning("Failed to fetch dynamic coupons: %s", exc)
        return {
            "active_coupons": [],
            "error": "Coupon information is temporarily unavailable. Please check the Cart page (/carrinho) directly.",
        }


def get_store_policies_tool(topic: str = "general") -> Dict[str, Any]:
    policies = {
        "returns": "ABC Cart offers a 30-day return policy on eligible items. Contact support via /contato with your order number to initiate a return.",
        "payment": "Accepted payment methods at checkout (/checkout): UPI, Credit/Debit Card, Net Banking, and Cash on Delivery (COD).",
        "cancellation": "To cancel an order or request help with an active shipment, visit /conta/pedidos or reach our 24/7 support team at /contato.",
        "address": "You can add, edit, or change your default Indian delivery address anytime under My Account → Addresses (/conta/enderecos).",
        "support": "Our 24/7 customer care team is reachable via the Contact page (/contato).",
    }
    key = (topic or "general").strip().lower()
    if key in policies:
        return {"topic": key, "policy": policies[key], "contact_url": "/contato"}
    return {"policies": policies, "contact_url": "/contato"}
