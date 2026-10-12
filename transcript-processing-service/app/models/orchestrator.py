"""Domain models and schemas for Part 15: Transcript Processing Orchestrator."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.config.formatting import FormattingConfig
from app.models.final_transcript import FinalizationResult
from app.models.meeting_agent import MeetingAnalysisResult
from app.models.processing import ProcessingStatus
from app.models.scrum_agent import ScrumResult
from app.models.resolved_task import ResolvedTask
from app.models.transcript import TranscriptSegment


class StageResult(BaseModel):
    """Result of an individual pipeline stage execution."""

    stage: str = Field(
        ...,
        description="Name of the pipeline stage.",
    )
    success: bool = Field(
        ...,
        description="Whether the stage executed successfully.",
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Warnings accumulated during stage execution.",
    )
    metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Domain metrics produced by the stage.",
    )
    duration_ms: int = Field(
        default=0,
        description="Execution duration for the stage in milliseconds.",
    )
    error: Optional[str] = Field(
        default=None,
        description="Error description if the stage failed.",
    )

    model_config = ConfigDict(populate_by_name=True)


class ProcessingContext(BaseModel):
    """
    Shared context that travels through the 14-stage processing pipeline.
    Accumulates segments, intermediate representations, metadata, warnings, and metrics.
    """

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting being processed.",
    )
    attempt: int = Field(
        default=1,
        description="Processing attempt counter (1-indexed).",
    )
    raw_transcript: str = Field(
        default="",
        description="Raw verbatim transcript string content.",
    )
    raw_transcript_path: str = Field(
        default="",
        description="Storage path to the original raw verbatim transcript.",
    )
    segments: List[TranscriptSegment] = Field(
        default_factory=list,
        description="Active transcript segments undergoing sequential transformations.",
    )
    finalization_result: Optional[FinalizationResult] = Field(
        default=None,
        description="Output from Part 13 Final Transcript Formatting.",
    )
    cleaned_transcript_path: Optional[str] = Field(
        default=None,
        description="Storage path where the final cleaned transcript is stored.",
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Accumulated warnings across all executed stages.",
    )
    metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Combined pipeline and stage metrics.",
    )
    stage_durations: Dict[str, int] = Field(
        default_factory=dict,
        description="Map of stage names to execution duration in milliseconds.",
    )
    stage_history: List[StageResult] = Field(
        default_factory=list,
        description="Chronological log of all executed stage results.",
    )
    current_stage: Optional[str] = Field(
        default=None,
        description="Currently active stage in the pipeline.",
    )
    started_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when pipeline orchestration started.",
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when pipeline orchestration finished.",
    )
    cleaner_version: str = Field(
        default="1.0.0",
        description="Version string of the transcript cleaner pipeline.",
    )
    llm_client: Optional[Any] = Field(
        default=None,
        description="Optional LLM client dependency injected into LLM-enabled stages.",
    )
    formatting_config: Optional[FormattingConfig] = Field(
        default=None,
        description="Custom formatting options for Part 13.",
    )

    model_config = ConfigDict(arbitrary_types_allowed=True, populate_by_name=True)


class ProcessTranscriptRequest(BaseModel):
    """Request payload to initiate transcript cleaning orchestration (Part 15)."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting to process.",
    )
    raw_text: Optional[str] = Field(
        default=None,
        description="Optional raw transcript text directly provided in request.",
    )
    raw_transcript_path: Optional[str] = Field(
        default=None,
        description="Optional custom path to the raw transcript in storage.",
    )
    async_processing: bool = Field(
        default=False,
        description="Whether to execute processing in background and return 202 immediately.",
    )
    formatting_config: Optional[FormattingConfig] = Field(
        default=None,
        description="Optional formatting settings for Part 13.",
    )
    run_ai_pipeline: bool = Field(
        default=True,
        description="Whether to execute the First Stage AI Meeting Agent pipeline after cleaned transcript is stored.",
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "meeting_id": "meeting-123",
                "async_processing": False,
                "run_ai_pipeline": False,
            }
        },
    )


class ProcessTranscriptResponse(BaseModel):
    """Response payload for transcript cleaning orchestration."""

    accepted: bool = Field(
        default=True,
        description="Whether the processing job was accepted or completed.",
    )
    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    processing_status: ProcessingStatus = Field(
        ...,
        description="Overall lifecycle processing status.",
    )
    current_stage: Optional[str] = Field(
        default=None,
        description="Currently active or final stage reached.",
    )
    attempt: int = Field(
        default=1,
        description="Processing attempt number.",
    )
    cleaner_version: str = Field(
        default="1.0.0",
        description="Version of the transcript cleaning pipeline.",
    )
    cleaned_transcript_path: Optional[str] = Field(
        default=None,
        description="Storage path of the final cleaned transcript if completed.",
    )
    error: Optional[str] = Field(
        default=None,
        description="Error description if processing failed.",
    )
    error_stage: Optional[str] = Field(
        default=None,
        description="Pipeline stage where failure occurred, if any.",
    )
    duration_ms: Optional[int] = Field(
        default=None,
        description="Total processing duration in milliseconds.",
    )
    metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Aggregated pipeline metrics.",
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Accumulated warnings across all stages.",
    )
    meeting_analysis: Optional[MeetingAnalysisResult] = Field(
        default=None,
        description="Structured analysis result from the Main Meeting Agent if AI pipeline was executed.",
    )
    scrum_analysis: Optional[ScrumResult] = Field(
        default=None,
        description="Structured Scrum tasks from Scrum Intelligence Agent if AI pipeline was executed.",
    )
    resolved_tasks: Optional[List[ResolvedTask]] = Field(
        default=None,
        description="Deterministically resolved tasks ready for persistence (Stage 3).",
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "accepted": True,
                "meeting_id": "meeting-123",
                "processing_status": "READY_FOR_AI",
                "current_stage": "store",
                "cleaned_transcript_path": "meetings/meeting-123/processed/cleaned_conversation.txt",
                "duration_ms": 320,
                "error": None,
                "metrics": {
                    "total_segments": 10,
                    "included_segments": 9,
                    "excluded_segments": 1,
                },
                "warnings": [],
            }
        },
    )
