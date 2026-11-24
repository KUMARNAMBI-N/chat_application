import asyncio
from typing import Any, AsyncIterator, Dict, List, Optional

from openai import (
    APIConnectionError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    InternalServerError,
    RateLimitError,
)

from app.config import get_settings
from app.utils.logging import logger


class OpenAIServiceError(Exception):
    def __init__(self, message: str, status_code: int = 503, retryable: bool = True) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.retryable = retryable


class OpenAIClientWrapper:
    def __init__(self) -> None:
        self._client: Optional[AsyncOpenAI] = None
        self._configured_key: Optional[str] = None

    def _get_client(self) -> AsyncOpenAI:
        settings = get_settings()
        if not settings.is_openai_configured:
            raise OpenAIServiceError(
                "OpenAI API key is not configured. Set OPENAI_API_KEY in ai-chatbot/.env.",
                status_code=503,
                retryable=False,
            )
        if self._client is None or self._configured_key != settings.openai_api_key:
            kwargs: Dict[str, Any] = {
                "api_key": settings.openai_api_key,
                "timeout": settings.request_timeout_seconds,
            }
            if settings.openai_base_url:
                kwargs["base_url"] = settings.openai_base_url
            self._client = AsyncOpenAI(**kwargs)
            self._configured_key = settings.openai_api_key
        return self._client

    async def create_completion(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        max_retries: int = 2,
    ) -> Any:
        settings = get_settings()
        client = self._get_client()
        kwargs: Dict[str, Any] = {
            "model": settings.openai_model,
            "messages": messages,
            "max_tokens": settings.max_response_tokens,
            "temperature": 0.4,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        delay = 0.75
        for attempt in range(max_retries + 1):
            try:
                return await client.chat.completions.create(**kwargs)
            except AuthenticationError:
                logger.error("OpenAI authentication failed — check OPENAI_API_KEY")
                raise OpenAIServiceError(
                    "Invalid OpenAI API key. Please check OPENAI_API_KEY in ai-chatbot/.env.",
                    status_code=502,
                    retryable=False,
                )
            except RateLimitError:
                if attempt < max_retries:
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                raise OpenAIServiceError(
                    "AI assistant is temporarily busy (rate limit reached). Please try again shortly.",
                    status_code=429,
                    retryable=True,
                )
            except (APITimeoutError, APIConnectionError, InternalServerError) as exc:
                logger.warning("Transient OpenAI error (attempt %d): %s", attempt + 1, type(exc).__name__)
                if attempt < max_retries:
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                raise OpenAIServiceError(
                    "AI service is temporarily unavailable. Please retry in a moment.",
                    status_code=503,
                    retryable=True,
                )

    async def stream_completion(
        self,
        messages: List[Dict[str, Any]],
    ) -> AsyncIterator[str]:
        settings = get_settings()
        client = self._get_client()
        try:
            stream = await client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                max_tokens=settings.max_response_tokens,
                temperature=0.4,
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
        except AuthenticationError:
            raise OpenAIServiceError("Invalid OpenAI API key.", status_code=502, retryable=False)
        except RateLimitError:
            raise OpenAIServiceError("AI assistant rate limit reached. Please retry shortly.", status_code=429, retryable=True)
        except (APITimeoutError, APIConnectionError, InternalServerError):
            raise OpenAIServiceError("AI service temporarily unreachable.", status_code=503, retryable=True)


openai_client = OpenAIClientWrapper()
