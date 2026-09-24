"""Prompt definitions and prompt builder for Part 11 — Language Preservation Check."""

from typing import List, Optional
from app.models.language_validation import SegmentLanguageProfile
from app.models.transcript import TranscriptSegment

LANGUAGE_VALIDATION_SYSTEM_PROMPT = """You are an expert multilingual and code-switching language preservation validator for Sprintive, an AI meeting and Scrum platform.
Your task is to verify whether the downstream transcript-cleaning pipeline has preserved the original language characteristics, multilingual expressions, code-switching, and technical terminology of the speaker's dialogue.

CRITICAL INSTRUCTIONS:
1. YOU ARE A VALIDATOR, NOT A TRANSLATOR OR REWRITER:
   - NEVER translate or suggest translating the transcript into English.
   - NEVER modify or rewrite either the original text or the processed text.
   - The objective is strictly: PRESERVE THE SPEAKER'S INTENDED LANGUAGE USAGE. It is NOT to convert everything to English.
   - Multi-language conversations (English, Hindi, Spanish, Hinglish, Spanglish) are completely normal and valid.

2. PRESERVATION STATUS CATEGORIES:
   - PRESERVED: The language characteristics of original and processed text are substantially consistent (including punctuation, grammar, or technical term casing fixes).
   - POSSIBLE_LANGUAGE_CHANGE: Some evidence of unintended language modification or partial phrase loss, but not fully certain.
   - LANGUAGE_CHANGED: The processed text clearly translates, replaces, or removes meaningful non-English language content or loses mixed-language code-switching.
   - AMBIGUOUS: Competing interpretations; cannot reliably determine whether difference is intentional or a language change.
   - INSUFFICIENT_CONTEXT: Not enough linguistic information to evaluate language preservation.

3. STRUCTURED FLAGS:
   - UNEXPECTED_TRANSLATION: Non-English words or phrases were translated into English.
   - LANGUAGE_REMOVED: Non-English content was deleted or omitted.
   - LANGUAGE_ADDED: Unexpected language content was introduced.
   - CODE_SWITCHING_CHANGED: Multilingual turn or code-switch patterns were disrupted.
   - MIXED_LANGUAGE_LOST: A mixed-language utterance was flattened into a single language (e.g. pure English).
   - PRIMARY_LANGUAGE_CHANGED: The predominant language switched unexpectedly.
   - NON_ENGLISH_CONTENT_MODIFIED: Meaningful non-English expressions were altered or removed.
   - POSSIBLE_LANGUAGE_DETECTION_ERROR: Conflicting or uncertain language detection.

4. TECHNICAL TERMINOLOGY PROTECTION:
   - Technical terms (e.g. database, connection, Supabase, PostgreSQL, React, API, sprint, PR) inside Hindi, Spanish, or mixed-language speech are legitimate technical vocabulary.
   - Do NOT treat technical English terms as evidence of unwanted language replacement or translation.

5. PUNCTUATION & CAPITALIZATION NORMALIZATION:
   - Punctuation adjustments (e.g., adding commas, full stops, question marks, Devanagari danda ।) and casing corrections without altering spoken words are valid normalizations and must be marked PRESERVED.

OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON object adhering strictly to this schema:
{
  "status": "<PRESERVED | POSSIBLE_LANGUAGE_CHANGE | LANGUAGE_CHANGED | AMBIGUOUS | INSUFFICIENT_CONTEXT>",
  "confidence": <float: 0.0 to 1.0>,
  "flags": ["<flag string>", ...],
  "original_languages": ["<language code>", ...],
  "processed_languages": ["<language code>", ...],
  "original_primary_language": "<language code or null>",
  "processed_primary_language": "<language code or null>",
  "is_original_mixed_language": <true | false>,
  "is_processed_mixed_language": <true | false>,
  "reason": "<string: factual explanation for your assessment>"
}
"""


def build_language_validation_user_prompt(
    segment: TranscriptSegment,
    original_text: str,
    processed_text: str,
    orig_profile: SegmentLanguageProfile,
    proc_profile: SegmentLanguageProfile,
    known_tech_terms: Optional[List[str]] = None,
) -> str:
    """
    Construct the user prompt for LLM language preservation validation.
    """
    tech_str = ", ".join(known_tech_terms[:20]) if known_tech_terms else "None provided"

    return f"""Please validate language preservation for the following transcript segment:

Speaker: {segment.speaker}
Sequence ID: {segment.sequence}

--- ORIGINAL TEXT (verbatim spoken dialogue) ---
"{original_text}"

Original Detected Language Profile:
- Primary Language: {orig_profile.primary_language}
- Languages Detected: {orig_profile.languages_detected}
- Mixed Language / Code-Switching: {orig_profile.is_mixed_language}
- Confidence: {orig_profile.language_confidence:.2f}

--- PROCESSED TEXT (after pipeline cleaning stages) ---
"{processed_text}"

Processed Detected Language Profile:
- Primary Language: {proc_profile.primary_language}
- Languages Detected: {proc_profile.languages_detected}
- Mixed Language / Code-Switching: {proc_profile.is_mixed_language}
- Confidence: {proc_profile.language_confidence:.2f}

Relevant Technical Terms (do not count as English translation if present in non-English dialogue):
{tech_str}

Evaluate:
1. Are the original languages and code-switching preserved?
2. Was any meaningful non-English phrase translated or removed?
3. Is any apparent difference merely punctuation, capitalization, or technical terminology normalization?
4. What is the preservation status and confidence?

Respond strictly with the required JSON object.
"""
