"""Prompt definitions and prompt builder for Part 6 — STT Error Correction."""

import json
from typing import List, Optional
from app.config.terminology import format_terms_for_prompt
from app.models.transcript import TranscriptSegment

SYSTEM_PROMPT = """You are an expert Speech-to-Text (STT) error correction specialist for Sprintive, an AI meeting and Scrum platform.
Your objective is to correct obvious speech-to-text acoustic misrecognitions in meeting dialogue while strictly preserving the original meaning, language, speaker, and intent.

STT ERROR CATEGORIES:
- PHONETIC_MISRECOGNITION: Acoustic mishearing of sounds or words (e.g. "date abase" for "database", "sink" for "sync").
- TECHNICAL_TERM_MISRECOGNITION: Technical software/scrum terms misheard by STT (e.g. "rest a p i" for "REST API").
- WORD_BOUNDARY_ERROR: Words erroneously split or merged by STT acoustic segmentation.
- HOMOPHONE_OR_SIMILAR_SOUND: Confusion between sound-alike words given the software/meeting context.
- PARTIAL_WORD_ERROR: Cut-off or clipped acoustic recognition artifacts.
- CONTEXTUAL_RECOGNITION_ERROR: Word recognitions that make no acoustic/semantic sense in the meeting context.
- UNKNOWN: Clear STT error of unclassified acoustic nature.

CRITICAL CONSTRAINTS AND SAFETY RULES:
1. ONLY correct actual speech-to-text recognition errors.
2. DO NOT correct grammar, adjust syntax, or improve writing style.
   Example: "I will start my quick giving a quick update on the back end work." -> PRESERVE UNCHANGED. Do NOT fix to "I will start by giving...".
3. DO NOT translate between languages.
   - English must stay English.
   - Hindi must stay Hindi (e.g., "हाँ, मैं database connection देख रहा हूँ." -> DO NOT translate to English).
   - Spanish must stay Spanish.
   - Mixed-language / Hinglish must remain mixed-language (e.g., "I have one issue जो API testing को affect कर रहा है." -> PRESERVE mixed language).
4. DO NOT perform broad terminology normalization (e.g., leaving "back end" vs "backend" alone unless it is an acoustic STT error).
5. DO NOT guess or hallucinate on ambiguous speech.
   Example: "रांच के पाव है हमारा खबर है?" -> If intended words cannot be determined with certainty, PRESERVE UNCHANGED with modified=false.
6. PREFER FALSE NEGATIVES over incorrect transcript alteration.
7. GOLDEN RULE: If you are not highly confident (confidence >= 0.90) that the text contains an STT recognition error, return the original text unchanged with modified=false.

OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON object adhering strictly to this schema:
{
  "corrected_text": "<string: the corrected text if modified, or original text if unchanged>",
  "modified": <boolean: true if corrected, false if unchanged>,
  "confidence": <float: between 0.0 and 1.0, application-level confidence estimate>,
  "error_type": "<string or null: one of PHONETIC_MISRECOGNITION, TECHNICAL_TERM_MISRECOGNITION, WORD_BOUNDARY_ERROR, HOMOPHONE_OR_SIMILAR_SOUND, PARTIAL_WORD_ERROR, CONTEXTUAL_RECOGNITION_ERROR, UNKNOWN, or null if modified is false>",
  "reason": "<string: brief explanation for the decision>"
}
"""


def build_stt_correction_user_prompt(
    current_segment: TranscriptSegment,
    context_before: List[TranscriptSegment],
    context_after: List[TranscriptSegment],
    custom_terms: Optional[List[str]] = None,
) -> str:
    """
    Construct the user prompt for evaluating a single transcript segment.

    Args:
        current_segment: The transcript segment to analyze and potentially correct.
        context_before: Preceding segments for conversation context.
        context_after: Subsequent segments for conversation context.
        custom_terms: Optional list of project technical terms to supplement default vocabulary.

    Returns:
        Formatted prompt string.
    """
    terms_str = ", ".join(custom_terms) if custom_terms else format_terms_for_prompt()

    # Format preceding context
    before_lines = []
    for s in context_before:
        text = s.processed_text if s.processed_text is not None else s.text
        before_lines.append(f"  - [{s.speaker}]: {text}")
    before_str = "\n".join(before_lines) if before_lines else "  (None - start of transcript window)"

    # Format subsequent context
    after_lines = []
    for s in context_after:
        text = s.processed_text if s.processed_text is not None else s.text
        after_lines.append(f"  - [{s.speaker}]: {text}")
    after_str = "\n".join(after_lines) if after_lines else "  (None - end of transcript window)"

    target_text = (
        current_segment.processed_text
        if current_segment.processed_text is not None
        else current_segment.text
    )

    prompt = f"""EVALUATE THE FOLLOWING TRANSCRIPT UNIT FOR STT RECOGNITION ERRORS:

PROJECT TECHNICAL VOCABULARY (Contextual reference only; do not normalize terms broadly):
{terms_str}

SURROUNDING CONTEXT:
Preceding dialogue:
{before_str}

Subsequent dialogue:
{after_str}

TARGET UNIT TO EVALUATE:
Speaker: {current_segment.speaker}
Original text: {target_text}

TASK:
1. Determine if '{target_text}' contains an obvious acoustic speech-to-text recognition error.
2. If it does with high confidence (>= 0.90), output the minimally corrected text fixing ONLY the acoustic error, with modified=true.
3. If it is grammatically unusual, colloquial, ambiguous, or normal speech, return the original text unchanged with modified=false.
4. Output strictly valid JSON.
"""
    return prompt
