from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.speaker_validation import (
    SpeakerFlagType,
    SpeakerValidationResult,
    SpeakerValidationStatus,
)
from app.models.language_validation import (
    LanguageFlagType,
    LanguagePreservationStatus,
    LanguageValidationResult,
    SegmentLanguageProfile,
    TranscriptLanguageProfile,
)
from app.models.semantic_validation import (
    ExtractedSemanticEntities,
    SemanticFlagType,
    SemanticValidationResult,
    SemanticValidationStatus,
)


class SegmentClassification(str, Enum):
    """Classification category for a transcript segment."""

    CLEAN = "CLEAN"
    FILLER = "FILLER"
    NOISE = "NOISE"
    POSSIBLE_REPETITION = "POSSIBLE_REPETITION"
    UNCERTAIN = "UNCERTAIN"


class RepetitionType(str, Enum):
    """Classification of repetition types detected in Part 3."""

    NONE = "NONE"
    CONSECUTIVE_WORD = "CONSECUTIVE_WORD"
    REPEATED_PHRASE = "REPEATED_PHRASE"
    EXACT_SEGMENT_DUPLICATE = "EXACT_SEGMENT_DUPLICATE"
    NEAR_SEGMENT_DUPLICATE = "NEAR_SEGMENT_DUPLICATE"
    UNCERTAIN = "UNCERTAIN"


class RelevanceCategory(str, Enum):
    """Relevance classification category for Part 4 filtering."""

    MEETING_CONTENT = "MEETING_CONTENT"
    PRE_MEETING = "PRE_MEETING"
    AUDIO_CHECK = "AUDIO_CHECK"
    CONNECTION_CHECK = "CONNECTION_CHECK"
    IRRELEVANT = "IRRELEVANT"
    UNCERTAIN = "UNCERTAIN"


class STTErrorType(str, Enum):
    """Diagnostic categories for speech-to-text recognition errors in Part 6."""

    PHONETIC_MISRECOGNITION = "PHONETIC_MISRECOGNITION"
    TECHNICAL_TERM_MISRECOGNITION = "TECHNICAL_TERM_MISRECOGNITION"
    WORD_BOUNDARY_ERROR = "WORD_BOUNDARY_ERROR"
    HOMOPHONE_OR_SIMILAR_SOUND = "HOMOPHONE_OR_SIMILAR_SOUND"
    PARTIAL_WORD_ERROR = "PARTIAL_WORD_ERROR"
    CONTEXTUAL_RECOGNITION_ERROR = "CONTEXTUAL_RECOGNITION_ERROR"
    UNKNOWN = "UNKNOWN"


class GrammarChangeType(str, Enum):
    """Categories of grammar and punctuation normalization changes."""

    GRAMMAR = "GRAMMAR"
    PUNCTUATION = "PUNCTUATION"
    CAPITALIZATION = "CAPITALIZATION"
    WORD_ORDER = "WORD_ORDER"


class GrammarChangeDetail(BaseModel):
    """Detailed record of a single grammar or punctuation change."""

    type: GrammarChangeType = Field(
        ...,
        description="Category of the change made (GRAMMAR, PUNCTUATION, CAPITALIZATION, WORD_ORDER).",
    )
    description: str = Field(
        ...,
        description="Human-readable description of what was adjusted.",
    )


class TerminologyChangeType(str, Enum):
    """Categories of technical terminology normalization changes."""

    CANONICAL_TERM = "CANONICAL_TERM"
    CASE_NORMALIZATION = "CASE_NORMALIZATION"
    SPELLING_VARIANT = "SPELLING_VARIANT"
    CONTEXT_DISAMBIGUATION = "CONTEXT_DISAMBIGUATION"


class TerminologyChangeDetail(BaseModel):
    """Detailed record of a single technical terminology normalization change."""

    original: str = Field(
        ...,
        description="Original term or phrase found in transcript before normalization.",
    )
    normalized: str = Field(
        ...,
        description="Canonical normalized technical term.",
    )
    type: TerminologyChangeType = Field(
        default=TerminologyChangeType.CANONICAL_TERM,
        description="Category of technical terminology change.",
    )


