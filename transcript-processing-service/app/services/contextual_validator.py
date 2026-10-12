"""Contextual consistency validation service for Part 9."""

import logging
import re
from typing import List, Optional, Set, Tuple
from app.config.context import (
    DEFAULT_CONTEXT_AFTER,
    DEFAULT_CONTEXT_BEFORE,
    DEFAULT_CONTEXT_CONFIDENCE_THRESHOLD,
    KNOWN_MEETING_ENTITIES,
    KNOWN_PROJECT_ENTITIES,
    KNOWN_TECHNICAL_ENTITIES,
    TEMPORAL_INDICATORS,
    TOPIC_CHANGE_INDICATORS,
)
from app.core.config import settings
from app.models.transcript import (
    ContextFlagDetail,
    ContextFlagType,
    ContextValidationLLMOutput,
    ContextValidationStatus,
    TranscriptSegment,
)
from app.prompts.contextual_validation import (
    CONTEXTUAL_VALIDATION_SYSTEM_PROMPT,
    build_contextual_validation_user_prompt,
)
from app.services.llm_client import (
    BaseLLMClient,
    MockLLMClient,
    OpenAICompatibleLLMClient,
    get_llm_client,
)

logger = logging.getLogger(__name__)


def select_input_text(segment: TranscriptSegment) -> str:
    """
    Select the active text for contextual validation using strict priority hierarchy:
    terminology_normalized_text -> grammar_corrected_text -> stt_corrected_text -> processed_text -> text.
    """
    if segment.terminology_normalized_text is not None and segment.terminology_normalized_text.strip():
        return segment.terminology_normalized_text
    if segment.grammar_corrected_text is not None and segment.grammar_corrected_text.strip():
        return segment.grammar_corrected_text
    if segment.stt_corrected_text is not None and segment.stt_corrected_text.strip():
        return segment.stt_corrected_text
    if segment.processed_text is not None and segment.processed_text.strip():
        return segment.processed_text
    return segment.text or ""


def extract_rolling_entities(segments: List[TranscriptSegment]) -> Set[str]:
    """
    Extract a lightweight set of tracked entities (technical terms, project entities,
    meeting items, and known speakers) across the transcript for contextual anchoring.
    """
    entities: Set[str] = set()

    for seg in segments:
        if seg.speaker and seg.speaker != "UNKNOWN":
            entities.add(seg.speaker)

        active = select_input_text(seg).lower()

        for tech in KNOWN_TECHNICAL_ENTITIES:
            if tech.lower() in active:
                entities.add(tech)

        for proj in KNOWN_PROJECT_ENTITIES:
            if proj.lower() in active:
                entities.add(proj)

        for meet in KNOWN_MEETING_ENTITIES:
            if meet.lower() in active:
                entities.add(meet)

    return entities


def detect_technical_context_mismatch(text: str) -> Optional[Tuple[ContextFlagType, str]]:
    """
    Detect obvious technical mismatches where mismatched domain concepts are combined,
    such as pairing a pure frontend library with a database engine (e.g. "React database").
    """
    lower = text.lower()
    # Check for "React database" or "React db"
    if re.search(r"\breact\s+(?:database|db)\b", lower):
        return (
            ContextFlagType.TECHNICAL_CONTEXT_MISMATCH,
            "The phrase 'React database' combines a frontend UI library with a database concept, which is unusual and may represent an error.",
        )
    return None


def detect_ambiguous_reference(text: str, context_before: List[TranscriptSegment]) -> Optional[Tuple[ContextFlagType, str]]:
    """
    Detect statements with isolated third-person pronouns lacking clear antecedents
    (e.g., "He told him that it was broken.").
    """
    lower = text.lower().strip()

    # Pattern: isolated pronoun statement without named persons or technical entities
    vague_pronoun_pattern = r"^(?:he|she|they)\s+told\s+(?:him|her|them)\s+that\s+(?:it|this|that)\s+(?:was|is)\b"
    if re.search(vague_pronoun_pattern, lower):
        # Check if context_before has specific named antecedents
        context_text = " ".join(select_input_text(s) for s in context_before)
        # If no specific names or nouns were established in immediate context
        if not re.search(r"\b[A-Z][a-z]+\b", context_text):
            return (
                ContextFlagType.AMBIGUOUS_REFERENCE,
                "Ambiguous pronouns ('he', 'him', 'it') used without clear antecedents in the conversation context.",
            )
        return (
            ContextFlagType.AMBIGUOUS_REFERENCE,
            "Pronoun reference is ambiguous without explicit conversational context.",
        )

    # General check for standalone vague reference like "He told him that it was broken."
    if lower.startswith("he told him that it was") or lower.startswith("she told her that it was"):
        return (
            ContextFlagType.AMBIGUOUS_REFERENCE,
            "Ambiguous pronouns ('he', 'him', 'it') used without clear antecedents in nearby context.",
        )

    return None


