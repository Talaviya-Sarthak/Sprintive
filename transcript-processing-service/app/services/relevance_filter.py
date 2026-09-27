"""Service for pre-meeting, audio/connection checks, and relevance filtering."""

import logging
import re
from typing import List, Optional, Tuple
import unicodedata

from app.core.relevance import (
    AUDIO_CHECK_PATTERNS,
    CONFIDENCE_HIGH,
    CONFIDENCE_LOW,
    CONFIDENCE_MEDIUM,
    CONNECTION_CHECK_PATTERNS,
    EXCLUSION_THRESHOLD,
    IRRELEVANT_PATTERNS,
    MEETING_START_PATTERNS,
    PRE_MEETING_PATTERNS,
    TECHNICAL_MEETING_KEYWORDS,
)
from app.models.transcript import (
    RelevanceCategory,
    SegmentClassification,
    TranscriptSegment,
)

logger = logging.getLogger(__name__)


def normalize_text_for_matching(text: str) -> str:
    """
    Lowercase, NFC normalize, and strip extra whitespace for rule-based pattern matching.
    """
    if not text:
        return ""
    normalized = unicodedata.normalize("NFC", text.strip().lower())
    # Replace punctuation with single spaces for boundary-independent matching
    cleaned = re.sub(r"[^\w\s]", " ", normalized, flags=re.UNICODE)
    return re.sub(r"\s+", " ", cleaned).strip()


def has_technical_or_agenda_keywords(text: str) -> bool:
    """
    Check if the text contains explicit technical, domain, or meeting agenda keywords.
    Presence of these keywords strongly protects content from being filtered out.
    """
    normalized = normalize_text_for_matching(text)
    if not normalized:
        return False

    tokens = set(normalized.split())

    # Check whole-token matches
    for kw in TECHNICAL_MEETING_KEYWORDS:
        if " " in kw:
            if kw in normalized:
                return True
        else:
            if kw in tokens:
                return True

    return False


def is_meeting_start_signal(text: str) -> bool:
    """
    Detect whether a segment explicitly signals the formal start of the meeting.
    """
    normalized = normalize_text_for_matching(text)
    if not normalized:
        return False

    for pattern in MEETING_START_PATTERNS:
        clean_pattern = normalize_text_for_matching(pattern)
        if clean_pattern in normalized:
            return True

    return False


def matches_pattern_list(text: str, patterns: List[str]) -> bool:
    """
    Check if text matches any pattern in a given list.
    """
    normalized = normalize_text_for_matching(text)
    if not normalized:
        return False

    for pattern in patterns:
        clean_pattern = normalize_text_for_matching(pattern)
        if clean_pattern in normalized:
            return True

    return False


def find_meeting_start_index(segments: List[TranscriptSegment]) -> Optional[int]:
    """
    Identify the 0-based index of the segment where the meeting officially starts.
    Uses explicit meeting-start signals first, or infers from the start of
    substantive technical agenda discussions.
    """
    for idx, seg in enumerate(segments):
        target_text = seg.processed_text if seg.processed_text is not None else seg.text
        raw_text = seg.text
        if is_meeting_start_signal(target_text) or is_meeting_start_signal(raw_text):
            return idx

    # If no explicit "let's start" signal is found, find the first substantive technical segment
    # that is NOT an audio check, connection check, pre-meeting wait, or irrelevant chatter
    for idx, seg in enumerate(segments):
        target_text = seg.processed_text if seg.processed_text is not None else seg.text
        raw_text = seg.text
        if (
            matches_pattern_list(target_text, AUDIO_CHECK_PATTERNS)
            or matches_pattern_list(raw_text, AUDIO_CHECK_PATTERNS)
            or matches_pattern_list(target_text, CONNECTION_CHECK_PATTERNS)
            or matches_pattern_list(raw_text, CONNECTION_CHECK_PATTERNS)
            or matches_pattern_list(target_text, PRE_MEETING_PATTERNS)
            or matches_pattern_list(raw_text, PRE_MEETING_PATTERNS)
            or matches_pattern_list(target_text, IRRELEVANT_PATTERNS)
            or matches_pattern_list(raw_text, IRRELEVANT_PATTERNS)
        ):
            continue

        if has_substantive_meeting_content(target_text) or has_substantive_meeting_content(raw_text):
            return idx

    return None



SUBSTANTIVE_MEETING_KEYWORDS = {
    "database",
    "db",
    "api",
    "production",
    "prod",
    "deploy",
    "deployment",
    "frontend",
    "backend",
    "issue",
    "issues",
    "bug",
    "bugs",
    "fix",
    "fixed",
    "pr",
    "commit",
    "pipeline",
    "endpoint",
    "endpoints",
    "server",
    "logs",
    "error",
    "errors",
    "exception",
    "query",
    "schema",
    "table",
    "sprint",
    "ticket",
    "tickets",
    "jira",
    "review",
    "progress",
    "blocker",
    "blockers",
    "architecture",
    "डेटाबेस",
    "समस्या",
    "काम",
    "बग",
}


