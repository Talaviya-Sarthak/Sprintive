"""Models and schemas for Part 13: Final Transcript Formatting."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.config.formatting import FormattingConfig
from app.models.transcript import TranscriptSegment


class FinalizationStatus(str, Enum):
    """Overall status of the final transcript formatting and serialization."""

    READY = "READY"
    READY_WITH_WARNINGS = "READY_WITH_WARNINGS"
    BLOCKED = "BLOCKED"


class FinalizationWarning(BaseModel):
    """A warning recorded during final text selection, validation, or formatting."""

    sequence: int = Field(
        ...,
        description="Sequence number of the segment associated with this warning.",
    )
    type: str = Field(
        ...,
        description="Category of the warning (e.g., POSSIBLE_SEMANTIC_CHANGE, FALLBACK_TRIGGERED).",
    )
    message: str = Field(
        ...,
        description="Descriptive explanation of the warning.",
    )

    model_config = ConfigDict(populate_by_name=True)


class FinalSegment(BaseModel):
    """Clean, deterministic AI-ready transcript segment without internal pipeline clutter."""

    sequence: int = Field(
        ...,
        description="1-indexed sequence number in the final chronological transcript.",
    )
    speaker: str = Field(
        ...,
        description="Speaker identity (authoritative validated speaker or original speaker).",
    )
    text: str = Field(
        ...,
        description="Final selected spoken dialogue text.",
    )
    timestamp: Optional[str] = Field(
        default=None,
        description="Optional timestamp if available from raw speech diarization.",
    )
    source_sequences: Optional[List[int]] = Field(
        default=None,
        description="Original Part 1 sequence IDs represented in this segment (if merged).",
    )

    model_config = ConfigDict(populate_by_name=True)


class FinalizationResult(BaseModel):
    """Structured output produced by the final transcript formatter."""

    status: FinalizationStatus = Field(
        ...,
        description="Finalization readiness status: READY, READY_WITH_WARNINGS, or BLOCKED.",
    )
    transcript_text: str = Field(
        ...,
        description="Formatted conversation string ready for AI consumption (UTF-8).",
    )
    segments: List[FinalSegment] = Field(
        default_factory=list,
        description="List of clean final segments.",
    )
    warnings: List[FinalizationWarning] = Field(
        default_factory=list,
        description="List of non-blocking or blocking warnings recorded during formatting.",
    )
    included_segments: int = Field(
        default=0,
        description="Count of segments included in the final transcript.",
    )
    excluded_segments: int = Field(
        default=0,
        description="Count of segments excluded (e.g. pre-meeting or audio check chatter).",
    )

    model_config = ConfigDict(populate_by_name=True)


class FormatFinalTranscriptRequest(BaseModel):
    """Request payload for final transcript formatting endpoint."""

    meeting_id: Optional[str] = Field(
        default=None,
        description="Unique identifier of the meeting.",
    )
    segments: List[TranscriptSegment] = Field(
        ...,
        description="List of transcript segments from earlier pipeline stages (Parts 1-12).",
    )
    config: Optional[FormattingConfig] = Field(
        default=None,
        description="Custom formatting options and policies.",
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
                        "text": "Good morning, everyone. Let's start the meeting.",
                        "include_in_meeting": True,
                    }
                ],
            }
        },
    )


class FormatFinalTranscriptResponse(BaseModel):
    """Response payload for final transcript formatting endpoint."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    status: FinalizationStatus = Field(
        ...,
        description="Finalization status: READY, READY_WITH_WARNINGS, or BLOCKED.",
    )
    transcript_text: str = Field(
        ...,
        description="AI-ready formatted transcript text.",
    )
    segments: List[FinalSegment] = Field(
        default_factory=list,
        description="Clean final segments.",
    )
    warnings: List[FinalizationWarning] = Field(
        default_factory=list,
        description="Warnings accumulated during finalization.",
    )
    included_segments: int = Field(
        default=0,
        description="Number of segments included in the final transcript.",
    )
    excluded_segments: int = Field(
        default=0,
        description="Number of segments excluded from the final transcript.",
    )

    model_config = ConfigDict(populate_by_name=True)
