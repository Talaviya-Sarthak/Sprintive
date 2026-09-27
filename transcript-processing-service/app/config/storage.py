"""Configuration and path builder helpers for Part 14: Storage and Processing Metadata."""

import re
from typing import Optional
from pydantic import BaseModel, Field


class InvalidMeetingIdError(ValueError):
    """Raised when a meeting_id contains path traversal elements or invalid characters."""
    pass


def validate_meeting_id(meeting_id: str) -> str:
    """
    Validate that meeting_id is safe against path traversal and follows safe naming conventions.

    Args:
        meeting_id: Raw meeting identifier.

    Returns:
        The cleaned, validated meeting_id.

    Raises:
        InvalidMeetingIdError: If meeting_id is empty, contains path traversal, or has illegal characters.
    """
    if meeting_id is None or not isinstance(meeting_id, str):
        raise InvalidMeetingIdError("meeting_id must be a non-empty string.")

    cleaned = meeting_id.strip()
    if not cleaned:
        raise InvalidMeetingIdError("meeting_id cannot be empty or whitespace.")

    # Check for path traversal tokens
    traversal_patterns = ("..", "/", "\\", "\0", "%2f", "%5c", "%2F", "%5C")
    for pattern in traversal_patterns:
        if pattern in cleaned:
            raise InvalidMeetingIdError(
                f"Invalid path traversal token '{pattern}' detected in meeting_id: '{cleaned}'"
            )

    # Allow alphanumeric characters, hyphens, and underscores (e.g. UUIDs or meeting-123)
    if not re.match(r"^[a-zA-Z0-9_\-]+$", cleaned):
        raise InvalidMeetingIdError(
            f"meeting_id contains invalid characters: '{cleaned}'. Allowed characters are alphanumeric, hyphens, and underscores."
        )

    return cleaned


def build_raw_transcript_path(meeting_id: str) -> str:
    """
    Construct the canonical storage path for the raw transcript.

    Example:
        meetings/meeting-123/raw/conversation.txt
    """
    valid_id = validate_meeting_id(meeting_id)
    return f"meetings/{valid_id}/raw/conversation.txt"


def build_cleaned_transcript_path(meeting_id: str) -> str:
    """
    Construct the canonical storage path for the processed/cleaned transcript.

    Example:
        meetings/meeting-123/processed/cleaned_conversation.txt
    """
    valid_id = validate_meeting_id(meeting_id)
    return f"meetings/{valid_id}/processed/cleaned_conversation.txt"


class StorageConfig(BaseModel):
    """Configuration options for storage and processing metadata."""

    supabase_url: str = Field(
        default="",
        description="Base URL of the Supabase project.",
    )
    supabase_service_role_key: str = Field(
        default="",
        description="Supabase Service Role Key for administrative storage access.",
    )
    supabase_storage_bucket: str = Field(
        default="meetings",
        description="Target bucket in Supabase Storage.",
    )
    storage_type: str = Field(
        default="local",
        description="Storage provider type: 'supabase' or 'local'.",
    )
    storage_base_dir: str = Field(
        default="./storage",
        description="Base directory for local filesystem storage.",
    )
    overwrite_processed_transcript: bool = Field(
        default=True,
        description="Whether to overwrite existing processed transcript on pipeline rerun.",
    )
    cleaner_version: str = Field(
        default="1.0.0",
        description="Version string of the transcript cleaner pipeline.",
    )
    content_type: str = Field(
        default="text/plain; charset=utf-8",
        description="MIME content-type for uploaded text transcripts.",
    )
