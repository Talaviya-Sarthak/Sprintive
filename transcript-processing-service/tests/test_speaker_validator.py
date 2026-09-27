"""Unit and scenario tests for Part 10 — Speaker Attribution Validation."""

import pytest
from app.models.speaker_validation import (
    SpeakerFlagType,
    SpeakerValidationStatus,
)
from app.models.transcript import TranscriptSegment
from app.services.llm_client import BaseLLMClient, MockLLMClient
from app.services.speaker_rules import (
    detect_direct_response,
    detect_possible_fragment_continuation,
    select_input_text,
)
from app.services.speaker_validator import validate_speakers


class TestSpeakerValidator:
    """Comprehensive test suite for speaker attribution validation."""

    def test_01_example_1_valid_response(self):
        """Example 1: Direct question and response is VALID."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="Does anyone have any blockers from yesterday?",
                terminology_normalized_text="Does anyone have any blockers from yesterday?",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="Yes. I have one issue with the database connection.",
                terminology_normalized_text="Yes. I have one issue with the database connection.",
            ),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "VALID",
                "confidence": 0.96,
                "flags": [],
                "suggested_speaker": None,
                "reason": "Direct question opening the meeting.",
            }
        )
        results = validate_speakers(segments, llm_client=mock_llm)
        assert results[0].speaker_validation_status == SpeakerValidationStatus.VALID
        assert results[1].speaker_validation_status == SpeakerValidationStatus.VALID
        assert results[1].speaker_flags == []
        assert results[1].speaker == "Harshit Pambhar"
        assert results[1].suggested_speaker is None

    def test_02_example_2_possible_continuation_mismatch(self):
        """Example 2: Unfinished sentence completed by another speaker is POSSIBLE_MISATTRIBUTION."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="We need to investigate the database",
                terminology_normalized_text="We need to investigate the database",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="connection issue first.",
                terminology_normalized_text="connection issue first.",
            ),
        ]
        results = validate_speakers(segments)
        assert results[1].speaker_validation_status == SpeakerValidationStatus.POSSIBLE_MISATTRIBUTION
        assert SpeakerFlagType.POSSIBLE_FRAGMENT_MISATTRIBUTION in results[1].speaker_flags
        assert results[1].suggested_speaker == "Sarthak Talaviya"
        # Invariant: original speaker is strictly preserved
        assert results[1].speaker == "Harshit Pambhar"
        assert results[1].speaker_correction is None
        assert results[1].terminology_normalized_text == "connection issue first."

    def test_03_example_3_normal_topic_change(self):
        """Example 3: Normal topic change between speakers is VALID."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="We should review the API issue.",
                terminology_normalized_text="We should review the API issue.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="I also finished the frontend dashboard yesterday.",
                terminology_normalized_text="I also finished the frontend dashboard yesterday.",
            ),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "VALID",
                "confidence": 0.94,
                "flags": [],
                "suggested_speaker": None,
                "reason": "Natural transition where a team member shares progress on another topic.",
            }
        )
        results = validate_speakers(segments, llm_client=mock_llm)
        assert results[1].speaker_validation_status == SpeakerValidationStatus.VALID
        assert results[1].speaker_flags == []
        assert results[1].speaker == "Harshit Pambhar"

    def test_04_example_4_explicit_response(self):
        """Example 4: Speaker addressed explicitly by name in question -> VALID."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="Harshit, can you explain the database issue?",
                terminology_normalized_text="Harshit, can you explain the database issue?",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="Yes. The database connection is failing during API testing.",
                terminology_normalized_text="Yes. The database connection is failing during API testing.",
            ),
        ]
        results = validate_speakers(segments)
        assert results[1].speaker_validation_status == SpeakerValidationStatus.VALID
        assert results[1].speaker_flags == []
        assert results[1].speaker == "Harshit Pambhar"
        assert results[1].speaker_confidence >= 0.95

    def test_05_third_person_reference_not_misattribution(self):
        """Mentioning someone's name in third person is not proof the next sentence belongs to them."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="Harshit is working on the database.",
                terminology_normalized_text="Harshit is working on the database.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="And I am focusing on the deployment pipeline.",
                terminology_normalized_text="And I am focusing on the deployment pipeline.",
            ),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "VALID",
                "confidence": 0.96,
                "flags": [],
                "suggested_speaker": None,
                "reason": "Same speaker continuing to describe team task allocations.",
            }
        )
        results = validate_speakers(segments, llm_client=mock_llm)
        assert results[1].speaker_validation_status == SpeakerValidationStatus.VALID
        assert results[1].speaker == "Sarthak Talaviya"

    def test_06_insufficient_context(self):
        """Sparse context where attribution cannot be determined -> INSUFFICIENT_CONTEXT."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Unknown Speaker",
                text="Okay.",
                terminology_normalized_text="Okay.",
            ),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "INSUFFICIENT_CONTEXT",
                "confidence": 0.50,
                "flags": ["INSUFFICIENT_CONTEXT"],
                "suggested_speaker": None,
                "reason": "Isolated single-word utterance lacks conversational context.",
            }
        )
        results = validate_speakers(segments, llm_client=mock_llm)
        assert results[0].speaker_validation_status == SpeakerValidationStatus.INSUFFICIENT_CONTEXT
        assert SpeakerFlagType.INSUFFICIENT_CONTEXT in results[0].speaker_flags

    def test_07_ambiguous_attribution(self):
        """Competing interpretations -> AMBIGUOUS."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Alice",
                text="Who took that ticket?",
                terminology_normalized_text="Who took that ticket?",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Bob",
                text="Yeah maybe.",
                terminology_normalized_text="Yeah maybe.",
            ),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "AMBIGUOUS",
                "confidence": 0.60,
                "flags": ["AMBIGUOUS_ATTRIBUTION"],
                "suggested_speaker": None,
                "reason": "Response does not directly answer the question, attribution is unclear.",
            }
        )
        results = validate_speakers(segments, llm_client=mock_llm)
        assert results[1].speaker_validation_status == SpeakerValidationStatus.AMBIGUOUS
        assert SpeakerFlagType.AMBIGUOUS_ATTRIBUTION in results[1].speaker_flags

    def test_08_multiple_speakers_conversation(self):
        """Conversation across 3+ participants."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Alice", text="Standup started.", terminology_normalized_text="Standup started."),
            TranscriptSegment(sequence=2, speaker="Bob", text="I completed my task.", terminology_normalized_text="I completed my task."),
            TranscriptSegment(sequence=3, speaker="Charlie", text="I am working on tests.", terminology_normalized_text="I am working on tests."),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "VALID",
                "confidence": 0.95,
                "flags": [],
                "suggested_speaker": None,
                "reason": "Normal round-robin turn-taking during daily standup.",
            }
        )
        results = validate_speakers(segments, llm_client=mock_llm)
        for r in results:
            assert r.speaker_validation_status == SpeakerValidationStatus.VALID

    def test_09_hindi_conversation_validation(self):
        """Hindi QA conversation validated without translation."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="हर्षित, क्या डेटाबेस का काम हो गया?",
                terminology_normalized_text="हर्षित, क्या डेटाबेस का काम हो गया?",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="हाँ, मैंने कनेक्शन ठीक कर दिया है.",
                terminology_normalized_text="हाँ, मैंने कनेक्शन ठीक कर दिया है.",
            ),
        ]
        results = validate_speakers(segments)
        assert results[1].speaker_validation_status == SpeakerValidationStatus.VALID
        assert results[1].speaker == "Harshit Pambhar"
        assert results[1].terminology_normalized_text == "हाँ, मैंने कनेक्शन ठीक कर दिया है."

    def test_10_spanish_conversation_validation(self):
        """Spanish QA conversation validated without translation."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Carlos",
                text="Ana, ¿tienes algún problema con la API?",
                terminology_normalized_text="Ana, ¿tienes algún problema con la API?",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Ana",
                text="Sí, el servicio no responde.",
                terminology_normalized_text="Sí, el servicio no responde.",
            ),
        ]
        results = validate_speakers(segments)
        assert results[1].speaker_validation_status == SpeakerValidationStatus.VALID
        assert results[1].speaker == "Ana"

    def test_11_preservation_of_original_speaker_invariant(self):
        """Critical Invariant: original_speaker == output['speaker'] for all segments."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Speaker_A", text="We are starting the meeting"),
            TranscriptSegment(sequence=2, speaker="Speaker_B", text="with the sprint goals."),
            TranscriptSegment(sequence=3, speaker="Speaker_C", text="Sounds good."),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "VALID",
                "confidence": 0.95,
                "flags": [],
                "suggested_speaker": None,
                "reason": "Attribution is valid.",
            }
        )
        results = validate_speakers(segments, llm_client=mock_llm)
        for original, validated in zip(segments, results):
            assert validated.speaker == original.speaker

    def test_12_invalid_llm_response_graceful_fallback(self):
        """LLM returns invalid response -> assigns INSUFFICIENT_CONTEXT and does not crash."""
        class MalformedLLMClient(BaseLLMClient):
            def generate_structured(self, **kwargs):
                raise ValueError("Malformed JSON from LLM")
            def generate_text(self, **kwargs):
                return ""

        segments = [
            TranscriptSegment(sequence=1, speaker="Alice", text="Some statement here.", terminology_normalized_text="Some statement here.")
        ]
        results = validate_speakers(segments, llm_client=MalformedLLMClient())
        assert results[0].speaker_validation_status == SpeakerValidationStatus.INSUFFICIENT_CONTEXT
        assert results[0].speaker_confidence == 0.0
        assert SpeakerFlagType.INSUFFICIENT_CONTEXT in results[0].speaker_flags
        assert results[0].speaker == "Alice"

    def test_13_llm_timeout_graceful_fallback(self):
        """LLM timeout -> assigns INSUFFICIENT_CONTEXT without halting pipeline."""
        class TimeoutLLMClient(BaseLLMClient):
            def generate_structured(self, **kwargs):
                raise TimeoutError("Timeout connecting to LLM service")
            def generate_text(self, **kwargs):
                return ""

        segments = [
            TranscriptSegment(sequence=1, speaker="Bob", text="Another statement.", terminology_normalized_text="Another statement.")
        ]
        results = validate_speakers(segments, llm_client=TimeoutLLMClient())
        assert results[0].speaker_validation_status == SpeakerValidationStatus.INSUFFICIENT_CONTEXT
        assert results[0].speaker_confidence == 0.0

    def test_14_suggested_speaker_not_in_context_discarded(self):
        """If LLM hallucinates an external speaker name, it must be discarded (suggested_speaker=None)."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Alice", text="First line."),
            TranscriptSegment(sequence=2, speaker="Bob", text="Second line."),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "POSSIBLE_MISATTRIBUTION",
                "confidence": 0.85,
                "flags": ["UNEXPECTED_TURN_TRANSITION"],
                "suggested_speaker": "Zaphod Beeblebrox",  # Not in transcript!
                "reason": "Hallucinated name from LLM.",
            }
        )
        results = validate_speakers(segments, llm_client=mock_llm)
        # Suggested speaker must be None because Zaphod Beeblebrox is not in known_speakers
        assert results[1].suggested_speaker is None
        assert results[1].speaker == "Bob"

    def test_15_all_previous_metadata_and_tiers_preserved(self):
        """Verify that all 5 text tiers and all metadata from Parts 1-9 are preserved."""
        seg = TranscriptSegment(
            sequence=15,
            source_sequences=[15, 16],
            speaker="Harshit Pambhar",
            text="I have one issue with the date abase connection.",
            processed_text="I have one issue with the date abase connection.",
            stt_corrected_text="I have one issue with the database connection.",
            grammar_corrected_text="I have an issue with the database connection.",
            terminology_normalized_text="I have an issue with the database connection.",
            context_status="CONSISTENT",
            context_confidence=0.96,
            context_flags=[],
            include_in_meeting=True,
            merged=True,
        )
        mock_llm = MockLLMClient(
            default_response={
                "status": "VALID",
                "confidence": 0.98,
                "flags": [],
                "suggested_speaker": None,
                "reason": "Valid statement.",
            }
        )
        results = validate_speakers([seg], llm_client=mock_llm)
        r = results[0]
        # Invariants:
        assert r.sequence == 15
        assert r.source_sequences == [15, 16]
        assert r.speaker == "Harshit Pambhar"
        assert r.text == "I have one issue with the date abase connection."
        assert r.processed_text == "I have one issue with the date abase connection."
        assert r.stt_corrected_text == "I have one issue with the database connection."
        assert r.grammar_corrected_text == "I have an issue with the database connection."
        assert r.terminology_normalized_text == "I have an issue with the database connection."
        assert r.context_status == "CONSISTENT"
        assert r.speaker_validation_status == SpeakerValidationStatus.VALID
        assert r.speaker_correction is None

    def test_16_excluded_segment_fast_path(self):
        """Segments marked include_in_meeting=False are skipped and marked VALID."""
        seg = TranscriptSegment(
            sequence=1,
            speaker="UNKNOWN",
            text="[Noise]",
            include_in_meeting=False,
        )
        results = validate_speakers([seg])
        assert results[0].speaker_validation_status == SpeakerValidationStatus.VALID
        assert results[0].speaker_flags == []
        assert results[0].suggested_speaker is None

    def test_17_select_input_text_priority(self):
        """Verify strict priority order of text selection in speaker rules."""
        seg = TranscriptSegment(
            sequence=1,
            speaker="A",
            text="raw",
            processed_text="proc",
            stt_corrected_text="stt",
            grammar_corrected_text="gram",
            terminology_normalized_text="term",
        )
        assert select_input_text(seg) == "term"
