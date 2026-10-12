"""Optimization and Token-Reduction Verification Test Suite.

Verifies:
1. Stage 7 (Grammar): Deterministic normalization runs without LLM calls on clean dialogue.
2. Stage 9 (Context): Deterministic validation verifies conversational dialogue without LLM calls.
3. Stage 10 (Speaker): Deterministic turn-taking verification validates natural speaker transitions without LLM calls.
4. Stage 6 (STT): Clean high-confidence segments skip LLM calls.
5. Consolidated Meeting AI: Combines MeetingAnalysisResult and ScrumResult into a single structured LLM call.
6. Before vs. After LLM Call Count Measurement on representative 16-segment meeting transcript.
7. Token tracking and rate limit (429) metric accuracy via TokenUsageTracker.
8. Multilingual and Hinglish preservation during deterministic operations.
"""

import pytest
from unittest.mock import MagicMock

from app.models.meeting_agent import MeetingAnalysisResult
from app.models.scrum_agent import ScrumResult, ScrumTask
from app.models.transcript import (
    ContextValidationStatus,
    GrammarChangeType,
    SegmentClassification,
    SpeakerValidationStatus,
    TranscriptSegment,
)
from app.services.contextual_validator import validate_context
from app.services.grammar_normalizer import (
    deterministic_normalize_segment,
    normalize_grammar_and_punctuation,
)
from app.services.llm_client import (
    OpenAICompatibleLLMClient,
    TokenUsageTracker,
    token_usage_tracker,
)
from app.services.meeting_ai_pipeline import (
    ConsolidatedMeetingAIOutput,
    run_meeting_ai_pipeline,
)
from app.services.speaker_validator import validate_speakers
from app.services.storage_service import LocalStorageProvider, TranscriptStorageService
from app.services.stt_corrector import correct_stt_segments


class MockCountingOpenAIClient(OpenAICompatibleLLMClient):
    """Subclass of OpenAICompatibleLLMClient that records structured call counts without network."""

    def __init__(self):
        super().__init__(api_key="mock-groq-key", model="llama-3.3-70b-versatile")
        self.call_count: int = 0
        self.calls = []

    def generate_structured(self, system_prompt, user_prompt, response_model):
        self.call_count += 1
        self.calls.append((system_prompt, user_prompt, response_model))
        token_usage_tracker.record_usage(self.model, prompt=150, completion=80)

        # Handle consolidated meeting AI output
        if response_model == ConsolidatedMeetingAIOutput:
            return ConsolidatedMeetingAIOutput(
                summary="Sprintive team discussed database connectivity and API deployments.",
                topics=["Database Connection", "API Deployment", "Authentication"],
                decisions=["Deploy database migration before Friday"],
                action_items=["Harshit to patch PostgreSQL connection pool"],
                blockers=["Staging database credential access"],
                tasks=[
                    ScrumTask(
                        title="Patch PostgreSQL connection pool",
                        description="Resolve connection timeout on port 5432",
                        assignee="Harshit Pambhar",
                        priority="high",
                        due_date="by Friday",
                        type="task",
                        acceptance_criteria=["Connection pool stable under load"],
                        source_action_item="Harshit to patch PostgreSQL connection pool",
                    )
                ],
            )

        # Fallback default
        return response_model.model_validate({
            "status": "VALID",
            "confidence": 0.95,
            "flags": [],
            "reason": "Default mock response",
        })