class ContextValidationStatus(str, Enum):
    """Contextual consistency status categories for Part 9."""

    CONSISTENT = "CONSISTENT"
    POSSIBLE_INCONSISTENCY = "POSSIBLE_INCONSISTENCY"
    AMBIGUOUS = "AMBIGUOUS"
    INSUFFICIENT_CONTEXT = "INSUFFICIENT_CONTEXT"


class ContextFlagType(str, Enum):
    """Specific contextual issue or flag categories."""

    TECHNICAL_CONTEXT_MISMATCH = "TECHNICAL_CONTEXT_MISMATCH"
    TERM_INCONSISTENCY = "TERM_INCONSISTENCY"
    TOPIC_DISCONTINUITY = "TOPIC_DISCONTINUITY"
    REFERENCE_MISMATCH = "REFERENCE_MISMATCH"
    POSSIBLE_PROCESSING_ERROR = "POSSIBLE_PROCESSING_ERROR"
    CONTRADICTION = "CONTRADICTION"
    AMBIGUOUS_REFERENCE = "AMBIGUOUS_REFERENCE"


class ContextFlagDetail(BaseModel):
    """Detailed record of a single contextual consistency flag."""

    type: ContextFlagType = Field(
        ...,
        description="Category of the contextual issue or anomaly.",
    )
    description: str = Field(
        ...,
        description="Human-readable explanation of why this flag was raised.",
    )


class ContextValidationLLMOutput(BaseModel):
    """Structured output expected from LLM during contextual consistency validation."""

    status: ContextValidationStatus = Field(
        ...,
        description="Overall contextual consistency status.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0.",
    )
    flags: List[ContextFlagDetail] = Field(
        default_factory=list,
        description="List of specific contextual issues flagged.",
    )
    reason: str = Field(
        ...,
        description="Brief contextual explanation.",
    )


