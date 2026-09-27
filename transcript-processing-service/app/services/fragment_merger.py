"""Service for sentence segmentation and fragment merging."""

import logging
import re
from typing import List, Optional
import unicodedata

from app.core.segmentation import (
    CONTINUATION_ENDING_PUNCTUATION,
    CONTINUATION_START_WORDS,
    DANGLING_END_WORDS,
    SENTENCE_TERMINAL_PUNCTUATION,
)
from app.models.transcript import (
    RelevanceCategory,
    RepetitionType,
    SegmentClassification,
    TranscriptSegment,
)

logger = logging.getLogger(__name__)


def strip_boundary_punctuation(token: str) -> str:
    """
    Strip leading and trailing punctuation and symbols while preserving
    letters, numbers, combining marks (vowel signs/matras), and internal apostrophes.
    """
    start = 0
    while (
        start < len(token)
        and unicodedata.category(token[start])[0] in ("P", "S")
        and token[start] not in ("'", "\u2019")
    ):
        start += 1
    end = len(token)
    while (
        end > start
        and unicodedata.category(token[end - 1])[0] in ("P", "S")
        and token[end - 1] not in ("'", "\u2019")
    ):
        end -= 1
    cleaned = token[start:end]
    return unicodedata.normalize("NFC", cleaned.lower())


def get_last_token(text: str) -> str:
    """Extract and normalize the final word/token of a text fragment."""
    tokens = text.strip().split()
    if not tokens:
        return ""
    return strip_boundary_punctuation(tokens[-1])


def get_first_token(text: str) -> str:
    """Extract and normalize the initial word/token of a text fragment."""
    tokens = text.strip().split()
    if not tokens:
        return ""
    return strip_boundary_punctuation(tokens[0])


def has_terminal_punctuation(text: str) -> bool:
    """Check whether text ends with formal sentence-ending punctuation."""
    stripped = text.strip()
    if not stripped:
        return False
    last_char = stripped[-1]
    if last_char in SENTENCE_TERMINAL_PUNCTUATION or last_char == "।":
        return True
    return False


def has_continuation_punctuation(text: str) -> bool:
    """Check whether text ends with clause-continuation punctuation (e.g. comma, colon, dash, ellipsis)."""
    stripped = text.strip()
    if not stripped:
        return False
    for punct in CONTINUATION_ENDING_PUNCTUATION:
        if stripped.endswith(punct):
            return True
    return False


def is_continuation_fragment(prev_text: str, curr_text: str) -> bool:
    """
    Deterministically assess whether curr_text is a grammatical or conversational continuation of prev_text.

    Rules:
    1. If prev_text ends with sentence-terminal punctuation ('.', '?', '!', '।')
       AND curr_text starts with a capital letter forming a new sentence, do NOT merge.
    2. If prev_text ends with continuation punctuation (',', ':', ';', '-', '...'):
       Strong signal of continuation -> merge.
    3. If prev_text ends with a dangling word (preposition, conjunction, auxiliary, determiner):
       Strong signal of continuation -> merge.
    4. If curr_text starts with a lowercase letter:
       Strong signal that curr_text continues the uncompleted clause -> merge.
    5. If curr_text starts with a continuation connector ('from', 'that', 'which', 'with', 'connection', etc.):
       Signal of continuation -> merge.
    """
    stripped_a = prev_text.strip()
    stripped_b = curr_text.strip()

    if not stripped_a or not stripped_b:
        return False

    terminal_a = has_terminal_punctuation(stripped_a)
    continuation_punct_a = has_continuation_punctuation(stripped_a)
    last_token_a = get_last_token(stripped_a)
    first_token_b = get_first_token(stripped_b)

    # Check if first character of curr_text is lowercase
    first_char_b = stripped_b[0]
    is_lowercase_b = first_char_b.islower()

    # Rule 1: Prev text has formal terminal punctuation
    if terminal_a:
        # If terminal punctuation exists and curr_text starts with uppercase, this is a distinct sentence!
        if not is_lowercase_b:
            return False
        # If terminal punctuation exists but curr_text starts with lowercase, only merge if obvious clause connector
        if first_token_b in CONTINUATION_START_WORDS:
            return True
        return False

    # Rule 2: Prev text explicitly ends with continuation punctuation (comma, colon, dash, etc.)
    if continuation_punct_a:
        return True

    # Rule 3: Prev text ends with a dangling connector word or contraction (e.g. "with", "of", "today's", "we'll")
    if last_token_a in DANGLING_END_WORDS or stripped_a.endswith(("'s", "'ll", "'re", "'ve", "'d", "’s", "’ll")):
        return True

    # Rule 4: Curr text starts with lowercase letter (e.g. "review the API.", "connection that is affecting...")
    if is_lowercase_b:
        return True

    # Rule 5: Curr text starts with a continuation word
    if first_token_b in CONTINUATION_START_WORDS:
        return True

    # Rule 6: Incomplete thought check - prev text lacks punctuation and is short (< 8 words)
    tokens_a = stripped_a.split()
    if len(tokens_a) <= 6:
        # Short trailing segment without sentence-ending punctuation is likely an STT fragment
        return True

    # Conservative default: do not merge
    return False


