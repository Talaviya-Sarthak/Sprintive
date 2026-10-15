"""Phase 2 ReAct LangGraph Construction and Execution Engine.

Implements the Reason + Act state machine on top of LangGraph.
"""

import asyncio
import logging
import time
from typing import Any, Dict, List, Literal, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from app.config.storage import (
    InvalidMeetingIdError,
    build_cleaned_transcript_path,
    validate_meeting_id,
)
from app.models.meeting_agent import MeetingAIPipelineResponse, MeetingAnalysisResult
from app.models.resolved_task import ResolvedTask
from app.models.scrum_agent import ScrumResult
from app.services.database import get_meeting_context, persist_meeting_summary_to_db
from app.services.llm_client import BaseLLMClient
from app.services.meeting_agent import (
    EmptyTranscriptException,
    MainMeetingAgent,
    MeetingAnalysisError,
    get_main_meeting_agent,
)
from app.services.react.agent import ReActAgent
from app.services.react.schemas import ReActAction, ReActStep, ToolObservation
from app.services.react.tools import (
    ALLOWED_TOOLS,
    execute_analyze_meeting,
    execute_extract_scrum_tasks,
    execute_inspect_meeting_context,
    execute_resolve_and_validate_tasks,
)
from app.services.scrum_agent import (
    ScrumIntelligenceAgent,
    ScrumAnalysisError,
    get_scrum_intelligence_agent,
)
from app.services.storage_service import (
    TranscriptStorageService,
    get_storage_service,
)
from app.services.task_resolution_service import (
    TaskResolutionService,
    get_task_resolution_service,
)

logger = logging.getLogger(__name__)


class ReActWorkflowState(TypedDict, total=False):
    """Shared typed state for the ReAct LangGraph workflow."""
    # Meeting inputs & context
    meeting_id: str
    transcript: str
    transcript_path: str
    transcript_length: int
    team_id: str
    participants: List[Dict[str, Any]]
    team_members: List[Dict[str, Any]]
    existing_tasks: List[Dict[str, Any]]
    meeting_timestamp: Any
    timezone: str
    duration_minutes: int
    attendance_count: int
    persist_to_database: bool

    # ReAct iteration & trajectory
    iteration: int
    max_iterations: int
    steps: List[ReActStep]
    current_thought: Optional[str]
    current_action: Optional[str]
    current_action_input: Optional[Dict[str, Any]]
    current_observation: Optional[ToolObservation]

    # Accumulated domain objects
    analysis: Optional[MeetingAnalysisResult]
    scrum_result: Optional[ScrumResult]
    resolved_tasks: Optional[List[ResolvedTask]]

    # Terminal flags
    is_finished: bool
    persisted: bool
    status: str  # "COMPLETED" or "FAILED"
    error: Optional[str]
    error_stage: Optional[str]
    duration_ms: int


# ---------------------------------------------------------------------------
# ReAct Nodes
# ---------------------------------------------------------------------------

async def react_reason_node(
    state: ReActWorkflowState,
    agent: Optional[ReActAgent] = None,
) -> Dict[str, Any]:
    """
    Reasoning node in the ReAct cycle.
    The agent evaluates scratchpad history and decides the next action.
    """
    iteration = state.get("iteration", 0)
    max_iterations = state.get("max_iterations", 6)
    meeting_id = state.get("meeting_id", "")
    logger.info("ReAct Node: react_reason for meeting %s (cycle %d/%d)", meeting_id, iteration + 1, max_iterations)

    if iteration >= max_iterations:
        logger.warning("ReAct iteration limit (%d) reached for meeting %s", max_iterations, meeting_id)
        return {
            "error": f"ReAct agent reached maximum iteration limit ({max_iterations}) without finishing.",
            "error_stage": "react_reason",
            "status": "FAILED",
            "is_finished": True,
        }

    react_engine = agent or ReActAgent()
    has_analysis = state.get("analysis") is not None
    has_scrum = state.get("scrum_result") is not None
    has_resolved = state.get("resolved_tasks") is not None and len(state.get("resolved_tasks") or []) > 0

    try:
        decision: ReActAction = await asyncio.to_thread(
            react_engine.decide_next_action,
            meeting_id=meeting_id,
            team_id=state.get("team_id", ""),
            transcript=state.get("transcript", ""),
            steps=state.get("steps", []),
            has_analysis=has_analysis,
            has_scrum=has_scrum,
            has_resolved=has_resolved,
        )

        return {
            "current_thought": decision.thought,
            "current_action": decision.action,
            "current_action_input": decision.action_input,
            "iteration": iteration + 1,
            "error": None,
        }
    except Exception as exc:
        logger.exception("ReAct decision error for meeting %s: %s", meeting_id, exc)
        return {
            "error": f"ReAct reasoning error: {str(exc)}",
            "error_stage": "react_reason",
            "status": "FAILED",
        }


