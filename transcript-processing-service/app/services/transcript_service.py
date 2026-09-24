import logging
from typing import List, Optional
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
from app.config.formatting import FormattingConfig
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
from app.services.transcript_storage import BaseTranscriptStorage, get_transcript_storage
from app.services.llm_client import BaseLLMClient




logger = logging.getLogger(__name__)


class TranscriptService:
    """
    Coordinates transcript retrieval from storage, delegates to the pure parser,
    and runs downstream modular processing pipelines (such as noise & filler detection).
    """

    def __init__(self, storage: Optional[BaseTranscriptStorage] = None):
        self.storage = storage or get_transcript_storage()

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



