"""Data models and enums for Part 10 — Speaker Attribution Validation."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class SpeakerValidationStatus(str, Enum):
    """Validation status categories for speaker attribution."""

    VALID = "VALID"
    POSSIBLE_MISATTRIBUTION = "POSSIBLE_MISATTRIBUTION"
    AMBIGUOUS = "AMBIGUOUS"
    INSUFFICIENT_CONTEXT = "INSUFFICIENT_CONTEXT"


class SpeakerFlagType(str, Enum):
    """Specific contextual flag categories for speaker attribution issues."""

    SPEAKER_CONTINUITY_BREAK = "SPEAKER_CONTINUITY_BREAK"
    POSSIBLE_FRAGMENT_MISATTRIBUTION = "POSSIBLE_FRAGMENT_MISATTRIBUTION"
    UNEXPECTED_TURN_TRANSITION = "UNEXPECTED_TURN_TRANSITION"
    DIRECT_RESPONSE_MISMATCH = "DIRECT_RESPONSE_MISMATCH"
    REFERENCE_TO_PREVIOUS_SPEAKER = "REFERENCE_TO_PREVIOUS_SPEAKER"
    POSSIBLE_SPEAKER_SWAP = "POSSIBLE_SPEAKER_SWAP"
    INSUFFICIENT_CONTEXT = "INSUFFICIENT_CONTEXT"
    AMBIGUOUS_ATTRIBUTION = "AMBIGUOUS_ATTRIBUTION"


class SpeakerValidationResult(BaseModel):
    """Structured output expected from LLM or rule engine during speaker validation."""

    status: SpeakerValidationStatus = Field(
        ...,
        description="Plausibility status of current speaker attribution.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0.",
    )
    flags: List[SpeakerFlagType] = Field(
        default_factory=list,
        description="List of specific attribution flags raised.",
    )
    suggested_speaker: Optional[str] = Field(
        default=None,
        description="Plausible alternative speaker if justified, or None.",
    )
    reason: str = Field(
        ...,
        description="Explanation or rationale for the validation assessment.",
    )
