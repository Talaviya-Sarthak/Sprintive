"""Repository service for Part 14: Transcript Processing Metadata.

Handles persistence and retrieval of processing metadata records in the database.
Maintains strict separation between database operations and storage operations.
"""

import logging
import threading
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, Optional

from app.models.processing import ProcessingRecord, ProcessingStatus

logger = logging.getLogger(__name__)


class TranscriptRepositoryError(Exception):
    """Base exception for transcript repository errors."""
    pass


class ConcurrentProcessingError(TranscriptRepositoryError):
    """Raised when an attempt is made to process a meeting that is already actively PROCESSING."""
    pass


class BaseTranscriptRepository(ABC):
    """Abstract interface for meeting transcript processing metadata persistence."""

    @abstractmethod
    def get_processing_record(self, meeting_id: str) -> Optional[ProcessingRecord]:
        """Retrieve the processing record for a meeting, if present."""
        pass

    def get_record(self, meeting_id: str) -> Optional[ProcessingRecord]:
        """Convenience alias for get_processing_record."""
        return self.get_processing_record(meeting_id)

    @abstractmethod
    def create_or_init_record(
        self,
        meeting_id: str,
        raw_transcript_path: Optional[str] = None,
    ) -> ProcessingRecord:
        """Initialize or fetch an existing processing record for a meeting."""
        pass

    @abstractmethod
    def start_processing(
        self,
        meeting_id: str,
        raw_transcript_path: Optional[str] = None,
        enforce_concurrency: bool = False,
    ) -> ProcessingRecord:
        """Atomically transition a meeting to PROCESSING status with optional concurrency guard."""
        pass

    @abstractmethod
    def update_stage_status(
        self,
        meeting_id: str,
        current_stage: str,
        processing_status: ProcessingStatus,
        metrics: Optional[dict] = None,
    ) -> ProcessingRecord:
        """Update current active stage, processing status, and incremental metrics."""
        pass

    @abstractmethod
    def update_processing_metadata(
        self,
        meeting_id: str,
        cleaned_transcript_path: str,
        processing_status: ProcessingStatus,
        cleaner_version: str,
        completed_at: Optional[datetime] = None,
        error: Optional[str] = None,
    ) -> ProcessingRecord:
        """Update processing metadata for a meeting."""
        pass

    @abstractmethod
    def mark_ready_for_ai(
        self,
        meeting_id: str,
        cleaned_transcript_path: str,
        cleaner_version: str,
        duration_ms: Optional[int] = None,
        metrics: Optional[dict] = None,
        warnings: Optional[list] = None,
    ) -> ProcessingRecord:
        """Mark a meeting's processing status as READY_FOR_AI after verified storage."""
        pass

    @abstractmethod
    def mark_failed(
        self,
        meeting_id: str,
        error_message: str,
        error_stage: Optional[str] = None,
        duration_ms: Optional[int] = None,
    ) -> ProcessingRecord:
        """Mark a meeting's processing status as FAILED."""
        pass


