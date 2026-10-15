from pathlib import Path
from dotenv import load_dotenv
from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_SERVICE_DIR = Path(__file__).resolve().parent.parent.parent
_REPO_ROOT = _SERVICE_DIR.parent

# Load environment files in priority order without overriding existing process variables
_ENV_CANDIDATES = [
    _SERVICE_DIR / ".env",
    _REPO_ROOT / "backend" / ".env",
    _REPO_ROOT / "ai-service" / ".env",
    _REPO_ROOT / ".env",
]
for _env_file in _ENV_CANDIDATES:
    if _env_file.is_file():
        load_dotenv(dotenv_path=_env_file, override=False)


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
    LLM_PROVIDER: str = Field(
        default="openai",
        validation_alias=AliasChoices("LLM_PROVIDER"),
    )
    LLM_API_KEY: str = Field(
        default="",
        validation_alias=AliasChoices("LLM_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY"),
    )
    LLM_BASE_URL: str = Field(
        default="https://api.openai.com/v1",
        validation_alias=AliasChoices("LLM_BASE_URL", "OPENAI_BASE_URL"),
    )
    LLM_MODEL: str = Field(
        default="gpt-4o-mini",
        validation_alias=AliasChoices("LLM_MODEL", "OPENAI_MODEL"),
    )
    LLM_TEMPERATURE: float = 0.0
    LLM_MAX_TOKENS: int = Field(
        default=1024,
        validation_alias=AliasChoices("LLM_MAX_TOKENS", "MAX_TOKENS"),
    )
    LLM_TIMEOUT_SECONDS: float = 30.0
    LLM_MAX_RETRIES: int = 3
    STT_CONFIDENCE_THRESHOLD: float = 0.90
    STT_CONTEXT_BEFORE: int = 2
    STT_CONTEXT_AFTER: int = 2

    # Groq Client Reliability & Model Fallback settings
    GROQ_PRIMARY_MODEL: str = Field(
        default="llama-3.3-70b-versatile",
        validation_alias=AliasChoices("GROQ_PRIMARY_MODEL", "LLM_MODEL"),
    )
    GROQ_FALLBACK_MODELS: str = Field(
        default="llama-3.1-8b-instant,mixtral-8x7b-32768,gemma2-9b-it",
        validation_alias=AliasChoices("GROQ_FALLBACK_MODELS", "LLM_FALLBACK_MODELS"),
    )
    GROQ_MAX_RETRIES: int = Field(
        default=2,
        validation_alias=AliasChoices("GROQ_MAX_RETRIES", "LLM_MAX_RETRIES"),
    )
    GROQ_REQUEST_TIMEOUT: float = Field(
        default=10.0,
        validation_alias=AliasChoices("GROQ_REQUEST_TIMEOUT", "LLM_TIMEOUT_SECONDS"),
    )
    GROQ_MAX_BACKOFF_SECONDS: float = 15.0
    GROQ_CIRCUIT_BREAKER_COOLDOWN_SECONDS: float = 300.0
    GROQ_CONCURRENCY_LIMIT: int = 1
    GROQ_PACING_DELAY_SECONDS: float = 0.5

    # Grammar and Punctuation Normalization settings (Part 7)
    GRAMMAR_CONFIDENCE_THRESHOLD: float = 0.85
    GRAMMAR_CONTEXT_BEFORE: int = 2
    GRAMMAR_CONTEXT_AFTER: int = 2

    # Technical Terminology Normalization settings (Part 8)
    TERMINOLOGY_CONFIDENCE_THRESHOLD: float = 0.90
    TERMINOLOGY_CONTEXT_BEFORE: int = 2
    TERMINOLOGY_CONTEXT_AFTER: int = 2

    # Contextual Consistency Check settings (Part 9)
    CONTEXT_CONFIDENCE_THRESHOLD: float = 0.80
    CONTEXT_BEFORE: int = 3
    CONTEXT_AFTER: int = 3

    # Speaker Attribution Validation settings (Part 10)
    SPEAKER_CONFIDENCE_STRONG: float = 0.90
    SPEAKER_CONFIDENCE_REVIEW: float = 0.75
    SPEAKER_CONTEXT_BEFORE: int = 3
    SPEAKER_CONTEXT_AFTER: int = 3

    # Language Preservation Check settings (Part 11)
    LANGUAGE_CONFIDENCE_STRONG: float = 0.90
    LANGUAGE_CONFIDENCE_REVIEW: float = 0.75

    # Semantic Preservation Validation settings (Part 12)
    SEMANTIC_CONFIDENCE_STRONG: float = 0.90
    SEMANTIC_CONFIDENCE_REVIEW: float = 0.75
    SEMANTIC_CONTEXT_BEFORE: int = 3
    SEMANTIC_CONTEXT_AFTER: int = 3

    # Storage and Processing Persistence settings (Part 14)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = Field(
        default="meetings",
        validation_alias=AliasChoices("SUPABASE_STORAGE_BUCKET", "SUPABASE_BUCKET"),
    )
    CLEANER_VERSION: str = "1.0.0"
    OVERWRITE_PROCESSED_TRANSCRIPT: bool = True

    @model_validator(mode="after")
    def configure_llm_defaults(self) -> "Settings":
        key = (self.LLM_API_KEY or "").strip()
        # If Groq API key is detected and defaults were not explicitly altered:
        if key.startswith("gsk_") or self.LLM_PROVIDER.lower() == "groq":
            if self.LLM_BASE_URL == "https://api.openai.com/v1":
                self.LLM_BASE_URL = "https://api.groq.com/openai/v1"
            if self.LLM_MODEL == "gpt-4o-mini":
                self.LLM_MODEL = "llama-3.3-70b-versatile"
            if self.LLM_PROVIDER.lower() in ("openai", "mock"):
                self.LLM_PROVIDER = "groq"
        return self

    model_config = SettingsConfigDict(
        env_file=[str(p) for p in _ENV_CANDIDATES if p.is_file()],
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
