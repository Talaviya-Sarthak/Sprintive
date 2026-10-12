"""Transcript Processing Orchestrator for Part 15.

Connects and executes all 14 stages of the Sprintive transcript-cleaning pipeline:
1. Transcript Parsing
2. Noise & Filler Detection
3. Repetition Removal
4. Pre-Meeting / Irrelevant Content Filtering
5. Sentence Segmentation & Fragment Merging
6. STT Error Correction
7. Grammar & Punctuation Normalization
8. Technical Terminology Normalization
9. Contextual Consistency Validation
10. Speaker Attribution Validation
11. Language Preservation Validation
12. Semantic Preservation Validation
13. Final Transcript Formatting
14. Storage in Supabase & Metadata Update

Follows the strict boundary:
    RAW TRANSCRIPT -> PIPELINE -> CLEANED TRANSCRIPT -> READY_FOR_AI -> AI AGENTS
"""

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config.formatting import FormattingConfig
from app.config.storage import (
    InvalidMeetingIdError,
    StorageConfig,
    build_cleaned_transcript_path,
    build_raw_transcript_path,
    validate_meeting_id,
)
from app.core.config import settings
from app.models.final_transcript import FinalizationResult, FinalizationStatus
from app.models.orchestrator import (
    ProcessingContext,
    ProcessTranscriptRequest,
    ProcessTranscriptResponse,
    StageResult,
)
from app.models.processing import ProcessingRecord, ProcessingStatus
from app.models.transcript import SegmentClassification, TranscriptSegment

# Stage service dependencies (pure decoupled functional modules)
from app.services.contextual_validator import validate_context
from app.services.final_validator import validate_final_structure
from app.services.fragment_merger import merge_fragments
from app.services.grammar_normalizer import normalize_grammar_and_punctuation
from app.services.language_validator import validate_language_preservation
from app.services.llm_client import BaseLLMClient, get_llm_client
from app.services.noise_detector import detect_noise_and_fillers
from app.services.processing_service import ProcessingService, get_processing_service
from app.services.relevance_filter import filter_irrelevant_content
from app.services.repetition_remover import remove_repetitions
from app.services.semantic_validator import validate_semantic_preservation
from app.services.speaker_validator import validate_speakers
from app.services.storage_service import (
    TranscriptStorageError,
    TranscriptStorageService,
    get_storage_service,
)
from app.services.stt_corrector import correct_stt_segments
from app.services.terminology_normalizer import normalize_terminology
from app.services.transcript_formatter import format_final_transcript
from app.services.transcript_parser import parse_transcript
from app.services.transcript_repository import (
    BaseTranscriptRepository,
    ConcurrentProcessingError,
    get_transcript_repository,
)

logger = logging.getLogger(__name__)


# Pipeline stage identifiers in exact execution order
PIPELINE_STAGES = [
    "parse",
    "noise",
    "repetition",
    "relevance",
    "merge",
    "stt",
    "grammar",
    "terminology",
    "context",
    "speaker",
    "language",
    "semantic",
    "format",
    "store",
]


class ProcessingError(Exception):
    """Base error for orchestrator failures."""

    def __init__(self, message: str, stage: str = "orchestrator", retryable: bool = False):
        super().__init__(message)
        self.message = message
        self.stage = stage
        self.retryable = retryable


class RetryableProcessingError(ProcessingError):
    """Transient error that can safely be retried."""

    def __init__(self, message: str, stage: str = "orchestrator"):
        super().__init__(message, stage=stage, retryable=True)


class NonRetryableProcessingError(ProcessingError):
    """Fatal error that should not be retried."""

    def __init__(self, message: str, stage: str = "orchestrator"):
        super().__init__(message, stage=stage, retryable=False)


class MissingRawTranscriptError(NonRetryableProcessingError):
    """Raised when raw transcript file does not exist in storage."""

    def __init__(self, message: str):
        super().__init__(message, stage="retrieve_raw")


class EmptyTranscriptError(NonRetryableProcessingError):
    """Raised when raw transcript is empty or contains no spoken content."""

    def __init__(self, message: str):
        super().__init__(message, stage="parse")


class FinalizationBlockedError(NonRetryableProcessingError):
    """Raised when Part 13 Final Formatting is BLOCKED due to critical contradictions."""

    def __init__(self, message: str):
        super().__init__(message, stage="format")


