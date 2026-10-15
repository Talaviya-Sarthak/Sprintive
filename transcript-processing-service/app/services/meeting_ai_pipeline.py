"""Meeting AI Pipeline Service.

Implements the first stage of the AI pipeline:
1. Determine transcript path from meeting ID using canonical conventions.
2. Download the transcript .txt file from Supabase Storage.
3. Decode/read as UTF-8 string.
4. Pass string to Main Meeting Agent.
5. Receive structured LLM response.
6. Log and store response.
"""

import logging
import time
from typing import Any, Dict, List, Optional

from app.config.storage import (
    InvalidMeetingIdError,
    build_cleaned_transcript_path,
    validate_meeting_id,
)
from app.core.config import settings
from app.models.meeting_agent import (
    MeetingAIPipelineResponse,
    MeetingAnalysisResult,
)
from app.models.resolved_task import ResolvedTask
from app.models.scrum_agent import ScrumResult, ScrumTask
from pydantic import BaseModel, Field
from app.services.llm_client import (
    BaseLLMClient,
    MockLLMClient,
    OpenAICompatibleLLMClient,
    get_llm_client,
)
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
from app.services.task_resolution_service import (
    TaskResolutionService,
    get_task_resolution_service,
)
from app.services.storage_service import (
    TranscriptStorageError,
    TranscriptStorageService,
    get_storage_service,
)
from app.services.tracing import sprintive_traceable

logger = logging.getLogger(__name__)


class ConsolidatedMeetingAIOutput(BaseModel):
    summary: str = Field(..., description="High-level summary of the meeting")
    topics: List[str] = Field(default_factory=list, description="Key discussion topics")
    decisions: List[str] = Field(default_factory=list, description="Decisions made")
    action_items: List[str] = Field(default_factory=list, description="Action items assigned")
    blockers: List[str] = Field(default_factory=list, description="Blockers or obstacles raised")
    tasks: List[ScrumTask] = Field(default_factory=list, description="Structured Scrum tasks derived from action items")


CONSOLIDATED_AI_SYSTEM_PROMPT = (
    "You are Sprintive's AI Meeting Intelligence and Scrum Assistant.\n"
    "Your objective is to analyze a completed meeting transcript and extract both executive meeting insights "
    "and structured Scrum work items in a single, accurate response.\n\n"
    "CRITICAL REQUIREMENTS:\n"
    "1. summary: A clear, executive-level summary synthesizing the overall discussion, outcomes, and progress.\n"
    "2. topics: A list of key topics discussed.\n"
    "3. decisions: A list of explicit agreements and decisions reached.\n"
    "4. action_items: Concrete tasks or follow-ups explicitly committed to by participants.\n"
    "5. blockers: Technical, operational, or external impediments explicitly raised.\n"
    "6. tasks: Structured Scrum/Kanban work items derived from action_items and blockers. Each task must have:\n"
    "   - title: Clear, actionable title.\n"
    "   - description: Contextual description.\n"
    "   - assignee: Person assigned, or null if unassigned.\n"
    "   - priority: 'low', 'medium', 'high', or 'critical', or null if unspecified.\n"
    "   - due_date: Deadlines mentioned, or null if unspecified.\n"
    "   - type: 'task', 'bug', 'story', 'improvement', or 'research'.\n"
    "   - acceptance_criteria: Verifiable completion criteria.\n"
    "   - source_action_item: The exact verbatim or close source text from action_items/blockers for traceability.\n\n"
    "Ground every claim strictly in the provided transcript. Do not hallucinate or invent deliverables."
)


class MeetingAIPipelineError(Exception):
    """Base exception for meeting AI pipeline failures."""
    pass


class TranscriptRetrievalError(MeetingAIPipelineError):
    """Raised when transcript retrieval from Supabase Storage fails."""
    pass


