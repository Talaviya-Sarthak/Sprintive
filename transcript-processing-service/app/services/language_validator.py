"""Language preservation validation service for Part 11."""

import logging
from collections import Counter
from typing import List, Optional, Tuple
from app.config.language import (
    LANG_EN,
    LANG_UNKNOWN,
    LANGUAGE_CONFIDENCE_REVIEW,
    LANGUAGE_CONFIDENCE_STRONG,
)
from app.config.terminology import TECHNICAL_TERMS
from app.core.config import settings
from app.models.language_validation import (
    LanguageFlagType,
    LanguagePreservationStatus,
    LanguageValidationResult,
    SegmentLanguageProfile,
    TranscriptLanguageProfile,
)
from app.models.transcript import TranscriptSegment
from app.prompts.language_validation import (
    LANGUAGE_VALIDATION_SYSTEM_PROMPT,
    build_language_validation_user_prompt,
)
from app.services.language_detector import detect_segment_language
from app.services.language_rules import (
    check_deterministic_language_preservation,
    select_input_text,
)
from app.services.llm_client import BaseLLMClient, get_llm_client

logger = logging.getLogger(__name__)


def calculate_transcript_language_profile(
    segments: List[TranscriptSegment],
) -> TranscriptLanguageProfile:
    """
    Calculate an aggregate language profile across all validated transcript segments.
    """
    if not segments:
        return TranscriptLanguageProfile(
            primary_language=LANG_EN,
            languages_detected=[],
            mixed_language_segments=0,
            language_change_flags=0,
        )

    all_detected_languages: set = set()
    primary_lang_counter: Counter = Counter()
    mixed_segments_count = 0
    flagged_segments_count = 0

    for seg in segments:
        if seg.original_languages:
            all_detected_languages.update(seg.original_languages)
        if seg.processed_languages:
            all_detected_languages.update(seg.processed_languages)

        primary = seg.processed_primary_language or seg.original_primary_language
        if primary and primary != LANG_UNKNOWN:
            primary_lang_counter[primary] += 1

        if seg.original_mixed_language or seg.processed_mixed_language:
            mixed_segments_count += 1

        if (
            seg.language_preservation_status in (
                LanguagePreservationStatus.LANGUAGE_CHANGED,
                LanguagePreservationStatus.POSSIBLE_LANGUAGE_CHANGE,
            )
            or (seg.language_flags and len(seg.language_flags) > 0)
        ):
            flagged_segments_count += 1

    primary_language = (
        primary_lang_counter.most_common(1)[0][0]
        if primary_lang_counter
        else LANG_EN
    )

    return TranscriptLanguageProfile(
        primary_language=primary_language,
        languages_detected=sorted(list(all_detected_languages)),
        mixed_language_segments=mixed_segments_count,
        language_change_flags=flagged_segments_count,
    )


