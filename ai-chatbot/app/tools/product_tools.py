from typing import Any, Dict, List, Optional, Tuple

from app.core.context_extractor import (
    GENERIC_SYNONYM_ALIASES,
    match_category_from_metadata,
    stem_simple_plural,
)
from app.core.safety import strip_untrusted_markup
from app.integrations.catalog_metadata import CatalogMetadata, catalog_metadata_store
from app.integrations.ecommerce_api import ecommerce_api
from app.models.response import ProductCardData, ProductComparisonData, ProductComparisonRow

GENERIC_FILLER_WORDS = {
    "product", "products", "item", "items", "good", "best", "top", "cheap", "cheaper",
    "for", "with", "under", "below", "above", "show", "find", "me", "some", "the",
}


def _resolve_category_and_search(
    category: Optional[str],
    search: Optional[str],
    metadata: CatalogMetadata,
) -> Tuple[Optional[str], Optional[str], bool]:
    """
    Dynamically resolve category slug against live PostgreSQL metadata and normalize search terms.
    Returns (effective_category_slug, normalized_search, is_specific_item_search).
    """
    categories = metadata.categories
    valid_slugs = {str(c.get("slug", "")).lower(): str(c.get("slug", "")) for c in categories if c.get("slug")}

    effective_cat: Optional[str] = None
    extra_search_from_cat: Optional[str] = None

    if category:
        cat_clean = category.strip()
        cat_low = cat_clean.lower()
        if not valid_slugs:
            # Degraded metadata mode: preserve caller-supplied category slug directly
            effective_cat = GENERIC_SYNONYM_ALIASES.get(cat_low, cat_low)
        elif cat_low in valid_slugs:
            effective_cat = valid_slugs[cat_low]
        else:
            matched = match_category_from_metadata(cat_clean, categories)
            if matched:
                effective_cat = matched
            else:
                # Caller passed a specific item type as category (e.g. "laptops" when DB has no "laptops" category)
                extra_search_from_cat = GENERIC_SYNONYM_ALIASES.get(cat_low, stem_simple_plural(cat_low))

    raw_search = (search or extra_search_from_cat or "").strip()
    if not raw_search:
        return effective_cat, None, False

    # If no category yet, try inferring an existing DB category from search phrase
    if not effective_cat:
        inferred = match_category_from_metadata(raw_search, categories)
        if inferred:
            effective_cat = inferred

    # Strip words that are purely the matched category's own slug/name or generic filler
    cat_words = set(GENERIC_FILLER_WORDS)
    if effective_cat:
        cat_words.add(effective_cat.lower())
        for c in categories:
            if str(c.get("slug", "")).lower() == effective_cat.lower():
                for tok in str(c.get("name", "")).lower().split():
                    cat_words.add(tok)
                    cat_words.add(stem_simple_plural(tok))
        for alias, target in GENERIC_SYNONYM_ALIASES.items():
            if target == effective_cat.lower():
                cat_words.add(alias)

    meaningful = []
    for w in raw_search.lower().split():
        if w in cat_words or len(w) < 2:
            continue
        mapped = GENERIC_SYNONYM_ALIASES.get(w, stem_simple_plural(w))
        if mapped not in cat_words:
            meaningful.append(mapped)

    if not meaningful:
        return effective_cat, None, False

    return effective_cat, " ".join(meaningful), True


def to_product_card(p: Dict[str, Any], reason: Optional[str] = None) -> ProductCardData:
    price = float(p.get("price", 0))
    price_old = float(p["price_old"]) if p.get("price_old") is not None else None
    discount = 0
    if price_old and price_old > price:
        discount = round(((price_old - price) / price_old) * 100)
    stock = int(p.get("stock", 0))
    images = p.get("images") or []
    image = p.get("image_url") or (images[0] if images else "")
    slug = p.get("slug", "")
    return ProductCardData(
        id=int(p["id"]),
        slug=slug,
        name=str(p.get("name", "")),
        brand=str(p.get("brand", "")),
        category=str(p.get("category_slug") or p.get("category") or ""),
        price=price,
        price_old=price_old,
        discount_percent=discount,
        rating=float(p.get("rating", 0)),
        reviews_count=int(p.get("reviews_count", 0)),
        stock=stock,
        in_stock=stock > 0,
        image=image,
        product_url=f"/produto/{slug}",
        reason=reason,
    )


