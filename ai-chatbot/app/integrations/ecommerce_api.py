
import time
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.config import get_settings
from app.utils.logging import logger


class EcommerceAPIClient:
    """Async HTTP client talking to the authoritative ABC Cart Express backend."""

    def __init__(self) -> None:
        self._cache: Dict[str, Tuple[float, Any]] = {}

    def _base_url(self) -> str:
        return get_settings().ecommerce_api_url.rstrip("/")

    def _timeout(self) -> float:
        return get_settings().request_timeout_seconds

    def _headers(self, token: Optional[str] = None, session_id: Optional[str] = None) -> Dict[str, str]:
        headers = {"Accept": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if session_id:
            headers["X-Session-Id"] = session_id
        return headers

    def _get_cached(self, key: str) -> Optional[Any]:
        ttl = get_settings().catalog_cache_ttl_seconds
        entry = self._cache.get(key)
        if entry and (time.monotonic() - entry[0]) < ttl:
            return entry[1]
        return None

    def _set_cached(self, key: str, value: Any) -> None:
        self._cache[key] = (time.monotonic(), value)

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
        token: Optional[str] = None,
        session_id: Optional[str] = None,
        use_cache: bool = False,
    ) -> Any:
        url = f"{self._base_url()}{path}"
        cache_key = f"{method}:{url}:{sorted((params or {}).items())}"
        if use_cache and method == "GET":
            cached = self._get_cached(cache_key)
            if cached is not None:
                return cached

        async with httpx.AsyncClient(timeout=self._timeout()) as client:
            resp = await client.request(
                method,
                url,
                params={k: v for k, v in (params or {}).items() if v is not None and v != ""},
                json=json_body,
                headers=self._headers(token=token, session_id=session_id),
            )
            if resp.status_code >= 400:
                try:
                    err = resp.json().get("error", resp.text)
                except Exception:
                    err = resp.text
                logger.warning("Ecommerce API %s %s failed (%s): %s", method, path, resp.status_code, err)
                raise httpx.HTTPStatusError(str(err), request=resp.request, response=resp)

            data = resp.json()
            if use_cache and method == "GET":
                self._set_cached(cache_key, data)
            return data

    async def get_categories(self) -> List[Dict[str, Any]]:
        return await self._request("GET", "/api/categories", use_cache=True)

    async def get_catalog_metadata(self) -> Dict[str, Any]:
        return await self._request("GET", "/api/catalog/metadata", use_cache=False)

    async def get_coupons(self) -> List[Dict[str, Any]]:
        return await self._request("GET", "/api/coupons", use_cache=True)

    async def search_products(
        self,
        *,
        category: Optional[str] = None,
        search: Optional[str] = None,
        brand: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        sort: Optional[str] = None,
        featured: Optional[bool] = None,
        bestseller: Optional[bool] = None,
        is_new: Optional[bool] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        params = {
            "category": category,
            "search": search,
            "brand": brand,
            "minPrice": min_price,
            "maxPrice": max_price,
            "sort": sort,
            "featured": "true" if featured else None,
            "bestseller": "true" if bestseller else None,
            "isNew": "true" if is_new else None,
            "limit": limit,
        }
        return await self._request("GET", "/api/products", params=params, use_cache=True)

    async def get_product_by_slug(self, slug: str, fresh: bool = False) -> Dict[str, Any]:
        return await self._request("GET", f"/api/products/{slug}", use_cache=not fresh)

    async def get_cart(self, token: Optional[str], session_id: str) -> Dict[str, Any]:
        return await self._request("GET", "/api/cart", token=token, session_id=session_id)

    async def add_to_cart(
        self,
        product_id: int,
        quantity: int,
        token: Optional[str],
        session_id: str,
        color: Optional[str] = None,
        size: Optional[str] = None,
    ) -> Dict[str, Any]:
        return await self._request(
            "POST",
            "/api/cart/add",
            json_body={"productId": product_id, "quantity": quantity, "color": color, "size": size},
            token=token,
            session_id=session_id,
        )

    async def update_cart_item(self, item_id: int, quantity: int, token: Optional[str], session_id: str) -> Dict[str, Any]:
        return await self._request(
            "PUT",
            f"/api/cart/item/{item_id}",
            json_body={"quantity": quantity},
            token=token,
            session_id=session_id,
        )

    async def remove_cart_item(self, item_id: int, token: Optional[str], session_id: str) -> Dict[str, Any]:
        return await self._request("DELETE", f"/api/cart/item/{item_id}", token=token, session_id=session_id)

    async def get_orders(self, token: str) -> List[Dict[str, Any]]:
        return await self._request("GET", "/api/orders", token=token)

    async def get_order_by_id(self, order_id: int, token: str) -> Dict[str, Any]:
        return await self._request("GET", f"/api/orders/{order_id}", token=token)

    async def get_addresses(self, token: str) -> List[Dict[str, Any]]:
        return await self._request("GET", "/api/addresses", token=token)

    async def get_wishlist(self, token: str) -> Dict[str, Any]:
        return await self._request("GET", "/api/wishlist", token=token)

    async def health_check(self) -> Dict[str, Any]:
        return await self._request("GET", "/api/health")


ecommerce_api = EcommerceAPIClient()
