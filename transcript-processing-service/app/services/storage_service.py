"""Storage service for Part 14: Final Clean Transcript Persistence.

Handles uploading and verifying the final cleaned transcript to Supabase Storage
or Local Storage, enforcing UTF-8 encoding, deterministic path construction, and
strict protection of the raw transcript.
"""

import logging
import os
from abc import ABC, abstractmethod
from typing import Optional

import httpx

from app.config.storage import (
    InvalidMeetingIdError,
    StorageConfig,
    build_cleaned_transcript_path,
    build_raw_transcript_path,
    validate_meeting_id,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class TranscriptStorageError(Exception):
    """Base exception for transcript storage operations."""
    pass


class TranscriptUploadError(TranscriptStorageError):
    """Raised when an error occurs during transcript upload."""
    pass


class TranscriptVerificationError(TranscriptStorageError):
    """Raised when an uploaded transcript cannot be verified in storage."""
    pass


class BaseStorageProvider(ABC):
    """Abstract interface for storage backend implementations."""

    @abstractmethod
    def upload_text(
        self,
        path: str,
        content: str,
        content_type: str = "text/plain; charset=utf-8",
        upsert: bool = True,
    ) -> bool:
        """Upload text content to the specified path."""
        pass

    @abstractmethod
    def verify_object(self, path: str) -> bool:
        """Verify that an object exists and is accessible at the specified path."""
        pass

    @abstractmethod
    def get_text(self, path: str) -> str:
        """Retrieve text content from the specified path as a UTF-8 string."""
        pass

    @abstractmethod
    def exists(self, path: str) -> bool:
        """Check whether an object exists at the specified path."""
        pass


class LocalStorageProvider(BaseStorageProvider):
    """Local filesystem implementation of BaseStorageProvider for development and tests."""

    def __init__(self, base_dir: str = "./storage"):
        self.base_dir = os.path.abspath(base_dir)

    def _get_full_path(self, path: str) -> str:
        clean_path = path.lstrip("/\\")
        return os.path.join(self.base_dir, clean_path)

    def upload_text(
        self,
        path: str,
        content: str,
        content_type: str = "text/plain; charset=utf-8",
        upsert: bool = True,
    ) -> bool:
        full_path = self._get_full_path(path)
        if not upsert and os.path.exists(full_path):
            raise TranscriptUploadError(
                f"File already exists at '{path}' and overwrite is disabled."
            )

        try:
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)
            logger.info("Successfully saved local transcript to %s", full_path)
            return True
        except Exception as exc:
            logger.exception("Failed to write local transcript to %s: %s", full_path, exc)
            raise TranscriptUploadError(f"Failed to write local transcript: {exc}") from exc

    def verify_object(self, path: str) -> bool:
        full_path = self._get_full_path(path)
        exists = os.path.isfile(full_path)
        if not exists:
            logger.warning("Verification failed: file does not exist at %s", full_path)
            return False
        return True

    def get_text(self, path: str) -> str:
        full_path = self._get_full_path(path)
        if not os.path.isfile(full_path):
            raise FileNotFoundError(f"Transcript not found at {path}")
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()

    def exists(self, path: str) -> bool:
        full_path = self._get_full_path(path)
        return os.path.isfile(full_path)


class SupabaseStorageProvider(BaseStorageProvider):
    """Supabase Storage implementation using HTTP REST API with Service Role Key."""

    def __init__(
        self,
        supabase_url: str,
        service_role_key: str,
        bucket: str = "meetings",
        http_client: Optional[httpx.Client] = None,
    ):
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key
        self.bucket = bucket
        self._client = http_client or httpx.Client(timeout=15.0)

    def _headers(self, content_type: str = "text/plain; charset=utf-8", upsert: bool = True) -> dict:
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
            "Content-Type": content_type,
        }
        if upsert:
            headers["x-upsert"] = "true"
        return headers

    def upload_text(
        self,
        path: str,
        content: str,
        content_type: str = "text/plain; charset=utf-8",
        upsert: bool = True,
    ) -> bool:
        clean_path = path.lstrip("/")
        url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{clean_path}"
        data = content.encode("utf-8")
        headers = self._headers(content_type=content_type, upsert=upsert)

        try:
            response = self._client.post(url, content=data, headers=headers)
            if response.status_code in (200, 201):
                logger.info("Successfully uploaded transcript to Supabase Storage: %s", clean_path)
                return True
            if response.status_code == 409 and not upsert:
                raise TranscriptUploadError(f"Object already exists at '{clean_path}' and overwrite is disabled.")

            # Redact authorization key if present in error response
            err_msg = f"Supabase Storage returned status {response.status_code}: {response.text}"
            logger.error("Supabase Storage upload error: %s", err_msg)
            raise TranscriptUploadError("Supabase Storage upload failed.")
        except httpx.HTTPError as exc:
            logger.exception("HTTP error during Supabase Storage upload: %s", exc)
            raise TranscriptUploadError(f"HTTP error during storage upload: {type(exc).__name__}") from exc

    def verify_object(self, path: str) -> bool:
        clean_path = path.lstrip("/")
        # Verify object existence via head or info endpoint
        url = f"{self.supabase_url}/storage/v1/object/authenticated/{self.bucket}/{clean_path}"
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
        }
        try:
            response = self._client.head(url, headers=headers)
            if response.status_code in (200, 204):
                return True
            # Fallback to GET with range 0-0
            get_resp = self._client.get(url, headers={**headers, "Range": "bytes=0-0"})
            return get_resp.status_code in (200, 206)
        except Exception as exc:
            logger.warning("Supabase Storage verification request failed for %s: %s", clean_path, exc)
            return False

    def get_text(self, path: str) -> str:
        clean_path = path.lstrip("/")
        url = f"{self.supabase_url}/storage/v1/object/authenticated/{self.bucket}/{clean_path}"
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
        }
        response = self._client.get(url, headers=headers)
        if response.status_code == 200:
            return response.content.decode("utf-8")
        if response.status_code == 404:
            raise FileNotFoundError(f"Transcript not found in Supabase Storage at {path}")
        raise TranscriptStorageError(f"Failed to fetch transcript from Supabase: status {response.status_code}")

    def exists(self, path: str) -> bool:
        return self.verify_object(path)


