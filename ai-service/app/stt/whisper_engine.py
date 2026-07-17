import numpy as np
from faster_whisper import WhisperModel
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class WhisperSTT:
    """
    Wraps faster-whisper for streaming Speech-to-Text.
    One instance is shared across the application (loaded once at startup).
    """

    def __init__(self) -> None:
        logger.info(
            f"Loading Whisper model '{settings.whisper_model}' "
            f"on {settings.whisper_device} ({settings.whisper_compute_type})"
        )
        self._model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
        logger.info("Whisper model loaded.")

    def transcribe_chunk(self, audio_bytes: bytes, sample_rate: int = 16000) -> str:
        """
        Transcribe a raw PCM audio chunk (16-bit signed, mono).
        Returns the transcribed text or empty string.
        """
        if len(audio_bytes) < 512:
            return ""

        # Convert raw PCM bytes → float32 numpy array normalised to [-1, 1]
        audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0

        segments, _ = self._model.transcribe(
            audio_np,
            language="en",
            beam_size=1,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300},
        )

        return " ".join(seg.text.strip() for seg in segments).strip()


# Singleton — loaded once at startup
whisper_stt = WhisperSTT()
