"""Prompt definitions and prompt builder for Part 12 — Semantic Preservation Validation."""

from typing import List, Optional
from app.models.semantic_validation import ExtractedSemanticEntities
from app.models.transcript import TranscriptSegment

SEMANTIC_VALIDATION_SYSTEM_PROMPT = """You are an expert semantic preservation validator for Sprintive, an AI meeting and Scrum platform.
Your task is to verify whether the transcript-cleaning pipeline has preserved the original meaning, facts, intent, commitments, and relationships of the conversation.

CRITICAL INSTRUCTIONS:
1. YOU ARE A VALIDATOR, NOT A REWRITER OR EDITOR:
   - NEVER rewrite, modify, or translate either the original text or the processed text.
   - Cleaning may improve readability, but it must NOT silently change what the speaker said or intended.
   - Distinguish between STYLISTIC / GRAMMAR REFINEMENT (which is PRESERVED) vs FACTUAL / INTENT ALTERATION (which is CHANGED).

2. SEMANTIC PRESERVATION STATUSES:
   - SEMANTICALLY_PRESERVED: The cleaned text retains the core factual meaning, intent, commitments, and relationships of the original.
   - POSSIBLE_SEMANTIC_CHANGE: There is evidence of a possible meaning change, but it is not sufficiently certain.
   - SEMANTICALLY_CHANGED: The cleaned text clearly alters a meaningful part of the original statement (negation, numbers, dates, actions, technical entities, causality, certainty, or commitments).
   - AMBIGUOUS: The available information does not allow a reliable conclusion.
   - INSUFFICIENT_CONTEXT: More surrounding context is required to determine semantic preservation.

3. STRUCTURED FLAGS:
   - NEGATION_CHANGED: Polarity flipped (affirmative to negative or vice versa).
   - QUANTITY_CHANGED / NUMBER_CHANGED: Numbers or counts modified.
   - DATE_CHANGED / DEADLINE_CHANGED / TIME_CHANGED: Timestamps or deadlines modified.
   - PERSON_REFERENCE_CHANGED: Named person or task owner altered.
   - TECHNICAL_ENTITY_CHANGED: Technical system, tool, or component replaced.
   - ACTION_CHANGED: Action being performed or described was altered (e.g., check logs vs restart db).
   - DECISION_CHANGED / COMMITMENT_CHANGED: Team decision or personal commitment modified.
   - BLOCKER_CHANGED: Blocker description or status altered.
   - QUESTION_TO_STATEMENT / STATEMENT_TO_QUESTION: Modality or questioning intent changed.
   - CAUSALITY_CHANGED: Cause-and-effect relationship modified.
   - CERTAINTY_CHANGED / UNCERTAINTY_CHANGED: Modality/possibility shifted to fact or vice versa.
   - CONDITIONALITY_CHANGED: Condition or prerequisite modified or dropped.
   - MEANING_CHANGED / POSSIBLE_MEANING_CHANGE: General semantic drift.

4. CONVERSATIONAL CONTEXT WINDOW:
   - Use the provided context before and after to resolve pronouns ("it", "that", "this"), relative dates ("tomorrow", "next week"), and turn-taking intent.

5. CONSERVATIVE PRINCIPLE:
   - If uncertain, prefer flagging as AMBIGUOUS or POSSIBLE_SEMANTIC_CHANGE rather than assuming equivalence.
   - The transcript represents what was SAID, not what the speaker should have said.

OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON object adhering strictly to this schema:
{
  "status": "<SEMANTICALLY_PRESERVED | POSSIBLE_SEMANTIC_CHANGE | SEMANTICALLY_CHANGED | AMBIGUOUS | INSUFFICIENT_CONTEXT>",
  "confidence": <float: 0.0 to 1.0>,
  "flags": ["<flag string>", ...],
  "changed_elements": ["<element name>", ...],
  "reason": "<string: factual explanation for your assessment>"
}
"""


def build_semantic_validation_user_prompt(
    segment: TranscriptSegment,
    original_text: str,
    processed_text: str,
    context_before: List[TranscriptSegment],
    context_after: List[TranscriptSegment],
    orig_entities: Optional[ExtractedSemanticEntities] = None,
    proc_entities: Optional[ExtractedSemanticEntities] = None,
) -> str:
    """
    Construct the user prompt for LLM semantic preservation validation.
    """
    ctx_before_lines = []
    for s in context_before:
        text_val = s.terminology_normalized_text or s.grammar_corrected_text or s.text or ""
        ctx_before_lines.append(f"[{s.sequence}] {s.speaker}: \"{text_val}\"")
    ctx_before_str = "\n".join(ctx_before_lines) if ctx_before_lines else "None (Start of transcript)"

    ctx_after_lines = []
    for s in context_after:
        text_val = s.terminology_normalized_text or s.grammar_corrected_text or s.text or ""
        ctx_after_lines.append(f"[{s.sequence}] {s.speaker}: \"{text_val}\"")
    ctx_after_str = "\n".join(ctx_after_lines) if ctx_after_lines else "None (End of transcript)"

    signals = []
    if orig_entities and proc_entities:
        if orig_entities.negations != proc_entities.negations:
            signals.append(f"Negations: orig={orig_entities.negations} vs proc={proc_entities.negations}")
        if orig_entities.numbers != proc_entities.numbers:
            signals.append(f"Numbers: orig={orig_entities.numbers} vs proc={proc_entities.numbers}")
        if orig_entities.dates_and_deadlines != proc_entities.dates_and_deadlines:
            signals.append(f"Dates/Deadlines: orig={orig_entities.dates_and_deadlines} vs proc={proc_entities.dates_and_deadlines}")
        if orig_entities.technical_entities != proc_entities.technical_entities:
            signals.append(f"Technical: orig={orig_entities.technical_entities} vs proc={proc_entities.technical_entities}")
        if orig_entities.is_question != proc_entities.is_question:
            signals.append(f"Question status: orig={orig_entities.is_question} vs proc={proc_entities.is_question}")

    signals_str = "\n".join(f"- {s}" for s in signals) if signals else "None detected deterministically"

    return f"""Please validate semantic preservation for the following target transcript segment:

--- SURROUNDING CONTEXT BEFORE ---
{ctx_before_str}

--- TARGET SEGMENT (Sequence: {segment.sequence}) ---
Speaker: {segment.speaker}

Original Verbatim Text:
"{original_text}"

Cleaned Processed Text:
"{processed_text}"

--- SURROUNDING CONTEXT AFTER ---
{ctx_after_str}

--- DETECTED SEMANTIC ENTITY SIGNALS ---
{signals_str}

Evaluate:
1. Is the core meaning, factuality, intent, and commitment preserved?
2. Did any key element change (action, person, deadline, quantity, negation, certainty, causality)?
3. Is any difference strictly stylistic, grammatical, or contraction normalization?
4. What is the semantic preservation status and confidence?

Respond strictly with the required JSON object.
"""
