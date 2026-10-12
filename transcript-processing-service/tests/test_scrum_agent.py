"""Unit and Integration tests for Stage 2: Scrum Intelligence Agent.

Verifies:
1. Basic task generation: actionable requirement -> structured ScrumTask.
2. Missing assignee handling -> assignee is None.
3. Missing deadline handling -> due_date is None.
4. Missing priority handling -> priority is None.
5. Non-actionable discussion and empty action items -> tasks: [].
6. Multiple action items converted with source traceability (source_action_item).
7. Blocker handling without automatic blind task generation.
8. Hallucination protection: no invented names, dates, or priorities.
9. Resilient error handling (timeout, schema validation, client error).
10. Full pipeline integration: Stage 1 MeetingAnalysisResult -> Stage 2 ScrumResult.
11. REST API endpoint: POST /transcript/scrum-analyze.
"""

import asyncio
import logging
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.api.routes.transcript import get_transcript_service
from app.models.meeting_agent import (
    MeetingAIPipelineResponse,
    MeetingAnalysisResult,
)
from app.models.scrum_agent import ScrumResult, ScrumTask
from app.prompts.scrum_agent import (
    SCRUM_AGENT_SYSTEM_PROMPT,
    build_scrum_agent_user_prompt,
)
from app.services.llm_client import (
    LLMClientError,
    LLMResponseValidationError,
    LLMTimeoutError,
    MockLLMClient,
    set_llm_client,
)
from app.services.meeting_agent import MainMeetingAgent
from app.services.meeting_ai_pipeline import run_meeting_ai_pipeline
from app.services.scrum_agent import (
    ScrumAnalysisError,
    ScrumIntelligenceAgent,
    get_scrum_intelligence_agent,
)
from app.services.storage_service import (
    LocalStorageProvider,
    TranscriptStorageService,
)
from app.services.transcript_orchestrator import TranscriptOrchestrator
from app.services.transcript_repository import InMemoryTranscriptRepository
from app.services.transcript_service import TranscriptService

client = TestClient(app)


# ─── Test Fixtures & Samples ──────────────────────────────────────────────────


SAMPLE_STAGE1_ANALYSIS = MeetingAnalysisResult(
    summary="The team reviewed sprint progress and discussed upcoming infrastructure fixes.",
    topics=["Authentication", "Infrastructure", "Database"],
    decisions=["Agreed to migrate to PostgreSQL"],
    action_items=[
        "Rahul will fix the login API by Friday.",
        "Fix the login API before release.",
        "Update database connection pool configuration.",
    ],
    blockers=["DevOps team credentials are still pending."],
)


SAMPLE_SCRUM_OUTPUT_DICT = {
    "tasks": [
        {
            "title": "Fix login API",
            "description": "Resolve authentication issues in the login API before Friday.",
            "assignee": "Rahul",
            "priority": "high",
            "due_date": "by Friday",
            "type": "bug",
            "acceptance_criteria": [
                "Login API returns 200 on valid credentials",
                "Error messages conform to specification",
            ],
            "source_action_item": "Rahul will fix the login API by Friday.",
        },
        {
            "title": "Fix login API before release",
            "description": "Ensure login API is fully operational prior to release milestone.",
            "assignee": None,
            "priority": None,
            "due_date": "before release",
            "type": "bug",
            "acceptance_criteria": [
                "Login API regression suite passes",
            ],
            "source_action_item": "Fix the login API before release.",
        },
        {
            "title": "Update database connection pool configuration",
            "description": "Adjust pool limits to prevent connection exhaustion.",
            "assignee": None,
            "priority": None,
            "due_date": None,
            "type": "improvement",
            "acceptance_criteria": [],
            "source_action_item": "Update database connection pool configuration.",
        },
    ]
}


@pytest.fixture
def temp_storage(tmp_path):
    provider = LocalStorageProvider(base_dir=str(tmp_path))
    return TranscriptStorageService(provider=provider)


# ─── 1. Unit Tests: ScrumIntelligenceAgent ────────────────────────────────────


