import re
from typing import Any, Dict, List, Optional, Tuple

from app.integrations.catalog_metadata import CatalogMetadata

# Minimal generic spelling / cross-language normalization (Portuguese DB slugs <-> English terms)
GENERIC_SYNONYM_ALIASES = {
    "phone": "mobiles",
    "phones": "mobiles",
    "smartphone": "mobiles",
    "smartphones": "mobiles",
    "shoe": "calcados",
    "shoes": "calcados",
    "sneaker": "calcados",
    "sneakers": "calcados",
    "clothing": "moda",
    "clothes": "moda",
    "apparel": "moda",
    "notebook": "laptop",
    "notebooks": "laptop",
}


def stem_simple_plural(word: str) -> str:
    low = word.lower().strip()
    if low.endswith("ies") and len(low) > 4:
        return low[:-3] + "y"
    if low.endswith("s") and len(low) > 4 and not low.endswith("ss"):
        return low[:-1]
    return low


def _boundary_pattern(term: str) -> re.Pattern[str]:
    return re.compile(rf"(?<![a-z0-9]){re.escape(term.lower())}(?![a-z0-9])", re.IGNORECASE)


def match_brand_from_metadata(message: str, brands: List[str]) -> Optional[str]:
    """
    Dynamically match any brand from PostgreSQL metadata:
    - Case-insensitive
    - Prefers longer / multi-word brand names first
    - Uses non-alphanumeric boundaries so brands never match inside unrelated words
    """
    if not message or not brands:
        return None
    sorted_brands = sorted({b.strip() for b in brands if b and b.strip()}, key=len, reverse=True)
    for brand in sorted_brands:
        if _boundary_pattern(brand).search(message):
            return brand
    return None


def match_category_from_metadata(message: str, categories: List[Dict[str, Any]]) -> Optional[str]:
    """
    Dynamically match any category from PostgreSQL metadata by slug, full name,
    significant name tokens, or minimal generic cross-language aliases.
    """
    if not message or not categories:
        return None

    low = message.lower()
    slug_set = {str(c.get("slug", "")).lower() for c in categories if c.get("slug")}

    # 1. Match full category names and slugs (longest first)
    pairs: List[Tuple[str, str]] = []
    for c in categories:
        slug = str(c.get("slug", "")).strip()
        name = str(c.get("name", "")).strip()
        if not slug:
            continue
        pairs.append((slug.lower(), slug))
        if name:
            pairs.append((name.lower(), slug))
            # Also allow singular form of single-word category names (e.g. "mobile" -> "mobiles")
            stemmed_name = stem_simple_plural(name.lower())
            if stemmed_name != name.lower():
                pairs.append((stemmed_name, slug))
            # Allow primary words from multi-word names like "Beauty & Personal Care" -> "beauty"
            for tok in re.split(r"[^a-z0-9]+", name.lower()):
                if len(tok) >= 4 and tok not in {"care", "personal", "decor", "gourmet", "fitness", "and"}:
                    pairs.append((tok, slug))
                    pairs.append((stem_simple_plural(tok), slug))

    pairs.sort(key=lambda item: len(item[0]), reverse=True)
    for term, slug in pairs:
        if _boundary_pattern(term).search(low):
            return slug

    # 2. Check minimal cross-language aliases only if target slug actually exists in DB metadata
    for alias, target in GENERIC_SYNONYM_ALIASES.items():
        if target in slug_set and _boundary_pattern(alias).search(low):
            return target

    return None