# Aliases for flexible naming
PipelineStageError = ProcessingError
RetryableStageError = RetryableProcessingError
NonRetryableStageError = NonRetryableProcessingError



# --- Pipeline Stage Abstraction & Implementations ---


class PipelineStage(ABC):
    """Abstract interface for a pipeline stage."""

    name: str

    @abstractmethod
    def execute(self, context: ProcessingContext) -> ProcessingContext:
        """Execute the stage logic, mutating and enriching context."""
        pass


class ParseStage(PipelineStage):
    name = "parse"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        if not context.raw_transcript or not context.raw_transcript.strip():
            raise EmptyTranscriptError(f"Raw transcript for meeting {context.meeting_id} is empty.")

        parsed = parse_transcript(context.raw_transcript)
        context.segments = parsed.segments
        if parsed.warnings:
            context.warnings.extend(parsed.warnings)

        if not context.segments:
            raise EmptyTranscriptError(f"Transcript parsed into 0 dialogue segments for meeting {context.meeting_id}.")

        context.metrics["total_segments"] = len(context.segments)
        return context


class NoiseStage(PipelineStage):
    name = "noise"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        context.segments = detect_noise_and_fillers(context.segments)
        noise_count = sum(
            1 for s in context.segments
            if s.classification in (SegmentClassification.FILLER, SegmentClassification.NOISE)
        )
        context.metrics["noise_segments"] = noise_count
        return context


class RepetitionStage(PipelineStage):
    name = "repetition"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        context.segments = remove_repetitions(context.segments)
        rep_count = sum(1 for s in context.segments if s.repetition_modified or s.is_duplicate)
        context.metrics["repetition_segments"] = rep_count
        return context


class RelevanceStage(PipelineStage):
    name = "relevance"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        context.segments = filter_irrelevant_content(context.segments)
        excluded_count = sum(1 for s in context.segments if s.include_in_meeting is False)
        context.metrics["excluded_segments"] = excluded_count
        return context


class MergeStage(PipelineStage):
    name = "merge"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        context.segments = merge_fragments(context.segments)
        merged_count = sum(1 for s in context.segments if s.merged)
        context.metrics["merged_segments"] = merged_count
        return context


class STTStage(PipelineStage):
    name = "stt"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        context.segments = correct_stt_segments(context.segments, llm_client=context.llm_client)
        stt_count = sum(1 for s in context.segments if s.stt_modified)
        context.metrics["stt_modified_segments"] = stt_count
        return context


class GrammarStage(PipelineStage):
    name = "grammar"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        context.segments = normalize_grammar_and_punctuation(context.segments, llm_client=context.llm_client)
        grammar_count = sum(1 for s in context.segments if s.grammar_modified)
        context.metrics["grammar_modified_segments"] = grammar_count
        return context


class TerminologyStage(PipelineStage):
    name = "terminology"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        context.segments = normalize_terminology(context.segments, llm_client=context.llm_client)
        term_count = sum(1 for s in context.segments if s.terminology_modified)
        context.metrics["terminology_modified_segments"] = term_count
        return context


class ContextValidationStage(PipelineStage):
    name = "context"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        context.segments = validate_context(context.segments, llm_client=context.llm_client)
        warnings_count = sum(len(s.context_flags) for s in context.segments)
        context.metrics["context_warnings"] = warnings_count
        return context


class SpeakerValidationStage(PipelineStage):
    name = "speaker"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        context.segments = validate_speakers(context.segments, llm_client=context.llm_client)
        warnings_count = sum(len(s.speaker_flags) for s in context.segments)
        context.metrics["speaker_warnings"] = warnings_count
        return context


class LanguageValidationStage(PipelineStage):
    name = "language"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        validated_segments, _ = validate_language_preservation(context.segments, llm_client=context.llm_client)
        context.segments = validated_segments
        warnings_count = sum(len(s.language_flags) for s in context.segments)
        context.metrics["language_warnings"] = warnings_count
        return context


class SemanticValidationStage(PipelineStage):
    name = "semantic"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        context.segments = validate_semantic_preservation(context.segments, llm_client=context.llm_client)
        warnings_count = sum(len(s.semantic_flags) for s in context.segments)
        context.metrics["semantic_warnings"] = warnings_count
        return context


