"""Prompt definitions and prompt builder for Part 9 — Contextual Consistency Check."""

from typing import List, Optional, Set
from app.models.transcript import TranscriptSegment

CONTEXTUAL_VALIDATION_SYSTEM_PROMPT = """You are an expert contextual consistency validator for Sprintive, an AI meeting and Scrum platform.
Your task is to validate whether a transcript segment is logically and contextually consistent with the surrounding conversation.

CRITICAL INSTRUCTIONS:
1. YOU ARE A VALIDATOR, NOT AN EDITOR OR REWRITER.
   - NEVER suggest rewriting, editing, normalizing, or translating any text.
   - The transcript text must remain 100% untouched.
   - Your job is strictly: VALIDATE -> FLAG -> PRESERVE.

2. CLASSIFICATION CATEGORIES:
   - CONSISTENT: The statement makes sense in context, follows logical conversation flow, or represents a normal meeting topic transition.
   - POSSIBLE_INCONSISTENCY: The statement appears problematic, contradictory, mismatched in technical terminology, or a likely processing mistake.
   - AMBIGUOUS: The statement contains unclear or isolated references (e.g. "He told him that it was broken" with no known antecedents). Do not guess or invent identities.
   - INSUFFICIENT_CONTEXT: The surrounding conversation does not provide enough information to determine consistency. Do not guess.

3. FLAG TYPES (when status is POSSIBLE_INCONSISTENCY or AMBIGUOUS):
   - TECHNICAL_CONTEXT_MISMATCH: Technical terms conflict with domain concepts or nearby context (e.g. "React database" instead of a backend database).
   - TERM_INCONSISTENCY: Sudden, unexplained shifts in naming the same concept.
   - TOPIC_DISCONTINUITY: Sudden, jarring break in conversation without conversational transition.
   - REFERENCE_MISMATCH: Impossible or broken references.
   - POSSIBLE_PROCESSING_ERROR: Unlikely phrasing or artifacts suggesting a speech recognition or processing error.
   - CONTRADICTION: Direct contradiction with a nearby statement that is not explained by temporal words.
   - AMBIGUOUS_REFERENCE: Ambiguous pronouns or vague references without antecedents in context.

4. SPECIAL CONTEXTUAL RULES:
   - TOPIC CHANGES ARE NORMAL: Meetings naturally shift topics (e.g., from database debugging to sprint review). A topic change is NOT an error. Mark as CONSISTENT unless the content itself contains an error.
   - CONTRADICTIONS VS TEMPORAL CONTEXT:
     - Direct contradiction: "The database is working." vs "The database is not working." -> POSSIBLE_INCONSISTENCY (CONTRADICTION).
     - Temporal explanation: "The database was not working earlier. The database is working now." -> CONSISTENT (no flag).
   - TECHNICAL MISMATCHES: E.g., "React database connection" -> POSSIBLE_INCONSISTENCY (TECHNICAL_CONTEXT_MISMATCH). Do NOT rewrite to PostgreSQL!
   - AMBIGUOUS PRONOUNS: E.g., "He told him that it was broken." -> AMBIGUOUS (AMBIGUOUS_REFERENCE). Do not invent names.
   - MULTILINGUAL DIALOGUE: Transcripts in Hindi, Spanish, or Hinglish (e.g., "मैं Supabase database use कर रहा हूँ.") must be validated in their natural language without translation.

OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON object adhering strictly to this schema:
{
  "status": "<CONSISTENT | POSSIBLE_INCONSISTENCY | AMBIGUOUS | INSUFFICIENT_CONTEXT>",
  "confidence": <float: 0.0 to 1.0, confidence score for your assessment>,
  "flags": [
    {
      "type": "<TECHNICAL_CONTEXT_MISMATCH | TERM_INCONSISTENCY | TOPIC_DISCONTINUITY | REFERENCE_MISMATCH | POSSIBLE_PROCESSING_ERROR | CONTRADICTION | AMBIGUOUS_REFERENCE>",
      "description": "<string: brief, factual description of the issue>"
    }
  ],
  "reason": "<string: brief rationale explaining your validation decision>"
}
"""


def build_contextual_validation_user_prompt(
    current_segment: TranscriptSegment,
    context_before: List[TranscriptSegment],
    context_after: List[TranscriptSegment],
    active_text: str,
    known_entities: Optional[Set[str]] = None,
) -> str:
    """
    Construct the user prompt for evaluating contextual consistency of a segment.

    Args:
        current_segment: The transcript segment being validated.
        context_before: Preceding segments for local conversation context (up to 3).
        context_after: Subsequent segments for local conversation context (up to 3).
        active_text: The latest active text of the current segment.
        known_entities: Optional set of tracked entities in the conversation.

    Returns:
        Formatted prompt string.
    """
    before_lines = []
    for s in context_before:
        text = (
            s.terminology_normalized_text
            or s.grammar_corrected_text
            or s.stt_corrected_text
            or s.processed_text
            or s.text
        )
        before_lines.append(f'  [Seq {s.sequence}] {s.speaker}: "{text}"')

    after_lines = []
    for s in context_after:
        text = (
            s.terminology_normalized_text
            or s.grammar_corrected_text
            or s.stt_corrected_text
            or s.processed_text
            or s.text
        )
        after_lines.append(f'  [Seq {s.sequence}] {s.speaker}: "{text}"')

    before_str = "\n".join(before_lines) if before_lines else "  (None - start of meeting)"
    after_str = "\n".join(after_lines) if after_lines else "  (None - end of meeting)"
    entities_str = ", ".join(sorted(known_entities)) if known_entities else "None tracked"

    return f"""Contextual Consistency Validation Request:

--- Context Before (up to 3 preceding utterances) ---
{before_str}

--- Target Utterance To Validate ---
  [Seq {current_segment.sequence}] {current_segment.speaker}: "{active_text}"

--- Context After (up to 3 subsequent utterances) ---
{after_str}

--- Tracked Meeting Entities ---
  {entities_str}

Evaluate whether Seq {current_segment.sequence} is contextually and logically consistent with the surrounding conversation. Remember: DO NOT REWRITE OR MODIFY ANY TEXT."""
