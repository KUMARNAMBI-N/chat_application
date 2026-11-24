from fastapi import APIRouter

from app.config import get_settings
from app.core.conversation_manager import conversation_manager
from app.integrations.ecommerce_api import ecommerce_api

router = APIRouter()


@router.get("/health")
async def health():
    settings = get_settings()
    backend_ok = False
    try:
        await ecommerce_api.health_check()
        backend_ok = True
    except Exception:
        backend_ok = False

    return {
        "status": "ok",
        "service": "abc-cart-ai-chatbot",
        "openai_configured": settings.is_openai_configured,
        "model": settings.openai_model,
        "ecommerce_backend_connected": backend_ok,
        "database_persistence": conversation_manager._db_ready,
    }
