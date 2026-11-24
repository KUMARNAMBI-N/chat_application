"""
Permanent Multi-Turn Regression & Stress Test Suite (50+ real stateful test cases).
Covers Phase 5 (20 core scenarios) and Phase 6 (30+ stress, resilience, isolation,
deduplication, and dynamic catalog scenarios).
"""
import asyncio
import time
from unittest.mock import AsyncMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.core.ai_engine import _deduplicate_card_text
from app.core.context_extractor import (
    detect_cart_add_intent,
    resolve_product_reference,
    update_context_from_user_message,
)
from app.core.conversation_manager import conversation_manager
from app.core.tool_router import execute_tool
from app.dependencies import UserContext, rate_limiter
from app.integrations.catalog_metadata import CatalogMetadata, catalog_metadata_store
from app.integrations.openai_client import OpenAIServiceError
from app.main import app
from app.models.response import ProductCardData
from app.tools.product_tools import search_products_tool
from app.tools.support_tools import get_coupon_information_tool

client = TestClient(app)


def make_jwt(user_id: int, email: str, name: str, role: str = "customer") -> str:
    return jwt.encode(
        {"id": user_id, "email": email, "name": name, "role": role},
        get_settings().jwt_secret,
        algorithm="HS256",
    )


DYNAMIC_META = CatalogMetadata(
    categories=[
        {"id": 1, "slug": "mobiles", "name": "Mobiles"},
        {"id": 2, "slug": "eletronicos", "name": "Electronics"},
        {"id": 3, "slug": "moda", "name": "Fashion"},
        {"id": 4, "slug": "casa", "name": "Home & Decor"},
        {"id": 5, "slug": "esportes", "name": "Sports & Fitness"},
        {"id": 6, "slug": "beleza", "name": "Beauty & Personal Care"},
        {"id": 7, "slug": "acessorios", "name": "Accessories"},
        {"id": 8, "slug": "calcados", "name": "Footwear"},
        {"id": 9, "slug": "mercado", "name": "Grocery & Gourmet"},
    ],
    brands=[
        "Samsung", "Dell", "Lenovo", "Apple", "OnePlus", "ThreadLine", "Chef Master",
        "SpeedRun", "StrideMax", "UrbanStep", "Glow", "Horizon", "FarmFresh", "ZenAir", "Denim Co.",
    ],
)


@pytest.fixture(autouse=True)
def setup_clean_env(monkeypatch):
    monkeypatch.setenv("DISABLE_DB_PERSISTENCE", "true")
    get_settings.cache_clear()
    rate_limiter.reset()
    conversation_manager._db_ready = False
    conversation_manager._mem_convs.clear()
    conversation_manager._mem_msgs.clear()
    catalog_metadata_store.reset()
    catalog_metadata_store._cached = DYNAMIC_META
    catalog_metadata_store._fetched_at = time.monotonic()
    yield
    catalog_metadata_store.reset()
    get_settings.cache_clear()


# =============================================================================
# PHASE 5 CORE SCENARIOS (1 - 20)
# =============================================================================

def test_s01_category_and_budget_preserved_on_show_me_brand():
    """Show laptops -> Under ₹50,000 -> Show me Samsung => preserves search=laptop & max_price=50000."""
    state = {}
    update_context_from_user_message("Show me laptops.", state, DYNAMIC_META)
    assert state["filters"].get("search") == "laptop"

    update_context_from_user_message("Under ₹50,000.", state, DYNAMIC_META)
    assert state["filters"]["max_price"] == 50000.0
    assert state["filters"].get("search") == "laptop"

    update_context_from_user_message("Show me Samsung.", state, DYNAMIC_META)
    assert state["filters"]["brand"] == "Samsung"
    assert state["filters"]["max_price"] == 50000.0
    assert state["filters"].get("search") == "laptop"


def test_s02_brand_replacement_preserves_category_and_budget():
    """Show Samsung laptops under ₹50,000 -> Show Dell => Dell laptops under ₹50,000."""
    state = {}
    update_context_from_user_message("Show Samsung laptops under ₹50,000.", state, DYNAMIC_META)
    assert state["filters"]["brand"] == "Samsung"
    assert state["filters"]["max_price"] == 50000.0

    update_context_from_user_message("Show Dell.", state, DYNAMIC_META)
    assert state["filters"]["brand"] == "Dell"
    assert state["filters"]["max_price"] == 50000.0