class FormatStage(PipelineStage):
    name = "format"

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        res = format_final_transcript(
            segments=context.segments,
            config=context.formatting_config,
            meeting_id=context.meeting_id,
        )
        context.finalization_result = res
        if res.warnings:
            context.warnings.extend([f"[{w.sequence}] {w.type}: {w.message}" for w in res.warnings])

        if res.status == FinalizationStatus.BLOCKED:
            raise FinalizationBlockedError(
                f"Meeting {context.meeting_id} finalization BLOCKED due to critical validation contradictions."
            )

        context.metrics["included_segments"] = res.included_segments
        context.metrics["final_status"] = res.status.value
        return context


class StoreStage(PipelineStage):
    name = "store"

    def __init__(
        self,
        storage_service: Optional[TranscriptStorageService] = None,
        processing_service: Optional[ProcessingService] = None,
    ):
        self.storage_service = storage_service or get_storage_service()
        self.processing_service = processing_service

    def execute(self, context: ProcessingContext) -> ProcessingContext:
        if not context.finalization_result or not context.finalization_result.transcript_text.strip():
            raise EmptyTranscriptError(f"No finalized transcript text to store for meeting {context.meeting_id}.")

        stored_path = self.storage_service.upload_cleaned_transcript(
            meeting_id=context.meeting_id,
            transcript_text=context.finalization_result.transcript_text,
            overwrite=True,
        )
        context.cleaned_transcript_path = stored_path
        context.metrics["cleaned_transcript_path"] = stored_path
        return context


# --- Transcript Processing Orchestrator ---


