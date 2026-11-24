from functools import lru_cache
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: Optional[str] = None

    # Service
    chatbot_port: int = 8001
    ecommerce_api_url: str = "http://localhost:5001"
    cors_origins: str = "http://localhost:5174,http://127.0.0.1:5174"

    # Auth
    jwt_secret: str = "abccart_secure_jwt_secret_2026"

    # PostgreSQL (optional persistence; falls back to memory in tests/offline)
    pghost: str = "localhost"
    pgport: int = 5432
    pguser: str = "postgres"
    pgpassword: str = ""
    pgdatabase: str = "abccart"
    database_url: Optional[str] = None
    disable_db_persistence: bool = False

    # Cost & Safety Controls
    max_message_length: int = 2000
    max_response_tokens: int = 900
    max_history_messages: int = 20
    rate_limit_per_minute: int = 30
    request_timeout_seconds: float = 30.0
    catalog_cache_ttl_seconds: int = 60

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_openai_configured(self) -> bool:
        key = (self.openai_api_key or "").strip()
        return bool(key) and not key.startswith("YOUR_")

    @property
    def pg_conninfo(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"host={self.pghost} port={self.pgport} user={self.pguser} "
            f"password={self.pgpassword} dbname={self.pgdatabase}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
