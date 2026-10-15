"""Meeting AI Pipeline LangGraph Construction & Orchestration.

Assembles the state machine for processing meeting transcripts using explicit LangGraph nodes,
sequential dependency enforcement, bounded retry loops, and conditional routing.
"""

import logging
import time
from typing import Any, Dict, List, Literal, Optional

from langgraph.graph import END, START, StateGraph

from app.models.meeting_agent import MeetingAnalysisResult
from app.models.resolved_task import ResolvedTask
from app.models.scrum_agent import ScrumResult
from app.services.graphs.nodes import (
    controlled_persistence_node,
    failure_handling_node,
    final_processing_status_node,
    meeting_analysis_node,
    output_validation_node,
    scrum_extraction_node,
    task_resolution_node,
    validate_transcript_node,
)
from app.services.graphs.state import MeetingWorkflowState
from app.services.llm_client import BaseLLMClient
from app.services.meeting_agent import (
    EmptyTranscriptException,
    MainMeetingAgent,
    MeetingAnalysisError,
    get_main_meeting_agent,
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


# ---------------------------------------------------------------------------
# Conditional Routing Functions
# ---------------------------------------------------------------------------

def route_after_validation(state: MeetingWorkflowState) -> Literal["meeting_analysis", "failure_handling"]:
    """Routes after transcript validation: failure if empty/missing, else proceed to analysis."""
    if state.get("error") or state.get("is_empty_transcript"):
        return "failure_handling"
    return "meeting_analysis"


def route_after_meeting_analysis(
    state: MeetingWorkflowState,
) -> Literal["meeting_analysis", "scrum_extraction", "output_validation", "failure_handling"]:
    """
    Routes after meeting analysis:
    - Retries meeting_analysis if error and under max_retries limit.
    - Routes to failure_handling if error and retries exhausted.
    - Routes to output_validation if run_scrum_agent is False.
    - Otherwise proceeds to scrum_extraction.
    """
    error = state.get("error")
    retries = state.get("meeting_agent_retries", 0)
    max_retries = state.get("max_retries", 1)

    if error:
        if retries <= max_retries:
            logger.info("Retrying meeting_analysis (attempt %d/%d)", retries + 1, max_retries + 1)
            return "meeting_analysis"
        return "failure_handling"

    if not state.get("run_scrum_agent", True):
        return "output_validation"

    return "scrum_extraction"


def route_after_scrum_extraction(
    state: MeetingWorkflowState,
) -> Literal["scrum_extraction", "task_resolution", "output_validation", "failure_handling"]:
    """
    Routes after Scrum extraction:
    - Retries scrum_extraction if error and under max_retries limit.
    - Routes to failure_handling if error and retries exhausted.
    - Short-circuits to output_validation if 0 tasks or task resolution disabled.
    - Otherwise proceeds to task_resolution.
    """
    error = state.get("error")
    retries = state.get("scrum_agent_retries", 0)
    max_retries = state.get("max_retries", 1)

    if error:
        if retries <= max_retries:
            logger.info("Retrying scrum_extraction (attempt %d/%d)", retries + 1, max_retries + 1)
            return "scrum_extraction"
        return "failure_handling"

    if state.get("is_empty_tasks") or not state.get("run_task_resolution", True):
        return "output_validation"

    return "task_resolution"


def route_after_task_resolution(
    state: MeetingWorkflowState,
) -> Literal["output_validation", "failure_handling"]:
    """Routes after task resolution."""
    if state.get("error"):
        return "failure_handling"
    return "output_validation"


def route_after_output_validation(
    state: MeetingWorkflowState,
) -> Literal["controlled_persistence", "final_processing_status", "failure_handling"]:
    """Routes after validation: checks if persistence requested or skips directly to final status."""
    if not state.get("validation_passed", False) or state.get("error"):
        return "failure_handling"

    if state.get("persist_to_database", True):
        return "controlled_persistence"

    return "final_processing_status"


def route_after_persistence(
    state: MeetingWorkflowState,
) -> Literal["final_processing_status", "failure_handling"]:
    """Routes after persistence."""
    if (
        state.get("processing_status") == "FAILED"
        or state.get("error")
        or (state.get("persist_to_database", True) and not state.get("persisted", False))
    ):
        return "failure_handling"
    return "final_processing_status"


# ---------------------------------------------------------------------------
# Graph Builder
# ---------------------------------------------------------------------------

def build_meeting_graph(
    storage_service: Optional[TranscriptStorageService] = None,
    main_agent: Optional[MainMeetingAgent] = None,
    scrum_agent: Optional[ScrumIntelligenceAgent] = None,
    task_resolution_service: Optional[TaskResolutionService] = None,
) -> StateGraph:
    """
    Constructs the StateGraph with all Phase 1 nodes and explicit edges.
    Enforces that Scrum extraction strictly consumes meeting analysis results.
    """
    workflow = StateGraph(MeetingWorkflowState)

    # Wrap nodes with injected dependencies if provided
    async def _validate_node(state: MeetingWorkflowState) -> Dict[str, Any]:
        return await validate_transcript_node(state, storage_service=storage_service)

    async def _analysis_node(state: MeetingWorkflowState) -> Dict[str, Any]:
        return await meeting_analysis_node(state, agent=main_agent)

    async def _scrum_node(state: MeetingWorkflowState) -> Dict[str, Any]:
        return await scrum_extraction_node(state, agent=scrum_agent)

    async def _resolution_node(state: MeetingWorkflowState) -> Dict[str, Any]:
        return await task_resolution_node(state, service=task_resolution_service)

    # 1. Register Nodes
    workflow.add_node("validate_transcript", _validate_node)
    workflow.add_node("meeting_analysis", _analysis_node)
    workflow.add_node("scrum_extraction", _scrum_node)
    workflow.add_node("task_resolution", _resolution_node)
    workflow.add_node("output_validation", output_validation_node)
    workflow.add_node("controlled_persistence", controlled_persistence_node)
    workflow.add_node("final_processing_status", final_processing_status_node)
    workflow.add_node("failure_handling", failure_handling_node)

    # 2. Register Entry Edge
    workflow.add_edge(START, "validate_transcript")

    # 3. Register Conditional Edges
    workflow.add_conditional_edges(
        "validate_transcript",
        route_after_validation,
        {
            "meeting_analysis": "meeting_analysis",
            "failure_handling": "failure_handling",
        },
    )

    workflow.add_conditional_edges(
        "meeting_analysis",
        route_after_meeting_analysis,
        {
            "meeting_analysis": "meeting_analysis",
            "scrum_extraction": "scrum_extraction",
            "output_validation": "output_validation",
            "failure_handling": "failure_handling",
        },
    )

    workflow.add_conditional_edges(
        "scrum_extraction",
        route_after_scrum_extraction,
        {
            "scrum_extraction": "scrum_extraction",
            "task_resolution": "task_resolution",
            "output_validation": "output_validation",
            "failure_handling": "failure_handling",
        },
    )

    workflow.add_conditional_edges(
        "task_resolution",
        route_after_task_resolution,
        {
            "output_validation": "output_validation",
            "failure_handling": "failure_handling",
        },
    )

    workflow.add_conditional_edges(
        "output_validation",
        route_after_output_validation,
        {
            "controlled_persistence": "controlled_persistence",
            "final_processing_status": "final_processing_status",
            "failure_handling": "failure_handling",
        },
    )

    workflow.add_conditional_edges(
        "controlled_persistence",
        route_after_persistence,
        {
            "final_processing_status": "final_processing_status",
            "failure_handling": "failure_handling",
        },
    )

    # 4. Register Terminal Edges
    workflow.add_edge("final_processing_status", END)
    workflow.add_edge("failure_handling", END)

    return workflow


# Cached default compiled graph
_default_compiled_graph = None


def get_compiled_meeting_graph():
    """Retrieve or compile the default production LangGraph instance."""
    global _default_compiled_graph
    if _default_compiled_graph is None:
        _default_compiled_graph = build_meeting_graph().compile()
    return _default_compiled_graph


from app.services.tracing import sprintive_traceable

# ---------------------------------------------------------------------------
# High-Level Execution Runner
# ---------------------------------------------------------------------------

@sprintive_traceable(name="LangGraphWorkflow", run_type="chain", tags=["langgraph", "phase1"])
async def run_meeting_langgraph(
    meeting_id: str,
    custom_transcript_path: Optional[str] = None,
    raw_text: Optional[str] = None,
    clean_transcript: Optional[str] = None,
    storage_service: Optional[TranscriptStorageService] = None,
    agent: Optional[MainMeetingAgent] = None,
    llm_client: Optional[BaseLLMClient] = None,
    run_scrum_agent: bool = True,
    scrum_agent: Optional[ScrumIntelligenceAgent] = None,
    run_task_resolution: bool = True,
    task_resolution_service: Optional[TaskResolutionService] = None,
    team_id: Optional[str] = None,
    meeting_timestamp: Optional[Any] = None,
    timezone_str: str = "UTC",
    participants: Optional[List[Dict[str, Any]]] = None,
    team_members: Optional[List[Dict[str, Any]]] = None,
    persist_to_database: bool = True,
    max_retries: int = 1,
) -> MeetingWorkflowState:
    """
    Executes the compiled LangGraph for a meeting transcript.
    Initializes typed state, triggers asynchronous graph execution, and returns final state.
    """
    start_ts = time.perf_counter()

    # Build agent instances if llm_client was injected
    effective_main_agent = agent or (get_main_meeting_agent(llm_client=llm_client) if llm_client else None)
    effective_scrum_agent = scrum_agent or (get_scrum_intelligence_agent(llm_client=llm_client) if llm_client else None)

    # Compile custom graph if specific dependency instances provided
    if any([storage_service, effective_main_agent, effective_scrum_agent, task_resolution_service]):
        graph = build_meeting_graph(
            storage_service=storage_service,
            main_agent=effective_main_agent,
            scrum_agent=effective_scrum_agent,
            task_resolution_service=task_resolution_service,
        ).compile()
    else:
        graph = get_compiled_meeting_graph()

    initial_state: MeetingWorkflowState = {
        "meeting_id": meeting_id,
        "custom_transcript_path": custom_transcript_path,
        "raw_text": raw_text,
        "clean_transcript": clean_transcript,
        "team_id": team_id,
        "meeting_timestamp": meeting_timestamp,
        "timezone": timezone_str,
        "participants": participants,
        "team_members": team_members,
        "run_scrum_agent": run_scrum_agent,
        "run_task_resolution": run_task_resolution,
        "persist_to_database": persist_to_database,
        "analysis": None,
        "scrum_result": None,
        "resolved_tasks": [],
        "meeting_agent_retries": 0,
        "scrum_agent_retries": 0,
        "max_retries": max_retries,
        "processing_status": "PROCESSING",
        "current_stage": "validate_transcript",
        "is_empty_transcript": False,
        "is_empty_tasks": False,
        "validation_passed": False,
        "warnings": [],
        "persisted": False,
    }

    logger.info("Executing LangGraph meeting pipeline for meeting %s", meeting_id)

    # Execute LangGraph asynchronously with observability metadata
    langgraph_config = {
        "metadata": {
            "meeting_id": meeting_id,
            "pipeline": "LangGraph_Phase1",
        },
        "tags": ["phase1", "langgraph", "workflow"],
    }
    final_state = await graph.ainvoke(initial_state, config=langgraph_config)

    duration_ms = int((time.perf_counter() - start_ts) * 1000)
    final_state["duration_ms"] = duration_ms

    logger.info(
        "LangGraph execution finished for meeting %s (status: %s, duration: %dms, error: %s)",
        meeting_id,
        final_state.get("processing_status"),
        duration_ms,
        final_state.get("error"),
    )

    return final_state
