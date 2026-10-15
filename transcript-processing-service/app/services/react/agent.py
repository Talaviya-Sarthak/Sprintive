"""ReAct reasoning agent engine for Phase 2.

Formats the reasoning/action prompt, invokes LLM with Pydantic structured output,
and returns the model's next chosen thought and action.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from app.models.meeting_agent import MeetingAnalysisResult
from app.models.resolved_task import ResolvedTask
from app.models.scrum_agent import ScrumResult
from app.services.llm_client import BaseLLMClient, get_llm_client
from app.services.react.schemas import ReActAction, ReActStep
from app.services.react.tools import ALLOWED_TOOLS
from app.services.tracing import sprintive_traceable

logger = logging.getLogger(__name__)


REACT_SYSTEM_PROMPT = """You are Sprintive's Autonomous Meeting Orchestrator Agent operating under the ReAct (Reason + Act) architecture.

Your objective is to thoroughly analyze a completed software engineering meeting transcript, identify actionable commitments, extract well-formed Scrum/Kanban work items, and resolve them against the team roster.

You must follow an iterative loop of Thought -> Action -> Observation:
1. THOUGHT: Reason carefully about the current state, what has been accomplished so far, what information is missing, and what action to perform next.
2. ACTION: Choose ONE tool from the allowed list:
   - 'analyze_meeting': Analyzes dialogue, extracts executive summary, topics, decisions, action items, blockers. (Required first action)
   - 'extract_scrum_tasks': Extracts Scrum task drafts from meeting analysis. (Requires prior analyze_meeting)
   - 'resolve_and_validate_tasks': Resolves assignees, dates, and stable task IDs against team members. (Requires prior extract_scrum_tasks)
   - 'inspect_meeting_context': Inspects participants, team members, and existing tasks.
   - 'finish': Concludes the workflow when the analysis and tasks are complete, or when 0 tasks exist.

CRITICAL RULES:
- If 'analyze_meeting' discovers 0 action items and 0 blockers, DO NOT call 'extract_scrum_tasks'. Instead, immediately output action 'finish'.
- Do not call 'extract_scrum_tasks' before 'analyze_meeting'.
- Do not call 'resolve_and_validate_tasks' before 'extract_scrum_tasks'.
- Always call 'finish' once all necessary steps have produced observations and validated tasks.
- Keep thought concise, analytical, and grounded strictly in observations.
"""


def format_scratchpad(steps: List[ReActStep]) -> str:
    """Format previous reasoning/action/observation steps into a readable trajectory."""
    if not steps:
        return "No prior actions taken yet. This is Step 1."

    trajectory = []
    for step in steps:
        obs_text = step.observation.summary
        if not step.observation.success and step.observation.error:
            obs_text = f"FAILURE: {step.observation.error}"

        trajectory.append(
            f"[Iteration {step.iteration}]\n"
            f"Thought: {step.thought}\n"
            f"Action: {step.action}\n"
            f"Observation: {obs_text}\n"
        )
    return "\n".join(trajectory)


def format_react_user_prompt(
    meeting_id: str,
    team_id: str,
    transcript_preview: str,
    steps: List[ReActStep],
    has_analysis: bool,
    has_scrum: bool,
    has_resolved: bool,
) -> str:
    """Constructs the prompt presenting current scratchpad history and tool choices."""
    scratchpad = format_scratchpad(steps)

    status_summary = (
        f"- Meeting Analysis Available: {'YES' if has_analysis else 'NO'}\n"
        f"- Scrum Tasks Extracted: {'YES' if has_scrum else 'NO'}\n"
        f"- Tasks Resolved & Validated: {'YES' if has_resolved else 'NO'}\n"
    )

    return f"""Meeting ID: {meeting_id}
Team ID: {team_id}
Transcript Preview (first 1000 chars):
\"\"\"
{transcript_preview}
\"\"\"

Current State:
{status_summary}

History of Past Actions and Observations:
{scratchpad}

What is your next Thought and Action? Choose ONE tool from {list(ALLOWED_TOOLS.keys())}.
"""


class ReActAgent:
    """Agent that performs autonomous decision-making in the ReAct loop."""

    def __init__(self, llm_client: Optional[BaseLLMClient] = None):
        self._llm_client = llm_client

    @property
    def llm_client(self) -> BaseLLMClient:
        return self._llm_client or get_llm_client()

    @sprintive_traceable(name="ReActAgent:decide_next_action", run_type="chain", tags=["react", "reasoning"])
    def decide_next_action(
        self,
        meeting_id: str,
        team_id: str,
        transcript: str,
        steps: List[ReActStep],
        has_analysis: bool,
        has_scrum: bool,
        has_resolved: bool,
    ) -> ReActAction:
        """
        Invokes LLM to reason and pick the next action based on current state and observations.
        """
        preview = transcript[:1000] + ("..." if len(transcript) > 1000 else "")
        user_prompt = format_react_user_prompt(
            meeting_id=meeting_id,
            team_id=team_id,
            transcript_preview=preview,
            steps=steps,
            has_analysis=has_analysis,
            has_scrum=has_scrum,
            has_resolved=has_resolved,
        )

        logger.info("ReActAgent: Requesting LLM decision (step %d)", len(steps) + 1)

        decision: ReActAction = self.llm_client.generate_structured(
            system_prompt=REACT_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_model=ReActAction,
        )

        # Validate action
        action_name = decision.action.strip()
        if action_name not in ALLOWED_TOOLS:
            logger.warning("ReActAgent picked unknown tool '%s'; normalizing", action_name)
            # Find closest or default to analyze if first step
            if not has_analysis:
                action_name = "analyze_meeting"
            elif has_analysis and not has_scrum:
                action_name = "extract_scrum_tasks"
            elif has_scrum and not has_resolved:
                action_name = "resolve_and_validate_tasks"
            else:
                action_name = "finish"
            decision.action = action_name

        logger.info("ReActAgent decision: Action='%s' | Thought='%s'", decision.action, decision.thought[:80])
        return decision