def validate_language_preservation(
    segments: List[TranscriptSegment],
    llm_client: Optional[BaseLLMClient] = None,
) -> Tuple[List[TranscriptSegment], TranscriptLanguageProfile]:
    """
    Validate language preservation across transcript segments.

    Guarantees:
    - NEVER translates transcript text or converts multilingual content to English.
    - NEVER modifies or rewrites verbatim original text or speaker labels.
    - Preserves all 5 levels of text traceability and previous metadata from Parts 1-10.
    - Distinguishes technical terminology from language replacement.
    - Falls back safely to INSUFFICIENT_CONTEXT on LLM errors without failing the pipeline.
    - Computes an aggregate transcript-level language profile.

    Args:
        segments: List of TranscriptSegment objects output by Part 10.
        llm_client: Optional LLM client (defaults to configured client).

    Returns:
        Tuple of (decorated TranscriptSegment list, TranscriptLanguageProfile).
    """
    if not segments:
        return [], TranscriptLanguageProfile(
            primary_language=LANG_EN,
            languages_detected=[],
            mixed_language_segments=0,
            language_change_flags=0,
        )

    client = llm_client or get_llm_client()
    validated_segments: List[TranscriptSegment] = []

    for seg in segments:
        # Fast path for excluded segments
        if not seg.include_in_meeting:
            seg_dict = seg.model_dump()
            orig_text = seg.text or ""
            proc_text = select_input_text(seg)
            orig_prof = detect_segment_language(orig_text)
            proc_prof = detect_segment_language(proc_text)

            seg_dict.update({
                "language_preservation_status": LanguagePreservationStatus.PRESERVED,
                "language_confidence": 0.98,
                "language_flags": [],
                "original_languages": orig_prof.languages_detected,
                "processed_languages": proc_prof.languages_detected,
                "original_primary_language": orig_prof.primary_language,
                "processed_primary_language": proc_prof.primary_language,
                "original_mixed_language": orig_prof.is_mixed_language,
                "processed_mixed_language": proc_prof.is_mixed_language,
                "language_validation_reason": "Segment excluded from meeting; language preservation automatically marked PRESERVED.",
            })
            validated_segments.append(TranscriptSegment(**seg_dict))
            continue

        orig_text = seg.text or ""
        proc_text = select_input_text(seg)

        orig_prof = detect_segment_language(orig_text)
        proc_prof = detect_segment_language(proc_text)

        # Layer 1: Deterministic evaluation
        rule_result = check_deterministic_language_preservation(
            orig_text=orig_text,
            proc_text=proc_text,
            orig_profile=orig_prof,
            proc_profile=proc_prof,
        )

        final_result: LanguageValidationResult

        if rule_result is not None:
            final_result = rule_result
        else:
            # Layer 2: LLM Validation for ambiguous or code-switching cases
            try:
                user_prompt = build_language_validation_user_prompt(
                    segment=seg,
                    original_text=orig_text,
                    processed_text=proc_text,
                    orig_profile=orig_prof,
                    proc_profile=proc_prof,
                    known_tech_terms=TECHNICAL_TERMS,
                )
                final_result = client.generate_structured(
                    system_prompt=LANGUAGE_VALIDATION_SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                    response_model=LanguageValidationResult,
                )
            except Exception as e:
                logger.warning(
                    f"LLM language validation failed for sequence {seg.sequence}: {e}. "
                    "Falling back safely to INSUFFICIENT_CONTEXT."
                )
                final_result = LanguageValidationResult(
                    status=LanguagePreservationStatus.INSUFFICIENT_CONTEXT,
                    confidence=0.5,
                    flags=[],
                    original_languages=orig_prof.languages_detected,
                    processed_languages=proc_prof.languages_detected,
                    original_primary_language=orig_prof.primary_language,
                    processed_primary_language=proc_prof.primary_language,
                    is_original_mixed_language=orig_prof.is_mixed_language,
                    is_processed_mixed_language=proc_prof.is_mixed_language,
                    reason=f"LLM language validation unavailable ({type(e).__name__}); preserved original content.",
                )

        # Invariant checks: Original speaker and original text must NEVER change
        seg_dict = seg.model_dump()
        seg_dict.update({
            "language_preservation_status": final_result.status,
            "language_confidence": final_result.confidence,
            "language_flags": final_result.flags,
            "original_languages": final_result.original_languages,
            "processed_languages": final_result.processed_languages,
            "original_primary_language": final_result.original_primary_language,
            "processed_primary_language": final_result.processed_primary_language,
            "original_mixed_language": final_result.is_original_mixed_language,
            "processed_mixed_language": final_result.is_processed_mixed_language,
            "language_validation_reason": final_result.reason,
        })

        # Ensure verbatim text and speaker invariants
        seg_dict["text"] = seg.text
        seg_dict["speaker"] = seg.speaker

        validated_segments.append(TranscriptSegment(**seg_dict))

    transcript_profile = calculate_transcript_language_profile(validated_segments)
    return validated_segments, transcript_profile
