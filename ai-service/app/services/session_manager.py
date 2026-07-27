import time
from dataclasses import dataclass, field
from collections import defaultdict


@dataclass
class SpeakerBuffer:
    speaker: str
    audio_buffer: bytes = b""
    last_activity: float = field(default_factory=time.time)


class SessionManager:
    """
    Manages per-meeting STT sessions.
    Each meeting has a dict of speaker_name → SpeakerBuffer.
    """

    def __init__(self) -> None:
        # meeting_id → { speaker_name → SpeakerBuffer }
        self._sessions: dict[str, dict[str, SpeakerBuffer]] = defaultdict(dict)
        # meeting_id → list of (speaker, text) transcript lines
        self._transcripts: dict[str, list[tuple[str, str]]] = defaultdict(list)
        # meeting_id → started_at timestamp
        self._started_at: dict[str, float] = {}

    def start_session(self, meeting_id: str) -> None:
        if meeting_id not in self._started_at:
            self._started_at[meeting_id] = time.time()

    def get_or_create_buffer(self, meeting_id: str, speaker: str) -> SpeakerBuffer:
        if speaker not in self._sessions[meeting_id]:
            self._sessions[meeting_id][speaker] = SpeakerBuffer(speaker=speaker)
        return self._sessions[meeting_id][speaker]

    def append_audio(self, meeting_id: str, speaker: str, chunk: bytes) -> None:
        buf = self.get_or_create_buffer(meeting_id, speaker)
        buf.audio_buffer += chunk
        buf.last_activity = time.time()

    def flush_audio(self, meeting_id: str, speaker: str) -> bytes:
        buf = self.get_or_create_buffer(meeting_id, speaker)
        data = buf.audio_buffer
        buf.audio_buffer = b""
        return data

    def add_transcript_line(self, meeting_id: str, speaker: str, text: str) -> None:
        if text.strip():
            self._transcripts[meeting_id].append((speaker, text.strip()))

    def get_transcript_lines(self, meeting_id: str) -> list[tuple[str, str]]:
        return list(self._transcripts.get(meeting_id, []))

    def get_duration(self, meeting_id: str) -> int:
        started = self._started_at.get(meeting_id)
        if not started:
            return 0
        return int(time.time() - started)

    def end_session(self, meeting_id: str) -> None:
        self._sessions.pop(meeting_id, None)
        self._started_at.pop(meeting_id, None)
        # Keep transcript lines until explicitly cleared
        self._transcripts.pop(meeting_id, None)


session_manager = SessionManager()
