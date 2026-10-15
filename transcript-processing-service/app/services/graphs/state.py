"""Typed shared graph state for Sprintive Meeting LangGraph Orchestrator."""

from typing import Any, Dict, List, Optional, TypedDict
from app.models.meeting_agent import MeetingAnalysisResult
from app.models.resolved_task import ResolvedTask
from app.models.scrum_agent import ScrumResult


class MeetingWorkflowState(TypedDict, total=False):
    """
    Central typed state schema passed across all nodes in the Meeting LangGraph.
    Adheres strictly to Phase 1: deterministic orchestration with bounded retries.
    """
    # Identifiers & Inputs
    meeting_id: str
    custom_transcript_path: Optional[str]
    raw_text: Optional[str]
    transcript_path: Optional[str]
    clean_transcript: Optional[str]
    transcript_length: int
    cleaner_version: str
    formatting_config: Optional[Any]

    # Team & Meeting Context (from DB or Caller)
    team_id: Optional[str]
    meeting_timestamp: Optional[Any]
    timezone: str
    participants: Optional[List[Dict[str, Any]]]
    team_members: Optional[List[Dict[str, Any]]]
    existing_tasks: Optional[List[Dict[str, Any]]]
    duration_minutes: int
    attendance_count: int

    # Stage Controls
    run_scrum_agent: bool
    run_task_resolution: bool
    persist_to_database: bool

    # Stage Outputs
    analysis: Optional[MeetingAnalysisResult]
    scrum_result: Optional[ScrumResult]
    resolved_tasks: Optional[List[ResolvedTask]]
    persisted: bool

    # Retry Counters & Flow Control
    meeting_agent_retries: int
    scrum_agent_retries: int
    max_retries: int
    current_stage: str
    processing_status: str  # "PROCESSING", "CLEANING", "VALIDATING", "READY_FOR_AI", "COMPLETED", "FAILED"

    # Error & Validation Telemetry
    error: Optional[str]
    error_stage: Optional[str]
    is_empty_transcript: bool
    is_empty_tasks: bool
    validation_passed: bool
    warnings: List[str]
    duration_ms: int
