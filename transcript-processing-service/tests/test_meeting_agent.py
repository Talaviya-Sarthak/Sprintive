"""Unit and Integration tests for Stage 1 of the Meeting AI Pipeline.

Verifies:
1. MainMeetingAgent receives transcript string, formats prompts, calls LLM, returns MeetingAnalysisResult.
2. MainMeetingAgent prompt integrity: transcript in user message, never in system prompt.
3. Empty/whitespace transcript validation and error handling.
4. Storage .txt retrieval -> UTF-8 decoding -> Main Meeting Agent execution.
5. Standardized development logging statements.
6. TranscriptOrchestrator integration with run_ai_pipeline flag.
7. REST API endpoint: POST /transcript/ai-analyze/{meeting_id}.
"""

import asyncio
import logging
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.api.routes.transcript import get_transcript_service
from app.config.storage import InvalidMeetingIdError
from app.models.meeting_agent import (
    MeetingAIPipelineResponse,
    MeetingAnalysisResult,
)
from app.models.orchestrator import ProcessTranscriptRequest
from app.prompts.meeting_agent import (
    MAIN_MEETING_AGENT_SYSTEM_PROMPT,
    build_main_agent_user_prompt,
)
from app.services.llm_client import (
    LLMClientError,
    LLMTimeoutError,
    MockLLMClient,
    set_llm_client,
)
from app.services.meeting_agent import (
    EmptyTranscriptException,
    MainMeetingAgent,
    MeetingAnalysisError,
    get_main_meeting_agent,
)
from app.services.meeting_ai_pipeline import (
    TranscriptRetrievalError,
    run_meeting_ai_pipeline,
)
from app.services.storage_service import (
    LocalStorageProvider,
    TranscriptStorageService,
)
from app.services.transcript_orchestrator import TranscriptOrchestrator
from app.services.transcript_repository import InMemoryTranscriptRepository
from app.services.transcript_service import TranscriptService

client = TestClient(app)

SAMPLE_TRANSCRIPT = (
    "Alice: Good morning team, let's start today's sprint review.\n"
    "Bob: Sure. We completed the authentication refactor yesterday.\n"
    "Charlie: However, we have a blocker on the staging database credentials from DevOps.\n"
    "Alice: Understood. Let's decide to migrate to the new PostgreSQL instance on Friday.\n"
    "Bob: I will handle updating the schema migration scripts by tomorrow.\n"
    "Alice: Perfect. Let's wrap up."
)

SAMPLE_ANALYSIS_DICT = {
    "summary": "The team reviewed sprint progress, noted the completion of the auth refactor, and scheduled the PostgreSQL migration.",
    "topics": ["Sprint Review", "Authentication Refactor", "PostgreSQL Migration"],
    "decisions": ["Migrate to new PostgreSQL instance on Friday"],
    "action_items": ["Bob will handle updating schema migration scripts by tomorrow"],
    "blockers": ["Staging database credentials from DevOps"],
}


def create_sample_analysis() -> MeetingAnalysisResult:
    return MeetingAnalysisResult.model_validate(SAMPLE_ANALYSIS_DICT)


@pytest.fixture
def mock_llm_client():
    def _response_fn(sys_p, usr_p):
        return SAMPLE_ANALYSIS_DICT

    mock = MockLLMClient(default_response_fn=_response_fn)
    set_llm_client(mock)
    yield mock
    set_llm_client(None)


@pytest.fixture
def temp_storage(tmp_path):
    provider = LocalStorageProvider(base_dir=str(tmp_path))
    return TranscriptStorageService(provider=provider)


# ─── 1. MainMeetingAgent Unit Tests ──────────────────────────────────────────