async def search_products_tool(
    search: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    in_stock_only: bool = False,
    sort: Optional[str] = None,
    featured: Optional[bool] = None,
    bestseller: Optional[bool] = None,
    is_new: Optional[bool] = None,
    limit: int = 6,
    exclude_slugs: Optional[List[str]] = None,
) -> Dict[str, Any]:
    metadata = await catalog_metadata_store.get_metadata()
    effective_cat, norm_search, is_specific_item = _resolve_category_and_search(category, search, metadata)

    sort_map = {"price_asc": "price-asc", "price_desc": "price-desc", "rating": "rating", "newest": "newest"}
    api_sort = sort_map.get((sort or "").lower(), sort)
    fetch_limit = min(max(limit * 5, 30) + len(exclude_slugs or []), 100)

    raw = await ecommerce_api.search_products(
        category=effective_cat,
        search=norm_search,
        brand=brand,
        min_price=min_price,
        max_price=max_price,
        sort=api_sort,
        featured=featured,
        bestseller=bestseller,
        is_new=is_new,
        limit=fetch_limit,
    )

    # Token fallback ONLY for multi-word specific searches (never drop item keyword into unrelated category products)
    if not raw and norm_search and len(norm_search.split()) > 1:
        for tok in norm_search.split():
            if len(tok) < 2:
                continue
            raw = await ecommerce_api.search_products(
                category=effective_cat,
                search=tok,
                brand=brand,
                min_price=min_price,
                max_price=max_price,
                sort=api_sort,
                limit=fetch_limit,
            )
            if raw:
                break

    # Enforce strict item keyword match when a specific item search was requested
    if raw and is_specific_item and norm_search:
        kw = norm_search.split()[0]
        raw = [
            p for p in raw
            if kw in str(p.get("name", "")).lower() or kw in str(p.get("description", "")).lower()
        ]

    if min_rating is not None:
        raw = [p for p in raw if float(p.get("rating", 0)) >= float(min_rating)]

    if in_stock_only:
        raw = [p for p in raw if int(p.get("stock", 0)) > 0]

    excluded_set = set(exclude_slugs or [])
    no_more_unseen = False
    if excluded_set:
        unseen = [p for p in raw if p.get("slug") not in excluded_set]
        if not unseen:
            no_more_unseen = True
            raw = []
        else:
            raw = unseen

    top = raw[: min(limit, 8)]
    cards = [to_product_card(p) for p in top]

    # Phase 6: Truthful zero-result constraint-relaxation alternatives (without mutating active filters)
    alternatives: List[Dict[str, Any]] = []
    if not cards and not no_more_unseen:
        if max_price is not None and max_price > 0:
            for mult in (1.5, 2.0):
                relaxed_budget = round((max_price * mult) / 100) * 100
                probe = await ecommerce_api.search_products(
                    category=effective_cat,
                    search=norm_search,
                    brand=brand,
                    min_price=min_price,
                    max_price=relaxed_budget,
                    limit=20,
                )
                if min_rating is not None:
                    probe = [p for p in probe if float(p.get("rating", 0)) >= float(min_rating)]
                if probe:
                    alternatives.append(
                        {
                            "constraint": "max_price",
                            "suggested_value": relaxed_budget,
                            "matching_count": len(probe),
                            "summary": f"{len(probe)} matching options available under ₹{relaxed_budget:,.0f}",
                        }
                    )
                    break
        if brand and not alternatives:
            probe = await ecommerce_api.search_products(
                category=effective_cat,
                search=norm_search,
                min_price=min_price,
                max_price=max_price,
                limit=20,
            )
            if min_rating is not None:
                probe = [p for p in probe if float(p.get("rating", 0)) >= float(min_rating)]
            if probe:
                alternatives.append(
                    {
                        "constraint": "brand",
                        "suggested_value": None,
                        "matching_count": len(probe),
                        "summary": f"{len(probe)} matching options available from other brands within your other filters",
                    }
                )

    # Phase 5: Explainable, data-grounded ranking insights from returned DB records
    ranking_insights: Dict[str, Any] = {}
    if cards:
        best_rated = max(cards, key=lambda c: (c.rating, c.reviews_count))
        lowest_price = min(cards, key=lambda c: c.price)
        ranking_insights = {
            "highest_rated": {"name": best_rated.name, "slug": best_rated.slug, "rating": best_rated.rating, "reviews_count": best_rated.reviews_count},
            "lowest_price": {"name": lowest_price.name, "slug": lowest_price.slug, "price_inr": lowest_price.price},
        }

    return {
        "total_matched": len(raw),
        "no_more_unseen": no_more_unseen,
        "alternatives": alternatives,
        "ranking_insights": ranking_insights,
        "applied_filters": {
            "category": effective_cat,
            "search": norm_search,
            "brand": brand,
            "min_price": min_price,
            "max_price": max_price,
            "min_rating": min_rating,
            "in_stock_only": in_stock_only or None,
            "sort": sort,
        },
        "products": [
            {
                "index": idx + 1,
                "id": c.id,
                "slug": c.slug,
                "name": c.name,
                "brand": c.brand,
                "category": c.category,
                "price_inr": c.price,
                "original_price_inr": c.price_old,
                "discount_percent": c.discount_percent,
                "rating": c.rating,
                "reviews_count": c.reviews_count,
                "stock": c.stock,
                "url": c.product_url,
            }
            for idx, c in enumerate(cards)
        ],
        "_ui_products": [c.model_dump() for c in cards],
    }


