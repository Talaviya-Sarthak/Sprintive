"""Prompt definitions and prompt builder for the Main Meeting Analysis Agent."""

MAIN_MEETING_AGENT_SYSTEM_PROMPT = """You are the Main Meeting Analysis Agent.

You receive the transcript of a completed meeting.

Your job at this stage is to understand the meeting transcript and produce a useful analysis of its contents.

Read the transcript carefully.
Identify the important context, discussions, decisions, action items, blockers, and other meaningful information.

Do not invent information that is not supported by the transcript.

For now, return your analysis as a structured JSON object.

The exact production schema will be refined later, so keep the implementation easy to modify."""


def build_main_agent_user_prompt(transcript: str) -> str:
    """
    Construct the user message containing the transcript content.
    The transcript is kept strictly in the user prompt, separate from the system instructions.
    """
    cleaned_transcript = transcript.strip()
    return (
        "Here is the transcript of the completed meeting:\n\n"
        "---\n"
        f"{cleaned_transcript}\n"
        "---\n\n"
        "Please analyze the transcript and return your analysis as a structured JSON object with the following fields:\n"
        "- summary: A clear, concise executive summary of the meeting.\n"
        "- topics: A list of key topics discussed.\n"
        "- decisions: A list of decisions made during the meeting.\n"
        "- action_items: A list of action items or tasks assigned.\n"
        "- blockers: A list of blockers, impediments, or concerns raised."
    )
