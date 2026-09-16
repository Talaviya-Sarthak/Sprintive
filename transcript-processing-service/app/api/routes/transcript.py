import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.transcript import (
    AnalyzeNoiseRequest,
    AnalyzeNoiseResponse,
    ParseTranscriptRequest,
    ParsedTranscript,
)
from app.services.transcript_service import TranscriptService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transcript", tags=["transcript"])


def get_transcript_service() -> TranscriptService:
    """Dependency injector for TranscriptService."""
    return TranscriptService()


@router.post(
    "/parse",
    response_model=ParsedTranscript,
    status_code=status.HTTP_200_OK,
    summary="Parse raw transcript into structured segments",
    description=(
        "Retrieves a raw transcript file from storage or directly accepts raw transcript text, "
        "and parses it into structured sequential segments. All text, casing, language, punctuation, "
        "and consecutive speaker segments are strictly preserved."
    ),
)
async def parse_transcript_endpoint(
    request: ParseTranscriptRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> ParsedTranscript:
    """
    Handle POST /transcript/parse.
    Delegates to TranscriptService -> TranscriptParser.
    """
    if not request.transcript_path and not request.raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'transcript_path' or 'raw_text' must be provided in the request body.",
        )

    try:
        parsed = service.process_and_parse(
            meeting_id=request.meeting_id,
            transcript_path=request.transcript_path,
            raw_text=request.raw_text,
        )
        return parsed
    except FileNotFoundError as fnf_err:
        logger.error("Transcript file not found: %s", fnf_err)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf_err),
        )
    except ValueError as val_err:
        logger.warning("Invalid parse request: %s", val_err)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.exception("Unexpected error while parsing transcript: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while parsing transcript: {str(exc)}",
        )


@router.post(
    "/analyze-noise",
    response_model=AnalyzeNoiseResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze structured transcript for noise and fillers (Part 2)",
    description=(
        "Classifies structured transcript segments into CLEAN, FILLER, NOISE, "
        "POSSIBLE_REPETITION, or UNCERTAIN, with confidence scores. "
        "The original text, speaker, and sequence are preserved 100% untouched."
    ),
)
async def analyze_noise_endpoint(
    request: AnalyzeNoiseRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> AnalyzeNoiseResponse:
    """
    Handle POST /transcript/analyze-noise.
    Delegates to TranscriptService -> NoiseDetector.
    """
    try:
        return service.analyze_noise(
            meeting_id=request.meeting_id,
            segments=request.segments,
        )
    except Exception as exc:
        logger.exception("Unexpected error while analyzing noise: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while analyzing noise: {str(exc)}",
        )
