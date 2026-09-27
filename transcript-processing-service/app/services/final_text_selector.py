"""Final text and speaker selection service for Part 13: Final Transcript Formatting.

Selects the safest, highest-priority text and authoritative speaker for each segment
strictly adhering to the validation metadata from Parts 1-12.
"""

from typing import List, Optional, Tuple

from app.config.formatting import FormattingConfig
from app.models.final_transcript import FinalizationWarning
from app.models.language_validation import LanguagePreservationStatus
from app.models.semantic_validation import SemanticFlagType, SemanticValidationStatus
from app.models.transcript import TranscriptSegment


# Critical semantic flags that unconditionally warrant falling back if processed text diverges
CRITICAL_SEMANTIC_FLAGS = {
    "NEGATION_CHANGED",
    "QUANTITY_CHANGED",
    "NUMBER_CHANGED",
    "DATE_CHANGED",
    "TIME_CHANGED",
    "DEADLINE_CHANGED",
    "PERSON_REFERENCE_CHANGED",
    "TECHNICAL_ENTITY_CHANGED",
    "ACTION_CHANGED",
    "COMMITMENT_CHANGED",
    "CAUSALITY_CHANGED",
}


def select_final_text(
    segment: TranscriptSegment,
    config: Optional[FormattingConfig] = None,
) -> Tuple[str, List[FinalizationWarning]]:
    """
    Select the final validated text for a transcript segment using deterministic policy.

    Hierarchy:
        1. terminology_normalized_text
        2. grammar_corrected_text
        3. stt_corrected_text
        4. processed_text
        5. text (verbatim baseline)

    Safety & Validation Rules:
        - If semantic_status is SEMANTICALLY_CHANGED, unsafe processed candidates are rejected,
          falling back to safe baseline original text with a warning.
        - If language_preservation_status is LANGUAGE_CHANGED, translated/modified candidates are rejected,
          falling back to safe baseline original text with a warning.
        - If no modified candidate is available or valid, falls back to verbatim text.
    """
    if config is None:
        config = FormattingConfig()

    warnings: List[FinalizationWarning] = []

    # 1. Check for unsafe semantic changes
    has_semantic_change = (
        segment.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        or segment.semantic_status == "SEMANTICALLY_CHANGED"
    )
    has_critical_flag = any(
        flag in CRITICAL_SEMANTIC_FLAGS or flag == SemanticFlagType.NEGATION_CHANGED
        for flag in (segment.semantic_flags or [])
    )
    is_possible_semantic_change = (
        segment.semantic_status == SemanticValidationStatus.POSSIBLE_SEMANTIC_CHANGE
        or segment.semantic_status == "POSSIBLE_SEMANTIC_CHANGE"
    )

    # 2. Check for unsafe language changes (e.g. unexpected translation)
    has_language_change = (
        segment.language_preservation_status == LanguagePreservationStatus.LANGUAGE_CHANGED
        or segment.language_preservation_status == "LANGUAGE_CHANGED"
    )
    is_possible_language_change = (
        segment.language_preservation_status == LanguagePreservationStatus.POSSIBLE_LANGUAGE_CHANGE
        or segment.language_preservation_status == "POSSIBLE_LANGUAGE_CHANGE"
    )

    # Record informational/review warnings for POSSIBLE changes
    if is_possible_semantic_change and not has_semantic_change:
        flag_str = ", ".join(segment.semantic_flags) if segment.semantic_flags else "modality/certainty shift"
        warnings.append(
            FinalizationWarning(
                sequence=segment.sequence,
                type="POSSIBLE_SEMANTIC_CHANGE",
                message=f"Segment has possible semantic alteration ({flag_str}).",
            )
        )
    if is_possible_language_change and not has_language_change:
        flag_str = ", ".join(segment.language_flags) if segment.language_flags else "code-switching change"
        warnings.append(
            FinalizationWarning(
                sequence=segment.sequence,
                type="POSSIBLE_LANGUAGE_CHANGE",
                message=f"Segment has possible language alteration ({flag_str}).",
            )
        )

    # If semantic change occurred and fallback policy is active, fall back to original text
    if config.fallback_on_semantic_change and (has_semantic_change or has_critical_flag):
        flag_str = ", ".join(segment.semantic_flags) if segment.semantic_flags else "meaning contradiction"
        warnings.append(
            FinalizationWarning(
                sequence=segment.sequence,
                type="SEMANTIC_CHANGE_FALLBACK",
                message=f"Processed text changed meaning ({flag_str}); falling back to safe original text.",
            )
        )
        return (segment.text.strip(), warnings)

    # If language change occurred and fallback policy is active, fall back to original text
    if config.fallback_on_language_change and has_language_change:
        flag_str = ", ".join(segment.language_flags) if segment.language_flags else "unexpected translation"
        warnings.append(
            FinalizationWarning(
                sequence=segment.sequence,
                type="LANGUAGE_CHANGE_FALLBACK",
                message=f"Processed text altered language or translated content ({flag_str}); falling back to safe original text.",
            )
        )
        return (segment.text.strip(), warnings)

    # 3. Deterministic candidate hierarchy
    # Candidates in priority order:
    candidates = []

    # Priority 1: Terminology Normalized Text
    if segment.terminology_modified and segment.terminology_normalized_text:
        candidates.append(segment.terminology_normalized_text)
    elif segment.terminology_normalized_text and segment.terminology_normalized_text.strip():
        candidates.append(segment.terminology_normalized_text)

    # Priority 2: Grammar Corrected Text
    if segment.grammar_modified and segment.grammar_corrected_text:
        candidates.append(segment.grammar_corrected_text)
    elif segment.grammar_corrected_text and segment.grammar_corrected_text.strip():
        candidates.append(segment.grammar_corrected_text)

    # Priority 3: STT Corrected Text
    if segment.stt_modified and segment.stt_corrected_text:
        candidates.append(segment.stt_corrected_text)
    elif segment.stt_corrected_text and segment.stt_corrected_text.strip():
        candidates.append(segment.stt_corrected_text)

    # Priority 4: Processed Text (Repetition Removal)
    if segment.repetition_modified and segment.processed_text is not None:
        candidates.append(segment.processed_text)
    elif segment.processed_text is not None and segment.processed_text.strip():
        candidates.append(segment.processed_text)

    # Priority 5: Original text
    candidates.append(segment.text)

    # Select the first non-empty candidate
    for cand in candidates:
        if cand is not None and cand.strip():
            return (cand.strip(), warnings)

    # Default fallback
    return (segment.text.strip(), warnings)


