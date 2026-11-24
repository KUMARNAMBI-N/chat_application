TOOL_STATUS_MAP = {
    "search_products": "Searching products...",
    "get_product_details": "Checking product details...",
    "get_categories": "Loading categories...",
    "get_product_reviews": "Reading customer reviews...",
    "compare_products": "Comparing options...",
    "get_product_availability": "Checking availability...",
    "get_cart": "Checking your cart...",
    "add_to_cart": "Preparing cart confirmation...",
    "update_cart_quantity": "Preparing quantity update...",
    "remove_from_cart": "Preparing item removal...",
    "get_order_history": "Checking your order history...",
    "get_order_details": "Fetching order details...",
    "get_order_status": "Tracking your order...",
    "get_customer_addresses": "Checking saved addresses...",
    "get_wishlist_and_preferences": "Personalizing recommendations...",
    "get_shipping_information": "Checking shipping rules...",
    "get_coupon_information": "Checking available coupons...",
    "get_store_policies": "Checking store policies...",
}


def status_for_tool(tool_name: str) -> str:
    return TOOL_STATUS_MAP.get(tool_name, "Working on your request...")


def detect_language_hint(text: str) -> str:
    low = text.lower()
    pt_markers = ["encontre", "produto", "produtos", "carrinho", "pedido", "preço", "barato", "melhor", "menos de", "obrigado"]
    es_markers = ["encuentra", "producto", "productos", "carrito", "pedido", "precio", "barato", "mejor", "menos de", "gracias"]
    pt_score = sum(1 for m in pt_markers if m in low)
    es_score = sum(1 for m in es_markers if m in low)
    if pt_score > es_score and pt_score >= 1:
        return "pt-BR"
    if es_score > pt_score and es_score >= 1:
        return "es"
    return "en"
