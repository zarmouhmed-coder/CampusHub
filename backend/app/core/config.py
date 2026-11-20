from functools import lru_cache
from typing import Annotated, Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, read from environment variables (and an optional .env file)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+psycopg://campushub:campushub@localhost:5432/campushub"

    # Origins allowed to call the API with credentials (CORS) and to send
    # state-changing requests (CSRF origin check). Comma-separated in the env.
    allowed_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    session_cookie_name: str = "campushub_session"
    session_ttl_days: int = 14
    # Secure cookies require HTTPS. Defaults to True in production (see below).
    cookie_secure: bool | None = None

    # Login throttling: max failed attempts per window, per e-mail and per IP.
    login_max_attempts: int = 5
    login_window_seconds: int = 15 * 60

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def session_cookie_secure(self) -> bool:
        return self.is_production if self.cookie_secure is None else self.cookie_secure


@lru_cache
def get_settings() -> Settings:
    return Settings()