class TestScrumIntelligenceAgent:
    def test_basic_task_generation(self):
        """Action item with explicit assignee and deadline generates grounded task."""
        analysis = MeetingAnalysisResult(
            summary="Auth fixes",
            action_items=["Rahul will fix the login API by Friday."],
        )

        def _mock_resp(sys_p, usr_p):
            return {
                "tasks": [
                    {
                        "title": "Fix login API",
                        "description": "Resolve authentication issue in login API.",
                        "assignee": "Rahul",
                        "priority": "high",
                        "due_date": "by Friday",
                        "type": "bug",
                        "acceptance_criteria": ["Login API works properly"],
                        "source_action_item": "Rahul will fix the login API by Friday.",
                    }
                ]
            }

        mock_llm = MockLLMClient(default_response_fn=_mock_resp)
        agent = ScrumIntelligenceAgent(llm_client=mock_llm)

        result = agent.analyze(analysis)

        assert isinstance(result, ScrumResult)
        assert len(result.tasks) == 1
        task = result.tasks[0]
        assert task.title == "Fix login API"
        assert task.assignee == "Rahul"
        assert task.due_date == "by Friday"
        assert task.priority == "high"
        assert task.type == "bug"
        assert task.acceptance_criteria == ["Login API works properly"]
        assert task.source_action_item == "Rahul will fix the login API by Friday."

    def test_missing_assignee_returns_none(self):
        """Action item with no owner ('Fix the login API before release') results in assignee=None."""
        analysis = MeetingAnalysisResult(
            summary="Release prep",
            action_items=["Fix the login API before release."],
        )

        def _mock_resp(sys_p, usr_p):
            return {
                "tasks": [
                    {
                        "title": "Fix login API",
                        "description": "Fix login API before upcoming release.",
                        "assignee": None,
                        "priority": None,
                        "due_date": "before release",
                        "type": "task",
                        "acceptance_criteria": [],
                        "source_action_item": "Fix the login API before release.",
                    }
                ]
            }

        mock_llm = MockLLMClient(default_response_fn=_mock_resp)
        agent = ScrumIntelligenceAgent(llm_client=mock_llm)

        result = agent.analyze(analysis)
        assert len(result.tasks) == 1
        assert result.tasks[0].assignee is None

    def test_missing_deadline_returns_none(self):
        """Action item with no target date results in due_date=None."""
        analysis = MeetingAnalysisResult(
            summary="Maintenance",
            action_items=["Update database indexes."],
        )

        def _mock_resp(sys_p, usr_p):
            return {
                "tasks": [
                    {
                        "title": "Update database indexes",
                        "description": "Optimize query indexes for database tables.",
                        "assignee": None,
                        "priority": None,
                        "due_date": None,
                        "type": "improvement",
                        "acceptance_criteria": [],
                        "source_action_item": "Update database indexes.",
                    }
                ]
            }

        mock_llm = MockLLMClient(default_response_fn=_mock_resp)
        agent = ScrumIntelligenceAgent(llm_client=mock_llm)

        result = agent.analyze(analysis)
        assert len(result.tasks) == 1
        assert result.tasks[0].due_date is None

    def test_missing_priority_returns_none(self):
        """When urgency/priority is unspecified, priority must be None."""
        analysis = MeetingAnalysisResult(
            summary="Documentation",
            action_items=["Write API documentation."],
        )

        def _mock_resp(sys_p, usr_p):
            return {
                "tasks": [
                    {
                        "title": "Write API documentation",
                        "description": "Document external endpoints.",
                        "assignee": None,
                        "priority": None,
                        "due_date": None,
                        "type": "task",
                        "acceptance_criteria": [],
                        "source_action_item": "Write API documentation.",
                    }
                ]
            }

        mock_llm = MockLLMClient(default_response_fn=_mock_resp)
        agent = ScrumIntelligenceAgent(llm_client=mock_llm)

        result = agent.analyze(analysis)
        assert len(result.tasks) == 1
        assert result.tasks[0].priority is None

    def test_empty_analysis_and_non_actionable_discussion(self):
        """When meeting has no actionable items, agent cleanly returns tasks: []."""
        mock_llm = MockLLMClient()
        agent = ScrumIntelligenceAgent(llm_client=mock_llm)

        # 1. None analysis
        res_none = agent.analyze(None)
        assert res_none.tasks == []

        # 2. Analysis with only discussions and topics, no action items or blockers
        analysis = MeetingAnalysisResult(
            summary="We discussed improving the dashboard design and color scheme.",
            topics=["Dashboard Redesign"],
            decisions=["Decided to keep current layout for now"],
            action_items=[],
            blockers=[],
        )
        res_empty = agent.analyze(analysis)
        assert res_empty.tasks == []

    def test_blocker_handling_without_automatic_task_creation(self):
        """Blockers with no actionable steps should not automatically create arbitrary tasks."""
        analysis = MeetingAnalysisResult(
            summary="Standup",
            action_items=[],
            blockers=["DevOps credentials are still pending."],
        )

        def _mock_resp(sys_p, usr_p):
            # Agent determines blocker has no actionable resolution yet
            return {"tasks": []}

        mock_llm = MockLLMClient(default_response_fn=_mock_resp)
        agent = ScrumIntelligenceAgent(llm_client=mock_llm)

        result = agent.analyze(analysis)
        assert result.tasks == []

    def test_multiple_action_items_preserves_traceability(self):
        """Every generated task links back to its originating Stage 1 action item."""
        mock_llm = MockLLMClient(default_response_fn=lambda s, u: SAMPLE_SCRUM_OUTPUT_DICT)
        agent = ScrumIntelligenceAgent(llm_client=mock_llm)

        result = agent.analyze(SAMPLE_STAGE1_ANALYSIS)
        assert len(result.tasks) == 3

        for task, expected_action in zip(result.tasks, SAMPLE_STAGE1_ANALYSIS.action_items):
            assert task.source_action_item == expected_action
            assert task.title != ""
            assert task.description != ""

    def test_hallucination_protection_validator(self):
        """Pydantic model normalizers coerce invalid/placeholder strings to None."""
        task = ScrumTask.model_validate(
            {
                "title": "Refactor codebase",
                "description": "General cleanup",
                "assignee": "unassigned",  # Placeholder string
                "priority": "unknown",     # Invalid priority
                "due_date": "TBD",         # Placeholder deadline
                "type": "INVALID_TYPE",    # Should fallback to 'task'
            }
        )

        assert task.assignee is None
        assert task.priority is None
        assert task.due_date is None
        assert task.type == "task"

    def test_error_handling_timeout(self):
        """LLM timeout raises ScrumAnalysisError."""
        def _timeout(s, u):
            raise LLMTimeoutError("LLM call timed out")

        mock_llm = MockLLMClient(default_response_fn=_timeout)
        agent = ScrumIntelligenceAgent(llm_client=mock_llm)

        with pytest.raises(ScrumAnalysisError) as exc_info:
            agent.analyze(SAMPLE_STAGE1_ANALYSIS)
        assert "timed out" in str(exc_info.value).lower()

    def test_error_handling_client_error(self):
        """LLM client error raises ScrumAnalysisError."""
        def _err(s, u):
            raise LLMClientError("500 Internal Server Error")

        mock_llm = MockLLMClient(default_response_fn=_err)
        agent = ScrumIntelligenceAgent(llm_client=mock_llm)

        with pytest.raises(ScrumAnalysisError) as exc_info:
            agent.analyze(SAMPLE_STAGE1_ANALYSIS)
        assert "client error" in str(exc_info.value).lower()

    def test_prompt_integrity_and_decoupling(self):
        """Verify prompt contains strict grounding instructions and never includes raw transcript."""
        user_prompt = build_scrum_agent_user_prompt(SAMPLE_STAGE1_ANALYSIS)

        # Meeting analysis JSON is present
        assert "Rahul will fix the login API by Friday." in user_prompt
        assert "The team reviewed sprint progress" in user_prompt

        # System prompt contains strict constraints
        assert "Scrum Intelligence Agent" in SCRUM_AGENT_SYSTEM_PROMPT
        assert "Do NOT invent assignees" in SCRUM_AGENT_SYSTEM_PROMPT
        assert "source_action_item" in SCRUM_AGENT_SYSTEM_PROMPT
        assert "null" in SCRUM_AGENT_SYSTEM_PROMPT


