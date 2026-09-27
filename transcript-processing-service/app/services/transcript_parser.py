import logging
from typing import List, Tuple
from app.models.transcript import ParsedTranscript, TranscriptSegment

logger = logging.getLogger(__name__)


def parse_transcript_line(line: str, line_number: int) -> Tuple[str, str, str | None]:
    """
    Parse a single transcript line into speaker and text components.

    Splits strictly on the first colon ':' to separate speaker and spoken dialogue.
    Preserves all colons inside the spoken text.

    Args:
        line: The raw transcript line.
        line_number: 1-indexed line number in the source transcript (for logging/warnings).

    Returns:
        A tuple of (speaker, text, warning_message_or_none).
    """
    if ":" not in line:
        warning = (
            f"Line {line_number} is malformed: missing ':' separator. "
            f"Preserved as speaker 'UNKNOWN'."
        )
        logger.warning(warning)
        return "UNKNOWN", line.strip(), warning

    raw_speaker, raw_text = line.split(":", 1)
    speaker = raw_speaker.strip()
    text = raw_text.strip()

    if not speaker:
        warning = (
            f"Line {line_number} is malformed: empty speaker name before ':'. "
            f"Preserved as speaker 'UNKNOWN'."
        )
        logger.warning(warning)
        return "UNKNOWN", text, warning

    return speaker, text, None


def parse_transcript(text: str, meeting_id: str = "") -> ParsedTranscript:
    """
    Parse raw transcript text into structured TranscriptSegment elements.

    Rules & Guarantees:
    - Splits on first colon ':' only.
    - Completely preserves spelling, grammar, punctuation, capitalization, language,
      repeated words, noise, and STT errors.
    - Full Unicode safe (supports Hindi, Spanish, Gujarati, Hinglish, etc.).
    - Consecutive segments from the same speaker are preserved as separate segments (not merged).
    - Empty or whitespace-only lines are ignored when generating segments.
    - Malformed lines without valid speaker separators are preserved as segments with
      speaker='UNKNOWN' and tracked in warnings (no data loss).
    - Sequential 1-indexed numbering.
    - Does NOT modify the raw input text.
    - NO cleaning, filtering, or LLM transformations applied in this phase.

    Args:
        text: Raw transcript text content.
        meeting_id: Meeting identifier string.

    Returns:
        ParsedTranscript containing structured segments and any parsing warnings.
    """
    segments: List[TranscriptSegment] = []
    warnings: List[str] = []

    if not text:
        return ParsedTranscript(meeting_id=meeting_id, segments=[], warnings=[])

    lines = text.splitlines()
    sequence = 1

    for line_idx, raw_line in enumerate(lines, start=1):
        # Ignore completely empty or whitespace-only lines
        if not raw_line.strip():
            continue

        speaker, dialogue_text, warning = parse_transcript_line(raw_line, line_idx)
        if warning:
            warnings.append(warning)

        segment = TranscriptSegment(
            sequence=sequence,
            speaker=speaker,
            text=dialogue_text,
        )
        segments.append(segment)
        sequence += 1

    logger.info(
        "Parsed transcript for meeting_id=%s: %d segments generated, %d warnings",
        meeting_id,
        len(segments),
        len(warnings),
    )

    return ParsedTranscript(
        meeting_id=meeting_id,
        segments=segments,
        warnings=warnings,
    )
