import os
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)


class BaseTranscriptStorage(ABC):
    """Abstract base class for transcript storage providers."""

    @abstractmethod
    def get_transcript(self, transcript_path: str) -> str:
        """
        Retrieve raw transcript text from the storage provider.

        Args:
            transcript_path: Path or key of the transcript in storage.

        Returns:
            The raw transcript string content.

        Raises:
            FileNotFoundError: If the file is not found at transcript_path.
            IOError: If an error occurs while reading the transcript.
        """
        pass


class LocalTranscriptStorage(BaseTranscriptStorage):
    """
    Local filesystem implementation of BaseTranscriptStorage.
    Used for local testing, fixtures, and standalone operation in Part 1.
    """

    def __init__(self, base_dir: str = "."):
        self.base_dir = os.path.abspath(base_dir)

    def get_transcript(self, transcript_path: str) -> str:
        """
        Retrieve raw transcript text from local filesystem.
        Supports both absolute paths and paths relative to base_dir or project root.
        """
        # Try direct path
        candidates = [
            transcript_path,
            os.path.join(self.base_dir, transcript_path),
            os.path.abspath(transcript_path),
        ]

        target_file = None
        for candidate in candidates:
            if os.path.isfile(candidate):
                target_file = candidate
                break

        if not target_file:
            logger.error("Transcript file not found at path: %s", transcript_path)
            raise FileNotFoundError(
                f"Transcript file not found at '{transcript_path}'. Checked: {candidates}"
            )

        logger.info("Reading transcript from local path: %s", target_file)
        with open(target_file, "r", encoding="utf-8") as f:
            return f.read()


class SupabaseTranscriptStorage(BaseTranscriptStorage):
    """
    Placeholder/stub for Supabase storage provider to be implemented in a future phase.
    Follows the same BaseTranscriptStorage contract.
    """

    def __init__(self, bucket: str = "meeting-transcripts"):
        self.bucket = bucket

    def get_transcript(self, transcript_path: str) -> str:
        raise NotImplementedError(
            "Supabase storage integration is not implemented in Part 1. "
            "Use LocalTranscriptStorage or provide raw_text directly."
        )


def get_transcript_storage() -> BaseTranscriptStorage:
    """Dependency provider returning the configured transcript storage instance."""
    from app.core.config import settings

    if settings.STORAGE_TYPE == "supabase":
        return SupabaseTranscriptStorage()
    return LocalTranscriptStorage(base_dir=settings.STORAGE_BASE_DIR)
