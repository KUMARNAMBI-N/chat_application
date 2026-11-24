from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.conversations import router as conversations_router
from app.api.health import router as health_router
from app.config import get_settings
from app.core.conversation_manager import conversation_manager
from app.utils.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    conversation_manager.init_storage()
    logger.info(
        "ABC Cart AI Chatbot starting on port %s (model=%s, openai_configured=%s)",
        settings.chatbot_port,
        settings.openai_model,
        settings.is_openai_configured,
    )
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="ABC Cart AI Shopping Assistant",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Session-Id"],
    )

    app.include_router(health_router)
    app.include_router(chat_router)
    app.include_router(conversations_router)
    return app


app = create_app()
