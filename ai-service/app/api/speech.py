from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.schemas import SpeechRecognitionResponse
from app.speech.groq_client import groq_client
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/speech", tags=["speech"])


@router.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}


@router.post("/recognize", response_model=SpeechRecognitionResponse)
async def recognize_speech(
    file: UploadFile = File(...),
    meeting_id: str = Form(...),
    participant_id: str = Form(...),
    participant_name: str = Form(...),
) -> SpeechRecognitionResponse:
    """Transcribe one participant's audio and return recognized segments.

    No diarization, no assembly, no analysis — pure speech recognition.
    """
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    logger.info("recognize request: meeting=%s participant=%s size=%d",
                meeting_id, participant_id, len(audio_bytes))

    try:
        segments = groq_client.transcribe(audio_bytes, file.content_type or "audio/webm")
    except Exception as exc:  # noqa: BLE001 — surface any Groq/provider failure
        logger.error("Recognition failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Speech recognition failed: {exc}") from exc

    return SpeechRecognitionResponse(segments=segments)