def update_context_from_user_message(
    message: str,
    state: Dict[str, Any],
    metadata: Optional[CatalogMetadata] = None,
) -> Dict[str, Any]:
    """
    Deterministically extract generic shopping constraints (category, budget, brand,
    rating, filter removals) using live database-backed CatalogMetadata.
    """
    low = (message or "").lower().strip()
    filters = dict(state.get("filters") or {})

    # Skip filter extraction for pure order/cart/policy questions
    if any(k in low for k in ["my order", "track my order", "latest order", "my cart", "shipping policy", "coupon"]):
        return state

    categories = metadata.categories if metadata else []
    brands = metadata.brands if metadata else []

    # 1. Check brand mention FIRST so "Show me Samsung" is a brand refinement, NOT a topic reset
    brand_removed = any(p in low for p in ["any brand", "all brands", "remove brand", "no brand"])
    matched_brand = None if brand_removed else match_brand_from_metadata(message, brands)

    # 2. Dynamic category switch detection
    matched_cat = match_category_from_metadata(message, categories)
    if matched_cat:
        if filters.get("category") and filters.get("category") != matched_cat:
            # Genuine category switch: clear old category/search/shown_slugs; keep brand ONLY if user explicitly mentioned it in THIS turn
            filters = {"category": matched_cat}
            if matched_brand:
                filters["brand"] = matched_brand
            state["shown_slugs"] = []
        elif not filters.get("category"):
            filters["category"] = matched_cat
    elif not matched_brand:
        # Handle explicit topic-change phrasing ONLY when it is not a brand refinement ("Show me Samsung" must keep category+budget!)
        topic_match = re.search(
            r"(?:actually,?\s*)?(?:show\s+me|now\s+show|switch\s+to|looking\s+for|recommend|forget\s+that,?\s*i\s+need)\s+([a-z0-9][a-z0-9\s-]{1,28}?)(?:\s+instead|\s+under|\s+below|\s+above|\s+over|\.|$)",
            low,
        )
        if topic_match:
            phrase = topic_match.group(1).strip()
            phrase_words = [
                w for w in phrase.split()
                if w not in {"some", "good", "best", "new", "cheap", "cheaper", "more", "options", "products", "product", "the", "a", "an", "premium", "alternative", "alternatives"}
            ]
            if phrase_words:
                normalized = " ".join(GENERIC_SYNONYM_ALIASES.get(w, stem_simple_plural(w)) for w in phrase_words)
                # Ensure the phrase is not itself a brand name or pure price/rating expression
                if normalized and not re.fullmatch(r"\d+k?", normalized) and normalized != filters.get("search"):
                    filters = {"search": normalized}
                    state["shown_slugs"] = []

    # 3. Apply brand update / removal without losing category or budget
    if brand_removed:
        filters.pop("brand", None)
    elif matched_brand:
        filters["brand"] = matched_brand

    # 4. Extract budget / min_price / max_price & handle removals / contradictions
    if any(p in low for p in ["no budget", "any budget", "remove budget", "remove the price limit", "remove price limit", "any price", "without price limit"]):
        filters.pop("max_price", None)
        filters.pop("min_price", None)
    else:
        min_k = re.search(r"(?:above|over|more than|min(?:imum)?|starting\s+from)\s*₹?\s*(\d+(?:\.\d+)?)\s*k\b", low)
        min_rs = re.search(r"(?:above|over|more than|min(?:imum)?|starting\s+from)\s*₹?\s*(\d[\d,]*)", low)
        max_k = re.search(r"(?:under|below|less than|within|budget(?:\s+is|\s+to)?|max(?:imum)?|upto|up to)\s*₹?\s*(\d+(?:\.\d+)?)\s*k\b", low)
        bare_k = re.search(r"\b(\d+(?:\.\d+)?)\s*k\b", low) if not (min_k or max_k) else None
        max_rs = re.search(r"(?:under|below|less than|within|budget(?:\s+is|\s+to)?|max(?:imum)?|upto|up to|₹|rs\.?)\s*₹?\s*(\d[\d,]*)", low)
        bare_num = re.fullmatch(r"₹?\s*(\d[\d,]{3,6})\.?", low)

        new_min: Optional[float] = None
        new_max: Optional[float] = None

        if min_k:
            new_min = float(min_k.group(1)) * 1000.0
        elif min_rs:
            val = float(min_rs.group(1).replace(",", ""))
            if val >= 100:
                new_min = val

        if max_k:
            new_max = float(max_k.group(1)) * 1000.0
        elif bare_k:
            new_max = float(bare_k.group(1)) * 1000.0
        elif max_rs and not min_rs:
            val = float(max_rs.group(1).replace(",", ""))
            if val >= 100:
                new_max = val
        elif bare_num:
            val = float(bare_num.group(1).replace(",", ""))
            if val >= 100:
                new_max = val

        # Contradictory price-range safeguard (e.g., min_price=50000 then user says "Under ₹30,000")
        if new_max is not None:
            filters["max_price"] = new_max
            if filters.get("min_price") is not None and float(filters["min_price"]) > new_max:
                filters.pop("min_price", None)
                state["contradiction_resolved"] = f"Cleared previous minimum price because new maximum is ₹{new_max:,.0f}."
        if new_min is not None:
            filters["min_price"] = new_min
            if filters.get("max_price") is not None and float(filters["max_price"]) < new_min:
                filters.pop("max_price", None)
                state["contradiction_resolved"] = f"Cleared previous maximum price because new minimum is ₹{new_min:,.0f}."

    # 5. Extract minimum rating ("4 stars", "above 4 stars", "4★", "4.5+")
    rating_match = re.search(r"\b([1-5](?:\.\d)?)\s*(?:stars?|-star|★|\+)", low)
    if rating_match:
        r_val = float(rating_match.group(1))
        if 1.0 <= r_val <= 5.0:
            filters["min_rating"] = r_val

    # 6. Extract availability filter ("only in stock", "only available")
    if any(p in low for p in ["only in stock", "in stock only", "only available", "available only"]):
        filters["in_stock_only"] = True

    state["filters"] = filters
    return state