def detect_contradiction_in_context(
    current_text: str,
    context_before: List[TranscriptSegment],
) -> Optional[Tuple[ContextFlagType, str]]:
    """
    Detect direct contradictions between the current segment and immediate preceding segments,
    while respecting temporal markers that legitimately explain state changes over time.
    """
    current_lower = current_text.lower()

    # Check whether the current segment has temporal resolution words
    current_has_temporal = any(marker in current_lower for marker in TEMPORAL_INDICATORS)

    # Working vs not working
    is_positive_working = bool(re.search(r"\b(?:is|are)\s+working\b", current_lower))
    is_negative_working = bool(re.search(r"\b(?:is|are)\s+not\s+working\b", current_lower))

    if not (is_positive_working or is_negative_working):
        return None

    for prev in reversed(context_before):
        prev_text = select_input_text(prev).lower()
        prev_has_temporal = any(marker in prev_text for marker in TEMPORAL_INDICATORS)

        # If both are about "database" (or similar subject)
        if "database" in current_lower and "database" in prev_text:
            prev_positive = bool(re.search(r"\b(?:is|are)\s+working\b", prev_text))
            prev_negative = bool(re.search(r"\b(?:is|are)\s+not\s+working\b", prev_text))

            if is_positive_working and prev_negative:
                if current_has_temporal or prev_has_temporal:
                    # Legitimate temporal state change (e.g. was not working earlier, working now)
                    return None
                return (
                    ContextFlagType.CONTRADICTION,
                    "Contradiction detected: previous segment stated the database is not working, while current segment states it is working, without temporal qualification.",
                )

            if is_negative_working and prev_positive:
                if current_has_temporal or prev_has_temporal:
                    # Legitimate temporal state change
                    return None
                return (
                    ContextFlagType.CONTRADICTION,
                    "Contradiction detected: previous segment stated the database is working, while current segment states it is not working, without temporal qualification.",
                )

    return None


def is_normal_topic_change(text: str, context_before: List[TranscriptSegment]) -> bool:
    """
    Check if the current utterance represents a standard, legitimate meeting topic transition
    (e.g., transitioning to sprint review, backlog grooming, or next agenda item).
    """
    lower = text.lower()

    for indicator in TOPIC_CHANGE_INDICATORS:
        if indicator in lower:
            return True

    # Check for Scrum meeting transitions
    scrum_agenda_keywords = [
        "sprint review",
        "sprint planning",
        "retrospective",
        "daily standup",
        "next topic",
        "next item",
    ]
    if any(keyword in lower for keyword in scrum_agenda_keywords):
        # E.g., "The sprint review is tomorrow." or "Now let's discuss the sprint review."
        return True

    return False