class TestMainMeetingAgent:
    def test_successful_analysis(self, mock_llm_client):
        agent = MainMeetingAgent(llm_client=mock_llm_client)
        result = agent.analyze_transcript(SAMPLE_TRANSCRIPT)

        assert isinstance(result, MeetingAnalysisResult)
        assert "auth refactor" in result.summary.lower()
        assert len(result.topics) == 3
        assert "Migrate to new PostgreSQL instance on Friday" in result.decisions
        assert len(result.action_items) == 1
        assert "Bob will handle" in result.action_items[0]
        assert result.blockers == ["Staging database credentials from DevOps"]

    def test_empty_transcript_rejected(self, mock_llm_client):
        agent = MainMeetingAgent(llm_client=mock_llm_client)
        with pytest.raises(EmptyTranscriptException):
            agent.analyze_transcript("")

        with pytest.raises(EmptyTranscriptException):
            agent.analyze_transcript("   \n\t  ")

    def test_llm_timeout_handled(self):
        def _timeout_fn(sys_p, usr_p):
            raise LLMTimeoutError("LLM call timed out after 10.0 seconds")

        mock = MockLLMClient(default_response_fn=_timeout_fn)
        agent = MainMeetingAgent(llm_client=mock)

        with pytest.raises(MeetingAnalysisError) as exc_info:
            agent.analyze_transcript(SAMPLE_TRANSCRIPT)
        assert "timed out" in str(exc_info.value).lower()

    def test_llm_client_error_handled(self):
        def _error_fn(sys_p, usr_p):
            raise LLMClientError("500 Internal Server Error from LLM provider")

        mock = MockLLMClient(default_response_fn=_error_fn)
        agent = MainMeetingAgent(llm_client=mock)

        with pytest.raises(MeetingAnalysisError) as exc_info:
            agent.analyze_transcript(SAMPLE_TRANSCRIPT)
        assert "LLM client error" in str(exc_info.value)

    def test_prompt_construction_and_decoupling(self):
        user_prompt = build_main_agent_user_prompt(SAMPLE_TRANSCRIPT)

        # Transcript must be cleanly inside user prompt
        assert SAMPLE_TRANSCRIPT in user_prompt
        assert "---" in user_prompt
        assert "summary:" in user_prompt
        assert "topics:" in user_prompt
        assert "decisions:" in user_prompt
        assert "action_items:" in user_prompt
        assert "blockers:" in user_prompt

        # Transcript must NEVER be hardcoded inside system prompt
        assert SAMPLE_TRANSCRIPT not in MAIN_MEETING_AGENT_SYSTEM_PROMPT
        assert "Main Meeting Analysis Agent" in MAIN_MEETING_AGENT_SYSTEM_PROMPT
        assert "decisions" in MAIN_MEETING_AGENT_SYSTEM_PROMPT
        assert "action items" in MAIN_MEETING_AGENT_SYSTEM_PROMPT
        assert "blockers" in MAIN_MEETING_AGENT_SYSTEM_PROMPT
        assert "structured JSON object" in MAIN_MEETING_AGENT_SYSTEM_PROMPT


# ─── 2. run_meeting_ai_pipeline Integration Tests ─────────────────────────────


class TestMeetingAIPipeline:
    def test_full_pipeline_success_with_logging(self, temp_storage, mock_llm_client, caplog):
        meeting_id = "test-meeting-001"
        cleaned_path = f"meetings/{meeting_id}/processed/cleaned_conversation.txt"

        # Seed storage with clean transcript
        temp_storage.provider.upload_text(cleaned_path, SAMPLE_TRANSCRIPT)

        agent = MainMeetingAgent(llm_client=mock_llm_client)

        async def run():
            return await run_meeting_ai_pipeline(
                meeting_id=meeting_id,
                storage_service=temp_storage,
                agent=agent,
            )

        with caplog.at_level(logging.INFO):
            response = asyncio.run(run())

        # Validate response envelope
        assert isinstance(response, MeetingAIPipelineResponse)
        assert response.meeting_id == meeting_id
        assert response.status == "COMPLETED"
        assert response.transcript_path == cleaned_path
        assert response.transcript_length == len(SAMPLE_TRANSCRIPT)
        assert response.error is None
        assert response.analysis.summary == SAMPLE_ANALYSIS_DICT["summary"]
        assert len(response.analysis.action_items) == 1

        # Validate required development logging statements
        log_text = caplog.text
        assert "Meeting AI pipeline started" in log_text
        assert f"Meeting ID: {meeting_id}" in log_text
        assert f"Transcript path: {cleaned_path}" in log_text
        assert "Transcript loaded successfully" in log_text
        assert f"Transcript length: {len(SAMPLE_TRANSCRIPT)}" in log_text
        assert "Calling Main Meeting Agent" in log_text
        assert "LLM response received" in log_text
        assert "Summary:" in log_text

    def test_pipeline_missing_file_raises_error(self, temp_storage, mock_llm_client):
        meeting_id = "non-existent-meeting"
        agent = MainMeetingAgent(llm_client=mock_llm_client)

        async def run():
            return await run_meeting_ai_pipeline(
                meeting_id=meeting_id,
                storage_service=temp_storage,
                agent=agent,
            )

        with pytest.raises(TranscriptRetrievalError) as exc_info:
            asyncio.run(run())
        assert "Transcript not found" in str(exc_info.value)

    def test_pipeline_empty_file_raises_error(self, temp_storage, mock_llm_client):
        meeting_id = "empty-file-meeting"
        cleaned_path = f"meetings/{meeting_id}/processed/cleaned_conversation.txt"
        temp_storage.provider.upload_text(cleaned_path, "   \n  ")

        agent = MainMeetingAgent(llm_client=mock_llm_client)

        async def run():
            return await run_meeting_ai_pipeline(
                meeting_id=meeting_id,
                storage_service=temp_storage,
                agent=agent,
            )

        with pytest.raises(EmptyTranscriptException):
            asyncio.run(run())

    def test_pipeline_invalid_meeting_id(self, temp_storage):
        async def run():
            return await run_meeting_ai_pipeline(
                meeting_id="../malicious/path",
                storage_service=temp_storage,
            )

        with pytest.raises(InvalidMeetingIdError):
            asyncio.run(run())