@sprintive_traceable(name="SprintiveMeetingAIPipeline", run_type="chain", tags=["pipeline", "orchestration"])
async def run_meeting_ai_pipeline(
    meeting_id: str,
    custom_transcript_path: Optional[str] = None,
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
    use_react: Optional[bool] = None,
) -> MeetingAIPipelineResponse:
    """
    Execute AI pipeline stages for a completed meeting:
    Phase 1: Deterministic LangGraph state machine.
    Phase 2: Genuine ReAct (Reason + Act) agent loop when enabled.

    Args:
        meeting_id: Unique meeting identifier.
        custom_transcript_path: Optional explicit storage path for the transcript.
        storage_service: Optional storage service instance.
        agent: Optional MainMeetingAgent instance (Stage 1).
        llm_client: Optional LLM client injected into agents.
        run_scrum_agent: Whether to execute Stage 2 Scrum Intelligence Agent.
        scrum_agent: Optional ScrumIntelligenceAgent instance (Stage 2).
        run_task_resolution: Whether to resolve tasks into canonical Kanban schema.
        persist_to_database: Whether to write summary and tasks to PostgreSQL.
        use_react: Optional flag to toggle Phase 2 ReAct agent. Defaults to settings.ENABLE_REACT_PIPELINE.

    Returns:
        MeetingAIPipelineResponse with the structured analysis, Scrum tasks, and resolved Kanban tasks.
    """
    start_ts = time.perf_counter()

    # 1. Validate meeting ID
    try:
        valid_id = validate_meeting_id(meeting_id)
    except InvalidMeetingIdError as exc:
        logger.error("Invalid meeting ID provided to AI pipeline: %s", exc)
        raise

    # 2. Determine canonical transcript path in Supabase Storage
    transcript_path = custom_transcript_path or build_cleaned_transcript_path(valid_id)

    # 3. Standardized Development Logging
    should_use_react = settings.ENABLE_REACT_PIPELINE if use_react is None else use_react
    logger.info("Meeting AI pipeline started (Mode: %s)", "ReAct Agent" if should_use_react else "LangGraph StateGraph")
    logger.info("Meeting ID: %s", valid_id)
    logger.info("Transcript path: %s", transcript_path)

    # Phase 2: ReAct Pipeline Execution with safe fallback to Phase 1
    if should_use_react:
        from app.services.react.graph import run_react_meeting_pipeline
        try:
            react_response = await run_react_meeting_pipeline(
                meeting_id=valid_id,
                custom_transcript_path=transcript_path,
                storage_service=storage_service,
                agent=agent,
                llm_client=llm_client,
                scrum_agent=scrum_agent,
                task_resolution_service=task_resolution_service,
                team_id=team_id,
                meeting_timestamp=meeting_timestamp,
                timezone_str=timezone_str,
                participants=participants,
                team_members=team_members,
                persist_to_database=persist_to_database,
                max_iterations=settings.REACT_MAX_ITERATIONS,
            )
            return react_response
        except (InvalidMeetingIdError, EmptyTranscriptException, TranscriptRetrievalError):
            raise
        except Exception as react_err:
            logger.warning(
                "ReAct pipeline encountered an error for meeting %s: %s; falling back to verified LangGraph workflow",
                valid_id,
                react_err,
            )

    # Phase 1: Verified LangGraph workflow
    from app.services.graphs.meeting_graph import run_meeting_langgraph

    final_state = await run_meeting_langgraph(
        meeting_id=valid_id,
        custom_transcript_path=transcript_path,
        storage_service=storage_service,
        agent=agent,
        llm_client=llm_client,
        run_scrum_agent=run_scrum_agent,
        scrum_agent=scrum_agent,
        run_task_resolution=run_task_resolution,
        task_resolution_service=task_resolution_service,
        team_id=team_id,
        meeting_timestamp=meeting_timestamp,
        timezone_str=timezone_str,
        participants=participants,
        team_members=team_members,
        persist_to_database=persist_to_database,
        max_retries=1,
    )

    # Handle LangGraph failure states and preserve exact exception contracts
    if final_state.get("processing_status") == "FAILED" or final_state.get("error"):
        err_msg = final_state.get("error") or "Unknown LangGraph execution error"
        err_stage = final_state.get("error_stage") or ""

        if "Invalid meeting_id" in err_msg:
            raise InvalidMeetingIdError(err_msg)
        if "Transcript not found" in err_msg or "Failed to download" in err_msg:
            raise TranscriptRetrievalError(err_msg)
        if final_state.get("is_empty_transcript") or "empty for meeting" in err_msg.lower():
            raise EmptyTranscriptException(err_msg)
        if err_stage == "meeting_analysis" or "MainMeetingAgent" in err_msg:
            raise MeetingAnalysisError(err_msg)
        if err_stage == "scrum_extraction" or "ScrumIntelligenceAgent" in err_msg:
            raise ScrumAnalysisError(err_msg)

        raise MeetingAIPipelineError(f"LangGraph execution failed at stage '{err_stage}': {err_msg}")

    analysis = final_state.get("analysis")
    scrum_result = final_state.get("scrum_result")
    resolved_tasks = final_state.get("resolved_tasks")
    duration_ms = final_state.get("duration_ms", int((time.perf_counter() - start_ts) * 1000))

    logger.info(
        "LangGraph AI pipeline completed (duration: %dms, topics: %d, decisions: %d, actions: %d, blockers: %d, tasks: %d, resolved: %d)",
        duration_ms,
        len(analysis.topics) if analysis else 0,
        len(analysis.decisions) if analysis else 0,
        len(analysis.action_items) if analysis else 0,
        len(analysis.blockers) if analysis else 0,
        len(scrum_result.tasks) if scrum_result else 0,
        len(resolved_tasks) if resolved_tasks else 0,
    )

    # Log summary without leaking sensitive credentials
    logger.info("Meeting %s Summary: %s", valid_id, analysis.summary)

    return MeetingAIPipelineResponse(
        meeting_id=valid_id,
        transcript_path=final_state.get("transcript_path", transcript_path),
        transcript_length=final_state.get("transcript_length", 0),
        analysis=analysis,
        scrum_analysis=scrum_result,
        resolved_tasks=resolved_tasks,
        status="COMPLETED",
        error=None,
        duration_ms=duration_ms,
    )

