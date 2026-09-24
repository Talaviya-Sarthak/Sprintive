"""Data models and enums for Part 12 — Semantic Preservation Validation."""

from enum import Enum
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class SemanticValidationStatus(str, Enum):
    """Validation status categories for semantic preservation."""

    SEMANTICALLY_PRESERVED = "SEMANTICALLY_PRESERVED"
    POSSIBLE_SEMANTIC_CHANGE = "POSSIBLE_SEMANTIC_CHANGE"
    SEMANTICALLY_CHANGED = "SEMANTICALLY_CHANGED"
    AMBIGUOUS = "AMBIGUOUS"
    INSUFFICIENT_CONTEXT = "INSUFFICIENT_CONTEXT"


class SemanticFlagType(str, Enum):
    """Structured flags indicating specific semantic elements that changed or were compromised."""

    NEGATION_CHANGED = "NEGATION_CHANGED"
    QUANTITY_CHANGED = "QUANTITY_CHANGED"
    NUMBER_CHANGED = "NUMBER_CHANGED"
    DATE_CHANGED = "DATE_CHANGED"
    TIME_CHANGED = "TIME_CHANGED"
    DEADLINE_CHANGED = "DEADLINE_CHANGED"
    PERSON_REFERENCE_CHANGED = "PERSON_REFERENCE_CHANGED"
    TECHNICAL_ENTITY_CHANGED = "TECHNICAL_ENTITY_CHANGED"
    ACTION_CHANGED = "ACTION_CHANGED"
    DECISION_CHANGED = "DECISION_CHANGED"
    COMMITMENT_CHANGED = "COMMITMENT_CHANGED"
    BLOCKER_CHANGED = "BLOCKER_CHANGED"
    QUESTION_TO_STATEMENT = "QUESTION_TO_STATEMENT"
    STATEMENT_TO_QUESTION = "STATEMENT_TO_QUESTION"
    CAUSALITY_CHANGED = "CAUSALITY_CHANGED"
    CERTAINTY_CHANGED = "CERTAINTY_CHANGED"
    UNCERTAINTY_CHANGED = "UNCERTAINTY_CHANGED"
    CONDITIONALITY_CHANGED = "CONDITIONALITY_CHANGED"
    MEANING_CHANGED = "MEANING_CHANGED"
    POSSIBLE_MEANING_CHANGE = "POSSIBLE_MEANING_CHANGE"


class ExtractedSemanticEntities(BaseModel):
    """Structured collection of semantic entities extracted from dialogue text."""

    negations: List[str] = Field(default_factory=list)
    numbers: List[int] = Field(default_factory=list)
    dates_and_deadlines: List[str] = Field(default_factory=list)
    times: List[str] = Field(default_factory=list)
    technical_entities: List[str] = Field(default_factory=list)
    person_references: List[str] = Field(default_factory=list)
    is_question: bool = False
    uncertainty_markers: List[str] = Field(default_factory=list)
    causal_markers: List[str] = Field(default_factory=list)
    conditional_markers: List[str] = Field(default_factory=list)


class SemanticValidationResult(BaseModel):
    """Structured output expected from LLM or deterministic rule engine during semantic validation."""

    status: Literal[
        "SEMANTICALLY_PRESERVED",
        "POSSIBLE_SEMANTIC_CHANGE",
        "SEMANTICALLY_CHANGED",
        "AMBIGUOUS",
        "INSUFFICIENT_CONTEXT",
    ] = Field(
        ...,
        description="Preservation status category.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0.",
    )
    flags: List[str] = Field(
        default_factory=list,
        description="Specific semantic change flags raised.",
    )
    changed_elements: List[str] = Field(
        default_factory=list,
        description="Specific semantic element names that were modified.",
    )
    reason: str = Field(
        ...,
        description="Detailed factual explanation for the semantic validation assessment.",
    )