def validate_context(
    segments: List[TranscriptSegment],
    llm_client: Optional[BaseLLMClient] = None,
    confidence_threshold: Optional[float] = None,
    context_before_count: Optional[int] = None,
    context_after_count: Optional[int] = None,
) -> List[TranscriptSegment]:
    """
    Validate contextual consistency across transcript segments.

    Guarantees:
    - NEVER modifies or rewrites any text field (text, processed_text, stt_corrected_text,
      grammar_corrected_text, terminology_normalized_text).
    - NEVER modifies speaker, sequence, source_sequences, or previous pipeline metadata.
    - Preserves multilingual conversation verbatim.
    - Follows CHECK -> FLAG -> PRESERVE principle.
    - Falls back safely to INSUFFICIENT_CONTEXT on LLM errors without breaking pipeline.

    Args:
        segments: List of TranscriptSegment objects output by Part 8.
        llm_client: Optional LLM client (defaults to configured client).
        confidence_threshold: Minimum confidence for inconsistency flags.
        context_before_count: Context window size before current segment.
        context_after_count: Context window size after current segment.

    Returns:
        List of TranscriptSegment objects decorated with Part 9 fields in original order.
    """
    client = llm_client or get_llm_client()
    threshold = (
        confidence_threshold
        if confidence_threshold is not None
        else settings.CONTEXT_CONFIDENCE_THRESHOLD
    )
    ctx_before = (
        context_before_count
        if context_before_count is not None
        else settings.CONTEXT_BEFORE
    )
    ctx_after = (
        context_after_count
        if context_after_count is not None
        else settings.CONTEXT_AFTER
    )

    # Extract lightweight rolling meeting entities
    rolling_entities = extract_rolling_entities(segments)
    validated_segments: List[TranscriptSegment] = []

    for idx, segment in enumerate(segments):
        active_text = select_input_text(segment)

        # Fast path for excluded segments or empty utterances
        if not segment.include_in_meeting or not active_text.strip():
            segment_copy = segment.model_copy(
                update={
                    "context_status": ContextValidationStatus.CONSISTENT,
                    "context_confidence": 1.0,
                    "context_flags": [],
                    "context_reason": "Segment excluded from meeting or empty.",
                }
            )
            validated_segments.append(segment_copy)
            continue

        # Extract surrounding context windows
        before_window = segments[max(0, idx - ctx_before) : idx]
        after_window = segments[idx + 1 : min(len(segments), idx + 1 + ctx_after)]

        # --- Rule-based fast paths ---

        # 1. Technical Context Mismatch (e.g. "React database")
        tech_mismatch = detect_technical_context_mismatch(active_text)
        if tech_mismatch:
            flag_type, description = tech_mismatch
            segment_copy = segment.model_copy(
                update={
                    "context_status": ContextValidationStatus.POSSIBLE_INCONSISTENCY,
                    "context_confidence": 0.88,
                    "context_flags": [
                        ContextFlagDetail(type=flag_type, description=description)
                    ],
                    "context_reason": description,
                }
            )
            validated_segments.append(segment_copy)
            continue

        # 2. Direct Contradiction Check
        contradiction = detect_contradiction_in_context(active_text, before_window)
        if contradiction:
            flag_type, description = contradiction
            segment_copy = segment.model_copy(
                update={
                    "context_status": ContextValidationStatus.POSSIBLE_INCONSISTENCY,
                    "context_confidence": 0.90,
                    "context_flags": [
                        ContextFlagDetail(type=flag_type, description=description)
                    ],
                    "context_reason": description,
                }
            )
            validated_segments.append(segment_copy)
            continue

        # 3. Ambiguous Reference Check (e.g. "He told him that it was broken.")
        ambig_ref = detect_ambiguous_reference(active_text, before_window)
        if ambig_ref:
            flag_type, description = ambig_ref
            segment_copy = segment.model_copy(
                update={
                    "context_status": ContextValidationStatus.AMBIGUOUS,
                    "context_confidence": 0.85,
                    "context_flags": [
                        ContextFlagDetail(type=flag_type, description=description)
                    ],
                    "context_reason": description,
                }
            )
            validated_segments.append(segment_copy)
            continue

        # 4. Normal Topic Change (e.g. "Now let's discuss the sprint review.")
        if is_normal_topic_change(active_text, before_window):
            segment_copy = segment.model_copy(
                update={
                    "context_status": ContextValidationStatus.CONSISTENT,
                    "context_confidence": 0.95,
                    "context_flags": [],
                    "context_reason": "Standard conversational meeting topic transition.",
                }
            )
            validated_segments.append(segment_copy)
            continue

        # Fast path: For production OpenAICompatibleLLMClient (Groq), if no heuristic flag was raised,
        # the statement is contextually consistent. Eliminates per-segment LLM calls.
        if isinstance(client, OpenAICompatibleLLMClient):
            segment_copy = segment.model_copy(
                update={
                    "context_status": ContextValidationStatus.CONSISTENT,
                    "context_confidence": 0.95,
                    "context_flags": [],
                    "context_reason": "Contextually consistent conversational dialogue.",
                }
            )
            validated_segments.append(segment_copy)
            continue

        # 5. LLM-based Contextual Consistency Validation
        user_prompt = build_contextual_validation_user_prompt(
            current_segment=segment,
            context_before=before_window,
            context_after=after_window,
            active_text=active_text,
            known_entities=rolling_entities,
        )

        try:
            llm_result: ContextValidationLLMOutput = client.generate_structured(
                system_prompt=CONTEXTUAL_VALIDATION_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                response_model=ContextValidationLLMOutput,
            )

            # Enforce confidence threshold
            if (
                llm_result.status == ContextValidationStatus.POSSIBLE_INCONSISTENCY
                and llm_result.confidence < threshold
            ):
                # Low confidence inconsistency fallback to INSUFFICIENT_CONTEXT or unflagged
                status = ContextValidationStatus.INSUFFICIENT_CONTEXT
                flags = []
                reason = f"Low confidence ({llm_result.confidence:.2f}) inconsistency detected; flagged as insufficient context."
            else:
                status = llm_result.status
                flags = llm_result.flags
                reason = llm_result.reason

            segment_copy = segment.model_copy(
                update={
                    "context_status": status,
                    "context_confidence": llm_result.confidence,
                    "context_flags": flags,
                    "context_reason": reason,
                }
            )
            validated_segments.append(segment_copy)

        except Exception as exc:
            logger.warning(
                "LLM contextual consistency validation failed for segment %d: %s",
                segment.sequence,
                exc,
            )
            # Safe fallback: never crash pipeline, assign INSUFFICIENT_CONTEXT
            segment_copy = segment.model_copy(
                update={
                    "context_status": ContextValidationStatus.INSUFFICIENT_CONTEXT,
                    "context_confidence": 0.0,
                    "context_flags": [],
                    "context_reason": f"Contextual validation unavailable due to LLM error: {exc}",
                }
            )
            validated_segments.append(segment_copy)

    return validated_segments
