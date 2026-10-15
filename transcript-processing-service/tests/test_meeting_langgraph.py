"""Focused verification tests for Sprintive Meeting LangGraph Orchestration.

Tests:
1. Graph Construction & Compilation.
2. State Schema and Node Transition Verification.
3. Successful End-to-End Execution.
4. Empty-Task Handling (No Action Items -> zero redundant LLM calls).
5. Failed Path & Error Handling (Empty Transcript).
6. Deterministic Duplicate Prevention.
7. API Response Compatibility with MeetingAIPipelineResponse.
"""

import asyncio
import pytest
from unittest.mock import MagicMock, patch

from app.models.meeting_agent import (
    MeetingAIPipelineResponse,
    MeetingAnalysisResult,
)
from app.models.resolved_task import ResolvedTask
from app.models.scrum_agent import ScrumResult, ScrumTask
from app.services.graphs.meeting_graph import (
    build_meeting_graph,
    get_compiled_meeting_graph,
    run_meeting_langgraph,
)
from app.services.graphs.state import MeetingWorkflowState
from app.services.meeting_agent import EmptyTranscriptException, MainMeetingAgent
from app.services.meeting_ai_pipeline import run_meeting_ai_pipeline
from app.services.scrum_agent import ScrumIntelligenceAgent


# ---------------------------------------------------------------------------
# Fixtures & Mocks
# ---------------------------------------------------------------------------

SAMPLE_TRANSCRIPT = (
    "Alice (00:00): Hey team, let's review the API performance.\n"
    "Bob (00:30): I will optimize the PostgreSQL index by Friday.\n"
    "Alice (01:00): Agreed. Let's make sure the tests pass.\n"
)

SAMPLE_ANALYSIS = MeetingAnalysisResult(
    summary="Discussion regarding API performance and PostgreSQL indexing.",
    topics=["Performance - API query latency and slow index"],
    decisions=["Optimize index for latency reduction and faster queries"],
    action_items=["Bob will optimize the PostgreSQL index (due: Friday)"],
    blockers=[],
)

EMPTY_ACTION_ANALYSIS = MeetingAnalysisResult(
    summary="General standup meeting with no new action items or blockers.",
    topics=["Sync - All good"],
    decisions=[],
    action_items=[],
    blockers=[],
)

SAMPLE_SCRUM_RESULT = ScrumResult(
    tasks=[
        ScrumTask(
            title="Optimize PostgreSQL index",
            description="Improve API query latency by indexing key columns",
            assignee="Bob",
            priority="high",
            due_date="Friday",
            type="task",
            acceptance_criteria=["Index created", "Query < 50ms"],
            source_action_item="Optimize the PostgreSQL index",
        )
    ]
)


# ---------------------------------------------------------------------------
# 1. Graph Construction & Compilation Test
# ---------------------------------------------------------------------------

def test_graph_construction_and_compilation():
    """Verify that build_meeting_graph constructs all expected nodes and compiles without errors."""
    workflow = build_meeting_graph()
    assert workflow is not None

    compiled = workflow.compile()
    assert compiled is not None

    # Verify cached default compiled graph
    default_graph = get_compiled_meeting_graph()
    assert default_graph is not None


# ---------------------------------------------------------------------------
# 2. Successful End-to-End Pipeline Execution Test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_langgraph_successful_execution():
    """Verify end-to-end state transitions on a valid transcript."""
    mock_main_agent = MagicMock(spec=MainMeetingAgent)
    mock_main_agent.analyze_transcript.return_value = SAMPLE_ANALYSIS

    mock_scrum_agent = MagicMock(spec=ScrumIntelligenceAgent)
    mock_scrum_agent.analyze.return_value = SAMPLE_SCRUM_RESULT

    with patch("app.services.graphs.nodes.persist_meeting_summary_to_db", return_value=True), \
         patch("app.services.graphs.nodes.get_meeting_context", return_value={
             "team_id": "team-test",
             "participants": [{"user_id": "u-bob", "full_name": "Bob"}],
             "team_members": [{"user_id": "u-bob", "full_name": "Bob"}],
             "started_at": "2026-10-15T10:00:00Z",
             "duration_minutes": 30,
         }):

        final_state = await run_meeting_langgraph(
            meeting_id="00000000-0000-0000-0000-000000000001",
            clean_transcript=SAMPLE_TRANSCRIPT,
            agent=mock_main_agent,
            scrum_agent=mock_scrum_agent,
            persist_to_database=True,
        )

        assert final_state["processing_status"] == "COMPLETED"
        assert final_state["current_stage"] == "completed"
        assert final_state["analysis"] == SAMPLE_ANALYSIS
        assert final_state["scrum_result"] == SAMPLE_SCRUM_RESULT
        assert len(final_state["resolved_tasks"]) == 1
        assert final_state["resolved_tasks"][0].assignee_id == "u-bob"
        assert final_state["persisted"] is True
        assert final_state["error"] is None


