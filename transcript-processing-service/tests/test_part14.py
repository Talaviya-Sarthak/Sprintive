"""Comprehensive test suite for Part 14: Storage and Processing Metadata Persistence.

Covers all 20 required scenarios:
1. successful upload
2. UTF-8 Hindi content
3. UTF-8 Spanish content
4. mixed-language content
5. deterministic storage path
6. invalid meeting ID
7. raw path protection
8. processed path generation
9. successful metadata update
10. upload failure
11. verification failure
12. database update failure
13. retry after upload success/database failure
14. idempotent repeated execution
15. cleaner version storage
16. READY_FOR_AI only after successful persistence
17. service-role key never returned by API
18. existing processed file handling
19. empty transcript handling
20. provider error handling
"""

import os
import tempfile
import pytest
from fastapi.testclient import TestClient

from app.config.storage import (
    InvalidMeetingIdError,
    StorageConfig,
    build_cleaned_transcript_path,
    build_raw_transcript_path,
    validate_meeting_id,
)
from app.main import app
from app.models.processing import ProcessingRecord, ProcessingStatus
from app.services.processing_service import ProcessingService
from app.services.storage_service import (
    BaseStorageProvider,
    LocalStorageProvider,
    TranscriptStorageError,
    TranscriptStorageService,
    TranscriptUploadError,
    TranscriptVerificationError,
)
from app.services.transcript_repository import InMemoryTranscriptRepository

client = TestClient(app)


class FailingUploadProvider(BaseStorageProvider):
    """Mock provider that always fails during upload."""

    def upload_text(self, path: str, content: str, content_type: str = "", upsert: bool = True) -> bool:
        raise TranscriptUploadError("Simulated upload provider network error")

    def verify_object(self, path: str) -> bool:
        return False

    def get_text(self, path: str) -> str:
        raise FileNotFoundError()

    def exists(self, path: str) -> bool:
        return False


class FailingVerificationProvider(BaseStorageProvider):
    """Mock provider where upload succeeds, but verification check fails."""

    def upload_text(self, path: str, content: str, content_type: str = "", upsert: bool = True) -> bool:
        return True

    def verify_object(self, path: str) -> bool:
        return False

    def get_text(self, path: str) -> str:
        raise FileNotFoundError()

    def exists(self, path: str) -> bool:
        return False


class FailingDatabaseRepository(InMemoryTranscriptRepository):
    """Mock repository that raises an exception when marking READY_FOR_AI."""

    def mark_ready_for_ai(self, meeting_id: str, cleaned_transcript_path: str, cleaner_version: str) -> ProcessingRecord:
        raise RuntimeError("Simulated database connection error during metadata update")