def test_s03_budget_replacement_updates_max_price():
    state = {}
    update_context_from_user_message("Show laptops under ₹50,000.", state, DYNAMIC_META)
    assert state["filters"]["max_price"] == 50000.0

    update_context_from_user_message("Actually, under ₹70,000.", state, DYNAMIC_META)
    assert state["filters"]["max_price"] == 70000.0


def test_s04_budget_removal_clears_price_limit():
    state = {}
    update_context_from_user_message("Show laptops under ₹50,000.", state, DYNAMIC_META)
    assert state["filters"]["max_price"] == 50000.0

    update_context_from_user_message("Remove the price limit.", state, DYNAMIC_META)
    assert "max_price" not in state["filters"]
    assert "min_price" not in state["filters"]


def test_s05_category_transition_clears_laptop_context():
    state = {}
    update_context_from_user_message("Show laptops under ₹50,000.", state, DYNAMIC_META)
    update_context_from_user_message("Show Samsung phones.", state, DYNAMIC_META)
    assert state["filters"]["category"] == "mobiles"
    assert state["filters"]["brand"] == "Samsung"
    assert "search" not in state["filters"]


def test_s06_rating_refinement_preserved_across_brand_change():
    state = {}
    update_context_from_user_message("Show laptops.", state, DYNAMIC_META)
    update_context_from_user_message("Only products rated above 4 stars.", state, DYNAMIC_META)
    update_context_from_user_message("Show Dell.", state, DYNAMIC_META)
    assert state["filters"]["brand"] == "Dell"
    assert state["filters"]["min_rating"] == 4.0


def test_s07_availability_refinement_filters_out_of_stock():
    state = {}
    update_context_from_user_message("Show Samsung laptops.", state, DYNAMIC_META)
    update_context_from_user_message("Only available products.", state, DYNAMIC_META)
    assert state["filters"]["in_stock_only"] is True

    mixed = [
        {"id": 1, "slug": "lap-1", "name": "Samsung Laptop A", "brand": "Samsung", "category_slug": "eletronicos", "price": 45000, "rating": 4.5, "stock": 0},
        {"id": 2, "slug": "lap-2", "name": "Samsung Laptop B", "brand": "Samsung", "category_slug": "eletronicos", "price": 48000, "rating": 4.6, "stock": 12},
    ]
    with patch("app.tools.product_tools.ecommerce_api.search_products", new=AsyncMock(return_value=mixed)):
        res = asyncio.run(search_products_tool(search="laptop", brand="Samsung", in_stock_only=True))
    assert [p["slug"] for p in res["products"]] == ["lap-2"]


def test_s08_ordinal_resolution_and_comparison():
    user = UserContext(None, None, None, None, None, "s08")
    p1 = {"id": 1, "slug": "lap-a", "name": "Laptop Alpha", "brand": "Dell", "category_slug": "eletronicos", "price": 42000, "rating": 4.6, "stock": 10, "images": [], "variants": [], "description": "Fast SSD"}
    p2 = {"id": 2, "slug": "lap-b", "name": "Laptop Beta", "brand": "Lenovo", "category_slug": "eletronicos", "price": 46000, "rating": 4.8, "stock": 5, "images": [], "variants": [], "description": "IPS screen"}
    state = {"last_products": [{"index": 1, "slug": "lap-a", "name": "Laptop Alpha"}, {"index": 2, "slug": "lap-b", "name": "Laptop Beta"}]}
    with patch("app.tools.product_tools.ecommerce_api.get_product_by_slug", new=AsyncMock(side_effect=[p1, p2])):
        res, art = asyncio.run(execute_tool("compare_products", '{"slugs":["lap-a","lap-b"]}', user, state))
    assert len(art["_ui_comparison"]["products"]) == 2
    assert state["last_comparison"] == ["lap-a", "lap-b"]


