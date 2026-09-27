"""Configuration and threshold definitions for repetition removal."""

from typing import Set

# Thresholds for cross-segment duplication detection
EXACT_DUPLICATE_THRESHOLD: float = 1.0
NEAR_DUPLICATE_THRESHOLD: float = 0.90
DUPLICATE_LOOKBACK: int = 2
MIN_TOKENS_FOR_NEAR_DUPLICATE: int = 3

# Intentional repeated words that carry deliberate emphasis, agreement, or grammatical meaning.
# These MUST NOT be collapsed to a single word when repeated (e.g. "very very important", "no no, don't deploy it").
INTENTIONAL_REPETITION_WORDS: Set[str] = {
    # English emphasis and negation
    "very",
    "really",
    "no",
    "nah",
    "never",
    "so",
    "too",
    "more",
    "bye",
    "much",
    # Hindi emphasis and negation
    "नहीं",
    "बहुत",
    "कम",
    "ज़्यादा",
    "ज्यादा",
    "धीरे",
    # Spanish emphasis and negation
    "no",
    "muy",
    "más",
    "mas",
    "poco",
    "adiós",
    "adios",
}

# Fixed multi-word idiomatic phrases that legitimately contain repeated or reduplicated structures
INTENTIONAL_REPETITION_PHRASES: Set[str] = {
    # English idioms & constructions
    "more and more",
    "day by day",
    "step by step",
    "little by little",
    "side by side",
    "end to end",
    "face to face",
    "again and again",
    "now and then",
    # Hindi reduplication
    "धीरे धीरे",
    "साथ साथ",
    "कम से कम",
    "बार बार",
    # Spanish expressions
    "poco a poco",
    "paso a paso",
    "día a día",
    "dia a dia",
}
