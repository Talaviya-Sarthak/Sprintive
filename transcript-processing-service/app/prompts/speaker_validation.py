"""Prompt definitions and prompt builder for Part 10 — Speaker Attribution Validation."""

from typing import List, Optional, Set
from app.models.transcript import TranscriptSegment

SPEAKER_VALIDATION_SYSTEM_PROMPT = """You are an expert speaker attribution validator for Sprintive, an AI meeting and Scrum platform.
Your task is to validate whether a transcript segment is plausibly attributed to the labeled speaker based on surrounding conversational context, syntactic continuity, and turn-taking patterns.

CRITICAL INSTRUCTIONS:
1. YOU ARE A VALIDATOR, NOT A REWRITER OR EDITOR.
   - NEVER modify or suggest modifying any transcript text.
   - NEVER overwrite or change the original speaker label.
   - Your task is strictly: VALIDATE -> FLAG -> SUGGEST ALTERNATIVE (only if justified) -> PRESERVE.

2. TEXT-ONLY EVIDENCE LIMITATION:
   - Voice audio and acoustic diarization embeddings are not available.
   - You must evaluate whether transcript context SUPPORTS the attribution, not claim proof of physical voice identity.
   - Distinguish between EVIDENCE OF INCONSISTENCY and PROOF OF IDENTITY.

3. VALIDATION STATUSES:
   - VALID: Attribution is plausible and consistent with conversation turn-taking.
   - POSSIBLE_MISATTRIBUTION: Clear evidence of misattribution (e.g. completing another speaker's unfinished sentence). Use conservatively.
   - AMBIGUOUS: Competing interpretations, cannot determine attribution with confidence.
   - INSUFFICIENT_CONTEXT: Not enough surrounding dialogue to evaluate attribution.

4. SPEAKER FLAGS:
   - SPEAKER_CONTINUITY_BREAK: Disconnected jump in speaker dialogue.
   - POSSIBLE_FRAGMENT_MISATTRIBUTION: Segment appears to complete another speaker's unfinished sentence.
   - UNEXPECTED_TURN_TRANSITION: Abrupt, jarring speaker turn.
   - DIRECT_RESPONSE_MISMATCH: Response does not match the addressed speaker.
   - REFERENCE_TO_PREVIOUS_SPEAKER: Mention of a speaker mistakenly treated as attribution.
   - POSSIBLE_SPEAKER_SWAP: Two speakers appeared to have their labels swapped.
   - INSUFFICIENT_CONTEXT: Context too sparse.
   - AMBIGUOUS_ATTRIBUTION: Cannot resolve speaker ambiguity.

5. SPECIAL CONVERSATIONAL RULES:
   - TOPIC OWNERSHIP != SPEAKER IDENTITY: A speaker mentioning another person's task (e.g., "Harshit is working on the database") does not mean Harshit must speak next.
   - NORMAL TOPIC CHANGES ARE VALID: Speakers can naturally change topics or introduce new updates.
   - SUGGESTED SPEAKER RESTRICTION: Any suggested_speaker MUST exist in the provided list of known speakers in the conversation. Never invent external names.
   - MULTILINGUAL DIALOGUE: Hindi, Spanish, or mixed-language dialogue must be evaluated directly without translation.

OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON object adhering strictly to this schema:
{
  "status": "<VALID | POSSIBLE_MISATTRIBUTION | AMBIGUOUS | INSUFFICIENT_CONTEXT>",
  "confidence": <float: 0.0 to 1.0>,
  "flags": [
    "<SPEAKER_CONTINUITY_BREAK | POSSIBLE_FRAGMENT_MISATTRIBUTION | UNEXPECTED_TURN_TRANSITION | DIRECT_RESPONSE_MISMATCH | REFERENCE_TO_PREVIOUS_SPEAKER | POSSIBLE_SPEAKER_SWAP | INSUFFICIENT_CONTEXT | AMBIGUOUS_ATTRIBUTION>"
  ],
  "suggested_speaker": "<string or null: must be one of the known speakers, or null>",
  "reason": "<string: brief, factual rationale for your validation assessment>"
}
"""


def build_speaker_validation_user_prompt(
    current_segment: TranscriptSegment,
    context_before: List[TranscriptSegment],
    context_after: List[TranscriptSegment],
    active_text: str,
    known_speakers: Set[str],
) -> str:
    """
    Construct the user prompt for evaluating speaker attribution of a target segment.

    Args:
        current_segment: The transcript segment being validated.
        context_before: Preceding segments for local conversation context (up to 3).
        context_after: Subsequent segments for local conversation context (up to 3).
        active_text: The active text of the current segment.
        known_speakers: Set of all known speaker names in the transcript.

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

    before_str = "\n".join(before_lines) if before_lines else "  (None - start of transcript)"
    after_str = "\n".join(after_lines) if after_lines else "  (None - end of transcript)"
    speakers_str = ", ".join(sorted(known_speakers)) if known_speakers else "Unknown"

    return f"""Speaker Attribution Validation Request:

--- Context Before (up to 3 preceding utterances) ---
{before_str}

--- Target Utterance To Validate ---
  [Seq {current_segment.sequence}] Attributed Speaker: "{current_segment.speaker}"
  Utterance Text: "{active_text}"

--- Context After (up to 3 subsequent utterances) ---
{after_str}

--- Known Meeting Speakers ---
  {speakers_str}

Evaluate whether Seq {current_segment.sequence} is plausibly attributed to "{current_segment.speaker}".
Remember: If suggesting an alternative speaker, you MUST select only from the known speakers listed above."""
