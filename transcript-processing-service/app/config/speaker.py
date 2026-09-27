"""Configuration settings and linguistic markers for Part 10 - Speaker Attribution Validation."""

from typing import List, Set

# Configurable confidence thresholds
SPEAKER_CONFIDENCE_STRONG: float = 0.90
SPEAKER_CONFIDENCE_REVIEW: float = 0.75
DEFAULT_SPEAKER_CONTEXT_BEFORE: int = 3
DEFAULT_SPEAKER_CONTEXT_AFTER: int = 3

# Conversational turn starters / direct response indicators
AFFIRMATIVE_RESPONSE_MARKERS: Set[str] = {
    "yes",
    "yeah",
    "yep",
    "sure",
    "right",
    "okay",
    "ok",
    "no",
    "nope",
    "definitely",
    "absolutely",
    "certainly",
    "correct",
    "i agree",
    # Hindi affirmative/negative markers
    "हाँ",
    "हां",
    "नहीं",
    "सही",
    "बिल्कुल",
    "achha",
    "haan",
    "theek",
    "sahi",
    # Spanish affirmative/negative markers
    "sí",
    "si",
    "claro",
    "seguro",
    "de acuerdo",
}

# Common question indicators in Scrum meetings
INTERROGATIVE_PHRASES: List[str] = [
    "can you",
    "could you",
    "would you",
    "what about",
    "how is",
    "how are",
    "do you have",
    "does anyone",
    "did you",
    "are you",
    "is there",
    "any blockers",
    "any updates",
    "who is",
    "where are",
    "kya chal raha",
    "kya blocker hai",
    "algún problema",
    "alguna duda",
]
