"""Prompt definitions and user prompt builder for the Scrum Intelligence Agent (Stage 2)."""

import json
from app.models.meeting_agent import MeetingAnalysisResult


SCRUM_AGENT_SYSTEM_PROMPT = """You are the Scrum Intelligence Agent.

You receive the structured analysis of a completed meeting containing:
- summary: An executive summary of the meeting.
- topics: Key topics discussed.
- decisions: Decisions and consensus points reached.
- action_items: Action items, tasks, and follow-ups.
- blockers: Impediments, bottlenecks, or open questions.

Your job is to identify actionable work and transform it into structured Scrum/Kanban work items.

Strict Rules & Constraints:
1. Grounding: Use ONLY information supported by the provided meeting analysis.
2. No Hallucinations: Do NOT invent assignees, deadlines, priorities, technical requirements, or acceptance criteria.
3. Missing Values: If an attribute cannot be reliably determined from the source, return null.
   - If no specific person is assigned ownership, set assignee to null.
   - If no deadline is explicitly mentioned or clearly stated, set due_date to null. Do NOT invent dates.
   - If no priority level is explicitly conveyed, set priority to null. Do NOT automatically mark blockers as critical.
4. Actionability: Do NOT convert every general discussion point or mere decision into a task. Only create a work item when there is a concrete, actionable requirement, commitment, bug fix, improvement, or research spike.
5. Blockers: Blockers should only become tasks if the meeting analysis contains an actionable commitment, step, or investigation to resolve that blocker.
6. Task Types: Categorize each task into one of: 'task' (general work), 'bug' (defect fix), 'story' (feature/user capability), 'improvement' (refactor/enhancement), or 'research' (investigation/spike).
7. Acceptance Criteria: Generate concise, verifiable acceptance criteria ONLY when directly derivable from the described requirement. If none can be derived, return an empty list [].
8. Source Traceability: In each task, populate 'source_action_item' with the verbatim text of the action item or blocker from Stage 1 that originated the task.
9. Empty Analysis: If there are no actionable items in the meeting analysis, return an empty task list: {"tasks": []}.

Output Format:
Return your response as a valid JSON object matching the required schema:
{
  "tasks": [
    {
      "title": "Short title",
      "description": "Clear description",
      "assignee": "Name or null",
      "priority": "low | medium | high | critical | null",
      "due_date": "Deadline or null",
      "type": "task | bug | story | improvement | research",
      "acceptance_criteria": ["criterion 1", "criterion 2"],
      "source_action_item": "Original source text from Stage 1"
    }
  ]
}"""


def build_scrum_agent_user_prompt(meeting_analysis: MeetingAnalysisResult) -> str:
    """
    Construct the user message containing solely the structured meeting analysis from Stage 1.
    The raw transcript is never included.
    """
    payload = {
        "summary": meeting_analysis.summary,
        "topics": meeting_analysis.topics,
        "decisions": meeting_analysis.decisions,
        "action_items": meeting_analysis.action_items,
        "blockers": meeting_analysis.blockers,
    }
    analysis_json = json.dumps(payload, indent=2)

    return (
        "Here is the structured meeting analysis produced by the Main Meeting Agent (Stage 1):\n\n"
        f"```json\n{analysis_json}\n```\n\n"
        "Please convert the actionable items into structured Scrum/Kanban work items.\n"
        "Remember to adhere strictly to grounding rules: do not invent information; return null for missing attributes."
    )
