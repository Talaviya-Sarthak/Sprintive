from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Sprintive AI Service"
    app_version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # Whisper model size: tiny | base | small | medium | large-v3
    whisper_model: str = "base"
    whisper_device: str = "cpu"          # cpu | cuda
    whisper_compute_type: str = "int8"   # int8 | float16 | float32

    # Audio chunk settings
    sample_rate: int = 16000
    chunk_duration_ms: int = 1000        # process every 1 second of audio

    # Backend callback URL (for transcript save notification)
    backend_url: str = "http://localhost:5000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