# ─── 3. Orchestrator Integration Tests ────────────────────────────────────────


class TestOrchestratorAIIntegration:
    def test_orchestrator_with_run_ai_pipeline_flag(self, temp_storage, mock_llm_client):
        repository = InMemoryTranscriptRepository()
        orchestrator = TranscriptOrchestrator(
            storage_service=temp_storage,
            repository=repository,
            llm_client=mock_llm_client,
        )

        meeting_id = "orch-ai-meeting-01"

        async def run():
            return await orchestrator.process_transcript(
                meeting_id=meeting_id,
                raw_text="Alice: Hello team.\nBob: Hi Alice, let's ship this.",
                run_ai_pipeline=True,
            )

        resp = asyncio.run(run())

        assert resp.accepted is True
        assert resp.processing_status == "READY_FOR_AI"
        assert resp.meeting_analysis is not None
        assert isinstance(resp.meeting_analysis, MeetingAnalysisResult)
        assert resp.meeting_analysis.summary == SAMPLE_ANALYSIS_DICT["summary"]
        assert "meeting_analysis" in resp.metrics

    def test_orchestrator_without_run_ai_pipeline_flag(self, temp_storage, mock_llm_client):
        repository = InMemoryTranscriptRepository()
        orchestrator = TranscriptOrchestrator(
            storage_service=temp_storage,
            repository=repository,
            llm_client=mock_llm_client,
        )

        meeting_id = "orch-ai-meeting-02"

        async def run():
            return await orchestrator.process_transcript(
                meeting_id=meeting_id,
                raw_text="Alice: Hello team.\nBob: Hi Alice, let's ship this.",
                run_ai_pipeline=False,
            )

        resp = asyncio.run(run())

        assert resp.accepted is True
        assert resp.processing_status == "READY_FOR_AI"
        assert resp.meeting_analysis is None


# ─── 4. REST API Endpoint Tests ───────────────────────────────────────────────


class TestMeetingAIApiEndpoints:
    def test_post_ai_analyze_endpoint_success(self, temp_storage, mock_llm_client):
        meeting_id = "api-ai-meeting-01"
        cleaned_path = f"meetings/{meeting_id}/processed/cleaned_conversation.txt"
        temp_storage.provider.upload_text(cleaned_path, SAMPLE_TRANSCRIPT)

        app.dependency_overrides[get_transcript_service] = lambda: TranscriptService(
            orchestrator=TranscriptOrchestrator(
                storage_service=temp_storage,
                llm_client=mock_llm_client,
            )
        )

        try:
            resp = client.post(f"/transcript/ai-analyze/{meeting_id}")
            assert resp.status_code == 200
            data = resp.json()

            assert data["meeting_id"] == meeting_id
            assert data["status"] == "COMPLETED"
            assert data["transcript_path"] == cleaned_path
            assert "analysis" in data
            assert data["analysis"]["summary"] == SAMPLE_ANALYSIS_DICT["summary"]
            assert len(data["analysis"]["topics"]) == 3
            assert len(data["analysis"]["action_items"]) == 1
        finally:
            app.dependency_overrides.clear()

    def test_post_ai_analyze_endpoint_missing_file_404(self, temp_storage, mock_llm_client):
        meeting_id = "api-ai-meeting-missing"
        app.dependency_overrides[get_transcript_service] = lambda: TranscriptService(
            orchestrator=TranscriptOrchestrator(
                storage_service=temp_storage,
                llm_client=mock_llm_client,
            )
        )

        try:
            resp = client.post(f"/transcript/ai-analyze/{meeting_id}")
            assert resp.status_code == 404
            assert "not found" in resp.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()

    def test_post_ai_analyze_endpoint_invalid_id_400(self):
        resp = client.post("/transcript/ai-analyze/..invalid..id")
        assert resp.status_code == 400

    def test_post_process_endpoint_with_run_ai_pipeline(self, temp_storage, mock_llm_client):
        meeting_id = "api-process-ai-01"
        app.dependency_overrides[get_transcript_service] = lambda: TranscriptService(
            orchestrator=TranscriptOrchestrator(
                storage_service=temp_storage,
                llm_client=mock_llm_client,
            )
        )

        try:
            payload = {
                "meeting_id": meeting_id,
                "raw_text": "Alice: Meeting begins.\nBob: We completed everything.",
                "run_ai_pipeline": True,
            }
            resp = client.post("/transcript/process", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["meeting_id"] == meeting_id
            assert data["processing_status"] == "READY_FOR_AI"
            assert data["meeting_analysis"] is not None
            assert data["meeting_analysis"]["summary"] == SAMPLE_ANALYSIS_DICT["summary"]
        finally:
            app.dependency_overrides.clear()
