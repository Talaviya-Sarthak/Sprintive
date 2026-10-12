import logging
from typing import Any, Dict, List, Optional
from app.models.transcript import (
    AnalyzeNoiseResponse,
    CorrectSTTResponse,
    FilterRelevanceResponse,
    MergeFragmentsResponse,
    NormalizeGrammarResponse,
    NormalizeTerminologyResponse,
    ParsedTranscript,
    RemoveRepetitionsResponse,
    TranscriptSegment,
    ValidateContextResponse,
    ValidateSpeakersResponse,
    ValidateLanguageResponse,
    ValidateSemanticsResponse,
)
from app.models.final_transcript import (
    FinalizationResult,
    FormatFinalTranscriptResponse,
)
from app.models.meeting_agent import (
    MeetingAIPipelineResponse,
    MeetingAnalysisResult,
)
from app.models.scrum_agent import ScrumResult
from app.models.processing import (
    ProcessingRecord,
    StoreFinalTranscriptResponse,
)
from app.models.orchestrator import (
    ProcessTranscriptResponse,
)
from app.config.formatting import FormattingConfig
from app.services.processing_service import (
    ProcessingService,
    get_processing_service,
)
from app.services.transcript_orchestrator import (
    TranscriptOrchestrator,
    get_transcript_orchestrator,
)
from app.services.contextual_validator import validate_context
from app.services.fragment_merger import merge_fragments
from app.services.grammar_normalizer import normalize_grammar_and_punctuation
from app.services.language_validator import validate_language_preservation
from app.services.semantic_validator import validate_semantic_preservation
from app.services.transcript_formatter import format_final_transcript
from app.services.noise_detector import detect_noise_and_fillers
from app.services.relevance_filter import filter_irrelevant_content
from app.services.repetition_remover import remove_repetitions
from app.services.speaker_validator import validate_speakers
from app.services.stt_corrector import correct_stt_segments
from app.services.terminology_normalizer import normalize_terminology
from app.services.transcript_parser import parse_transcript
from app.services.transcript_repository import (
    BaseTranscriptRepository,
    get_transcript_repository,
)
from app.services.transcript_storage import BaseTranscriptStorage, get_transcript_storage
from app.services.llm_client import BaseLLMClient




logger = logging.getLogger(__name__)