class TranscriptOrchestrator:
    """
    Central orchestrator coordinating the execution of the 14-stage transcript cleaning pipeline.
    Owns the workflow, lifecycle status updates, failure handling, and metrics collection.
    """

    def __init__(
        self,
        stages: Optional[Any] = None,
        storage_service: Optional[TranscriptStorageService] = None,
        repository: Optional[BaseTranscriptRepository] = None,
        processing_service: Optional[ProcessingService] = None,
        llm_client: Optional[BaseLLMClient] = None,
    ):
        self.storage_service = storage_service or get_storage_service()
        self.repository = repository or get_transcript_repository()
        self.processing_service = processing_service or get_processing_service(
            storage_service=self.storage_service,
            repository=self.repository,
        )
        self._llm_client = llm_client

        if stages is not None:
            if isinstance(stages, list):
                self._stages = {s.name: s for s in stages}
            elif isinstance(stages, dict):
                self._stages = stages
            else:
                raise ValueError("stages must be a list of PipelineStage or dict of stage names to PipelineStage")
        else:
            # Build stage handlers map
            self._stages: Dict[str, PipelineStage] = {
                "parse": ParseStage(),
                "noise": NoiseStage(),
                "repetition": RepetitionStage(),
                "relevance": RelevanceStage(),
                "merge": MergeStage(),
                "stt": STTStage(),
                "grammar": GrammarStage(),
                "terminology": TerminologyStage(),
                "context": ContextValidationStage(),
                "speaker": SpeakerValidationStage(),
                "language": LanguageValidationStage(),
                "semantic": SemanticValidationStage(),
                "format": FormatStage(),
                "store": StoreStage(
                    storage_service=self.storage_service,
                    processing_service=self.processing_service,
                ),
            }

    @property
    def llm_client(self) -> BaseLLMClient:
        return self._llm_client or get_llm_client()


    async def execute_stage(
        self,
        stage_name: str,
        context: ProcessingContext,
    ) -> ProcessingContext:
        """
        Execute an individual pipeline stage with timing, logging, and error instrumentation.
        """
        stage_handler = self._stages.get(stage_name)
        if not stage_handler:
            raise NonRetryableProcessingError(f"Unknown pipeline stage: '{stage_name}'", stage=stage_name)

        context.current_stage = stage_name
        start_time = time.perf_counter()

        logger.info(
            "Executing pipeline stage='%s' for meeting_id=%s (attempt=%d)",
            stage_name,
            context.meeting_id,
            context.attempt,
        )

        try:
            # Execute synchronously in async worker loop
            context = await asyncio.to_thread(stage_handler.execute, context)
            duration_ms = int((time.perf_counter() - start_time) * 1000)

            context.stage_durations[stage_name] = duration_ms
            stage_res = StageResult(
                stage=stage_name,
                success=True,
                warnings=list(context.warnings),
                metrics=dict(context.metrics),
                duration_ms=duration_ms,
            )
            context.stage_history.append(stage_res)

            logger.info(
                "Stage='%s' completed successfully for meeting_id=%s in %dms",
                stage_name,
                context.meeting_id,
                duration_ms,
            )
            return context

        except Exception as exc:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            context.stage_durations[stage_name] = duration_ms
            stage_res = StageResult(
                stage=stage_name,
                success=False,
                error=str(exc),
                duration_ms=duration_ms,
            )
            context.stage_history.append(stage_res)
            logger.error(
                "Stage='%s' failed for meeting_id=%s in %dms: %s",
                stage_name,
                context.meeting_id,
                duration_ms,
                exc,
            )
            if not isinstance(exc, ProcessingError):
                raise PipelineStageError(str(exc), stage=stage_name) from exc
            raise exc


    async def process_transcript(
        self,
        meeting_id: str,
        raw_text: Optional[str] = None,
        raw_transcript_path: Optional[str] = None,
        formatting_config: Optional[FormattingConfig] = None,
        enforce_concurrency: bool = True,
        run_ai_pipeline: bool = True,
    ) -> ProcessTranscriptResponse:
        """
        Execute the complete 14-stage transcript processing pipeline.

        Lifecycle Status Flow:
            PENDING -> PROCESSING -> CLEANING -> VALIDATING -> COMPLETED -> READY_FOR_AI
            (or FAILED upon unhandled exception)

        Args:
            meeting_id: Unique meeting identifier.
            raw_text: Optional raw text directly provided.
            raw_transcript_path: Optional custom path in storage for raw transcript.
            formatting_config: Optional formatting options for Part 13.
            enforce_concurrency: Whether to block simultaneous runs for same meeting.
            run_ai_pipeline: Whether to automatically trigger the First Stage Main Meeting Agent.

        Returns:
            ProcessTranscriptResponse with final status, path, metrics, and optional meeting_analysis.
        """
        # 1. Validate meeting_id against path traversal
        valid_id = validate_meeting_id(meeting_id)
        effective_raw_path = raw_transcript_path or build_raw_transcript_path(valid_id)
        start_ts = time.perf_counter()

        # 2. Concurrency guard and attempt initialization in repository
        record = self.repository.start_processing(
            meeting_id=valid_id,
            raw_transcript_path=effective_raw_path,
            enforce_concurrency=enforce_concurrency,
        )

        context = ProcessingContext(
            meeting_id=valid_id,
            attempt=record.attempt,
            raw_transcript_path=effective_raw_path,
            cleaner_version=settings.CLEANER_VERSION,
            llm_client=self.llm_client,
            formatting_config=formatting_config,
        )

        try:
            # 3. Retrieve raw transcript content
            self.repository.update_stage_status(
                meeting_id=valid_id,
                current_stage="retrieve_raw",
                processing_status=ProcessingStatus.PROCESSING,
            )

            if raw_text is not None:
                context.raw_transcript = raw_text
            else:
                try:
                    context.raw_transcript = await asyncio.to_thread(
                        self.storage_service.get_raw_transcript,
                        valid_id,
                        effective_raw_path,
                    )
                except FileNotFoundError as fnf_err:
                    raise MissingRawTranscriptError(
                        f"Raw transcript not found at '{effective_raw_path}' for meeting {valid_id}."
                    ) from fnf_err

            if not context.raw_transcript or not context.raw_transcript.strip():
                raise EmptyTranscriptError(f"Raw transcript is empty for meeting {valid_id}.")

            # 4. Pipeline Execution: Stages 1 to 5 (Parse, Noise, Repetition, Relevance, Merge)
            self.repository.update_stage_status(valid_id, "parse", ProcessingStatus.PROCESSING)
            context = await self.execute_stage("parse", context)
            context = await self.execute_stage("noise", context)
            context = await self.execute_stage("repetition", context)
            context = await self.execute_stage("relevance", context)
            context = await self.execute_stage("merge", context)

            # 5. Cleaning Stages: 6 to 8 (STT, Grammar, Terminology)
            self.repository.update_stage_status(valid_id, "stt", ProcessingStatus.CLEANING, context.metrics)
            context = await self.execute_stage("stt", context)
            context = await self.execute_stage("grammar", context)
            context = await self.execute_stage("terminology", context)

            # 6. Validation Stages: 9 to 12 (Context, Speaker, Language, Semantic)
            self.repository.update_stage_status(valid_id, "context", ProcessingStatus.VALIDATING, context.metrics)
            context = await self.execute_stage("context", context)
            context = await self.execute_stage("speaker", context)
            context = await self.execute_stage("language", context)
            context = await self.execute_stage("semantic", context)

            # 7. Final Formatting Stage: 13
            self.repository.update_stage_status(valid_id, "format", ProcessingStatus.COMPLETED, context.metrics)
            context = await self.execute_stage("format", context)

            # 8. Storage Stage: 14 (Persistence & Mark READY_FOR_AI)
            self.repository.update_stage_status(valid_id, "store", ProcessingStatus.COMPLETED, context.metrics)
            context = await self.execute_stage("store", context)

            total_duration_ms = int((time.perf_counter() - start_ts) * 1000)
            context.metrics["total_duration_ms"] = total_duration_ms
            context.completed_at = datetime.now(timezone.utc)

            # Mark READY_FOR_AI in repository with complete metrics
            final_record = self.repository.mark_ready_for_ai(
                meeting_id=valid_id,
                cleaned_transcript_path=context.cleaned_transcript_path or build_cleaned_transcript_path(valid_id),
                cleaner_version=context.cleaner_version,
                duration_ms=total_duration_ms,
                metrics=context.metrics,
                warnings=context.warnings,
            )

            # AI Pipeline Execution (Stage 1 Meeting Analysis + Stage 2 Scrum Tasks + Stage 3 Task Resolution & Persistence)
            meeting_analysis = None
            scrum_analysis = None
            resolved_tasks = None
            if run_ai_pipeline:
                try:
                    from app.services.meeting_ai_pipeline import run_meeting_ai_pipeline
                    ai_pipeline_resp = await run_meeting_ai_pipeline(
                        meeting_id=valid_id,
                        custom_transcript_path=final_record.cleaned_transcript_path,
                        storage_service=self.storage_service,
                        llm_client=self.llm_client,
                        run_scrum_agent=True,
                        run_task_resolution=True,
                        persist_to_database=True,
                    )
                    meeting_analysis = ai_pipeline_resp.analysis
                    scrum_analysis = ai_pipeline_resp.scrum_analysis
                    resolved_tasks = ai_pipeline_resp.resolved_tasks

                    if meeting_analysis:
                        context.metrics["meeting_analysis"] = meeting_analysis.model_dump()
                    if scrum_analysis:
                        context.metrics["scrum_analysis"] = scrum_analysis.model_dump()
                    if resolved_tasks:
                        context.metrics["resolved_tasks"] = [t.model_dump() for t in resolved_tasks]
                except Exception as ai_err:
                    logger.error("AI pipeline execution failed for meeting %s: %s", valid_id, ai_err)
                    setattr(ai_err, "stage", "ai_pipeline")
                    raise

            logger.info("Pipeline completed successfully for meeting %s in %dms", valid_id, total_duration_ms)

            return ProcessTranscriptResponse(
                accepted=True,
                meeting_id=valid_id,
                processing_status=final_record.processing_status,
                current_stage=context.current_stage,
                attempt=final_record.attempt,
                cleaner_version=final_record.cleaner_version,
                cleaned_transcript_path=final_record.cleaned_transcript_path,
                duration_ms=total_duration_ms,
                metrics=context.metrics,
                warnings=context.warnings,
                meeting_analysis=meeting_analysis,
                scrum_analysis=scrum_analysis,
                resolved_tasks=resolved_tasks,
                error=None,
            )

        except Exception as exc:
            total_duration_ms = int((time.perf_counter() - start_ts) * 1000)
            error_stage = getattr(exc, "stage", context.current_stage or "orchestrator")
            error_msg = str(exc)

            logger.exception(
                "Orchestrator encountered failure at stage='%s' for meeting %s: %s",
                error_stage,
                valid_id,
                error_msg,
            )

            self.repository.mark_failed(
                meeting_id=valid_id,
                error_message=error_msg,
                error_stage=error_stage,
                duration_ms=total_duration_ms,
            )

            raise



# Default orchestrator instance
_default_orchestrator: Optional[TranscriptOrchestrator] = None


def get_transcript_orchestrator(
    storage_service: Optional[TranscriptStorageService] = None,
    repository: Optional[BaseTranscriptRepository] = None,
    processing_service: Optional[ProcessingService] = None,
    llm_client: Optional[BaseLLMClient] = None,
) -> TranscriptOrchestrator:
    """Dependency injector for TranscriptOrchestrator."""
    return TranscriptOrchestrator(
        storage_service=storage_service,
        repository=repository,
        processing_service=processing_service,
        llm_client=llm_client,
    )

