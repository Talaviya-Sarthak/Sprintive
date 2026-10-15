"""Domain models and schemas for Phase 2 ReAct agent pattern."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ReActAction(BaseModel):
    """
    Structured decision produced by the ReAct agent in each reasoning cycle.
    Enforces explicit reasoning ('thought') prior to tool dispatch ('action').
    """
    thought: str = Field(
        ...,
        description="Reasoning about the current observations, what information is known, and what action to take next.",
    )
    action: str = Field(
        ...,
        description="The tool to invoke ('analyze_meeting', 'extract_scrum_tasks', 'resolve_and_validate_tasks', 'inspect_meeting_context', or 'finish').",
    )
    action_input: Dict[str, Any] = Field(
        default_factory=dict,
        description="Input parameters for the chosen tool. Can be empty for tools that consume prior context.",
    )


class ToolObservation(BaseModel):
    """Structured response returned by tool execution back to the ReAct agent."""
    tool_name: str
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    summary: str = Field(
        ...,
        description="Short human/LLM-readable observation summarizing the outcome of the action.",
    )


class ReActStep(BaseModel):
    """A single completed iteration in the ReAct scratchpad."""
    iteration: int
    thought: str
    action: str
    action_input: Dict[str, Any]
    observation: ToolObservation