class TestPart14Persistence:
    """Test suite covering all 20 required Part 14 scenarios."""

    def setup_method(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.provider = LocalStorageProvider(base_dir=self.tmpdir.name)
        self.storage = TranscriptStorageService(provider=self.provider)
        self.repo = InMemoryTranscriptRepository()
        self.service = ProcessingService(storage_service=self.storage, repository=self.repo)

    def teardown_method(self):
        self.tmpdir.cleanup()

    def test_01_successful_upload(self):
        """1. Successful upload: Cleaned transcript is saved and verified in storage."""
        meeting_id = "meeting-101"
        text = "Sarthak: Good morning everyone.\n\nHarshit: Good morning."
        record = self.service.store_final_transcript(meeting_id, text)

        assert record.processing_status == ProcessingStatus.READY_FOR_AI
        assert record.cleaned_transcript_path == f"meetings/{meeting_id}/processed/cleaned_conversation.txt"
        assert self.storage.verify_cleaned_transcript(meeting_id) is True
        assert self.storage.get_cleaned_transcript(meeting_id) == text

    def test_02_utf8_hindi_content(self):
        """2. UTF-8 Hindi content: Preserves Devanagari script accurately without corruption."""
        meeting_id = "meeting-hindi"
        hindi_text = "हर्षित: नमस्ते! डेटाबेस का कनेक्शन चेक कर लिया है."
        record = self.service.store_final_transcript(meeting_id, hindi_text)

        assert record.processing_status == ProcessingStatus.READY_FOR_AI
        retrieved = self.storage.get_cleaned_transcript(meeting_id)
        assert retrieved == hindi_text

    def test_03_utf8_spanish_content(self):
        """3. UTF-8 Spanish content: Preserves Spanish accents and inverted question marks."""
        meeting_id = "meeting-spanish"
        spanish_text = "Carlos: ¡Hola a todos! ¿Cómo está el despliegue de la API?"
        record = self.service.store_final_transcript(meeting_id, spanish_text)

        assert record.processing_status == ProcessingStatus.READY_FOR_AI
        retrieved = self.storage.get_cleaned_transcript(meeting_id)
        assert retrieved == spanish_text

    def test_04_mixed_language_content(self):
        """4. Mixed-language content: Preserves code-switching and technical English terms."""
        meeting_id = "meeting-mixed"
        mixed_text = "हर्षित: हाँ, PostgreSQL database connection अभी fail हो रहा है."
        record = self.service.store_final_transcript(meeting_id, mixed_text)

        assert record.processing_status == ProcessingStatus.READY_FOR_AI
        retrieved = self.storage.get_cleaned_transcript(meeting_id)
        assert retrieved == mixed_text

    def test_05_deterministic_storage_path(self):
        """5. Deterministic storage path: meetings/{meeting_id}/processed/cleaned_conversation.txt."""
        path = build_cleaned_transcript_path("alpha-meeting")
        assert path == "meetings/alpha-meeting/processed/cleaned_conversation.txt"

    def test_06_invalid_meeting_id(self):
        """6. Invalid meeting ID: Rejects path traversal and dangerous characters."""
        with pytest.raises(InvalidMeetingIdError):
            self.service.store_final_transcript("../evil", "text")
        with pytest.raises(InvalidMeetingIdError):
            self.service.store_final_transcript("meeting/sub", "text")
        with pytest.raises(InvalidMeetingIdError):
            self.service.store_final_transcript("meeting\\sub", "text")

    def test_07_raw_path_protection(self):
        """7. Raw path protection: raw/conversation.txt is NEVER overwritten by Part 14."""
        meeting_id = "meeting-protect"
        raw_path = build_raw_transcript_path(meeting_id)
        full_raw = os.path.join(self.tmpdir.name, raw_path)
        os.makedirs(os.path.dirname(full_raw), exist_ok=True)
        with open(full_raw, "w", encoding="utf-8") as f:
            f.write("RAW UNTOUCHED TRANSCRIPT")

        # Store cleaned transcript
        self.service.store_final_transcript(meeting_id, "CLEANED PROCESSED TRANSCRIPT")

        # Verify raw transcript is completely unmodified
        with open(full_raw, "r", encoding="utf-8") as f:
            assert f.read() == "RAW UNTOUCHED TRANSCRIPT"
        assert build_raw_transcript_path(meeting_id) != build_cleaned_transcript_path(meeting_id)

    def test_08_processed_path_generation(self):
        """8. Processed path generation: strictly starts with meetings/{meeting_id}/processed/."""
        meeting_id = "test-path-gen"
        path = build_cleaned_transcript_path(meeting_id)
        assert path.startswith(f"meetings/{meeting_id}/processed/")
        assert path.endswith("cleaned_conversation.txt")

    def test_09_successful_metadata_update(self):
        """9. Successful metadata update: records paths, timestamps, attempt, cleaner version."""
        meeting_id = "meeting-meta"
        record = self.service.store_final_transcript(
            meeting_id=meeting_id,
            transcript_text="Test dialogue.",
            raw_transcript_path="meetings/meeting-meta/raw/conversation.txt",
        )

        assert record.meeting_id == meeting_id
        assert record.raw_transcript_path == "meetings/meeting-meta/raw/conversation.txt"
        assert record.cleaned_transcript_path == f"meetings/{meeting_id}/processed/cleaned_conversation.txt"
        assert record.processing_status == ProcessingStatus.READY_FOR_AI
        assert record.attempt == 1
        assert record.completed_at is not None
        assert record.cleaner_version == "1.0.0"

    def test_10_upload_failure(self):
        """10. Upload failure: marks FAILED in repository and does NOT mark READY_FOR_AI."""
        failing_storage = TranscriptStorageService(provider=FailingUploadProvider())
        service = ProcessingService(storage_service=failing_storage, repository=self.repo)

        meeting_id = "meeting-fail-upload"
        with pytest.raises(TranscriptUploadError):
            service.store_final_transcript(meeting_id, "Some text")

        rec = self.repo.get_processing_record(meeting_id)
        assert rec is not None
        assert rec.processing_status == ProcessingStatus.FAILED
        assert "cleaned transcript upload failed" in rec.error

    def test_11_verification_failure(self):
        """11. Verification failure: raises TranscriptVerificationError and marks FAILED."""
        verif_fail_storage = TranscriptStorageService(provider=FailingVerificationProvider())
        service = ProcessingService(storage_service=verif_fail_storage, repository=self.repo)

        meeting_id = "meeting-fail-verif"
        with pytest.raises(TranscriptVerificationError):
            service.store_final_transcript(meeting_id, "Some text")

        rec = self.repo.get_processing_record(meeting_id)
        assert rec.processing_status == ProcessingStatus.FAILED

    def test_12_database_update_failure(self):
        """12. Database update failure: does not delete uploaded artifact; allows subsequent retry."""
        failing_repo = FailingDatabaseRepository()
        service = ProcessingService(storage_service=self.storage, repository=failing_repo)

        meeting_id = "meeting-db-fail"
        with pytest.raises(RuntimeError):
            service.store_final_transcript(meeting_id, "Some text")

        # Storage file was created and is NOT deleted
        assert self.storage.verify_cleaned_transcript(meeting_id) is True

    def test_13_retry_after_upload_success_database_failure(self):
        """13. Retry after upload success/database failure: reconciles status without re-uploading duplicate."""
        meeting_id = "meeting-retry-flow"
        # Simulate artifact already in storage
        cleaned_path = self.storage.upload_cleaned_transcript(meeting_id, "Verified clean text")

        # Retry reconcile
        record = self.service.reconcile_or_retry(meeting_id)
        assert record.processing_status == ProcessingStatus.READY_FOR_AI
        assert record.cleaned_transcript_path == cleaned_path

    def test_14_idempotent_repeated_execution(self):
        """14. Idempotent repeated execution: running twice maintains same path and succeeds cleanly."""
        meeting_id = "meeting-idempotent"
        text = "Dialogue line."

        r1 = self.service.store_final_transcript(meeting_id, text)
        r2 = self.service.store_final_transcript(meeting_id, text)

        assert r1.cleaned_transcript_path == r2.cleaned_transcript_path
        assert r2.processing_status == ProcessingStatus.READY_FOR_AI
        assert r2.attempt == 2

    def test_15_cleaner_version_storage(self):
        """15. Cleaner version storage: custom cleaner version is recorded in metadata."""
        custom_config = StorageConfig(cleaner_version="2.1.0")
        service = ProcessingService(
            storage_service=self.storage,
            repository=self.repo,
            config=custom_config,
        )
        record = service.store_final_transcript("meeting-ver", "Text")
        assert record.cleaner_version == "2.1.0"

    def test_16_ready_for_ai_only_after_successful_persistence(self):
        """16. READY_FOR_AI only after successful persistence: status is never READY_FOR_AI prematurely."""
        meeting_id = "meeting-gate"
        rec_init = self.repo.create_or_init_record(meeting_id)
        assert rec_init.processing_status != ProcessingStatus.READY_FOR_AI

        rec_final = self.service.store_final_transcript(meeting_id, "Ready text.")
        assert rec_final.processing_status == ProcessingStatus.READY_FOR_AI

    def test_17_service_role_key_never_returned_by_api(self):
        """17. Service-role key never returned by API or exposed in response."""
        payload = {
            "meeting_id": "meeting-api-sec",
            "transcript_text": "Sarthak: Hello.",
        }
        response = client.post("/transcript/store-final", json=payload)
        assert response.status_code == 200
        content = response.text
        assert "service_role" not in content.lower()
        assert "secret" not in content.lower()

    def test_18_existing_processed_file_handling(self):
        """18. Existing processed file handling: overwrites or replaces cleanly when configured."""
        meeting_id = "meeting-overwrite"
        self.service.store_final_transcript(meeting_id, "Old text", overwrite=True)
        self.service.store_final_transcript(meeting_id, "New text", overwrite=True)

        assert self.storage.get_cleaned_transcript(meeting_id) == "New text"

    def test_19_empty_transcript_handling(self):
        """19. Empty transcript handling: empty text is stored cleanly without crash."""
        meeting_id = "meeting-empty-text"
        record = self.service.store_final_transcript(meeting_id, "")
        assert record.processing_status == ProcessingStatus.READY_FOR_AI
        assert self.storage.get_cleaned_transcript(meeting_id) == ""

    def test_20_provider_error_handling(self):
        """20. Provider error handling: provider errors are logged and converted to TranscriptStorageError."""
        failing_storage = TranscriptStorageService(provider=FailingUploadProvider())
        service = ProcessingService(storage_service=failing_storage, repository=self.repo)

        with pytest.raises(TranscriptStorageError):
            service.store_final_transcript("meeting-prov-err", "content")

    def test_api_store_final_endpoint_success(self):
        """API endpoint POST /transcript/store-final returns 200 OK and expected schema."""
        payload = {
            "meeting_id": "api-meeting-1",
            "transcript_text": "Harshit: Standup done.",
            "raw_transcript_path": "meetings/api-meeting-1/raw/conversation.txt",
        }
        response = client.post("/transcript/store-final", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["meeting_id"] == "api-meeting-1"
        assert data["cleaned_transcript_path"] == "meetings/api-meeting-1/processed/cleaned_conversation.txt"
        assert data["processing_status"] == "READY_FOR_AI"

    def test_api_store_final_endpoint_invalid_meeting_id(self):
        """API endpoint returns 400 Bad Request for path traversal meeting_id."""
        payload = {
            "meeting_id": "../traversal_attack",
            "transcript_text": "Attack",
        }
        response = client.post("/transcript/store-final", json=payload)
        assert response.status_code == 400
        assert "Invalid meeting_id" in response.json()["detail"]
