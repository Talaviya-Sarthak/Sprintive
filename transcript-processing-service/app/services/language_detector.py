"""Language detection service for Part 11 — Language Preservation Check."""

import re
from typing import List, Set, Tuple
from app.config.language import (
    AMBIGUOUS_SHORT_EXPRESSIONS,
    DEVANAGARI_REGEX,
    HINGLISH_WORDS,
    LANG_EN,
    LANG_ES,
    LANG_HI,
    LANG_MIXED,
    LANG_UNKNOWN,
    SPANISH_SPECIAL_CHAR_REGEX,
    SPANISH_WORDS,
)
from app.config.terminology import CANONICAL_TECHNICAL_TERMS, TECHNICAL_TERMS
from app.models.language_validation import SegmentLanguageProfile

# Compile regex patterns
_DEVANAGARI_PATTERN = re.compile(DEVANAGARI_REGEX)
_SPANISH_CHAR_PATTERN = re.compile(SPANISH_SPECIAL_CHAR_REGEX)
_WORD_PATTERN = re.compile(r"[\w]+", re.UNICODE)

# Build lowercase technical terms set
_TECH_TERMS_SET: Set[str] = {term.lower() for term in TECHNICAL_TERMS}
for canonical, meta in CANONICAL_TECHNICAL_TERMS.items():
    _TECH_TERMS_SET.add(canonical.lower())
    for v in meta.get("variants", []):
        _TECH_TERMS_SET.add(v.lower())
# Add common tech words that might appear in scrum meetings
_EXTRA_TECH: Set[str] = {
    "connection", "check", "issue", "server", "client", "backend", "frontend",
    "deploy", "deployment", "merge", "commit", "branch", "repo", "test", "testing",
    "code", "review", "auth", "token", "cache", "redis", "database", "api", "query",
}
_TECH_TERMS_SET.update(_EXTRA_TECH)


def _tokenize(text: str) -> List[str]:
    """Extract lowercased word tokens from text."""
    if not text:
        return []
    return _WORD_PATTERN.findall(text.lower())


def detect_segment_language(text: str) -> SegmentLanguageProfile:
    """
    Detect the language profile of a transcript segment.

    Identifies primary language, detected languages list, whether speech is mixed
    (code-switching / Hinglish / Spanglish), and detection confidence.

    Args:
        text: Dialogue text to analyze.

    Returns:
        SegmentLanguageProfile instance.
    """
    clean_text = text.strip() if text else ""
    if not clean_text:
        return SegmentLanguageProfile(
            primary_language=LANG_UNKNOWN,
            languages_detected=[],
            is_mixed_language=False,
            language_confidence=0.0,
        )

    # 1. Script checks
    has_devanagari = bool(_DEVANAGARI_PATTERN.search(clean_text))
    has_spanish_char = bool(_SPANISH_CHAR_PATTERN.search(clean_text))

    tokens = _tokenize(clean_text)
    if not tokens:
        return SegmentLanguageProfile(
            primary_language=LANG_UNKNOWN,
            languages_detected=[],
            is_mixed_language=False,
            language_confidence=0.0,
        )

    # Count token categories
    devanagari_tokens: List[str] = []
    hinglish_tokens: List[str] = []
    spanish_tokens: List[str] = []
    tech_tokens: List[str] = []
    latin_other_tokens: List[str] = []

    for tok in tokens:
        if _DEVANAGARI_PATTERN.search(tok):
            devanagari_tokens.append(tok)
        elif tok in _TECH_TERMS_SET:
            tech_tokens.append(tok)
        elif tok in HINGLISH_WORDS:
            hinglish_tokens.append(tok)
        elif tok in SPANISH_WORDS or _SPANISH_CHAR_PATTERN.search(tok):
            spanish_tokens.append(tok)
        else:
            latin_other_tokens.append(tok)

    languages_detected: Set[str] = set()

    # Rule 1: Devanagari script presence
    if has_devanagari or devanagari_tokens:
        languages_detected.add(LANG_HI)
        # Check if Latin tokens (tech or English) are also present
        latin_count = len(tech_tokens) + len(hinglish_tokens) + len(latin_other_tokens)
        if latin_count > 0:
            languages_detected.add(LANG_EN)
            return SegmentLanguageProfile(
                primary_language=LANG_HI if len(devanagari_tokens) >= latin_count else LANG_EN,
                languages_detected=sorted(list(languages_detected)),
                is_mixed_language=True,
                language_confidence=0.96,
            )
        else:
            return SegmentLanguageProfile(
                primary_language=LANG_HI,
                languages_detected=[LANG_HI],
                is_mixed_language=False,
                language_confidence=0.98,
            )

    # Rule 2: Spanish markers (accents or Spanish words)
    if has_spanish_char or len(spanish_tokens) > 0:
        languages_detected.add(LANG_ES)
        # Check if English words or technical words coexist
        has_english_tokens = len(latin_other_tokens) > 0 or len(tech_tokens) > 0
        if has_english_tokens:
            languages_detected.add(LANG_EN)
            is_mixed = True
            primary = LANG_ES if len(spanish_tokens) >= len(latin_other_tokens) else LANG_EN
            return SegmentLanguageProfile(
                primary_language=primary,
                languages_detected=sorted(list(languages_detected)),
                is_mixed_language=is_mixed,
                language_confidence=0.95,
            )
        else:
            return SegmentLanguageProfile(
                primary_language=LANG_ES,
                languages_detected=[LANG_ES],
                is_mixed_language=False,
                language_confidence=0.98,
            )

    # Rule 3: Romanized Hindi (Hinglish) markers
    if len(hinglish_tokens) > 0:
        languages_detected.add(LANG_HI)
        languages_detected.add(LANG_EN)
        # E.g. "Supabase ka database connection fail ho raha hai"
        return SegmentLanguageProfile(
            primary_language=LANG_HI if len(hinglish_tokens) >= (len(tech_tokens) + len(latin_other_tokens)) else LANG_EN,
            languages_detected=sorted(list(languages_detected)),
            is_mixed_language=True,
            language_confidence=0.94,
        )

    # Rule 4: Pure English / Latin script
    # Check for short ambiguous words (e.g., "OK", "Yes")
    lower_clean = clean_text.lower().rstrip(".!?,")
    if lower_clean in AMBIGUOUS_SHORT_EXPRESSIONS and len(tokens) <= 2:
        return SegmentLanguageProfile(
            primary_language=LANG_EN,
            languages_detected=[LANG_EN],
            is_mixed_language=False,
            language_confidence=0.85,
        )

    return SegmentLanguageProfile(
        primary_language=LANG_EN,
        languages_detected=[LANG_EN],
        is_mixed_language=False,
        language_confidence=0.98,
    )
