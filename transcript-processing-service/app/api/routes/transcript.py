import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.transcript import (
    AnalyzeNoiseRequest,
    AnalyzeNoiseResponse,
    FilterRelevanceRequest,
    FilterRelevanceResponse,
    MergeFragmentsRequest,
    MergeFragmentsResponse,
    ParseTranscriptRequest,
    ParsedTranscript,
    RemoveRepetitionsRequest,
    RemoveRepetitionsResponse,
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


@router.post(
    "/remove-repetitions",
    response_model=RemoveRepetitionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove STT repetitions from structured transcript (Part 3)",
    description=(
        "Detects and safely removes consecutive word repetitions, repeated phrases, "
        "and exact/near duplicate consecutive segments from the same speaker. "
        "Original verbatim text, speaker, and sequence are preserved 100% untouched."
    ),
)
async def remove_repetitions_endpoint(
    request: RemoveRepetitionsRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> RemoveRepetitionsResponse:
    """
    Handle POST /transcript/remove-repetitions.
    Delegates to TranscriptService -> RepetitionRemover.
    """
    try:
        return service.remove_repetitions(
            meeting_id=request.meeting_id,
            segments=request.segments,
        )
    except Exception as exc:
        logger.exception("Unexpected error while removing repetitions: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while removing repetitions: {str(exc)}",
        )


@router.post(
    "/filter-relevance",
    response_model=FilterRelevanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Filter pre-meeting and irrelevant content (Part 4)",
    description=(
        "Identifies pre-meeting conversation, audio checks, connection checks, "
        "and irrelevant content while strictly preserving meeting content, technical "
        "discussions, speaker boundaries, and raw verbatim text."
    ),
)
async def filter_relevance_endpoint(
    request: FilterRelevanceRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> FilterRelevanceResponse:
    """
    Handle POST /transcript/filter-relevance.
    Delegates to TranscriptService -> RelevanceFilter.
    """
    try:
        return service.filter_relevance(
            meeting_id=request.meeting_id,
            segments=request.segments,
        )
    except Exception as exc:
        logger.exception("Unexpected error while filtering relevance: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while filtering relevance: {str(exc)}",
        )


@router.post(
    "/merge-fragments",
    response_model=MergeFragmentsResponse,
    status_code=status.HTTP_200_OK,
    summary="Merge split fragments into coherent sentences (Part 5)",
    description=(
        "Converts filtered transcript segments into coherent conversational units by merging "
        "sentence fragments belonging to the same speaker while preserving exact constituent words, "
        "source sequences, and all upstream metadata."
    ),
)
async def merge_fragments_endpoint(
    request: MergeFragmentsRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> MergeFragmentsResponse:
    """
    Handle POST /transcript/merge-fragments.
    Delegates to TranscriptService -> FragmentMerger.
    """
    try:
        return service.merge_fragments(
            meeting_id=request.meeting_id,
            segments=request.segments,
        )
    except Exception as exc:
        logger.exception("Unexpected error while merging fragments: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while merging fragments: {str(exc)}",
        )