async def execute_tool_node(
    state: ReActWorkflowState,
    main_agent: Optional[MainMeetingAgent] = None,
    scrum_agent: Optional[ScrumIntelligenceAgent] = None,
    task_resolution_service: Optional[TaskResolutionService] = None,
) -> Dict[str, Any]:
    """
    Action node in the ReAct cycle.
    Executes the chosen tool and captures the structured observation.
    """
    action = state.get("current_action", "")
    thought = state.get("current_thought", "")
    action_input = state.get("current_action_input", {})
    iteration = state.get("iteration", 1)
    meeting_id = state.get("meeting_id", "")

    logger.info("ReAct Node: execute_tool '%s' for meeting %s", action, meeting_id)

    observation: ToolObservation
    state_updates: Dict[str, Any] = {}

    if action == "analyze_meeting":
        transcript = state.get("transcript", "")
        observation = await asyncio.to_thread(
            execute_analyze_meeting, transcript=transcript, agent=main_agent
        )
        if observation.success and observation.data:
            analysis_obj = MeetingAnalysisResult.model_validate(observation.data)
            state_updates["analysis"] = analysis_obj

    elif action == "extract_scrum_tasks":
        analysis = state.get("analysis")
        observation = await asyncio.to_thread(
            execute_extract_scrum_tasks, analysis=analysis, agent=scrum_agent
        )
        if observation.success and observation.data:
            scrum_obj = ScrumResult.model_validate(observation.data)
            state_updates["scrum_result"] = scrum_obj

    elif action == "resolve_and_validate_tasks":
        scrum_res = state.get("scrum_result")
        observation = await asyncio.to_thread(
            execute_resolve_and_validate_tasks,
            scrum_result=scrum_res,
            meeting_id=meeting_id,
            team_id=state.get("team_id", ""),
            meeting_timestamp=state.get("meeting_timestamp"),
            timezone_str=state.get("timezone", "UTC"),
            participants=state.get("participants"),
            team_members=state.get("team_members"),
            existing_tasks=state.get("existing_tasks"),
            service=task_resolution_service,
        )
        if observation.success and observation.data is not None:
            tasks_list = [ResolvedTask.model_validate(t) for t in observation.data]
            state_updates["resolved_tasks"] = tasks_list

    elif action == "inspect_meeting_context":
        observation = execute_inspect_meeting_context(
            meeting_id=meeting_id,
            team_id=state.get("team_id", ""),
            participants=state.get("participants"),
            team_members=state.get("team_members"),
            existing_tasks=state.get("existing_tasks"),
        )

    else:
        observation = ToolObservation(
            tool_name=action,
            success=False,
            error=f"Unrecognized action '{action}'.",
            summary=f"Error: Unknown tool '{action}'. Please select from {list(ALLOWED_TOOLS.keys())}.",
        )

    # Append step to scratchpad trajectory
    step = ReActStep(
        iteration=iteration,
        thought=thought,
        action=action,
        action_input=action_input,
        observation=observation,
    )
    current_steps = list(state.get("steps") or [])
    current_steps.append(step)

    state_updates["steps"] = current_steps
    state_updates["current_observation"] = observation
    return state_updates