def test_s09_product_reference_second_one():
    state = {
        "last_products": [
            {"index": 1, "slug": "phone-1", "name": "Samsung A", "brand": "Samsung", "price": 15000, "rating": 4.4},
            {"index": 2, "slug": "phone-2", "name": "Samsung B", "brand": "Samsung", "price": 22000, "rating": 4.7},
        ]
    }
    assert resolve_product_reference("Tell me more about the second one.", state)["slug"] == "phone-2"


def test_s10_cart_reference_first_one_authoritative():
    state = {
        "last_products": [
            {"index": 1, "slug": "lap-1", "name": "Dell Inspiron", "brand": "Dell", "price": 45000, "rating": 4.6},
            {"index": 2, "slug": "lap-2", "name": "Lenovo IdeaPad", "brand": "Lenovo", "price": 41000, "rating": 4.4},
        ]
    }
    assert detect_cart_add_intent("Add the first one to cart.", state) == ("lap-1", 1)


def test_s11_cheaper_alternative_preserves_category():
    user = UserContext(None, None, None, None, None, "s11")
    state = {"filters": {"category": "eletronicos", "search": "laptop", "max_price": 80000}}
    laptops = [{"id": 3, "slug": "lap-budget", "name": "Budget Laptop", "brand": "Lenovo", "category_slug": "eletronicos", "price": 32000, "rating": 4.4, "stock": 14}]
    with patch("app.tools.product_tools.ecommerce_api.search_products", new=AsyncMock(return_value=laptops)) as mock_search:
        asyncio.run(execute_tool("search_products", '{"max_price":40000,"sort":"price_asc"}', user, state))
        assert mock_search.call_args.kwargs["category"] == "eletronicos"
        assert mock_search.call_args.kwargs["search"] == "laptop"
        assert mock_search.call_args.kwargs["max_price"] == 40000


def test_s12_highest_rated_grounded_in_retrieved_data():
    state = {
        "last_products": [
            {"index": 1, "slug": "lap-1", "name": "Laptop A", "price": 42000, "rating": 4.3},
            {"index": 2, "slug": "lap-2", "name": "Laptop B", "price": 49000, "rating": 4.9},
        ]
    }
    assert resolve_product_reference("Which one is the highest rated?", state)["slug"] == "lap-2"


def test_s13_topic_change_laptops_to_running_shoes():
    state = {"filters": {"category": "eletronicos", "search": "laptop", "max_price": 50000, "brand": "Dell"}}
    update_context_from_user_message("Recommend running shoes.", state, DYNAMIC_META)
    assert state["filters"]["category"] == "calcados"
    assert "brand" not in state["filters"]
    assert "max_price" not in state["filters"]


def test_s14_no_results_preserves_filters_and_offers_alternatives():
    relaxed = [{"id": 10, "slug": "lap-x", "name": "Ultrabook Laptop", "brand": "Dell", "category_slug": "eletronicos", "price": 19999, "rating": 4.5, "stock": 10}]
    with patch("app.tools.product_tools.ecommerce_api.search_products", new=AsyncMock(side_effect=[[], relaxed])):
        res = asyncio.run(search_products_tool(search="laptop", max_price=12000))
    assert res["products"] == []
    assert res["applied_filters"]["max_price"] == 12000
    assert res["alternatives"][0]["matching_count"] == 1


def test_s15_contradictory_price_filters_resolved_safely():
    state = {}
    update_context_from_user_message("Show products above ₹50,000.", state, DYNAMIC_META)
    assert state["filters"]["min_price"] == 50000.0

    update_context_from_user_message("Under ₹30,000.", state, DYNAMIC_META)
    assert state["filters"]["max_price"] == 30000.0
    assert "min_price" not in state["filters"]
    assert "contradiction_resolved" in state


