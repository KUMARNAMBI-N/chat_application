from typing import Any, Dict

from app.integrations.ecommerce_api import ecommerce_api


async def get_categories_tool() -> Dict[str, Any]:
    cats = await ecommerce_api.get_categories()
    return {
        "count": len(cats),
        "categories": [
            {
                "slug": c.get("slug"),
                "name": c.get("name"),
                "description": c.get("description"),
            }
            for c in cats
        ],
    }
