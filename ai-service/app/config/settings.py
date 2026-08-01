from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AI service configuration loaded from environment / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Sprintive AI Service"
    app_version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # Groq Whisper
    groq_api_key: str = ""
    groq_model: str = "whisper-large-v3"
    # Optional: constrain Whisper language (e.g. "en"). Empty = auto-detect.
    groq_language: str = ""

    # Backend callback URL (used by future async flows)
    backend_url: str = "http://localhost:5000"


settings = Settings()
