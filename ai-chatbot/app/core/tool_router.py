import json
from typing import Any, Dict, List, Tuple

from app.dependencies import UserContext
from app.tools.cart_tools import (
    get_cart_tool,
    prepare_add_to_cart_tool,
    prepare_remove_from_cart_tool,
    prepare_update_cart_quantity_tool,
    register_pending_action,
)
from app.tools.catalog_tools import get_categories_tool
from app.tools.customer_tools import get_customer_addresses_tool, get_wishlist_and_preferences_tool
from app.tools.order_tools import get_order_details_tool, get_order_history_tool, get_order_status_tool
from app.tools.product_tools import (
    compare_products_tool,
    get_product_availability_tool,
    get_product_details_tool,
    get_product_reviews_tool,
    search_products_tool,
)
from app.tools.support_tools import (
    get_coupon_information_tool,
    get_shipping_information_tool,
    get_store_policies_tool,
)
from app.utils.logging import logger

OPENAI_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search and filter real products in the ABC Cart catalog by keyword, category, brand, price range in INR, rating, or sort order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {"type": "string", "description": "Optional product keyword or phrase (e.g. a specific item type or feature)."},
                    "category": {"type": "string", "description": "Optional category slug or category name from the store catalog (use get_categories if unsure)."},
                    "brand": {"type": "string", "description": "Optional brand name filter."},
                    "min_price": {"type": "number", "description": "Minimum price in INR."},
                    "max_price": {"type": "number", "description": "Maximum price in INR."},
                    "min_rating": {"type": "number", "description": "Minimum star rating (1-5)."},
                    "in_stock_only": {"type": "boolean", "description": "Set true when user asks for only in-stock / available products."},
                    "sort": {"type": "string", "enum": ["price_asc", "price_desc", "rating", "newest"]},
                    "featured": {"type": "boolean"},
                    "bestseller": {"type": "boolean"},
                    "is_new": {"type": "boolean"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 8, "default": 6},
                    "exclude_shown": {"type": "boolean", "description": "Set true when user asks to 'show more' or 'another one' so previously displayed products are excluded."},
                    "reset_filters": {"type": "boolean", "description": "Set true ONLY when user explicitly switches to a completely new category or unrelated product topic."},
                    "clear_filters": {
                        "type": "array",
                        "items": {"type": "string", "enum": ["brand", "min_price", "max_price", "min_rating", "search", "sort"]},
                        "description": "Optional list of active filter keys to remove (e.g. ['brand'] when user says 'any brand').",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_product_details",
            "description": "Get full details, variants (colors/sizes), stock, and reviews for a specific product by its slug.",
            "parameters": {
                "type": "object",
                "properties": {"slug": {"type": "string"}},
                "required": ["slug"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_categories",
            "description": "List all product categories available in ABC Cart.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_product_reviews",
            "description": "Fetch verified customer reviews and average rating for a product by slug.",
            "parameters": {
                "type": "object",
                "properties": {"slug": {"type": "string"}},
                "required": ["slug"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_products",
            "description": "Compare 2 or 3 real ABC Cart products side-by-side by their slugs or names.",
            "parameters": {
                "type": "object",
                "properties": {
                    "slugs": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 2,
                        "maxItems": 3,
                    }
                },
                "required": ["slugs"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_product_availability",
            "description": "Check real-time stock availability and INR price of a product by slug.",
            "parameters": {
                "type": "object",
                "properties": {"slug": {"type": "string"}},
                "required": ["slug"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_cart",
            "description": "View the customer's current shopping cart items and totals.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_to_cart",
            "description": "Prepare a confirmation request to add a product to the customer's cart. Does not mutate cart until confirmed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "slug": {"type": "string", "description": "Product slug from catalog."},
                    "quantity": {"type": "integer", "minimum": 1, "maximum": 20, "default": 1},
                    "color": {"type": "string"},
                    "size": {"type": "string"},
                },
                "required": ["slug"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_cart_quantity",
            "description": "Prepare a confirmation request to update a cart item's quantity.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cart_item_id": {"type": "integer"},
                    "product_name": {"type": "string"},
                    "quantity": {"type": "integer", "minimum": 0, "maximum": 20},
                },
                "required": ["cart_item_id", "product_name", "quantity"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remove_from_cart",
            "description": "Prepare a confirmation request to remove an item from the customer's cart.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cart_item_id": {"type": "integer"},
                    "product_name": {"type": "string"},
                },
                "required": ["cart_item_id", "product_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_order_history",
            "description": "Get the authenticated customer's order history. Requires sign-in.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "minimum": 1, "maximum": 10, "default": 5}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_order_details",
            "description": "Get detailed breakdown of a specific order belonging to the authenticated customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {"type": "integer"},
                    "order_number": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_order_status",
            "description": "Track the latest order or a specific order number for the authenticated customer.",
            "parameters": {
                "type": "object",
                "properties": {"order_number": {"type": "string"}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_addresses",
            "description": "List the authenticated customer's saved Indian delivery addresses.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_wishlist_and_preferences",
            "description": "Read the authenticated customer's wishlist and recent purchases to personalize product recommendations.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_shipping_information",
            "description": "Get ABC Cart shipping charges, free delivery threshold, and GST details.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_coupon_information",
            "description": "Get active ABC Cart discount coupon codes and minimum order requirements.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_store_policies",
            "description": "Get official ABC Cart policies for returns, payments, cancellations, addresses, and support.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "enum": ["general", "returns", "payment", "cancellation", "address", "support"],
                    }
                },
            },
        },
    },
]


async def execute_tool(
    name: str,
    raw_args: str,
    user: UserContext,
    context_state: Dict[str, Any] | None = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Execute an allowlisted tool and return (model_payload, ui_artifacts).
    Automatically merges and updates `context_state` in place for continuous multi-turn memory.
    """
    try:
        args = json.loads(raw_args) if raw_args else {}
        if not isinstance(args, dict):
            args = {}
    except json.JSONDecodeError:
        return {"error": "Invalid tool arguments JSON."}, {}

    state = context_state if context_state is not None else {}

    try:
        if name == "search_products":
            reset_filters = bool(args.pop("reset_filters", False))
            exclude_shown = bool(args.pop("exclude_shown", False))
            clear_filters = args.pop("clear_filters", None) or []

            existing_filters = dict(state.get("filters") or {})
            incoming_cat = args.get("category")
            incoming_search = args.get("search")

            # Deterministic guard: do NOT allow LLM `reset_filters=true` to wipe compatible constraints
            # when the user is only refining brand/price/rating on the same category/topic!
            category_changed = bool(
                incoming_cat and existing_filters.get("category") and incoming_cat != existing_filters.get("category")
            )
            search_changed = bool(
                incoming_search and existing_filters.get("search") and incoming_search.lower() != str(existing_filters.get("search")).lower()
            )
            genuine_topic_reset = category_changed or (reset_filters and (bool(incoming_cat) and incoming_cat != existing_filters.get("category") or search_changed))

            if genuine_topic_reset:
                prev_filters = {}
                state["shown_slugs"] = []
            else:
                prev_filters = dict(existing_filters)

            for key in clear_filters:
                prev_filters.pop(key, None)

            merged = dict(prev_filters)
            for k in ("category", "search", "brand", "min_price", "max_price", "min_rating", "in_stock_only", "sort", "featured", "bestseller", "is_new", "limit"):
                if k in args and args[k] is not None:
                    merged[k] = args[k]

            # Contradictory price safeguard (min_price > max_price)
            if merged.get("min_price") is not None and merged.get("max_price") is not None:
                if float(merged["min_price"]) > float(merged["max_price"]):
                    # Keep whichever bound was explicitly supplied in this turn; drop the stale conflicting one
                    if args.get("max_price") is not None and args.get("min_price") is None:
                        merged.pop("min_price", None)
                    elif args.get("min_price") is not None and args.get("max_price") is None:
                        merged.pop("max_price", None)
                    else:
                        return {
                            "error": f"Contradictory price range: minimum ₹{merged['min_price']:,.0f} is greater than maximum ₹{merged['max_price']:,.0f}. Ask the user to clarify.",
                            "products": [],
                        }, {}

            allowed_keys = {"search", "category", "brand", "min_price", "max_price", "min_rating", "in_stock_only", "sort", "featured", "bestseller", "is_new", "limit"}
            call_kwargs = {k: v for k, v in merged.items() if k in allowed_keys and v is not None}
            if exclude_shown and state.get("shown_slugs"):
                call_kwargs["exclude_slugs"] = list(state["shown_slugs"])

            res = await search_products_tool(**call_kwargs)

            # Persist updated shopping filters & shown products into context_state
            applied = res.get("applied_filters") or {}
            state["filters"] = {k: v for k, v in applied.items() if v is not None}
            ui_prods = res.get("_ui_products") or []
            if ui_prods:
                state["last_products"] = [
                    {
                        "index": idx + 1,
                        "id": p["id"],
                        "slug": p["slug"],
                        "name": p["name"],
                        "brand": p["brand"],
                        "price": p["price"],
                        "rating": p["rating"],
                    }
                    for idx, p in enumerate(ui_prods)
                ]
                shown = list(state.get("shown_slugs") or [])
                for p in ui_prods:
                    if p["slug"] not in shown:
                        shown.append(p["slug"])
                state["shown_slugs"] = shown[-50:]
                if len(ui_prods) == 1:
                    state["active_product"] = state["last_products"][0]
            elif res.get("no_more_unseen"):
                # Keep previous filters & shown_slugs intact, do not overwrite last_products
                pass

        elif name == "get_product_details":
            res = await get_product_details_tool(**args)
            if not res.get("error") and res.get("slug"):
                state["active_product"] = {
                    "id": res["id"],
                    "slug": res["slug"],
                    "name": res["name"],
                    "brand": res.get("brand"),
                    "price": res.get("price_inr"),
                    "rating": res.get("rating"),
                }
        elif name == "get_categories":
            res = await get_categories_tool()
        elif name == "get_product_reviews":
            res = await get_product_reviews_tool(**args)
        elif name == "compare_products":
            res = await compare_products_tool(**args)
            comp = res.get("_ui_comparison")
            if comp and comp.get("products"):
                compared_list = [
                    {
                        "index": idx + 1,
                        "id": p["id"],
                        "slug": p["slug"],
                        "name": p["name"],
                        "brand": p["brand"],
                        "price": p["price"],
                        "rating": p["rating"],
                    }
                    for idx, p in enumerate(comp["products"])
                ]
                state["last_products"] = compared_list
                state["last_comparison_products"] = compared_list
                state["last_comparison"] = [p["slug"] for p in comp["products"]]
        elif name == "get_product_availability":
            res = await get_product_availability_tool(**args)
            if not res.get("error") and res.get("slug"):
                state["active_product"] = {
                    "id": res["product_id"],
                    "slug": res["slug"],
                    "name": res["name"],
                    "price": res.get("price_inr"),
                }
        elif name == "get_cart":
            res = await get_cart_tool(user=user)
        elif name == "add_to_cart":
            res = await prepare_add_to_cart_tool(**args)
            if res.get("_ui_pending_action"):
                register_pending_action(state, res["_ui_pending_action"])
        elif name == "update_cart_quantity":
            res = await prepare_update_cart_quantity_tool(**args)
            if res.get("_ui_pending_action"):
                register_pending_action(state, res["_ui_pending_action"])
        elif name == "remove_from_cart":
            res = await prepare_remove_from_cart_tool(**args)
            if res.get("_ui_pending_action"):
                register_pending_action(state, res["_ui_pending_action"])
        elif name == "get_order_history":
            res = await get_order_history_tool(user=user, **args)
        elif name == "get_order_details":
            res = await get_order_details_tool(user=user, **args)
        elif name == "get_order_status":
            res = await get_order_status_tool(user=user, **args)
        elif name == "get_customer_addresses":
            res = await get_customer_addresses_tool(user=user)
        elif name == "get_wishlist_and_preferences":
            res = await get_wishlist_and_preferences_tool(user=user)
        elif name == "get_shipping_information":
            res = get_shipping_information_tool()
        elif name == "get_coupon_information":
            res = await get_coupon_information_tool()
        elif name == "get_store_policies":
            res = get_store_policies_tool(**args)
        else:
            return {"error": f"Unknown or disallowed tool: {name}"}, {}
    except Exception as exc:
        logger.warning("Tool %s failed: %s", name, exc)
        return {"error": f"Tool execution failed: {exc}"}, {}

    ui_artifacts: Dict[str, Any] = {}
    clean_res = dict(res)
    for k in ("_ui_products", "_ui_orders", "_ui_comparison", "_ui_pending_action"):
        if k in clean_res:
            ui_artifacts[k] = clean_res.pop(k)
    return clean_res, ui_artifacts