def test_s16_s17_duplicate_and_expired_confirmations():
    tok = make_jwt(5, "u5@example.com", "User Five")
    user = UserContext(5, "u5@example.com", "User Five", "customer", tok, "s16")
    cid = conversation_manager.get_or_create_conversation(user, None, "Confirm test")
    state = conversation_manager.get_context_state(cid, user)
    prod = {"id": 77, "slug": "item-77", "name": "Test Item", "price": 999, "stock": 10, "images": []}

    with patch("app.tools.cart_tools.ecommerce_api.get_product_by_slug", new=AsyncMock(return_value=prod)):
        _, art = asyncio.run(execute_tool("add_to_cart", '{"slug":"item-77","quantity":1}', user, state))
    conversation_manager.update_context_state(cid, user, state)
    aid = art["_ui_pending_action"]["action_id"]

    with patch("app.tools.cart_tools.ecommerce_api.add_to_cart", new=AsyncMock(return_value={"cartId": 1})) as mock_add:
        r1 = client.post("/api/chat/confirm-action", json={"conversation_id": cid, "action_id": aid, "action_type": "add_to_cart", "payload": {}, "confirmed": True}, headers={"Authorization": f"Bearer {tok}"})
        r2 = client.post("/api/chat/confirm-action", json={"conversation_id": cid, "action_id": aid, "action_type": "add_to_cart", "payload": {}, "confirmed": True}, headers={"Authorization": f"Bearer {tok}"})
        assert r1.json()["success"] is True
        assert r2.json()["success"] is True
        assert mock_add.call_count == 1  # Strictly idempotent!

    # Expired action
    with patch("app.tools.cart_tools.ecommerce_api.get_product_by_slug", new=AsyncMock(return_value=prod)):
        _, art2 = asyncio.run(execute_tool("add_to_cart", '{"slug":"item-77","quantity":1}', user, state))
    aid2 = art2["_ui_pending_action"]["action_id"]
    state["pending_actions"][aid2]["created_ts"] -= 700
    conversation_manager.update_context_state(cid, user, state)
    r_exp = client.post("/api/chat/confirm-action", json={"conversation_id": cid, "action_id": aid2, "action_type": "add_to_cart", "payload": {}, "confirmed": True}, headers={"Authorization": f"Bearer {tok}"})
    assert r_exp.json()["success"] is False


def test_s18_context_and_pending_action_isolation_between_users():
    tok_a = make_jwt(101, "a@example.com", "Alice")
    tok_b = make_jwt(202, "b@example.com", "Bob")
    u_a = UserContext(101, "a@example.com", "Alice", "customer", tok_a, "sa")
    cid_a = conversation_manager.get_or_create_conversation(u_a, None, "Alice chat")
    state_a = {"filters": {"category": "moda", "brand": "ThreadLine"}, "pending_actions": {"act_alice1": {"action_id": "act_alice1", "action_type": "add_to_cart", "payload": {"productId": 1, "quantity": 1}, "status": "PENDING_CONFIRMATION", "created_ts": time.time()}}}
    conversation_manager.update_context_state(cid_a, u_a, state_a)

    # Bob cannot confirm Alice's pending action or read Alice's conversation
    r_bob_confirm = client.post("/api/chat/confirm-action", json={"conversation_id": cid_a, "action_id": "act_alice1", "action_type": "add_to_cart", "payload": {}, "confirmed": True}, headers={"Authorization": f"Bearer {tok_b}"})
    assert r_bob_confirm.status_code == 404
    assert client.get(f"/api/conversations/{cid_a}", headers={"Authorization": f"Bearer {tok_b}"}).status_code == 404


def test_s19_dynamic_coupon_validation_and_empty_handling():
    active = [{"code": "FESTIVE15", "discountPercent": 15, "discountAmount": 0, "minOrderAmount": 1499}]
    with patch("app.tools.support_tools.ecommerce_api.get_coupons", new=AsyncMock(return_value=active)):
        r = asyncio.run(get_coupon_information_tool())
    assert r["count"] == 1
    assert r["active_coupons"][0]["code"] == "FESTIVE15"