class TranscriptService:
    """
    Coordinates transcript retrieval from storage, delegates to the pure parser,
    and runs downstream modular processing pipelines (such as noise & filler detection).
    """

    def __init__(
        self,
        storage: Optional[BaseTranscriptStorage] = None,
        orchestrator: Optional[TranscriptOrchestrator] = None,
    ):
        self.storage = storage or get_transcript_storage()
        self.orchestrator = orchestrator or get_transcript_orchestrator()

    def process_and_parse(
        self,
        meeting_id: str,
        transcript_path: Optional[str] = None,
        raw_text: Optional[str] = None,
    ) -> ParsedTranscript:
        """
        Retrieve raw transcript and parse into structured segments.

        Args:
            meeting_id: The ID of the meeting.
            transcript_path: Optional path to storage file.
            raw_text: Optional raw text directly supplied.

        Returns:
            ParsedTranscript domain model.

        Raises:
            ValueError: If neither transcript_path nor raw_text is provided.
            FileNotFoundError: If transcript_path does not exist in storage.
        """
        if raw_text is not None:
            content = raw_text
        elif transcript_path:
            logger.info("Fetching transcript from storage for meeting %s: %s", meeting_id, transcript_path)
            content = self.storage.get_transcript(transcript_path)
        else:
            raise ValueError("Either 'transcript_path' or 'raw_text' must be provided.")

        return parse_transcript(text=content, meeting_id=meeting_id)

    def analyze_noise(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
    ) -> AnalyzeNoiseResponse:
        """
        Run Part 2: Noise & Filler Detection on structured transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects.

        Returns:
            AnalyzeNoiseResponse containing classified segments with confidence scores.
        """
        logger.info(
            "Analyzing noise & fillers for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        classified_segments = detect_noise_and_fillers(segments)
        return AnalyzeNoiseResponse(
            meeting_id=meeting_id,
            segments=classified_segments,
        )

    def remove_repetitions(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
    ) -> RemoveRepetitionsResponse:
        """
        Run Part 3: Repetition Removal on structured/classified transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from Part 2.

        Returns:
            RemoveRepetitionsResponse containing processed segments with repetition metadata.
        """
        logger.info(
            "Removing repetitions for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        processed_segments = remove_repetitions(segments)
        return RemoveRepetitionsResponse(
            meeting_id=meeting_id,
            segments=processed_segments,
        )

    def filter_relevance(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
    ) -> FilterRelevanceResponse:
        """
        Run Part 4: Pre-Meeting & Irrelevant Content Filtering on transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from Part 3.

        Returns:
            FilterRelevanceResponse containing segments with relevance classification and include_in_meeting.
        """
        logger.info(
            "Filtering relevance for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        filtered_segments = filter_irrelevant_content(segments)
        return FilterRelevanceResponse(
            meeting_id=meeting_id,
            segments=filtered_segments,
        )

    def merge_fragments(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
    ) -> MergeFragmentsResponse:
        """
        Run Part 5: Sentence Segmentation & Fragment Merging on transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from Part 4.

        Returns:
            MergeFragmentsResponse containing coherent units with source_sequences preserved.
        """
        logger.info(
            "Merging fragments for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        merged_segments = merge_fragments(segments)
        return MergeFragmentsResponse(
            meeting_id=meeting_id,
            segments=merged_segments,
        )

    def correct_stt(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
        llm_client: Optional[BaseLLMClient] = None,
    ) -> CorrectSTTResponse:
        """
        Run Part 6: STT Error Correction on transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from Part 5.
            llm_client: Optional LLM client (defaults to configured client).

        Returns:
            CorrectSTTResponse containing segments with stt_corrected_text and traceability metadata.
        """
        logger.info(
            "Correcting STT errors for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        corrected_segments = correct_stt_segments(
            segments=segments,
            llm_client=llm_client,
        )
        return CorrectSTTResponse(
            meeting_id=meeting_id,
            segments=corrected_segments,
        )

    def normalize_grammar(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
        llm_client: Optional[BaseLLMClient] = None,
    ) -> NormalizeGrammarResponse:
        """
        Run Part 7: Grammar & Punctuation Normalization on transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from Part 6.
            llm_client: Optional LLM client (defaults to configured client).

        Returns:
            NormalizeGrammarResponse containing segments with grammar_corrected_text and metadata.
        """
        logger.info(
            "Normalizing grammar & punctuation for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        normalized_segments = normalize_grammar_and_punctuation(
            segments=segments,
            llm_client=llm_client,
        )
        return NormalizeGrammarResponse(
            meeting_id=meeting_id,
            segments=normalized_segments,
        )

    def normalize_terminology(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
        llm_client: Optional[BaseLLMClient] = None,
    ) -> NormalizeTerminologyResponse:
        """
        Run Part 8: Technical Terminology Normalization on transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from Part 7.
            llm_client: Optional LLM client for context disambiguation.

        Returns:
            NormalizeTerminologyResponse containing segments with terminology_normalized_text and metadata.
        """
        logger.info(
            "Normalizing technical terminology for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        normalized_segments = normalize_terminology(
            segments=segments,
            llm_client=llm_client,
        )
        return NormalizeTerminologyResponse(
            meeting_id=meeting_id,
            segments=normalized_segments,
        )

    def validate_context(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
        llm_client: Optional[BaseLLMClient] = None,
    ) -> ValidateContextResponse:
        """
        Run Part 9: Contextual Consistency Check on transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from Part 8.
            llm_client: Optional LLM client (defaults to configured client).

        Returns:
            ValidateContextResponse containing segments decorated with contextual validation metadata.
        """
        logger.info(
            "Validating contextual consistency for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        validated_segments = validate_context(
            segments=segments,
            llm_client=llm_client,
        )
        return ValidateContextResponse(
            meeting_id=meeting_id,
            segments=validated_segments,
        )

    def validate_speakers(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
        llm_client: Optional[BaseLLMClient] = None,
    ) -> ValidateSpeakersResponse:
        """
        Run Part 10: Speaker Attribution Validation on transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from Part 9.
            llm_client: Optional LLM client (defaults to configured client).

        Returns:
            ValidateSpeakersResponse containing segments decorated with speaker attribution validation metadata.
        """
        logger.info(
            "Validating speaker attribution for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        validated_segments = validate_speakers(
            segments=segments,
            llm_client=llm_client,
        )
        return ValidateSpeakersResponse(
            meeting_id=meeting_id,
            segments=validated_segments,
        )

    def validate_language(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
        llm_client: Optional[BaseLLMClient] = None,
    ) -> ValidateLanguageResponse:
        """
        Run Part 11: Language Preservation Check on transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from Part 10.
            llm_client: Optional LLM client (defaults to configured client).

        Returns:
            ValidateLanguageResponse containing segments decorated with language preservation metadata
            and the overall transcript language profile.
        """
        logger.info(
            "Validating language preservation for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        validated_segments, transcript_profile = validate_language_preservation(
            segments=segments,
            llm_client=llm_client,
        )
        return ValidateLanguageResponse(
            meeting_id=meeting_id,
            segments=validated_segments,
            transcript_language_profile=transcript_profile,
        )

    def validate_semantics(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
        llm_client: Optional[BaseLLMClient] = None,
        context_before: Optional[int] = None,
        context_after: Optional[int] = None,
    ) -> ValidateSemanticsResponse:
        """
        Run Part 12: Semantic Preservation Validation on transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from Part 11.
            llm_client: Optional LLM client (defaults to configured client).
            context_before: Context window size before current segment.
            context_after: Context window size after current segment.

        Returns:
            ValidateSemanticsResponse containing segments decorated with semantic preservation metadata.
        """
        logger.info(
            "Validating semantic preservation for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        validated_segments = validate_semantic_preservation(
            segments=segments,
            llm_client=llm_client,
            context_before_count=context_before,
            context_after_count=context_after,
        )
        return ValidateSemanticsResponse(
            meeting_id=meeting_id,
            segments=validated_segments,
        )

    def format_final(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
        config: Optional[FormattingConfig] = None,
    ) -> FormatFinalTranscriptResponse:
        """
        Run Part 13: Final Transcript Formatting on transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from upstream stages.
            config: Optional formatting configuration.

        Returns:
            FormatFinalTranscriptResponse containing clean AI-ready text and final segments.
        """
        logger.info(
            "Formatting final transcript for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        res = format_final_transcript(
            segments=segments,
            config=config,
            meeting_id=meeting_id,
        )
        return FormatFinalTranscriptResponse(
            meeting_id=meeting_id,
            status=res.status,
            transcript_text=res.transcript_text,
            segments=res.segments,
            warnings=res.warnings,
            included_segments=res.included_segments,
            excluded_segments=res.excluded_segments,
        )

    def store_final(
        self,
        meeting_id: str,
        transcript_text: str,
        raw_transcript_path: Optional[str] = None,
        overwrite: Optional[bool] = None,
        processing_service: Optional[ProcessingService] = None,
    ) -> StoreFinalTranscriptResponse:
        """
        Run Part 14: Store final clean transcript in storage and update processing metadata.

        Args:
            meeting_id: The ID of the meeting.
            transcript_text: Final clean transcript string.
            raw_transcript_path: Optional immutable raw transcript path.
            overwrite: Whether to overwrite existing processed artifact.
            processing_service: Optional processing service instance.

        Returns:
            StoreFinalTranscriptResponse containing status and storage path.
        """
        logger.info("Persisting final transcript for meeting_id=%s", meeting_id)
        proc_service = processing_service or get_processing_service()
        record = proc_service.store_final_transcript(
            meeting_id=meeting_id,
            transcript_text=transcript_text,
            raw_transcript_path=raw_transcript_path,
            overwrite=overwrite,
        )
        return StoreFinalTranscriptResponse(
            success=True,
            meeting_id=record.meeting_id,
            cleaned_transcript_path=record.cleaned_transcript_path or "",
            processing_status=record.processing_status,
            error=record.error,
        )

    async def process_transcript(
        self,
        meeting_id: str,
        raw_text: Optional[str] = None,
        raw_transcript_path: Optional[str] = None,
        formatting_config: Optional[FormattingConfig] = None,
        enforce_concurrency: bool = True,
        run_ai_pipeline: bool = True,
        orchestrator: Optional[TranscriptOrchestrator] = None,
    ) -> ProcessTranscriptResponse:
        """
        Run Part 15: Execute complete 14-stage transcript cleaning orchestration.
        """
        orch = orchestrator or get_transcript_orchestrator()
        return await orch.process_transcript(
            meeting_id=meeting_id,
            raw_text=raw_text,
            raw_transcript_path=raw_transcript_path,
            formatting_config=formatting_config,
            enforce_concurrency=enforce_concurrency,
            run_ai_pipeline=run_ai_pipeline,
        )

    async def run_meeting_ai_pipeline(
        self,
        meeting_id: str,
        custom_transcript_path: Optional[str] = None,
        llm_client: Optional[BaseLLMClient] = None,
        run_scrum_agent: bool = True,
        run_task_resolution: bool = False,
        team_id: Optional[str] = None,
        meeting_timestamp: Optional[Any] = None,
        timezone_str: str = "UTC",
        participants: Optional[List[Dict[str, Any]]] = None,
        team_members: Optional[List[Dict[str, Any]]] = None,
    ) -> MeetingAIPipelineResponse:
        """
        Execute AI Pipeline (Stage 1 Meeting Analysis + Stage 2 Scrum Intelligence + Stage 3 Task Resolution):
        Supabase Storage .txt -> UTF-8 String -> Main Meeting Agent -> Scrum Intelligence Agent -> Task Resolution -> Structured Output.
        """
        from app.services.meeting_ai_pipeline import run_meeting_ai_pipeline
        return await run_meeting_ai_pipeline(
            meeting_id=meeting_id,
            custom_transcript_path=custom_transcript_path,
            storage_service=self.orchestrator.storage_service,
            llm_client=llm_client or self.orchestrator.llm_client,
            run_scrum_agent=run_scrum_agent,
            run_task_resolution=run_task_resolution,
            team_id=team_id,
            meeting_timestamp=meeting_timestamp,
            timezone_str=timezone_str,
            participants=participants,
            team_members=team_members,
        )

    def run_scrum_analysis(
        self,
        meeting_analysis: MeetingAnalysisResult,
        llm_client: Optional[BaseLLMClient] = None,
    ) -> "ScrumResult":
        """
        Execute Stage 2: Transform structured MeetingAnalysisResult directly into Scrum/Kanban tasks.
        """
        from app.services.scrum_agent import get_scrum_intelligence_agent
        agent = get_scrum_intelligence_agent(llm_client=llm_client or self.orchestrator.llm_client)
        return agent.analyze(meeting_analysis)

    def resolve_scrum_tasks(
        self,
        scrum_result: ScrumResult,
        meeting_id: str,
        team_id: str,
        meeting_timestamp: Optional[Any] = None,
        timezone_str: str = "UTC",
        participants: Optional[List[Dict[str, Any]]] = None,
        team_members: Optional[List[Dict[str, Any]]] = None,
    ):
        """
        Execute Stage 3: Deterministic task resolution on ScrumResult tasks.
        """
        from app.services.task_resolution_service import get_task_resolution_service
        service = get_task_resolution_service()
        return service.resolve_tasks(
            scrum_result=scrum_result,
            meeting_id=meeting_id,
            team_id=team_id,
            meeting_timestamp=meeting_timestamp,
            timezone_str=timezone_str,
            participants=participants,
            team_members=team_members,
        )

    def get_processing_status(
        self,
        meeting_id: str,
    ) -> Optional[ProcessingRecord]:
        """
        Retrieve current processing metadata record for a meeting.
        """
        return self.orchestrator.repository.get_record(meeting_id)