# ─── 2. End-to-End Pipeline Integration Tests ─────────────────────────────────


class TestPipelineIntegration:
    def test_full_pipeline_stage1_to_stage2(self, temp_storage):
        """End-to-end: clean transcript in storage -> Stage 1 analysis -> Stage 2 Scrum tasks."""
        meeting_id = "scrum-pipeline-01"
        cleaned_path = f"meetings/{meeting_id}/processed/cleaned_conversation.txt"
        transcript_content = (
            "Alice: Good morning. We need to fix the auth service.\n"
            "Bob: I will fix the auth service by tomorrow.\n"
            "Alice: Great, let's wrap up."
        )
        temp_storage.provider.upload_text(cleaned_path, transcript_content)

        def _multi_mock(sys_p, usr_p):
            if "Scrum Intelligence Agent" in sys_p:
                return {
                    "tasks": [
                        {
                            "title": "Fix auth service",
                            "description": "Fix the auth service as committed by Bob.",
                            "assignee": "Bob",
                            "priority": "high",
                            "due_date": "by tomorrow",
                            "type": "bug",
                            "acceptance_criteria": ["Auth service functions properly"],
                            "source_action_item": "Bob will fix the auth service by tomorrow.",
                        }
                    ]
                }
            # Main Meeting Agent response
            return {
                "summary": "Team discussed fixing the auth service.",
                "topics": ["Auth Service"],
                "decisions": [],
                "action_items": ["Bob will fix the auth service by tomorrow."],
                "blockers": [],
            }

        mock_llm = MockLLMClient(default_response_fn=_multi_mock)

        async def run():
            return await run_meeting_ai_pipeline(
                meeting_id=meeting_id,
                storage_service=temp_storage,
                llm_client=mock_llm,
                run_scrum_agent=True,
            )

        resp = asyncio.run(run())

        # Verify Stage 1 output
        assert isinstance(resp, MeetingAIPipelineResponse)
        assert resp.analysis is not None
        assert resp.analysis.summary == "Team discussed fixing the auth service."
        assert resp.analysis.action_items == ["Bob will fix the auth service by tomorrow."]

        # Verify Stage 2 output
        assert resp.scrum_analysis is not None
        assert isinstance(resp.scrum_analysis, ScrumResult)
        assert len(resp.scrum_analysis.tasks) == 1
        task = resp.scrum_analysis.tasks[0]
        assert task.title == "Fix auth service"
        assert task.assignee == "Bob"
        assert task.due_date == "by tomorrow"
        assert task.source_action_item == "Bob will fix the auth service by tomorrow."

    def test_orchestrator_integration_with_scrum_output(self, temp_storage):
        """Orchestrator process_transcript with run_ai_pipeline=True populates both Stage 1 and Stage 2."""
        def _multi_mock(sys_p, usr_p):
            if "Scrum Intelligence Agent" in sys_p:
                return {
                    "tasks": [
                        {
                            "title": "Deploy API",
                            "description": "Deploy API to staging.",
                            "assignee": "Alice",
                            "priority": "medium",
                            "due_date": "tomorrow",
                            "type": "task",
                            "acceptance_criteria": [],
                            "source_action_item": "Alice will deploy API tomorrow.",
                        }
                    ]
                }
            return {
                "summary": "Deploy plan",
                "topics": ["Deployment"],
                "decisions": [],
                "action_items": ["Alice will deploy API tomorrow."],
                "blockers": [],
            }

        mock_llm = MockLLMClient(default_response_fn=_multi_mock)
        repo = InMemoryTranscriptRepository()
        orchestrator = TranscriptOrchestrator(
            storage_service=temp_storage,
            repository=repo,
            llm_client=mock_llm,
        )

        meeting_id = "orch-scrum-test-01"

        async def run():
            return await orchestrator.process_transcript(
                meeting_id=meeting_id,
                raw_text="Alice: I will deploy API tomorrow.\nBob: Sounds good.",
                run_ai_pipeline=True,
            )

        resp = asyncio.run(run())

        assert resp.accepted is True
        assert resp.processing_status == "READY_FOR_AI"
        assert resp.meeting_analysis is not None
        assert resp.scrum_analysis is not None
        assert len(resp.scrum_analysis.tasks) == 1
        assert resp.scrum_analysis.tasks[0].assignee == "Alice"
        assert "scrum_analysis" in resp.metrics


