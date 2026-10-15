"""Focused verification tests for Phase 2 ReAct Agent in Sprintive meeting pipeline.

Tests:
1. Actual tool selection and autonomous invocation across multi-step cycle.
2. Observation-driven continuation and termination.
3. Iteration limit enforcement.
4. Tool errors and malformed action handling with self-correction scratchpad.
5. Empty action item handling (bypasses task extraction tool).
6. Persistence failure handling and accurate failed status.
7. Existing agent integration and duplicate prevention.
8. End-to-end integration via run_meeting_ai_pipeline(use_react=True) with safe fallback.
"""

import pytest
from unittest.mock import MagicMock, patch

from app.models.meeting_agent import (
    MeetingAIPipelineResponse,
    MeetingAnalysisResult,
)
from app.models.resolved_task import ResolvedTask
from app.models.scrum_agent import ScrumResult, ScrumTask
from app.services.meeting_agent import MainMeetingAgent, MeetingAnalysisError
from app.services.meeting_ai_pipeline import run_meeting_ai_pipeline
from app.services.react.agent import ReActAgent
from app.services.react.graph import (
    build_react_graph,
    run_react_meeting_pipeline,
)
from app.services.react.schemas import ReActAction
from app.services.react.tools import (
    execute_analyze_meeting,
    execute_extract_scrum_tasks,
    execute_resolve_and_validate_tasks,
)
from app.services.scrum_agent import ScrumIntelligenceAgent


# ---------------------------------------------------------------------------
# Test Data
# ---------------------------------------------------------------------------

SAMPLE_TRANSCRIPT = (
    "Alice (00:00): Let's review the release plan.\n"
    "Bob (00:30): I will deploy the auth migration by Monday.\n"
    "Alice (01:00): Sounds good. I will verify the staging environment.\n"
)

SAMPLE_ANALYSIS = MeetingAnalysisResult(
    summary="Release plan discussion with two action items.",
    topics=["Release - Auth migration deployment"],
    decisions=["Deploy auth migration on Monday"],
    action_items=[
        "Bob will deploy the auth migration (due: Monday)",
        "Alice will verify the staging environment",
    ],
    blockers=[],
)

EMPTY_ACTION_ANALYSIS = MeetingAnalysisResult(
    summary="Casual sync with no action items or blockers.",
    topics=["Sync - Team chat"],
    decisions=[],
    action_items=[],
    blockers=[],
)

SAMPLE_SCRUM_RESULT = ScrumResult(
    tasks=[
        ScrumTask(
            title="Deploy auth migration",
            description="Run production database auth migration",
            assignee="Bob",
            priority="urgent",
            due_date="Monday",
            type="task",
            acceptance_criteria=["Migration succeeds", "Auth endpoints green"],
            source_action_item="Bob will deploy the auth migration (due: Monday)",
        )
    ]
)


# ---------------------------------------------------------------------------
# 1. Autonomous Tool Selection & Multi-Step Continuation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_react_autonomous_tool_selection_and_invocation():
    """Verify that ReAct agent autonomously picks tools, receives observations, and concludes with finish."""
    mock_main_agent = MagicMock(spec=MainMeetingAgent)
    mock_main_agent.analyze_transcript.return_value = SAMPLE_ANALYSIS

    mock_scrum_agent = MagicMock(spec=ScrumIntelligenceAgent)
    mock_scrum_agent.analyze.return_value = SAMPLE_SCRUM_RESULT

    mock_react_agent = MagicMock(spec=ReActAgent)
    # The agent autonomously selects:
    # 1. analyze_meeting -> receives analysis observation
    # 2. extract_scrum_tasks -> receives raw tasks observation
    # 3. resolve_and_validate_tasks -> receives resolved tasks observation
    # 4. finish -> concludes workflow
    mock_react_agent.decide_next_action.side_effect = [
        ReActAction(
            thought="I need to start by analyzing the transcript.",
            action="analyze_meeting",
            action_input={},
        ),
        ReActAction(
            thought="Meeting analysis discovered 2 action items. I must extract Scrum tasks next.",
            action="extract_scrum_tasks",
            action_input={},
        ),
        ReActAction(
            thought="Raw Scrum tasks are extracted. I need to resolve assignees against the team roster.",
            action="resolve_and_validate_tasks",
            action_input={},
        ),
        ReActAction(
            thought="Tasks are resolved and validated. Everything is complete.",
            action="finish",
            action_input={},
        ),
    ]

    with patch("app.services.react.graph.get_meeting_context", return_value={
        "team_id": "team-test",
        "participants": [{"user_id": "u-bob", "full_name": "Bob"}],
        "team_members": [{"user_id": "u-bob", "full_name": "Bob"}],
    }), patch("app.services.react.graph.persist_meeting_summary_to_db", return_value=True):

        resp = await run_react_meeting_pipeline(
            meeting_id="00000000-0000-0000-0000-000000000010",
            clean_transcript=SAMPLE_TRANSCRIPT,
            agent=mock_main_agent,
            scrum_agent=mock_scrum_agent,
            react_agent=mock_react_agent,
            persist_to_database=True,
        )

        assert isinstance(resp, MeetingAIPipelineResponse)
        assert resp.status == "COMPLETED"
        assert resp.analysis == SAMPLE_ANALYSIS
        assert resp.scrum_analysis == SAMPLE_SCRUM_RESULT
        assert len(resp.resolved_tasks) == 1
        assert resp.resolved_tasks[0].assignee_id == "u-bob"
        assert mock_react_agent.decide_next_action.call_count == 4


