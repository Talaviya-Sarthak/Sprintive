import os
import httpx
from pathlib import Path
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

STORAGE_DIR = Path(__file__).resolve().parents[3] / "storage" / "transcripts"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


class TranscriptService:
    """
    Builds and saves the final transcript.txt file.
    Notifies the backend with file metadata after saving.
    """

    def build_content(self, meeting_id: str, lines: list[tuple[str, str]]) -> str:
        header = f"Meeting ID: {meeting_id}\n\n"
        body_parts: list[str] = []
        current_speaker: str | None = None
        current_lines: list[str] = []

        for speaker, text in lines:
            if speaker != current_speaker:
                if current_speaker is not None:
                    body_parts.append(f"{current_speaker}:\n" + "\n".join(current_lines))
                current_speaker = speaker
                current_lines = [text]
            else:
                current_lines.append(text)

        if current_speaker and current_lines:
            body_parts.append(f"{current_speaker}:\n" + "\n".join(current_lines))

        return header + "\n\n".join(body_parts)

    def save(self, meeting_id: str, content: str) -> tuple[Path, int]:
        filename = f"meeting-{meeting_id}.txt"
        path = STORAGE_DIR / filename
        path.write_text(content, encoding="utf-8")
        size = path.stat().st_size
        logger.info(f"Transcript saved: {path} ({size} bytes)")
        return path, size

    async def notify_backend(
        self,
        meeting_id: str,
        transcript_path: str,
        transcript_name: str,
        transcript_size: int,
        duration: int,
    ) -> None:
        url = f"{settings.backend_url}/api/meetings/{meeting_id}/transcript-saved"
        payload = {
            "transcript_path": transcript_path,
            "transcript_name": transcript_name,
            "transcript_size": transcript_size,
            "duration": duration,
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                logger.info(f"Backend notified for meeting {meeting_id}")
        except Exception as exc:
            logger.warning(f"Backend notification failed for {meeting_id}: {exc}")


transcript_service = TranscriptService()