def has_substantive_meeting_content(text: str) -> bool:
    """
    Check if text contains substantive technical/agenda content beyond generic check phrases.
    """
    normalized = normalize_text_for_matching(text)
    tokens = set(normalized.split())
    for kw in SUBSTANTIVE_MEETING_KEYWORDS:
        if " " in kw:
            if kw in normalized:
                return True
        else:
            if kw in tokens:
                return True
    return False


def classify_segment_relevance(
    segment: TranscriptSegment,
    is_pre_meeting_phase: bool,
    is_start_segment: bool,
    previous_segment: Optional[TranscriptSegment] = None,
) -> Tuple[RelevanceCategory, bool, float, str]:
    """
    Classify a single transcript segment for relevance with conservative bias toward preservation.

    Returns:
        (relevance_category, include_in_meeting, filter_confidence, filter_reason)
    """
    raw_text = segment.text
    target_text = segment.processed_text if segment.processed_text is not None else segment.text
    stripped = target_text.strip() if target_text else ""

    # Rule 0: Empty segment
    if not stripped:
        return (
            RelevanceCategory.UNCERTAIN,
            True,
            CONFIDENCE_LOW,
            "Empty or whitespace-only segment preserved safely",
        )

    # Rule 1: Explicit meeting start signal (e.g. "Good morning everyone. Let's get started.")
    if is_start_segment or is_meeting_start_signal(target_text) or is_meeting_start_signal(raw_text):
        return (
            RelevanceCategory.MEETING_CONTENT,
            True,
            0.99,
            "Formal meeting start announcement",
        )

    # Rule 2: Audio check detection (e.g. "Can you hear me?", "Hello hello testing", "Am I audible?")
    is_audio = matches_pattern_list(target_text, AUDIO_CHECK_PATTERNS) or matches_pattern_list(
        raw_text, AUDIO_CHECK_PATTERNS
    )
    if is_audio:
        # Check if the audio check contains actual substantive meeting information
        if has_substantive_meeting_content(target_text) or has_substantive_meeting_content(raw_text):
            return (
                RelevanceCategory.MEETING_CONTENT,
                True,
                0.95,
                "Contains substantive meeting information despite audio check phrasing",
            )
        return (
            RelevanceCategory.AUDIO_CHECK,
            False,
            CONFIDENCE_HIGH,
            "Microphone and audio check",
        )

    # Rule 3: Connection check detection (e.g. "Can you see my screen?", "My connection is unstable")
    is_conn = matches_pattern_list(target_text, CONNECTION_CHECK_PATTERNS) or matches_pattern_list(
        raw_text, CONNECTION_CHECK_PATTERNS
    )
    if is_conn:
        # Check if contains substantive meeting information
        if has_substantive_meeting_content(target_text) or has_substantive_meeting_content(raw_text):
            return (
                RelevanceCategory.MEETING_CONTENT,
                True,
                0.95,
                "Contains substantive meeting information despite connection check phrasing",
            )
        return (
            RelevanceCategory.CONNECTION_CHECK,
            False,
            CONFIDENCE_HIGH,
            "Screen share or network setup check",
        )

    # Rule 4: Substantive technical, architecture, or agile discussion
    # Even if words like "connect" or "audio" are present, technical content MUST be preserved!
    # E.g., "The API cannot connect to the production database."
    if has_technical_or_agenda_keywords(target_text) or has_technical_or_agenda_keywords(raw_text):
        return (
            RelevanceCategory.MEETING_CONTENT,
            True,
            0.99,
            "Substantive technical or agenda discussion",
        )


    # Rule 5: Clearly irrelevant off-topic conversation (e.g. "Did you order food?", "Going for lunch")
    if matches_pattern_list(target_text, IRRELEVANT_PATTERNS):
        return (
            RelevanceCategory.IRRELEVANT,
            False,
            CONFIDENCE_HIGH,
            "Off-topic social or non-work conversation",
        )

    # Rule 6: Pre-meeting arrival, waiting, and setup chatter (Only before meeting officially starts)
    if is_pre_meeting_phase:
        if matches_pattern_list(target_text, PRE_MEETING_PATTERNS):
            return (
                RelevanceCategory.PRE_MEETING,
                False,
                CONFIDENCE_HIGH,
                "Pre-meeting arrival or waiting conversation",
            )

        # Non-speech noise or isolated filler greeting before start (e.g. "[Background typing]", "Aló.", "हाँ बोल")
        if segment.classification in {
            SegmentClassification.NOISE,
            SegmentClassification.FILLER,
        }:
            return (
                RelevanceCategory.PRE_MEETING,
                False,
                CONFIDENCE_MEDIUM,
                "Pre-meeting background noise or hesitation",
            )

        # Casual short checks / greetings before start (e.g. "Aló.", "Hello?", "wait wait")
        norm_tokens = normalize_text_for_matching(target_text).split()
        if len(norm_tokens) <= 2 and any(
            token in {"aló", "alo", "hello", "hi", "hey", "wait", "रुको", "बोल"}
            for token in norm_tokens
        ):
            return (
                RelevanceCategory.PRE_MEETING,
                False,
                CONFIDENCE_MEDIUM,
                "Pre-meeting greeting or readiness check",
            )

    # Rule 7: Post-start short meaningful responses (e.g. "Yes.", "Okay.", "Done.", "ठीक है", "Listo.")
    if not is_pre_meeting_phase:
        norm_tokens = normalize_text_for_matching(target_text).split()
        if len(norm_tokens) <= 3 and any(
            token in {
                "yes",
                "no",
                "okay",
                "ok",
                "done",
                "sure",
                "fine",
                "right",
                "correct",
                "agree",
                "thanks",
                "हाँ",
                "नहीं",
                "ठीक",
                "सही",
                "sí",
                "si",
                "listo",
                "bien",
                "gracias",
            }
            for token in norm_tokens
        ):
            return (
                RelevanceCategory.MEETING_CONTENT,
                True,
                CONFIDENCE_HIGH,
                "Meeting dialogue acknowledgment or status response",
            )

        # Regular multi-word sentence spoken during the active meeting phase
        if len(norm_tokens) >= 2:
            return (
                RelevanceCategory.MEETING_CONTENT,
                True,
                CONFIDENCE_MEDIUM,
                "Active meeting discussion",
            )

    # Fallback: Conservative preservation for uncertain content
    # Policy: Low/medium confidence defaults to include_in_meeting = True
    return (
        RelevanceCategory.UNCERTAIN,
        True,
        CONFIDENCE_LOW,
        "Ambiguous context; preserved conservatively",
    )


