from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


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

