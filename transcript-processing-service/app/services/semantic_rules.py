"""Deterministic semantic rules and comparison functions for Part 12."""

import re
from typing import List, Optional, Set, Tuple
from app.models.semantic_validation import (
    ExtractedSemanticEntities,
    SemanticFlagType,
    SemanticValidationResult,
    SemanticValidationStatus,
)
from app.models.transcript import TranscriptSegment

_PUNCT_AND_SPACE_RE = re.compile(r"[\s\.,!?;:—–\-\"'\(\)\[\]{}।]+", re.UNICODE)

# Common contraction expansions / equivalence
_CONTRACTIONS_MAP = {
    "i'll": "i will",
    "you'll": "you will",
    "he'll": "he will",
    "she'll": "she will",
    "we'll": "we will",
    "they'll": "they will",
    "it'll": "it will",
    "let's": "let us",
    "i've": "i have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",
    "i'm": "i am",
    "you're": "you are",
    "we're": "we are",
    "they're": "they are",
    "can't": "cannot",
    "won't": "will not",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
}

# Accepted synonymous pairs in scrum/technical discussions
_SYNONYM_PAIRS = [
    ({"fix", "resolve", "address"}, "fix"),
    ({"issue", "problem", "bug"}, "issue"),
    ({"start", "begin", "commence"}, "start"),
    ({"finish", "complete", "wrap up"}, "finish"),
    ({"check", "verify", "inspect"}, "check"),
    ({"modify", "change", "update"}, "modify"),
]


