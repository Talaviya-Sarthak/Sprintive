"""Service implementation for Part 6 — STT Error Correction."""

import logging
from typing import List, Optional
from app.core.config import settings
from app.models.transcript import (
    STTCorrectionLLMOutput,
    STTErrorType,
    TranscriptSegment,
)
from app.prompts.stt_correction import (
    SYSTEM_PROMPT,
    build_stt_correction_user_prompt,
)
from app.services.llm_client import BaseLLMClient, get_llm_client

logger = logging.getLogger(__name__)


def correct_stt_segments(
    segments: List[TranscriptSegment],
    llm_client: Optional[BaseLLMClient] = None,
    confidence_threshold: Optional[float] = None,
    context_before_count: Optional[int] = None,
    context_after_count: Optional[int] = None,
) -> List[TranscriptSegment]:
    """
    Evaluate transcript segments for speech-to-text recognition errors and safely
    apply corrections only when confidence meets or exceeds the threshold.

    Guarantees:
    - Never modifies original `text` or `processed_text`.
    - Never changes `speaker`, `sequence`, or `source_sequences`.
    - When uncertain, preserves the original text (`stt_modified=False`).
    - Falls back gracefully on LLM timeout or communication errors without halting the pipeline.

    Args:
        segments: List of TranscriptSegment objects from Part 5.
        llm_client: LLM client implementation to use (defaults to get_llm_client()).
        confidence_threshold: Minimum confidence required to accept a correction (defaults to settings.STT_CONFIDENCE_THRESHOLD).
        context_before_count: Number of preceding segments to include in context window (defaults to settings.STT_CONTEXT_BEFORE).
        context_after_count: Number of subsequent segments to include in context window (defaults to settings.STT_CONTEXT_AFTER).

    Returns:
        List of TranscriptSegment objects decorated with Part 6 fields.
    """
    client = llm_client or get_llm_client()
    threshold = (
        confidence_threshold
        if confidence_threshold is not None
        else settings.STT_CONFIDENCE_THRESHOLD
    )
    ctx_before = (
        context_before_count
        if context_before_count is not None
        else settings.STT_CONTEXT_BEFORE
    )
    ctx_after = (
        context_after_count
        if context_after_count is not None
        else settings.STT_CONTEXT_AFTER
    )

    corrected_segments: List[TranscriptSegment] = []

    for idx, segment in enumerate(segments):
        active_text = (
            segment.processed_text
            if segment.processed_text is not None
            else segment.text
        )

        # Optimization & Guard: Skip excluded segments or purely empty/whitespace utterances
        if not segment.include_in_meeting or not active_text.strip():
            segment_copy = segment.model_copy(
                update={
                    "stt_corrected_text": active_text,
                    "stt_modified": False,
                    "stt_confidence": 1.0,
                    "stt_error_type": None,
                    "stt_reason": "Excluded from meeting or empty segment",
                }
            )
            corrected_segments.append(segment_copy)
            continue

        # Extract surrounding context window
        before_window = segments[max(0, idx - ctx_before) : idx]
        after_window = segments[idx + 1 : idx + 1 + ctx_after]

        user_prompt = build_stt_correction_user_prompt(
            current_segment=segment,
            context_before=before_window,
            context_after=after_window,
        )

        try:
            llm_result: STTCorrectionLLMOutput = client.generate_structured(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                response_model=STTCorrectionLLMOutput,
            )

            # Check conservative confidence policy
            if llm_result.modified and llm_result.confidence >= threshold:
                segment_copy = segment.model_copy(
                    update={
                        "stt_corrected_text": llm_result.corrected_text,
                        "stt_modified": True,
                        "stt_confidence": llm_result.confidence,
                        "stt_error_type": llm_result.error_type or STTErrorType.UNKNOWN,
                        "stt_reason": llm_result.reason
                        or "Likely STT recognition error",
                    }
                )
            else:
                # Original text preserved (either modified=False or confidence < threshold)
                if llm_result.modified and llm_result.confidence < threshold:
                    reason = (
                        f"Confidence {llm_result.confidence:.2f} below threshold {threshold:.2f}"
                        + (f": {llm_result.reason}" if llm_result.reason else "")
                    )
                else:
                    reason = llm_result.reason or "No STT error detected"

                segment_copy = segment.model_copy(
                    update={
                        "stt_corrected_text": active_text,
                        "stt_modified": False,
                        "stt_confidence": llm_result.confidence,
                        "stt_error_type": None,
                        "stt_reason": reason,
                    }
                )

        except Exception as exc:
            # Graceful degradation: log error and preserve original text
            logger.warning(
                "STT correction failed for segment sequence %d: %s. Preserving original text.",
                segment.sequence,
                exc,
            )
            segment_copy = segment.model_copy(
                update={
                    "stt_corrected_text": active_text,
                    "stt_modified": False,
                    "stt_confidence": 1.0,
                    "stt_error_type": None,
                    "stt_reason": f"Fallback due to LLM error: {str(exc)}",
                }
            )

        corrected_segments.append(segment_copy)

    return corrected_segments
