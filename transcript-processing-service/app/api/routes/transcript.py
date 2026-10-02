import logging
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from app.models.transcript import (
    AnalyzeNoiseRequest,
    AnalyzeNoiseResponse,
    CorrectSTTRequest,
    CorrectSTTResponse,
    FilterRelevanceRequest,
    FilterRelevanceResponse,
    MergeFragmentsRequest,
    MergeFragmentsResponse,
    NormalizeGrammarRequest,
    NormalizeGrammarResponse,
    NormalizeTerminologyRequest,
    NormalizeTerminologyResponse,
    ParseTranscriptRequest,
    ParsedTranscript,
    RemoveRepetitionsRequest,
    RemoveRepetitionsResponse,
    ValidateContextRequest,
    ValidateContextResponse,
    ValidateSpeakersRequest,
    ValidateSpeakersResponse,
    ValidateLanguageRequest,
    ValidateLanguageResponse,
    ValidateSemanticsRequest,
    ValidateSemanticsResponse,
)
from app.models.final_transcript import (
    FormatFinalTranscriptRequest,
    FormatFinalTranscriptResponse,
)
from app.models.processing import (
    ProcessingRecord,
    StoreFinalTranscriptRequest,
    StoreFinalTranscriptResponse,
)
from app.models.meeting_agent import (
    MeetingAIPipelineResponse,
    MeetingAnalysisResult,
)
from app.models.scrum_agent import ScrumResult
from app.models.orchestrator import (
    ProcessTranscriptRequest,
    ProcessTranscriptResponse,
)
from app.config.storage import InvalidMeetingIdError
from app.services.meeting_agent import (
    EmptyTranscriptException,
    MeetingAnalysisError,
)
from app.services.scrum_agent import (
    ScrumAnalysisError,
)
from app.services.meeting_ai_pipeline import (
    MeetingAIPipelineError,
    TranscriptRetrievalError,
)
from app.services.storage_service import (
    TranscriptStorageError,
    TranscriptUploadError,
    TranscriptVerificationError,
)
from app.services.transcript_orchestrator import (
    ConcurrentProcessingError,
    EmptyTranscriptError,
    MissingRawTranscriptError,
    NonRetryableStageError,
    PipelineStageError,
    RetryableStageError,
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


@router.post(
    "/correct-stt",
    response_model=CorrectSTTResponse,
    status_code=status.HTTP_200_OK,
    summary="Correct STT errors in structured transcript (Part 6)",
    description=(
        "Identifies and corrects high-confidence speech-to-text recognition errors "
        "while strictly preserving original meaning, language, speaker, and intent. "
        "The original raw text and upstream processed_text are preserved 100% untouched."
    ),
)
async def correct_stt_endpoint(
    request: CorrectSTTRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> CorrectSTTResponse:
    """
    Handle POST /transcript/correct-stt.
    Delegates to TranscriptService -> STTCorrector.
    """
    try:
        return service.correct_stt(
            meeting_id=request.meeting_id,
            segments=request.segments,
        )
    except Exception as exc:
        logger.exception("Unexpected error while correcting STT errors: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while correcting STT errors: {str(exc)}",
        )


@router.post(
    "/normalize-grammar",
    response_model=NormalizeGrammarResponse,
    status_code=status.HTTP_200_OK,
    summary="Normalize grammar and punctuation in transcript (Part 7)",
    description=(
        "Improves grammatical readability and normalizes punctuation across "
        "transcript segments while strictly preserving meaning, speaker intent, "
        "conversational tone, language, and conversation structure. "
        "Original raw text, processed text, and STT-corrected text remain 100% untouched."
    ),
)
async def normalize_grammar_endpoint(
    request: NormalizeGrammarRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> NormalizeGrammarResponse:
    """
    Handle POST /transcript/normalize-grammar.
    Delegates to TranscriptService -> GrammarNormalizer.
    """
    try:
        return service.normalize_grammar(
            meeting_id=request.meeting_id,
            segments=request.segments,
        )
    except Exception as exc:
        logger.exception("Unexpected error while normalizing grammar: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while normalizing grammar: {str(exc)}",
        )


@router.post(
    "/normalize-terminology",
    response_model=NormalizeTerminologyResponse,
    status_code=status.HTTP_200_OK,
    summary="Normalize technical terminology in transcript (Part 8)",
    description=(
        "Normalizes technical terminology to canonical representation and casing "
        "using controlled dictionary mappings and context-aware disambiguation. "
        "Original raw text, processed text, STT-corrected text, and grammar-corrected text "
        "remain 100% untouched."
    ),
)
async def normalize_terminology_endpoint(
    request: NormalizeTerminologyRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> NormalizeTerminologyResponse:
    """
    Handle POST /transcript/normalize-terminology.
    Delegates to TranscriptService -> TerminologyNormalizer.
    """
    try:
        return service.normalize_terminology(
            meeting_id=request.meeting_id,
            segments=request.segments,
        )
    except Exception as exc:
        logger.exception("Unexpected error while normalizing terminology: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while normalizing terminology: {str(exc)}",
        )


@router.post(
    "/validate-context",
    response_model=ValidateContextResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate contextual consistency of transcript (Part 9)",
    description=(
        "Validates whether the processed transcript remains logically and contextually "
        "consistent with surrounding conversation. Adheres strictly to the principle: "
        "CHECK -> FLAG -> PRESERVE. Under no circumstances is transcript text modified or rewritten."
    ),
)
async def validate_context_endpoint(
    request: ValidateContextRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> ValidateContextResponse:
    """
    Handle POST /transcript/validate-context.
    Delegates to TranscriptService -> ContextualValidator.
    """
    try:
        return service.validate_context(
            meeting_id=request.meeting_id,
            segments=request.segments,
        )
    except Exception as exc:
        logger.exception("Unexpected error while validating contextual consistency: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while validating contextual consistency: {str(exc)}",
        )


@router.post(
    "/validate-speakers",
    response_model=ValidateSpeakersResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate speaker attribution in transcript (Part 10)",
    description=(
        "Validates whether transcript dialogue is plausibly attributed to the labeled speaker "
        "based on conversational context, syntactic continuity, and turn-taking evidence. "
        "Under no circumstances is the original speaker label overwritten or transcript text modified."
    ),
)
async def validate_speakers_endpoint(
    request: ValidateSpeakersRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> ValidateSpeakersResponse:
    """
    Handle POST /transcript/validate-speakers.
    Delegates to TranscriptService -> SpeakerValidator.
    """
    try:
        meeting_id = request.meeting_id or "default_meeting"
        return service.validate_speakers(
            meeting_id=meeting_id,
            segments=request.segments,
        )
    except Exception as exc:
        logger.exception("Unexpected error while validating speaker attribution: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while validating speaker attribution: {str(exc)}",
        )


@router.post(
    "/validate-language",
    response_model=ValidateLanguageResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate language preservation in transcript (Part 11)",
    description=(
        "Verifies that the transcript-cleaning pipeline has preserved the original language "
        "characteristics, multilingual expressions, code-switching, and technical terminology. "
        "Strictly a validation stage; never translates or rewrites dialogue."
    ),
)
async def validate_language_endpoint(
    request: ValidateLanguageRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> ValidateLanguageResponse:
    """
    Handle POST /transcript/validate-language.
    Delegates to TranscriptService -> LanguageValidator.
    """
    try:
        meeting_id = request.meeting_id or "default_meeting"
        return service.validate_language(
            meeting_id=meeting_id,
            segments=request.segments,
        )
    except Exception as exc:
        logger.exception("Unexpected error while validating language preservation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while validating language preservation: {str(exc)}",
        )


@router.post(
    "/validate-semantics",
    response_model=ValidateSemanticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate semantic preservation in transcript (Part 12)",
    description=(
        "Verifies that the transcript-cleaning pipeline has preserved the original meaning, "
        "facts, intent, commitments, and relationships of the conversation. "
        "Strictly a validation stage; never rewrites or alters dialogue."
    ),
)
async def validate_semantics_endpoint(
    request: ValidateSemanticsRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> ValidateSemanticsResponse:
    """
    Handle POST /transcript/validate-semantics.
    Delegates to TranscriptService -> SemanticValidator.
    """
    try:
        meeting_id = request.meeting_id or "default_meeting"
        return service.validate_semantics(
            meeting_id=meeting_id,
            segments=request.segments,
        )
    except Exception as exc:
        logger.exception("Unexpected error while validating semantic preservation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while validating semantic preservation: {str(exc)}",
        )


@router.post(
    "/format-final",
    response_model=FormatFinalTranscriptResponse,
    status_code=status.HTTP_200_OK,
    summary="Format and serialize final clean AI-ready transcript (Part 13)",
    description=(
        "Converts validated internal transcript segments into a clean, deterministic AI-ready transcript. "
        "Selects the safest final validated text and authoritative speaker, filters irrelevant dialogue, "
        "preserves chronological order, and strips internal pipeline metadata."
    ),
)
async def format_final_endpoint(
    request: FormatFinalTranscriptRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> FormatFinalTranscriptResponse:
    """
    Handle POST /transcript/format-final.
    Delegates to TranscriptService -> TranscriptFormatter.
    """
    try:
        meeting_id = request.meeting_id or "default_meeting"
        return service.format_final(
            meeting_id=meeting_id,
            segments=request.segments,
            config=request.config,
        )
    except Exception as exc:
        logger.exception("Unexpected error while formatting final transcript: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while formatting final transcript: {str(exc)}",
        )


@router.post(
    "/store-final",
    response_model=StoreFinalTranscriptResponse,
    status_code=status.HTTP_200_OK,
    summary="Store final clean transcript in storage and update metadata (Part 14)",
    description=(
        "Persists the final cleaned transcript produced by Part 13 to Supabase Storage or Local Storage. "
        "Strictly guarantees raw transcript is never overwritten, enforces UTF-8, verifies upload, "
        "and updates processing lifecycle status to READY_FOR_AI."
    ),
)
async def store_final_endpoint(
    request: StoreFinalTranscriptRequest,
    service: TranscriptService = Depends(get_transcript_service),
) -> StoreFinalTranscriptResponse:
    """
    Handle POST /transcript/store-final.
    Delegates to TranscriptService -> ProcessingService -> StorageService & Repository.
    """
    try:
        return service.store_final(
            meeting_id=request.meeting_id,
            transcript_text=request.transcript_text,
            raw_transcript_path=request.raw_transcript_path,
            overwrite=request.overwrite,
        )
    except InvalidMeetingIdError as exc:
        logger.warning("Rejected invalid meeting_id in store_final: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid meeting_id: {str(exc)}",
        )
    except (TranscriptUploadError, TranscriptVerificationError, TranscriptStorageError) as exc:
        logger.error("Storage error in store_final: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Transcript storage operation failed: {str(exc)}",
        )
    except Exception as exc:
        logger.exception("Unexpected error while storing final transcript: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while persisting final transcript: {str(exc)}",
        )


@router.post(
    "/process",
    response_model=ProcessTranscriptResponse,
    status_code=status.HTTP_200_OK,
    summary="Orchestrate the complete transcript processing pipeline (Part 15)",
    description=(
        "Executes the full 14-stage transcript processing pipeline: parse -> noise -> repetition "
        "-> relevance -> merge -> stt -> grammar -> terminology -> context -> speaker -> language "
        "-> semantic -> format -> store. Guarantees raw transcript immutability, safe fallbacks, "
        "and updates processing lifecycle status to READY_FOR_AI upon successful completion."
    ),
)
async def process_transcript_endpoint(
    request: ProcessTranscriptRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    service: TranscriptService = Depends(get_transcript_service),
) -> ProcessTranscriptResponse:
    """
    Handle POST /transcript/process.
    Executes or schedules the full 14-stage orchestrator pipeline.
    """
    try:
        if request.async_processing:
            existing = service.get_processing_status(request.meeting_id)
            if existing and existing.processing_status in ("PROCESSING", "CLEANING", "VALIDATING"):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Meeting '{request.meeting_id}' is already being processed.",
                )
            background_tasks.add_task(
                service.process_transcript,
                meeting_id=request.meeting_id,
                raw_text=request.raw_text,
                raw_transcript_path=request.raw_transcript_path,
                formatting_config=request.formatting_config,
                run_ai_pipeline=request.run_ai_pipeline,
            )
            response.status_code = status.HTTP_202_ACCEPTED
            return ProcessTranscriptResponse(
                accepted=True,
                meeting_id=request.meeting_id,
                processing_status="PENDING",
                attempt=(existing.attempt if existing else 0) + 1,
                message="Transcript processing scheduled in background.",
            )
        else:
            result = await service.process_transcript(
                meeting_id=request.meeting_id,
                raw_text=request.raw_text,
                raw_transcript_path=request.raw_transcript_path,
                formatting_config=request.formatting_config,
                run_ai_pipeline=request.run_ai_pipeline,
            )
            return result
    except HTTPException:
        raise
    except InvalidMeetingIdError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except MissingRawTranscriptError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ConcurrentProcessingError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except (EmptyTranscriptError, NonRetryableStageError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except PipelineStageError as exc:
        logger.error("Pipeline stage error in orchestrator: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline stage failure: {str(exc)}",
        )
    except Exception as exc:
        logger.exception("Unexpected error in orchestrator endpoint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcript processing failed: {str(exc)}",
        )


@router.get(
    "/status/{meeting_id}",
    response_model=ProcessingRecord,
    status_code=status.HTTP_200_OK,
    summary="Get transcript processing status and lifecycle metadata (Part 15)",
    description=(
        "Retrieves the current processing state, active stage, attempt count, "
        "metrics, and execution duration for a meeting transcript."
    ),
)
async def get_processing_status_endpoint(
    meeting_id: str,
    service: TranscriptService = Depends(get_transcript_service),
) -> ProcessingRecord:
    """
    Handle GET /transcript/status/{meeting_id}.
    Retrieves the current ProcessingRecord for the specified meeting.
    """
    try:
        record = service.get_processing_status(meeting_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No processing record found for meeting '{meeting_id}'.",
            )
        return record
    except HTTPException:
        raise
    except InvalidMeetingIdError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error fetching processing status: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve processing status: {str(exc)}",
        )


@router.post(
    "/ai-analyze/{meeting_id}",
    response_model=MeetingAIPipelineResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute First Stage AI Pipeline on stored clean transcript",
    description=(
        "Downloads the cleaned transcript .txt file from Supabase Storage, "
        "decodes as UTF-8 string, passes to the Main Meeting Agent (first LLM call), "
        "and returns the validated structured analysis (summary, topics, decisions, "
        "action items, blockers)."
    ),
)
async def ai_analyze_meeting_endpoint(
    meeting_id: str,
    custom_transcript_path: Optional[str] = None,
    service: TranscriptService = Depends(get_transcript_service),
) -> MeetingAIPipelineResponse:
    """
    Handle POST /transcript/ai-analyze/{meeting_id}.
    Stage 1: Supabase Storage .txt -> UTF-8 String -> Main Meeting Agent -> First LLM Call -> Log/Store.
    """
    try:
        return await service.run_meeting_ai_pipeline(
            meeting_id=meeting_id,
            custom_transcript_path=custom_transcript_path,
        )
    except InvalidMeetingIdError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except (TranscriptRetrievalError, FileNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except EmptyTranscriptException as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except MeetingAnalysisError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error in AI pipeline endpoint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI pipeline failed: {str(exc)}",
        )


@router.post(
    "/scrum-analyze",
    response_model=ScrumResult,
    status_code=status.HTTP_200_OK,
    summary="Transform structured meeting analysis into Scrum/Kanban work items (Stage 2)",
    description=(
        "Transforms a structured MeetingAnalysisResult produced by the Main Meeting Agent (Stage 1) "
        "into actionable Scrum tasks. Grounded strictly in the provided meeting analysis without "
        "inventing assignees, deadlines, or priorities."
    ),
)
async def scrum_analyze_endpoint(
    request: MeetingAnalysisResult,
    service: TranscriptService = Depends(get_transcript_service),
) -> ScrumResult:
    """
    Handle POST /transcript/scrum-analyze.
    Stage 2: MeetingAnalysisResult -> Scrum Intelligence Agent -> Structured ScrumResult.
    """
    try:
        return service.run_scrum_analysis(request)
    except ScrumAnalysisError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error in Scrum analyze endpoint: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scrum analysis failed: {str(exc)}",
        )