async def get_product_details_tool(slug: str) -> Dict[str, Any]:
    p = await ecommerce_api.get_product_by_slug(slug)
    card = to_product_card(p)
    variants = p.get("variants") or []
    reviews = p.get("reviews") or []
    return {
        "id": card.id,
        "slug": card.slug,
        "name": card.name,
        "brand": card.brand,
        "category": card.category,
        "price_inr": card.price,
        "original_price_inr": card.price_old,
        "discount_percent": card.discount_percent,
        "rating": card.rating,
        "reviews_count": card.reviews_count,
        "stock": card.stock,
        "in_stock": card.in_stock,
        "description": strip_untrusted_markup(p.get("description", ""), 400),
        "colors": sorted({v["color"] for v in variants if v.get("color")}),
        "sizes": sorted({v["size"] for v in variants if v.get("size")}),
        "recent_reviews": [
            {
                "author": r.get("author_name", "Customer"),
                "rating": r.get("rating"),
                "comment": strip_untrusted_markup(r.get("comment", ""), 200),
            }
            for r in reviews[:5]
        ],
        "url": card.product_url,
        "_ui_products": [card.model_dump()],
    }


async def get_product_reviews_tool(slug: str) -> Dict[str, Any]:
    p = await ecommerce_api.get_product_by_slug(slug)
    reviews = p.get("reviews") or []
    return {
        "product_name": p.get("name"),
        "average_rating": float(p.get("rating", 0)),
        "total_reviews": int(p.get("reviews_count", len(reviews))),
        "reviews": [
            {
                "author": r.get("author_name", "Customer"),
                "rating": r.get("rating"),
                "comment": strip_untrusted_markup(r.get("comment", ""), 240),
                "date": str(r.get("created_at", ""))[:10],
            }
            for r in reviews[:8]
        ],
    }


async def get_product_availability_tool(slug: str) -> Dict[str, Any]:
    p = await ecommerce_api.get_product_by_slug(slug, fresh=True)
    stock = int(p.get("stock", 0))
    return {
        "product_id": int(p["id"]),
        "slug": p["slug"],
        "name": p["name"],
        "stock": stock,
        "in_stock": stock > 0,
        "low_stock": 0 < stock <= 10,
        "price_inr": float(p["price"]),
    }


async def compare_products_tool(slugs: List[str]) -> Dict[str, Any]:
    clean_slugs = [s.strip() for s in slugs if s and s.strip()][:3]
    if len(clean_slugs) < 2:
        return {"error": "Provide at least two product slugs to compare."}

    details = []
    for s in clean_slugs:
        try:
            details.append(await ecommerce_api.get_product_by_slug(s))
        except Exception:
            found = await ecommerce_api.search_products(search=s, limit=1)
            if found:
                details.append(await ecommerce_api.get_product_by_slug(found[0]["slug"]))

    if len(details) < 2:
        return {"error": "Could not find at least two matching products in the ABC Cart catalog."}

    cards = [to_product_card(d) for d in details]
    rows = [
        ProductComparisonRow(
            feature="Price (INR)",
            values=[f"₹{c.price:,.0f}" + (f" (MRP ₹{c.price_old:,.0f}, -{c.discount_percent}%)" if c.discount_percent > 0 and c.price_old else "") for c in cards],
        ),
        ProductComparisonRow(
            feature="Rating",
            values=[f"{c.rating:.1f} ★ ({c.reviews_count} reviews)" for c in cards],
        ),
        ProductComparisonRow(
            feature="Brand",
            values=[c.brand for c in cards],
        ),
        ProductComparisonRow(
            feature="Availability",
            values=[f"In Stock ({c.stock} units)" if c.in_stock else "Out of Stock" for c in cards],
        ),
        ProductComparisonRow(
            feature="Variants",
            values=[
                ", ".join(sorted({v["size"] for v in (d.get("variants") or []) if v.get("size")})[:3]) or "Standard"
                for d in details
            ],
        ),
        ProductComparisonRow(
            feature="Catalog Highlights",
            values=[strip_untrusted_markup(d.get("description", ""), 160) or "Not specified" for d in details],
        ),
    ]

    best_value = min(cards, key=lambda c: c.price)
    best_rated = max(cards, key=lambda c: c.rating)
    verdict = (
        f"{best_rated.name} leads on rating ({best_rated.rating:.1f}★), "
        f"while {best_value.name} is the more budget-friendly pick at ₹{best_value.price:,.0f}."
    )
    comp = ProductComparisonData(products=cards, rows=rows, verdict=verdict)
    return {
        "compared_products": [
            {
                "index": idx + 1,
                "slug": c.slug,
                "name": c.name,
                "price_inr": c.price,
                "rating": c.rating,
                "stock": c.stock,
                "catalog_description": strip_untrusted_markup(d.get("description", ""), 300),
            }
            for idx, (c, d) in enumerate(zip(cards, details))
        ],
        "rows": [r.model_dump() for r in rows],
        "verdict": verdict,
        "_ui_comparison": comp.model_dump(),
    }
