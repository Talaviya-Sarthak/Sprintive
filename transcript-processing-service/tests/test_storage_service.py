"""Unit tests for TranscriptStorageService and storage providers (Part 14)."""

import os
import tempfile
import pytest
import httpx

from app.config.storage import (
    InvalidMeetingIdError,
    StorageConfig,
    build_cleaned_transcript_path,
    build_raw_transcript_path,
    validate_meeting_id,
)
from app.services.storage_service import (
    LocalStorageProvider,
    SupabaseStorageProvider,
    TranscriptStorageError,
    TranscriptStorageService,
    TranscriptUploadError,
    TranscriptVerificationError,
)


class TestStorageService:
    """Test suite for path validation, providers, and storage invariants."""

    def test_valid_meeting_ids(self):
        """Valid meeting IDs pass validation."""
        assert validate_meeting_id("meeting-123") == "meeting-123"
        assert validate_meeting_id("550e8400-e29b-41d4-a716-446655440000") == "550e8400-e29b-41d4-a716-446655440000"
        assert validate_meeting_id("scrum_standup_2026_09") == "scrum_standup_2026_09"

    def test_invalid_meeting_ids_path_traversal(self):
        """Path traversal characters in meeting ID raise InvalidMeetingIdError."""
        with pytest.raises(InvalidMeetingIdError):
            validate_meeting_id("../escape")
        with pytest.raises(InvalidMeetingIdError):
            validate_meeting_id("foo/bar")
        with pytest.raises(InvalidMeetingIdError):
            validate_meeting_id("foo\\bar")
        with pytest.raises(InvalidMeetingIdError):
            validate_meeting_id("   ")
        with pytest.raises(InvalidMeetingIdError):
            validate_meeting_id("")
        with pytest.raises(InvalidMeetingIdError):
            validate_meeting_id("meeting;drop table")

    def test_path_builders_deterministic(self):
        """Storage path builders construct deterministic canonical paths."""
        meeting_id = "meeting-xyz"
        raw_path = build_raw_transcript_path(meeting_id)
        cleaned_path = build_cleaned_transcript_path(meeting_id)

        assert raw_path == "meetings/meeting-xyz/raw/conversation.txt"
        assert cleaned_path == "meetings/meeting-xyz/processed/cleaned_conversation.txt"
        assert raw_path != cleaned_path
        assert cleaned_path.startswith("meetings/meeting-xyz/processed/")

    def test_local_storage_provider_upload_and_verify(self):
        """LocalStorageProvider saves UTF-8 text and verifies existence."""
        with tempfile.TemporaryDirectory() as tmpdir:
            provider = LocalStorageProvider(base_dir=tmpdir)
            path = "meetings/m1/processed/cleaned_conversation.txt"
            content = "Sarthak: नमस्ते! चलिए स्टैंडअप शुरू करते हैं."

            assert provider.upload_text(path, content) is True
            assert provider.verify_object(path) is True
            assert provider.exists(path) is True
            assert provider.get_text(path) == content

    def test_local_storage_no_overwrite_when_disabled(self):
        """LocalStorageProvider rejects upload when file exists and upsert=False."""
        with tempfile.TemporaryDirectory() as tmpdir:
            provider = LocalStorageProvider(base_dir=tmpdir)
            path = "test.txt"
            provider.upload_text(path, "first", upsert=True)
            with pytest.raises(TranscriptUploadError):
                provider.upload_text(path, "second", upsert=False)

    def test_storage_service_upload_cleaned_transcript_success(self):
        """TranscriptStorageService uploads and verifies successfully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            provider = LocalStorageProvider(base_dir=tmpdir)
            service = TranscriptStorageService(provider=provider)

            meeting_id = "meeting-abc"
            text = "Harshit: We resolved the database issue."
            path = service.upload_cleaned_transcript(meeting_id, text)

            assert path == "meetings/meeting-abc/processed/cleaned_conversation.txt"
            assert service.verify_cleaned_transcript(meeting_id, path) is True
            assert service.get_cleaned_transcript(meeting_id) == text

    def test_raw_transcript_never_touched(self):
        """Uploading cleaned transcript must never write to raw/conversation.txt."""
        with tempfile.TemporaryDirectory() as tmpdir:
            provider = LocalStorageProvider(base_dir=tmpdir)
            service = TranscriptStorageService(provider=provider)

            meeting_id = "meeting-safe"
            raw_path = build_raw_transcript_path(meeting_id)
            raw_full = os.path.join(tmpdir, raw_path)
            os.makedirs(os.path.dirname(raw_full), exist_ok=True)
            with open(raw_full, "w", encoding="utf-8") as f:
                f.write("RAW VERBATIM CONTENT")

            # Upload cleaned transcript
            service.upload_cleaned_transcript(meeting_id, "CLEANED CONTENT")

            # Check that raw content remains 100% untouched
            with open(raw_full, "r", encoding="utf-8") as f:
                assert f.read() == "RAW VERBATIM CONTENT"

    def test_supabase_storage_provider_mock_http(self):
        """SupabaseStorageProvider handles HTTP 200 upload and 200 verification."""
        def mock_transport(request: httpx.Request) -> httpx.Response:
            if request.method == "POST" and "storage/v1/object/meetings" in str(request.url):
                return httpx.Response(status_code=200, json={"Key": "meetings/m1/processed/cleaned_conversation.txt"})
            if request.method == "HEAD" and "authenticated" in str(request.url):
                return httpx.Response(status_code=200)
            if request.method == "GET" and "authenticated" in str(request.url):
                return httpx.Response(status_code=200, text="Mock text")
            return httpx.Response(status_code=404)

        mock_client = httpx.Client(transport=httpx.MockTransport(mock_transport))
        provider = SupabaseStorageProvider(
            supabase_url="https://mock.supabase.co",
            service_role_key="mock_secret_key_12345",
            bucket="meetings",
            http_client=mock_client,
        )

        assert provider.upload_text("meetings/m1/processed/cleaned_conversation.txt", "Mock text") is True
        assert provider.verify_object("meetings/m1/processed/cleaned_conversation.txt") is True
        assert provider.get_text("meetings/m1/processed/cleaned_conversation.txt") == "Mock text"

    def test_supabase_storage_provider_upload_failure(self):
        """SupabaseStorageProvider raises TranscriptUploadError on HTTP failure without leaking key."""
        def mock_failing_transport(request: httpx.Request) -> httpx.Response:
            return httpx.Response(status_code=500, text="Internal storage engine crash")

        mock_client = httpx.Client(transport=httpx.MockTransport(mock_failing_transport))
        provider = SupabaseStorageProvider(
            supabase_url="https://mock.supabase.co",
            service_role_key="super_secret_key_to_never_leak",
            bucket="meetings",
            http_client=mock_client,
        )

        with pytest.raises(TranscriptUploadError) as exc_info:
            provider.upload_text("path/to/obj.txt", "data")
        assert "super_secret_key_to_never_leak" not in str(exc_info.value)