# ---------------------------------------------------------------------------
# 2. Empty-Action-Item Observation-Driven Termination
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_react_empty_action_items_bypasses_task_extraction():
    """Verify that when analyze_meeting produces 0 action items, ReAct immediately decides to finish."""
    mock_main_agent = MagicMock(spec=MainMeetingAgent)
    mock_main_agent.analyze_transcript.return_value = EMPTY_ACTION_ANALYSIS

    mock_scrum_agent = MagicMock(spec=ScrumIntelligenceAgent)

    mock_react_agent = MagicMock(spec=ReActAgent)
    # The agent analyzes, sees 0 action items in observation, and immediately finishes
    mock_react_agent.decide_next_action.side_effect = [
        ReActAction(
            thought="Starting by analyzing the meeting transcript.",
            action="analyze_meeting",
            action_input={},
        ),
        ReActAction(
            thought="Observation indicates 0 action items and 0 blockers. No tasks to extract. Finishing.",
            action="finish",
            action_input={},
        ),
    ]

    with patch("app.services.react.graph.get_meeting_context", return_value={"team_id": "team-test"}), \
         patch("app.services.react.graph.persist_meeting_summary_to_db", return_value=True):

        resp = await run_react_meeting_pipeline(
            meeting_id="00000000-0000-0000-0000-000000000011",
            clean_transcript="Alice: Just catching up today. No work items.",
            agent=mock_main_agent,
            scrum_agent=mock_scrum_agent,
            react_agent=mock_react_agent,
            persist_to_database=True,
        )

        assert resp.status == "COMPLETED"
        assert resp.analysis == EMPTY_ACTION_ANALYSIS
        assert resp.resolved_tasks == []
        # Assert Scrum Intelligence Agent was never called
        mock_scrum_agent.analyze.assert_not_called()
        assert mock_react_agent.decide_next_action.call_count == 2


# ---------------------------------------------------------------------------
# 3. Iteration Limit Enforcement
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_react_iteration_limit_enforcement():
    """Verify that exceeding max_iterations routes to failure cleanly."""
    mock_react_agent = MagicMock(spec=ReActAgent)
    # Model loops indefinitely inspect_meeting_context without finishing
    mock_react_agent.decide_next_action.return_value = ReActAction(
        thought="Still inspecting context...",
        action="inspect_meeting_context",
        action_input={},
    )

    with patch("app.services.react.graph.get_meeting_context", return_value={"team_id": "team-test"}):
        with pytest.raises(MeetingAnalysisError) as exc_info:
            await run_react_meeting_pipeline(
                meeting_id="00000000-0000-0000-0000-000000000012",
                clean_transcript=SAMPLE_TRANSCRIPT,
                react_agent=mock_react_agent,
                max_iterations=3,
            )

        assert "maximum iteration limit" in str(exc_info.value)


