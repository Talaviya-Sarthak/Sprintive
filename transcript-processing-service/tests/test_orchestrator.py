"""Comprehensive test suite for Part 15: Transcript Processing Orchestrator.

Verifies:
1. End-to-end full pipeline execution with all 14 stages in strict order.
2. Safe fallbacks on LLM failures (STT, Grammar, Validation).
3. Failure handling: missing raw transcript, empty transcript, storage failures.
4. Concurrency protection (rejection of duplicate concurrent jobs).
5. Attempt counting and idempotency.
6. Pipeline metrics collection and structured logging.
7. Strict READY_FOR_AI boundary (never set on failure).
8. API endpoints: POST /transcript/process (sync & async) and GET /transcript/status/{meeting_id}.
"""

import asyncio
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.api.routes.transcript import get_transcript_service
from app.config.storage import InvalidMeetingIdError
from app.models.orchestrator import (
    ProcessingContext,
    ProcessTranscriptRequest,
    ProcessTranscriptResponse,
    StageResult,
)
from app.models.processing import ProcessingRecord, ProcessingStatus
from app.services.llm_client import MockLLMClient, set_llm_client
from app.services.storage_service import (
    LocalStorageProvider,
    TranscriptStorageError,
    TranscriptStorageService,
    TranscriptUploadError,
)
from app.services.transcript_repository import InMemoryTranscriptRepository
from app.services.transcript_orchestrator import (
    ConcurrentProcessingError,
    EmptyTranscriptError,
    MissingRawTranscriptError,
    NonRetryableStageError,
    PIPELINE_STAGES,
    PipelineStage,
    PipelineStageError,
    RetryableStageError,
    TranscriptOrchestrator,
)
from app.services.transcript_service import TranscriptService

client = TestClient(app)

SAMPLE_TRANSCRIPT = (
    "Sarthak Talaviya: Good morning, everyone. Let's get started.\n\n"
    "Harshit Pambhar: I have one issue with the database connection.\n\n"
    "Sarthak Talaviya: Does anyone have any blockers?"
)


@pytest.fixture(autouse=True)
def setup_mock_llm():
    """Ensure fast deterministic execution during orchestrator unit tests."""
    mock_client = MockLLMClient(
        exact_matches={
            "database connection": {
                "corrected_text": "I have one issue with the database connection.",
                "modified": False,
                "confidence": 0.98,
            }
        }
    )
    set_llm_client(mock_client)
    yield
    set_llm_client(mock_client)



class FailingStorageProvider(LocalStorageProvider):
    """Storage provider that simulates upload failure."""

    def upload_text(self, path: str, content: str, content_type: str = "", upsert: bool = True) -> bool:
        raise TranscriptUploadError("Simulated remote storage network outage")


# ============================================================================
# 1. Pipeline Stage Order & Execution
# ============================================================================


def test_stage_order_is_strict():
    """Verify that PIPELINE_STAGES definition matches the required 14-stage order."""
    expected_order = [
        "parse",
        "noise",
        "repetition",
        "relevance",
        "merge",
        "stt",
        "grammar",
        "terminology",
        "context",
        "speaker",
        "language",
        "semantic",
        "format",
        "store",
    ]
    assert PIPELINE_STAGES == expected_order


def test_all_14_stages_execute_in_exact_order():
    """Verify that the orchestrator calls all 14 stages in the strict expected order."""
    call_order = []

    class OrderTrackingStage(PipelineStage):
        def __init__(self, name: str):
            self.name = name

        def execute(self, context: ProcessingContext) -> ProcessingContext:
            call_order.append(self.name)
            return context

    stages = [OrderTrackingStage(name) for name in PIPELINE_STAGES]
    repo = InMemoryTranscriptRepository()
    storage = TranscriptStorageService(provider=LocalStorageProvider(base_dir="tests/fixtures"))


    orchestrator = TranscriptOrchestrator(
        stages=stages,
        storage_service=storage,
        repository=repo,
    )

    async def run():
        return await orchestrator.process_transcript(
            meeting_id="meeting-order-test",
            raw_text=SAMPLE_TRANSCRIPT,
        )

    response = asyncio.run(run())

    assert response.accepted is True
    assert response.processing_status == ProcessingStatus.READY_FOR_AI.value
    assert call_order == PIPELINE_STAGES


# ============================================================================
# 2. End-to-End Orchestrator Execution
# ============================================================================


