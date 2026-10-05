"""Domain models and schemas for the Main Meeting Analysis Agent."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.scrum_agent import ScrumResult
from app.models.resolved_task import ResolvedTask


class MeetingAnalysisResult(BaseModel):
    """Structured analysis response produced by the Main Meeting Analysis Agent."""

    summary: str = Field(
        ...,
        description="High-level executive summary of the meeting context and outcomes.",
    )
    topics: List[str] = Field(
        default_factory=list,
        description="Key discussion topics covered during the meeting.",
    )
    decisions: List[str] = Field(
        default_factory=list,
        description="Important decisions or consensus points reached by the participants.",
    )
    action_items: List[str] = Field(
        default_factory=list,
        description="Assigned tasks, follow-up action items, and next steps.",
    )
    blockers: List[str] = Field(
        default_factory=list,
        description="Blockers, technical impediments, or open questions raised.",
    )

    @field_validator("topics", "decisions", "action_items", "blockers", mode="before")
    @classmethod
    def normalize_string_list(cls, v: Any) -> List[str]:
        if not isinstance(v, list):
            return [str(v)] if v else []
        normalized = []
        for item in v:
            if isinstance(item, str):
                normalized.append(item)
            elif isinstance(item, dict):
                assignee = item.get("assignee") or item.get("owner")
                task = item.get("task") or item.get("description") or item.get("title") or item.get("action") or item.get("item")
                due = item.get("due") or item.get("due_date") or item.get("deadline")
                parts = []
                if assignee:
                    parts.append(f"{assignee} will")
                if task:
                    parts.append(str(task))
                if due:
                    parts.append(f"(due: {due})")
                normalized.append(" ".join(parts) if parts else str(item))
            else:
                normalized.append(str(item))
        return normalized

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
        json_schema_extra={
            "example": {
                "summary": "Team discussed database connection timeouts affecting API testing and agreed to restart the container.",
                "topics": ["Database Connection", "API Testing", "Container Restart"],
                "decisions": ["Restart the backend container to clear connection pool limits."],
                "action_items": ["Restart container and verify SSL certificate configuration."],
                "blockers": ["Database connection timeout on port 5432 due to pool exhaustion."],
            }
        },
    )


class MeetingAIPipelineResponse(BaseModel):
    """Response envelope for the Meeting AI Pipeline execution."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting analyzed.",
    )
    transcript_path: str = Field(
        ...,
        description="Storage path of the transcript retrieved from Supabase Storage.",
    )
    transcript_length: int = Field(
        ...,
        description="Total character length of the decoded UTF-8 transcript.",
    )
    analysis: Optional[MeetingAnalysisResult] = Field(
        default=None,
        description="Structured analysis from the Main Meeting Agent.",
    )
    scrum_analysis: Optional[ScrumResult] = Field(
        default=None,
        description="Structured Scrum/Kanban tasks produced by the Scrum Intelligence Agent.",
    )
    resolved_tasks: Optional[List[ResolvedTask]] = Field(
        default=None,
        description="Deterministically resolved tasks ready for persistence (Stage 3).",
    )
    status: str = Field(
        default="COMPLETED",
        description="Status of the AI pipeline execution ('COMPLETED' or 'FAILED').",
    )
    error: Optional[str] = Field(
        default=None,
        description="Error details if the pipeline failed.",
    )
    duration_ms: int = Field(
        default=0,
        description="Total duration of the AI pipeline in milliseconds.",
    )

    model_config = ConfigDict(populate_by_name=True)