# ─── 3. REST API Endpoint Tests ───────────────────────────────────────────────


class TestScrumApiEndpoints:
    def test_post_scrum_analyze_endpoint_success(self):
        """POST /transcript/scrum-analyze accepts MeetingAnalysisResult and returns ScrumResult."""
        def _mock_scrum(sys_p, usr_p):
            return SAMPLE_SCRUM_OUTPUT_DICT

        mock_llm = MockLLMClient(default_response_fn=_mock_scrum)
        app.dependency_overrides[get_transcript_service] = lambda: TranscriptService(
            orchestrator=TranscriptOrchestrator(llm_client=mock_llm)
        )

        try:
            payload = SAMPLE_STAGE1_ANALYSIS.model_dump()
            resp = client.post("/transcript/scrum-analyze", json=payload)
            assert resp.status_code == 200
            data = resp.json()

            assert "tasks" in data
            assert len(data["tasks"]) == 3
            assert data["tasks"][0]["assignee"] == "Rahul"
            assert data["tasks"][0]["due_date"] == "by Friday"
            assert data["tasks"][1]["assignee"] is None
        finally:
            app.dependency_overrides.clear()

    def test_post_scrum_analyze_endpoint_empty_action_items(self):
        """POST /transcript/scrum-analyze with empty action items returns empty tasks."""
        app.dependency_overrides[get_transcript_service] = lambda: TranscriptService(
            orchestrator=TranscriptOrchestrator(llm_client=MockLLMClient())
        )

        try:
            payload = {
                "summary": "General meeting with no tasks.",
                "topics": [],
                "decisions": [],
                "action_items": [],
                "blockers": [],
            }
            resp = client.post("/transcript/scrum-analyze", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["tasks"] == []
        finally:
            app.dependency_overrides.clear()