class TranscriptSegment(BaseModel):
    """Represents a single structured segment of spoken dialogue."""

    sequence: int = Field(
        ...,
        description="1-indexed sequential order of the dialogue segment in the transcript.",
        ge=1,
    )
    speaker: str = Field(
        ...,
        description="Name of the speaker who uttered the text.",
    )
    text: str = Field(
        ...,
        description="Verbatim spoken dialogue text preserved exactly as transcribed.",
    )
    classification: Optional[SegmentClassification] = Field(
        default=None,
        description="Detected classification category (CLEAN, FILLER, NOISE, POSSIBLE_REPETITION, UNCERTAIN).",
    )
    confidence: Optional[float] = Field(
        default=None,
        description="Confidence score between 0.0 and 1.0 for the classification.",
        ge=0.0,
        le=1.0,
    )
    processed_text: Optional[str] = Field(
        default=None,
        description="Processed text produced by repetition removal (empty string if marked duplicate).",
    )
    repetition_modified: bool = Field(
        default=False,
        description="Whether repetition removal modified this segment.",
    )
    repetition_type: RepetitionType = Field(
        default=RepetitionType.NONE,
        description="Type of repetition detected and processed.",
    )
    is_duplicate: bool = Field(
        default=False,
        description="Whether this segment is a duplicate of a nearby segment.",
    )
    duplicate_of_sequence: Optional[int] = Field(
        default=None,
        description="Sequence number of the original segment this is a duplicate of.",
    )
    relevance: Optional[RelevanceCategory] = Field(
        default=None,
        description="Detected relevance category (MEETING_CONTENT, PRE_MEETING, AUDIO_CHECK, CONNECTION_CHECK, IRRELEVANT, UNCERTAIN).",
    )
    include_in_meeting: bool = Field(
        default=True,
        description="Whether this segment should be included in the meeting transcript.",
    )
    filter_confidence: Optional[float] = Field(
        default=None,
        description="Confidence score between 0.0 and 1.0 for the relevance decision.",
        ge=0.0,
        le=1.0,
    )
    filter_reason: Optional[str] = Field(
        default=None,
        description="Reason or rationale for the relevance classification decision.",
    )
    source_sequences: List[int] = Field(
        default_factory=list,
        description="List of original Part 1 sequence IDs represented in this segment.",
    )
    merged: bool = Field(
        default=False,
        description="Whether this segment is a merged conversational unit composed of multiple fragments.",
    )
    stt_corrected_text: Optional[str] = Field(
        default=None,
        description="Text produced after speech-to-text error correction.",
    )
    stt_modified: bool = Field(
        default=False,
        description="Whether STT error correction modified this segment.",
    )
    stt_confidence: Optional[float] = Field(
        default=None,
        description="Confidence score between 0.0 and 1.0 for the STT correction decision.",
        ge=0.0,
        le=1.0,
    )
    stt_error_type: Optional[STTErrorType] = Field(
        default=None,
        description="Diagnostic category of detected STT error, if any.",
    )
    stt_reason: Optional[str] = Field(
        default=None,
        description="Rationale or explanation for the STT correction or non-correction decision.",
    )
    grammar_corrected_text: Optional[str] = Field(
        default=None,
        description="Text produced after grammar and punctuation normalization.",
    )
    grammar_modified: bool = Field(
        default=False,
        description="Whether grammar/punctuation normalization modified this segment.",
    )
    grammar_confidence: Optional[float] = Field(
        default=None,
        description="Confidence score between 0.0 and 1.0 for the grammar normalization decision.",
        ge=0.0,
        le=1.0,
    )
    grammar_changes: List[GrammarChangeDetail] = Field(
        default_factory=list,
        description="List of specific grammatical or punctuation modifications applied.",
    )
    grammar_reason: Optional[str] = Field(
        default=None,
        description="Rationale or explanation for the grammar normalization decision.",
    )
    terminology_normalized_text: Optional[str] = Field(
        default=None,
        description="Text produced after technical terminology normalization.",
    )
    terminology_modified: bool = Field(
        default=False,
        description="Whether technical terminology normalization modified this segment.",
    )
    terminology_changes: List[TerminologyChangeDetail] = Field(
        default_factory=list,
        description="List of technical terminology modifications applied to this segment.",
    )
    possible_unknown_terms: List[str] = Field(
        default_factory=list,
        description="Detected potential technical terms that were not present in the dictionary.",
    )
    context_status: Optional[ContextValidationStatus] = Field(
        default=None,
        description="Contextual consistency status from Part 9 validation (CONSISTENT, POSSIBLE_INCONSISTENCY, AMBIGUOUS, INSUFFICIENT_CONTEXT).",
    )
    context_confidence: Optional[float] = Field(
        default=None,
        description="Confidence score between 0.0 and 1.0 for the contextual validation decision.",
        ge=0.0,
        le=1.0,
    )
    context_flags: List[ContextFlagDetail] = Field(
        default_factory=list,
        description="Contextual flags raised during Part 9 validation.",
    )
    context_reason: Optional[str] = Field(
        default=None,
        description="Explanation or reasoning for the contextual validation decision.",
    )
    speaker_validation_status: Optional[SpeakerValidationStatus] = Field(
        default=None,
        description="Plausibility status of speaker attribution (VALID, POSSIBLE_MISATTRIBUTION, AMBIGUOUS, INSUFFICIENT_CONTEXT).",
    )
    speaker_confidence: Optional[float] = Field(
        default=None,
        description="Confidence score between 0.0 and 1.0 for the speaker attribution assessment.",
        ge=0.0,
        le=1.0,
    )
    speaker_flags: List[SpeakerFlagType] = Field(
        default_factory=list,
        description="List of attribution flags raised during Part 10 validation.",
    )
    suggested_speaker: Optional[str] = Field(
        default=None,
        description="Alternative speaker candidate from existing transcript speakers, if justified.",
    )
    speaker_correction: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Detailed correction metadata if future diarization authorizes a change (None by default).",
    )
    validated_speaker: Optional[str] = Field(
        default=None,
        description="Authoritative validated speaker identity if an authoritative correction was made.",
    )
    speaker_validation_reason: Optional[str] = Field(
        default=None,
        description="Explanation or rationale for the speaker attribution validation decision.",
    )
    language_preservation_status: Optional[LanguagePreservationStatus] = Field(
        default=None,
        description="Preservation status of original language usage (PRESERVED, POSSIBLE_LANGUAGE_CHANGE, LANGUAGE_CHANGED, AMBIGUOUS, INSUFFICIENT_CONTEXT).",
    )
    language_confidence: Optional[float] = Field(
        default=None,
        description="Confidence score between 0.0 and 1.0 for the language preservation assessment.",
        ge=0.0,
        le=1.0,
    )
    language_flags: List[str] = Field(
        default_factory=list,
        description="List of structured flags raised regarding language preservation.",
    )
    original_languages: List[str] = Field(
        default_factory=list,
        description="List of detected languages in the original text.",
    )
    processed_languages: List[str] = Field(
        default_factory=list,
        description="List of detected languages in the processed text.",
    )
    original_primary_language: Optional[str] = Field(
        default=None,
        description="Primary language code detected in original text.",
    )
    processed_primary_language: Optional[str] = Field(
        default=None,
        description="Primary language code detected in processed text.",
    )
    original_mixed_language: bool = Field(
        default=False,
        description="Whether original text was classified as mixed-language / code-switching.",
    )
    processed_mixed_language: bool = Field(
        default=False,
        description="Whether processed text was classified as mixed-language / code-switching.",
    )
    language_validation_reason: Optional[str] = Field(
        default=None,
        description="Detailed explanation or rationale for the language validation decision.",
    )
    semantic_status: Optional[SemanticValidationStatus] = Field(
        default=None,
        description="Preservation status of original semantic meaning (SEMANTICALLY_PRESERVED, POSSIBLE_SEMANTIC_CHANGE, SEMANTICALLY_CHANGED, AMBIGUOUS, INSUFFICIENT_CONTEXT).",
    )
    semantic_confidence: Optional[float] = Field(
        default=None,
        description="Confidence score between 0.0 and 1.0 for the semantic preservation assessment.",
        ge=0.0,
        le=1.0,
    )
    semantic_flags: List[str] = Field(
        default_factory=list,
        description="List of specific semantic change flags raised.",
    )
    semantic_changed_elements: List[str] = Field(
        default_factory=list,
        description="List of specific semantic element names that were modified.",
    )
    semantic_validation_reason: Optional[str] = Field(
        default=None,
        description="Detailed explanation or rationale for the semantic validation assessment.",
    )


    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "sequence": 1,
                "speaker": "Sarthak Talaviya",
                "text": "Good morning, everyone. Let's get started with today's meeting.",
                "classification": "CLEAN",
                "confidence": 0.99,
            }
        },
    )