class InMemoryTranscriptRepository(BaseTranscriptRepository):
    """
    Thread-safe in-memory transcript repository.
    Used for testing, standalone runs, and decoupled execution without external DB dependencies.
    """

    def __init__(self):
        self._records: Dict[str, ProcessingRecord] = {}
        self._lock = threading.RLock()

    def get_processing_record(self, meeting_id: str) -> Optional[ProcessingRecord]:
        with self._lock:
            record = self._records.get(meeting_id)
            return record.model_copy(deep=True) if record else None

    def get_record(self, meeting_id: str) -> Optional[ProcessingRecord]:
        return self.get_processing_record(meeting_id)


    def create_or_init_record(
        self,
        meeting_id: str,
        raw_transcript_path: Optional[str] = None,
    ) -> ProcessingRecord:
        with self._lock:
            now = datetime.now(timezone.utc)
            if meeting_id in self._records:
                record = self._records[meeting_id]
                record.attempt += 1
                record.started_at = now
                if raw_transcript_path and not record.raw_transcript_path:
                    record.raw_transcript_path = raw_transcript_path
            else:
                record = ProcessingRecord(
                    meeting_id=meeting_id,
                    raw_transcript_path=raw_transcript_path,
                    processing_status=ProcessingStatus.PROCESSING,
                    attempt=1,
                    created_at=now,
                    started_at=now,
                )
                self._records[meeting_id] = record
            return record.model_copy(deep=True)

    def start_processing(
        self,
        meeting_id: str,
        raw_transcript_path: Optional[str] = None,
        enforce_concurrency: bool = False,
    ) -> ProcessingRecord:
        with self._lock:
            existing = self._records.get(meeting_id)
            if enforce_concurrency and existing and existing.processing_status in (
                ProcessingStatus.PROCESSING,
                ProcessingStatus.CLEANING,
                ProcessingStatus.VALIDATING,
            ):
                raise ConcurrentProcessingError(
                    f"Meeting {meeting_id} is already actively being processed (attempt={existing.attempt})."
                )
            now = datetime.now(timezone.utc)
            if existing:
                existing.attempt += 1
                existing.started_at = now
                existing.completed_at = None
                existing.error = None
                existing.error_stage = None
                existing.processing_status = ProcessingStatus.PROCESSING
                if raw_transcript_path:
                    existing.raw_transcript_path = raw_transcript_path
                return existing.model_copy(deep=True)
            else:
                record = ProcessingRecord(
                    meeting_id=meeting_id,
                    raw_transcript_path=raw_transcript_path,
                    processing_status=ProcessingStatus.PROCESSING,
                    attempt=1,
                    created_at=now,
                    started_at=now,
                )
                self._records[meeting_id] = record
                return record.model_copy(deep=True)

    def update_stage_status(
        self,
        meeting_id: str,
        current_stage: str,
        processing_status: ProcessingStatus,
        metrics: Optional[dict] = None,
    ) -> ProcessingRecord:
        with self._lock:
            if meeting_id not in self._records:
                self.create_or_init_record(meeting_id)
            record = self._records[meeting_id]
            record.current_stage = current_stage
            record.processing_status = processing_status
            if metrics:
                record.metrics.update(metrics)
            logger.info("Stage transition: meeting_id=%s stage=%s status=%s", meeting_id, current_stage, processing_status)
            return record.model_copy(deep=True)

    def update_processing_metadata(
        self,
        meeting_id: str,
        cleaned_transcript_path: str,
        processing_status: ProcessingStatus,
        cleaner_version: str,
        completed_at: Optional[datetime] = None,
        error: Optional[str] = None,
    ) -> ProcessingRecord:
        with self._lock:
            if meeting_id not in self._records:
                self.create_or_init_record(meeting_id)
            record = self._records[meeting_id]
            record.cleaned_transcript_path = cleaned_transcript_path
            record.processing_status = processing_status
            record.cleaner_version = cleaner_version
            record.error = error
            if completed_at is not None:
                record.completed_at = completed_at
            logger.info("Updated processing metadata for meeting_id=%s status=%s", meeting_id, processing_status)
            return record.model_copy(deep=True)

    def mark_ready_for_ai(
        self,
        meeting_id: str,
        cleaned_transcript_path: str,
        cleaner_version: str,
        duration_ms: Optional[int] = None,
        metrics: Optional[dict] = None,
        warnings: Optional[list] = None,
    ) -> ProcessingRecord:
        now = datetime.now(timezone.utc)
        with self._lock:
            record = self.update_processing_metadata(
                meeting_id=meeting_id,
                cleaned_transcript_path=cleaned_transcript_path,
                processing_status=ProcessingStatus.READY_FOR_AI,
                cleaner_version=cleaner_version,
                completed_at=now,
                error=None,
            )
            raw_rec = self._records[meeting_id]
            if duration_ms is not None:
                raw_rec.duration_ms = duration_ms
            if metrics:
                raw_rec.metrics.update(metrics)
            if warnings:
                raw_rec.warnings.extend(warnings)
            return raw_rec.model_copy(deep=True)

    def mark_failed(
        self,
        meeting_id: str,
        error_message: str,
        error_stage: Optional[str] = None,
        duration_ms: Optional[int] = None,
    ) -> ProcessingRecord:
        with self._lock:
            if meeting_id not in self._records:
                self.create_or_init_record(meeting_id)
            record = self._records[meeting_id]
            record.processing_status = ProcessingStatus.FAILED
            record.error = error_message
            record.completed_at = datetime.now(timezone.utc)
            if error_stage:
                record.error_stage = error_stage
            if duration_ms is not None:
                record.duration_ms = duration_ms
            logger.warning("Marked meeting_id=%s as FAILED (stage=%s): %s", meeting_id, error_stage, error_message)
            return record.model_copy(deep=True)

    def clear(self) -> None:
        """Reset internal records (useful for test isolation)."""
        with self._lock:
            self._records.clear()


# Default singleton instance
_default_repository = InMemoryTranscriptRepository()


def get_transcript_repository() -> BaseTranscriptRepository:
    """Dependency injector for transcript repository."""
    return _default_repository
