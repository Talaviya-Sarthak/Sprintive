"""Service implementation for Part 7 — Grammar & Punctuation Normalization."""

import logging
from typing import List, Optional
from app.core.config import settings
from app.models.transcript import (
    GrammarNormalizationLLMOutput,
    SegmentClassification,
    TranscriptSegment,
)
from app.prompts.grammar_normalization import (
    GRAMMAR_SYSTEM_PROMPT,
    build_grammar_normalization_user_prompt,
)
from app.services.llm_client import BaseLLMClient, get_llm_client

logger = logging.getLogger(__name__)


def select_input_text(segment: TranscriptSegment) -> str:
    """
    Select the highest-priority valid transcript text for grammar normalization:
    stt_corrected_text -> processed_text -> text.

    Args:
        segment: The transcript segment being processed.

    Returns:
        The highest priority text string.
    """
    if segment.stt_corrected_text is not None and segment.stt_corrected_text.strip():
        return segment.stt_corrected_text
    if segment.processed_text is not None and segment.processed_text.strip():
        return segment.processed_text
    return segment.text


def normalize_grammar_and_punctuation(
    segments: List[TranscriptSegment],
    llm_client: Optional[BaseLLMClient] = None,
    confidence_threshold: Optional[float] = None,
    context_before_count: Optional[int] = None,
    context_after_count: Optional[int] = None,
) -> List[TranscriptSegment]:
    """
    Normalize grammar and punctuation across transcript segments using LLM context analysis.

    Guarantees:
    - Never modifies original `text`, `processed_text`, or `stt_corrected_text`.
    - Never modifies `speaker`, `sequence`, or `source_sequences`.
    - Preserves natural conversational tone without artificial formalization.
    - Preserves multilingual dialogue without translation.
    - When ambiguous or confidence is below threshold, preserves input text (`grammar_modified=False`).
    - Degrades gracefully on LLM error/timeout without failing the transcript pipeline.

    Args:
        segments: List of TranscriptSegment objects from Part 6.
        llm_client: LLM client implementation to use (defaults to get_llm_client()).
        confidence_threshold: Minimum confidence required (defaults to settings.GRAMMAR_CONFIDENCE_THRESHOLD).
        context_before_count: Preceding context window size (defaults to settings.GRAMMAR_CONTEXT_BEFORE).
        context_after_count: Subsequent context window size (defaults to settings.GRAMMAR_CONTEXT_AFTER).

    Returns:
        List of TranscriptSegment objects decorated with Part 7 fields.
    """
    client = llm_client or get_llm_client()
    threshold = (
        confidence_threshold
        if confidence_threshold is not None
        else settings.GRAMMAR_CONFIDENCE_THRESHOLD
    )
    ctx_before = (
        context_before_count
        if context_before_count is not None
        else settings.GRAMMAR_CONTEXT_BEFORE
    )
    ctx_after = (
        context_after_count
        if context_after_count is not None
        else settings.GRAMMAR_CONTEXT_AFTER
    )

    normalized_segments: List[TranscriptSegment] = []

    for idx, segment in enumerate(segments):
        active_text = select_input_text(segment)

        # Optimization & Guard: Skip excluded segments or purely empty/whitespace utterances
        if not segment.include_in_meeting or not active_text.strip():
            segment_copy = segment.model_copy(
                update={
                    "grammar_corrected_text": active_text,
                    "grammar_modified": False,
                    "grammar_confidence": 1.0,
                    "grammar_changes": [],
                    "grammar_reason": "Excluded from meeting or empty segment",
                }
            )
            normalized_segments.append(segment_copy)
            continue

        # Optimization & Guard 2: Clean segments with natural conversational syntax bypass LLM
        if (
            segment.classification == SegmentClassification.CLEAN
            and (segment.confidence or 0.0) >= 0.95
            and not segment.stt_modified
        ):
            segment_copy = segment.model_copy(
                update={
                    "grammar_corrected_text": active_text,
                    "grammar_modified": False,
                    "grammar_confidence": 0.98,
                    "grammar_changes": [],
                    "grammar_reason": "Clean segment with natural syntax; preserved input text",
                }
            )
            normalized_segments.append(segment_copy)
            continue

        # Extract surrounding context window
        before_window = segments[max(0, idx - ctx_before) : idx]
        after_window = segments[idx + 1 : idx + 1 + ctx_after]

        user_prompt = build_grammar_normalization_user_prompt(
            current_segment=segment,
            context_before=before_window,
            context_after=after_window,
            active_text=active_text,
        )

        try:
            llm_result: GrammarNormalizationLLMOutput = client.generate_structured(
                system_prompt=GRAMMAR_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                response_model=GrammarNormalizationLLMOutput,
            )

            # Check conservative confidence policy
            if llm_result.modified and llm_result.confidence >= threshold:
                segment_copy = segment.model_copy(
                    update={
                        "grammar_corrected_text": llm_result.corrected_text,
                        "grammar_modified": True,
                        "grammar_confidence": llm_result.confidence,
                        "grammar_changes": llm_result.changes,
                        "grammar_reason": llm_result.reason
                        or "Grammar/punctuation normalized",
                    }
                )
            else:
                # Input text preserved
                if llm_result.modified and llm_result.confidence < threshold:
                    reason = (
                        f"Confidence {llm_result.confidence:.2f} below threshold {threshold:.2f}"
                        + (f": {llm_result.reason}" if llm_result.reason else "")
                    )
                else:
                    reason = llm_result.reason or "No grammar or punctuation changes required"

                segment_copy = segment.model_copy(
                    update={
                        "grammar_corrected_text": active_text,
                        "grammar_modified": False,
                        "grammar_confidence": llm_result.confidence,
                        "grammar_changes": [],
                        "grammar_reason": reason,
                    }
                )

        except Exception as exc:
            # Graceful degradation: log error and preserve input text
            logger.warning(
                "Grammar normalization failed for segment sequence %d: %s. Preserving text.",
                segment.sequence,
                exc,
            )
            segment_copy = segment.model_copy(
                update={
                    "grammar_corrected_text": active_text,
                    "grammar_modified": False,
                    "grammar_confidence": 1.0,
                    "grammar_changes": [],
                    "grammar_reason": f"Fallback due to LLM error: {str(exc)}",
                }
            )

        normalized_segments.append(segment_copy)

    return normalized_segments
