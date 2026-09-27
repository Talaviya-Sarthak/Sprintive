from pydantic import BaseModel, Field


class SpeechSegment(BaseModel):
    """A single recognized speech segment for one participant."""

    start: float = Field(ge=0, description="Start time in seconds")
    end: float = Field(ge=0, description="End time in seconds")
    text: str = Field(min_length=1, description="Recognized text")


class SpeechRecognitionRequest(BaseModel):
    """Metadata accompanying an uploaded audio file."""

    meeting_id: str
    participant_id: str
    participant_name: str


class SpeechRecognitionResponse(BaseModel):
    """Recognized speech segments. No assembly, no analysis."""

    segments: list[SpeechSegment]


class MeetingAnalysisRequest(BaseModel):
    """Cleaned transcript and meeting metadata sent from backend."""

    meeting_id: str = Field(..., description="Meeting UUID")
    transcript: str = Field(..., min_length=1, description="Cleaned transcript text")
    language: str = Field(default="en", description="Transcript primary language")
    transcript_version: str = Field(default="1.0", description="Transcript schema version")
    metadata: dict = Field(default_factory=dict, description="Additional meeting metadata")


class MeetingAnalysisResponse(BaseModel):
    """Deterministic acknowledgement of receipt for AI processing."""

    accepted: bool = Field(default=True, description="Whether transcript was accepted")
    meeting_id: str = Field(..., description="Meeting UUID")
    status: str = Field(default="RECEIVED", description="Processing status acknowledgment")
    received_at: str = Field(..., description="ISO 8601 timestamp of reception")
    idempotent: bool = Field(default=False, description="Whether request was an idempotent duplicate")

