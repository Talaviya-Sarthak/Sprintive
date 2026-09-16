"""Multilingual filler dictionaries and token definitions for noise and filler detection."""

from typing import Dict, Set

# Multilingual filler dictionaries keyed by ISO language codes
MULTILINGUAL_FILLERS: Dict[str, Set[str]] = {
    # English fillers and hesitations
    "en": {
        "um",
        "uh",
        "erm",
        "hmm",
        "er",
        "ah",
        "uh-huh",
        "mhm",
        "uhm",
        "ahh",
    },
    # Hindi fillers
    "hi": {
        "हम्म",
        "उम्",
        "अं",
        "हाँ-हाँ",
        "अरे-रे",
    },
    # Spanish fillers
    "es": {
        "eh",
        "em",
        "mmm",
        "este",
        "ajá",
    },
}

# Flattened set of all known fillers (lowercase) for fast lookup
ALL_FILLERS: Set[str] = {
    filler.lower()
    for fillers in MULTILINGUAL_FILLERS.values()
    for filler in fillers
}

# Meaningful standalone affirmations / status words commonly used in agile meetings.
# These must NOT be classified as noise or filler when uttered in isolation.
MEANINGFUL_STANDALONE_WORDS: Set[str] = {
    # English
    "yes",
    "no",
    "okay",
    "ok",
    "fine",
    "done",
    "ready",
    "sure",
    "yep",
    "nope",
    "correct",
    "right",
    "agree",
    "thanks",
    "thank you",
    "bye",
    "goodbye",
    # Hindi
    "हाँ",
    "नहीं",
    "ठीक",
    "ठीक है",
    "सही",
    # Spanish
    "sí",
    "no",
    "listo",
    "bien",
    "gracias",
}
