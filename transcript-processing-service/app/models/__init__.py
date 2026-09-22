"""Domain and API schema models."""
from app.models.transcript import (
    AnalyzeNoiseRequest,
    AnalyzeNoiseResponse,
    FilterRelevanceRequest,
    FilterRelevanceResponse,
    MergeFragmentsRequest,
    MergeFragmentsResponse,
    ParseTranscriptRequest,
    ParsedTranscript,
    RelevanceCategory,
    RemoveRepetitionsRequest,
    RemoveRepetitionsResponse,
    RepetitionType,
    SegmentClassification,
    STTCorrectionLLMOutput,
    STTErrorType,
    CorrectSTTRequest,
    CorrectSTTResponse,
    TranscriptSegment,
)

__all__ = [
    "SegmentClassification",
    "RepetitionType",
    "RelevanceCategory",
    "TranscriptSegment",
    "ParsedTranscript",
    "ParseTranscriptRequest",
    "AnalyzeNoiseRequest",
    "AnalyzeNoiseResponse",
    "RemoveRepetitionsRequest",
    "RemoveRepetitionsResponse",
    "FilterRelevanceRequest",
    "FilterRelevanceResponse",
    "MergeFragmentsRequest",
    "MergeFragmentsResponse",
    "STTErrorType",
    "STTCorrectionLLMOutput",
    "CorrectSTTRequest",
    "CorrectSTTResponse",
]