def resolve_product_reference(message: str, state: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Resolve natural product references against real products stored in conversation context:
    - Ordinals: first/1st, second/2nd, third/3rd
    - Superlatives: cheapest / lowest price, most expensive / highest price, highest rated
    - Contrastive: the other one / other option
    - Brand or name match among displayed candidates
    - Pronouns: it / that / this / previous one
    Never invents a product ID or resolves outside displayed/discussed products.
    """
    low = (message or "").lower().strip()
    last_products = state.get("last_products") or []
    compared_products = state.get("last_comparison_products") or []
    candidates = compared_products if ("compar" in low and compared_products) else (last_products or compared_products)

    # 1. Explicit ordinal
    ordinal_idx = None
    if re.search(r"\b(first|1st)\b", low):
        ordinal_idx = 0
    elif re.search(r"\b(second|2nd)\b", low):
        ordinal_idx = 1
    elif re.search(r"\b(third|3rd)\b", low):
        ordinal_idx = 2
    if ordinal_idx is not None and ordinal_idx < len(candidates):
        return candidates[ordinal_idx]

    # 2. Superlatives (cheapest / most expensive / highest rated)
    if candidates:
        if any(k in low for k in ["cheapest", "lowest price", "least expensive"]):
            return min(candidates, key=lambda p: float(p.get("price", float("inf"))))
        if any(k in low for k in ["most expensive", "highest price", "priciest"]):
            return max(candidates, key=lambda p: float(p.get("price", 0)))
        if any(k in low for k in ["highest rated", "best rated", "top rated"]):
            return max(candidates, key=lambda p: float(p.get("rating", 0)))

    # 3. "the other one" / "other option" when comparing 2 products
    active = state.get("active_product")
    if any(k in low for k in ["other one", "other option", "other product"]) and len(candidates) >= 2 and active:
        other = next((p for p in candidates if p.get("slug") != active.get("slug")), None)
        if other:
            return other

    # 4. Exact name or unique brand match among candidates
    for p in candidates:
        name_low = str(p.get("name", "")).lower()
        if name_low and name_low in low:
            return p
    brand_matches = [
        p for p in candidates
        if p.get("brand") and _boundary_pattern(str(p["brand"])).search(low)
    ]
    if len(brand_matches) == 1:
        return brand_matches[0]

    # 5. Active product / last pending action / single candidate
    if active and active.get("slug"):
        return active
    last_pending = state.get("last_pending_action")
    if last_pending and last_pending.get("payload", {}).get("slug"):
        return {"slug": last_pending["payload"]["slug"], "name": last_pending["payload"].get("name")}
    if len(candidates) == 1:
        return candidates[0]
    return None


def detect_cart_add_intent(message: str, state: Dict[str, Any]) -> Optional[Tuple[str, int]]:
    """
    Generic deterministic detector for cart-add intent referencing conversation products.
    """
    low = (message or "").lower().strip()

    if any(k in low for k in ["cancel", "show my cart", "what's in my cart", "remove", "delete", "clear"]):
        return None

    add_triggers = [
        r"\badd\b.*\b(cart|it|that|this|one|item|product|option|cheapest|expensive)\b",
        r"\badd\s+(the\s+)?(first|1st|second|2nd|third|3rd|cheapest|other)\b",
        r"\byes[, ]+add\b",
        r"\bput\b.*\bin\b.*\bcart\b",
        r"\bbuy\s+(the\s+)?(first|second|third|this|that|it|cheapest|other)\b",
    ]
    if not any(re.search(pat, low) for pat in add_triggers):
        return None

    qty = 1
    qty_num = re.search(r"\badd\s+(\d+)\b", low)
    word_nums = {"two": 2, "three": 3, "four": 4, "five": 5}
    if qty_num:
        qty = max(1, min(int(qty_num.group(1)), 20))
    else:
        for w, n in word_nums.items():
            if re.search(rf"\badd\s+{w}\b", low):
                qty = n
                break

    resolved = resolve_product_reference(message, state)
    if resolved and resolved.get("slug"):
        return str(resolved["slug"]), qty
    return None
