"""Configuration settings and options for Part 13: Final Transcript Formatting."""

from typing import Optional
from pydantic import BaseModel, Field


class FormattingConfig(BaseModel):
    """Configuration options for final transcript serialization and formatting."""

    speaker_separator: str = Field(
        default=": ",
        description="Separator between speaker name and spoken dialogue text.",
    )
    segment_separator: str = Field(
        default="\n\n",
        description="Separator between individual speaker turns or transcript segments.",
    )
    include_header: bool = Field(
        default=False,
        description="Whether to prepend a title/header block to the transcript text.",
    )
    header_text: str = Field(
        default="SPRINTIVE CLEANED TRANSCRIPT\n============================\n\n",
        description="Header text prepended when include_header is True.",
    )
    include_sequence_numbers: bool = Field(
        default=False,
        description="Whether to prefix speaker turns with sequence numbers (e.g., [1] Speaker: ...).",
    )
    include_timestamps: bool = Field(
        default=False,
        description="Whether to prefix speaker turns with timestamps if available.",
    )
    exclude_filtered_segments: bool = Field(
        default=True,
        description="Whether to exclude segments where include_in_meeting is False.",
    )
    combine_consecutive_speaker_turns: bool = Field(
        default=False,
        description="Whether to combine adjacent segments from the same speaker into a single speaker turn.",
    )
    fallback_on_semantic_change: bool = Field(
        default=True,
        description="Whether to fall back to safe text when a processed candidate has SEMANTICALLY_CHANGED status.",
    )
    fallback_on_language_change: bool = Field(
        default=True,
        description="Whether to fall back to safe text when a processed candidate has LANGUAGE_CHANGED status.",
    )
    block_on_critical_semantic_change: bool = Field(
        default=False,
        description="Whether to mark the finalization status as BLOCKED if an unresolved critical semantic change occurs.",
    )
