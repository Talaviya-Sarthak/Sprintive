"""Service implementation for Part 6 — STT Error Correction."""

import logging
import re
from typing import List, Optional
from app.core.config import settings
from app.models.transcript import (
    SegmentClassification,
    STTCorrectionLLMOutput,
    STTErrorType,
    TranscriptSegment,
)
from app.prompts.stt_correction import (
    SYSTEM_PROMPT,
    build_stt_correction_user_prompt,
)
from app.services.llm_client import (
    AllModelsExhaustedError,
    BaseLLMClient,
    MockLLMClient,
    OpenAICompatibleLLMClient,
    get_llm_client,
)

logger = logging.getLogger(__name__)


def is_candidate_stt_anomaly(text: str) -> bool:
    """
    Check if a text utterance contains candidate speech-to-text recognition anomalies
    such as phonetic distortion, garbled consonant runs, or unparsed audio artifacts.
    """
    if not text:
        return False
    lower = text.lower()
    # Explicit STT artifact markers
    if any(m in lower for m in ("[?]", "???", "[inaudible]", "[unclear]", "[crosstalk]")):
        return True
    # Long consonant cluster (5+ consonants) indicating transcription garble in English words
    words = re.findall(r"\b[a-z]+\b", lower)
    for w in words:
        if re.search(r"[bcdfghjklmnpqrstvwxyz]{5,}", w):
            return True
    return False


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
    circuit_open_for_run: bool = False

    for idx, segment in enumerate(segments):
        active_text = (
            segment.processed_text
            if segment.processed_text is not None
            else segment.text
        )

        # Optimization & Guard 1: Skip excluded segments or purely empty/whitespace utterances
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

        # Fast-Fail Guard: If circuit breaker tripped for all models in this run, bypass LLM immediately
        if circuit_open_for_run:
            segment_copy = segment.model_copy(
                update={
                    "stt_corrected_text": active_text,
                    "stt_modified": False,
                    "stt_confidence": segment.confidence or 1.0,
                    "stt_error_type": None,
                    "stt_reason": "LLM models quota-exhausted; preserved original text",
                }
            )
            corrected_segments.append(segment_copy)
            continue

        # Token Reduction Optimization 2: Clean segments with reasonable confidence don't need expensive LLM correction
        if (
            (segment.confidence is None or (segment.confidence or 0.0) >= 0.80)
            and len(active_text.split()) >= 2
        ):
            segment_copy = segment.model_copy(
                update={
                    "stt_corrected_text": active_text,
                    "stt_modified": False,
                    "stt_confidence": segment.confidence or 1.0,
                    "stt_error_type": None,
                    "stt_reason": "Confidence verified; preserved verbatim text without per-segment LLM latency",
                }
            )
            corrected_segments.append(segment_copy)
            continue

        # Fast path: For OpenAICompatibleLLMClient in production (Groq), skip LLM for clean segments without acoustic anomalies
        if isinstance(client, OpenAICompatibleLLMClient):
            is_clean = segment.classification in (SegmentClassification.CLEAN, None)
            conf = segment.confidence if segment.confidence is not None else 1.0
            if is_clean and conf >= 0.80 and not is_candidate_stt_anomaly(active_text):
                segment_copy = segment.model_copy(
                    update={
                        "stt_corrected_text": active_text,
                        "stt_modified": False,
                        "stt_confidence": conf,
                        "stt_error_type": None,
                        "stt_reason": "Clean segment without STT recognition anomalies",
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

        except AllModelsExhaustedError as exc:
            # Fast fail: All candidate models are rate-limited or unavailable
            logger.warning(
                "All LLM models exhausted during STT correction for segment %d: %s. Preserving original text and fast-failing remaining segments.",
                segment.sequence,
                exc,
            )
            circuit_open_for_run = True
            segment_copy = segment.model_copy(
                update={
                    "stt_corrected_text": active_text,
                    "stt_modified": False,
                    "stt_confidence": 1.0,
                    "stt_error_type": None,
                    "stt_reason": "LLM models quota-exhausted; preserved original text",
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
