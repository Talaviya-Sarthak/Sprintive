"""Data models and enums for Part 11 — Language Preservation Check."""

from enum import Enum
from typing import List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class LanguagePreservationStatus(str, Enum):
    """Validation status categories for language preservation."""

    PRESERVED = "PRESERVED"
    POSSIBLE_LANGUAGE_CHANGE = "POSSIBLE_LANGUAGE_CHANGE"
    LANGUAGE_CHANGED = "LANGUAGE_CHANGED"
    AMBIGUOUS = "AMBIGUOUS"
    INSUFFICIENT_CONTEXT = "INSUFFICIENT_CONTEXT"


class LanguageFlagType(str, Enum):
    """Specific diagnostic flags indicating language preservation issues."""

    UNEXPECTED_TRANSLATION = "UNEXPECTED_TRANSLATION"
    LANGUAGE_REMOVED = "LANGUAGE_REMOVED"
    LANGUAGE_ADDED = "LANGUAGE_ADDED"
    CODE_SWITCHING_CHANGED = "CODE_SWITCHING_CHANGED"
    MIXED_LANGUAGE_LOST = "MIXED_LANGUAGE_LOST"
    PRIMARY_LANGUAGE_CHANGED = "PRIMARY_LANGUAGE_CHANGED"
    NON_ENGLISH_CONTENT_MODIFIED = "NON_ENGLISH_CONTENT_MODIFIED"
    POSSIBLE_LANGUAGE_DETECTION_ERROR = "POSSIBLE_LANGUAGE_DETECTION_ERROR"


class SegmentLanguageProfile(BaseModel):
    """Language profile detected for an individual transcript segment."""

    primary_language: str = Field(
        ...,
        description="Detected primary language code (e.g., 'en', 'hi', 'es', 'unknown', 'mixed').",
    )
    languages_detected: List[str] = Field(
        default_factory=list,
        description="List of all detected language codes in the text.",
    )
    is_mixed_language: bool = Field(
        default=False,
        description="Whether the segment exhibits mixed-language speech or code-switching.",
    )
    language_confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score for language detection.",
    )


class TranscriptLanguageProfile(BaseModel):
    """Overall language profile for the entire transcript."""

    primary_language: str = Field(
        ...,
        description="Primary language across the transcript.",
    )
    languages_detected: List[str] = Field(
        default_factory=list,
        description="All unique language codes detected across all segments.",
    )
    mixed_language_segments: int = Field(
        default=0,
        description="Count of segments containing mixed-language speech or code-switching.",
    )
    language_change_flags: int = Field(
        default=0,
        description="Count of segments flagged with possible or confirmed language changes.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "primary_language": "en",
                "languages_detected": ["en", "hi"],
                "mixed_language_segments": 4,
                "language_change_flags": 0,
            }
        }
    )


class LanguageValidationResult(BaseModel):
    """Structured output expected from LLM or rule engine during language validation."""

    status: Union[
        LanguagePreservationStatus,
        Literal[
            "PRESERVED",
            "POSSIBLE_LANGUAGE_CHANGE",
            "LANGUAGE_CHANGED",
            "AMBIGUOUS",
            "INSUFFICIENT_CONTEXT",
        ],
    ] = Field(
        ...,
        description="Validation status category.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0.",
    )
    flags: List[str] = Field(
        default_factory=list,
        description="Structured flags raised regarding language preservation.",
    )
    original_languages: List[str] = Field(
        default_factory=list,
        description="Detected language codes in original text.",
    )
    processed_languages: List[str] = Field(
        default_factory=list,
        description="Detected language codes in processed text.",
    )
    original_primary_language: Optional[str] = Field(
        default=None,
        description="Primary language code in original text.",
    )
    processed_primary_language: Optional[str] = Field(
        default=None,
        description="Primary language code in processed text.",
    )
    is_original_mixed_language: bool = Field(
        default=False,
        description="Whether original text was mixed-language / code-switching.",
    )
    is_processed_mixed_language: bool = Field(
        default=False,
        description="Whether processed text was mixed-language / code-switching.",
    )
    reason: str = Field(
        ...,
        description="Detailed explanation or rationale for the assessment.",
    )
