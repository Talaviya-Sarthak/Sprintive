"""Deterministic rules and heuristic checks for Part 10 — Speaker Attribution Validation."""

import re
from typing import List, Optional, Set, Tuple
from app.config.speaker import AFFIRMATIVE_RESPONSE_MARKERS, INTERROGATIVE_PHRASES
from app.models.speaker_validation import (
    SpeakerFlagType,
    SpeakerValidationResult,
    SpeakerValidationStatus,
)
from app.models.transcript import TranscriptSegment


def select_input_text(segment: TranscriptSegment) -> str:
    """
    Select the active text for speaker attribution validation using strict priority hierarchy:
    terminology_normalized_text -> grammar_corrected_text -> stt_corrected_text -> processed_text -> text.
    """
    if segment.terminology_normalized_text is not None and segment.terminology_normalized_text.strip():
        return segment.terminology_normalized_text
    if segment.grammar_corrected_text is not None and segment.grammar_corrected_text.strip():
        return segment.grammar_corrected_text
    if segment.stt_corrected_text is not None and segment.stt_corrected_text.strip():
        return segment.stt_corrected_text
    if segment.processed_text is not None and segment.processed_text.strip():
        return segment.processed_text
    return segment.text or ""


def detect_possible_fragment_continuation(
    current_segment: TranscriptSegment,
    previous_segment: Optional[TranscriptSegment],
) -> Optional[SpeakerValidationResult]:
    """
    Detect if the current segment appears to syntactically complete the unfinished
    thought/sentence of a previous speaker (e.g. 'We need to investigate the database'
    followed by another speaker saying 'connection issue first.').
    """
    if not previous_segment or previous_segment.speaker == current_segment.speaker:
        return None

    if not previous_segment.include_in_meeting or not current_segment.include_in_meeting:
        return None

    prev_text = select_input_text(previous_segment).strip()
    curr_text = select_input_text(current_segment).strip()

    if not prev_text or not curr_text:
        return None

    # Check if previous segment lacks terminal punctuation (., ?, !, ...)
    prev_ends_without_terminal = not prev_text.endswith((".", "?", "!", "...", "।"))

    # Check if current segment starts with a lowercase letter or is a continuation fragment
    first_char = curr_text[0] if curr_text else ""
    starts_lowercase = first_char.islower()

    # Check if current segment looks like a continuation fragment (e.g. starts with noun/adj completion, conjunction, or lowercase)
    continuation_starters = [
        "issue",
        "connection",
        "first",
        "and",
        "but",
        "or",
        "because",
        "to",
        "for",
        "with",
        "that",
        "which",
    ]
    starts_continuation_word = any(
        curr_text.lower().startswith(word + " ") or curr_text.lower() == word
        for word in continuation_starters
    )

    if prev_ends_without_terminal and (starts_lowercase or starts_continuation_word):
        return SpeakerValidationResult(
            status=SpeakerValidationStatus.POSSIBLE_MISATTRIBUTION,
            confidence=0.86,
            flags=[SpeakerFlagType.POSSIBLE_FRAGMENT_MISATTRIBUTION],
            suggested_speaker=previous_segment.speaker,
            reason=(
                f"The segment appears syntactically connected to {previous_segment.speaker}'s "
                f"unfinished sentence ('{prev_text}'), suggesting a possible fragment continuation mismatch."
            ),
        )

    return None


def detect_direct_response(
    current_segment: TranscriptSegment,
    previous_segment: Optional[TranscriptSegment],
) -> Optional[SpeakerValidationResult]:
    """
    Detect if the current segment is an expected, direct response to a question
    asked by the previous speaker, either addressed explicitly by name or to the group.
    """
    if not previous_segment or previous_segment.speaker == current_segment.speaker:
        return None

    prev_text = select_input_text(previous_segment).strip()
    curr_text = select_input_text(current_segment).strip()
    if not prev_text or not curr_text:
        return None

    prev_lower = prev_text.lower()
    curr_lower = curr_text.lower()

    is_question = prev_text.endswith("?") or any(
        q in prev_lower for q in INTERROGATIVE_PHRASES
    )

    # Check if previous speaker explicitly addressed current speaker by name
    current_first_name = (
        current_segment.speaker.split()[0].lower()
        if current_segment.speaker and current_segment.speaker != "UNKNOWN"
        else ""
    )
    is_addressed_by_name = (
        bool(current_first_name)
        and re.search(r"\b" + re.escape(current_first_name) + r"\b", prev_lower) is not None
    )

    # Check if current utterance starts with an affirmative or direct response marker
    first_word = curr_lower.split()[0].strip(".,?!:;") if curr_lower.split() else ""
    starts_with_affirmative = first_word in AFFIRMATIVE_RESPONSE_MARKERS

    if is_addressed_by_name and is_question:
        return SpeakerValidationResult(
            status=SpeakerValidationStatus.VALID,
            confidence=0.98,
            flags=[],
            suggested_speaker=None,
            reason=(
                f"The statement is a direct response to a question explicitly addressed "
                f"to {current_segment.speaker} by {previous_segment.speaker}."
            ),
        )

    is_who_question = prev_lower.startswith("who ") or prev_lower.startswith("who's ")

    if is_question and not is_who_question and (starts_with_affirmative or "blocker" in curr_lower or "issue" in curr_lower):
        return SpeakerValidationResult(
            status=SpeakerValidationStatus.VALID,
            confidence=0.96,
            flags=[],
            suggested_speaker=None,
            reason=(
                f"The statement is a plausible and natural response to {previous_segment.speaker}'s question."
            ),
        )

    return None


def is_natural_turn_taking(
    current_segment: TranscriptSegment,
    previous_segment: Optional[TranscriptSegment],
) -> Optional[SpeakerValidationResult]:
    """
    Check if the speaker transition represents standard, normal turn-taking in a meeting
    (e.g., introducing a new topic, sharing an update, or participating in standup).
    """
    if not previous_segment:
        # First utterance of meeting is valid
        return SpeakerValidationResult(
            status=SpeakerValidationStatus.VALID,
            confidence=0.95,
            flags=[],
            suggested_speaker=None,
            reason="Initial speaker of the conversation.",
        )

    prev_text = select_input_text(previous_segment).strip()
    curr_text = select_input_text(current_segment).strip()

    # If current segment starts cleanly with capitalized word or punctuation
    if curr_text and (curr_text[0].isupper() or curr_text[0] in ("¿", "¡")):
        return SpeakerValidationResult(
            status=SpeakerValidationStatus.VALID,
            confidence=0.92,
            flags=[],
            suggested_speaker=None,
            reason="Standard, natural turn-taking transition between speakers.",
        )

    return None
