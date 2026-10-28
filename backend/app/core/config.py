"""Application core configuration."""

from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = API_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "AMS Agentic Incident Management"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        return v

    LOG_LEVEL: str = "INFO"

    # Storage
    DATABASE_URL: str = f"sqlite:///{(API_DIR / 'ams.db').as_posix()}"
    TICKETS_FILE: Path = REPO_DIR / "data" / "tickets" / "ams_tickets.xlsx"
    REGISTRY_DIR: Path = REPO_DIR / "data" / "registry"  # editable rules and application terms


settings = Settings()