class ParsedTranscript(BaseModel):
    """Represents the complete parsed transcript for a meeting."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        default_factory=list,
        description="Ordered list of parsed transcript segments.",
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Structured warnings recorded during parsing (e.g. malformed lines).",
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 1,
                        "speaker": "Sarthak Talaviya",
                        "text": "Good morning everyone.",
                    },
                    {
                        "sequence": 2,
                        "speaker": "Harshit Pambhar",
                        "text": "I have one issue with the database.",
                    },
                ],
                "warnings": [],
            }
        },
    )


class ParseTranscriptRequest(BaseModel):
    """Request payload for the parse transcript API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    transcript_path: Optional[str] = Field(
        default=None,
        description="Storage path to the raw transcript file (e.g., in Supabase/local storage).",
    )
    raw_text: Optional[str] = Field(
        default=None,
        description="Optional direct raw transcript text to parse directly.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "transcript_path": "meetings/meeting_123/raw/conversation.txt",
            }
        }
    )


class AnalyzeNoiseRequest(BaseModel):
    """Request payload for the noise & filler detection API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Structured transcript segments from Part 1 to analyze for noise and fillers.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 1,
                        "speaker": "Sarthak Talaviya",
                        "text": "Good morning everyone.",
                    },
                    {
                        "sequence": 2,
                        "speaker": "Harshit Pambhar",
                        "text": "Aló, aló, aló, aló.",
                    },
                ],
            }
        }
    )


class AnalyzeNoiseResponse(BaseModel):
    """Response payload for the noise & filler detection API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Classified transcript segments with preserved original text, speaker, and sequence.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 1,
                        "speaker": "Sarthak Talaviya",
                        "text": "Good morning everyone.",
                        "classification": "CLEAN",
                        "confidence": 0.99,
                    },
                    {
                        "sequence": 2,
                        "speaker": "Harshit Pambhar",
                        "text": "Aló, aló, aló, aló.",
                        "classification": "POSSIBLE_REPETITION",
                        "confidence": 0.91,
                    },
                ],
            }
        }
    )