class TranscriptStorageService:
    """
    High-level service coordinating transcript uploads, verification, and path invariants.
    Strictly guarantees that raw transcripts are never modified.
    """

    def __init__(
        self,
        provider: Optional[BaseStorageProvider] = None,
        config: Optional[StorageConfig] = None,
    ):
        self.config = config or StorageConfig(
            supabase_url=settings.SUPABASE_URL,
            supabase_service_role_key=settings.SUPABASE_SERVICE_ROLE_KEY,
            supabase_storage_bucket=settings.SUPABASE_STORAGE_BUCKET,
            storage_type=settings.STORAGE_TYPE,
            storage_base_dir=settings.STORAGE_BASE_DIR,
            overwrite_processed_transcript=settings.OVERWRITE_PROCESSED_TRANSCRIPT,
            cleaner_version=settings.CLEANER_VERSION,
        )

        if provider is not None:
            self.provider = provider
        elif self.config.storage_type == "supabase" and self.config.supabase_url and self.config.supabase_service_role_key:
            self.provider = SupabaseStorageProvider(
                supabase_url=self.config.supabase_url,
                service_role_key=self.config.supabase_service_role_key,
                bucket=self.config.supabase_storage_bucket,
            )
        else:
            self.provider = LocalStorageProvider(base_dir=self.config.storage_base_dir)

    def upload_cleaned_transcript(
        self,
        meeting_id: str,
        transcript_text: str,
        overwrite: Optional[bool] = None,
    ) -> str:
        """
        Upload the final clean transcript for a meeting to Supabase Storage or Local Storage.

        Guarantees:
            1. meeting_id is validated against path traversal attacks.
            2. Destination path is deterministic: meetings/{meeting_id}/processed/cleaned_conversation.txt
            3. Raw transcript path (meetings/{meeting_id}/raw/conversation.txt) is NEVER modified.
            4. Text is stored with UTF-8 encoding.
            5. Upload is verified before returning.

        Returns:
            The canonical storage path: meetings/{meeting_id}/processed/cleaned_conversation.txt

        Raises:
            InvalidMeetingIdError: If meeting_id is invalid.
            TranscriptUploadError: If upload fails.
            TranscriptVerificationError: If verification fails after upload.
        """
        valid_id = validate_meeting_id(meeting_id)

        # Build paths and verify invariant
        cleaned_path = build_cleaned_transcript_path(valid_id)
        raw_path = build_raw_transcript_path(valid_id)

        # Invariant checks
        if cleaned_path == raw_path:
            raise TranscriptStorageError("CRITICAL INVARIANT VIOLATION: cleaned_path must never equal raw_path!")
        if not cleaned_path.startswith(f"meetings/{valid_id}/processed/"):
            raise TranscriptStorageError("CRITICAL INVARIANT VIOLATION: cleaned_path must reside in 'processed/' directory!")

        upsert = self.config.overwrite_processed_transcript if overwrite is None else overwrite

        logger.info("Uploading cleaned transcript for meeting_id=%s to %s (upsert=%s)", valid_id, cleaned_path, upsert)
        success = self.provider.upload_text(
            path=cleaned_path,
            content=transcript_text,
            content_type=self.config.content_type,
            upsert=upsert,
        )

        if not success:
            raise TranscriptUploadError(f"Storage provider returned failure for path: {cleaned_path}")

        # Verify upload immediately
        if not self.verify_cleaned_transcript(valid_id, cleaned_path):
            raise TranscriptVerificationError(
                f"Transcript uploaded but verification failed for path: {cleaned_path}"
            )

        logger.info("Successfully uploaded and verified cleaned transcript at %s", cleaned_path)
        return cleaned_path

    def verify_cleaned_transcript(self, meeting_id: str, path: Optional[str] = None) -> bool:
        """Verify that the cleaned transcript exists in storage."""
        target_path = path or build_cleaned_transcript_path(meeting_id)
        return self.provider.verify_object(target_path)

    def get_cleaned_transcript(self, meeting_id: str) -> str:
        """Retrieve the cleaned transcript text."""
        target_path = build_cleaned_transcript_path(meeting_id)
        return self.provider.get_text(target_path)

    def cleaned_transcript_exists(self, meeting_id: str) -> bool:
        """Check whether the cleaned transcript already exists in storage."""
        target_path = build_cleaned_transcript_path(meeting_id)
        return self.provider.exists(target_path)

    def get_raw_transcript(self, meeting_id: str, raw_path: Optional[str] = None) -> str:
        """Retrieve the raw transcript text from storage."""
        valid_id = validate_meeting_id(meeting_id)
        target_path = raw_path or build_raw_transcript_path(valid_id)
        return self.provider.get_text(target_path)

    def raw_transcript_exists(self, meeting_id: str, raw_path: Optional[str] = None) -> bool:
        """Check whether the raw transcript exists in storage."""
        valid_id = validate_meeting_id(meeting_id)
        target_path = raw_path or build_raw_transcript_path(valid_id)
        return self.provider.exists(target_path)


def get_storage_service(
    config: Optional[StorageConfig] = None,
    provider: Optional[BaseStorageProvider] = None,
) -> TranscriptStorageService:
    """Dependency injector for TranscriptStorageService."""
    return TranscriptStorageService(provider=provider, config=config)
