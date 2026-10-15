"""Explicit Graph Nodes for Sprintive Meeting LangGraph Orchestrator.

Encapsulates each stage of the meeting AI pipeline as a modular, testable node function.
Preserves existing agents, LLM clients, deterministic services, and database persistence.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from app.config.storage import (
    InvalidMeetingIdError,
    build_cleaned_transcript_path,
    validate_meeting_id,
)
from app.models.meeting_agent import MeetingAnalysisResult
from app.models.resolved_task import ResolvedTask
from app.models.scrum_agent import ScrumResult
from app.services.database import get_meeting_context, persist_meeting_summary_to_db
from app.services.graphs.state import MeetingWorkflowState
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
    TranscriptStorageError,
    TranscriptStorageService,
    get_storage_service,
)
from app.services.task_resolution_service import (
    TaskResolutionService,
    TaskValidationError,
    get_task_resolution_service,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Node 1: Transcript Validation & Cleaning Integration
# ---------------------------------------------------------------------------

async def validate_transcript_node(
    state: MeetingWorkflowState,
    storage_service: Optional[TranscriptStorageService] = None,
) -> Dict[str, Any]:
    """
    Validates the meeting ID, resolves database context (team, participants, members, existing tasks),
    retrieves the cleaned transcript string from storage (or direct raw_text/clean_transcript input),
    and validates transcript presence and encoding.
    """
    meeting_id = state.get("meeting_id", "")
    logger.info("LangGraph Node: validate_transcript for meeting '%s'", meeting_id)

    # 1. Validate meeting ID
    try:
        valid_id = validate_meeting_id(meeting_id)
    except InvalidMeetingIdError as exc:
        logger.error("validate_transcript_node: Invalid meeting_id '%s': %s", meeting_id, exc)
        return {
            "error": f"Invalid meeting_id: {str(exc)}",
            "error_stage": "validate_transcript",
            "processing_status": "FAILED",
            "is_empty_transcript": False,
        }

    # 2. Resolve database context if fields are missing
    db_context = await asyncio.to_thread(get_meeting_context, valid_id)
    effective_team_id = state.get("team_id") or db_context.get("team_id") or f"team-{valid_id}"
    effective_participants = state.get("participants") if state.get("participants") is not None else db_context.get("participants", [])
    effective_team_members = state.get("team_members") if state.get("team_members") is not None else db_context.get("team_members", [])
    effective_meeting_timestamp = state.get("meeting_timestamp") or db_context.get("started_at") or db_context.get("scheduled_start")
    meeting_duration_minutes = state.get("duration_minutes") or db_context.get("duration_minutes", 0)
    existing_tasks = state.get("existing_tasks") if state.get("existing_tasks") is not None else db_context.get("existing_tasks", [])

    # 3. Resolve transcript path
    custom_path = state.get("custom_transcript_path")
    transcript_path = custom_path or build_cleaned_transcript_path(valid_id)

    # 4. Acquire transcript content
    transcript_str = state.get("clean_transcript") or state.get("raw_text")
    if not transcript_str:
        storage = storage_service or get_storage_service()
        try:
            raw_content = await asyncio.to_thread(storage.provider.get_text, transcript_path)
            if isinstance(raw_content, bytes):
                transcript_str = raw_content.decode("utf-8")
            else:
                transcript_str = str(raw_content)
        except FileNotFoundError as fnf_err:
            logger.error("Transcript file not found at '%s' for meeting %s", transcript_path, valid_id)
            return {
                "error": f"Transcript not found at storage path: {transcript_path}",
                "error_stage": "validate_transcript",
                "processing_status": "FAILED",
                "is_empty_transcript": False,
            }
        except Exception as exc:
            logger.exception("Error downloading transcript for meeting %s: %s", valid_id, exc)
            return {
                "error": f"Failed to download transcript from storage: {str(exc)}",
                "error_stage": "validate_transcript",
                "processing_status": "FAILED",
                "is_empty_transcript": False,
            }

    # 5. Check empty transcript
    if not transcript_str or not transcript_str.strip():
        logger.error("validate_transcript_node: Empty transcript for meeting %s", valid_id)
        return {
            "error": f"Downloaded transcript is empty for meeting {valid_id}.",
            "error_stage": "validate_transcript",
            "processing_status": "FAILED",
            "is_empty_transcript": True,
        }

    return {
        "meeting_id": valid_id,
        "clean_transcript": transcript_str,
        "transcript_path": transcript_path,
        "transcript_length": len(transcript_str),
        "team_id": effective_team_id,
        "participants": effective_participants,
        "team_members": effective_team_members,
        "meeting_timestamp": effective_meeting_timestamp,
        "duration_minutes": meeting_duration_minutes,
        "attendance_count": len(effective_participants),
        "existing_tasks": existing_tasks,
        "is_empty_transcript": False,
        "error": None,
        "error_stage": None,
        "current_stage": "validate_transcript",
    }


# ---------------------------------------------------------------------------
# Node 2: Meeting Analysis (MainMeetingAgent)
# ---------------------------------------------------------------------------

async def meeting_analysis_node(
    state: MeetingWorkflowState,
    agent: Optional[MainMeetingAgent] = None,
) -> Dict[str, Any]:
    """
    Executes Stage 1 analysis using MainMeetingAgent.
    Runs via asyncio.to_thread to maintain non-blocking execution.
    Manages bounded retries for transient LLM issues.
    """
    meeting_id = state.get("meeting_id", "")
    transcript_str = state.get("clean_transcript", "")
    retries = state.get("meeting_agent_retries", 0)
    max_retries = state.get("max_retries", 2)

    logger.info("LangGraph Node: meeting_analysis for meeting '%s' (attempt %d/%d)", meeting_id, retries + 1, max_retries + 1)

    if not transcript_str or not transcript_str.strip():
        return {
            "error": "Cannot execute meeting analysis on empty transcript.",
            "error_stage": "meeting_analysis",
            "processing_status": "FAILED",
        }

    analysis_agent = agent or get_main_meeting_agent()

    try:
        analysis: MeetingAnalysisResult = await asyncio.to_thread(
            analysis_agent.analyze_transcript, transcript_str
        )
        logger.info(
            "meeting_analysis_node completed: %d topics, %d decisions, %d action items, %d blockers",
            len(analysis.topics),
            len(analysis.decisions),
            len(analysis.action_items),
            len(analysis.blockers),
        )
        return {
            "analysis": analysis,
            "error": None,
            "error_stage": None,
            "current_stage": "meeting_analysis",
        }
    except Exception as exc:
        new_retries = retries + 1
        logger.error("meeting_analysis_node failed on attempt %d: %s", new_retries, exc)
        return {
            "meeting_agent_retries": new_retries,
            "error": str(exc),
            "error_stage": "meeting_analysis",
            "processing_status": "FAILED" if new_retries > max_retries else "PROCESSING",
        }


# ---------------------------------------------------------------------------
# Node 3: Scrum Task Extraction (ScrumIntelligenceAgent)
# ---------------------------------------------------------------------------

async def scrum_extraction_node(
    state: MeetingWorkflowState,
    agent: Optional[ScrumIntelligenceAgent] = None,
) -> Dict[str, Any]:
    """
    Executes Stage 2 Scrum task extraction using ScrumIntelligenceAgent.
    Enforces deterministic short-circuit: if action_items and blockers are empty,
    bypasses LLM call entirely and produces ScrumResult(tasks=[]).
    Runs via asyncio.to_thread with bounded retries.
    """
    meeting_id = state.get("meeting_id", "")
    analysis = state.get("analysis")
    retries = state.get("scrum_agent_retries", 0)
    max_retries = state.get("max_retries", 2)

    logger.info("LangGraph Node: scrum_extraction for meeting '%s'", meeting_id)

    if analysis is None:
        return {
            "error": "Cannot execute Scrum extraction without MeetingAnalysisResult.",
            "error_stage": "scrum_extraction",
            "processing_status": "FAILED",
        }

    # Deterministic Optimization: Avoid redundant LLM call when no action items or blockers exist
    if not analysis.action_items and not analysis.blockers:
        logger.info("scrum_extraction_node: 0 action items and 0 blockers detected; returning empty ScrumResult without LLM call")
        return {
            "scrum_result": ScrumResult(tasks=[]),
            "resolved_tasks": [],
            "is_empty_tasks": True,
            "error": None,
            "error_stage": None,
            "current_stage": "scrum_extraction",
        }

    scrum_agent = agent or get_scrum_intelligence_agent()

    try:
        scrum_result: ScrumResult = await asyncio.to_thread(
            scrum_agent.analyze, analysis
        )
        tasks_count = len(scrum_result.tasks)
        logger.info("scrum_extraction_node completed: %d raw tasks extracted", tasks_count)
        return {
            "scrum_result": scrum_result,
            "is_empty_tasks": tasks_count == 0,
            "error": None,
            "error_stage": None,
            "current_stage": "scrum_extraction",
        }
    except Exception as exc:
        new_retries = retries + 1
        logger.error("scrum_extraction_node failed on attempt %d: %s", new_retries, exc)
        return {
            "scrum_agent_retries": new_retries,
            "error": str(exc),
            "error_stage": "scrum_extraction",
            "processing_status": "FAILED" if new_retries > max_retries else "PROCESSING",
        }


# ---------------------------------------------------------------------------
# Node 4: Deterministic Task Resolution (TaskResolutionService)
# ---------------------------------------------------------------------------

async def task_resolution_node(
    state: MeetingWorkflowState,
    service: Optional[TaskResolutionService] = None,
) -> Dict[str, Any]:
    """
    Executes Stage 3: Resolves assignees against meeting participants & team members,
    calculates calendar due dates, validates task constraints, and reconciles with
    existing tasks to maintain stable IDs and status.
    """
    meeting_id = state.get("meeting_id", "")
    scrum_result = state.get("scrum_result")
    logger.info("LangGraph Node: task_resolution for meeting '%s'", meeting_id)

    if not scrum_result or not scrum_result.tasks:
        logger.info("task_resolution_node: No Scrum tasks to resolve; returning empty list.")
        return {
            "resolved_tasks": [],
            "error": None,
            "error_stage": None,
            "current_stage": "task_resolution",
        }

    resolver = service or get_task_resolution_service()

    try:
        resolution_result = resolver.resolve_tasks(
            scrum_result=scrum_result,
            meeting_id=meeting_id,
            team_id=state.get("team_id") or f"team-{meeting_id}",
            meeting_timestamp=state.get("meeting_timestamp"),
            timezone_str=state.get("timezone", "UTC"),
            participants=state.get("participants"),
            team_members=state.get("team_members"),
            existing_tasks=state.get("existing_tasks"),
        )
        resolved_tasks = resolution_result.tasks

        # Safe Deterministic Batch Deduplication
        seen_keys = set()
        deduped_tasks: List[ResolvedTask] = []
        for task in resolved_tasks:
            t_key = f"{task.id}:{task.title.strip().lower()}:{task.source_action_item.strip().lower()}"
            if t_key in seen_keys:
                continue
            seen_keys.add(t_key)
            deduped_tasks.append(task)

        logger.info("task_resolution_node completed: %d tasks resolved (%d deduplicated)", len(deduped_tasks), len(resolved_tasks) - len(deduped_tasks))
        return {
            "resolved_tasks": deduped_tasks,
            "error": None,
            "error_stage": None,
            "current_stage": "task_resolution",
        }
    except Exception as exc:
        logger.exception("task_resolution_node failed for meeting %s: %s", meeting_id, exc)
        return {
            "error": f"Task resolution failed: {str(exc)}",
            "error_stage": "task_resolution",
            "processing_status": "FAILED",
        }


# ---------------------------------------------------------------------------
# Node 5: Output Validation
# ---------------------------------------------------------------------------

async def output_validation_node(state: MeetingWorkflowState) -> Dict[str, Any]:
    """
    Validates pipeline outputs prior to database commit:
    - Verifies analysis integrity (non-empty summary if transcript was non-empty).
    - Verifies resolved task schema adherence and status consistency.
    """
    meeting_id = state.get("meeting_id", "")
    analysis = state.get("analysis")
    resolved_tasks = state.get("resolved_tasks")
    logger.info("LangGraph Node: output_validation for meeting '%s'", meeting_id)

    warnings: List[str] = list(state.get("warnings") or [])

    if analysis is None:
        return {
            "validation_passed": False,
            "error": "Output validation failed: Missing MeetingAnalysisResult.",
            "error_stage": "output_validation",
            "processing_status": "FAILED",
        }

    if not analysis.summary or not analysis.summary.strip():
        warnings.append("Meeting analysis produced an empty summary text.")

    if resolved_tasks:
        for idx, task in enumerate(resolved_tasks):
            if not task.id or not task.title:
                return {
                    "validation_passed": False,
                    "error": f"Output validation failed: Task at index {idx} lacks required id or title.",
                    "error_stage": "output_validation",
                    "processing_status": "FAILED",
                }

    logger.info("output_validation_node passed successfully (warnings: %d)", len(warnings))
    return {
        "validation_passed": True,
        "warnings": warnings,
        "error": None,
        "error_stage": None,
        "current_stage": "output_validation",
    }


# ---------------------------------------------------------------------------
# Node 6: Controlled Persistence
# ---------------------------------------------------------------------------

async def controlled_persistence_node(state: MeetingWorkflowState) -> Dict[str, Any]:
    """
    Persists AI summary, action items, and resolved Kanban tasks to PostgreSQL.
    Uses atomic upsert (ON CONFLICT DO UPDATE) with deterministic deduplication.
    """
    meeting_id = state.get("meeting_id", "")
    analysis = state.get("analysis")
    persist_flag = state.get("persist_to_database", True)
    logger.info("LangGraph Node: controlled_persistence for meeting '%s' (persist=%s)", meeting_id, persist_flag)

    if not persist_flag or not analysis:
        logger.info("controlled_persistence_node skipped (persist_to_database=%s)", persist_flag)
        return {
            "persisted": False,
            "current_stage": "controlled_persistence",
        }

    tasks_to_persist = state.get("resolved_tasks")
    if tasks_to_persist is None:
        scrum_res = state.get("scrum_result")
        tasks_to_persist = scrum_res.tasks if scrum_res else []

    try:
        persist_success = await asyncio.to_thread(
            persist_meeting_summary_to_db,
            meeting_id=meeting_id,
            ai_summary=analysis.summary,
            action_items=analysis.action_items,
            tickets_generated=tasks_to_persist,
            duration_minutes=state.get("duration_minutes", 0),
            attendance_count=state.get("attendance_count", 0),
        )
        if persist_success:
            logger.info("controlled_persistence_node: Database persistence successful for meeting %s", meeting_id)
            return {
                "persisted": True,
                "error": None,
                "error_stage": None,
                "current_stage": "controlled_persistence",
            }
        else:
            logger.error("controlled_persistence_node: Database persistence returned False for meeting %s", meeting_id)
            return {
                "persisted": False,
                "error": f"Database persistence failed for meeting {meeting_id}",
                "error_stage": "controlled_persistence",
                "processing_status": "FAILED",
                "current_stage": "controlled_persistence",
            }
    except Exception as exc:
        logger.exception("controlled_persistence_node failed for meeting %s: %s", meeting_id, exc)
        return {
            "persisted": False,
            "error": f"Database persistence failure: {str(exc)}",
            "error_stage": "controlled_persistence",
            "processing_status": "FAILED",
        }


# ---------------------------------------------------------------------------
# Node 7: Final Processing Status
# ---------------------------------------------------------------------------

async def final_processing_status_node(state: MeetingWorkflowState) -> Dict[str, Any]:
    """
    Marks the processing status as COMPLETED and records completion telemetry.
    """
    meeting_id = state.get("meeting_id", "")
    logger.info("LangGraph Node: final_processing_status: COMPLETED for meeting '%s'", meeting_id)
    return {
        "processing_status": "COMPLETED",
        "current_stage": "completed",
    }


# ---------------------------------------------------------------------------
# Node 8: Failure Handling Node
# ---------------------------------------------------------------------------

async def failure_handling_node(state: MeetingWorkflowState) -> Dict[str, Any]:
    """
    Standardized terminal node for unrecoverable errors.
    Ensures state reflects failed processing and logs failure context.
    """
    meeting_id = state.get("meeting_id", "")
    error = state.get("error") or "Unknown workflow error"
    error_stage = state.get("error_stage") or state.get("current_stage") or "workflow"

    logger.error("LangGraph Node: failure_handling: Meeting '%s' failed at stage '%s': %s", meeting_id, error_stage, error)
    return {
        "processing_status": "FAILED",
        "current_stage": "failed",
    }
