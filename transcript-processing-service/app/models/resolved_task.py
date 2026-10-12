import uuid
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class ResolvedTask(BaseModel):
    """Deterministic resolved task schema ready for persistence in meeting_summaries.tickets_generated."""

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Stable unique task identifier across Kanban and persistence.",
    )
    ticket_id: Optional[str] = Field(
        default=None,
        description="Alias or ticket identifier matching id.",
    )
    title: str = Field(
        ...,
        description="Action-oriented task title (non-empty).",
    )
    description: str = Field(
        default="",
        description="Detailed description including background context and rationale.",
    )
    assignee: Optional[str] = Field(
        default=None,
        description="Resolved assignee full name if uniquely matched; None if ambiguous or unresolved.",
    )
    assignee_id: Optional[str] = Field(
        default=None,
        description="Resolved internal user UUID if uniquely matched; None if ambiguous or unresolved.",
    )
    raw_assignee: Optional[str] = Field(
        default=None,
        description="Original raw assignee string extracted from transcript/action item.",
    )
    priority: Literal["low", "medium", "high", "urgent"] = Field(
        default="medium",
        description="Task priority matching ScrumTask and Kanban representations.",
    )
    due_date: Optional[str] = Field(
        default=None,
        description="Original raw or normalized relative due date string.",
    )
    resolved_due_date: Optional[str] = Field(
        default=None,
        description="ISO 8601 formatted timestamp in meeting timezone if deterministically resolved; None if ambiguous or unresolvable.",
    )
    type: Literal["task", "bug", "feature", "improvement"] = Field(
        default="task",
        description="Scrum work item type.",
    )
    status: Literal["todo", "backlog", "in_progress", "review", "done"] = Field(
        default="todo",
        description="Initial workflow status. All AI-generated tasks start at 'todo'.",
    )
    acceptance_criteria: List[str] = Field(
        default_factory=list,
        description="List of verifiable acceptance criteria.",
    )
    source_action_item: Optional[str] = Field(
        default=None,
        description="Original action item from Stage 1 MeetingAnalysisResult.",
    )
    meeting_id: str = Field(
        ...,
        description="Meeting UUID provenance.",
    )
    team_id: str = Field(
        ...,
        description="Team/workspace UUID provenance.",
    )

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
        json_schema_extra={
            "example": {
                "title": "Fix database connection timeout",
                "description": "Configure pool max connections and keep-alive headers.",
                "assignee": "Rahul Sharma",
                "assignee_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
                "raw_assignee": "Rahul",
                "priority": "high",
                "due_date": "tomorrow",
                "resolved_due_date": "2026-10-03T23:59:59+05:30",
                "type": "bug",
                "status": "todo",
                "acceptance_criteria": ["Verify connection pool timeout is set to 30s"],
                "source_action_item": "Rahul to investigate pool timeouts by tomorrow",
                "meeting_id": "7d51a680-7592-4484-9c00-18692481a2ea",
                "team_id": "2b0d7b3d-3b7d-4bad-9bdd-9b1deb4dcb6d",
            }
        },
    )


class TaskResolutionResult(BaseModel):
    """Result envelope for Stage 3 task resolution."""

    meeting_id: str = Field(..., description="Target meeting UUID.")
    team_id: str = Field(..., description="Target team UUID.")
    tasks: List[ResolvedTask] = Field(
        default_factory=list,
        description="List of deterministically resolved tasks.",
    )
    total_tasks: int = Field(default=0, description="Total tasks processed.")
    resolved_assignees: int = Field(default=0, description="Tasks with successfully resolved assignee IDs.")
    unresolved_assignees: int = Field(default=0, description="Tasks with unresolved or ambiguous assignees.")
    resolved_due_dates: int = Field(default=0, description="Tasks with successfully resolved calendar due dates.")
    unresolved_due_dates: int = Field(default=0, description="Tasks with unresolvable or ambiguous due dates.")

    model_config = ConfigDict(populate_by_name=True)