class RemoveRepetitionsRequest(BaseModel):
    """Request payload for the repetition removal API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Structured and/or classified transcript segments from Part 2.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 1,
                        "speaker": "Sarthak Talaviya",
                        "text": "Good morning everyone.",
                        "classification": "CLEAN",
                        "confidence": 0.99,
                    },
                    {
                        "sequence": 2,
                        "speaker": "Harshit Pambhar",
                        "text": "Aló, aló, aló, aló.",
                        "classification": "POSSIBLE_REPETITION",
                        "confidence": 0.95,
                    },
                ],
            }
        }
    )


class RemoveRepetitionsResponse(BaseModel):
    """Response payload for the repetition removal API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Processed transcript segments with repetition removed and traceability metadata.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 1,
                        "speaker": "Sarthak Talaviya",
                        "text": "Good morning everyone.",
                        "processed_text": "Good morning everyone.",
                        "classification": "CLEAN",
                        "confidence": 0.99,
                        "repetition_modified": False,
                        "repetition_type": "NONE",
                        "is_duplicate": False,
                        "duplicate_of_sequence": None,
                    },
                    {
                        "sequence": 2,
                        "speaker": "Harshit Pambhar",
                        "text": "Aló, aló, aló, aló.",
                        "processed_text": "Aló.",
                        "classification": "POSSIBLE_REPETITION",
                        "confidence": 0.95,
                        "repetition_modified": True,
                        "repetition_type": "CONSECUTIVE_WORD",
                        "is_duplicate": False,
                        "duplicate_of_sequence": None,
                    },
                ],
            }
        }
    )


class FilterRelevanceRequest(BaseModel):
    """Request payload for the relevance filtering API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments from Part 3 to filter for relevance.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 1,
                        "speaker": "Harshit Pambhar",
                        "text": "Hello, can you hear me?",
                        "processed_text": "Hello, can you hear me?",
                    },
                    {
                        "sequence": 2,
                        "speaker": "Sarthak Talaviya",
                        "text": "Good morning everyone. Let's get started with today's meeting.",
                        "processed_text": "Good morning everyone. Let's get started with today's meeting.",
                    },
                ],
            }
        }
    )


class FilterRelevanceResponse(BaseModel):
    """Response payload for the relevance filtering API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Processed transcript segments with relevance metadata and include_in_meeting decision.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 1,
                        "speaker": "Harshit Pambhar",
                        "text": "Hello, can you hear me?",
                        "processed_text": "Hello, can you hear me?",
                        "relevance": "AUDIO_CHECK",
                        "include_in_meeting": False,
                        "filter_confidence": 0.95,
                        "filter_reason": "Microphone and audio check",
                    },
                    {
                        "sequence": 2,
                        "speaker": "Sarthak Talaviya",
                        "text": "Good morning everyone. Let's get started with today's meeting.",
                        "processed_text": "Good morning everyone. Let's get started with today's meeting.",
                        "relevance": "MEETING_CONTENT",
                        "include_in_meeting": True,
                        "filter_confidence": 0.99,
                        "filter_reason": "Explicit meeting start signal",
                    },
                ],
            }
        }
    )


