import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.integrations.ecommerce_api import ecommerce_api
from app.utils.logging import logger

METADATA_TTL_SECONDS = 300.0  # 5 minutes


@dataclass
class CatalogMetadata:
    categories: List[Dict[str, Any]] = field(default_factory=list)
    brands: List[str] = field(default_factory=list)
    updated_at: Optional[str] = None
    degraded: bool = False


class CatalogMetadataStore:
    """TTL-cached dynamic loader for PostgreSQL categories and distinct brands."""

    def __init__(self, ttl_seconds: float = METADATA_TTL_SECONDS) -> None:
        self._ttl = ttl_seconds
        self._cached: Optional[CatalogMetadata] = None
        self._fetched_at: float = 0.0
        self._lock: Optional[asyncio.Lock] = None

    def _get_lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    def reset(self) -> None:
        self._cached = None
        self._fetched_at = 0.0

    async def get_metadata(self, force_refresh: bool = False) -> CatalogMetadata:
        now = time.monotonic()
        if (
            not force_refresh
            and self._cached is not None
            and (now - self._fetched_at) < self._ttl
        ):
            return self._cached

        async with self._get_lock():
            now = time.monotonic()
            if (
                not force_refresh
                and self._cached is not None
                and (now - self._fetched_at) < self._ttl
            ):
                return self._cached

            try:
                raw = await ecommerce_api.get_catalog_metadata()
                cats = raw.get("categories") if isinstance(raw, dict) else None
                brands = raw.get("brands") if isinstance(raw, dict) else None

                valid_cats = [c for c in (cats or []) if isinstance(c, dict) and c.get("slug")]
                valid_brands = [str(b).strip() for b in (brands or []) if str(b).strip()]

                if valid_cats or valid_brands:
                    self._cached = CatalogMetadata(
                        categories=valid_cats,
                        brands=valid_brands,
                        updated_at=raw.get("updatedAt") if isinstance(raw, dict) else None,
                        degraded=False,
                    )
                    self._fetched_at = now
                    return self._cached

                if self._cached is not None:
                    logger.warning("Metadata API returned empty payload; serving stale cached metadata.")
                    return CatalogMetadata(
                        categories=self._cached.categories,
                        brands=self._cached.brands,
                        updated_at=self._cached.updated_at,
                        degraded=True,
                    )

                return CatalogMetadata(categories=[], brands=[], degraded=True)

            except Exception as exc:
                logger.warning("Failed to refresh catalog metadata (%s); serving stale cache=%s", exc, self._cached is not None)
                if self._cached is not None:
                    return CatalogMetadata(
                        categories=self._cached.categories,
                        brands=self._cached.brands,
                        updated_at=self._cached.updated_at,
                        degraded=True,
                    )
                return CatalogMetadata(categories=[], brands=[], degraded=True)


catalog_metadata_store = CatalogMetadataStore()
