from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import BaseModel, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="ASTRO_")

    app_name: str = "AstroLumen"
    mock_mode: bool = False
    ephemeris_path: str | None = None
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 30
    rate_limit_window_seconds: int = 60
    geocode_user_agent: str = "astrolumen-api"
    cors_origins: list[str] = ["http://localhost:5173"]
    database_url: str = "postgresql://postgres:postgres@localhost:5432/astrolumen"
    interpretations_db_path: str = "interpretations.db"
    ai_fallback_enabled: bool = True

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            origins = [origin.strip() for origin in value.split(",")]
            return [origin for origin in origins if origin]
        return value
    geocode_timeout: float = 10.0
    geocode_min_delay_seconds: float = 1.0


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
