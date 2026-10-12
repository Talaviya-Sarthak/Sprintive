"""Scrum Intelligence Agent implementation (Stage 2).

Transforms structured meeting analysis produced by the Main Meeting Agent (Stage 1)
into structured Scrum/Kanban work items.

Strict Boundaries:
- Receives solely MeetingAnalysisResult (never the raw transcript).
- Grounded strictly in the provided meeting analysis.
- Null values for missing assignees, deadlines, or priorities.
- Preserves source action item text for complete traceability.
- Minimal LLM calls: executes as a single coherent operation.
- No external ticket creation (Jira, GitHub, Kanban sync).
"""

import logging
from typing import Optional

from app.models.meeting_agent import MeetingAnalysisResult
from app.models.scrum_agent import ScrumResult
from app.prompts.scrum_agent import (
    SCRUM_AGENT_SYSTEM_PROMPT,
    build_scrum_agent_user_prompt,
)
from app.services.llm_client import (
    BaseLLMClient,
    LLMClientError,
    LLMResponseValidationError,
    LLMTimeoutError,
    get_llm_client,
)

logger = logging.getLogger(__name__)


class ScrumAgentException(Exception):
    """Base exception for Scrum Agent operations."""
    pass


class ScrumAnalysisError(ScrumAgentException):
    """Raised when LLM invocation or validation fails during Scrum analysis."""
    pass


class ScrumIntelligenceAgent:
    """
    Scrum Intelligence Agent responsible for converting structured meeting analysis
    into actionable, well-formed Scrum/Kanban tasks with source traceability.
    """

    def __init__(self, llm_client: Optional[BaseLLMClient] = None):
        self._llm_client = llm_client

    @property
    def llm_client(self) -> BaseLLMClient:
        return self._llm_client or get_llm_client()

    def analyze(self, meeting_analysis: Optional[MeetingAnalysisResult]) -> ScrumResult:
        """
        Analyze a MeetingAnalysisResult from Stage 1 and generate structured Scrum work items.

        Args:
            meeting_analysis: Structured analysis output from the Main Meeting Agent.

        Returns:
            ScrumResult containing the list of structured ScrumTask objects.

        Raises:
            ScrumAnalysisError: If the LLM call times out, fails schema validation, or encounters an error.
        """
        if meeting_analysis is None:
            logger.info("ScrumIntelligenceAgent received None; returning empty ScrumResult.")
            return ScrumResult(tasks=[])

        # If there are no action items and no blockers, return an empty task list cleanly
        if not meeting_analysis.action_items and not meeting_analysis.blockers:
            logger.info("ScrumIntelligenceAgent: No action items or blockers present; returning empty tasks.")
            return ScrumResult(tasks=[])

        system_prompt = SCRUM_AGENT_SYSTEM_PROMPT
        user_prompt = build_scrum_agent_user_prompt(meeting_analysis)

        logger.info(
            "ScrumIntelligenceAgent dispatching LLM call (actions: %d, blockers: %d)",
            len(meeting_analysis.action_items),
            len(meeting_analysis.blockers),
        )

        try:
            result = self.llm_client.generate_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=ScrumResult,
            )
            logger.info("ScrumIntelligenceAgent successfully generated %d tasks.", len(result.tasks))
            return result

        except LLMTimeoutError as err:
            logger.error("ScrumIntelligenceAgent LLM request timed out: %s", err)
            raise ScrumAnalysisError(f"LLM request timed out during Scrum analysis: {err}") from err

        except LLMResponseValidationError as err:
            logger.error("ScrumIntelligenceAgent LLM output failed schema validation: %s", err)
            raise ScrumAnalysisError(f"Scrum analysis output failed schema validation: {err}") from err

        except LLMClientError as err:
            logger.error("ScrumIntelligenceAgent LLM client error: %s", err)
            raise ScrumAnalysisError(f"LLM client error during Scrum analysis: {err}") from err

        except Exception as err:
            logger.exception("ScrumIntelligenceAgent unexpected error: %s", err)
            raise ScrumAnalysisError(f"Unexpected error in ScrumIntelligenceAgent: {err}") from err


_default_scrum_agent: Optional[ScrumIntelligenceAgent] = None


def get_scrum_intelligence_agent(llm_client: Optional[BaseLLMClient] = None) -> ScrumIntelligenceAgent:
    """Dependency injector for ScrumIntelligenceAgent."""
    global _default_scrum_agent
    if llm_client is not None:
        return ScrumIntelligenceAgent(llm_client=llm_client)
    if _default_scrum_agent is None:
        _default_scrum_agent = ScrumIntelligenceAgent()
    return _default_scrum_agent