def filter_irrelevant_content(
    segments: List[TranscriptSegment],
) -> List[TranscriptSegment]:
    """
    Analyze Part 3 transcript segments to identify pre-meeting conversation, audio/connection
    checks, and irrelevant content while strictly preserving all original fields and metadata.

    Guarantees:
    - Never physically deletes any segment.
    - Preserves `sequence`, `speaker`, verbatim `text`, Part 2 `classification`,
      and Part 3 `processed_text` / repetition metadata 100% untouched.
    - Adds `relevance`, `include_in_meeting`, `filter_confidence`, and `filter_reason`.
    - Conservative bias toward preservation (uncertain content kept in meeting).
    - Multilingual and mixed-language transcripts supported without translation.
    """
    meeting_start_idx = find_meeting_start_index(segments)
    logger.info(
        "Detected meeting start index: %s (total segments: %d)",
        meeting_start_idx,
        len(segments),
    )

    filtered_segments: List[TranscriptSegment] = []
    prev_seg: Optional[TranscriptSegment] = None

    for idx, seg in enumerate(segments):
        is_pre_meeting = (meeting_start_idx is not None) and (idx < meeting_start_idx)
        is_start_segment = (meeting_start_idx is not None) and (idx == meeting_start_idx)

        relevance, include_in_meeting, confidence, reason = classify_segment_relevance(
            segment=seg,
            is_pre_meeting_phase=is_pre_meeting,
            is_start_segment=is_start_segment,
            previous_segment=prev_seg,
        )

        # Policy enforcement: exclude ONLY when high confidence (>= 0.90) and non-meeting category
        final_include = include_in_meeting
        if confidence < EXCLUSION_THRESHOLD:
            final_include = True

        new_segment = TranscriptSegment(
            sequence=seg.sequence,
            speaker=seg.speaker,
            text=seg.text,  # Verbatim original preserved!
            classification=seg.classification,
            confidence=seg.confidence,
            processed_text=seg.processed_text,
            repetition_modified=seg.repetition_modified,
            repetition_type=seg.repetition_type,
            is_duplicate=seg.is_duplicate,
            duplicate_of_sequence=seg.duplicate_of_sequence,
            relevance=relevance,
            include_in_meeting=final_include,
            filter_confidence=confidence,
            filter_reason=reason,
        )

        filtered_segments.append(new_segment)
        prev_seg = seg

    logger.info(
        "Completed relevance filtering: %d/%d segments included in meeting",
        sum(1 for s in filtered_segments if s.include_in_meeting),
        len(filtered_segments),
    )
    return filtered_segments