def get_final_text(segment: TranscriptSegment) -> str:
    """Convenience helper to retrieve final text with default configuration."""
    text, _ = select_final_text(segment, config=FormattingConfig())
    return text


def select_final_speaker(segment: TranscriptSegment) -> str:
    """
    Select authoritative speaker identity for the final transcript.

    Priority:
        1. Authoritative validated_speaker (if present and non-empty)
        2. Authoritative speaker_correction dictionary
        3. Original speaker

    CRITICAL RULE:
        A mere suggested_speaker from Part 10 is NOT sufficient to replace the speaker.
        Never use suggested_speaker automatically.
    """
    # 1. Authoritative validated_speaker field
    if segment.validated_speaker and segment.validated_speaker.strip():
        return segment.validated_speaker.strip()

    # 2. Authoritative speaker_correction dict
    if segment.speaker_correction and isinstance(segment.speaker_correction, dict):
        is_authoritative = segment.speaker_correction.get("authoritative", False)
        new_speaker = (
            segment.speaker_correction.get("validated_speaker")
            or segment.speaker_correction.get("corrected_speaker")
            or segment.speaker_correction.get("speaker")
        )
        if is_authoritative and new_speaker and str(new_speaker).strip():
            return str(new_speaker).strip()

    # 3. Retain original speaker
    if segment.speaker and segment.speaker.strip():
        return segment.speaker.strip()

    return "UNKNOWN"
