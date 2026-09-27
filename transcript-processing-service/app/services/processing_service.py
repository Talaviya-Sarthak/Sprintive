"""Processing orchestration service for Part 14: Transcript Persistence and Metadata.

Coordinates:
    Part 13 Final Formatter -> Storage Service -> Database Metadata Repository.
Enforces the strict order:
    1. Upload cleaned transcript to storage
    2. Verify upload succeeded
    3. Update database metadata
    4. Transition status to READY_FOR_AI
"""

import logging
from typing import Optional

from app.config.storage import (
    StorageConfig,
    build_cleaned_transcript_path,
    build_raw_transcript_path,
    validate_meeting_id,
)
from app.core.config import settings
from app.models.processing import ProcessingRecord, ProcessingStatus
from app.services.storage_service import (
    TranscriptStorageError,
    TranscriptStorageService,
    get_storage_service,
)
from app.services.transcript_repository import (
    BaseTranscriptRepository,
    get_transcript_repository,
)

logger = logging.getLogger(__name__)


class ProcessingService:
    """
    Coordinates transcript persistence and lifecycle status transitions.
    Guarantees that a transcript is only marked READY_FOR_AI after verified storage.
    """

    def __init__(
        self,
        storage_service: Optional[TranscriptStorageService] = None,
        repository: Optional[BaseTranscriptRepository] = None,
        config: Optional[StorageConfig] = None,
    ):
        self.storage_service = storage_service or get_storage_service()
        self.repository = repository or get_transcript_repository()
        self.config = config or StorageConfig(
            cleaner_version=settings.CLEANER_VERSION,
            overwrite_processed_transcript=settings.OVERWRITE_PROCESSED_TRANSCRIPT,
        )

    def store_final_transcript(
        self,
        meeting_id: str,
        transcript_text: str,
        raw_transcript_path: Optional[str] = None,
        overwrite: Optional[bool] = None,
    ) -> ProcessingRecord:
        """
        Store the final cleaned transcript and transition lifecycle status to READY_FOR_AI.

        Order of Operations:
            1. Validate meeting_id against traversal patterns.
            2. Initialize or increment attempt in repository.
            3. Upload cleaned transcript to storage (or verify existing artifact on retry).
            4. Verify successful upload.
            5. Store cleaned_transcript_path and mark READY_FOR_AI in repository.

        Strict Invariants:
            - NEVER overwrites raw transcript (meetings/{meeting_id}/raw/conversation.txt).
            - NEVER marks READY_FOR_AI if storage upload or verification fails.
            - Preserves existing artifacts on retry without creating duplicate filenames.
        """
        valid_id = validate_meeting_id(meeting_id)
        effective_raw_path = raw_transcript_path or build_raw_transcript_path(valid_id)
        cleaned_path = build_cleaned_transcript_path(valid_id)

        # 1. Initialize or increment attempt in repository
        record = self.repository.create_or_init_record(
            meeting_id=valid_id,
            raw_transcript_path=effective_raw_path,
        )

        # 2. Upload and verify in storage
        try:
            stored_path = self.storage_service.upload_cleaned_transcript(
                meeting_id=valid_id,
                transcript_text=transcript_text,
                overwrite=overwrite,
            )
        except Exception as upload_exc:
            error_msg = f"cleaned transcript upload failed: {upload_exc}"
            logger.error("Storage upload failure for meeting_id=%s: %s", valid_id, error_msg)
            # Mark FAILED in database metadata
            self.repository.mark_failed(meeting_id=valid_id, error_message=error_msg)
            raise upload_exc

        # 3. Update database metadata and mark READY_FOR_AI
        try:
            updated_record = self.repository.mark_ready_for_ai(
                meeting_id=valid_id,
                cleaned_transcript_path=stored_path,
                cleaner_version=self.config.cleaner_version,
            )
            logger.info("Meeting %s successfully persisted and marked READY_FOR_AI", valid_id)
            return updated_record
        except Exception as db_exc:
            # Important partial-failure scenario:
            # Storage upload succeeded, but database update failed!
            # Do NOT delete the successfully uploaded file. Log inconsistency and re-raise.
            logger.critical(
                "CRITICAL INCONSISTENCY: Transcript stored at %s for meeting_id=%s, but database update failed: %s",
                stored_path,
                valid_id,
                db_exc,
            )
            raise db_exc

    def reconcile_or_retry(
        self,
        meeting_id: str,
        transcript_text: Optional[str] = None,
    ) -> ProcessingRecord:
        """
        Idempotent retry handler for partial-failure reconciliation.
        If the cleaned transcript already exists in storage and is valid, reconciles DB status to READY_FOR_AI.
        """
        valid_id = validate_meeting_id(meeting_id)
        cleaned_path = build_cleaned_transcript_path(valid_id)

        # Check if already present in storage
        if self.storage_service.cleaned_transcript_exists(valid_id):
            logger.info("Retry found existing verified artifact at %s for meeting_id=%s; reconciling metadata", cleaned_path, valid_id)
            return self.repository.mark_ready_for_ai(
                meeting_id=valid_id,
                cleaned_transcript_path=cleaned_path,
                cleaner_version=self.config.cleaner_version,
            )

        if transcript_text is not None:
            return self.store_final_transcript(meeting_id=valid_id, transcript_text=transcript_text)

        raise TranscriptStorageError(
            f"Cannot reconcile meeting {valid_id}: artifact not found in storage and no transcript text provided."
        )


def get_processing_service(
    storage_service: Optional[TranscriptStorageService] = None,
    repository: Optional[BaseTranscriptRepository] = None,
    config: Optional[StorageConfig] = None,
) -> ProcessingService:
    """Dependency injector for ProcessingService."""
    return ProcessingService(
        storage_service=storage_service,
        repository=repository,
        config=config,
    )
