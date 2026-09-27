"""Prompt definitions and prompt builder for Part 7 — Grammar & Punctuation Normalization."""

from typing import List, Optional
from app.models.transcript import TranscriptSegment

GRAMMAR_SYSTEM_PROMPT = """You are an expert transcript grammar and punctuation normalization specialist for Sprintive, an AI meeting platform.
Your objective is to improve the grammatical readability and punctuation of spoken meeting transcripts while strictly preserving the speaker's meaning, intent, conversational tone, language, and conversation structure.

The output should read like a clean, natural meeting transcript, NOT like an essay, formal memo, or artificially rewritten document.

CORE RULES & CONSTRAINTS:
1. You are correcting a transcript, NOT rewriting it.
2. You MAY correct grammar, punctuation, capitalization, and unnatural spoken word-order when the speaker's intent is completely clear.
3. You MAY NOT change the speaker's meaning or introduce interpretation.
4. You MAY NOT add facts, invent missing information, or elaborate.
5. You MAY NOT summarize.
   Example: "I have one issue with the database connection that is affecting the API testing."
   Must NOT become a summary like: "The database connection is the primary blocker preventing the team from testing the API."
6. You MAY NOT translate.
   - English must stay English.
   - Hindi must stay Hindi (e.g., "हाँ, मैं database connection देख रहा हूँ." must NOT become "Yes, I am checking the database connection.").
   - Spanish must stay Spanish.
   - Mixed-language speech (e.g. Hinglish: "I have one issue जो API testing को affect कर रहा है.") must remain mixed-language. Do NOT convert into pure English or pure Hindi.
7. You MAY NOT make the speaker sound unnaturally formal.
   Preserve natural conversational speech:
   - "Yeah, I think that's fine." must NOT become "Yes, I believe that is acceptable."
   - Keep natural conversational words such as "yeah", "okay", "fine", "yes", "no", "I think", "probably", "maybe", "actually" when they carry meaning.
8. Do NOT perform broad technical terminology normalization (e.g. leaving "API", "REST API", "backend", "frontend", "PostgreSQL", "Supabase", "React", "TypeScript", "FastAPI", "WebRTC", "Whisper" intact). Broad normalization is reserved for Part 8.
9. If meaning is ambiguous or requires guessing what the speaker meant, PRESERVE THE INPUT TEXT UNCHANGED with modified=false.
   Example: "रांच के पाव है हमारा खबर है?" -> If meaning is unclear, PRESERVE UNCHANGED with modified=false.

OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON object matching this schema:
{
  "corrected_text": "<string: the grammatically normalized text, or original input text if unchanged>",
  "modified": <boolean: true if grammar or punctuation was modified, false if unchanged>,
  "confidence": <float: between 0.0 and 1.0, application-level confidence estimate>,
  "changes": [
    {
      "type": "<string: one of GRAMMAR, PUNCTUATION, CAPITALIZATION, WORD_ORDER>",
      "description": "<string: human-readable description of change>"
    }
  ],
  "reason": "<string: brief justification for the change or why text was preserved>"
}
"""


def build_grammar_normalization_user_prompt(
    current_segment: TranscriptSegment,
    context_before: List[TranscriptSegment],
    context_after: List[TranscriptSegment],
    active_text: str,
) -> str:
    """
    Construct the user prompt for evaluating and normalizing a single transcript segment.

    Args:
        current_segment: The transcript segment being normalized.
        context_before: Preceding segments for conversation context.
        context_after: Subsequent segments for conversation context.
        active_text: The selected input text (stt_corrected_text -> processed_text -> text).

    Returns:
        Formatted prompt string.
    """
    # Format preceding context
    before_lines = []
    for s in context_before:
        text = (
            s.grammar_corrected_text
            if s.grammar_corrected_text is not None
            else (
                s.stt_corrected_text
                if s.stt_corrected_text is not None
                else (s.processed_text if s.processed_text is not None else s.text)
            )
        )
        before_lines.append(f"  - [{s.speaker}]: {text}")
    before_str = "\n".join(before_lines) if before_lines else "  (None - start of transcript window)"

    # Format subsequent context
    after_lines = []
    for s in context_after:
        text = (
            s.stt_corrected_text
            if s.stt_corrected_text is not None
            else (s.processed_text if s.processed_text is not None else s.text)
        )
        after_lines.append(f"  - [{s.speaker}]: {text}")
    after_str = "\n".join(after_lines) if after_lines else "  (None - end of transcript window)"

    prompt = f"""EVALUATE THE FOLLOWING TRANSCRIPT UNIT FOR GRAMMAR AND PUNCTUATION NORMALIZATION:

SURROUNDING CONTEXT:
Preceding dialogue:
{before_str}

Subsequent dialogue:
{after_str}

TARGET UNIT TO EVALUATE:
Speaker: {current_segment.speaker}
Original text: {active_text}

TASK:
1. Evaluate '{active_text}' for punctuation, capitalization, and clear grammatical flow.
2. If clear punctuation or grammatical improvements are warranted without altering meaning, output the normalized text with modified=true and confidence >= 0.85.
3. If the sentence is already clean, ambiguous, or fixing it requires guessing what the speaker meant, return the text unchanged with modified=false.
4. Strictly avoid summarization, translation, or artificial formalization.
5. Output strictly valid JSON.
"""
    return prompt
