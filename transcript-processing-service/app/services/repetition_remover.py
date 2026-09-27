"""Service for detecting and removing repetition in transcript segments."""

from dataclasses import dataclass
import difflib
import logging
import re
from typing import List, Optional, Set, Tuple
import unicodedata

from app.core.repetition import (
    DUPLICATE_LOOKBACK,
    EXACT_DUPLICATE_THRESHOLD,
    INTENTIONAL_REPETITION_PHRASES,
    INTENTIONAL_REPETITION_WORDS,
    MIN_TOKENS_FOR_NEAR_DUPLICATE,
    NEAR_DUPLICATE_THRESHOLD,
)
from app.models.transcript import RepetitionType, TranscriptSegment

logger = logging.getLogger(__name__)


@dataclass
class TokenSpan:
    """Represents a token and its character offset in original text."""

    start: int
    end: int
    raw: str
    norm: str


def strip_boundary_punctuation(text: str) -> str:
    """
    Strip leading and trailing punctuation and symbols while strictly preserving
    letters (L*), numbers (N*), and Unicode combining marks (M* such as Indic vowel matras).
    """
    if not text:
        return ""
    start = 0
    while start < len(text) and unicodedata.category(text[start]).startswith(("P", "S", "Z")):
        start += 1
    end = len(text)
    while end > start and unicodedata.category(text[end - 1]).startswith(("P", "S", "Z")):
        end -= 1
    return text[start:end]


def normalize_for_comparison(text: str) -> str:
    """
    Produce a normalized representation of text strictly for repetition comparison.
    The original text is never mutated.

    Rules:
    - Unicode NFC normalization.
    - Strips boundary punctuation and whitespace.
    - Collapses repeated whitespace.
    - Lowercases text.
    """
    if not text:
        return ""

    normalized = unicodedata.normalize("NFC", text.strip())
    # Strip leading and trailing punctuation / symbol characters safely
    cleaned = strip_boundary_punctuation(normalized)
    # Collapse multiple whitespace characters
    collapsed = re.sub(r"\s+", " ", cleaned)
    return collapsed.lower()


def extract_token_spans(text: str) -> List[TokenSpan]:
    """
    Extract tokens from text along with their character spans in original string.
    Each token includes its verbatim slice and its normalized comparison form.
    """
    if not text:
        return []

    spans: List[TokenSpan] = []
    # Match any contiguous non-whitespace sequence
    for match in re.finditer(r"\S+", text):
        raw = match.group()
        start = match.start()
        end = match.end()

        # Normalize token for repetition matching
        norm = unicodedata.normalize("NFC", raw)
        norm = strip_boundary_punctuation(norm).lower()
        if norm:
            spans.append(TokenSpan(start=start, end=end, raw=raw, norm=norm))


    return spans


