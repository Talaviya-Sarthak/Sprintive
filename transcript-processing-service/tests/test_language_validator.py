"""Unit and scenario tests for Part 11 — Language Preservation Check."""

import pytest
from unittest.mock import MagicMock
from app.models.language_validation import (
    LanguageFlagType,
    LanguagePreservationStatus,
    LanguageValidationResult,
    SegmentLanguageProfile,
    TranscriptLanguageProfile,
)
from app.models.speaker_validation import SpeakerValidationStatus
from app.models.transcript import (
    ContextFlagDetail,
    ContextFlagType,
    ContextValidationStatus,
    GrammarChangeDetail,
    GrammarChangeType,
    RelevanceCategory,
    RepetitionType,
    SegmentClassification,
    STTErrorType,
    TerminologyChangeDetail,
    TerminologyChangeType,
    TranscriptSegment,
)
from app.services.language_detector import detect_segment_language
from app.services.language_rules import select_input_text
from app.services.language_validator import (
    calculate_transcript_language_profile,
    validate_language_preservation,
)
from app.services.llm_client import BaseLLMClient, LLMTimeoutError


class TestLanguageValidator:
    """Test suite covering all requirements of Part 11 Language Preservation Check."""

    def test_01_pure_english_preserved(self):
        """Test 1: Normal English dialogue is validated as PRESERVED."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="Good morning, everyone. Let's start the meeting.",
            terminology_normalized_text="Good morning, everyone. Let's start the meeting.",
        )
        validated, profile = validate_language_preservation([segment])

        assert len(validated) == 1
        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.PRESERVED
        assert res.language_confidence >= 0.90
        assert res.language_flags == []
        assert "en" in res.original_languages
        assert res.original_primary_language == "en"
        assert res.original_mixed_language is False
        assert res.text == segment.text
        assert res.speaker == segment.speaker

    def test_02_pure_hindi_preserved(self):
        """Test 2: Pure Hindi dialogue in Devanagari is validated as PRESERVED."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="हाँ बोल, डेटाबेस चेक कर.",
            terminology_normalized_text="हाँ बोल, डेटाबेस चेक कर.",
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.PRESERVED
        assert res.language_confidence >= 0.90
        assert "hi" in res.original_languages
        assert res.original_primary_language == "hi"
        assert res.original_mixed_language is False
        assert res.text == segment.text
        assert res.speaker == segment.speaker

    def test_03_pure_spanish_preserved(self):
        """Test 3: Pure Spanish dialogue is validated as PRESERVED."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Elena Rodriguez",
            text="Sí, podemos revisar el problema mañana.",
            terminology_normalized_text="Sí, podemos revisar el problema mañana.",
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.PRESERVED
        assert res.language_confidence >= 0.90
        assert "es" in res.original_languages
        assert res.original_primary_language == "es"
        assert res.original_mixed_language is False
        assert res.text == segment.text
        assert res.speaker == segment.speaker

    def test_04_english_hindi_mixed_language_preserved(self):
        """Test 4: English + Hindi code-switching dialogue is validated as PRESERVED with mixed-language True."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="Database ka connection अभी fail हो रहा है.",
            terminology_normalized_text="Database ka connection अभी fail हो रहा है.",
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.PRESERVED
        assert "hi" in res.original_languages
        assert "en" in res.original_languages
        assert res.original_mixed_language is True
        assert res.processed_mixed_language is True
        assert res.language_flags == []
        assert res.text == segment.text
        assert res.speaker == segment.speaker

    def test_05_english_spanish_mixed_language_preserved(self):
        """Test 5: English + Spanish mixed language (Spanglish) is validated as PRESERVED with mixed-language True."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Carlos Santana",
            text="Podemos revisar el endpoint mañana en el sprint.",
            terminology_normalized_text="Podemos revisar el endpoint mañana en el sprint.",
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.PRESERVED
        assert "es" in res.original_languages
        assert "en" in res.original_languages
        assert res.original_mixed_language is True
        assert res.text == segment.text
        assert res.speaker == segment.speaker

    def test_06_technical_english_terms_inside_hindi_critical_spec(self):
        """
        Test 6: Technical software terms (Supabase, database, connection) inside Hindi
        are recognized as technical vocabulary and NOT treated as unwanted English replacement.
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="Supabase ka database connection fail ho raha hai.",
            terminology_normalized_text="Supabase ka database connection fail ho raha hai.",
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.PRESERVED
        assert res.language_flags == []
        assert "hi" in res.original_languages
        assert res.text == segment.text
        assert res.speaker == segment.speaker

    def test_07_punctuation_only_changes_preserved_critical_spec(self):
        """
        Test 7: Punctuation normalization (e.g., adding comma, danda, period)
        without changing spoken language is validated as PRESERVED.
        Original: 'हाँ बोल, database check कर.'
        Processed: 'हाँ, बोल। Database check कर.'
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="हाँ बोल, database check कर.",
            terminology_normalized_text="हाँ, बोल। Database check कर.",
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.PRESERVED
        assert res.language_confidence >= 0.90
        assert res.language_flags == []
        assert res.text == "हाँ बोल, database check कर."
        assert res.speaker == segment.speaker

    def test_08_capitalization_only_changes_preserved(self):
        """Test 8: Capitalization changes alone do not constitute a language change."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="we need to deploy the application.",
            grammar_corrected_text="We need to deploy the application.",
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.PRESERVED
        assert res.language_flags == []
        assert res.text == "we need to deploy the application."

    def test_09_accidental_translation_critical_spec(self):
        """
        Test 9: Accidental translation of Hindi into English is detected and flagged as LANGUAGE_CHANGED.
        Original: 'हाँ बोल, बाद में discuss करते हैं.'
        Processed: 'Yes, speak. We will discuss it later.'
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="हाँ बोल, बाद में discuss करते हैं.",
            terminology_normalized_text="Yes, speak. We will discuss it later.",
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.LANGUAGE_CHANGED
        assert LanguageFlagType.UNEXPECTED_TRANSLATION.value in res.language_flags
        assert (
            LanguageFlagType.MIXED_LANGUAGE_LOST.value in res.language_flags
            or LanguageFlagType.NON_ENGLISH_CONTENT_MODIFIED.value in res.language_flags
        )
        # Original text and speaker remain strictly untouched!
        assert res.text == "हाँ बोल, बाद में discuss करते हैं."
        assert res.speaker == "Harshit Pambhar"

    def test_10_removal_of_non_english_phrase_critical_spec(self):
        """
        Test 10: Removal or English replacement of non-English content is flagged.
        Original: 'अरे एक minute बोल बाद ले.'
        Processed: 'Hey, speak later.'
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="अरे एक minute बोल बाद ले.",
            grammar_corrected_text="Hey, speak later.",
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.LANGUAGE_CHANGED
        assert (
            LanguageFlagType.NON_ENGLISH_CONTENT_MODIFIED.value in res.language_flags
            or LanguageFlagType.UNEXPECTED_TRANSLATION.value in res.language_flags
        )
        assert res.text == "अरे एक minute बोल बाद ले."
        assert res.speaker == "Harshit Pambhar"

    def test_11_addition_of_unexpected_language(self):
        """Test 11: Unexpected addition of non-English content to English speech is flagged as LANGUAGE_ADDED."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="We should finish the sprint backlog today.",
            terminology_normalized_text="We should finish the sprint backlog hoy podemos.",
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.language_preservation_status in (
            LanguagePreservationStatus.LANGUAGE_CHANGED,
            LanguagePreservationStatus.POSSIBLE_LANGUAGE_CHANGE,
        )
        assert LanguageFlagType.LANGUAGE_ADDED.value in res.language_flags
        assert res.text == "We should finish the sprint backlog today."

    def test_12_mixed_language_lost_critical_spec(self):
        """
        Test 12: Mixed language flattened into pure English is flagged as MIXED_LANGUAGE_LOST.
        Original: 'API ka issue अभी solve नहीं हुआ.'
        Processed: 'The API issue has not been resolved yet.'
        """
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="API ka issue अभी solve नहीं हुआ.",
            terminology_normalized_text="The API issue has not been resolved yet.",
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.LANGUAGE_CHANGED
        assert LanguageFlagType.MIXED_LANGUAGE_LOST.value in res.language_flags
        assert res.original_mixed_language is True
        assert res.processed_mixed_language is False
        assert res.text == "API ka issue अभी solve नहीं हुआ."

    def test_13_very_short_ambiguous_segments(self):
        """Test 13: Very short ambiguous segments (OK., Yes., Sí., हाँ.) are handled gracefully."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Sarthak", text="OK.", processed_text="OK."),
            TranscriptSegment(sequence=2, speaker="Harshit", text="हाँ.", processed_text="हाँ."),
            TranscriptSegment(sequence=3, speaker="Elena", text="Sí.", processed_text="Sí."),
            TranscriptSegment(sequence=4, speaker="Sarthak", text="Yes.", processed_text="Yes."),
        ]
        validated, profile = validate_language_preservation(segments)

        for v in validated:
            assert v.language_preservation_status == LanguagePreservationStatus.PRESERVED
            assert v.language_flags == []

    def test_14_language_detector_failure_empty_text(self):
        """Test 14: Empty or non-text dialogue handles gracefully with INSUFFICIENT_CONTEXT."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="",
            processed_text="",
        )
        validated, profile = validate_language_preservation([segment])

        assert validated[0].language_preservation_status == LanguagePreservationStatus.INSUFFICIENT_CONTEXT

    def test_15_llm_failure_graceful_fallback(self):
        """Test 15: If LLM fails or times out on an ambiguous segment, fallback gracefully to INSUFFICIENT_CONTEXT."""
        mock_llm = MagicMock(spec=BaseLLMClient)
        mock_llm.generate_structured.side_effect = LLMTimeoutError("Request timed out after 10.0s")

        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="Testing custom sentence query alpha.",
            terminology_normalized_text="Testing different wording beta completely restructured.",
        )
        validated, profile = validate_language_preservation([segment], llm_client=mock_llm)

        res = validated[0]
        assert res.language_preservation_status == LanguagePreservationStatus.INSUFFICIENT_CONTEXT
        assert res.text == segment.text
        assert res.speaker == segment.speaker

    def test_16_all_previous_metadata_preserved(self):
        """Test 16: All metadata from Parts 1 through 10 is 100% preserved."""
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
            filter_reason="Relevant meeting dialogue",
            source_sequences=[10],
            merged=False,
            stt_corrected_text="Let's check the database connection.",
            stt_modified=False,
            stt_confidence=0.95,
            grammar_corrected_text="Let's check the database connection.",
            grammar_modified=False,
            grammar_confidence=0.96,
            terminology_normalized_text="Let's check the database connection.",
            terminology_modified=False,
            context_status=ContextValidationStatus.CONSISTENT,
            context_confidence=0.94,
            speaker_validation_status=SpeakerValidationStatus.VALID,
            speaker_confidence=0.97,
        )
        validated, profile = validate_language_preservation([segment])

        res = validated[0]
        assert res.classification == SegmentClassification.CLEAN
        assert res.confidence == 0.99
        assert res.repetition_type == RepetitionType.NONE
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.filter_confidence == 0.98
        assert res.source_sequences == [10]
        assert res.stt_confidence == 0.95
        assert res.grammar_confidence == 0.96
        assert res.context_status == ContextValidationStatus.CONSISTENT
        assert res.speaker_validation_status == SpeakerValidationStatus.VALID
        assert res.language_preservation_status == LanguagePreservationStatus.PRESERVED

    def test_17_original_text_invariant_preserved(self):
        """Test 17: Verifies assert output['text'] == input['text'] across all segments."""
        original_text = "हाँ बोल, बाद में discuss करते हैं."
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text=original_text,
            terminology_normalized_text="Yes, speak. We will discuss it later.",
        )
        validated, profile = validate_language_preservation([segment])

        assert validated[0].text == original_text

    def test_18_original_speaker_invariant_preserved(self):
        """Test 18: Verifies assert output['speaker'] == input['speaker'] across all segments."""
        original_speaker = "Harshit Pambhar"
        segment = TranscriptSegment(
            sequence=1,
            speaker=original_speaker,
            text="हाँ बोल, बाद में discuss करते हैं.",
            terminology_normalized_text="Yes, speak. We will discuss it later.",
        )
        validated, profile = validate_language_preservation([segment])

        assert validated[0].speaker == original_speaker

    def test_19_transcript_level_profile_calculation(self):
        """Test 19: Aggregate transcript language profile correctly tallies counts and languages."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak",
                text="Good morning everyone.",
                terminology_normalized_text="Good morning everyone.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit",
                text="Database connection abhi fail ho raha hai.",
                terminology_normalized_text="Database connection abhi fail ho raha hai.",
            ),
            TranscriptSegment(
                sequence=3,
                speaker="Elena",
                text="Sí, podemos revisar el problema mañana.",
                terminology_normalized_text="Sí, podemos revisar el problema mañana.",
            ),
            TranscriptSegment(
                sequence=4,
                speaker="Harshit",
                text="हाँ बोल, बाद में discuss करते हैं.",
                terminology_normalized_text="Yes, speak. We will discuss it later.",
            ),
        ]
        validated, profile = validate_language_preservation(segments)

        assert "en" in profile.languages_detected
        assert "hi" in profile.languages_detected
        assert "es" in profile.languages_detected
        assert profile.mixed_language_segments >= 1
        assert profile.language_change_flags == 1  # Segment 4 was translated

    def test_20_select_input_text_priority_hierarchy(self):
        """Test 20: Selects input text in strict priority order."""
        s1 = TranscriptSegment(
            sequence=1,
            speaker="Sarthak",
            text="T1",
            processed_text="T2",
            stt_corrected_text="T3",
            grammar_corrected_text="T4",
            terminology_normalized_text="T5",
        )
        assert select_input_text(s1) == "T5"

        s2 = TranscriptSegment(
            sequence=2,
            speaker="Sarthak",
            text="T1",
            processed_text="T2",
            stt_corrected_text="T3",
            grammar_corrected_text="T4",
            terminology_normalized_text=None,
        )
        assert select_input_text(s2) == "T4"

        s3 = TranscriptSegment(
            sequence=3,
            speaker="Sarthak",
            text="T1",
            processed_text="T2",
            stt_corrected_text="T3",
        )
        assert select_input_text(s3) == "T3"

        s4 = TranscriptSegment(
            sequence=4,
            speaker="Sarthak",
            text="T1",
            processed_text="T2",
        )
        assert select_input_text(s4) == "T2"

        s5 = TranscriptSegment(
            sequence=5,
            speaker="Sarthak",
            text="T1",
        )
        assert select_input_text(s5) == "T1"
