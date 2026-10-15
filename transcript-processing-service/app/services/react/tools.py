"""Controlled tool implementations for Phase 2 ReAct agent.

Reuses MainMeetingAgent, ScrumIntelligenceAgent, and TaskResolutionService.
Enforces deterministic validation, bounded execution, and safe error handling.
"""

import logging
from typing import Any, Dict, List, Optional

from app.models.meeting_agent import MeetingAnalysisResult
from app.models.resolved_task import ResolvedTask
from app.models.scrum_agent import ScrumResult
from app.services.meeting_agent import MainMeetingAgent, get_main_meeting_agent
from app.services.react.schemas import ToolObservation
from app.services.scrum_agent import ScrumIntelligenceAgent, get_scrum_intelligence_agent
from app.services.task_resolution_service import TaskResolutionService, get_task_resolution_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tool 1: Analyze Meeting
# ---------------------------------------------------------------------------

def execute_analyze_meeting(
    transcript: str,
    agent: Optional[MainMeetingAgent] = None,
) -> ToolObservation:
    """Analyzes dialogue transcript, extracting summary, topics, decisions, action items, blockers."""
    if not transcript or not transcript.strip():
        return ToolObservation(
            tool_name="analyze_meeting",
            success=False,
            error="Transcript is empty or whitespace.",
            summary="Error: Cannot analyze empty transcript.",
        )

    analysis_agent = agent or get_main_meeting_agent()
    try:
        analysis: MeetingAnalysisResult = analysis_agent.analyze_transcript(transcript)
        return ToolObservation(
            tool_name="analyze_meeting",
            success=True,
            data=analysis.model_dump(),
            summary=(
                f"Analysis completed: '{analysis.summary[:100]}...'. Found {len(analysis.topics)} topics, "
                f"{len(analysis.decisions)} decisions, {len(analysis.action_items)} action items, and "
                f"{len(analysis.blockers)} blockers."
            ),
        )
    except Exception as exc:
        logger.exception("execute_analyze_meeting error: %s", exc)
        return ToolObservation(
            tool_name="analyze_meeting",
            success=False,
            error=str(exc),
            summary=f"Error executing analyze_meeting: {str(exc)}",
        )


# ---------------------------------------------------------------------------
# Tool 2: Extract Scrum Tasks
# ---------------------------------------------------------------------------

def execute_extract_scrum_tasks(
    analysis: Optional[MeetingAnalysisResult],
    agent: Optional[ScrumIntelligenceAgent] = None,
) -> ToolObservation:
    """Transforms MeetingAnalysisResult into structured Scrum task drafts."""
    if analysis is None:
        return ToolObservation(
            tool_name="extract_scrum_tasks",
            success=False,
            error="Dependency missing: Meeting analysis must be performed first.",
            summary="Error: Cannot extract Scrum tasks without prior meeting analysis.",
        )

    if not analysis.action_items and not analysis.blockers:
        return ToolObservation(
            tool_name="extract_scrum_tasks",
            success=True,
            data=ScrumResult(tasks=[]).model_dump(),
            summary="Observation: Meeting has 0 action items and 0 blockers. Extracted 0 tasks.",
        )

    scrum_agent = agent or get_scrum_intelligence_agent()
    try:
        scrum_result: ScrumResult = scrum_agent.analyze(analysis)
        tasks_count = len(scrum_result.tasks)
        return ToolObservation(
            tool_name="extract_scrum_tasks",
            success=True,
            data=scrum_result.model_dump(),
            summary=f"Extracted {tasks_count} Scrum task drafts from meeting action items.",
        )
    except Exception as exc:
        logger.exception("execute_extract_scrum_tasks error: %s", exc)
        return ToolObservation(
            tool_name="extract_scrum_tasks",
            success=False,
            error=str(exc),
            summary=f"Error executing extract_scrum_tasks: {str(exc)}",
        )


# ---------------------------------------------------------------------------
# Tool 3: Resolve and Validate Tasks
# ---------------------------------------------------------------------------