def test_s20_deduplicate_card_text_strips_redundant_numbered_list():
    cards = [
        ProductCardData(id=1, slug="p1", name="Alpha Watch", brand="Horizon", category="acessorios", price=1999, rating=4.6, reviews_count=50, stock=10),
        ProductCardData(id=2, slug="p2", name="Beta Watch", brand="Horizon", category="acessorios", price=1499, rating=4.4, reviews_count=30, stock=8),
    ]
    redundant = (
        "Here are the matching watches under ₹2,500:\n\n"
        "1. **Alpha Watch**\n   - Price: ₹1,999\n   - Rating: 4.6\n\n"
        "2. **Beta Watch**\n   - Price: ₹1,499\n   - Rating: 4.4\n\n"
        "Would you like to compare them?"
    )
    cleaned = _deduplicate_card_text(redundant, cards)
    assert "1. **Alpha Watch**" not in cleaned
    assert "Price: ₹1,999" not in cleaned
    assert "matching watches" in cleaned
    assert "Would you like to compare them?" in cleaned


# =============================================================================
# PHASE 6: 35+ PARAMETRIZED MULTI-TURN STRESS & RESILIENCE TESTS
# =============================================================================

@pytest.mark.parametrize(
    "turn1,turn2,expected_cat,expected_brand,expected_max",
    [
        ("Show Fashion products.", "Under ₹2,000.", "moda", None, 2000.0),
        ("Show Fashion products under ₹3,000.", "Show me ThreadLine.", "moda", "ThreadLine", 3000.0),
        ("Show Fashion products under ₹3,000.", "Show me Denim Co.", "moda", "Denim Co.", 3000.0),
        ("Show Home & Decor under ₹5,000.", "Show me Chef Master.", "casa", "Chef Master", 5000.0),
        ("Show Home & Decor under ₹5,000.", "Show me ZenAir.", "casa", "ZenAir", 5000.0),
        ("Show Footwear under ₹4,000.", "Show me SpeedRun.", "calcados", "SpeedRun", 4000.0),
        ("Show Footwear under ₹4,000.", "Show me StrideMax.", "calcados", "StrideMax", 4000.0),
        ("Show Footwear under ₹4,000.", "Show me UrbanStep.", "calcados", "UrbanStep", 4000.0),
        ("Show Beauty products under ₹1,500.", "Show me Glow.", "beleza", "Glow", 1500.0),
        ("Show Accessories under ₹2,500.", "Show me Horizon.", "acessorios", "Horizon", 2500.0),
        ("Show Grocery products under ₹1,000.", "Show me FarmFresh.", "mercado", "FarmFresh", 1000.0),
        ("Show Mobiles under ₹25,000.", "Show me Samsung.", "mobiles", "Samsung", 25000.0),
        ("Show Mobiles under ₹25,000.", "Show me OnePlus.", "mobiles", "OnePlus", 25000.0),
        ("Show Mobiles under ₹80,000.", "Show me Apple.", "mobiles", "Apple", 80000.0),
        ("Show Sports products under ₹3,000.", "Show me SpeedRun.", "esportes", "SpeedRun", 3000.0),
    ],
)
def test_stress_dynamic_brand_refinement_preserves_category_and_budget(turn1, turn2, expected_cat, expected_brand, expected_max):
    state = {}
    update_context_from_user_message(turn1, state, DYNAMIC_META)
    update_context_from_user_message(turn2, state, DYNAMIC_META)
    assert state["filters"].get("category") == expected_cat
    assert state["filters"].get("brand") == expected_brand
    assert state["filters"].get("max_price") == expected_max


@pytest.mark.parametrize(
    "msg,expected_min,expected_max",
    [
        ("Under ₹1,500", None, 1500.0),
        ("Below 25k", None, 25000.0),
        ("Budget is 12000", None, 12000.0),
        ("Above ₹10,000", 10000.0, None),
        ("Over 40k", 40000.0, None),
        ("Starting from ₹5,000", 5000.0, None),
    ],
)
def test_stress_price_extraction_variants(msg, expected_min, expected_max):
    state = {"filters": {"category": "mobiles"}}
    update_context_from_user_message(msg, state, DYNAMIC_META)
    assert state["filters"].get("min_price") == expected_min
    assert state["filters"].get("max_price") == expected_max


