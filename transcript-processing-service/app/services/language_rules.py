"""Deterministic language preservation rules and checks for Part 11."""

import re
import string
from typing import List, Optional, Set, Tuple
from app.config.language import (
    DEVANAGARI_REGEX,
    HINGLISH_WORDS,
    LANG_EN,
    LANG_ES,
    LANG_HI,
    SPANISH_SPECIAL_CHAR_REGEX,
    SPANISH_WORDS,
)
from app.config.terminology import CANONICAL_TECHNICAL_TERMS, TECHNICAL_TERMS
from app.models.language_validation import (
    LanguageFlagType,
    LanguagePreservationStatus,
    LanguageValidationResult,
    SegmentLanguageProfile,
)
from app.models.transcript import TranscriptSegment
from app.services.language_detector import _tokenize

_DEVANAGARI_RE = re.compile(DEVANAGARI_REGEX)
_SPANISH_CHAR_RE = re.compile(SPANISH_SPECIAL_CHAR_REGEX)
_PUNCT_AND_SPACE_RE = re.compile(r"[\s\.,!?;:—–\-\"'\(\)\[\]{}।]+", re.UNICODE)


def select_input_text(segment: TranscriptSegment) -> str:
    """
    Select the active text for language preservation validation using strict priority hierarchy:
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


def normalize_for_comparison(text: str) -> str:
    """Normalize text by stripping whitespace, punctuation, and lowercasing."""
    if not text:
        return ""
    return _PUNCT_AND_SPACE_RE.sub("", text).lower()


def is_formatting_or_punctuation_only_change(orig_text: str, proc_text: str) -> bool:
    """
    Check if the processed text differs from the original ONLY by punctuation,
    casing, or spacing.
    """
    orig_norm = normalize_for_comparison(orig_text)
    proc_norm = normalize_for_comparison(proc_text)
    return orig_norm != "" and orig_norm == proc_norm


def extract_non_english_tokens(tokens: List[str]) -> Tuple[Set[str], Set[str]]:
    """
    Extract sets of Hindi tokens (Devanagari or Hinglish) and Spanish tokens from token list.
    """
    hindi_tokens: Set[str] = set()
    spanish_tokens: Set[str] = set()

    for tok in tokens:
        if _DEVANAGARI_RE.search(tok) or tok in HINGLISH_WORDS:
            hindi_tokens.add(tok)
        if _SPANISH_CHAR_RE.search(tok) or tok in SPANISH_WORDS:
            spanish_tokens.add(tok)

    return hindi_tokens, spanish_tokens


def check_deterministic_language_preservation(
    orig_text: str,
    proc_text: str,
    orig_profile: SegmentLanguageProfile,
    proc_profile: SegmentLanguageProfile,
) -> Optional[LanguageValidationResult]:
    """
    Perform deterministic comparison between original text and processed text.

    Returns LanguageValidationResult if a decisive deterministic conclusion can be made,
    or None if ambiguous / LLM escalation is required.
    """
    orig_clean = orig_text.strip()
    proc_clean = proc_text.strip()

    # Case 0: Empty or insufficient context
    if not orig_clean or not proc_clean:
        return LanguageValidationResult(
            status=LanguagePreservationStatus.INSUFFICIENT_CONTEXT,
            confidence=0.5,
            flags=[],
            original_languages=orig_profile.languages_detected,
            processed_languages=proc_profile.languages_detected,
            original_primary_language=orig_profile.primary_language,
            processed_primary_language=proc_profile.primary_language,
            is_original_mixed_language=orig_profile.is_mixed_language,
            is_processed_mixed_language=proc_profile.is_mixed_language,
            reason="Insufficient textual content for language validation.",
        )

    # Case 1: Identical verbatim text
    if orig_clean == proc_clean:
        return LanguageValidationResult(
            status=LanguagePreservationStatus.PRESERVED,
            confidence=0.98,
            flags=[],
            original_languages=orig_profile.languages_detected,
            processed_languages=proc_profile.languages_detected,
            original_primary_language=orig_profile.primary_language,
            processed_primary_language=proc_profile.primary_language,
            is_original_mixed_language=orig_profile.is_mixed_language,
            is_processed_mixed_language=proc_profile.is_mixed_language,
            reason="Original text and processed text are identical; language characteristics are fully preserved.",
        )

    # Case 2: Punctuation, capitalization, and whitespace changes only (Parts 7/8 normalization)
    if is_formatting_or_punctuation_only_change(orig_clean, proc_clean):
        return LanguageValidationResult(
            status=LanguagePreservationStatus.PRESERVED,
            confidence=0.98,
            flags=[],
            original_languages=orig_profile.languages_detected,
            processed_languages=proc_profile.languages_detected,
            original_primary_language=orig_profile.primary_language,
            processed_primary_language=proc_profile.primary_language,
            is_original_mixed_language=orig_profile.is_mixed_language,
            is_processed_mixed_language=proc_profile.is_mixed_language,
            reason="Differences are solely punctuation, spacing, or capitalization normalization; language preserved.",
        )

    # Check script transitions
    orig_has_devanagari = bool(_DEVANAGARI_RE.search(orig_clean))
    proc_has_devanagari = bool(_DEVANAGARI_RE.search(proc_clean))

    # Case 3: Accidental Translation / Devanagari Script Drop
    # E.g. "हाँ बोल, बाद में discuss करते हैं." -> "Yes, speak. We will discuss it later."
    if orig_has_devanagari and not proc_has_devanagari:
        flags = [
            LanguageFlagType.UNEXPECTED_TRANSLATION.value,
            LanguageFlagType.NON_ENGLISH_CONTENT_MODIFIED.value,
        ]
        if orig_profile.is_mixed_language:
            flags.append(LanguageFlagType.MIXED_LANGUAGE_LOST.value)
        if orig_profile.primary_language != proc_profile.primary_language:
            flags.append(LanguageFlagType.PRIMARY_LANGUAGE_CHANGED.value)

        return LanguageValidationResult(
            status=LanguagePreservationStatus.LANGUAGE_CHANGED,
            confidence=0.96,
            flags=flags,
            original_languages=orig_profile.languages_detected,
            processed_languages=proc_profile.languages_detected,
            original_primary_language=orig_profile.primary_language,
            processed_primary_language=proc_profile.primary_language,
            is_original_mixed_language=orig_profile.is_mixed_language,
            is_processed_mixed_language=proc_profile.is_mixed_language,
            reason="Devanagari script in original text was removed or translated into Latin script.",
        )

    # Case 4: Unexpected Language Added
    # E.g. English text suddenly gained Devanagari
    if not orig_has_devanagari and proc_has_devanagari:
        return LanguageValidationResult(
            status=LanguagePreservationStatus.LANGUAGE_CHANGED,
            confidence=0.95,
            flags=[LanguageFlagType.LANGUAGE_ADDED.value],
            original_languages=orig_profile.languages_detected,
            processed_languages=proc_profile.languages_detected,
            original_primary_language=orig_profile.primary_language,
            processed_primary_language=proc_profile.primary_language,
            is_original_mixed_language=orig_profile.is_mixed_language,
            is_processed_mixed_language=proc_profile.is_mixed_language,
            reason="Devanagari script was unexpectedly introduced into text that did not contain it.",
        )

    # Case 5: Token-level language loss / translation in Latin script
    orig_tokens = _tokenize(orig_clean)
    proc_tokens = _tokenize(proc_clean)
    orig_hi, orig_es = extract_non_english_tokens(orig_tokens)
    proc_hi, proc_es = extract_non_english_tokens(proc_tokens)

    # 5a. Spanish translated to English or Spanish tokens lost
    # E.g. "Sí, podemos revisar el problema mañana." -> "Yes, we can review the problem tomorrow."
    if len(orig_es) >= 2 and len(proc_es) == 0:
        flags = [
            LanguageFlagType.UNEXPECTED_TRANSLATION.value,
            LanguageFlagType.NON_ENGLISH_CONTENT_MODIFIED.value,
        ]
        if orig_profile.is_mixed_language and not proc_profile.is_mixed_language:
            flags.append(LanguageFlagType.MIXED_LANGUAGE_LOST.value)
        if orig_profile.primary_language != proc_profile.primary_language:
            flags.append(LanguageFlagType.PRIMARY_LANGUAGE_CHANGED.value)

        return LanguageValidationResult(
            status=LanguagePreservationStatus.LANGUAGE_CHANGED,
            confidence=0.95,
            flags=flags,
            original_languages=orig_profile.languages_detected,
            processed_languages=proc_profile.languages_detected,
            original_primary_language=orig_profile.primary_language,
            processed_primary_language=proc_profile.primary_language,
            is_original_mixed_language=orig_profile.is_mixed_language,
            is_processed_mixed_language=proc_profile.is_mixed_language,
            reason="Spanish vocabulary was replaced or translated into English.",
        )

    # 5b. Hinglish tokens lost / translated
    # E.g. "अरे एक minute बोल बाद ले." -> "Hey, speak later."
    if len(orig_hi) >= 2 and len(proc_hi) == 0:
        flags = [
            LanguageFlagType.UNEXPECTED_TRANSLATION.value,
            LanguageFlagType.NON_ENGLISH_CONTENT_MODIFIED.value,
        ]
        if orig_profile.is_mixed_language and not proc_profile.is_mixed_language:
            flags.append(LanguageFlagType.MIXED_LANGUAGE_LOST.value)
        if orig_profile.primary_language != proc_profile.primary_language:
            flags.append(LanguageFlagType.PRIMARY_LANGUAGE_CHANGED.value)

        return LanguageValidationResult(
            status=LanguagePreservationStatus.LANGUAGE_CHANGED,
            confidence=0.95,
            flags=flags,
            original_languages=orig_profile.languages_detected,
            processed_languages=proc_profile.languages_detected,
            original_primary_language=orig_profile.primary_language,
            processed_primary_language=proc_profile.primary_language,
            is_original_mixed_language=orig_profile.is_mixed_language,
            is_processed_mixed_language=proc_profile.is_mixed_language,
            reason="Hindi tokens were replaced or translated into English.",
        )

    # 5c. Mixed-language lost: original was mixed (e.g. "API ka issue अभी solve नहीं हुआ.") -> "The API issue has not been resolved yet."
    if orig_profile.is_mixed_language and not proc_profile.is_mixed_language:
        flags = [
            LanguageFlagType.MIXED_LANGUAGE_LOST.value,
            LanguageFlagType.UNEXPECTED_TRANSLATION.value,
            LanguageFlagType.NON_ENGLISH_CONTENT_MODIFIED.value,
        ]
        return LanguageValidationResult(
            status=LanguagePreservationStatus.LANGUAGE_CHANGED,
            confidence=0.94,
            flags=flags,
            original_languages=orig_profile.languages_detected,
            processed_languages=proc_profile.languages_detected,
            original_primary_language=orig_profile.primary_language,
            processed_primary_language=proc_profile.primary_language,
            is_original_mixed_language=orig_profile.is_mixed_language,
            is_processed_mixed_language=proc_profile.is_mixed_language,
            reason="The non-English portion of the original mixed-language statement appears to have been translated into English.",
        )

    # 5d. Unexpected language added to Latin text (e.g. English gained Spanish or Hindi words)
    if orig_profile.primary_language == LANG_EN and not orig_profile.is_mixed_language:
        if len(proc_es) >= 2 or len(proc_hi) >= 2 or proc_has_devanagari:
            return LanguageValidationResult(
                status=LanguagePreservationStatus.LANGUAGE_CHANGED,
                confidence=0.92,
                flags=[LanguageFlagType.LANGUAGE_ADDED.value],
                original_languages=orig_profile.languages_detected,
                processed_languages=proc_profile.languages_detected,
                original_primary_language=orig_profile.primary_language,
                processed_primary_language=proc_profile.primary_language,
                is_original_mixed_language=orig_profile.is_mixed_language,
                is_processed_mixed_language=proc_profile.is_mixed_language,
                reason="Unexpected non-English words were introduced into previously English speech.",
            )

    # Case 6: Both original and processed retain exact language profile and core non-English tokens
    if (
        orig_profile.primary_language == proc_profile.primary_language
        and orig_profile.is_mixed_language == proc_profile.is_mixed_language
        and set(orig_profile.languages_detected) == set(proc_profile.languages_detected)
    ):
        # Verify that non-English tokens were not significantly reduced
        if orig_hi and (len(proc_hi) >= len(orig_hi) * 0.7):
            return LanguageValidationResult(
                status=LanguagePreservationStatus.PRESERVED,
                confidence=0.95,
                flags=[],
                original_languages=orig_profile.languages_detected,
                processed_languages=proc_profile.languages_detected,
                original_primary_language=orig_profile.primary_language,
                processed_primary_language=proc_profile.primary_language,
                is_original_mixed_language=orig_profile.is_mixed_language,
                is_processed_mixed_language=proc_profile.is_mixed_language,
                reason="Original and processed text have matching language profiles and retain core language tokens.",
            )
        if orig_es and (len(proc_es) >= len(orig_es) * 0.7):
            return LanguageValidationResult(
                status=LanguagePreservationStatus.PRESERVED,
                confidence=0.95,
                flags=[],
                original_languages=orig_profile.languages_detected,
                processed_languages=proc_profile.languages_detected,
                original_primary_language=orig_profile.primary_language,
                processed_primary_language=proc_profile.primary_language,
                is_original_mixed_language=orig_profile.is_mixed_language,
                is_processed_mixed_language=proc_profile.is_mixed_language,
                reason="Original and processed text retain Spanish language tokens and structure.",
            )
        if not orig_hi and not orig_es and orig_profile.primary_language == LANG_EN:
            # Check lexical overlap; if substantial rewrite occurred, delegate to LLM
            orig_set = set(orig_tokens)
            proc_set = set(proc_tokens)
            intersection = orig_set.intersection(proc_set)
            union = orig_set.union(proc_set)
            jaccard = len(intersection) / len(union) if union else 1.0
            if jaccard >= 0.75:
                return LanguageValidationResult(
                    status=LanguagePreservationStatus.PRESERVED,
                    confidence=0.95,
                    flags=[],
                    original_languages=orig_profile.languages_detected,
                    processed_languages=proc_profile.languages_detected,
                    original_primary_language=orig_profile.primary_language,
                    processed_primary_language=proc_profile.primary_language,
                    is_original_mixed_language=orig_profile.is_mixed_language,
                    is_processed_mixed_language=proc_profile.is_mixed_language,
                    reason="English language characteristics and core vocabulary are preserved across processing stages.",
                )
            return None

    # Inconclusive deterministically -> delegate to LLM validation
    return None
