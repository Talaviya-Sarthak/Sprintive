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
