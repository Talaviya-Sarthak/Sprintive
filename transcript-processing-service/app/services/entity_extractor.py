"""Semantic entity extraction service for Part 12 — Semantic Preservation Validation."""

import re
from typing import List, Optional, Set
from app.config.semantic import (
    CAUSAL_MARKERS,
    CONDITIONAL_MARKERS,
    DATE_MARKERS,
    NEGATION_WORDS,
    NUMBER_WORDS,
    UNCERTAINTY_MARKERS,
)
from app.config.terminology import CANONICAL_TECHNICAL_TERMS, TECHNICAL_TERMS
from app.models.semantic_validation import ExtractedSemanticEntities

_WORD_RE = re.compile(r"[\w']+", re.UNICODE)
_DIGIT_RE = re.compile(r"\b\d+\b")
_TIME_RE = re.compile(
    r"\b(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)|\d{1,2}\s*o'clock|\d{1,2}:\d{2})\b",
    re.IGNORECASE,
)
_CONTRACTION_NEGATION_RE = re.compile(r"\b\w+n['’]t\b", re.IGNORECASE)

# Technical terms lookup map: variant/lowercase -> canonical
_TECH_MAP = {}
for term in TECHNICAL_TERMS:
    _TECH_MAP[term.lower()] = term
for canonical, meta in CANONICAL_TECHNICAL_TERMS.items():
    _TECH_MAP[canonical.lower()] = canonical
    for variant in meta.get("variants", []):
        _TECH_MAP[variant.lower()] = canonical


def _tokenize_lower(text: str) -> List[str]:
    """Tokenize text into lowercase words."""
    if not text:
        return []
    return _WORD_RE.findall(text.lower())


def extract_semantic_entities(
    text: str,
    known_speakers: Optional[Set[str]] = None,
) -> ExtractedSemanticEntities:
    """
    Extract semantic elements from dialogue text:
    - Negations
    - Numbers (digits and word numbers)
    - Dates and relative deadlines
    - Time expressions
    - Technical entities (canonicalized)
    - Person / speaker references
    - Question status
    - Epistemic uncertainty markers
    - Causal indicators
    - Conditional markers

    Args:
        text: Dialogue string.
        known_speakers: Optional set of speaker names present in the meeting.

    Returns:
        ExtractedSemanticEntities model instance.
    """
    if not text or not text.strip():
        return ExtractedSemanticEntities()

    clean_text = text.strip()
    lower_text = clean_text.lower()
    tokens = _tokenize_lower(clean_text)

    # 1. Negations
    negations: List[str] = []
    for tok in tokens:
        normalized_tok = tok.replace("’", "'")
        if normalized_tok in NEGATION_WORDS or _CONTRACTION_NEGATION_RE.match(normalized_tok):
            negations.append(normalized_tok)

    # 2. Times (extracted before numbers so time digits are not treated as quantities)
    times: List[str] = []
    time_digits: Set[str] = set()
    for m in _TIME_RE.findall(clean_text):
        times.append(m.lower().strip())
        for d in _DIGIT_RE.findall(m):
            time_digits.add(d)

    # 3. Numbers (excluding digits that are part of time expressions)
    numbers: List[int] = []
    for m in _DIGIT_RE.findall(clean_text):
        if m in time_digits:
            continue
        try:
            numbers.append(int(m))
        except ValueError:
            pass
    for tok in tokens:
        if tok in NUMBER_WORDS:
            numbers.append(NUMBER_WORDS[tok])

    # 4. Dates and deadlines
    dates_and_deadlines: List[str] = []
    # Check multi-word date markers first
    for marker in sorted(DATE_MARKERS, key=len, reverse=True):
        if " " in marker and marker in lower_text:
            dates_and_deadlines.append(marker)
    # Check single-word date markers
    for tok in tokens:
        if tok in DATE_MARKERS and tok not in dates_and_deadlines:
            dates_and_deadlines.append(tok)

    # 5. Technical entities
    technical_entities: List[str] = []
    # Match multi-word technical terms
    for term_lower, canonical in sorted(_TECH_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if " " in term_lower and term_lower in lower_text:
            if canonical not in technical_entities:
                technical_entities.append(canonical)
    # Match single-word technical terms
    for tok in tokens:
        if tok in _TECH_MAP:
            # Disambiguate "commit" when used as a commitment verb (e.g. "commit to", "i commit")
            if tok == "commit" and ("commit to" in lower_text or "i commit" in lower_text or "we commit" in lower_text):
                continue
            canonical = _TECH_MAP[tok]
            if canonical not in technical_entities:
                technical_entities.append(canonical)

    # 6. Person / speaker references
    person_references: List[str] = []
    if known_speakers:
        for speaker_name in known_speakers:
            s_lower = speaker_name.lower()
            # Match full name or first name
            first_name = s_lower.split()[0] if s_lower.split() else s_lower
            if s_lower in lower_text or re.search(rf"\b{re.escape(first_name)}\b", lower_text):
                if speaker_name not in person_references:
                    person_references.append(speaker_name)

    # 7. Question status
    is_question = (
        clean_text.endswith("?")
        or clean_text.endswith("؟")
        or clean_text.startswith("¿")
    )
    if not is_question:
        # Check interrogative starters
        interrogative_starters = (
            "can we", "can you", "could we", "could you", "would you", "will you",
            "shall we", "should we", "do we", "do you", "did you", "is there",
            "are there", "what", "where", "when", "why", "how", "who", "kya", "kaise",
        )
        for starter in interrogative_starters:
            if lower_text.startswith(starter + " ") or lower_text.startswith(starter + ","):
                is_question = True
                break

    # 8. Uncertainty markers
    uncertainty_markers: List[str] = []
    for marker in sorted(UNCERTAINTY_MARKERS, key=len, reverse=True):
        if marker in lower_text and marker not in uncertainty_markers:
            uncertainty_markers.append(marker)

    # 9. Causal markers
    causal_markers: List[str] = []
    for marker in sorted(CAUSAL_MARKERS, key=len, reverse=True):
        if marker in lower_text and marker not in causal_markers:
            causal_markers.append(marker)

    # 10. Conditional markers
    conditional_markers: List[str] = []
    for marker in sorted(CONDITIONAL_MARKERS, key=len, reverse=True):
        if re.search(rf"\b{re.escape(marker)}\b", lower_text):
            if marker not in conditional_markers:
                conditional_markers.append(marker)

    return ExtractedSemanticEntities(
        negations=negations,
        numbers=numbers,
        dates_and_deadlines=dates_and_deadlines,
        times=times,
        technical_entities=technical_entities,
        person_references=person_references,
        is_question=is_question,
        uncertainty_markers=uncertainty_markers,
        causal_markers=causal_markers,
        conditional_markers=conditional_markers,
    )
