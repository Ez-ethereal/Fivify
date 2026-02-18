"""
Configuration module for Eli5y backend.
Loads environment variables and provides configuration settings.
"""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    mathpix_app_id: str | None = None
    mathpix_app_key: str | None = None

    # Application settings
    environment: str = "development"
    cors_origins: List[str] = [
        "http://localhost:8081",
        "exp://localhost:8081"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


# Global settings instance
settings = Settings()
