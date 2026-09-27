"""Configuration settings and conversational preservation markers for Part 7 - Grammar Normalization."""

from typing import List

DEFAULT_GRAMMAR_CONFIDENCE_THRESHOLD: float = 0.85
DEFAULT_GRAMMAR_CONTEXT_BEFORE: int = 2
DEFAULT_GRAMMAR_CONTEXT_AFTER: int = 2

# Natural conversational markers that must be preserved in transcript style
# and NOT made artificially formal (e.g. do not convert "yeah" to "yes, I believe...").
CONVERSATIONAL_MARKERS: List[str] = [
    "yeah",
    "okay",
    "fine",
    "yes",
    "no",
    "I think",
    "probably",
    "maybe",
    "actually",
    "right",
    "well",
]
