from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    ollama_host: str = "http://localhost:11434"
    database_url: str = f"sqlite+aiosqlite:///{BACKEND_DIR / 'data' / 'openchat.db'}"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    default_language: str = "en"
    bypass_ttl_seconds: int = 60
    command_timeout_seconds: int = 30

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()