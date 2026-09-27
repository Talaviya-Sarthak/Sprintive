from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Header, HTTPException, status

from app.config.settings import settings
from app.models.schemas import MeetingAnalysisRequest, MeetingAnalysisResponse
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1/meetings", tags=["meetings"])

# In-memory storage for idempotency tracking in this handoff phase
_received_transcripts: Dict[str, Dict[str, Any]] = {}


def verify_internal_auth(x_internal_service_key: str | None = Header(None, alias="X-Internal-Service-Key")) -> None:
    """Validate internal service-to-service authentication."""
    expected_key = getattr(settings, "internal_service_key", "sprintive_internal_service_secret_key_2026")
    if expected_key:
        if not x_internal_service_key or x_internal_service_key != expected_key:
            logger.warning("Unauthorized access attempt to AI meetings endpoint")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing internal service key",
            )


@router.get("/health", tags=["health"])
async def meetings_health() -> dict:
    """Health check for meetings AI endpoint."""
    return {"status": "ok", "service": "meetings-ai"}


@router.post("/analyze", response_model=MeetingAnalysisResponse)
async def receive_clean_transcript(
    payload: MeetingAnalysisRequest,
    x_internal_service_key: str | None = Header(None, alias="X-Internal-Service-Key"),
) -> MeetingAnalysisResponse:
    """Receive and validate a cleaned transcript from backend for upcoming AI processing.

    In this phase, this endpoint performs deterministic verification and acknowledgement
    without triggering LLMs or generative agents.
    """
    verify_internal_auth(x_internal_service_key)

    meeting_id = payload.meeting_id.strip()
    if not meeting_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="meeting_id cannot be empty",
        )

    transcript = payload.transcript.strip()
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="transcript cannot be empty or whitespace",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    # ── Idempotency Check ──────────────────────────────────────────────────────────
    if meeting_id in _received_transcripts:
        existing = _received_transcripts[meeting_id]
        logger.info(
            "[AI_HANDOFF_RECEIVED_DUPLICATE] meeting_id=%s first_received_at=%s",
            meeting_id,
            existing["received_at"],
        )
        return MeetingAnalysisResponse(
            accepted=True,
            meeting_id=meeting_id,
            status="RECEIVED",
            received_at=existing["received_at"],
            idempotent=True,
        )

    # Record receipt (without logging transcript content)
    _received_transcripts[meeting_id] = {
        "meeting_id": meeting_id,
        "transcript_length": len(transcript),
        "language": payload.language,
        "transcript_version": payload.transcript_version,
        "metadata": payload.metadata,
        "received_at": now_iso,
    }

    logger.info(
        "[AI_HANDOFF_RECEIVED] meeting_id=%s length=%d language=%s",
        meeting_id,
        len(transcript),
        payload.language,
    )

    return MeetingAnalysisResponse(
        accepted=True,
        meeting_id=meeting_id,
        status="RECEIVED",
        received_at=now_iso,
        idempotent=False,
    )
