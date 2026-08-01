from groq import Groq

from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

MIME_EXT = {
    "audio/webm": ".webm",
    "audio/mp4": ".m4a",
    "audio/m4a": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/aac": ".aac",
    "audio/flac": ".flac",
    "application/octet-stream": ".webm",
}


def _ext_for(mime_type: str) -> str:
    return MIME_EXT.get((mime_type or "").lower(), ".webm")


class GroqWhisperClient:
    """Thin wrapper around the Groq Whisper transcription API."""

    def __init__(self, api_key: str, model: str, language: str = "") -> None:
        if not api_key:
            logger.warning("GROQ_API_KEY not set — transcription will be unavailable")
        self._client = Groq(api_key=api_key or "missing") if api_key else None
        self._model = model
        self._language = language or None

    def transcribe(self, audio_bytes: bytes, mime_type: str) -> list[dict]:
        """Transcribe audio bytes and return [{start, end, text}, ...]."""
        if not self._client:
            raise RuntimeError("Groq client is not configured (GROQ_API_KEY missing)")

        if not audio_bytes:
            raise ValueError("Empty audio payload")

        kwargs: dict = {
            "file": ("audio%s" % _ext_for(mime_type), audio_bytes, mime_type or "audio/webm"),
            "model": self._model,
            "response_format": "verbose_json",
            "timestamp_granularities": ["segment"],
        }
        if self._language:
            kwargs["language"] = self._language

        result = self._client.audio.transcriptions.create(**kwargs)
        segments = getattr(result, "segments", None) or []

        recognized = []
        for seg in segments:
            text = (getattr(seg, "text", "") or "").strip()
            if not text:
                continue
            recognized.append({
                "start": round(float(getattr(seg, "start", 0.0)), 3),
                "end": round(float(getattr(seg, "end", 0.0)), 3),
                "text": text,
            })

        logger.info("Transcribed %d bytes -> %d segment(s)", len(audio_bytes), len(recognized))
        return recognized


# Singleton, configured at import time from env.
groq_client = GroqWhisperClient(
    api_key=settings.groq_api_key,
    model=settings.groq_model,
    language=settings.groq_language,
)
