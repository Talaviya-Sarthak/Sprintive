"""Main Meeting Analysis Agent implementation.

Encapsulates the first stage of the AI pipeline:
Takes a clean meeting transcript string, crafts the prompt, invokes the LLM client,
and parses/validates the structured response adhering to MeetingAnalysisResult.

Strictly decoupled from:
- Supabase Storage code
- Meeting completion and lifecycle orchestration
- Downstream Scrum, Ticket, and Action Item agents
"""

import logging
from typing import Optional

from app.models.meeting_agent import MeetingAnalysisResult
from app.prompts.meeting_agent import (
    MAIN_MEETING_AGENT_SYSTEM_PROMPT,
    build_main_agent_user_prompt,
)
from app.services.llm_client import (
    BaseLLMClient,
    LLMClientError,
    LLMResponseValidationError,
    LLMTimeoutError,
    get_llm_client,
)

logger = logging.getLogger(__name__)


class MeetingAgentException(Exception):
    """Base exception for Main Meeting Agent operations."""
    pass


class EmptyTranscriptException(MeetingAgentException):
    """Raised when the provided transcript is empty or whitespace only."""
    pass


class MeetingAnalysisError(MeetingAgentException):
    """Raised when LLM invocation or parsing fails."""
    pass


class MainMeetingAgent:
    """
    Main Meeting Analysis Agent responsible for taking a transcript string,
    preparing the LLM request, executing the first LLM call, and returning
    the structured analysis response.
    """

    def __init__(self, llm_client: Optional[BaseLLMClient] = None):
        self._llm_client = llm_client

    @property
    def llm_client(self) -> BaseLLMClient:
        return self._llm_client or get_llm_client()

    def analyze_transcript(self, transcript: str) -> MeetingAnalysisResult:
        """
        Analyze a completed meeting transcript string and return structured analysis.

        Args:
            transcript: UTF-8 string containing the full conversation dialogue.

        Returns:
            MeetingAnalysisResult with summary, topics, decisions, action_items, blockers.

        Raises:
            EmptyTranscriptException: If transcript is blank or whitespace.
            MeetingAnalysisError: If LLM call fails, times out, or produces invalid output.
        """
        if not transcript or not transcript.strip():
            logger.error("MainMeetingAgent rejected empty transcript content.")
            raise EmptyTranscriptException("Transcript content cannot be empty or whitespace only.")

        system_prompt = MAIN_MEETING_AGENT_SYSTEM_PROMPT
        user_prompt = build_main_agent_user_prompt(transcript)

        logger.info("MainMeetingAgent dispatching first LLM call (transcript length: %d chars)", len(transcript))

        try:
            analysis = self.llm_client.generate_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=MeetingAnalysisResult,
            )
            logger.info("MainMeetingAgent successfully received and validated LLM analysis.")
            return analysis

        except LLMTimeoutError as err:
            logger.error("MainMeetingAgent LLM request timed out: %s", err)
            raise MeetingAnalysisError(f"LLM request timed out during meeting analysis: {err}") from err

        except LLMResponseValidationError as err:
            logger.error("MainMeetingAgent LLM output failed schema validation: %s", err)
            raise MeetingAnalysisError(f"LLM response failed schema validation: {err}") from err

        except LLMClientError as err:
            logger.error("MainMeetingAgent LLM client error: %s", err)
            raise MeetingAnalysisError(f"LLM client error during meeting analysis: {err}") from err

        except Exception as err:
            logger.exception("MainMeetingAgent unexpected error during analysis: %s", err)
            raise MeetingAnalysisError(f"Unexpected error in MainMeetingAgent: {err}") from err


_default_agent: Optional[MainMeetingAgent] = None


def get_main_meeting_agent(llm_client: Optional[BaseLLMClient] = None) -> MainMeetingAgent:
    """Dependency injector for MainMeetingAgent."""
    global _default_agent
    if llm_client is not None:
        return MainMeetingAgent(llm_client=llm_client)
    if _default_agent is None:
        _default_agent = MainMeetingAgent()
    return _default_agent