# ---------------------------------------------------------------------------
# 3. Empty-Task Handling (No Action Items -> Zero Redundant LLM Call)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_langgraph_empty_task_handling():
    """Verify that when analysis has 0 action items, Scrum agent LLM call is bypassed."""
    mock_main_agent = MagicMock(spec=MainMeetingAgent)
    mock_main_agent.analyze_transcript.return_value = EMPTY_ACTION_ANALYSIS

    mock_scrum_agent = MagicMock(spec=ScrumIntelligenceAgent)

    with patch("app.services.graphs.nodes.persist_meeting_summary_to_db", return_value=True), \
         patch("app.services.graphs.nodes.get_meeting_context", return_value={"team_id": "team-test"}):

        final_state = await run_meeting_langgraph(
            meeting_id="00000000-0000-0000-0000-000000000002",
            clean_transcript="Alice: Great work today everyone. No tasks.",
            agent=mock_main_agent,
            scrum_agent=mock_scrum_agent,
            persist_to_database=False,
        )

        assert final_state["processing_status"] == "COMPLETED"
        assert final_state["is_empty_tasks"] is True
        assert final_state["scrum_result"].tasks == []
        assert final_state["resolved_tasks"] == []
        # Assert Scrum agent analyze was NEVER called (avoiding wasteful LLM call)
        mock_scrum_agent.analyze.assert_not_called()


# ---------------------------------------------------------------------------
# 4. Error Path: Empty Transcript
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_langgraph_empty_transcript_failure():
    """Verify that an empty transcript raises EmptyTranscriptException via run_meeting_ai_pipeline."""
    with patch("app.services.graphs.nodes.get_meeting_context", return_value={"team_id": "team-test"}):
        with pytest.raises(EmptyTranscriptException):
            await run_meeting_ai_pipeline(
                meeting_id="00000000-0000-0000-0000-000000000003",
                custom_transcript_path="test/empty.txt",
                storage_service=MagicMock(provider=MagicMock(get_text=MagicMock(return_value="   "))),
            )


# ---------------------------------------------------------------------------
# 5. API Response Compatibility Test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_meeting_ai_pipeline_compatibility():
    """Verify that run_meeting_ai_pipeline returns exact MeetingAIPipelineResponse."""
    mock_main_agent = MagicMock(spec=MainMeetingAgent)
    mock_main_agent.analyze_transcript.return_value = SAMPLE_ANALYSIS

    mock_scrum_agent = MagicMock(spec=ScrumIntelligenceAgent)
    mock_scrum_agent.analyze.return_value = SAMPLE_SCRUM_RESULT

    mock_storage = MagicMock()
    mock_storage.provider.get_text.return_value = SAMPLE_TRANSCRIPT

    with patch("app.services.graphs.nodes.persist_meeting_summary_to_db", return_value=True), \
         patch("app.services.graphs.nodes.get_meeting_context", return_value={
             "team_id": "team-test",
             "participants": [{"user_id": "u-bob", "full_name": "Bob"}],
             "team_members": [{"user_id": "u-bob", "full_name": "Bob"}],
         }):

        resp: MeetingAIPipelineResponse = await run_meeting_ai_pipeline(
            meeting_id="00000000-0000-0000-0000-000000000004",
            storage_service=mock_storage,
            agent=mock_main_agent,
            scrum_agent=mock_scrum_agent,
        )

        assert isinstance(resp, MeetingAIPipelineResponse)
        assert resp.status == "COMPLETED"
        assert resp.meeting_id == "00000000-0000-0000-0000-000000000004"
        assert resp.analysis == SAMPLE_ANALYSIS
        assert resp.scrum_analysis == SAMPLE_SCRUM_RESULT
        assert len(resp.resolved_tasks) == 1
        assert resp.error is None


# ---------------------------------------------------------------------------
# 6. Bounded Retry Test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_langgraph_bounded_retry_recovery():
    """Verify that transient LLM failure triggers bounded retry and recovers."""
    mock_main_agent = MagicMock(spec=MainMeetingAgent)
    # Fail on first call, succeed on second call
    mock_main_agent.analyze_transcript.side_effect = [
        Exception("Transient LLM timeout"),
        SAMPLE_ANALYSIS,
    ]

    mock_scrum_agent = MagicMock(spec=ScrumIntelligenceAgent)
    mock_scrum_agent.analyze.return_value = SAMPLE_SCRUM_RESULT

    with patch("app.services.graphs.nodes.persist_meeting_summary_to_db", return_value=True), \
         patch("app.services.graphs.nodes.get_meeting_context", return_value={"team_id": "team-test"}):

        final_state = await run_meeting_langgraph(
            meeting_id="00000000-0000-0000-0000-000000000005",
            clean_transcript=SAMPLE_TRANSCRIPT,
            agent=mock_main_agent,
            scrum_agent=mock_scrum_agent,
            max_retries=1,
            persist_to_database=False,
        )

        assert final_state["processing_status"] == "COMPLETED"
        assert final_state["meeting_agent_retries"] == 1
        assert final_state["analysis"] == SAMPLE_ANALYSIS
        assert mock_main_agent.analyze_transcript.call_count == 2