def execute_resolve_and_validate_tasks(
    scrum_result: Optional[ScrumResult],
    meeting_id: str,
    team_id: str,
    meeting_timestamp: Optional[Any] = None,
    timezone_str: str = "UTC",
    participants: Optional[List[Dict[str, Any]]] = None,
    team_members: Optional[List[Dict[str, Any]]] = None,
    existing_tasks: Optional[List[Dict[str, Any]]] = None,
    service: Optional[TaskResolutionService] = None,
) -> ToolObservation:
    """Deterministically resolves assignees, due dates, reconciles stable IDs, and validates schema."""
    if scrum_result is None:
        return ToolObservation(
            tool_name="resolve_and_validate_tasks",
            success=False,
            error="Dependency missing: Scrum tasks must be extracted before resolving.",
            summary="Error: Cannot resolve tasks without ScrumResult.",
        )

    if not scrum_result.tasks:
        return ToolObservation(
            tool_name="resolve_and_validate_tasks",
            success=True,
            data=[],
            summary="Observation: No tasks present to resolve. Output is empty task list.",
        )

    resolver = service or get_task_resolution_service()
    try:
        resolution_result = resolver.resolve_tasks(
            scrum_result=scrum_result,
            meeting_id=meeting_id,
            team_id=team_id,
            meeting_timestamp=meeting_timestamp,
            timezone_str=timezone_str,
            participants=participants,
            team_members=team_members,
            existing_tasks=existing_tasks,
        )
        resolved_tasks = resolution_result.tasks

        # Safe deterministic deduplication
        seen_keys = set()
        deduped: List[ResolvedTask] = []
        for task in resolved_tasks:
            t_key = f"{task.id}:{task.title.strip().lower()}:{task.source_action_item.strip().lower()}"
            if t_key not in seen_keys:
                seen_keys.add(t_key)
                deduped.append(task)

        return ToolObservation(
            tool_name="resolve_and_validate_tasks",
            success=True,
            data=[t.model_dump() for t in deduped],
            summary=f"Resolved and validated {len(deduped)} canonical Kanban tasks with stable IDs and participant attributions.",
        )
    except Exception as exc:
        logger.exception("execute_resolve_and_validate_tasks error: %s", exc)
        return ToolObservation(
            tool_name="resolve_and_validate_tasks",
            success=False,
            error=str(exc),
            summary=f"Error executing resolve_and_validate_tasks: {str(exc)}",
        )


# ---------------------------------------------------------------------------
# Tool 4: Inspect Meeting Context
# ---------------------------------------------------------------------------

def execute_inspect_meeting_context(
    meeting_id: str,
    team_id: str,
    participants: Optional[List[Dict[str, Any]]] = None,
    team_members: Optional[List[Dict[str, Any]]] = None,
    existing_tasks: Optional[List[Dict[str, Any]]] = None,
) -> ToolObservation:
    """Inspects attendee roster and active team members to assist in understanding context."""
    p_names = [p.get("full_name") or p.get("name") for p in (participants or []) if p.get("full_name") or p.get("name")]
    m_names = [m.get("full_name") or m.get("name") for m in (team_members or []) if m.get("full_name") or m.get("name")]
    existing_count = len(existing_tasks or [])

    return ToolObservation(
        tool_name="inspect_meeting_context",
        success=True,
        data={
            "meeting_id": meeting_id,
            "team_id": team_id,
            "participants": p_names,
            "team_members": m_names,
            "existing_tasks_count": existing_count,
        },
        summary=(
            f"Context: {len(p_names)} meeting participants ({', '.join(p_names[:4])}), "
            f"{len(m_names)} team members on record, {existing_count} prior tasks in summary."
        ),
    )


# Tool registry metadata for prompting
ALLOWED_TOOLS = {
    "analyze_meeting": {
        "description": "Analyze meeting transcript dialogue. Extracts executive summary, key topics, decisions, action items, and blockers. Must be called first.",
        "parameters": {},
    },
    "extract_scrum_tasks": {
        "description": "Extract structured Scrum/Kanban work items from the meeting analysis. Grounded strictly in detected action items and blockers. Call after analyze_meeting.",
        "parameters": {},
    },
    "resolve_and_validate_tasks": {
        "description": "Deterministically resolves task assignees against participant names, computes calendar due dates, validates task constraints, and preserves stable IDs. Call after extract_scrum_tasks.",
        "parameters": {},
    },
    "inspect_meeting_context": {
        "description": "Inspect attendee roster, team members, and existing tasks to check participant identity and team context.",
        "parameters": {},
    },
    "finish": {
        "description": "Declare that all necessary reasoning and actions are complete. Final summary and tasks are ready for persistence.",
        "parameters": {},
    },
}