async def validate_and_persist_node(state: ReActWorkflowState) -> Dict[str, Any]:
    """
    Terminal node for ReAct workflow.
    Validates outputs and commits to PostgreSQL idempotently with deduplication.
    """
    meeting_id = state.get("meeting_id", "")
    analysis = state.get("analysis")
    persist_flag = state.get("persist_to_database", True)
    logger.info("ReAct Node: validate_and_persist for meeting %s (persist=%s)", meeting_id, persist_flag)

    if analysis is None:
        logger.error("validate_and_persist_node: Cannot finish without MeetingAnalysisResult.")
        return {
            "status": "FAILED",
            "error": "ReAct agent finished without producing meeting analysis.",
            "error_stage": "validate_and_persist",
        }

    resolved_tasks = state.get("resolved_tasks")
    if resolved_tasks is None:
        scrum_res = state.get("scrum_result")
        resolved_tasks = scrum_res.tasks if scrum_res else []

    if persist_flag:
        persist_success = await asyncio.to_thread(
            persist_meeting_summary_to_db,
            meeting_id=meeting_id,
            ai_summary=analysis.summary,
            action_items=analysis.action_items,
            tickets_generated=resolved_tasks,
            duration_minutes=state.get("duration_minutes", 0),
            attendance_count=state.get("attendance_count", 0),
        )
        if not persist_success:
            logger.error("validate_and_persist_node: Database persistence failed for meeting %s", meeting_id)
            return {
                "status": "FAILED",
                "persisted": False,
                "error": f"Database persistence failed for meeting {meeting_id}",
                "error_stage": "validate_and_persist",
            }
        persisted = True
    else:
        persisted = False

    return {
        "status": "COMPLETED",
        "persisted": persisted,
        "is_finished": True,
        "resolved_tasks": resolved_tasks,
        "error": None,
    }


async def react_failure_node(state: ReActWorkflowState) -> Dict[str, Any]:
    """Terminal failure node for unrecoverable errors or iteration limits."""
    meeting_id = state.get("meeting_id", "")
    err = state.get("error") or "ReAct execution failed."
    logger.error("ReAct Node: react_failure for meeting %s: %s", meeting_id, err)
    return {
        "status": "FAILED",
        "is_finished": True,
    }


# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------

def route_after_reason(state: ReActWorkflowState) -> Literal["execute_tool", "validate_and_persist", "react_failure"]:
    """Conditional routing from reasoning node to tool execution or termination."""
    if state.get("status") == "FAILED" or state.get("error"):
        return "react_failure"

    action = state.get("current_action", "")
    if action == "finish":
        return "validate_and_persist"

    return "execute_tool"


# ---------------------------------------------------------------------------
# Graph Construction
# ---------------------------------------------------------------------------

def build_react_graph(
    main_agent: Optional[MainMeetingAgent] = None,
    scrum_agent: Optional[ScrumIntelligenceAgent] = None,
    task_resolution_service: Optional[TaskResolutionService] = None,
    react_agent: Optional[ReActAgent] = None,
) -> StateGraph:
    """Builds the compiled StateGraph for the Phase 2 ReAct agent loop."""
    workflow = StateGraph(ReActWorkflowState)

    async def _reason(s: ReActWorkflowState) -> Dict[str, Any]:
        return await react_reason_node(s, agent=react_agent)

    async def _tool(s: ReActWorkflowState) -> Dict[str, Any]:
        return await execute_tool_node(
            s,
            main_agent=main_agent,
            scrum_agent=scrum_agent,
            task_resolution_service=task_resolution_service,
        )

    # Add Nodes
    workflow.add_node("react_reason", _reason)
    workflow.add_node("execute_tool", _tool)
    workflow.add_node("validate_and_persist", validate_and_persist_node)
    workflow.add_node("react_failure", react_failure_node)

    # Add Edges
    workflow.add_edge(START, "react_reason")

    workflow.add_conditional_edges(
        "react_reason",
        route_after_reason,
        {
            "execute_tool": "execute_tool",
            "validate_and_persist": "validate_and_persist",
            "react_failure": "react_failure",
        },
    )

    # Loop back from tool execution to reasoning
    workflow.add_edge("execute_tool", "react_reason")

    # Terminal edges
    workflow.add_edge("validate_and_persist", END)
    workflow.add_edge("react_failure", END)

    return workflow


# ---------------------------------------------------------------------------
# ReAct Runner
# ---------------------------------------------------------------------------

