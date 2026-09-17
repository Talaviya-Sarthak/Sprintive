import logging
from typing import List, Optional
from app.models.transcript import (
    AnalyzeNoiseResponse,
    ParsedTranscript,
    RemoveRepetitionsResponse,
    TranscriptSegment,
)
from app.services.noise_detector import detect_noise_and_fillers
from app.services.repetition_remover import remove_repetitions
from app.services.transcript_parser import parse_transcript
from app.services.transcript_storage import BaseTranscriptStorage, get_transcript_storage


logger = logging.getLogger(__name__)


class TranscriptService:
    """
    Coordinates transcript retrieval from storage, delegates to the pure parser,
    and runs downstream modular processing pipelines (such as noise & filler detection).
    """

    def __init__(self, storage: Optional[BaseTranscriptStorage] = None):
        self.storage = storage or get_transcript_storage()

    def process_and_parse(
        self,
        meeting_id: str,
        transcript_path: Optional[str] = None,
        raw_text: Optional[str] = None,
    ) -> ParsedTranscript:
        """
        Retrieve raw transcript and parse into structured segments.

        Args:
            meeting_id: The ID of the meeting.
            transcript_path: Optional path to storage file.
            raw_text: Optional raw text directly supplied.

        Returns:
            ParsedTranscript domain model.

        Raises:
            ValueError: If neither transcript_path nor raw_text is provided.
            FileNotFoundError: If transcript_path does not exist in storage.
        """
        if raw_text is not None:
            content = raw_text
        elif transcript_path:
            logger.info("Fetching transcript from storage for meeting %s: %s", meeting_id, transcript_path)
            content = self.storage.get_transcript(transcript_path)
        else:
            raise ValueError("Either 'transcript_path' or 'raw_text' must be provided.")

        return parse_transcript(text=content, meeting_id=meeting_id)

    def analyze_noise(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
    ) -> AnalyzeNoiseResponse:
        """
        Run Part 2: Noise & Filler Detection on structured transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects.

        Returns:
            AnalyzeNoiseResponse containing classified segments with confidence scores.
        """
        logger.info(
            "Analyzing noise & fillers for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        classified_segments = detect_noise_and_fillers(segments)
        return AnalyzeNoiseResponse(
            meeting_id=meeting_id,
            segments=classified_segments,
        )

    def remove_repetitions(
        self,
        meeting_id: str,
        segments: List[TranscriptSegment],
    ) -> RemoveRepetitionsResponse:
        """
        Run Part 3: Repetition Removal on structured/classified transcript segments.

        Args:
            meeting_id: The ID of the meeting.
            segments: List of TranscriptSegment objects from Part 2.

        Returns:
            RemoveRepetitionsResponse containing processed segments with repetition metadata.
        """
        logger.info(
            "Removing repetitions for meeting_id=%s (%d segments)",
            meeting_id,
            len(segments),
        )
        processed_segments = remove_repetitions(segments)
        return RemoveRepetitionsResponse(
            meeting_id=meeting_id,
            segments=processed_segments,
        )