def test_end_to_end_pipeline_success():
    """Test full real pipeline end-to-end with default stages."""
    repo = InMemoryTranscriptRepository()
    orchestrator = TranscriptOrchestrator(repository=repo)

    meeting_id = "meeting-e2e-123"

    async def run():
        return await orchestrator.process_transcript(
            meeting_id=meeting_id,
            raw_text=SAMPLE_TRANSCRIPT,
        )

    response = asyncio.run(run())

    assert response.accepted is True
    assert response.meeting_id == meeting_id
    assert response.processing_status == ProcessingStatus.READY_FOR_AI.value
    assert response.error is None
    assert response.duration_ms >= 0
    assert response.cleaner_version == "1.0.0"

    # Verify repository metadata
    record = repo.get_record(meeting_id)
    assert record is not None
    assert record.processing_status == ProcessingStatus.READY_FOR_AI
    assert record.completed_at is not None
    assert record.duration_ms >= 0
    assert record.cleaned_transcript_path is not None
    assert "cleaned_conversation.txt" in record.cleaned_transcript_path
    assert record.attempt == 1

    # Verify metrics collected
    assert record.metrics is not None
    assert "total_segments" in record.metrics
    assert record.metrics["total_segments"] >= 3
    assert "noise_segments" in record.metrics
    assert "repetition_segments" in record.metrics
    assert "stt_modified_segments" in record.metrics


# ============================================================================
# 3. Missing and Empty Raw Transcript Failures
# ============================================================================


def test_missing_raw_transcript_fails():
    """If raw transcript does not exist and no raw_text given, fail immediately."""
    repo = InMemoryTranscriptRepository()
    orchestrator = TranscriptOrchestrator(repository=repo)

    async def run():
        await orchestrator.process_transcript(
            meeting_id="non-existent-meeting-999",
            raw_transcript_path="meetings/non-existent-meeting-999/raw/conversation.txt",
        )

    with pytest.raises(MissingRawTranscriptError) as exc_info:
        asyncio.run(run())

    assert "not found" in str(exc_info.value).lower()


    # Repository should record failure
    record = repo.get_record("non-existent-meeting-999")
    assert record is not None
    assert record.processing_status == ProcessingStatus.FAILED
    assert record.error_stage == "retrieve_raw"
    assert record.completed_at is not None


def test_empty_raw_transcript_fails():
    """If raw transcript is empty or whitespace, fail with EmptyTranscriptError."""
    repo = InMemoryTranscriptRepository()
    orchestrator = TranscriptOrchestrator(repository=repo)

    async def run():
        await orchestrator.process_transcript(
            meeting_id="empty-meeting-123",
            raw_text="   \n\n  \t  ",
        )

    with pytest.raises(EmptyTranscriptError):
        asyncio.run(run())

    record = repo.get_record("empty-meeting-123")
    assert record is not None
    assert record.processing_status == ProcessingStatus.FAILED
    assert record.error_stage == "parse"


# ============================================================================
# 4. Storage Failure & Non-READY_FOR_AI Boundary
# ============================================================================


def test_storage_upload_failure_marks_failed():
    """When storage fails, pipeline fails, and READY_FOR_AI must NOT be granted."""
    repo = InMemoryTranscriptRepository()
    failing_storage = TranscriptStorageService(provider=FailingStorageProvider())

    orchestrator = TranscriptOrchestrator(
        storage_service=failing_storage,
        repository=repo,
    )

    async def run():
        await orchestrator.process_transcript(
            meeting_id="failing-storage-meeting",
            raw_text=SAMPLE_TRANSCRIPT,
        )

    with pytest.raises(PipelineStageError):
        asyncio.run(run())

    record = repo.get_record("failing-storage-meeting")
    assert record is not None
    assert record.processing_status == ProcessingStatus.FAILED
    assert record.error_stage == "store"
    assert record.processing_status != ProcessingStatus.READY_FOR_AI


# ============================================================================
# 5. LLM Fallback Resilience
# ============================================================================


class FailingLLMClient:
    """Mock LLM client that always raises an exception to test stage fallbacks."""

    def complete(self, *args, **kwargs) -> str:
        raise Exception("Simulated LLM service timeout")

    async def acomplete(self, *args, **kwargs) -> str:
        raise Exception("Simulated LLM service timeout")


def test_llm_failure_triggers_fallback_and_pipeline_succeeds():
    """When an LLM call fails, the stage falls back gracefully and processing completes."""
    repo = InMemoryTranscriptRepository()
    orchestrator = TranscriptOrchestrator(repository=repo)

    set_llm_client(FailingLLMClient())
    try:
        async def run():
            return await orchestrator.process_transcript(
                meeting_id="llm-fallback-meeting",
                raw_text=SAMPLE_TRANSCRIPT,
            )

        response = asyncio.run(run())

        assert response.accepted is True
        assert response.processing_status == ProcessingStatus.READY_FOR_AI.value

        record = repo.get_record("llm-fallback-meeting")
        assert record is not None
        assert record.processing_status == ProcessingStatus.READY_FOR_AI
    finally:
        set_llm_client(MockLLMClient())




# ============================================================================
# 6. Concurrency Protection & Idempotency
# ============================================================================