class MergeFragmentsRequest(BaseModel):
    """Request payload for the sentence segmentation and fragment merging API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments from Part 4 to segment and merge.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 11,
                        "speaker": "Sarthak Talaviya",
                        "text": "Before we begin,",
                        "processed_text": "Before we begin,",
                        "relevance": "MEETING_CONTENT",
                        "include_in_meeting": True,
                    },
                    {
                        "sequence": 12,
                        "speaker": "Sarthak Talaviya",
                        "text": "does anyone have any blockers",
                        "processed_text": "does anyone have any blockers",
                        "relevance": "MEETING_CONTENT",
                        "include_in_meeting": True,
                    },
                    {
                        "sequence": 13,
                        "speaker": "Sarthak Talaviya",
                        "text": "from yesterday?",
                        "processed_text": "from yesterday?",
                        "relevance": "MEETING_CONTENT",
                        "include_in_meeting": True,
                    },
                ],
            }
        }
    )


class MergeFragmentsResponse(BaseModel):
    """Response payload for the sentence segmentation and fragment merging API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Coherent transcript units with fragments merged and source_sequences preserved.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 11,
                        "source_sequences": [11, 12, 13],
                        "speaker": "Sarthak Talaviya",
                        "text": "Before we begin, does anyone have any blockers from yesterday?",
                        "processed_text": "Before we begin, does anyone have any blockers from yesterday?",
                        "relevance": "MEETING_CONTENT",
                        "include_in_meeting": True,
                        "merged": True,
                    }
                ],
            }
        }
    )


class STTCorrectionLLMOutput(BaseModel):
    """Structured response schema expected from LLM for STT error correction."""

    corrected_text: str = Field(
        ...,
        description="Corrected text if an STT error was detected with high confidence, or the original text unchanged.",
    )
    modified: bool = Field(
        ...,
        description="True if an STT error was corrected; False if the original text was preserved unchanged.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Application-level confidence estimate between 0.0 and 1.0.",
    )
    error_type: Optional[STTErrorType] = Field(
        default=None,
        description="Diagnostic category of the STT error, if modified=True.",
    )
    reason: Optional[str] = Field(
        default=None,
        description="Brief justification of why the correction was made or why original text was preserved.",
    )


class CorrectSTTRequest(BaseModel):
    """Request payload for the STT error correction API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments from Part 5 to analyze and correct for STT errors.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 15,
                        "source_sequences": [15, 16],
                        "speaker": "Harshit Pambhar",
                        "text": "I have one issue with the date abase connection.",
                        "processed_text": "I have one issue with the date abase connection.",
                        "merged": True,
                        "include_in_meeting": True,
                    }
                ],
            }
        }
    )


class CorrectSTTResponse(BaseModel):
    """Response payload for the STT error correction API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments with stt_corrected_text and traceability metadata.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 15,
                        "source_sequences": [15, 16],
                        "speaker": "Harshit Pambhar",
                        "text": "I have one issue with the date abase connection.",
                        "processed_text": "I have one issue with the date abase connection.",
                        "stt_corrected_text": "I have one issue with the database connection.",
                        "stt_modified": True,
                        "stt_confidence": 0.96,
                        "stt_error_type": "TECHNICAL_TERM_MISRECOGNITION",
                        "stt_reason": "Likely STT recognition error for technical term",
                        "merged": True,
                        "include_in_meeting": True,
                    }
                ],
            }
        }
    )


class GrammarNormalizationLLMOutput(BaseModel):
    """Structured response schema expected from LLM for grammar and punctuation normalization."""

    corrected_text: str = Field(
        ...,
        description="Grammatically normalized and punctuated text, or the input text unchanged.",
    )
    modified: bool = Field(
        ...,
        description="True if grammar or punctuation was adjusted; False if input text was preserved unchanged.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Application-level confidence estimate between 0.0 and 1.0.",
    )
    changes: List[GrammarChangeDetail] = Field(
        default_factory=list,
        description="List of specific grammatical, punctuation, capitalization, or word-order changes applied.",
    )
    reason: Optional[str] = Field(
        default=None,
        description="Brief justification for the changes applied or why input text was preserved.",
    )


class NormalizeGrammarRequest(BaseModel):
    """Request payload for the grammar normalization API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments from Part 6 to normalize for grammar and punctuation.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 15,
                        "source_sequences": [15, 16],
                        "speaker": "Harshit Pambhar",
                        "text": "I have one issue with the date abase connection.",
                        "processed_text": "I have one issue with the date abase connection.",
                        "stt_corrected_text": "I have one issue with the database connection.",
                        "stt_modified": True,
                    }
                ],
            }
        }
    )


class NormalizeGrammarResponse(BaseModel):
    """Response payload for the grammar normalization API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments with grammar_corrected_text and complete traceability metadata.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 15,
                        "source_sequences": [15, 16],
                        "speaker": "Harshit Pambhar",
                        "text": "I have one issue with the date abase connection.",
                        "processed_text": "I have one issue with the date abase connection.",
                        "stt_corrected_text": "I have one issue with the database connection.",
                        "stt_modified": True,
                        "grammar_corrected_text": "I have an issue with the database connection.",
                        "grammar_modified": True,
                        "grammar_confidence": 0.95,
                    }
                ],
            }
        }
    )