def detect_and_remove_repeated_phrases(
    text: str,
    intentional_phrases: Set[str] = INTENTIONAL_REPETITION_PHRASES,
) -> Tuple[str, bool]:
    """
    Detect immediately repeated multi-word phrases (k >= 2 tokens) and safely collapse
    them to a single occurrence, preserving capitalization and trailing punctuation.

    Example:
        "we need to deploy we need to deploy" -> "we need to deploy"
        "API testing, API testing." -> "API testing."
    """
    tokens = extract_token_spans(text)
    n = len(tokens)
    if n < 4:
        return text, False

    replacements: List[Tuple[int, int, str]] = []
    i = 0
    modified = False

    # Max phrase length up to 10 tokens or half the tokens
    max_k = min(10, n // 2)

    while i < n:
        found_phrase = False
        for k in range(max_k, 1, -1):
            if i + 2 * k > n:
                continue

            phrase1_norms = [tokens[i + j].norm for j in range(k)]

            # A phrase must consist of more than one distinct token.
            # If all tokens are the same (e.g. ['aló', 'aló']), it is consecutive word repetition, not a phrase.
            if len(set(phrase1_norms)) <= 1:
                continue

            phrase_str = " ".join(phrase1_norms)

            # Check if phrase is an intentional idiomatic construction
            if phrase_str in intentional_phrases:
                continue


            # Count consecutive repetitions of this phrase
            repetitions = 1
            while i + (repetitions + 1) * k <= n:
                next_phrase_norms = [
                    tokens[i + repetitions * k + j].norm for j in range(k)
                ]
                if next_phrase_norms == phrase1_norms:
                    repetitions += 1
                else:
                    break

            if repetitions >= 2:
                # Collapse phrase repetitions
                start_char = tokens[i].start
                end_char = tokens[i + repetitions * k - 1].end

                # Verbatim text of first phrase
                first_raw = text[tokens[i].start : tokens[i + k - 1].end]
                # Strip trailing comma, semicolon, or whitespace from first occurrence
                first_cleaned = re.sub(r"[,;:\s]+$", "", first_raw)

                # Trailing punctuation from the final occurrence
                last_raw = text[tokens[i + repetitions * k - 1].start : end_char]
                trailing_punct_match = re.search(r"([.!?…\"'”’]+)$", last_raw)
                trailing_punct = (
                    trailing_punct_match.group(1) if trailing_punct_match else ""
                )

                if trailing_punct and not first_cleaned.endswith(trailing_punct):
                    replacement = first_cleaned + trailing_punct
                else:
                    replacement = first_cleaned

                replacements.append((start_char, end_char, replacement))
                i += repetitions * k
                found_phrase = True
                modified = True
                break

        if not found_phrase:
            i += 1

    if not modified:
        return text, False

    # Apply replacements from right to left to preserve offsets
    result = text
    for start, end, rep in sorted(replacements, key=lambda x: x[0], reverse=True):
        result = result[:start] + rep + result[end:]

    return result, True


def detect_and_remove_consecutive_words(
    text: str,
    intentional_words: Set[str] = INTENTIONAL_REPETITION_WORDS,
) -> Tuple[str, bool]:
    """
    Detect immediately repeated single words and safely collapse them to a single occurrence,
    strictly preserving intentional emphasis (e.g. "very very important", "no no, don't deploy it").

    Example:
        "ready ready." -> "ready."
        "done done done." -> "done."
        "Aló, aló, aló, aló." -> "Aló."
        "हाँ हाँ हाँ" -> "हाँ"
    """
    tokens = extract_token_spans(text)
    n = len(tokens)
    if n < 2:
        return text, False

    replacements: List[Tuple[int, int, str]] = []
    i = 0
    modified = False

    while i < n:
        norm_word = tokens[i].norm

        # Count consecutive identical tokens
        r = 1
        while i + r < n and tokens[i + r].norm == norm_word:
            r += 1

        if r >= 2:
            # Meaning preservation: check if intentional repetition
            if norm_word in intentional_words:
                i += r
                continue

            start_char = tokens[i].start
            end_char = tokens[i + r - 1].end

            # Verbatim text of first occurrence
            first_raw = text[tokens[i].start : tokens[i].end]
            # Strip trailing comma, semicolon, or whitespace from first occurrence
            first_cleaned = re.sub(r"[,;:\s]+$", "", first_raw)

            # Trailing punctuation from final occurrence
            last_raw = text[tokens[i + r - 1].start : tokens[i + r - 1].end]
            trailing_punct_match = re.search(r"([.!?…\"'”’]+)$", last_raw)
            trailing_punct = (
                trailing_punct_match.group(1) if trailing_punct_match else ""
            )

            if trailing_punct and not first_cleaned.endswith(trailing_punct):
                replacement = first_cleaned + trailing_punct
            else:
                replacement = first_cleaned

            replacements.append((start_char, end_char, replacement))
            i += r
            modified = True
        else:
            i += 1

    if not modified:
        return text, False

    # Apply replacements from right to left to preserve offsets
    result = text
    for start, end, rep in sorted(replacements, key=lambda x: x[0], reverse=True):
        result = result[:start] + rep + result[end:]

    return result, True


def clean_intra_segment_repetition(text: str) -> Tuple[str, RepetitionType, bool]:
    """
    Process intra-segment repetition in order:
    1. Repeated phrases (Type 2)
    2. Consecutive word repetition (Type 1)

    Returns:
        (processed_text, repetition_type, modified)
    """
    if not text or not text.strip():
        return text, RepetitionType.NONE, False

    current_text = text
    rep_type = RepetitionType.NONE
    modified = False

    # 1. Repeated phrase detection
    phrase_cleaned, phrase_modified = detect_and_remove_repeated_phrases(current_text)
    if phrase_modified:
        current_text = phrase_cleaned
        rep_type = RepetitionType.REPEATED_PHRASE
        modified = True

    # 2. Consecutive word repetition detection
    word_cleaned, word_modified = detect_and_remove_consecutive_words(current_text)
    if word_modified:
        current_text = word_cleaned
        if rep_type == RepetitionType.NONE:
            rep_type = RepetitionType.CONSECUTIVE_WORD
        modified = True

    return current_text, rep_type, modified


def remove_repetitions(
    segments: List[TranscriptSegment],
    duplicate_lookback: int = DUPLICATE_LOOKBACK,
    exact_duplicate_threshold: float = EXACT_DUPLICATE_THRESHOLD,
    near_duplicate_threshold: float = NEAR_DUPLICATE_THRESHOLD,
) -> List[TranscriptSegment]:
    """
    Process Part 2 segments to remove STT and transcript repetitions while preserving
    meaningful repetition, speaker boundaries, and raw verbatim text.

    Processing Order:
    1. Preserve original text, speaker, and sequence.
    2. Normalize comparison text.
    3. Check exact segment duplicates (Type 3) within lookback window.
    4. Check near-duplicate segments (Type 4) within lookback window.
    5. Check repeated phrases (Type 2).
    6. Check consecutive word repetition (Type 1).
    7. Preserve intentional repetition and uncertain cases.
    8. Return Part 3 processed segments in original order.

    Guarantees:
    - Original `text` field is NEVER modified.
    - `sequence` and `speaker` are NEVER modified.
    - Ordering of segments is strictly preserved.
    - Cross-speaker repetitions are never merged (Speaker Boundary Rule).
    - Duplicates separated by another speaker are never merged.
    """
    processed_segments: List[TranscriptSegment] = []

    for idx, seg in enumerate(segments):
        norm_curr = normalize_for_comparison(seg.text)

        # Cross-segment duplication analysis (Types 3 & 4)
        is_duplicate = False
        duplicate_of_sequence: Optional[int] = None
        detected_type = RepetitionType.NONE

        if norm_curr:
            for lookback_step in range(1, duplicate_lookback + 1):
                prev_idx = idx - lookback_step
                if prev_idx < 0:
                    break

                prev_seg = segments[prev_idx]

                # Speaker Boundary Rule:
                # If an intervening segment is from a different speaker, stop looking back!
                if prev_seg.speaker != seg.speaker:
                    break

                norm_prev = normalize_for_comparison(prev_seg.text)
                if not norm_prev:
                    continue

                # Type 3: Exact duplicate segment
                if norm_curr == norm_prev:
                    is_duplicate = True
                    duplicate_of_sequence = prev_seg.sequence
                    detected_type = RepetitionType.EXACT_SEGMENT_DUPLICATE
                    break

                # Type 4: Near-duplicate segment
                tokens_curr = norm_curr.split()
                tokens_prev = norm_prev.split()
                if (
                    len(tokens_curr) >= MIN_TOKENS_FOR_NEAR_DUPLICATE
                    and len(tokens_prev) >= MIN_TOKENS_FOR_NEAR_DUPLICATE
                ):
                    similarity = difflib.SequenceMatcher(
                        None, norm_curr, norm_prev
                    ).ratio()
                    if similarity >= near_duplicate_threshold:
                        is_duplicate = True
                        duplicate_of_sequence = prev_seg.sequence
                        detected_type = RepetitionType.NEAR_SEGMENT_DUPLICATE
                        break

        if is_duplicate:
            # Duplicate segment: marked with processed_text="", is_duplicate=True
            new_seg = TranscriptSegment(
                sequence=seg.sequence,
                speaker=seg.speaker,
                text=seg.text,  # Verbatim original preserved!
                classification=seg.classification,
                confidence=seg.confidence,
                processed_text="",
                repetition_modified=True,
                repetition_type=detected_type,
                is_duplicate=True,
                duplicate_of_sequence=duplicate_of_sequence,
            )
            processed_segments.append(new_seg)
            continue

        # Intra-segment repetition analysis (Types 1 & 2)
        proc_text, intra_type, modified = clean_intra_segment_repetition(seg.text)

        new_seg = TranscriptSegment(
            sequence=seg.sequence,
            speaker=seg.speaker,
            text=seg.text,  # Verbatim original preserved!
            classification=seg.classification,
            confidence=seg.confidence,
            processed_text=proc_text,
            repetition_modified=modified,
            repetition_type=intra_type if modified else RepetitionType.NONE,
            is_duplicate=False,
            duplicate_of_sequence=None,
        )
        processed_segments.append(new_seg)

    logger.info(
        "Completed repetition removal for %d segments (%d modified)",
        len(processed_segments),
        sum(1 for s in processed_segments if s.repetition_modified),
    )
    return processed_segments
