"""Final validation service for Part 13: Final Transcript Formatting.

Validates the structural integrity, chronological ordering, absence of duplicate/empty segments,
and assigns the finalization status (READY, READY_WITH_WARNINGS, BLOCKED).
"""

from typing import List, Tuple

from app.config.formatting import FormattingConfig
from app.models.final_transcript import FinalSegment, FinalizationStatus, FinalizationWarning
from app.models.semantic_validation import SemanticValidationStatus
from app.models.transcript import TranscriptSegment


def validate_final_structure(
    raw_segments: List[TranscriptSegment],
    final_segments: List[FinalSegment],
    accumulated_warnings: List[FinalizationWarning],
    config: FormattingConfig,
) -> Tuple[FinalizationStatus, List[FinalizationWarning]]:
    """
    Validate the formatted segments and assign the overall FinalizationStatus.

    Checks:
        1. Non-empty speaker for every segment.
        2. Non-empty text for every segment.
        3. Monotonic chronological sequence ordering.
        4. No accidental duplicate sequence IDs or exact adjacent duplicate content.
        5. Critical semantic contradictions if blocking policy is enabled.
    """
    warnings: List[FinalizationWarning] = list(accumulated_warnings)
    is_blocked = False

    # 1. Check for empty speaker & empty text
    for seg in final_segments:
        if not seg.speaker or not seg.speaker.strip() or seg.speaker == "UNKNOWN":
            warnings.append(
                FinalizationWarning(
                    sequence=seg.sequence,
                    type="UNKNOWN_SPEAKER",
                    message=f"Segment {seg.sequence} has an unknown or empty speaker.",
                )
            )
        if not seg.text or not seg.text.strip():
            warnings.append(
                FinalizationWarning(
                    sequence=seg.sequence,
                    type="EMPTY_TEXT",
                    message=f"Segment {seg.sequence} has empty dialogue text.",
                )
            )

    # 2. Check chronological sequence ordering
    sequences = [seg.sequence for seg in final_segments]
    for i in range(1, len(sequences)):
        if sequences[i] < sequences[i - 1]:
            warnings.append(
                FinalizationWarning(
                    sequence=sequences[i],
                    type="OUT_OF_ORDER_SEQUENCE",
                    message=f"Segment sequence {sequences[i]} appears after {sequences[i - 1]}; chronological ordering violated.",
                )
            )
            is_blocked = True

    # 3. Check for duplicate sequence numbers
    seen_sequences = set()
    for seq in sequences:
        if seq in seen_sequences:
            warnings.append(
                FinalizationWarning(
                    sequence=seq,
                    type="DUPLICATE_SEQUENCE",
                    message=f"Duplicate segment sequence {seq} detected in final transcript.",
                )
            )
            is_blocked = True
        seen_sequences.add(seq)

    # 4. Check for exact adjacent duplicate segments (same speaker and exact same text)
    for i in range(1, len(final_segments)):
        prev = final_segments[i - 1]
        curr = final_segments[i]
        if prev.speaker.lower() == curr.speaker.lower() and prev.text.strip().lower() == curr.text.strip().lower():
            warnings.append(
                FinalizationWarning(
                    sequence=curr.sequence,
                    type="DUPLICATE_SEGMENT",
                    message=f"Consecutive identical duplicate segment detected from {curr.speaker} at sequence {curr.sequence}.",
                )
            )

    # 5. Check blocking policy on critical semantic contradictions
    if config.block_on_critical_semantic_change:
        for raw in raw_segments:
            if (
                raw.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
                or raw.semantic_status == "SEMANTICALLY_CHANGED"
            ):
                # If fallback was NOT enabled, the risky text was used; block finalization!
                if not config.fallback_on_semantic_change:
                    warnings.append(
                        FinalizationWarning(
                            sequence=raw.sequence,
                            type="CRITICAL_SEMANTIC_CHANGE_BLOCKED",
                            message=f"Segment {raw.sequence} has an unresolved critical semantic contradiction without safe fallback.",
                        )
                    )
                    is_blocked = True

    # Assign status
    if is_blocked:
        status = FinalizationStatus.BLOCKED
    elif len(warnings) > 0:
        status = FinalizationStatus.READY_WITH_WARNINGS
    else:
        status = FinalizationStatus.READY

    return status, warnings
