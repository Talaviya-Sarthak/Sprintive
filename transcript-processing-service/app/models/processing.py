"""Domain models and schemas for Part 14: Storage and Processing Metadata."""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ProcessingStatus(str, Enum):
    """Lifecycle processing status of a meeting transcript."""

    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    CLEANING = "CLEANING"
    VALIDATING = "VALIDATING"
    COMPLETED = "COMPLETED"
    READY_FOR_AI = "READY_FOR_AI"
    FAILED = "FAILED"


class ProcessingRecord(BaseModel):
    """Database record tracking the processing metadata and storage artifacts of a meeting."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    raw_transcript_path: Optional[str] = Field(
        default=None,
        description="Storage path to the original raw verbatim transcript (immutable).",
    )
    cleaned_transcript_path: Optional[str] = Field(
        default=None,
        description="Storage path to the finalized clean transcript.",
    )
    processing_status: ProcessingStatus = Field(
        default=ProcessingStatus.PENDING,
        description="Current processing lifecycle status.",
    )
    attempt: int = Field(
        default=1,
        description="Processing attempt counter for retries.",
        ge=1,
    )
    error: Optional[str] = Field(
        default=None,
        description="Error description if processing failed.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when processing was initialized.",
    )
    started_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when processing started.",
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when processing successfully completed and was persisted.",
    )
    cleaner_version: str = Field(
        default="1.0.0",
        description="Pipeline version used to generate the cleaned transcript.",
    )

    model_config = ConfigDict(populate_by_name=True)


class StoreFinalTranscriptRequest(BaseModel):
    """Request payload for storing the finalized clean transcript (Part 14)."""

    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    transcript_text: str = Field(
        ...,
        description="Final cleaned transcript text to persist.",
    )
    raw_transcript_path: Optional[str] = Field(
        default=None,
        description="Optional path to the immutable raw transcript.",
    )
    overwrite: Optional[bool] = Field(
        default=None,
        description="Whether to overwrite existing processed artifact if already present.",
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "meeting_id": "meeting-123",
                "transcript_text": "Sarthak Talaviya: Good morning, everyone. Let's start the meeting.\n\nHarshit Pambhar: Good morning. I am ready.",
                "raw_transcript_path": "meetings/meeting-123/raw/conversation.txt",
            }
        },
    )


class StoreFinalTranscriptResponse(BaseModel):
    """Response payload for storing the finalized clean transcript (Part 14)."""

    success: bool = Field(
        ...,
        description="Whether storing and metadata updating succeeded.",
    )
    meeting_id: str = Field(
        ...,
        description="Unique identifier of the meeting.",
    )
    cleaned_transcript_path: str = Field(
        ...,
        description="Deterministic storage path where the cleaned transcript is saved.",
    )
    processing_status: ProcessingStatus = Field(
        ...,
        description="Processing status (READY_FOR_AI if successful, or FAILED).",
    )
    error: Optional[str] = Field(
        default=None,
        description="Error details if the operation failed.",
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "success": True,
                "meeting_id": "meeting-123",
                "cleaned_transcript_path": "meetings/meeting-123/processed/cleaned_conversation.txt",
                "processing_status": "READY_FOR_AI",
                "error": None,
            }
        },
    )
