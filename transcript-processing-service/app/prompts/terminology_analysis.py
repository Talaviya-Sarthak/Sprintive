"""Prompt definitions and prompt builder for Part 8 — Technical Terminology Disambiguation."""

from typing import List, Optional
from app.models.transcript import TranscriptSegment

TERMINOLOGY_SYSTEM_PROMPT = """You are an expert technical terminology disambiguation specialist for Sprintive, an AI meeting and Scrum platform.
Your task is to analyze candidate terms in spoken meeting transcripts to determine whether a word or phrase is being used as a specific technical software/Scrum concept or as ordinary colloquial language.

CRITICAL INSTRUCTIONS:
1. Distinguish between technical software/Scrum terms and ordinary colloquial words:
   - "react":
     - Technical: React (frontend JavaScript library, components, UI, hooks, state, etc.) -> is_technical=true, canonical_term="React"
     - Non-technical: English verb to react, behave, or respond (e.g., "How did he react to the issue?", "They reacted quickly.") -> is_technical=false, canonical_term=null
   - "express":
     - Technical: Express (Node.js web framework, backend API server) -> is_technical=true, canonical_term="Express"
     - Non-technical: English verb to express feelings, opinions, or fast delivery -> is_technical=false, canonical_term=null
   - "sprint":
     - Technical: Scrum sprint, sprint planning, sprint review, 2-week cycle -> is_technical=true, canonical_term="sprint" or canonical Scrum capitalization
     - Non-technical: Fast run, physical sprint -> is_technical=false
2. If the context does not clearly establish technical usage, return is_technical=false.
3. PREFER FALSE NEGATIVES over incorrect technical normalization.
4. DO NOT rewrite, paraphrase, summarize, or translate the sentence.

OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON object adhering strictly to this schema:
{
  "term": "<string: the candidate term evaluated>",
  "is_technical": <boolean: true if used as a technical/scrum concept, false otherwise>,
  "canonical_term": "<string or null: the canonical form if is_technical is true, else null>",
  "confidence": <float: between 0.0 and 1.0, application-level confidence estimate>,
  "reason": "<string: brief explanation based on context>"
}
"""


def build_terminology_disambiguation_user_prompt(
    term: str,
    canonical_candidate: str,
    current_segment: TranscriptSegment,
    context_before: List[TranscriptSegment],
    context_after: List[TranscriptSegment],
    active_text: str,
) -> str:
    """
    Construct the user prompt for evaluating whether a candidate term is technical in context.

    Args:
        term: The candidate word or phrase found in the transcript.
        canonical_candidate: The potential canonical technical term.
        current_segment: The transcript segment being processed.
        context_before: Preceding segments for conversation context.
        context_after: Subsequent segments for conversation context.
        active_text: The active text of the current segment.

    Returns:
        Formatted prompt string.
    """
    before_lines = []
    for s in context_before:
        text = (
            s.terminology_normalized_text
            if s.terminology_normalized_text is not None
            else (
                s.grammar_corrected_text
                if s.grammar_corrected_text is not None
                else (
                    s.stt_corrected_text
                    if s.stt_corrected_text is not None
                    else (s.processed_text if s.processed_text is not None else s.text)
                )
            )
        )
        before_lines.append(f"  - [{s.speaker}]: {text}")
    before_str = "\n".join(before_lines) if before_lines else "  (None - start of transcript window)"

    after_lines = []
    for s in context_after:
        text = (
            s.grammar_corrected_text
            if s.grammar_corrected_text is not None
            else (
                s.stt_corrected_text
                if s.stt_corrected_text is not None
                else (s.processed_text if s.processed_text is not None else s.text)
            )
        )
        after_lines.append(f"  - [{s.speaker}]: {text}")
    after_str = "\n".join(after_lines) if after_lines else "  (None - end of transcript window)"

    prompt = f"""EVALUATE CANDIDATE TERM FOR TECHNICAL DISAMBIGUATION:

CANDIDATE TERM: "{term}"
POTENTIAL CANONICAL TERM: "{canonical_candidate}"

SURROUNDING CONTEXT:
Preceding dialogue:
{before_str}

Subsequent dialogue:
{after_str}

TARGET SENTENCE:
Speaker: {current_segment.speaker}
Sentence: "{active_text}"

TASK:
Determine if the occurrence of "{term}" in the target sentence refers specifically to the technical/Scrum concept ("{canonical_candidate}") or is used as ordinary English.
Return strictly valid JSON.
"""
    return prompt
