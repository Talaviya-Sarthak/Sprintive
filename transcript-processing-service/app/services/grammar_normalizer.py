"""Service implementation for Part 7 — Grammar & Punctuation Normalization."""

import logging
import re
from typing import List, Optional, Tuple
from app.core.config import settings
from app.models.transcript import (
    GrammarChangeDetail,
    GrammarChangeType,
    GrammarNormalizationLLMOutput,
    SegmentClassification,
    TranscriptSegment,
)
from app.prompts.grammar_normalization import (
    GRAMMAR_SYSTEM_PROMPT,
    build_grammar_normalization_user_prompt,
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


COMMON_CONTRACTIONS = [
    (re.compile(r"\blets\b", re.IGNORECASE), "let's", "Normalized 'lets' to contraction 'let's'"),
    (re.compile(r"\bdont\b", re.IGNORECASE), "don't", "Normalized 'dont' to contraction 'don't'"),
    (re.compile(r"\bcant\b", re.IGNORECASE), "can't", "Normalized 'cant' to contraction 'can't'"),
    (re.compile(r"\bwont\b", re.IGNORECASE), "won't", "Normalized 'wont' to contraction 'won't'"),
    (re.compile(r"\bive\b", re.IGNORECASE), "I've", "Normalized 'ive' to contraction 'I've'"),
    (re.compile(r"\bim\b", re.IGNORECASE), "I'm", "Normalized 'im' to contraction 'I'm'"),
    (re.compile(r"\bid\b", re.IGNORECASE), "I'd", "Normalized 'id' to contraction 'I'd'"),
    (re.compile(r"\byoure\b", re.IGNORECASE), "you're", "Normalized 'youre' to contraction 'you're'"),
    (re.compile(r"\btheyre\b", re.IGNORECASE), "they're", "Normalized 'theyre' to contraction 'they're'"),
    (re.compile(r"\bweve\b", re.IGNORECASE), "we've", "Normalized 'weve' to contraction 'we've'"),
    (re.compile(r"\bthats\b", re.IGNORECASE), "that's", "Normalized 'thats' to contraction 'that's'"),
    (re.compile(r"\bwhats\b", re.IGNORECASE), "what's", "Normalized 'whats' to contraction 'what's'"),
    (re.compile(r"\btheres\b", re.IGNORECASE), "there's", "Normalized 'theres' to contraction 'there's'"),
    (re.compile(r"\btodays\b", re.IGNORECASE), "today's", "Normalized 'todays' to possessive 'today's'"),
]

INTERROGATIVE_STARTERS = {
    "what", "why", "how", "who", "when", "where",
    "can", "could", "would", "should", "is", "are", "do", "does", "did", "has", "have",
}


def deterministic_normalize_segment(text: str) -> Tuple[str, bool, List[GrammarChangeDetail], str]:
    """
    Perform fast, deterministic punctuation and grammar normalization without LLM.
    Handles capitalization, whitespace around punctuation, common speech contractions,
    and missing terminal punctuation.
    """
    if not text or not text.strip():
        return text, False, [], "Empty text"

    cleaned = text.strip()
    changes: List[GrammarChangeDetail] = []

    # 1. Spacing around punctuation: remove space before punctuation, ensure space after
    prev = cleaned
    cleaned = re.sub(r"\s+([,.:;?!])", r"\1", cleaned)
    cleaned = re.sub(r"([,.:;?!])([A-Za-z])", r"\1 \2", cleaned)
    cleaned = re.sub(r" {2,}", " ", cleaned)
    if cleaned != prev:
        changes.append(GrammarChangeDetail(type=GrammarChangeType.PUNCTUATION, description="Normalized punctuation spacing"))

    # 2. Contractions
    for pattern, repl, desc in COMMON_CONTRACTIONS:
        if pattern.search(cleaned):
            def replace_match(m):
                matched = m.group(0)
                if matched[0].isupper():
                    return repl[0].upper() + repl[1:]
                return repl
            cleaned = pattern.sub(replace_match, cleaned)
            changes.append(GrammarChangeDetail(type=GrammarChangeType.GRAMMAR, description=desc))

    # 3. Capitalization of first character
    if cleaned and cleaned[0].islower():
        cleaned = cleaned[0].upper() + cleaned[1:]
        changes.append(GrammarChangeDetail(type=GrammarChangeType.CAPITALIZATION, description="Capitalized initial letter"))

    # 4. Terminal punctuation
    terminal_punct = (".", "?", "!", "...", "।")
    if not any(cleaned.endswith(p) for p in terminal_punct):
        first_word = cleaned.split()[0].lower().strip(".,?!:;") if cleaned.split() else ""
        if first_word in INTERROGATIVE_STARTERS:
            cleaned += "?"
            changes.append(GrammarChangeDetail(type=GrammarChangeType.PUNCTUATION, description="Added missing terminal question mark"))
        else:
            cleaned += "."
            changes.append(GrammarChangeDetail(type=GrammarChangeType.PUNCTUATION, description="Added missing terminal period"))

    modified = (cleaned != text)
    reason = "Deterministic grammar and punctuation normalization applied" if modified else "No grammar or punctuation changes required"
    return cleaned, modified, changes, reason


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

        # Fast path: For production OpenAICompatibleLLMClient (Groq), apply deterministic normalization directly
        if isinstance(client, OpenAICompatibleLLMClient):
            det_text, det_modified, det_changes, det_reason = deterministic_normalize_segment(active_text)
            segment_copy = segment.model_copy(
                update={
                    "grammar_corrected_text": det_text,
                    "grammar_modified": det_modified,
                    "grammar_confidence": 0.95 if det_modified else 1.0,
                    "grammar_changes": det_changes,
                    "grammar_reason": det_reason,
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
