"""Unit tests for InMemoryTranscriptRepository (Part 14)."""

import pytest
from datetime import datetime, timezone

from app.models.processing import ProcessingRecord, ProcessingStatus
from app.services.transcript_repository import InMemoryTranscriptRepository


class TestProcessingRepository:
    """Test suite for metadata repository operations and status transitions."""

    def test_create_and_get_record(self):
        """Repository creates and retrieves processing records correctly."""
        repo = InMemoryTranscriptRepository()
        meeting_id = "meeting-repo-1"

        record = repo.create_or_init_record(meeting_id, raw_transcript_path="meetings/meeting-repo-1/raw/conversation.txt")
        assert record.meeting_id == meeting_id
        assert record.processing_status == ProcessingStatus.PROCESSING
        assert record.attempt == 1
        assert record.raw_transcript_path == "meetings/meeting-repo-1/raw/conversation.txt"

        fetched = repo.get_processing_record(meeting_id)
        assert fetched is not None
        assert fetched.meeting_id == meeting_id

    def test_increment_attempt_on_reinit(self):
        """Re-initializing an existing record increments attempt counter."""
        repo = InMemoryTranscriptRepository()
        meeting_id = "meeting-retry"

        r1 = repo.create_or_init_record(meeting_id)
        assert r1.attempt == 1

        r2 = repo.create_or_init_record(meeting_id)
        assert r2.attempt == 2

    def test_mark_ready_for_ai(self):
        """mark_ready_for_ai updates status to READY_FOR_AI and records completed_at timestamp."""
        repo = InMemoryTranscriptRepository()
        meeting_id = "meeting-ready"

        repo.create_or_init_record(meeting_id)
        updated = repo.mark_ready_for_ai(
            meeting_id=meeting_id,
            cleaned_transcript_path="meetings/meeting-ready/processed/cleaned_conversation.txt",
            cleaner_version="1.0.0",
        )

        assert updated.processing_status == ProcessingStatus.READY_FOR_AI
        assert updated.cleaned_transcript_path == "meetings/meeting-ready/processed/cleaned_conversation.txt"
        assert updated.completed_at is not None
        assert updated.error is None

    def test_mark_failed(self):
        """mark_failed records error message and marks status FAILED."""
        repo = InMemoryTranscriptRepository()
        meeting_id = "meeting-failed"

        repo.create_or_init_record(meeting_id)
        updated = repo.mark_failed(meeting_id=meeting_id, error_message="Storage bucket unavailable")

        assert updated.processing_status == ProcessingStatus.FAILED
        assert updated.error == "Storage bucket unavailable"