# ---------------------------------------------------------------------------
# 7. Deterministic Duplicate Prevention Test
# ---------------------------------------------------------------------------

def test_database_deterministic_duplicate_prevention():
    """Verify that persist_meeting_summary_to_db deduplicates tasks before persisting."""
    from app.services.database import persist_meeting_summary_to_db

    duplicate_tasks = [
        {
            "id": "task-dup-1",
            "ticket_id": "task-dup-1",
            "title": "Fix memory leak",
            "source_action_item": "Fix memory leak in backend",
            "assignee": "Alice",
            "assignee_id": "u-alice",
            "priority": "high",
        },
        # Duplicate of task-dup-1
        {
            "id": "task-dup-1",
            "ticket_id": "task-dup-1",
            "title": "Fix memory leak",
            "source_action_item": "Fix memory leak in backend",
            "assignee": "Alice",
            "assignee_id": "u-alice",
            "priority": "high",
        },
        # Unique task
        {
            "id": "task-dup-2",
            "ticket_id": "task-dup-2",
            "title": "Add caching layer",
            "source_action_item": "Add caching layer to Redis",
            "assignee": "Bob",
            "assignee_id": "u-bob",
            "priority": "medium",
        },
    ]

    captured_json = {}

    def mock_execute(sql, params):
        captured_json["tickets"] = params[6]

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.execute.side_effect = mock_execute
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_conn.__enter__.return_value = mock_conn

    with patch("app.services.database.get_db_connection", return_value=mock_conn):
        success = persist_meeting_summary_to_db(
            meeting_id="00000000-0000-0000-0000-000000000006",
            ai_summary="Summary",
            action_items=["Action 1"],
            tickets_generated=duplicate_tasks,
        )

        assert success is True
        import json
        persisted = json.loads(captured_json["tickets"])
        # Exactly 2 unique tasks persisted instead of 3
        assert len(persisted) == 2
        persisted_ids = [t["id"] for t in persisted]
        assert persisted_ids == ["task-dup-1", "task-dup-2"]


# ---------------------------------------------------------------------------
# 8. Persistence Failure Produces Failed Status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_langgraph_persistence_failure_handling():
    """Verify that a database persistence failure causes the pipeline to fail cleanly."""
    from app.services.meeting_ai_pipeline import MeetingAIPipelineError

    mock_main_agent = MagicMock(spec=MainMeetingAgent)
    mock_main_agent.analyze_transcript.return_value = SAMPLE_ANALYSIS

    mock_scrum_agent = MagicMock(spec=ScrumIntelligenceAgent)
    mock_scrum_agent.analyze.return_value = SAMPLE_SCRUM_RESULT

    mock_storage = MagicMock()
    mock_storage.provider.get_text.return_value = SAMPLE_TRANSCRIPT

    # Simulate persist_meeting_summary_to_db returning False (DB write failure)
    with patch("app.services.graphs.nodes.persist_meeting_summary_to_db", return_value=False), \
         patch("app.services.graphs.nodes.get_meeting_context", return_value={"team_id": "team-test"}):

        with pytest.raises(MeetingAIPipelineError) as exc_info:
            await run_meeting_ai_pipeline(
                meeting_id="00000000-0000-0000-0000-000000000007",
                storage_service=mock_storage,
                agent=mock_main_agent,
                scrum_agent=mock_scrum_agent,
                persist_to_database=True,
            )

        assert "controlled_persistence" in str(exc_info.value)


# ---------------------------------------------------------------------------
# 9. Assignee Dict Re-Processing Does Not Nest
# ---------------------------------------------------------------------------

def test_database_assignee_dict_not_nested():
    """Verify that if an existing task already has assignee as a dict, it doesn't get nested."""
    from app.services.database import persist_meeting_summary_to_db

    task_with_dict_assignee = [
        {
            "id": "task-existing-1",
            "title": "Existing task",
            "assignee": {"id": "u-bob", "name": "Bob Smith"},
            "assignee_id": "u-bob",
            "priority": "medium",
        }
    ]

    captured_json = {}

    def mock_execute(sql, params):
        captured_json["tickets"] = params[6]

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.execute.side_effect = mock_execute
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_conn.__enter__.return_value = mock_conn

    with patch("app.services.database.get_db_connection", return_value=mock_conn):
        success = persist_meeting_summary_to_db(
            meeting_id="00000000-0000-0000-0000-000000000008",
            ai_summary="Summary",
            action_items=[],
            tickets_generated=task_with_dict_assignee,
        )

        assert success is True
        import json
        persisted = json.loads(captured_json["tickets"])
        assert len(persisted) == 1
        assignee = persisted[0]["assignee"]
        assert isinstance(assignee, dict)
        assert assignee["id"] == "u-bob"
        assert assignee["name"] == "Bob Smith"  # Not a nested dict!
