"""Domain models and schemas for Part 16: Scrum Intelligence Agent (Stage 2)."""

from typing import Any, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

TaskType = Literal["task", "bug", "story", "improvement", "research"]
TaskPriority = Literal["low", "medium", "high", "critical"]


class ScrumTask(BaseModel):
    """Structured work item for Scrum / Kanban tracking."""

    title: str = Field(
        ...,
        description="Clear, concise task title summarizing the actionable work item.",
    )
    description: str = Field(
        ...,
        description="Actionable description of the work to be performed, including context from the meeting.",
    )
    assignee: Optional[str] = Field(
        default=None,
        description="Explicit owner/assignee directly supported by the meeting analysis; null if unassigned or ambiguous.",
    )
    priority: Optional[TaskPriority] = Field(
        default=None,
        description="Priority level ('low', 'medium', 'high', 'critical'); null if not directly indicated.",
    )
    due_date: Optional[str] = Field(
        default=None,
        description="Explicit deadline or relative target ('tomorrow', 'by Friday', 'by October 10'); null if unspecified.",
    )
    type: TaskType = Field(
        default="task",
        description="Work item category: 'task', 'bug', 'story', 'improvement', 'research'.",
    )
    acceptance_criteria: List[str] = Field(
        default_factory=list,
        description="Verifiable acceptance criteria derived from the requirement; empty list if none can be derived.",
    )
    source_action_item: Optional[str] = Field(
        default=None,
        description="The source action item or blocker text from Stage 1 for full traceability.",
    )

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
    )

    @field_validator("priority", mode="before")
    @classmethod
    def normalize_priority(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            clean = v.strip().lower()
            if clean in ("low", "medium", "high", "critical"):
                return clean
            if clean in ("none", "null", "n/a", "unknown", "unassigned", ""):
                return None
        return None

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, v: Any) -> str:
        if isinstance(v, str):
            clean = v.strip().lower()
            if clean in ("task", "bug", "story", "improvement", "research"):
                return clean
        return "task"

    @field_validator("assignee", mode="before")
    @classmethod
    def normalize_assignee(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            clean = v.strip()
            if not clean or clean.lower() in ("null", "none", "n/a", "unassigned", "team", "everyone", "all"):
                return None
            return clean
        return None

    @field_validator("due_date", mode="before")
    @classmethod
    def normalize_due_date(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            clean = v.strip()
            if not clean or clean.lower() in ("null", "none", "n/a", "unspecified", "tbd", "unknown"):
                return None
            return clean
        return None


class ScrumResult(BaseModel):
    """Structured output produced by the Scrum Intelligence Agent."""

    tasks: List[ScrumTask] = Field(
        default_factory=list,
        description="List of structured Scrum/Kanban work items generated from meeting analysis.",
    )

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
        json_schema_extra={
            "example": {
                "tasks": [
                    {
                        "title": "Fix authentication API",
                        "description": "Resolve the authentication API issue discussed during the meeting.",
                        "assignee": "Bob",
                        "priority": "high",
                        "due_date": "2026-10-05",
                        "type": "task",
                        "acceptance_criteria": [
                            "Authentication API works correctly",
                            "Existing login flow remains functional",
                        ],
                        "source_action_item": "Bob will fix the authentication API before Friday.",
                    }
                ]
            }
        },
    )
