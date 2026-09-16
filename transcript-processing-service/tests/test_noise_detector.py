"""Unit and integration tests for Part 2: Noise & Filler Detection."""

import pytest
from app.models.transcript import SegmentClassification, TranscriptSegment
from app.services.noise_detector import detect_noise_and_fillers


class TestNoiseAndFillerDetector:
    """Test suite verifying all required detection categories, multilingual rules, and preservation constraints."""

    def test_01_normal_english_sentence(self):
        """Case 1: Standard informative English sentence is CLEAN with high confidence."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="Good morning everyone. Let's get started.",
        )
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        assert result[0].classification == SegmentClassification.CLEAN
        assert result[0].confidence >= 0.95
        assert result[0].text == "Good morning everyone. Let's get started."

    def test_02_hindi_sentence(self):
        """Case 2: Hindi dialogue is CLEAN and preserved exactly."""
        segment = TranscriptSegment(
            sequence=2,
            speaker="Harshit Pambhar",
            text="हाँ बोल",
        )
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        assert result[0].classification == SegmentClassification.CLEAN
        assert result[0].confidence >= 0.95
        assert result[0].text == "हाँ बोल"

    def test_03_spanish_sentence(self):
        """Case 3: Spanish dialogue is CLEAN and preserved exactly."""
        segment = TranscriptSegment(
            sequence=3,
            speaker="Sarthak Talaviya",
            text="¿Aló? ¿Me escuchas bien?",
        )
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        assert result[0].classification == SegmentClassification.CLEAN
        assert result[0].confidence >= 0.95
        assert result[0].text == "¿Aló? ¿Me escuchas bien?"

    def test_04_mixed_language_sentence(self):
        """Case 4: Mixed-language (Hinglish) sentence is CLEAN without translation."""
        segment = TranscriptSegment(
            sequence=4,
            speaker="Harshit Pambhar",
            text="हाँ backend ready है, but the pool size was maxed out.",
        )
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        assert result[0].classification == SegmentClassification.CLEAN
        assert result[0].confidence >= 0.95
        assert result[0].text == "हाँ backend ready है, but the pool size was maxed out."

    def test_05_filler_words_multilingual(self):
        """Case 5: Standalone fillers in English, Hindi, and Spanish are FILLER."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Sarthak", text="um"),
            TranscriptSegment(sequence=2, speaker="Harshit", text="uh"),
            TranscriptSegment(sequence=3, speaker="Harshit", text="हम्म"),
            TranscriptSegment(sequence=4, speaker="Sarthak", text="eh"),
            TranscriptSegment(sequence=5, speaker="Harshit", text="yeah"),
        ]
        results = detect_noise_and_fillers(segments)

        for seg in results:
            assert seg.classification == SegmentClassification.FILLER
            assert seg.confidence >= 0.90

    def test_06_repeated_words_intra_segment(self):
        """Case 6: Segments consisting of repeated words are classified as POSSIBLE_REPETITION."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="ready ready.",
        )
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        assert result[0].classification == SegmentClassification.POSSIBLE_REPETITION
        assert result[0].confidence >= 0.90
        assert result[0].text == "ready ready."  # Unchanged!

    def test_07_repeated_short_utterances(self):
        """Case 7: Repeated short utterances (e.g. 'Aló, aló, aló, aló.') classified as POSSIBLE_REPETITION."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="Aló, aló, aló, aló.",
        )
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        assert result[0].classification == SegmentClassification.POSSIBLE_REPETITION
        assert result[0].confidence >= 0.90
        assert result[0].text == "Aló, aló, aló, aló."

    def test_08_noisy_short_utterances_bracketed(self):
        """Case 8: Non-verbal bracketed audio annotations are classified as NOISE."""
        segments = [
            TranscriptSegment(sequence=1, speaker="UNKNOWN", text="[Background typing noise and low hum]"),
            TranscriptSegment(sequence=2, speaker="UNKNOWN", text="[cough]"),
            TranscriptSegment(sequence=3, speaker="UNKNOWN", text="(laughter)"),
        ]
        results = detect_noise_and_fillers(segments)

        for seg in results:
            assert seg.classification == SegmentClassification.NOISE
            assert seg.confidence >= 0.95

    def test_09_meaningful_yes(self):
        """Case 9: Standalone 'yes' carries meaningful response and must be CLEAN."""
        segment = TranscriptSegment(sequence=1, speaker="Harshit", text="Yes.")
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        assert result[0].classification == SegmentClassification.CLEAN
        assert result[0].confidence >= 0.90

    def test_10_meaningful_no(self):
        """Case 10: Standalone 'no' carries meaningful response and must be CLEAN."""
        segment = TranscriptSegment(sequence=1, speaker="Sarthak", text="No.")
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        assert result[0].classification == SegmentClassification.CLEAN
        assert result[0].confidence >= 0.90

    def test_11_meaningful_okay(self):
        """Case 11: Standalone and contextual 'okay' carries meaning and is CLEAN."""
        # Standalone
        seg1 = TranscriptSegment(sequence=1, speaker="Harshit", text="Okay.")
        # Contextual within sentence
        seg2 = TranscriptSegment(sequence=2, speaker="Sarthak", text="Okay, let's start the sprint review.")

        results = detect_noise_and_fillers([seg1, seg2])
        assert results[0].classification == SegmentClassification.CLEAN
        assert results[1].classification == SegmentClassification.CLEAN

    def test_12_meaningful_done(self):
        """Case 12: Standalone 'done' carries status meaning and must be CLEAN."""
        segment = TranscriptSegment(sequence=1, speaker="Harshit", text="Done.")
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        assert result[0].classification == SegmentClassification.CLEAN
        assert result[0].confidence >= 0.90

    def test_13_meaningful_ready(self):
        """Case 13: Standalone single 'ready' carries meeting status and must be CLEAN."""
        segment = TranscriptSegment(sequence=1, speaker="Sarthak", text="Ready.")
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        assert result[0].classification == SegmentClassification.CLEAN
        assert result[0].confidence >= 0.90

    def test_14_empty_whitespace_or_punctuation_segment(self):
        """Case 14: Empty, whitespace, or punctuation-only segments are NOISE."""
        segments = [
            TranscriptSegment(sequence=1, speaker="UNKNOWN", text="   "),
            TranscriptSegment(sequence=2, speaker="UNKNOWN", text="..."),
            TranscriptSegment(sequence=3, speaker="UNKNOWN", text="---"),
        ]
        results = detect_noise_and_fillers(segments)

        for seg in results:
            assert seg.classification == SegmentClassification.NOISE
            assert seg.confidence >= 0.95

    def test_15_punctuation_variations_preserved(self):
        """Case 15: Various punctuation marks do not alter classification or mutate text."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Sarthak",
            text="The time is 10:30:15 on port 5432! Is it working? Yes.",
        )
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        assert result[0].classification == SegmentClassification.CLEAN
        assert result[0].text == "The time is 10:30:15 on port 5432! Is it working? Yes."

    def test_16_critical_preservation_multilingual_no_translation(self):
        """Case 16: Verify detection NEVER translates, normalizes, or alters original text."""
        original_text = "अरे एक minute बोल बाद ले."
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text=original_text,
        )
        result = detect_noise_and_fillers([segment])

        assert len(result) == 1
        # Must remain exactly unchanged!
        assert result[0].text == original_text
        assert result[0].speaker == "Harshit Pambhar"
        assert result[0].sequence == 1
        assert result[0].classification == SegmentClassification.CLEAN

    def test_contextual_consecutive_repetition(self):
        """Context Rule: Consecutive identical short acknowledgements from same speaker become POSSIBLE_REPETITION."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Harshit", text="Okay."),
            TranscriptSegment(sequence=2, speaker="Harshit", text="Okay."),
            TranscriptSegment(sequence=3, speaker="Harshit", text="Okay."),
        ]
        results = detect_noise_and_fillers(segments)

        # First one is a meaningful standalone acknowledgment
        assert results[0].classification == SegmentClassification.CLEAN
        # Repeated ones from the same speaker become POSSIBLE_REPETITION
        assert results[1].classification == SegmentClassification.POSSIBLE_REPETITION
        assert results[2].classification == SegmentClassification.POSSIBLE_REPETITION

    def test_repeated_filler_tokens(self):
        """Repetition of filler tokens (e.g. 'um um um') classified as POSSIBLE_REPETITION."""
        segment = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="um um um",
        )
        result = detect_noise_and_fillers([segment])
        assert result[0].classification == SegmentClassification.POSSIBLE_REPETITION
        assert result[0].confidence >= 0.90
