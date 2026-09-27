"""Service implementation for Part 8 — Technical Terminology Normalization."""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from app.config.terminology import (
    CANONICAL_TECHNICAL_TERMS,
    get_sorted_variant_mappings,
)
from app.core.config import settings
from app.models.transcript import (
    TerminologyAnalysisLLMOutput,
    TerminologyChangeDetail,
    TerminologyChangeType,
    TranscriptSegment,
)
from app.prompts.terminology_analysis import (
    TERMINOLOGY_SYSTEM_PROMPT,
    build_terminology_disambiguation_user_prompt,
)
from app.services.llm_client import BaseLLMClient, get_llm_client

logger = logging.getLogger(__name__)


def select_input_text(segment: TranscriptSegment) -> str:
    """
    Select the highest-priority valid transcript text for technical terminology normalization:
    grammar_corrected_text -> stt_corrected_text -> processed_text -> text.

    Args:
        segment: The transcript segment being processed.

    Returns:
        The selected text string.
    """
    if segment.grammar_corrected_text is not None and segment.grammar_corrected_text.strip():
        return segment.grammar_corrected_text
    if segment.stt_corrected_text is not None and segment.stt_corrected_text.strip():
        return segment.stt_corrected_text
    if segment.processed_text is not None and segment.processed_text.strip():
        return segment.processed_text
    return segment.text


def mask_protected_patterns(text: str) -> Tuple[str, Dict[str, str]]:
    """
    Mask URLs, file paths, API endpoints, and camelCase/snake_case code identifiers
    so their internal components are protected from terminology replacement.

    Returns:
        Tuple of (masked_text, token_to_original_map)
    """
    mask_map: Dict[str, str] = {}
    counter = 0

    def make_mask(matched_val: str) -> str:
        nonlocal counter
        token = f"__SPRINTIVE_PROTECTED_TOKEN_{counter}__"
        mask_map[token] = matched_val
        counter += 1
        return token

    # 1. Mask URLs (http:// or https://)
    url_pattern = re.compile(r"https?://\S+")
    text = url_pattern.sub(lambda m: make_mask(m.group(0)), text)

    # 2. Mask API endpoints / file paths (e.g. /api/users, /v1/auth)
    endpoint_pattern = re.compile(r"(?:/[a-zA-Z0-9_\-\.]+)+")
    text = endpoint_pattern.sub(lambda m: make_mask(m.group(0)), text)

    # 3. Mask code-like camelCase identifiers with uppercase inside (e.g. getUserAPI, userAPI)
    code_camel_pattern = re.compile(r"\b[a-zA-Z0-9_]*[a-z][A-Z][a-zA-Z0-9_]*\b")
    text = code_camel_pattern.sub(lambda m: make_mask(m.group(0)), text)

    # 4. Mask snake_case identifiers (e.g. user_id, api_key)
    code_snake_pattern = re.compile(r"\b[a-zA-Z0-9]+_[a-zA-Z0-9_]+\b")
    text = code_snake_pattern.sub(lambda m: make_mask(m.group(0)), text)

    return text, mask_map


def unmask_protected_patterns(text: str, mask_map: Dict[str, str]) -> str:
    """Restore masked protected tokens to their original values."""
    for token, original in mask_map.items():
        text = text.replace(token, original)
    return text


def build_variant_regex(variant: str) -> re.Pattern:
    """Build whole-word case-insensitive regex for a variant string."""
    escaped = re.escape(variant)
    # Allow multiple spaces or hyphens for multi-word variants
    escaped = re.sub(r"\\\s+", r"\\s+", escaped)
    escaped = re.sub(r"\\-", r"[\\-\\s]+", escaped)
    # For node js or node.js
    if variant in ["node js", "nodejs", "node.js"]:
        return re.compile(r"\bnode(?:\.js|\s+js|js)\b", re.IGNORECASE)
    # For post gre sql
    if "post" in variant and "sql" in variant:
        return re.compile(r"\bpost(?:\s*gre\s*sql|gre\s*sql|gresql|gres)\b", re.IGNORECASE)
    return re.compile(rf"\b{escaped}\b", re.IGNORECASE)


def is_ambiguous_term_technical(
    term_str: str,
    canonical: str,
    active_text: str,
    segment: TranscriptSegment,
    context_before: List[TranscriptSegment],
    context_after: List[TranscriptSegment],
    term_info: Dict[str, Any],
    llm_client: Optional[BaseLLMClient] = None,
    threshold: float = 0.90,
) -> bool:
    """
    Determine if an ambiguous term (like 'react' or 'express') is technical in context.
    Uses rule-based heuristics first, and falls back to LLM analysis if uncertain.
    """
    lower_text = active_text.lower()
    term_lower = term_str.lower()

    # Rule 1: Check obvious non-technical phrases
    non_tech_hints = term_info.get("non_technical_hints", [])
    for hint in non_tech_hints:
        if hint in lower_text:
            return False

    # Rule 2: Check obvious technical phrases/hints
    tech_hints = term_info.get("technical_hints", [])
    has_tech_hint = any(hint in lower_text for hint in tech_hints)

    # If context before/after has technical hints
    context_text = " ".join(
        [s.processed_text or s.text for s in context_before + context_after]
    ).lower()
    has_context_tech_hint = any(hint in context_text for hint in tech_hints)

    if has_tech_hint and not any(nth in lower_text for nth in non_tech_hints):
        return True

    # If it's a clear ordinary verb structure without tech hints, preserve
    # e.g. "how did he react", "did you react", "they react"
    if re.search(r"\b(?:how|why|did|will|would|can|could|to)\s+(?:he|she|they|you|we|people)?\s*react\b", lower_text):
        return False

    # When uncertain and LLM client is available, ask LLM
    if llm_client is not None:
        try:
            user_prompt = build_terminology_disambiguation_user_prompt(
                term=term_str,
                canonical_candidate=canonical,
                current_segment=segment,
                context_before=context_before,
                context_after=context_after,
                active_text=active_text,
            )
            result: TerminologyAnalysisLLMOutput = llm_client.generate_structured(
                system_prompt=TERMINOLOGY_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                response_model=TerminologyAnalysisLLMOutput,
            )
            if result.is_technical and result.confidence >= threshold:
                return True
            return False
        except Exception as exc:
            logger.warning("LLM terminology disambiguation failed for '%s': %s", term_str, exc)
            return False

    # Default conservative: false
    return False


