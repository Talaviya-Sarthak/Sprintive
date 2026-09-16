from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables or .env."""

    PROJECT_NAME: str = "Sprintive Transcript Processing Service"
    API_V1_STR: str = ""
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    DEBUG: bool = False
    APP_ENV: str = "development"

    # Storage settings
    STORAGE_TYPE: str = "local"
    STORAGE_BASE_DIR: str = "./storage"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
