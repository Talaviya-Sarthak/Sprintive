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