def get_latest_processed_text(segment: TranscriptSegment) -> str:
    """
    Select the latest processed text for semantic preservation comparison using strict priority:
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


def normalize_text_for_comparison(text: str) -> str:
    """Strip punctuation and extra whitespace, and lowercase for comparison."""
    if not text:
        return ""
    return _PUNCT_AND_SPACE_RE.sub(" ", text).lower().strip()


def normalize_contractions_and_synonyms(text: str) -> str:
    """Normalize contractions and accepted synonyms to canonical tokens."""
    lowered = text.lower().replace("’", "'")
    for contraction, expansion in _CONTRACTIONS_MAP.items():
        lowered = re.sub(rf"\b{re.escape(contraction)}\b", expansion, lowered)

    words = lowered.split()
    normalized_words = []
    for w in words:
        cleaned = _PUNCT_AND_SPACE_RE.sub("", w)
        replaced = cleaned
        for syn_set, canonical in _SYNONYM_PAIRS:
            if cleaned in syn_set:
                replaced = canonical
                break
        if replaced:
            normalized_words.append(replaced)
    return " ".join(normalized_words)


def is_formatting_or_punctuation_only(orig_text: str, proc_text: str) -> bool:
    """Check if the text difference is strictly formatting, punctuation, or casing."""
    orig_norm = _PUNCT_AND_SPACE_RE.sub("", orig_text).lower()
    proc_norm = _PUNCT_AND_SPACE_RE.sub("", proc_text).lower()
    return orig_norm != "" and orig_norm == proc_norm


def is_semantic_equivalent_stylistic_change(orig_text: str, proc_text: str) -> bool:
    """
    Check if text differs only by contractions, synonym substitutions,
    minor grammatical normalization, or casual filler trimming.
    """
    orig_c = normalize_contractions_and_synonyms(orig_text)
    proc_c = normalize_contractions_and_synonyms(proc_text)
    if orig_c == proc_c:
        return True

    # Trimming conversational fillers (e.g. "Yeah, okay." -> "Okay.")
    fillers = {"yeah", "yes", "um", "uh", "well", "so", "like", "okay", "ok"}
    orig_tokens = [t for t in orig_c.split() if t not in fillers]
    proc_tokens = [t for t in proc_c.split() if t not in fillers]
    return len(orig_tokens) > 0 and orig_tokens == proc_tokens


def check_deterministic_semantic_preservation(
    orig_text: str,
    proc_text: str,
    orig_ent: ExtractedSemanticEntities,
    proc_ent: ExtractedSemanticEntities,
) -> Optional[SemanticValidationResult]:
    """
    Perform deterministic comparison between original and processed semantic entities.

    Returns:
        SemanticValidationResult if deterministic decision is conclusive,
        or None if ambiguous / LLM escalation required.
    """
    orig_clean = orig_text.strip()
    proc_clean = proc_text.strip()

    # Case 0: Empty or insufficient content
    if not orig_clean or not proc_clean:
        return SemanticValidationResult(
            status=SemanticValidationStatus.INSUFFICIENT_CONTEXT,
            confidence=0.5,
            flags=[],
            changed_elements=[],
            reason="Insufficient textual content for semantic validation.",
        )

    # Case 1: Verbatim identical text
    if orig_clean == proc_clean:
        return SemanticValidationResult(
            status=SemanticValidationStatus.SEMANTICALLY_PRESERVED,
            confidence=0.99,
            flags=[],
            changed_elements=[],
            reason="Original text and processed text are verbatim identical; semantics fully preserved.",
        )

    # Case 2: Punctuation, capitalization, or formatting only
    if is_formatting_or_punctuation_only(orig_clean, proc_clean):
        return SemanticValidationResult(
            status=SemanticValidationStatus.SEMANTICALLY_PRESERVED,
            confidence=0.98,
            flags=[],
            changed_elements=[],
            reason="Differences are solely punctuation, casing, or spacing normalization; semantics preserved.",
        )

    # Case 3: Negation discrepancy (Critical check)
    has_orig_neg = len(orig_ent.negations) > 0
    has_proc_neg = len(proc_ent.negations) > 0
    if has_orig_neg != has_proc_neg:
        return SemanticValidationResult(
            status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
            confidence=0.98,
            flags=[SemanticFlagType.NEGATION_CHANGED.value],
            changed_elements=["negation"],
            reason=(
                f"Negation mismatch: original contained '{orig_ent.negations}' but processed text "
                f"{'contained ' + str(proc_ent.negations) if has_proc_neg else 'omitted negation'}."
            ),
        )

    # Case 4: Time discrepancy (checked before numbers so 10 AM -> 11 AM is identified as time)
    if orig_ent.times or proc_ent.times:
        if set(orig_ent.times) != set(proc_ent.times):
            return SemanticValidationResult(
                status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
                confidence=0.96,
                flags=[SemanticFlagType.TIME_CHANGED.value],
                changed_elements=["time"],
                reason=(
                    f"Time expression modified: original contained {orig_ent.times} "
                    f"while processed text has {proc_ent.times}."
                ),
            )

    # Case 5: Number / quantity discrepancy
    if orig_ent.numbers or proc_ent.numbers:
        if sorted(orig_ent.numbers) != sorted(proc_ent.numbers):
            return SemanticValidationResult(
                status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
                confidence=0.96,
                flags=[
                    SemanticFlagType.QUANTITY_CHANGED.value,
                    SemanticFlagType.NUMBER_CHANGED.value,
                ],
                changed_elements=["quantity", "numbers"],
                reason=(
                    f"Numeric value modified: original contained {orig_ent.numbers} "
                    f"while processed text contains {proc_ent.numbers}."
                ),
            )

    # Case 6: Date / deadline discrepancy
    if orig_ent.dates_and_deadlines or proc_ent.dates_and_deadlines:
        if set(orig_ent.dates_and_deadlines) != set(proc_ent.dates_and_deadlines):
            return SemanticValidationResult(
                status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
                confidence=0.96,
                flags=[
                    SemanticFlagType.DEADLINE_CHANGED.value,
                    SemanticFlagType.DATE_CHANGED.value,
                ],
                changed_elements=["deadline", "date"],
                reason=(
                    f"Date or deadline modified: original was {orig_ent.dates_and_deadlines} "
                    f"while processed text has {proc_ent.dates_and_deadlines}."
                ),
            )

    # Case 7: Technical entity replacement
    if orig_ent.technical_entities and proc_ent.technical_entities:
        orig_tech_set = set(orig_ent.technical_entities)
        proc_tech_set = set(proc_ent.technical_entities)
        if orig_tech_set != proc_tech_set:
            return SemanticValidationResult(
                status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
                confidence=0.95,
                flags=[SemanticFlagType.TECHNICAL_ENTITY_CHANGED.value],
                changed_elements=["technical_entity"],
                reason=(
                    f"Technical entity altered: original referenced {sorted(list(orig_tech_set))} "
                    f"while processed referenced {sorted(list(proc_tech_set))}."
                ),
            )

    # Case 8: Person reference replacement
    if orig_ent.person_references and proc_ent.person_references:
        orig_persons = set(orig_ent.person_references)
        proc_persons = set(proc_ent.person_references)
        if orig_persons != proc_persons:
            return SemanticValidationResult(
                status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
                confidence=0.95,
                flags=[SemanticFlagType.PERSON_REFERENCE_CHANGED.value],
                changed_elements=["person_reference"],
                reason=(
                    f"Person reference modified: original named {sorted(list(orig_persons))} "
                    f"while processed named {sorted(list(proc_persons))}."
                ),
            )

    # Case 9: Sentence Modality: Question to Statement or vice versa
    if orig_ent.is_question != proc_ent.is_question:
        flag = (
            SemanticFlagType.QUESTION_TO_STATEMENT.value
            if orig_ent.is_question
            else SemanticFlagType.STATEMENT_TO_QUESTION.value
        )
        return SemanticValidationResult(
            status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
            confidence=0.95,
            flags=[flag],
            changed_elements=["sentence_modality", "intent"],
            reason=(
                "Speaker intent altered: question converted to statement or vice versa."
            ),
        )

    # Case 10: Uncertainty removal
    # e.g., "The issue may be related to PostgreSQL." -> "The issue is related to PostgreSQL."
    if orig_ent.uncertainty_markers and not proc_ent.uncertainty_markers:
        return SemanticValidationResult(
            status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
            confidence=0.90,
            flags=[
                SemanticFlagType.CERTAINTY_CHANGED.value,
                SemanticFlagType.UNCERTAINTY_CHANGED.value,
            ],
            changed_elements=["uncertainty"],
            reason=(
                f"Epistemic uncertainty removed: original expressed possibility via {orig_ent.uncertainty_markers}, "
                "which was removed in processed statement."
            ),
        )

    # Case 11: Conditionality change
    # e.g. "We can deploy if testing passes" -> "We can deploy and testing passes"
    if orig_ent.conditional_markers and not proc_ent.conditional_markers:
        return SemanticValidationResult(
            status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
            confidence=0.92,
            flags=[SemanticFlagType.CONDITIONALITY_CHANGED.value],
            changed_elements=["conditionality"],
            reason=(
                f"Conditional constraint dropped: original contained conditional marker '{orig_ent.conditional_markers}', "
                "which was lost in processed text."
            ),
        )

    # Case 12: Stylistic contractions, synonyms, or grammar-only normalization
    if is_semantic_equivalent_stylistic_change(orig_clean, proc_clean):
        return SemanticValidationResult(
            status=SemanticValidationStatus.SEMANTICALLY_PRESERVED,
            confidence=0.95,
            flags=[],
            changed_elements=[],
            reason="Differences are purely stylistic, contraction expansion, or grammatical refinement; meaning preserved.",
        )

    # Case 13: High lexical overlap for minor grammatical changes without entity shifts
    orig_words = _PUNCT_AND_SPACE_RE.sub(" ", orig_clean).lower().split()
    proc_words = _PUNCT_AND_SPACE_RE.sub(" ", proc_clean).lower().split()
    if orig_words and proc_words:
        orig_set = set(orig_words)
        proc_set = set(proc_words)
        intersection = orig_set.intersection(proc_set)
        union = orig_set.union(proc_set)
        jaccard = len(intersection) / len(union) if union else 1.0
        if jaccard >= 0.75:
            return SemanticValidationResult(
                status=SemanticValidationStatus.SEMANTICALLY_PRESERVED,
                confidence=0.95,
                flags=[],
                changed_elements=[],
                reason="Minor grammatical or lexical normalization preserving core sentence structure and meaning.",
            )

    # Inconclusive deterministically -> delegate to LLM validation
    return None
