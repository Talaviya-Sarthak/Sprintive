"""Unit and scenario tests for Part 9 — Contextual Consistency Check."""

import pytest
from app.models.transcript import (
    ContextFlagType,
    ContextValidationStatus,
    TranscriptSegment,
)
from app.services.contextual_validator import (
    detect_ambiguous_reference,
    detect_contradiction_in_context,
    detect_technical_context_mismatch,
    extract_rolling_entities,
    is_normal_topic_change,
    select_input_text,
    validate_context,
)
from app.services.llm_client import BaseLLMClient, MockLLMClient


class TestContextualValidator:
    """Comprehensive test suite for contextual consistency validation."""

    def test_01_critical_test_1_consistent_technical_discussion(self):
        """Critical Test 1: PostgreSQL database & connection discussion should be CONSISTENT."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="I have an issue with the PostgreSQL database.",
                terminology_normalized_text="I have an issue with the PostgreSQL database.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="Let's check the PostgreSQL connection.",
                terminology_normalized_text="Let's check the PostgreSQL connection.",
            ),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "CONSISTENT",
                "confidence": 0.96,
                "flags": [],
                "reason": "Both speakers are discussing PostgreSQL database connection consistently.",
            }
        )
        results = validate_context(segments, llm_client=mock_llm)
        assert len(results) == 2
        for r in results:
            assert r.context_status == ContextValidationStatus.CONSISTENT
            assert r.context_flags == []
        # Invariant: text unmodified
        assert results[0].terminology_normalized_text == "I have an issue with the PostgreSQL database."
        assert results[1].terminology_normalized_text == "Let's check the PostgreSQL connection."

    def test_02_critical_test_2_technical_mismatch_react_database(self):
        """Critical Test 2: 'React database' flagged as TECHNICAL_CONTEXT_MISMATCH without changing text."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="The API is failing.",
                terminology_normalized_text="The API is failing.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="Let's check the React database.",
                terminology_normalized_text="Let's check the React database.",
            ),
        ]
        results = validate_context(segments)
        assert results[1].context_status == ContextValidationStatus.POSSIBLE_INCONSISTENCY
        assert any(
            f.type == ContextFlagType.TECHNICAL_CONTEXT_MISMATCH
            for f in results[1].context_flags
        )
        # Invariant: text is strictly preserved
        assert results[1].terminology_normalized_text == "Let's check the React database."
        assert results[1].text == "Let's check the React database."

    def test_03_critical_test_3_normal_topic_change(self):
        """Critical Test 3: Topic change from database to sprint review is normal and CONSISTENT."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="The database issue is fixed.",
                terminology_normalized_text="The database issue is fixed.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="Now let's discuss the sprint review.",
                terminology_normalized_text="Now let's discuss the sprint review.",
            ),
        ]
        results = validate_context(segments)
        assert results[1].context_status == ContextValidationStatus.CONSISTENT
        assert results[1].context_flags == []
        assert results[1].terminology_normalized_text == "Now let's discuss the sprint review."

    def test_04_critical_test_4_unqualified_contradiction(self):
        """Critical Test 4: 'database is working' vs 'database is not working' is a CONTRADICTION."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="The database is working.",
                terminology_normalized_text="The database is working.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="The database is not working.",
                terminology_normalized_text="The database is not working.",
            ),
        ]
        results = validate_context(segments)
        assert results[1].context_status == ContextValidationStatus.POSSIBLE_INCONSISTENCY
        assert any(
            f.type == ContextFlagType.CONTRADICTION
            for f in results[1].context_flags
        )
        # Text preserved untouched
        assert results[1].terminology_normalized_text == "The database is not working."

    def test_05_critical_test_5_ambiguous_pronoun_reference(self):
        """Critical Test 5: 'He told him that it was broken.' is AMBIGUOUS without inventing identities."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="He told him that it was broken.",
                terminology_normalized_text="He told him that it was broken.",
            ),
        ]
        results = validate_context(segments)
        assert results[0].context_status == ContextValidationStatus.AMBIGUOUS
        assert any(
            f.type == ContextFlagType.AMBIGUOUS_REFERENCE
            for f in results[0].context_flags
        )
        assert results[0].terminology_normalized_text == "He told him that it was broken."

    def test_06_critical_test_6_mixed_language_conversation(self):
        """Critical Test 6: Hindi/English mixed transcript preserved verbatim and marked CONSISTENT."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="मैं Supabase database use कर रहा हूँ.",
                terminology_normalized_text="मैं Supabase database use कर रहा हूँ.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="और API testing भी कर रहा हूँ.",
                terminology_normalized_text="और API testing भी कर रहा हूँ.",
            ),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "CONSISTENT",
                "confidence": 0.95,
                "flags": [],
                "reason": "Natural mixed-language dialogue discussing Supabase and API testing.",
            }
        )
        results = validate_context(segments, llm_client=mock_llm)
        assert results[0].context_status == ContextValidationStatus.CONSISTENT
        assert results[1].context_status == ContextValidationStatus.CONSISTENT
        assert results[0].terminology_normalized_text == "मैं Supabase database use कर रहा हूँ."
        assert results[1].terminology_normalized_text == "और API testing भी कर रहा हूँ."

    def test_07_temporal_context_resolves_apparent_contradiction(self):
        """Temporal qualification ('earlier' vs 'working now') is legitimate state change, not contradiction."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="The database was not working earlier.",
                terminology_normalized_text="The database was not working earlier.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="The database is working now.",
                terminology_normalized_text="The database is working now.",
            ),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "CONSISTENT",
                "confidence": 0.97,
                "flags": [],
                "reason": "Temporal markers 'earlier' and 'now' explain the transition from failure to resolution.",
            }
        )
        results = validate_context(segments, llm_client=mock_llm)
        assert results[1].context_status == ContextValidationStatus.CONSISTENT
        assert results[1].context_flags == []

    def test_08_consistent_terminology_across_segments(self):
        """Consistent usage of 'FastAPI' across multiple turns."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="We deployed the FastAPI service.",
                terminology_normalized_text="We deployed the FastAPI service.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="Yes, the FastAPI endpoints are responsive.",
                terminology_normalized_text="Yes, the FastAPI endpoints are responsive.",
            ),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "CONSISTENT",
                "confidence": 0.98,
                "flags": [],
                "reason": "FastAPI service terminology is consistent.",
            }
        )
        results = validate_context(segments, llm_client=mock_llm)
        assert results[0].context_status == ContextValidationStatus.CONSISTENT
        assert results[1].context_status == ContextValidationStatus.CONSISTENT

    def test_09_hindi_conversation_consistency(self):
        """Pure Hindi Scrum conversation validated consistently."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="आज का क्या काम है?",
                terminology_normalized_text="आज का क्या काम है?",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="आज हम डेटाबेस का काम पूरा करेंगे.",
                terminology_normalized_text="आज हम डेटाबेस का काम पूरा करेंगे.",
            ),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "CONSISTENT",
                "confidence": 0.94,
                "flags": [],
                "reason": "Normal Hindi dialogue discussing today's work.",
            }
        )
        results = validate_context(segments, llm_client=mock_llm)
        assert results[0].context_status == ContextValidationStatus.CONSISTENT
        assert results[1].context_status == ContextValidationStatus.CONSISTENT

    def test_10_spanish_conversation_consistency(self):
        """Spanish conversation validated consistently."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Carlos",
                text="¿Tenemos alguna reunión hoy?",
                terminology_normalized_text="¿Tenemos alguna reunión hoy?",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Ana",
                text="Sí, la revisión del sprint es por la tarde.",
                terminology_normalized_text="Sí, la revisión del sprint es por la tarde.",
            ),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "CONSISTENT",
                "confidence": 0.95,
                "flags": [],
                "reason": "Spanish dialogue discussing today's sprint review.",
            }
        )
        results = validate_context(segments, llm_client=mock_llm)
        assert results[0].context_status == ContextValidationStatus.CONSISTENT
        assert results[1].context_status == ContextValidationStatus.CONSISTENT

    def test_11_multiple_speakers_turn_taking(self):
        """Multi-turn conversation between 3 speakers."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Alice", text="Has the PR been approved?", terminology_normalized_text="Has the PR been approved?"),
            TranscriptSegment(sequence=2, speaker="Bob", text="I reviewed it and left comments.", terminology_normalized_text="I reviewed it and left comments."),
            TranscriptSegment(sequence=3, speaker="Charlie", text="I will address the comments now.", terminology_normalized_text="I will address the comments now."),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "CONSISTENT",
                "confidence": 0.97,
                "flags": [],
                "reason": "Logical collaborative turn-taking on PR review.",
            }
        )
        results = validate_context(segments, llm_client=mock_llm)
        assert len(results) == 3
        for r in results:
            assert r.context_status == ContextValidationStatus.CONSISTENT

    def test_12_project_entity_consistency(self):
        """Project entities (frontend, backend, auth) used coherently."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Alice", text="The backend authentication service is ready.", terminology_normalized_text="The backend authentication service is ready."),
            TranscriptSegment(sequence=2, speaker="Bob", text="Great, frontend can now integrate login.", terminology_normalized_text="Great, frontend can now integrate login."),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "CONSISTENT",
                "confidence": 0.96,
                "flags": [],
                "reason": "Backend auth and frontend login integration is consistent.",
            }
        )
        results = validate_context(segments, llm_client=mock_llm)
        assert results[0].context_status == ContextValidationStatus.CONSISTENT
        assert results[1].context_status == ContextValidationStatus.CONSISTENT

    def test_13_llm_high_confidence_inconsistency(self):
        """LLM flags high-confidence term inconsistency."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Alice", text="We are using PostgreSQL for user accounts.", terminology_normalized_text="We are using PostgreSQL for user accounts."),
            TranscriptSegment(sequence=2, speaker="Bob", text="Our MongoDB user queries are very fast.", terminology_normalized_text="Our MongoDB user queries are very fast."),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "POSSIBLE_INCONSISTENCY",
                "confidence": 0.89,
                "flags": [
                    {
                        "type": "TERM_INCONSISTENCY",
                        "description": "Contradictory database systems mentioned for user accounts (PostgreSQL vs MongoDB).",
                    }
                ],
                "reason": "Sudden switch in database technology for the same component.",
            }
        )
        results = validate_context(segments, llm_client=mock_llm)
        assert results[1].context_status == ContextValidationStatus.POSSIBLE_INCONSISTENCY
        assert results[1].context_confidence == 0.89
        assert len(results[1].context_flags) == 1
        assert results[1].context_flags[0].type == ContextFlagType.TERM_INCONSISTENCY

    def test_14_llm_low_confidence_fallback(self):
        """LLM returns inconsistency below threshold (0.80) -> falls back safely."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Alice", text="The build finished.", terminology_normalized_text="The build finished."),
            TranscriptSegment(sequence=2, speaker="Bob", text="Is that pipeline blue?", terminology_normalized_text="Is that pipeline blue?"),
        ]
        mock_llm = MockLLMClient(
            default_response={
                "status": "POSSIBLE_INCONSISTENCY",
                "confidence": 0.65,  # Below 0.80 threshold
                "flags": [
                    {"type": "TOPIC_DISCONTINUITY", "description": "Unclear reference to blue pipeline."}
                ],
                "reason": "Uncertain whether blue refers to Blue/Green deployment or UI color.",
            }
        )
        results = validate_context(segments, llm_client=mock_llm, confidence_threshold=0.80)
        # Should not flag as POSSIBLE_INCONSISTENCY because confidence is only 0.65
        assert results[1].context_status == ContextValidationStatus.INSUFFICIENT_CONTEXT
        assert results[1].context_flags == []

    def test_15_invalid_llm_response_graceful_fallback(self):
        """LLM returns invalid response -> pipeline assigns INSUFFICIENT_CONTEXT and does not crash."""
        class MalformedLLMClient(BaseLLMClient):
            def generate_structured(self, **kwargs):
                raise ValueError("Unparseable JSON response from LLM")
            def generate_text(self, **kwargs):
                return ""

        segments = [
            TranscriptSegment(sequence=1, speaker="Alice", text="Some dialogue.", terminology_normalized_text="Some dialogue.")
        ]
        results = validate_context(segments, llm_client=MalformedLLMClient())
        assert results[0].context_status == ContextValidationStatus.INSUFFICIENT_CONTEXT
        assert results[0].context_confidence == 0.0
        assert results[0].context_flags == []
        assert "LLM error" in (results[0].context_reason or "")
        # Text completely preserved
        assert results[0].terminology_normalized_text == "Some dialogue."

    def test_16_llm_timeout_graceful_fallback(self):
        """LLM timeout -> assigns INSUFFICIENT_CONTEXT without failing pipeline."""
        class TimeoutLLMClient(BaseLLMClient):
            def generate_structured(self, **kwargs):
                raise TimeoutError("Request timed out after 10.0s")
            def generate_text(self, **kwargs):
                return ""

        segments = [
            TranscriptSegment(sequence=1, speaker="Alice", text="Some dialogue.", terminology_normalized_text="Some dialogue.")
        ]
        results = validate_context(segments, llm_client=TimeoutLLMClient())
        assert results[0].context_status == ContextValidationStatus.INSUFFICIENT_CONTEXT
        assert results[0].context_confidence == 0.0
        assert "timed out" in (results[0].context_reason or "").lower()

    def test_17_all_five_traceability_tiers_preserved(self):
        """Verify that all 5 tiers of text and metadata are preserved completely."""
        segment = TranscriptSegment(
            sequence=10,
            source_sequences=[10],
            speaker="Harshit Pambhar",
            text="I have an isue with the date abase connection.",
            processed_text="I have an isue with the date abase connection.",
            stt_corrected_text="I have an issue with the date abase connection.",
            grammar_corrected_text="I have an issue with the database connection.",
            terminology_normalized_text="I have an issue with the database connection.",
            terminology_modified=True,
            include_in_meeting=True,
        )
        mock_llm = MockLLMClient(
            default_response={
                "status": "CONSISTENT",
                "confidence": 0.98,
                "flags": [],
                "reason": "Statement is clear and consistent.",
            }
        )
        results = validate_context([segment], llm_client=mock_llm)
        r = results[0]
        # Invariants:
        assert r.sequence == 10
        assert r.source_sequences == [10]
        assert r.speaker == "Harshit Pambhar"
        assert r.text == "I have an isue with the date abase connection."
        assert r.processed_text == "I have an isue with the date abase connection."
        assert r.stt_corrected_text == "I have an issue with the date abase connection."
        assert r.grammar_corrected_text == "I have an issue with the database connection."
        assert r.terminology_normalized_text == "I have an issue with the database connection."
        assert r.terminology_modified is True
        assert r.context_status == ContextValidationStatus.CONSISTENT

    def test_18_excluded_segment_fast_path(self):
        """Segments marked include_in_meeting=False are skipped and marked CONSISTENT."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="UNKNOWN",
            text="[Noise]",
            include_in_meeting=False,
        )
        results = validate_context([segment])
        assert results[0].context_status == ContextValidationStatus.CONSISTENT
        assert results[0].context_flags == []

    def test_19_extract_rolling_entities(self):
        """Verify entity extraction across transcript segments."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Sarthak", text="We use PostgreSQL and FastAPI."),
            TranscriptSegment(sequence=2, speaker="Harshit", text="The frontend is built with React."),
        ]
        entities = extract_rolling_entities(segments)
        assert "Sarthak" in entities
        assert "Harshit" in entities
        assert "PostgreSQL" in entities
        assert "FastAPI" in entities
        assert "React" in entities
        assert "frontend" in entities

    def test_20_select_input_text_priority(self):
        """Verify strict priority order of text selection."""
        # 1. terminology_normalized_text wins
        seg1 = TranscriptSegment(
            sequence=1,
            speaker="A",
            text="raw",
            processed_text="proc",
            stt_corrected_text="stt",
            grammar_corrected_text="gram",
            terminology_normalized_text="term",
        )
        assert select_input_text(seg1) == "term"

        # 2. grammar_corrected_text wins if terminology is None
        seg2 = TranscriptSegment(
            sequence=2,
            speaker="A",
            text="raw",
            processed_text="proc",
            stt_corrected_text="stt",
            grammar_corrected_text="gram",
        )
        assert select_input_text(seg2) == "gram"

        # 3. stt_corrected_text wins if grammar is None
        seg3 = TranscriptSegment(
            sequence=3,
            speaker="A",
            text="raw",
            processed_text="proc",
            stt_corrected_text="stt",
        )
        assert select_input_text(seg3) == "stt"

        # 4. processed_text wins if STT is None
        seg4 = TranscriptSegment(
            sequence=4,
            speaker="A",
            text="raw",
            processed_text="proc",
        )
        assert select_input_text(seg4) == "proc"

        # 5. raw text fallback
        seg5 = TranscriptSegment(
            sequence=5,
            speaker="A",
            text="raw",
        )
        assert select_input_text(seg5) == "raw"