def normalize_terminology(
    segments: List[TranscriptSegment],
    llm_client: Optional[BaseLLMClient] = None,
    confidence_threshold: Optional[float] = None,
    context_before_count: Optional[int] = None,
    context_after_count: Optional[int] = None,
) -> List[TranscriptSegment]:
    """
    Normalize technical terminology across transcript segments using deterministic
    controlled dictionary mapping with context-aware disambiguation.

    Guarantees:
    - Never modifies original `text`, `processed_text`, `stt_corrected_text`, or `grammar_corrected_text`.
    - Never modifies `speaker`, `sequence`, or `source_sequences`.
    - Protects URLs, API paths/endpoints, and code-like identifiers.
    - Matches multi-word terms longest-first to prevent partial replacement.
    - Preserves ordinary words (e.g. "how did he react" remains "react").
    - Preserves multilingual dialogue without translation.
    - Falls back gracefully without failing the pipeline.

    Args:
        segments: List of TranscriptSegment objects from Part 7.
        llm_client: Optional LLM client (defaults to configured client).
        confidence_threshold: Minimum confidence for LLM decisions (defaults to settings.TERMINOLOGY_CONFIDENCE_THRESHOLD).
        context_before_count: Context window size before current segment.
        context_after_count: Context window size after current segment.

    Returns:
        List of TranscriptSegment objects decorated with Part 8 fields.
    """
    client = llm_client or get_llm_client()
    threshold = (
        confidence_threshold
        if confidence_threshold is not None
        else settings.TERMINOLOGY_CONFIDENCE_THRESHOLD
    )
    ctx_before = (
        context_before_count
        if context_before_count is not None
        else settings.TERMINOLOGY_CONTEXT_BEFORE
    )
    ctx_after = (
        context_after_count
        if context_after_count is not None
        else settings.TERMINOLOGY_CONTEXT_AFTER
    )

    variant_mappings = get_sorted_variant_mappings()
    normalized_segments: List[TranscriptSegment] = []

    for idx, segment in enumerate(segments):
        active_text = select_input_text(segment)

        # Optimization & Guard: Skip excluded segments or purely empty/whitespace utterances
        if not segment.include_in_meeting or not active_text.strip():
            segment_copy = segment.model_copy(
                update={
                    "terminology_normalized_text": active_text,
                    "terminology_modified": False,
                    "terminology_changes": [],
                    "possible_unknown_terms": [],
                }
            )
            normalized_segments.append(segment_copy)
            continue

        # Extract surrounding context window
        before_window = segments[max(0, idx - ctx_before) : idx]
        after_window = segments[idx + 1 : idx + 1 + ctx_after]

        # 1. Mask protected patterns (URLs, endpoints, camelCase/snake_case code identifiers)
        masked_text, mask_map = mask_protected_patterns(active_text)
        current_text = masked_text
        changes: List[TerminologyChangeDetail] = []
        replaced_spans: List[Tuple[int, int]] = []

        # 2. Iterate through canonical variants (already sorted longest-first)
        for variant_str, canonical, is_ambiguous, term_info in variant_mappings:
            regex = build_variant_regex(variant_str)

            # Find matches in current_text
            matches = list(regex.finditer(current_text))
            if not matches:
                continue

            for match in reversed(matches):  # reverse order to preserve string indices
                start, end = match.span()
                matched_val = match.group(0)

                # Skip if already inside a masked token or previously replaced span
                if "__SPRINTIVE_PROTECTED_TOKEN_" in matched_val:
                    continue

                # If already canonical, nothing to change
                if matched_val == canonical:
                    continue

                # Ambiguous terms check
                if is_ambiguous:
                    is_tech = is_ambiguous_term_technical(
                        term_str=matched_val,
                        canonical=canonical,
                        active_text=active_text,
                        segment=segment,
                        context_before=before_window,
                        context_after=after_window,
                        term_info=term_info,
                        llm_client=client,
                        threshold=threshold,
                    )
                    if not is_tech:
                        continue
                    change_type = TerminologyChangeType.CONTEXT_DISAMBIGUATION
                else:
                    if matched_val.lower() == canonical.lower():
                        change_type = TerminologyChangeType.CASE_NORMALIZATION
                    else:
                        change_type = TerminologyChangeType.CANONICAL_TERM

                # Apply replacement
                current_text = current_text[:start] + canonical + current_text[end:]
                changes.append(
                    TerminologyChangeDetail(
                        original=matched_val,
                        normalized=canonical,
                        type=change_type,
                    )
                )

        # 3. Unmask protected patterns
        final_text = unmask_protected_patterns(current_text, mask_map)
        is_modified = final_text != active_text

        # Reverse changes list so they appear in reading order
        changes.reverse()

        segment_copy = segment.model_copy(
            update={
                "terminology_normalized_text": final_text,
                "terminology_modified": is_modified,
                "terminology_changes": changes,
                "possible_unknown_terms": [],
            }
        )
        normalized_segments.append(segment_copy)

    return normalized_segments