def test_concurrency_protection_rejects_simultaneous_processing():
    """Prevent two processing jobs from processing the same meeting simultaneously."""
    repo = InMemoryTranscriptRepository()
    orchestrator = TranscriptOrchestrator(repository=repo)

    meeting_id = "concurrent-meeting-1"
    # Artificially lock meeting in PROCESSING state
    repo.start_processing(meeting_id)

    async def run():
        await orchestrator.process_transcript(
            meeting_id=meeting_id,
            raw_text=SAMPLE_TRANSCRIPT,
        )

    with pytest.raises(ConcurrentProcessingError) as exc_info:
        asyncio.run(run())

    assert "already" in str(exc_info.value).lower()


def test_attempt_incrementation_on_retry():
    """Subsequent attempts increment the attempt counter."""
    repo = InMemoryTranscriptRepository()
    orchestrator = TranscriptOrchestrator(repository=repo)

    meeting_id = "retry-counter-meeting"

    async def run_fail():
        await orchestrator.process_transcript(meeting_id=meeting_id, raw_text="")

    async def run_success():
        return await orchestrator.process_transcript(
            meeting_id=meeting_id,
            raw_text=SAMPLE_TRANSCRIPT,
        )

    # Attempt 1: fail via empty text
    try:
        asyncio.run(run_fail())
    except EmptyTranscriptError:
        pass

    record1 = repo.get_record(meeting_id)
    assert record1.attempt == 1
    assert record1.processing_status == ProcessingStatus.FAILED

    # Attempt 2: succeed with valid text
    response2 = asyncio.run(run_success())

    assert response2.attempt == 2
    assert response2.processing_status == ProcessingStatus.READY_FOR_AI.value
    record2 = repo.get_record(meeting_id)
    assert record2.attempt == 2
    assert record2.processing_status == ProcessingStatus.READY_FOR_AI


def test_invalid_meeting_id_rejected():
    """Invalid meeting IDs fail immediately without pipeline execution."""
    orchestrator = TranscriptOrchestrator()

    async def run():
        await orchestrator.process_transcript(
            meeting_id="../malicious_path",
            raw_text=SAMPLE_TRANSCRIPT,
        )

    with pytest.raises(InvalidMeetingIdError):
        asyncio.run(run())


# ============================================================================
# 7. API Route Tests: POST /transcript/process & GET /transcript/status
# ============================================================================


def test_api_process_sync_success():
    """POST /transcript/process executes synchronously and returns 200 OK."""
    meeting_id = "api-sync-meeting-1"
    payload = {
        "meeting_id": meeting_id,
        "raw_text": SAMPLE_TRANSCRIPT,
        "async_processing": False,
    }

    response = client.post("/transcript/process", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["accepted"] is True
    assert data["meeting_id"] == meeting_id
    assert data["processing_status"] == "READY_FOR_AI"
    assert data["cleaner_version"] == "1.0.0"
    assert data["duration_ms"] >= 0


def test_api_process_async_accepted():
    """POST /transcript/process with async_processing=True returns 202 Accepted."""
    meeting_id = "api-async-meeting-2"
    payload = {
        "meeting_id": meeting_id,
        "raw_text": SAMPLE_TRANSCRIPT,
        "async_processing": True,
    }

    response = client.post("/transcript/process", json=payload)
    assert response.status_code == 202

    data = response.json()
    assert data["accepted"] is True
    assert data["meeting_id"] == meeting_id
    assert data["processing_status"] == "PENDING"


def test_api_get_status_success():
    """GET /transcript/status/{meeting_id} returns 200 with processing details."""
    meeting_id = "api-status-meeting-3"

    # First run processing to create the record
    client.post(
        "/transcript/process",
        json={"meeting_id": meeting_id, "raw_text": SAMPLE_TRANSCRIPT, "async_processing": False},
    )

    response = client.get(f"/transcript/status/{meeting_id}")
    assert response.status_code == 200

    record = response.json()
    assert record["meeting_id"] == meeting_id
    assert record["processing_status"] == "READY_FOR_AI"
    assert record["cleaner_version"] == "1.0.0"
    assert record["attempt"] >= 1
    assert "metrics" in record


def test_api_get_status_not_found():
    """GET /transcript/status/{meeting_id} for unknown meeting returns 404."""
    response = client.get("/transcript/status/unknown-meeting-xyz")
    assert response.status_code == 404


def test_api_concurrency_conflict():
    """POST /transcript/process returns 409 Conflict if meeting is currently processing."""
    service = TranscriptService()
    meeting_id = "api-conflict-meeting"
    service.orchestrator.repository.start_processing(meeting_id)

    payload = {
        "meeting_id": meeting_id,
        "raw_text": SAMPLE_TRANSCRIPT,
        "async_processing": False,
    }

    # Override dependency to use our pre-locked repo
    app.dependency_overrides[get_transcript_service] = lambda: service
    try:
        response = client.post("/transcript/process", json=payload)
        assert response.status_code == 409
        assert "already" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()

