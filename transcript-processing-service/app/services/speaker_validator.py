"""Speaker attribution validation service for Part 10."""

import logging
from typing import List, Optional, Set
from app.config.speaker import (
    DEFAULT_SPEAKER_CONTEXT_AFTER,
    DEFAULT_SPEAKER_CONTEXT_BEFORE,
    SPEAKER_CONFIDENCE_REVIEW,
    SPEAKER_CONFIDENCE_STRONG,
)
from app.core.config import settings
from app.models.speaker_validation import (
    SpeakerFlagType,
    SpeakerValidationResult,
    SpeakerValidationStatus,
)
from app.models.transcript import TranscriptSegment
from app.prompts.speaker_validation import (
    SPEAKER_VALIDATION_SYSTEM_PROMPT,
    build_speaker_validation_user_prompt,
)
from app.services.llm_client import BaseLLMClient, get_llm_client
from app.services.speaker_rules import (
    detect_direct_response,
    detect_possible_fragment_continuation,
    is_natural_turn_taking,
    select_input_text,
)

logger = logging.getLogger(__name__)


def validate_speakers(
    segments: List[TranscriptSegment],
    llm_client: Optional[BaseLLMClient] = None,
    context_before_count: Optional[int] = None,
    context_after_count: Optional[int] = None,
) -> List[TranscriptSegment]:
    """
    Validate speaker attribution across transcript segments.

    Guarantees:
    - NEVER overwrites the original `speaker` field (original_speaker == output['speaker']).
    - NEVER modifies or rewrites any transcript text.
    - Preserves all 5 levels of text traceability and previous metadata from Parts 1-9.
    - If a suggested_speaker is proposed, verifies that it exists in the known transcript speakers.
    - Falls back safely to INSUFFICIENT_CONTEXT on LLM errors without failing the pipeline.

    Args:
        segments: List of TranscriptSegment objects output by Part 9.
        llm_client: Optional LLM client (defaults to configured client).
        context_before_count: Context window size before current segment.
        context_after_count: Context window size after current segment.

    Returns:
        List of TranscriptSegment objects decorated with Part 10 metadata in original order.
    """
    client = llm_client or get_llm_client()
    ctx_before = (
        context_before_count
        if context_before_count is not None
        else settings.SPEAKER_CONTEXT_BEFORE
    )
    ctx_after = (
        context_after_count
        if context_after_count is not None
        else settings.SPEAKER_CONTEXT_AFTER
    )

    # Collect known speakers across all segments
    known_speakers: Set[str] = {
        seg.speaker.strip()
        for seg in segments
        if seg.speaker and seg.speaker.strip() and seg.speaker.strip() != "UNKNOWN"
    }

    validated_segments: List[TranscriptSegment] = []

    for idx, segment in enumerate(segments):
        active_text = select_input_text(segment)
        prev_segment = segments[idx - 1] if idx > 0 else None

        # Fast path for excluded segments or empty utterances
        if not segment.include_in_meeting or not active_text.strip():
            segment_copy = segment.model_copy(
                update={
                    "speaker_validation_status": SpeakerValidationStatus.VALID,
                    "speaker_confidence": 1.0,
                    "speaker_flags": [],
                    "suggested_speaker": None,
                    "speaker_correction": None,
                    "speaker_validation_reason": "Segment excluded from meeting or empty.",
                }
            )
            validated_segments.append(segment_copy)
            continue

        # --- Layer 1: Deterministic heuristic rules ---

        # 1. Unfinished sentence continuation check (e.g. 'We need to investigate the database' -> 'connection issue first.')
        continuation_result = detect_possible_fragment_continuation(segment, prev_segment)
        if continuation_result:
            suggested = continuation_result.suggested_speaker
            # Verify suggested speaker exists in known speakers
            if suggested and suggested not in known_speakers:
                suggested = None

            segment_copy = segment.model_copy(
                update={
                    "speaker_validation_status": continuation_result.status,
                    "speaker_confidence": continuation_result.confidence,
                    "speaker_flags": continuation_result.flags,
                    "suggested_speaker": suggested,
                    "speaker_correction": None,
                    "speaker_validation_reason": continuation_result.reason,
                }
            )
            validated_segments.append(segment_copy)
            continue

        # 2. Direct question-response check (e.g. 'Harshit, can you explain...' -> 'Yes, I have...')
        direct_resp_result = detect_direct_response(segment, prev_segment)
        if direct_resp_result:
            segment_copy = segment.model_copy(
                update={
                    "speaker_validation_status": direct_resp_result.status,
                    "speaker_confidence": direct_resp_result.confidence,
                    "speaker_flags": direct_resp_result.flags,
                    "suggested_speaker": None,
                    "speaker_correction": None,
                    "speaker_validation_reason": direct_resp_result.reason,
                }
            )
            validated_segments.append(segment_copy)
            continue

        # --- Layer 2 & 3: Context Window & LLM Validation ---
        before_window = segments[max(0, idx - ctx_before) : idx]
        after_window = segments[idx + 1 : min(len(segments), idx + 1 + ctx_after)]

        user_prompt = build_speaker_validation_user_prompt(
            current_segment=segment,
            context_before=before_window,
            context_after=after_window,
            active_text=active_text,
            known_speakers=known_speakers,
        )

        try:
            llm_result: SpeakerValidationResult = client.generate_structured(
                system_prompt=SPEAKER_VALIDATION_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                response_model=SpeakerValidationResult,
            )

            # Validate suggested speaker: must exist in known_speakers and not be current speaker
            suggested = llm_result.suggested_speaker
            if suggested:
                suggested_clean = suggested.strip()
                if suggested_clean not in known_speakers or suggested_clean == segment.speaker:
                    suggested = None
                else:
                    suggested = suggested_clean

            segment_copy = segment.model_copy(
                update={
                    "speaker_validation_status": llm_result.status,
                    "speaker_confidence": llm_result.confidence,
                    "speaker_flags": llm_result.flags,
                    "suggested_speaker": suggested,
                    "speaker_correction": None,
                    "speaker_validation_reason": llm_result.reason,
                }
            )
            validated_segments.append(segment_copy)

        except Exception as exc:
            logger.warning(
                "LLM speaker attribution validation failed for segment %d: %s",
                segment.sequence,
                exc,
            )
            # Safe fallback: assign INSUFFICIENT_CONTEXT without halting pipeline
            segment_copy = segment.model_copy(
                update={
                    "speaker_validation_status": SpeakerValidationStatus.INSUFFICIENT_CONTEXT,
                    "speaker_confidence": 0.0,
                    "speaker_flags": [SpeakerFlagType.INSUFFICIENT_CONTEXT],
                    "suggested_speaker": None,
                    "speaker_correction": None,
                    "speaker_validation_reason": f"Speaker validation unavailable due to LLM error: {exc}",
                }
            )
            validated_segments.append(segment_copy)

    return validated_segments
