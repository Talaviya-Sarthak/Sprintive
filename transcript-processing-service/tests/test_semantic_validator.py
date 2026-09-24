"""Unit and scenario tests for Part 12 — Semantic Preservation Validation."""

import pytest
from unittest.mock import MagicMock
from app.models.semantic_validation import (
    ExtractedSemanticEntities,
    SemanticFlagType,
    SemanticValidationResult,
    SemanticValidationStatus,
)
from app.models.speaker_validation import SpeakerValidationStatus
from app.models.language_validation import LanguagePreservationStatus
from app.models.transcript import (
    ContextValidationStatus,
    RelevanceCategory,
    RepetitionType,
    SegmentClassification,
    TranscriptSegment,
)
from app.services.entity_extractor import extract_semantic_entities
from app.services.llm_client import BaseLLMClient, LLMTimeoutError, MockLLMClient
from app.services.semantic_rules import (
    get_latest_processed_text,
    is_semantic_equivalent_stylistic_change,
)
from app.services.semantic_validator import validate_semantic_preservation


class TestSemanticValidator:
    """Test suite covering all requirements of Part 12 Semantic Preservation Validation."""

    def test_01_punctuation_only_change_preserved(self):
        """Test 1: Punctuation normalization preserves semantic meaning."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="Okay let's start.",
            terminology_normalized_text="Okay, let's start.",
        )
        validated = validate_semantic_preservation([segment])

        assert len(validated) == 1
        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_PRESERVED
        assert res.semantic_confidence >= 0.90
        assert res.semantic_flags == []
        assert res.text == segment.text
        assert res.speaker == segment.speaker

    def test_02_grammar_only_change_preserved(self):
        """Test 2: Grammatical correction preserves semantic meaning."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="I think we should first review what we come yesterday.",
            grammar_corrected_text="I think we should first review what we did yesterday.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_PRESERVED
        assert res.semantic_confidence >= 0.90
        assert res.text == segment.text
        assert res.speaker == segment.speaker

    def test_03_capitalization_change_preserved(self):
        """Test 3: Case capitalization preserves semantic meaning."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Elena Rodriguez",
            text="good morning everyone.",
            grammar_corrected_text="Good morning everyone.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_PRESERVED
        assert res.semantic_flags == []
        assert res.text == segment.text

    def test_04_equivalent_wording_preserved(self):
        """Test 4: Synonym replacement (fix -> resolve, issue -> problem) preserves meaning."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="I'll fix the backend issue tomorrow.",
            terminology_normalized_text="I will resolve the backend problem tomorrow.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_PRESERVED
        assert res.semantic_flags == []
        assert res.text == "I'll fix the backend issue tomorrow."

    def test_05_negation_change_critical_spec(self):
        """
        Test 5: Negation flip (not working -> working / don't have -> have)
        is flagged as SEMANTICALLY_CHANGED with NEGATION_CHANGED.
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="I don't have access to the database.",
            terminology_normalized_text="I have access to the database.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.NEGATION_CHANGED.value in res.semantic_flags
        assert "negation" in res.semantic_changed_elements
        assert res.text == "I don't have access to the database."

    def test_06_number_quantity_change_critical_spec(self):
        """
        Test 6: Numeric discrepancy (two blockers -> three blockers)
        is flagged as SEMANTICALLY_CHANGED with QUANTITY_CHANGED.
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="We have two blockers.",
            terminology_normalized_text="We have three blockers.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.QUANTITY_CHANGED.value in res.semantic_flags
        assert "quantity" in res.semantic_changed_elements
        assert res.text == "We have two blockers."

    def test_07_date_change_critical_spec(self):
        """
        Test 7: Date modification (deploy on Friday -> deploy on Monday)
        is flagged as SEMANTICALLY_CHANGED with DATE_CHANGED.
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="We'll deploy on Friday.",
            terminology_normalized_text="We'll deploy on Monday.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert (
            SemanticFlagType.DATE_CHANGED.value in res.semantic_flags
            or SemanticFlagType.DEADLINE_CHANGED.value in res.semantic_flags
        )
        assert res.text == "We'll deploy on Friday."

    def test_08_time_change_critical_spec(self):
        """
        Test 8: Time modification (starts at 10 AM -> starts at 11 AM)
        is flagged as SEMANTICALLY_CHANGED with TIME_CHANGED.
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="The meeting starts at 10 AM.",
            terminology_normalized_text="The meeting starts at 11 AM.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.TIME_CHANGED.value in res.semantic_flags
        assert "time" in res.semantic_changed_elements
        assert res.text == "The meeting starts at 10 AM."

    def test_09_deadline_change_critical_spec(self):
        """
        Test 9: Deadline modification (finish tomorrow -> finish next week)
        is flagged as SEMANTICALLY_CHANGED with DEADLINE_CHANGED.
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="I will finish the API testing tomorrow.",
            terminology_normalized_text="I will finish the API testing next week.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.DEADLINE_CHANGED.value in res.semantic_flags
        assert "deadline" in res.semantic_changed_elements

    def test_10_technical_entity_change_critical_spec(self):
        """
        Test 10: Technical entity replacement (PostgreSQL -> Supabase)
        is flagged as SEMANTICALLY_CHANGED with TECHNICAL_ENTITY_CHANGED.
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="The issue is in PostgreSQL.",
            terminology_normalized_text="The issue is in Supabase.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.TECHNICAL_ENTITY_CHANGED.value in res.semantic_flags
        assert "technical_entity" in res.semantic_changed_elements
        assert res.text == "The issue is in PostgreSQL."

    def test_11_person_reference_change_critical_spec(self):
        """
        Test 11: Person reference alteration (Harshit -> Sarthak)
        is flagged as SEMANTICALLY_CHANGED with PERSON_REFERENCE_CHANGED.
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="Harshit will fix the API.",
            terminology_normalized_text="Sarthak will fix the API.",
        )
        # Pass known speakers in context
        segments = [
            segment,
            TranscriptSegment(sequence=2, speaker="Harshit Pambhar", text="Yes, I am working on it."),
        ]
        validated = validate_semantic_preservation(segments)

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.PERSON_REFERENCE_CHANGED.value in res.semantic_flags
        assert "person_reference" in res.semantic_changed_elements

    def test_12_action_change_critical_spec(self):
        """
        Test 12: Action modification (check logs -> restart database)
        is flagged as SEMANTICALLY_CHANGED with ACTION_CHANGED.
        """
        mock_llm = MockLLMClient(
            default_response={
                "status": "SEMANTICALLY_CHANGED",
                "confidence": 0.97,
                "flags": ["ACTION_CHANGED"],
                "changed_elements": ["action"],
                "reason": "The planned action changed from checking logs to restarting the database.",
            }
        )
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="I will check the database logs.",
            terminology_normalized_text="I will restart the database.",
        )
        validated = validate_semantic_preservation([segment], llm_client=mock_llm)

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.ACTION_CHANGED.value in res.semantic_flags
        assert res.text == "I will check the database logs."

    def test_13_commitment_change_critical_spec(self):
        """
        Test 13: Team commitment alteration (I commit to finishing this by EOD -> Someone might finish this)
        is flagged as SEMANTICALLY_CHANGED with COMMITMENT_CHANGED.
        """
        mock_llm = MockLLMClient(
            default_response={
                "status": "SEMANTICALLY_CHANGED",
                "confidence": 0.95,
                "flags": ["COMMITMENT_CHANGED", "UNCERTAINTY_CHANGED"],
                "changed_elements": ["commitment"],
                "reason": "Personal commitment was altered to an uncertain possibility.",
            }
        )
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="I commit to finishing this deployment.",
            terminology_normalized_text="Someone might finish this deployment.",
        )
        validated = validate_semantic_preservation([segment], llm_client=mock_llm)

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.COMMITMENT_CHANGED.value in res.semantic_flags

    def test_14_question_to_statement_critical_spec(self):
        """
        Test 14: Question converted to declarative statement (Can we deploy this today? -> We can deploy this today.)
        is flagged as SEMANTICALLY_CHANGED with QUESTION_TO_STATEMENT.
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="Can we deploy this today?",
            terminology_normalized_text="We can deploy this today.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.QUESTION_TO_STATEMENT.value in res.semantic_flags
        assert "sentence_modality" in res.semantic_changed_elements

    def test_15_uncertainty_removal_critical_spec(self):
        """
        Test 15: Epistemic uncertainty removed (The issue may be related -> The issue is related)
        is flagged with CERTAINTY_CHANGED.
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="The issue may be related to PostgreSQL.",
            terminology_normalized_text="The issue is related to PostgreSQL.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status in (
            SemanticValidationStatus.SEMANTICALLY_CHANGED,
            SemanticValidationStatus.POSSIBLE_SEMANTIC_CHANGE,
        )
        assert SemanticFlagType.CERTAINTY_CHANGED.value in res.semantic_flags
        assert "uncertainty" in res.semantic_changed_elements

    def test_16_causal_relationship_change(self):
        """
        Test 16: Cause-and-effect alteration (connection timing out -> server rejecting request)
        is flagged with CAUSALITY_CHANGED.
        """
        mock_llm = MockLLMClient(
            default_response={
                "status": "SEMANTICALLY_CHANGED",
                "confidence": 0.95,
                "flags": ["CAUSALITY_CHANGED"],
                "changed_elements": ["causality"],
                "reason": "The underlying cause of failure was modified from timeout to rejection.",
            }
        )
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="The API is failing because the PostgreSQL connection is timing out.",
            terminology_normalized_text="The API is failing because PostgreSQL is rejecting the request.",
        )
        validated = validate_semantic_preservation([segment], llm_client=mock_llm)

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.CAUSALITY_CHANGED.value in res.semantic_flags

    def test_17_conditionality_change(self):
        """
        Test 17: Conditionality marker dropped (We can deploy if testing passes -> We can deploy and testing passes)
        is flagged with CONDITIONALITY_CHANGED.
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="We can deploy if testing passes.",
            terminology_normalized_text="We can deploy and testing passes.",
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.CONDITIONALITY_CHANGED.value in res.semantic_flags
        assert "conditionality" in res.semantic_changed_elements

    def test_18_context_dependent_reference_resolution(self):
        """
        Test 18: Context-dependent pronoun reference resolution using surrounding segments.
        Sarthak: 'We need to fix the database issue.'
        Harshit: 'I'll handle it.' -> Processed: 'I'll handle the API issue.'
        """
        mock_llm = MockLLMClient(
            default_response={
                "status": "SEMANTICALLY_CHANGED",
                "confidence": 0.94,
                "flags": ["TECHNICAL_ENTITY_CHANGED", "MEANING_CHANGED"],
                "changed_elements": ["referent", "technical_entity"],
                "reason": "In surrounding context, 'it' referred to database issue, but processed changed to API issue.",
            }
        )
        segments = [
            TranscriptSegment(sequence=1, speaker="Sarthak Talaviya", text="We need to fix the database issue."),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="I'll handle it.",
                terminology_normalized_text="I'll handle the API issue.",
            ),
        ]
        validated = validate_semantic_preservation(segments, llm_client=mock_llm)

        res = validated[1]
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert "TECHNICAL_ENTITY_CHANGED" in res.semantic_flags

    def test_19_ambiguous_semantic_difference(self):
        """Test 19: Ambiguous semantic difference is marked AMBIGUOUS without guessing."""
        mock_llm = MockLLMClient(
            default_response={
                "status": "AMBIGUOUS",
                "confidence": 0.70,
                "flags": ["POSSIBLE_MEANING_CHANGE"],
                "changed_elements": ["nuance"],
                "reason": "Phrasing introduces an ambiguous nuance that cannot be confirmed from transcript alone.",
            }
        )
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="We might wrap this early or wait.",
            terminology_normalized_text="We could finish soon or hold on.",
        )
        validated = validate_semantic_preservation([segment], llm_client=mock_llm)

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.AMBIGUOUS

    def test_20_llm_failure_graceful_fallback(self):
        """Test 20: Safe fallback to INSUFFICIENT_CONTEXT when LLM times out or errors."""
        mock_llm = MagicMock(spec=BaseLLMClient)
        mock_llm.generate_structured.side_effect = LLMTimeoutError("Request timed out after 10.0s")

        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="Testing custom sentence query alpha.",
            terminology_normalized_text="Testing different wording beta completely restructured.",
        )
        validated = validate_semantic_preservation([segment], llm_client=mock_llm)

        res = validated[0]
        assert res.semantic_status == SemanticValidationStatus.INSUFFICIENT_CONTEXT
        assert res.text == segment.text
        assert res.speaker == segment.speaker

    def test_21_deterministic_detection_fast_path(self):
        """Test 21: Deterministic detection catches negation flip without requiring an LLM call."""
        mock_llm = MagicMock(spec=BaseLLMClient)
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="The API is not working.",
            terminology_normalized_text="The API is working.",
        )
        # Should NOT call LLM because deterministic negation check is definitive
        validated = validate_semantic_preservation([segment], llm_client=mock_llm)

        assert mock_llm.generate_structured.call_count == 0
        assert validated[0].semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert SemanticFlagType.NEGATION_CHANGED.value in validated[0].semantic_flags

    def test_22_all_previous_metadata_preserved(self):
        """Test 22: All metadata from Parts 1 through 11 is 100% preserved."""
        segment = TranscriptSegment(
            sequence=10,
            speaker="Sarthak Talaviya",
            text="Let's check the database connection.",
            classification=SegmentClassification.CLEAN,
            confidence=0.99,
            processed_text="Let's check the database connection.",
            repetition_type=RepetitionType.NONE,
            relevance=RelevanceCategory.MEETING_CONTENT,
            include_in_meeting=True,
            filter_confidence=0.98,
            source_sequences=[10],
            merged=False,
            stt_corrected_text="Let's check the database connection.",
            stt_confidence=0.95,
            grammar_corrected_text="Let's check the database connection.",
            grammar_confidence=0.96,
            terminology_normalized_text="Let's check the database connection.",
            context_status=ContextValidationStatus.CONSISTENT,
            speaker_validation_status=SpeakerValidationStatus.VALID,
            language_preservation_status=LanguagePreservationStatus.PRESERVED,
            language_confidence=0.98,
        )
        validated = validate_semantic_preservation([segment])

        res = validated[0]
        assert res.classification == SegmentClassification.CLEAN
        assert res.confidence == 0.99
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.stt_confidence == 0.95
        assert res.grammar_confidence == 0.96
        assert res.context_status == ContextValidationStatus.CONSISTENT
        assert res.speaker_validation_status == SpeakerValidationStatus.VALID
        assert res.language_preservation_status == LanguagePreservationStatus.PRESERVED
        assert res.semantic_status == SemanticValidationStatus.SEMANTICALLY_PRESERVED

    def test_23_original_text_invariant_preserved(self):
        """Test 23: Verifies assert output['text'] == input['text'] across all segments."""
        original_text = "The API is not working."
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text=original_text,
            terminology_normalized_text="The API is working.",
        )
        validated = validate_semantic_preservation([segment])

        assert validated[0].text == original_text

    def test_24_original_speaker_invariant_preserved(self):
        """Test 24: Verifies assert output['speaker'] == input['speaker'] across all segments."""
        original_speaker = "Harshit Pambhar"
        segment = TranscriptSegment(
            sequence=1,
            speaker=original_speaker,
            text="The API is not working.",
            terminology_normalized_text="The API is working.",
        )
        validated = validate_semantic_preservation([segment])

        assert validated[0].speaker == original_speaker
