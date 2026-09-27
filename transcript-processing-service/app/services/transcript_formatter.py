"""Transcript formatter service for Part 13: Final Transcript Formatting.

Converts validated internal transcript segments into a clean, deterministic, AI-ready
representation and UTF-8 serialized conversation.
"""

import logging
from typing import List, Optional

from app.config.formatting import FormattingConfig
from app.models.final_transcript import (
    FinalSegment,
    FinalizationResult,
    FinalizationStatus,
    FinalizationWarning,
)
from app.models.transcript import TranscriptSegment
from app.services.final_text_selector import select_final_speaker, select_final_text
from app.services.final_validator import validate_final_structure

logger = logging.getLogger(__name__)


def format_final_transcript(
    segments: List[TranscriptSegment],
    config: Optional[FormattingConfig] = None,
    meeting_id: Optional[str] = None,
) -> FinalizationResult:
    """
    Format and serialize validated transcript segments into a clean, deterministic AI-ready transcript.

    Strict Invariants:
        - NEVER uses an LLM.
        - NEVER rewrites, translates, summarizes, or invents content.
        - Preserves chronological conversation ordering.
        - Excludes internal pipeline metadata from final presentation.
        - Deterministically selects the safest validated text and authoritative speaker.
        - UTF-8 encoding compliance for multilingual content.
    """
    if config is None:
        config = FormattingConfig()

    accumulated_warnings: List[FinalizationWarning] = []

    # 1. Filter segments based on include_in_meeting
    included_raw: List[TranscriptSegment] = []
    excluded_count = 0

    for seg in segments:
        if config.exclude_filtered_segments and seg.include_in_meeting is False:
            excluded_count += 1
        else:
            included_raw.append(seg)

    included_count = len(included_raw)

    # If no segments remain after filtering, return empty READY result
    if not included_raw:
        return FinalizationResult(
            status=FinalizationStatus.READY,
            transcript_text="",
            segments=[],
            warnings=[],
            included_segments=0,
            excluded_segments=excluded_count,
        )

    # 2. Chronological sorting using sequence or min(source_sequences) for merged units
    def get_sort_key(s: TranscriptSegment):
        if s.source_sequences and len(s.source_sequences) > 0:
            return min(s.source_sequences)
        return s.sequence

    sorted_raw = sorted(included_raw, key=get_sort_key)

    # 3. Text and Speaker Selection
    intermediate_segments: List[FinalSegment] = []
    for seg in sorted_raw:
        final_text, seg_warnings = select_final_text(seg, config=config)
        accumulated_warnings.extend(seg_warnings)
        final_speaker = select_final_speaker(seg)

        # Do not include purely empty dialogue text
        if not final_text:
            accumulated_warnings.append(
                FinalizationWarning(
                    sequence=seg.sequence,
                    type="EMPTY_SEGMENT_SKIPPED",
                    message=f"Segment {seg.sequence} dialogue text was empty and omitted from final output.",
                )
            )
            continue

        intermediate_segments.append(
            FinalSegment(
                sequence=seg.sequence,
                speaker=final_speaker,
                text=final_text,
                source_sequences=seg.source_sequences if seg.source_sequences else None,
            )
        )

    # 4. Handle consecutive same-speaker turns if enabled
    final_segments: List[FinalSegment] = []
    if config.combine_consecutive_speaker_turns and len(intermediate_segments) > 1:
        current_seg = intermediate_segments[0]
        for next_seg in intermediate_segments[1:]:
            if next_seg.speaker.lower() == current_seg.speaker.lower():
                # Merge into single turn
                combined_text = current_seg.text.strip()
                add_text = next_seg.text.strip()
                if not combined_text.endswith((".", "!", "?", "।", ":")):
                    combined_text += "."
                combined_text += f" {add_text}"

                # Combine source sequences if present
                combined_src = []
                if current_seg.source_sequences:
                    combined_src.extend(current_seg.source_sequences)
                else:
                    combined_src.append(current_seg.sequence)

                if next_seg.source_sequences:
                    combined_src.extend(next_seg.source_sequences)
                else:
                    combined_src.append(next_seg.sequence)

                current_seg = FinalSegment(
                    sequence=current_seg.sequence,
                    speaker=current_seg.speaker,
                    text=combined_text,
                    source_sequences=combined_src,
                )
            else:
                final_segments.append(current_seg)
                current_seg = next_seg
        final_segments.append(current_seg)
    else:
        final_segments = intermediate_segments

    # 5. Build Final Transcript Text String
    turn_strings: List[str] = []
    for seg in final_segments:
        prefix = ""
        if config.include_sequence_numbers:
            prefix += f"[{seg.sequence}] "
        if config.include_timestamps and seg.timestamp:
            prefix += f"[{seg.timestamp}] "

        turn_strings.append(f"{prefix}{seg.speaker}{config.speaker_separator}{seg.text}")

    transcript_text = config.segment_separator.join(turn_strings)
    if config.include_header:
        transcript_text = config.header_text + transcript_text

    # 6. Structural Integrity & Validation Gate
    status, final_warnings = validate_final_structure(
        raw_segments=sorted_raw,
        final_segments=final_segments,
        accumulated_warnings=accumulated_warnings,
        config=config,
    )

    return FinalizationResult(
        status=status,
        transcript_text=transcript_text,
        segments=final_segments,
        warnings=final_warnings,
        included_segments=len(final_segments),
        excluded_segments=excluded_count,
    )


def save_cleaned_conversation_txt(transcript_text: str, file_path: str = "cleaned_conversation.txt") -> None:
    """Save transcript text to a UTF-8 encoded text file."""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(transcript_text)
