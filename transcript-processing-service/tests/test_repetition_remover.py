"""Unit tests for Part 3 - Repetition Removal service."""

import pytest
from app.models.transcript import (
    RepetitionType,
    SegmentClassification,
    TranscriptSegment,
)
from app.services.repetition_remover import (
    clean_intra_segment_repetition,
    detect_and_remove_consecutive_words,
    detect_and_remove_repeated_phrases,
    normalize_for_comparison,
    remove_repetitions,
)


class TestRepetitionRemover:
    """Comprehensive test suite for repetition removal and data preservation."""

    # 1. "ready ready."
    def test_ready_ready_word_repetition(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="ready ready.",
            classification=SegmentClassification.POSSIBLE_REPETITION,
        )
        results = remove_repetitions([seg])
        assert len(results) == 1
        res = results[0]
        assert res.sequence == 1
        assert res.speaker == "Sarthak Talaviya"
        assert res.text == "ready ready."  # Raw text preserved
        assert res.processed_text == "ready."
        assert res.repetition_modified is True
        assert res.repetition_type == RepetitionType.CONSECUTIVE_WORD
        assert res.is_duplicate is False
        assert res.duplicate_of_sequence is None

    # 2. "done done done."
    def test_done_done_done_word_repetition(self):
        seg = TranscriptSegment(
            sequence=2,
            speaker="Harshit Pambhar",
            text="done done done.",
        )
        results = remove_repetitions([seg])
        res = results[0]
        assert res.text == "done done done."
        assert res.processed_text == "done."
        assert res.repetition_modified is True
        assert res.repetition_type == RepetitionType.CONSECUTIVE_WORD

    # 3. "hello hello hello"
    def test_hello_hello_hello(self):
        seg = TranscriptSegment(
            sequence=3,
            speaker="Alice",
            text="hello hello hello",
        )
        results = remove_repetitions([seg])
        res = results[0]
        assert res.text == "hello hello hello"
        assert res.processed_text == "hello"
        assert res.repetition_modified is True
        assert res.repetition_type == RepetitionType.CONSECUTIVE_WORD

    # 4. repeated multi-word phrase
    def test_repeated_multi_word_phrase(self):
        seg1 = TranscriptSegment(
            sequence=4,
            speaker="Alice",
            text="we need to deploy we need to deploy",
        )
        seg2 = TranscriptSegment(
            sequence=5,
            speaker="Alice",
            text="API testing API testing",
        )
        results = remove_repetitions([seg1, seg2])

        assert results[0].text == "we need to deploy we need to deploy"
        assert results[0].processed_text == "we need to deploy"
        assert results[0].repetition_modified is True
        assert results[0].repetition_type == RepetitionType.REPEATED_PHRASE

        assert results[1].text == "API testing API testing"
        assert results[1].processed_text == "API testing"
        assert results[1].repetition_modified is True
        assert results[1].repetition_type == RepetitionType.REPEATED_PHRASE

    # 5. exact duplicate consecutive segments
    def test_exact_duplicate_consecutive_segments(self):
        segments = [
            TranscriptSegment(
                sequence=10,
                speaker="Harshit Pambhar",
                text="Database connection is failing.",
            ),
            TranscriptSegment(
                sequence=11,
                speaker="Harshit Pambhar",
                text="Database connection is failing.",
            ),
        ]
        results = remove_repetitions(segments)
        assert len(results) == 2

        # First segment is clean
        assert results[0].sequence == 10
        assert results[0].text == "Database connection is failing."
        assert results[0].processed_text == "Database connection is failing."
        assert results[0].is_duplicate is False

        # Second segment is marked duplicate
        assert results[1].sequence == 11
        assert results[1].speaker == "Harshit Pambhar"
        assert results[1].text == "Database connection is failing."  # Untouched
        assert results[1].processed_text == ""
        assert results[1].is_duplicate is True
        assert results[1].duplicate_of_sequence == 10
        assert results[1].repetition_modified is True
        assert results[1].repetition_type == RepetitionType.EXACT_SEGMENT_DUPLICATE

    # 6. near-duplicate segments
    def test_near_duplicate_consecutive_segments(self):
        segments = [
            TranscriptSegment(
                sequence=20,
                speaker="Harshit Pambhar",
                text="I am facing an issue with database connection.",
            ),
            TranscriptSegment(
                sequence=21,
                speaker="Harshit Pambhar",
                text="I am facing an issue with the database connection.",
            ),
        ]
        results = remove_repetitions(segments)
        assert len(results) == 2

        # First segment untouched
        assert results[0].is_duplicate is False
        assert (
            results[0].processed_text
            == "I am facing an issue with database connection."
        )

        # Second segment marked near duplicate
        assert results[1].sequence == 21
        assert (
            results[1].text
            == "I am facing an issue with the database connection."
        )
        assert results[1].processed_text == ""
        assert results[1].is_duplicate is True
        assert results[1].duplicate_of_sequence == 20
        assert results[1].repetition_modified is True
        assert results[1].repetition_type == RepetitionType.NEAR_SEGMENT_DUPLICATE

    # 7. same sentence spoken by different speakers (Speaker Boundary Rule)
    def test_same_sentence_different_speakers(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="We should deploy today.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="We should deploy today.",
            ),
        ]
        results = remove_repetitions(segments)
        assert len(results) == 2

        # Neither segment must be marked duplicate
        assert results[0].is_duplicate is False
        assert results[0].processed_text == "We should deploy today."
        assert results[0].repetition_modified is False

        assert results[1].is_duplicate is False
        assert results[1].processed_text == "We should deploy today."
        assert results[1].repetition_modified is False
        assert results[1].duplicate_of_sequence is None

    # 8. meaningful "very very important"
    def test_meaningful_very_very_important(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Alice",
            text="This is very very important.",
        )
        results = remove_repetitions([seg])
        res = results[0]
        assert res.text == "This is very very important."
        assert res.processed_text == "This is very very important."
        assert res.repetition_modified is False
        assert res.repetition_type == RepetitionType.NONE

    # 9. meaningful "no no, don't deploy"
    def test_meaningful_no_no_dont_deploy(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Bob",
            text="no no, don't deploy it",
        )
        results = remove_repetitions([seg])
        res = results[0]
        assert res.text == "no no, don't deploy it"
        assert res.processed_text == "no no, don't deploy it"
        assert res.repetition_modified is False
        assert res.repetition_type == RepetitionType.NONE

    # 10. Hindi repetition
    def test_hindi_repetition_non_translation(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Rahul",
            text="हाँ हाँ हाँ",
        )
        results = remove_repetitions([seg])
        res = results[0]
        assert res.text == "हाँ हाँ हाँ"  # Verbatim
        assert res.processed_text == "हाँ"  # Untranslated!
        assert res.repetition_modified is True
        assert res.repetition_type == RepetitionType.CONSECUTIVE_WORD

    # 11. Spanish repetition
    def test_spanish_repetition(self):
        seg = TranscriptSegment(
            sequence=2,
            speaker="Harshit Pambhar",
            text="Aló, aló, aló, aló.",
            classification=SegmentClassification.POSSIBLE_REPETITION,
        )
        results = remove_repetitions([seg])
        res = results[0]
        assert res.text == "Aló, aló, aló, aló."
        assert res.processed_text == "Aló."
        assert res.repetition_modified is True
        assert res.repetition_type == RepetitionType.CONSECUTIVE_WORD

    # 12. mixed-language repetition
    def test_mixed_language_repetition(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Dev",
            text="ready ready भाई",
        )
        results = remove_repetitions([seg])
        res = results[0]
        assert res.text == "ready ready भाई"
        assert res.processed_text == "ready भाई"
        assert res.repetition_modified is True
        assert res.repetition_type == RepetitionType.CONSECUTIVE_WORD

    # 13. punctuation differences
    def test_punctuation_differences(self):
        seg1 = TranscriptSegment(
            sequence=1,
            speaker="Alice",
            text="Ready, ready.",
        )
        seg2 = TranscriptSegment(
            sequence=2,
            speaker="Alice",
            text="API testing, API testing.",
        )
        results = remove_repetitions([seg1, seg2])

        assert results[0].processed_text == "Ready."
        assert results[0].repetition_modified is True

        assert results[1].processed_text == "API testing."
        assert results[1].repetition_modified is True

    # 14. case differences
    def test_case_differences(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Alice",
            text="Ready READY ready.",
        )
        results = remove_repetitions([seg])
        res = results[0]
        assert res.text == "Ready READY ready."
        assert res.processed_text == "Ready."
        assert res.repetition_modified is True

    # 15. empty text
    def test_empty_text(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="System",
            text="",
        )
        results = remove_repetitions([seg])
        res = results[0]
        assert res.text == ""
        assert res.processed_text == ""
        assert res.repetition_modified is False
        assert res.is_duplicate is False

    # 16. one-word segment
    def test_one_word_segment(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Alice",
            text="Hello",
        )
        results = remove_repetitions([seg])
        res = results[0]
        assert res.text == "Hello"
        assert res.processed_text == "Hello"
        assert res.repetition_modified is False
        assert res.repetition_type == RepetitionType.NONE

    # 17. unrelated consecutive segments
    def test_unrelated_consecutive_segments(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Alice",
                text="The frontend PR has been merged.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Alice",
                text="Now we can start the integration testing.",
            ),
        ]
        results = remove_repetitions(segments)
        assert results[0].is_duplicate is False
        assert results[0].repetition_modified is False
        assert results[1].is_duplicate is False
        assert results[1].repetition_modified is False

    # 18. duplicates separated by another speaker
    def test_duplicates_separated_by_another_speaker(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="Database connection is failing.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="Wait, let me check the error logs.",
            ),
            TranscriptSegment(
                sequence=3,
                speaker="Harshit Pambhar",
                text="Database connection is failing.",
            ),
        ]
        results = remove_repetitions(segments)
        assert len(results) == 3

        # Because Sarthak spoke in segment 2, segment 3 is intentional reiteration
        assert results[2].sequence == 3
        assert results[2].speaker == "Harshit Pambhar"
        assert results[2].text == "Database connection is failing."
        assert results[2].processed_text == "Database connection is failing."
        assert results[2].is_duplicate is False
        assert results[2].duplicate_of_sequence is None
        assert results[2].repetition_modified is False

    # Invariants verification
    def test_invariants_preservation(self):
        input_segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Speaker A",
                text="Initial message.",
                classification=SegmentClassification.CLEAN,
                confidence=0.99,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Speaker B",
                text="done done done.",
                classification=SegmentClassification.POSSIBLE_REPETITION,
                confidence=0.95,
            ),
            TranscriptSegment(
                sequence=3,
                speaker="Speaker B",
                text="done done done.",
                classification=SegmentClassification.POSSIBLE_REPETITION,
                confidence=0.95,
            ),
        ]

        results = remove_repetitions(input_segments)

        # Invariant 1: sequence numbers are identical and in original order
        assert [s.sequence for s in results] == [1, 2, 3]

        # Invariant 2: speakers are identical
        assert [s.speaker for s in results] == ["Speaker A", "Speaker B", "Speaker B"]

        # Invariant 3: original raw text is 100% untouched
        assert [s.text for s in results] == [
            "Initial message.",
            "done done done.",
            "done done done.",
        ]

        # Invariant 4: sequence 3 is marked duplicate of sequence 2
        assert results[2].is_duplicate is True
        assert results[2].duplicate_of_sequence == 2
        assert results[2].processed_text == ""

    # Meaningful idioms preservation
    def test_idiomatic_phrases_preserved(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Lead",
                text="We will migrate the database step by step.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Lead",
                text="Vamos poco a poco con el despliegue.",
            ),
            TranscriptSegment(
                sequence=3,
                speaker="Lead",
                text="हम धीरे धीरे काम करेंगे।",
            ),
        ]
        results = remove_repetitions(segments)
        for original, processed in zip(segments, results):
            assert processed.text == original.text
            assert processed.processed_text == original.text
            assert processed.repetition_modified is False
            assert processed.repetition_type == RepetitionType.NONE