async def run_react_meeting_pipeline(
    meeting_id: str,
    custom_transcript_path: Optional[str] = None,
    raw_text: Optional[str] = None,
    clean_transcript: Optional[str] = None,
    storage_service: Optional[TranscriptStorageService] = None,
    agent: Optional[MainMeetingAgent] = None,
    llm_client: Optional[BaseLLMClient] = None,
    scrum_agent: Optional[ScrumIntelligenceAgent] = None,
    task_resolution_service: Optional[TaskResolutionService] = None,
    team_id: Optional[str] = None,
    meeting_timestamp: Optional[Any] = None,
    timezone_str: str = "UTC",
    participants: Optional[List[Dict[str, Any]]] = None,
    team_members: Optional[List[Dict[str, Any]]] = None,
    persist_to_database: bool = True,
    max_iterations: int = 6,
    react_agent: Optional[ReActAgent] = None,
) -> MeetingAIPipelineResponse:
    """
    Executes the Phase 2 ReAct agent workflow on a meeting transcript.
    Initializes state, resolves transcript and database context, invokes ReAct graph,
    and returns canonical MeetingAIPipelineResponse.
    """
    start_ts = time.perf_counter()

    valid_id = validate_meeting_id(meeting_id)

    # 1. Resolve DB context
    db_context = await asyncio.to_thread(get_meeting_context, valid_id)
    effective_team_id = team_id or db_context.get("team_id") or f"team-{valid_id}"
    effective_participants = participants if participants is not None else db_context.get("participants", [])
    effective_team_members = team_members if team_members is not None else db_context.get("team_members", [])
    effective_meeting_timestamp = meeting_timestamp or db_context.get("started_at") or db_context.get("scheduled_start")
    meeting_duration_minutes = db_context.get("duration_minutes", 0)
    existing_tasks = db_context.get("existing_tasks", [])

    # 2. Resolve transcript
    transcript_path = custom_transcript_path or build_cleaned_transcript_path(valid_id)
    transcript_str = clean_transcript or raw_text
    if not transcript_str:
        storage = storage_service or get_storage_service()
        try:
            raw_content = await asyncio.to_thread(storage.provider.get_text, transcript_path)
            transcript_str = raw_content.decode("utf-8") if isinstance(raw_content, bytes) else str(raw_content)
        except Exception as exc:
            raise

    if not transcript_str or not transcript_str.strip():
        raise EmptyTranscriptException(f"Downloaded transcript is empty for meeting {valid_id}.")

    # 3. Assemble and compile ReAct graph
    effective_main = agent or (get_main_meeting_agent(llm_client=llm_client) if llm_client else None)
    effective_scrum = scrum_agent or (get_scrum_intelligence_agent(llm_client=llm_client) if llm_client else None)
    effective_react = react_agent or (ReActAgent(llm_client=llm_client) if llm_client else None)

    graph = build_react_graph(
        main_agent=effective_main,
        scrum_agent=effective_scrum,
        task_resolution_service=task_resolution_service,
        react_agent=effective_react,
    ).compile()

    initial_state: ReActWorkflowState = {
        "meeting_id": valid_id,
        "transcript": transcript_str,
        "transcript_path": transcript_path,
        "transcript_length": len(transcript_str),
        "team_id": effective_team_id,
        "participants": effective_participants,
        "team_members": effective_team_members,
        "existing_tasks": existing_tasks,
        "meeting_timestamp": effective_meeting_timestamp,
        "timezone": timezone_str,
        "duration_minutes": meeting_duration_minutes,
        "attendance_count": len(effective_participants),
        "persist_to_database": persist_to_database,
        "iteration": 0,
        "max_iterations": max_iterations,
        "steps": [],
        "analysis": None,
        "scrum_result": None,
        "resolved_tasks": [],
        "is_finished": False,
        "persisted": False,
        "status": "PROCESSING",
    }

    logger.info("Starting ReAct agent loop for meeting %s (max_iterations=%d)", valid_id, max_iterations)

    final_state = await graph.ainvoke(initial_state)

    duration_ms = int((time.perf_counter() - start_ts) * 1000)

    if final_state.get("status") == "FAILED" or final_state.get("error"):
        err = final_state.get("error") or "ReAct pipeline failed"
        err_stage = final_state.get("error_stage") or "react"
        raise MeetingAnalysisError(f"ReAct pipeline execution failed at '{err_stage}': {err}")

    return MeetingAIPipelineResponse(
        meeting_id=valid_id,
        transcript_path=transcript_path,
        transcript_length=len(transcript_str),
        analysis=final_state.get("analysis"),
        scrum_analysis=final_state.get("scrum_result"),
        resolved_tasks=final_state.get("resolved_tasks") or [],
        status="COMPLETED",
        error=None,
        duration_ms=duration_ms,
    )
