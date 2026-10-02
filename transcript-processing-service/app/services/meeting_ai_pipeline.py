"""Meeting AI Pipeline Service.

Implements the first stage of the AI pipeline:
1. Determine transcript path from meeting ID using canonical conventions.
2. Download the transcript .txt file from Supabase Storage.
3. Decode/read as UTF-8 string.
4. Pass string to Main Meeting Agent.
5. Receive structured LLM response.
6. Log and store response.
"""

import logging
import time
from typing import Optional

from app.config.storage import (
    InvalidMeetingIdError,
    build_cleaned_transcript_path,
    validate_meeting_id,
)
from app.models.meeting_agent import (
    MeetingAIPipelineResponse,
    MeetingAnalysisResult,
)
from app.models.scrum_agent import ScrumResult
from app.services.llm_client import BaseLLMClient
from app.services.meeting_agent import (
    EmptyTranscriptException,
    MainMeetingAgent,
    MeetingAnalysisError,
    get_main_meeting_agent,
)
from app.services.scrum_agent import (
    ScrumIntelligenceAgent,
    ScrumAnalysisError,
    get_scrum_intelligence_agent,
)
from app.services.storage_service import (
    TranscriptStorageError,
    TranscriptStorageService,
    get_storage_service,
)

logger = logging.getLogger(__name__)


class MeetingAIPipelineError(Exception):
    """Base exception for meeting AI pipeline failures."""
    pass


class TranscriptRetrievalError(MeetingAIPipelineError):
    """Raised when transcript retrieval from Supabase Storage fails."""
    pass


async def run_meeting_ai_pipeline(
    meeting_id: str,
    custom_transcript_path: Optional[str] = None,
    storage_service: Optional[TranscriptStorageService] = None,
    agent: Optional[MainMeetingAgent] = None,
    llm_client: Optional[BaseLLMClient] = None,
    run_scrum_agent: bool = True,
    scrum_agent: Optional[ScrumIntelligenceAgent] = None,
) -> MeetingAIPipelineResponse:
    """
    Execute AI pipeline stages for a completed meeting:
    Stage 1: Supabase Storage .txt -> UTF-8 String -> Main Meeting Agent -> MeetingAnalysisResult
    Stage 2: MeetingAnalysisResult -> Scrum Intelligence Agent -> Structured ScrumResult (Tasks)

    Args:
        meeting_id: Unique meeting identifier.
        custom_transcript_path: Optional explicit storage path for the transcript.
        storage_service: Optional storage service instance.
        agent: Optional MainMeetingAgent instance (Stage 1).
        llm_client: Optional LLM client injected into agents.
        run_scrum_agent: Whether to execute Stage 2 Scrum Intelligence Agent.
        scrum_agent: Optional ScrumIntelligenceAgent instance (Stage 2).

    Returns:
        MeetingAIPipelineResponse with the structured analysis, Scrum tasks, and metadata.
    """
    start_ts = time.perf_counter()

    # 1. Validate meeting ID
    try:
        valid_id = validate_meeting_id(meeting_id)
    except InvalidMeetingIdError as exc:
        logger.error("Invalid meeting ID provided to AI pipeline: %s", exc)
        raise

    # 2. Determine canonical transcript path in Supabase Storage
    transcript_path = custom_transcript_path or build_cleaned_transcript_path(valid_id)

    # 3. Standardized Development Logging
    logger.info("Meeting AI pipeline started")
    logger.info("Meeting ID: %s", valid_id)
    logger.info("Transcript path: %s", transcript_path)

    # 4. Resolve dependencies
    storage = storage_service or get_storage_service()
    analysis_agent = agent or get_main_meeting_agent(llm_client=llm_client)

    # 5. Download .txt from Supabase Storage and decode as UTF-8 string
    try:
        raw_content = storage.provider.get_text(transcript_path)
    except FileNotFoundError as exc:
        logger.error("Transcript file not found in storage at path '%s' for meeting %s", transcript_path, valid_id)
        raise TranscriptRetrievalError(f"Transcript not found at storage path: {transcript_path}") from exc
    except TranscriptStorageError as exc:
        logger.error("Storage error downloading transcript from path '%s' for meeting %s: %s", transcript_path, valid_id, exc)
        raise TranscriptRetrievalError(f"Failed to download transcript from storage: {exc}") from exc
    except Exception as exc:
        logger.exception("Unexpected error downloading transcript for meeting %s: %s", valid_id, exc)
        raise TranscriptRetrievalError(f"Unexpected storage error: {exc}") from exc

    # Ensure UTF-8 string
    if isinstance(raw_content, bytes):
        try:
            transcript_str = raw_content.decode("utf-8")
        except UnicodeDecodeError as exc:
            logger.error("Failed to decode transcript as UTF-8 for meeting %s: %s", valid_id, exc)
            raise TranscriptRetrievalError(f"Transcript is not valid UTF-8: {exc}") from exc
    else:
        transcript_str = str(raw_content)

    if not transcript_str or not transcript_str.strip():
        logger.error("Downloaded transcript is empty for meeting %s at path %s", valid_id, transcript_path)
        raise EmptyTranscriptException(f"Downloaded transcript is empty for meeting {valid_id}.")

    logger.info("Transcript loaded successfully")
    logger.info("Transcript length: %d", len(transcript_str))

    # 6. Call Main Meeting Agent (Stage 1)
    logger.info("Calling Main Meeting Agent")
    try:
        analysis = analysis_agent.analyze_transcript(transcript_str)
    except Exception as exc:
        logger.error("Main Meeting Agent failed for meeting %s: %s", valid_id, exc)
        raise

    # 7. Call Scrum Intelligence Agent (Stage 2)
    scrum_result = None
    if run_scrum_agent:
        logger.info("Calling Scrum Intelligence Agent")
        s_agent = scrum_agent or get_scrum_intelligence_agent(llm_client=llm_client)
        try:
            scrum_result = s_agent.analyze(analysis)
            logger.info("Scrum Intelligence Agent completed (%d tasks generated)", len(scrum_result.tasks))
        except Exception as exc:
            logger.error("Scrum Intelligence Agent failed for meeting %s: %s", valid_id, exc)
            raise

    duration_ms = int((time.perf_counter() - start_ts) * 1000)

    # 8. Standardized Completion Logging
    logger.info("LLM response received")
    logger.info(
        "AI pipeline completed (duration: %dms, topics: %d, decisions: %d, actions: %d, blockers: %d, tasks: %d)",
        duration_ms,
        len(analysis.topics),
        len(analysis.decisions),
        len(analysis.action_items),
        len(analysis.blockers),
        len(scrum_result.tasks) if scrum_result else 0,
    )

    # Log summary without leaking sensitive credentials
    logger.info("Meeting %s Summary: %s", valid_id, analysis.summary)

    return MeetingAIPipelineResponse(
        meeting_id=valid_id,
        transcript_path=transcript_path,
        transcript_length=len(transcript_str),
        analysis=analysis,
        scrum_analysis=scrum_result,
        status="COMPLETED",
        error=None,
        duration_ms=duration_ms,
    )