class TerminologyAnalysisLLMOutput(BaseModel):
    """Structured response schema expected from LLM for ambiguous technical term evaluation."""

    term: str = Field(
        ...,
        description="The candidate term evaluated.",
    )
    is_technical: bool = Field(
        ...,
        description="True if the term in context refers to the technical framework/concept; False if ordinary language.",
    )
    canonical_term: Optional[str] = Field(
        default=None,
        description="The canonical technical term to use if is_technical is True, or null.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Application-level confidence estimate between 0.0 and 1.0.",
    )
    reason: Optional[str] = Field(
        default=None,
        description="Brief justification for why the term was or was not considered technical in context.",
    )


class NormalizeTerminologyRequest(BaseModel):
    """Request payload for the technical terminology normalization API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments from Part 7 to normalize for technical terminology.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 15,
                        "source_sequences": [15, 16],
                        "speaker": "Harshit Pambhar",
                        "text": "The post gre SQL database is connected to the fast api backend.",
                        "grammar_corrected_text": "The post gre SQL database is connected to the fast api backend.",
                    }
                ],
            }
        }
    )


class NormalizeTerminologyResponse(BaseModel):
    """Response payload for the technical terminology normalization API endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments with terminology_normalized_text and complete traceability metadata.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 15,
                        "source_sequences": [15, 16],
                        "speaker": "Harshit Pambhar",
                        "text": "The post gre SQL database is connected to the fast api backend.",
                        "grammar_corrected_text": "The post gre SQL database is connected to the fast api backend.",
                        "terminology_normalized_text": "The PostgreSQL database is connected to the FastAPI backend.",
                        "terminology_modified": True,
                        "terminology_changes": [
                            {
                                "original": "post gre SQL",
                                "normalized": "PostgreSQL",
                                "type": "CANONICAL_TERM",
                            },
                            {
                                "original": "fast api",
                                "normalized": "FastAPI",
                                "type": "CANONICAL_TERM",
                            },
                        ],
                    }
                ],
            }
        }
    )


class ValidateContextRequest(BaseModel):
    """Request payload for the contextual consistency validation API endpoint (Part 9)."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Ordered list of transcript segments output by Part 8 (terminology normalization).",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 15,
                        "source_sequences": [15, 16],
                        "speaker": "Harshit Pambhar",
                        "text": "I have an issue with the date abase connection.",
                        "grammar_corrected_text": "I have an issue with the database connection.",
                        "terminology_normalized_text": "I have an issue with the database connection.",
                    }
                ],
            }
        }
    )


class ValidateContextResponse(BaseModel):
    """Response payload for the contextual consistency validation API endpoint (Part 9)."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments with contextual validation metadata added.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 15,
                        "source_sequences": [15, 16],
                        "speaker": "Harshit Pambhar",
                        "text": "I have an issue with the date abase connection.",
                        "grammar_corrected_text": "I have an issue with the database connection.",
                        "terminology_normalized_text": "I have an issue with the database connection.",
                        "context_status": "CONSISTENT",
                        "context_confidence": 0.95,
                        "context_flags": [],
                        "context_reason": "Statement is consistent with conversation context.",
                    }
                ],
            }
        }
    )


class ValidateSpeakersRequest(BaseModel):
    """Request payload for the speaker attribution validation API endpoint (Part 10)."""

    meeting_id: Optional[str] = Field(
        default="default_meeting",
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Ordered list of transcript segments output by Part 9 (contextual consistency check).",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 15,
                        "speaker": "Sarthak Talaviya",
                        "text": "Harshit, can you explain the database issue?",
                        "context_status": "CONSISTENT",
                        "context_flags": [],
                    },
                    {
                        "sequence": 16,
                        "speaker": "Harshit Pambhar",
                        "text": "Yes. I have one issue with the database connection.",
                        "context_status": "CONSISTENT",
                        "context_flags": [],
                    },
                ],
            }
        }
    )


