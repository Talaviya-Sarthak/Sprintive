from pydantic import BaseModel
from typing import Optional


class TranscriptChunk(BaseModel):
    meeting_id: str
    speaker: str
    text: str
    timestamp: float
    is_final: bool = False


class SessionInfo(BaseModel):
    meeting_id: str
    speaker_name: str
    sample_rate: int = 16000


class TranscriptLine(BaseModel):
    speaker: str
    text: str


class FinalTranscript(BaseModel):
    meeting_id: str
    lines: list[TranscriptLine]
    duration_seconds: Optional[int] = None