def can_merge_segments(seg_a: TranscriptSegment, seg_b: TranscriptSegment) -> bool:
    """
    Verify whether seg_b can safely be merged into seg_a.

    Guarantees:
    - Speaker Boundary Rule: Different speakers NEVER merge.
    - Filtered Content Rule: Excluded content (include_in_meeting is False) NEVER merges into meeting content.
    - Empty or duplicate segments are not merged.
    """
    # 1. Speaker Boundary Rule
    if seg_a.speaker != seg_b.speaker:
        return False

    # 2. Filtered Content Rule: only segments included in the meeting may participate in merging
    if not seg_a.include_in_meeting or not seg_b.include_in_meeting:
        return False

    # 3. Duplicate segments from Part 3 should not be merged
    if seg_a.is_duplicate or seg_b.is_duplicate:
        return False

    text_a = seg_a.processed_text if seg_a.processed_text is not None else seg_a.text
    text_b = seg_b.processed_text if seg_b.processed_text is not None else seg_b.text

    if not text_a.strip() or not text_b.strip():
        return False

    return is_continuation_fragment(text_a, text_b)


def join_fragment_texts(text_a: str, text_b: str) -> str:
    """
    Join two fragment strings cleanly preserving exact words and spacing without alteration.
    """
    stripped_a = text_a.rstrip()
    stripped_b = text_b.lstrip()

    if not stripped_a:
        return stripped_b
    if not stripped_b:
        return stripped_a

    # If text_a ends with a hyphen, connect directly if part of a split word
    if stripped_a.endswith("-"):
        return f"{stripped_a}{stripped_b}"

    return f"{stripped_a} {stripped_b}"


def build_merged_segment(group: List[TranscriptSegment]) -> TranscriptSegment:
    """
    Combine a list of TranscriptSegment fragments into a single coherent TranscriptSegment unit.
    Preserves source sequences, combined metadata, and exact constituent wording.
    """
    if len(group) == 1:
        first = group[0]
        # Return segment with populated source_sequences and merged=False
        return TranscriptSegment(
            sequence=first.sequence,
            speaker=first.speaker,
            text=first.text,
            classification=first.classification,
            confidence=first.confidence,
            processed_text=first.processed_text,
            repetition_modified=first.repetition_modified,
            repetition_type=first.repetition_type,
            is_duplicate=first.is_duplicate,
            duplicate_of_sequence=first.duplicate_of_sequence,
            relevance=first.relevance,
            include_in_meeting=first.include_in_meeting,
            filter_confidence=first.filter_confidence,
            filter_reason=first.filter_reason,
            source_sequences=first.source_sequences if first.source_sequences else [first.sequence],
            merged=first.merged,
        )

    # Multi-fragment merge
    first = group[0]
    source_sequences = [s.sequence for s in group]

    # Join raw text and processed text
    combined_raw_text = group[0].text
    for s in group[1:]:
        combined_raw_text = join_fragment_texts(combined_raw_text, s.text)

    # Join processed text
    first_proc = first.processed_text if first.processed_text is not None else first.text
    combined_proc_text = first_proc
    for s in group[1:]:
        s_proc = s.processed_text if s.processed_text is not None else s.text
        combined_proc_text = join_fragment_texts(combined_proc_text, s_proc)

    # Combine classifications: CLEAN if any is CLEAN
    combined_classification = first.classification
    if any(s.classification == SegmentClassification.CLEAN for s in group):
        combined_classification = SegmentClassification.CLEAN

    # Confidence: max confidence
    confidences = [s.confidence for s in group if s.confidence is not None]
    combined_confidence = max(confidences) if confidences else None

    # Relevance: MEETING_CONTENT if any is MEETING_CONTENT
    combined_relevance = first.relevance
    if any(s.relevance == RelevanceCategory.MEETING_CONTENT for s in group):
        combined_relevance = RelevanceCategory.MEETING_CONTENT

    # Filter confidence: max
    filter_confs = [s.filter_confidence for s in group if s.filter_confidence is not None]
    combined_filter_confidence = max(filter_confs) if filter_confs else None

    # Repetition flags
    repetition_modified = any(s.repetition_modified for s in group)
    rep_types = [s.repetition_type for s in group if s.repetition_type and s.repetition_type != RepetitionType.NONE]
    combined_rep_type = rep_types[0] if rep_types else RepetitionType.NONE

    return TranscriptSegment(
        sequence=first.sequence,
        speaker=first.speaker,
        text=combined_raw_text,
        classification=combined_classification,
        confidence=combined_confidence,
        processed_text=combined_proc_text,
        repetition_modified=repetition_modified,
        repetition_type=combined_rep_type,
        is_duplicate=False,
        duplicate_of_sequence=None,
        relevance=combined_relevance,
        include_in_meeting=True,
        filter_confidence=combined_filter_confidence,
        filter_reason=f"Merged conversational unit from segments {', '.join(str(s) for s in source_sequences)}",
        source_sequences=source_sequences,
        merged=True,
    )


def merge_fragments(segments: List[TranscriptSegment]) -> List[TranscriptSegment]:
    """
    Process Part 4 filtered transcript segments to merge split sentence fragments belonging
    to the same speaker into coherent conversational units.

    Guarantees:
    - Never merges across different speakers (Speaker Boundary Rule).
    - Excluded segments (include_in_meeting is False) are not merged into meeting content.
    - Preserves source sequences in `source_sequences` list.
    - Preserves all metadata from previous pipeline stages.
    - Preserves verbatim constituent words without language alteration or translation.
    - Maintains original chronological transcript ordering.
    """
    if not segments:
        return []

    merged_segments: List[TranscriptSegment] = []
    current_group: List[TranscriptSegment] = []

    for seg in segments:
        if not current_group:
            current_group.append(seg)
            continue

        last_seg = current_group[-1]

        if can_merge_segments(last_seg, seg):
            current_group.append(seg)
        else:
            merged_segments.append(build_merged_segment(current_group))
            current_group = [seg]

    if current_group:
        merged_segments.append(build_merged_segment(current_group))

    logger.info(
        "Completed fragment merging: %d segments into %d units (%d merged)",
        len(segments),
        len(merged_segments),
        sum(1 for s in merged_segments if s.merged),
    )
    return merged_segments