class ValidateSpeakersResponse(BaseModel):
    """Response payload for the speaker attribution validation API endpoint (Part 10)."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments with speaker attribution validation metadata added.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 15,
                        "speaker": "Sarthak Talaviya",
                        "text": "Harshit, can you explain the database issue?",
                        "speaker_validation_status": "VALID",
                        "speaker_confidence": 0.96,
                        "speaker_flags": [],
                        "suggested_speaker": None,
                        "speaker_correction": None,
                        "speaker_validation_reason": "Direct question addressed to team member.",
                    },
                    {
                        "sequence": 16,
                        "speaker": "Harshit Pambhar",
                        "text": "Yes. I have one issue with the database connection.",
                        "speaker_validation_status": "VALID",
                        "speaker_confidence": 0.98,
                        "speaker_flags": [],
                        "suggested_speaker": None,
                        "speaker_correction": None,
                        "speaker_validation_reason": "Expected direct answer from addressed speaker.",
                    },
                ],
            }
        }
    )


class ValidateLanguageRequest(BaseModel):
    """Request payload for the language preservation validation API endpoint (Part 11)."""

    meeting_id: Optional[str] = Field(
        default="default_meeting",
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="List of transcript segments to validate for language preservation.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 1,
                        "speaker": "Sarthak Talaviya",
                        "text": "हाँ बोल, database connection check कर.",
                        "terminology_normalized_text": "हाँ बोल, database connection check कर.",
                    }
                ],
            }
        }
    )


class ValidateLanguageResponse(BaseModel):
    """Response payload for the language preservation validation API endpoint (Part 11)."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments with language preservation validation metadata added.",
    )
    transcript_language_profile: TranscriptLanguageProfile = Field(
        ...,
        description="Aggregate language profile of the entire transcript.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 1,
                        "speaker": "Sarthak Talaviya",
                        "text": "हाँ बोल, database connection check कर.",
                        "language_preservation_status": "PRESERVED",
                        "language_confidence": 0.96,
                        "language_flags": [],
                        "original_languages": ["hi", "en"],
                        "processed_languages": ["hi", "en"],
                        "original_primary_language": "hi",
                        "processed_primary_language": "hi",
                        "original_mixed_language": True,
                        "processed_mixed_language": True,
                        "language_validation_reason": "Hindi and English content remain present and the mixed-language structure is preserved.",
                    }
                ],
                "transcript_language_profile": {
                    "primary_language": "hi",
                    "languages_detected": ["hi", "en"],
                    "mixed_language_segments": 1,
                    "language_change_flags": 0,
                },
            }
        }
    )


class ValidateSemanticsRequest(BaseModel):
    """Request payload for semantic preservation validation API endpoint (Part 12)."""

    meeting_id: Optional[str] = Field(
        default="default_meeting",
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="List of transcript segments to validate for semantic preservation.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 1,
                        "speaker": "Sarthak Talaviya",
                        "text": "Good morning, everyone. Let's start the meeting.",
                        "terminology_normalized_text": "Good morning everyone, let's start the meeting.",
                    }
                ],
            }
        }
    )


class ValidateSemanticsResponse(BaseModel):
    """Response payload for semantic preservation validation API endpoint (Part 12)."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="Transcript segments with semantic preservation validation metadata added.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "meeting_id": "meeting_123",
                "segments": [
                    {
                        "sequence": 1,
                        "speaker": "Sarthak Talaviya",
                        "text": "Good morning, everyone. Let's start the meeting.",
                        "semantic_status": "SEMANTICALLY_PRESERVED",
                        "semantic_confidence": 0.98,
                        "semantic_flags": [],
                        "semantic_changed_elements": [],
                        "semantic_validation_reason": "Punctuation and casing normalized without changing original meaning.",
                    }
                ],
            }
        }
    )