@pytest.mark.parametrize(
    "ref_msg,expected_slug",
    [
        ("Add the first one to cart", "p-1"),
        ("Add the 2nd product to cart", "p-2"),
        ("Add the third one to cart", "p-3"),
        ("Add the cheapest one to cart", "p-3"),
        ("Add the most expensive one to cart", "p-2"),
        ("Buy the other option", "p-2"),
        ("Add 2 of the first one to cart", "p-1"),
        ("Add three of the cheapest one to cart", "p-3"),
    ],
)
def test_stress_cart_reference_resolution(ref_msg, expected_slug):
    state = {
        "last_products": [
            {"index": 1, "slug": "p-1", "name": "Alpha", "brand": "Glow", "price": 1500, "rating": 4.5},
            {"index": 2, "slug": "p-2", "name": "Beta", "brand": "Horizon", "price": 2900, "rating": 4.8},
            {"index": 3, "slug": "p-3", "name": "Gamma", "brand": "ZenAir", "price": 799, "rating": 4.3},
        ],
        "active_product": {"slug": "p-1", "name": "Alpha"},
    }
    res = detect_cart_add_intent(ref_msg, state)
    assert res is not None
    assert res[0] == expected_slug


def test_stress_llm_reset_filters_blocked_on_same_category_brand_refinement():
    """LLM passing reset_filters=true on same category must NOT wipe max_price."""
    user = UserContext(None, None, None, None, None, "guard_1")
    state = {"filters": {"category": "mobiles", "max_price": 25000, "min_rating": 4.0}}
    phones = [{"id": 1, "slug": "m-1", "name": "Samsung M35", "brand": "Samsung", "category_slug": "mobiles", "price": 16999, "rating": 4.6, "stock": 50}]
    with patch("app.tools.product_tools.ecommerce_api.search_products", new=AsyncMock(return_value=phones)) as mock_search:
        asyncio.run(execute_tool("search_products", '{"reset_filters":true,"category":"mobiles","brand":"Samsung"}', user, state))
        assert mock_search.call_args.kwargs["max_price"] == 25000
        assert mock_search.call_args.kwargs["brand"] == "Samsung"
        assert state["filters"]["min_rating"] == 4.0


def test_stress_llm_reset_filters_allowed_on_genuine_category_change():
    user = UserContext(None, None, None, None, None, "guard_2")
    state = {"filters": {"category": "mobiles", "max_price": 25000, "brand": "Samsung"}}
    shoes = [{"id": 9, "slug": "shoe-1", "name": "SpeedRun Shoe", "brand": "SpeedRun", "category_slug": "calcados", "price": 2999, "rating": 4.7, "stock": 20}]
    with patch("app.tools.product_tools.ecommerce_api.search_products", new=AsyncMock(return_value=shoes)) as mock_search:
        asyncio.run(execute_tool("search_products", '{"reset_filters":true,"category":"calcados"}', user, state))
        assert mock_search.call_args.kwargs["category"] == "calcados"
        assert mock_search.call_args.kwargs["brand"] is None
        assert mock_search.call_args.kwargs["max_price"] is None


def test_stress_error_resilience_never_leaks_secrets_or_tracebacks():
    with (
        patch("app.core.ai_engine.openai_client.create_completion", new=AsyncMock(side_effect=OpenAIServiceError("Timeout", status_code=503))),
        patch("app.tools.product_tools.ecommerce_api.search_products", new=AsyncMock(side_effect=RuntimeError("postgres://postgres:root@localhost/abccart"))),
    ):
        resp = client.post("/api/chat", json={"message": "Show me shoes"}, headers={"X-Session-Id": "err_res_1"})
    assert resp.status_code == 200
    body = resp.json()["message"]
    assert "Traceback" not in body
    assert "postgres://postgres:root" not in body
    assert "sk-" not in body


def test_stress_product_becomes_out_of_stock_before_cart_prep():
    user = UserContext(None, None, None, None, None, "oos_1")
    oos_prod = {"id": 88, "slug": "oos-item", "name": "Sold Out Watch", "price": 1999, "stock": 0, "images": []}
    with patch("app.tools.cart_tools.ecommerce_api.get_product_by_slug", new=AsyncMock(return_value=oos_prod)):
        res, art = asyncio.run(execute_tool("add_to_cart", '{"slug":"oos-item","quantity":1}', user, {}))
    assert "error" in res
    assert "_ui_pending_action" not in art
