"""Service for detecting and classifying noise and fillers in transcript segments."""

import logging
import re
import unicodedata
from typing import List, Optional, Tuple

from app.core.fillers import ALL_FILLERS, MEANINGFUL_STANDALONE_WORDS
from app.models.transcript import SegmentClassification, TranscriptSegment

logger = logging.getLogger(__name__)

# Regular expressions for audio / noise artifacts
BRACKETED_NOISE_REGEX = re.compile(r"^\s*(\[.*\]|\(.*\))\s*$", re.IGNORECASE)
PUNCTUATION_OR_WHITESPACE_REGEX = re.compile(r"^[\W_]+$", re.UNICODE)


def normalize_tokens(text: str) -> List[str]:
    """
    Tokenize and normalize text for analysis purposes ONLY.
    The original text is never altered.

    Rules:
    - Strips leading/trailing punctuation from tokens.
    - Normalizes Unicode characters (NFC).
    - Lowercases text for comparison.
    """
    if not text:
        return []

    # Unicode normalization
    normalized = unicodedata.normalize("NFC", text)
    # Split on whitespace
    raw_tokens = normalized.strip().split()

    tokens: List[str] = []
    for token in raw_tokens:
        # Strip common punctuation around token (quotes, brackets, commas, periods, etc.)
        cleaned = re.sub(r"^[^\w\s]+|[^\w\s]+$", "", token, flags=re.UNICODE)
        if cleaned:
            tokens.append(cleaned.lower())

    return tokens


def is_repeated_token_sequence(tokens: List[str]) -> bool:
    """
    Check if a list of tokens consists entirely of the same repeated word or phrase.
    E.g. ['ready', 'ready'] -> True
         ['aló', 'aló', 'aló', 'aló'] -> True
         ['um', 'um', 'um'] -> True
    """
    if len(tokens) < 2:
        return False

    # Single token repeated (e.g. "ready ready")
    if all(token == tokens[0] for token in tokens):
        return True

    # 2-token phrase repeated (e.g. "so so", "wait wait", "ok then ok then")
    if len(tokens) % 2 == 0 and len(tokens) >= 4:
        half = len(tokens) // 2
        if tokens[:half] == tokens[half:]:
            return True

    return False


def classify_segment(
    segment: TranscriptSegment,
    previous_segment: Optional[TranscriptSegment] = None,
) -> Tuple[SegmentClassification, float]:
    """
    Deterministically classify a transcript segment.

    Confidence Strategy:
    - 0.98 - 1.00: Clear non-speech noise (bracketed annotations, empty text, punctuation noise).
    - 0.97 - 0.99: Regular informative sentences (CLEAN) or exact dictionary fillers (FILLER).
    - 0.95: Verified standalone affirmations (CLEAN) or full intra-segment repetition (POSSIBLE_REPETITION).
    - 0.88 - 0.90: Consecutive identical affirmations across adjacent segments (POSSIBLE_REPETITION).
    - 0.50 - 0.65: Ambiguous single-token non-lexical fragments (UNCERTAIN).

    Args:
        segment: Current segment to classify.
        previous_segment: Preceding segment in transcript (for contextual analysis).

    Returns:
        Tuple of (classification, confidence).
    """
    raw_text = segment.text
    stripped_text = raw_text.strip()

    # Rule 1: Empty or whitespace-only segment
    if not stripped_text:
        return SegmentClassification.NOISE, 1.0

    # Rule 2: Bracketed non-speech noise annotation e.g. [Background typing noise and low hum]
    if BRACKETED_NOISE_REGEX.match(stripped_text):
        return SegmentClassification.NOISE, 0.98

    # Rule 3: Pure punctuation or symbol noise (e.g. "...", "---", "***")
    if PUNCTUATION_OR_WHITESPACE_REGEX.match(stripped_text):
        return SegmentClassification.NOISE, 0.98

    # Extract normalized tokens for internal analysis
    tokens = normalize_tokens(stripped_text)

    if not tokens:
        return SegmentClassification.NOISE, 0.98

    # Rule 4: Intra-segment token repetition (e.g. "ready ready.", "Aló, aló, aló, aló.", "um um um")
    if is_repeated_token_sequence(tokens):
        return SegmentClassification.POSSIBLE_REPETITION, 0.95

    # Rule 5: Contextual inter-segment repetition (e.g. repeated "Okay." from the same speaker)
    if previous_segment and previous_segment.speaker == segment.speaker:
        prev_tokens = normalize_tokens(previous_segment.text)
        # If both are short (<= 2 tokens) and identical
        if tokens and prev_tokens and tokens == prev_tokens and len(tokens) <= 2:
            return SegmentClassification.POSSIBLE_REPETITION, 0.90

    # Rule 6: Pure single or multi-token filler words from dictionary
    # Standalone "yeah" is also considered a filler per requirements
    extra_fillers = {"yeah"}
    if all(t in ALL_FILLERS or t in extra_fillers for t in tokens):
        return SegmentClassification.FILLER, 0.97

    # Rule 7: Standalone meaningful word or short phrase (e.g. "yes", "no", "okay", "done", "ready", "हाँ बोल")
    # Must NOT be assumed to be noise or filler!
    normalized_phrase = " ".join(tokens)
    if (
        normalized_phrase in MEANINGFUL_STANDALONE_WORDS
        or (len(tokens) == 1 and tokens[0] in MEANINGFUL_STANDALONE_WORDS)
    ):
        return SegmentClassification.CLEAN, 0.95

    # Rule 8: Multi-word sentence with lexical content
    # If the segment contains multiple words that are not all fillers, it carries conversational meaning.
    if len(tokens) >= 2:
        return SegmentClassification.CLEAN, 0.99

    # Rule 9: Single token analysis
    single_token = tokens[0]
    # Check if single token is a known greeting/word (e.g. "aló", "hello", "hi")
    if single_token in {"aló", "alo", "hello", "hi", "hey", "hola"}:
        return SegmentClassification.CLEAN, 0.95

    # If single token has >= 3 characters (likely a truncated or isolated word)
    if len(single_token) >= 3:
        return SegmentClassification.CLEAN, 0.85

    # Rule 10: Fallback for ambiguous isolated fragments (e.g. "x", "ab")
    return SegmentClassification.UNCERTAIN, 0.50


def detect_noise_and_fillers(segments: List[TranscriptSegment]) -> List[TranscriptSegment]:
    """
    Analyze a list of structured transcript segments and add classification metadata.

    Guarantees:
    - The original sequence, speaker, and verbatim text are NEVER modified.
    - Classification is added as `classification` (CLEAN, FILLER, NOISE, POSSIBLE_REPETITION, UNCERTAIN).
    - Confidence is added as a float between 0.0 and 1.0.
    - Contextual awareness: utilizes previous segment info for detecting repeated short utterances.

    Args:
        segments: List of TranscriptSegment objects from Part 1.

    Returns:
        List of TranscriptSegment objects with classification and confidence metadata.
    """
    classified_segments: List[TranscriptSegment] = []

    prev_segment: Optional[TranscriptSegment] = None
    for segment in segments:
        classification, confidence = classify_segment(segment, previous_segment=prev_segment)

        # Create a new segment instance preserving original fields exactly
        classified_segment = TranscriptSegment(
            sequence=segment.sequence,
            speaker=segment.speaker,
            text=segment.text,  # Verbatim text preserved!
            classification=classification,
            confidence=confidence,
        )
        classified_segments.append(classified_segment)
        prev_segment = segment

    logger.info(
        "Completed noise & filler detection for %d segments.",
        len(classified_segments),
    )
    return classified_segments
