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

    # LLM and STT Error Correction settings
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.0
    LLM_TIMEOUT_SECONDS: float = 10.0
    LLM_MAX_RETRIES: int = 2
    STT_CONFIDENCE_THRESHOLD: float = 0.90
    STT_CONTEXT_BEFORE: int = 2
    STT_CONTEXT_AFTER: int = 2

    # Grammar and Punctuation Normalization settings (Part 7)
    GRAMMAR_CONFIDENCE_THRESHOLD: float = 0.85
    GRAMMAR_CONTEXT_BEFORE: int = 2
    GRAMMAR_CONTEXT_AFTER: int = 2

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