def create_representative_16_segment_transcript():
    """Create a realistic 16-segment Scrum standup transcript with mixed speakers and Hinglish."""
    return [
        TranscriptSegment(sequence=1, speaker="Sarthak Talaviya", text="Good morning everyone lets get started with todays standup", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.95),
        TranscriptSegment(sequence=2, speaker="Harshit Pambhar", text="Yes, I completed the database connection migration yesterday.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.94),
        TranscriptSegment(sequence=3, speaker="Harshit Pambhar", text="However, we have one issue with connection timeouts on port 5432.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.92),
        TranscriptSegment(sequence=4, speaker="Sarthak Talaviya", text="Did you check the connection pool settings in the backend?", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.96),
        TranscriptSegment(sequence=5, speaker="Harshit Pambhar", text="हाँ backend ready है, but the pool size was maxed out.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.91),
        TranscriptSegment(sequence=6, speaker="Sarthak Talaviya", text="Okay, increase the maximum pool size to 20.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.95),
        TranscriptSegment(sequence=7, speaker="Harshit Pambhar", text="I will patch that by this afternoon.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.93),
        TranscriptSegment(sequence=8, speaker="Sarthak Talaviya", text="Any other blockers from anyone else?", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.97),
        TranscriptSegment(sequence=9, speaker="Harshit Pambhar", text="No other blockers from my side.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.95),
        TranscriptSegment(sequence=10, speaker="Sarthak Talaviya", text="Great, let us review the deployment pipeline next.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.94),
        TranscriptSegment(sequence=11, speaker="Sarthak Talaviya", text="The frontend Docker image build is passing in CI.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.96),
        TranscriptSegment(sequence=12, speaker="Harshit Pambhar", text="And the backend staging health check is green.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.92),
        TranscriptSegment(sequence=13, speaker="Sarthak Talaviya", text="We will schedule the production release for Friday at 3 PM.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.98),
        TranscriptSegment(sequence=14, speaker="Harshit Pambhar", text="Understood. I will prepare the release notes.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.95),
        TranscriptSegment(sequence=15, speaker="Sarthak Talaviya", text="Sounds good. Let us wrap up today's meeting.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.96),
        TranscriptSegment(sequence=16, speaker="Harshit Pambhar", text="Thanks everyone.", include_in_meeting=True, classification=SegmentClassification.CLEAN, confidence=0.97),
    ]


class TestPipelineOptimization:
    """Verifies reduction in LLM calls, deterministic processing, and consolidated AI extraction."""

    def test_01_deterministic_grammar_normalization_rules(self):
        """Verify regex & deterministic punctuation/contraction normalization without LLM."""
        text = "good morning everyone lets get started with todays meeting"
        cleaned, modified, changes, reason = deterministic_normalize_segment(text)

        assert modified is True
        assert cleaned.startswith("Good")
        assert "let's" in cleaned
        assert "today's" in cleaned
        assert cleaned.endswith(".")
        assert any(c.type == GrammarChangeType.CAPITALIZATION for c in changes)
        assert any(c.type == GrammarChangeType.PUNCTUATION for c in changes)
        assert any(c.type == GrammarChangeType.GRAMMAR for c in changes)

    def test_02_grammar_normalizer_makes_zero_llm_calls_in_production(self):
        """With OpenAICompatibleLLMClient, grammar stage should make 0 LLM calls for 16 segments."""
        segments = create_representative_16_segment_transcript()
        client = MockCountingOpenAIClient()

        results = normalize_grammar_and_punctuation(segments, llm_client=client)

        assert len(results) == 16
        # Zero LLM calls made!
        assert client.call_count == 0
        # Text 1 was normalized deterministically
        assert results[0].grammar_corrected_text.startswith("Good morning")
        assert "let's" in results[0].grammar_corrected_text

    def test_03_contextual_validator_makes_zero_llm_calls_in_production(self):
        """With OpenAICompatibleLLMClient, contextual stage should make 0 LLM calls on consistent transcript."""
        segments = create_representative_16_segment_transcript()
        client = MockCountingOpenAIClient()

        results = validate_context(segments, llm_client=client)

        assert len(results) == 16
        assert client.call_count == 0
        for seg in results:
            assert seg.context_status == ContextValidationStatus.CONSISTENT
            assert seg.context_flags == []

    def test_04_speaker_validator_makes_zero_llm_calls_in_production(self):
        """With OpenAICompatibleLLMClient, speaker validation makes 0 LLM calls on verified turn-taking."""
        segments = create_representative_16_segment_transcript()
        client = MockCountingOpenAIClient()

        results = validate_speakers(segments, llm_client=client)

        assert len(results) == 16
        assert client.call_count == 0
        for seg in results:
            assert seg.speaker_validation_status == SpeakerValidationStatus.VALID

    def test_05_stt_corrector_skips_clean_confident_segments(self):
        """Clean segments with confidence >= 0.80 skip LLM calls in production."""
        segments = create_representative_16_segment_transcript()
        client = MockCountingOpenAIClient()

        results = correct_stt_segments(segments, llm_client=client)

        assert len(results) == 16
        assert client.call_count == 0
        for seg in results:
            assert seg.stt_modified is False

    def test_06_consolidated_downstream_ai_makes_single_llm_call(self, tmp_path):
        """Downstream AI pipeline consolidates Stage 1 (Meeting) and Stage 2 (Scrum) into 1 call."""
        import asyncio

        storage_provider = LocalStorageProvider(base_dir=str(tmp_path))
        storage_service = TranscriptStorageService(provider=storage_provider)
        meeting_id = "test-opt-meeting-001"

        cleaned_path = f"meetings/{meeting_id}/processed/cleaned_conversation.txt"
        storage_provider.upload_text(
            cleaned_path,
            "Sarthak Talaviya: Good morning team.\nHarshit Pambhar: Database migration is ready.\nSarthak: Release on Friday.",
        )

        client = MockCountingOpenAIClient()

        async def run():
            return await run_meeting_ai_pipeline(
                meeting_id=meeting_id,
                storage_service=storage_service,
                llm_client=client,
                run_scrum_agent=True,
            )

        response = asyncio.run(run())

        # Assert exactly ONE LLM call made for both Meeting analysis and Scrum tasks
        assert client.call_count == 1
        assert response.analysis.summary.startswith("Sprintive team")
        assert len(response.analysis.topics) >= 1
        assert len(response.scrum_analysis.tasks) == 1
        assert response.scrum_analysis.tasks[0].title == "Patch PostgreSQL connection pool"

    def test_07_token_usage_tracker_accuracy(self):
        """Verify TokenUsageTracker records tokens, requests, and rate-limit statistics accurately."""
        tracker = TokenUsageTracker()
        tracker.record_usage("llama-3.3-70b-versatile", prompt=300, completion=150)
        tracker.record_429()
        tracker.record_retry()

        metrics = tracker.get_metrics()
        assert metrics["total_requests"] == 1
        assert metrics["prompt_tokens"] == 300
        assert metrics["completion_tokens"] == 150
        assert metrics["total_tokens"] == 450
        assert metrics["rate_limit_429_count"] == 1
        assert metrics["retry_count"] == 1
        assert "llama-3.3-70b-versatile" in metrics["model_breakdown"]

    def test_08_hinglish_and_multilingual_preservation(self):
        """Verify Hindi and Hinglish utterances are not translated or corrupted by deterministic cleaning."""
        hinglish_text = "हाँ backend ready है, but the pool size was maxed out."
        cleaned, modified, changes, _ = deterministic_normalize_segment(hinglish_text)

        # Devanagari characters preserved verbatim
        assert "हाँ backend ready है" in cleaned
        # Terminal period ensured
        assert cleaned.endswith(".")