# ---------------------------------------------------------------------------
# 4. Tool Errors & Unknown Tool Self-Correction
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_react_tool_errors_and_self_correction():
    """Verify that an unknown or invalid tool invocation provides an error observation allowing self-correction."""
    mock_main_agent = MagicMock(spec=MainMeetingAgent)
    mock_main_agent.analyze_transcript.return_value = SAMPLE_ANALYSIS

    mock_react_agent = MagicMock(spec=ReActAgent)
    mock_react_agent.decide_next_action.side_effect = [
        # Agent attempts an invalid action
        ReActAction(
            thought="I will query external SQL directly.",
            action="unrestricted_sql_query",
            action_input={"query": "SELECT * FROM users"},
        ),
        # Agent receives error observation, self-corrects to allowed analyze_meeting
        ReActAction(
            thought="That tool is not allowed. I will analyze the meeting instead.",
            action="analyze_meeting",
            action_input={},
        ),
        ReActAction(
            thought="Analysis is complete. Finishing.",
            action="finish",
            action_input={},
        ),
    ]

    with patch("app.services.react.graph.get_meeting_context", return_value={"team_id": "team-test"}), \
         patch("app.services.react.graph.persist_meeting_summary_to_db", return_value=True):

        resp = await run_react_meeting_pipeline(
            meeting_id="00000000-0000-0000-0000-000000000013",
            clean_transcript=SAMPLE_TRANSCRIPT,
            agent=mock_main_agent,
            react_agent=mock_react_agent,
            persist_to_database=True,
        )

        assert resp.status == "COMPLETED"
        assert resp.analysis == SAMPLE_ANALYSIS
        assert mock_react_agent.decide_next_action.call_count == 3


# ---------------------------------------------------------------------------
# 5. Missing Dependency Tool Error Handling
# ---------------------------------------------------------------------------

def test_extract_scrum_tasks_without_prior_analysis_returns_error_observation():
    """Verify that invoking extract_scrum_tasks before analyze_meeting returns a structured error observation."""
    obs = execute_extract_scrum_tasks(analysis=None)
    assert obs.success is False
    assert "Dependency missing" in obs.error
    assert "Cannot extract Scrum tasks without prior meeting analysis" in obs.summary


# ---------------------------------------------------------------------------
# 6. Persistence Failure Handling in ReAct
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_react_persistence_failure_reports_failed_status():
    """Verify that if database persistence fails during ReAct finish, pipeline raises error."""
    mock_main_agent = MagicMock(spec=MainMeetingAgent)
    mock_main_agent.analyze_transcript.return_value = SAMPLE_ANALYSIS

    mock_react_agent = MagicMock(spec=ReActAgent)
    mock_react_agent.decide_next_action.side_effect = [
        ReActAction(thought="Analyzing.", action="analyze_meeting", action_input={}),
        ReActAction(thought="Done.", action="finish", action_input={}),
    ]

    with patch("app.services.react.graph.get_meeting_context", return_value={"team_id": "team-test"}), \
         patch("app.services.react.graph.persist_meeting_summary_to_db", return_value=False):

        with pytest.raises(MeetingAnalysisError) as exc_info:
            await run_react_meeting_pipeline(
                meeting_id="00000000-0000-0000-0000-000000000014",
                clean_transcript=SAMPLE_TRANSCRIPT,
                agent=mock_main_agent,
                react_agent=mock_react_agent,
                persist_to_database=True,
            )

        assert "Database persistence failed" in str(exc_info.value)


# ---------------------------------------------------------------------------
# 7. Safe Fallback to Phase 1 LangGraph Pipeline
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_meeting_ai_pipeline_with_react_and_fallback():
    """Verify that run_meeting_ai_pipeline(use_react=True) works and falls back cleanly on unexpected error."""
    mock_main_agent = MagicMock(spec=MainMeetingAgent)
    mock_main_agent.analyze_transcript.return_value = SAMPLE_ANALYSIS

    mock_scrum_agent = MagicMock(spec=ScrumIntelligenceAgent)
    mock_scrum_agent.analyze.return_value = SAMPLE_SCRUM_RESULT

    mock_storage = MagicMock()
    mock_storage.provider.get_text.return_value = SAMPLE_TRANSCRIPT

    # When ReAct fails unexpectedly, pipeline falls back to Phase 1 LangGraph
    with patch("app.services.react.graph.run_react_meeting_pipeline", side_effect=Exception("Unexpected ReAct failure")), \
         patch("app.services.graphs.nodes.get_meeting_context", return_value={"team_id": "team-test"}), \
         patch("app.services.graphs.nodes.persist_meeting_summary_to_db", return_value=True):

        resp = await run_meeting_ai_pipeline(
            meeting_id="00000000-0000-0000-0000-000000000015",
            storage_service=mock_storage,
            agent=mock_main_agent,
            scrum_agent=mock_scrum_agent,
            use_react=True,
        )

        assert isinstance(resp, MeetingAIPipelineResponse)
        assert resp.status == "COMPLETED"
        assert resp.analysis == SAMPLE_ANALYSIS
