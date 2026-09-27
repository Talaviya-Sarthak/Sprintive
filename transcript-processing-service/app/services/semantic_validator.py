"""Semantic preservation validation service for Part 12."""

import logging
from typing import List, Optional, Set
from app.config.semantic import (
    DEFAULT_SEMANTIC_CONTEXT_AFTER,
    DEFAULT_SEMANTIC_CONTEXT_BEFORE,
    SEMANTIC_CONFIDENCE_REVIEW,
    SEMANTIC_CONFIDENCE_STRONG,
)
from app.core.config import settings
from app.models.semantic_validation import (
    ExtractedSemanticEntities,
    SemanticFlagType,
    SemanticValidationResult,
    SemanticValidationStatus,
)
from app.models.transcript import TranscriptSegment
from app.prompts.semantic_validation import (
    SEMANTIC_VALIDATION_SYSTEM_PROMPT,
    build_semantic_validation_user_prompt,
)
from app.services.entity_extractor import extract_semantic_entities
from app.services.llm_client import BaseLLMClient, get_llm_client
from app.services.semantic_rules import (
    check_deterministic_semantic_preservation,
    get_latest_processed_text,
)

logger = logging.getLogger(__name__)


def validate_semantic_preservation(
    segments: List[TranscriptSegment],
    llm_client: Optional[BaseLLMClient] = None,
    context_before_count: Optional[int] = None,
    context_after_count: Optional[int] = None,
) -> List[TranscriptSegment]:
    """
    Validate semantic preservation across transcript segments.

    Guarantees:
    - NEVER rewrites or modifies transcript text or speaker labels (assert output['text'] == input['text']).
    - Preserves all 5 levels of text traceability and previous metadata from Parts 1-11.
    - Evaluates whether factual content, negations, quantities, deadlines, commitments, and actions were preserved.
    - Uses deterministic entity checks first, escalating to LLM with conversational context window only when needed.
    - Falls back safely to INSUFFICIENT_CONTEXT on LLM errors without failing the pipeline.

    Args:
        segments: List of TranscriptSegment objects output by Part 11.
        llm_client: Optional LLM client (defaults to configured client).
        context_before_count: Context window size before current segment.
        context_after_count: Context window size after current segment.

    Returns:
        List of TranscriptSegment objects decorated with Part 12 semantic metadata in original order.
    """
    if not segments:
        return []

    client = llm_client or get_llm_client()
    ctx_before = (
        context_before_count
        if context_before_count is not None
        else getattr(settings, "SEMANTIC_CONTEXT_BEFORE", DEFAULT_SEMANTIC_CONTEXT_BEFORE)
    )
    ctx_after = (
        context_after_count
        if context_after_count is not None
        else getattr(settings, "SEMANTIC_CONTEXT_AFTER", DEFAULT_SEMANTIC_CONTEXT_AFTER)
    )

    known_speakers: Set[str] = {s.speaker for s in segments if s.speaker}
    validated_segments: List[TranscriptSegment] = []

    for i, seg in enumerate(segments):
        # Fast path for excluded segments
        if not seg.include_in_meeting:
            seg_dict = seg.model_dump()
            seg_dict.update({
                "semantic_status": SemanticValidationStatus.SEMANTICALLY_PRESERVED,
                "semantic_confidence": 0.98,
                "semantic_flags": [],
                "semantic_changed_elements": [],
                "semantic_validation_reason": "Segment excluded from meeting; semantic preservation automatically marked PRESERVED.",
            })
            seg_dict["text"] = seg.text
            seg_dict["speaker"] = seg.speaker
            validated_segments.append(TranscriptSegment(**seg_dict))
            continue

        orig_text = seg.text or ""
        proc_text = get_latest_processed_text(seg)

        orig_entities = extract_semantic_entities(orig_text, known_speakers)
        proc_entities = extract_semantic_entities(proc_text, known_speakers)

        # Layer 1: Deterministic evaluation
        rule_result = check_deterministic_semantic_preservation(
            orig_text=orig_text,
            proc_text=proc_text,
            orig_ent=orig_entities,
            proc_ent=proc_entities,
        )

        final_result: SemanticValidationResult

        if rule_result is not None:
            final_result = rule_result
        else:
            # Layer 2: LLM Validation with context window
            context_before = segments[max(0, i - ctx_before) : i]
            context_after = segments[i + 1 : min(len(segments), i + 1 + ctx_after)]

            try:
                user_prompt = build_semantic_validation_user_prompt(
                    segment=seg,
                    original_text=orig_text,
                    processed_text=proc_text,
                    context_before=context_before,
                    context_after=context_after,
                    orig_entities=orig_entities,
                    proc_entities=proc_entities,
                )
                final_result = client.generate_structured(
                    system_prompt=SEMANTIC_VALIDATION_SYSTEM_PROMPT,
                    user_prompt=user_prompt,
                    response_model=SemanticValidationResult,
                )
            except Exception as e:
                logger.warning(
                    f"LLM semantic validation failed for sequence {seg.sequence}: {e}. "
                    "Falling back safely to INSUFFICIENT_CONTEXT."
                )
                final_result = SemanticValidationResult(
                    status=SemanticValidationStatus.INSUFFICIENT_CONTEXT,
                    confidence=0.5,
                    flags=[],
                    changed_elements=[],
                    reason=f"LLM semantic validation unavailable ({type(e).__name__}); preserved original text.",
                )

        seg_dict = seg.model_dump()
        seg_dict.update({
            "semantic_status": final_result.status,
            "semantic_confidence": final_result.confidence,
            "semantic_flags": final_result.flags,
            "semantic_changed_elements": final_result.changed_elements,
            "semantic_validation_reason": final_result.reason,
        })

        # Invariant enforcement
        seg_dict["text"] = seg.text
        seg_dict["speaker"] = seg.speaker

        validated_segments.append(TranscriptSegment(**seg_dict))

    return validated_segments
