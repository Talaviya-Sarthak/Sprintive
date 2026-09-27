"""Unit tests for Part 5 - Sentence Segmentation & Fragment Merging."""

import pytest
from app.models.transcript import (
    RelevanceCategory,
    RepetitionType,
    SegmentClassification,
    TranscriptSegment,
)
from app.services.fragment_merger import merge_fragments


class TestFragmentMerger:
    """Comprehensive test suite covering all 20 required scenarios, traceability, and invariants."""

    # 1. Two obvious sentence fragments
    def test_01_two_obvious_sentence_fragments(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="Today we'll",
                processed_text="Today we'll",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="review the API.",
                processed_text="review the API.",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 1
        res = results[0]
        assert res.sequence == 1
        assert res.source_sequences == [1, 2]
        assert res.speaker == "Sarthak Talaviya"
        assert res.text == "Today we'll review the API."
        assert res.processed_text == "Today we'll review the API."
        assert res.merged is True

    # 2. Three-fragment sentence
    def test_02_three_fragment_sentence(self):
        segments = [
            TranscriptSegment(
                sequence=11,
                speaker="Sarthak Talaviya",
                text="Before we begin,",
                processed_text="Before we begin,",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=12,
                speaker="Sarthak Talaviya",
                text="does anyone have any blockers",
                processed_text="does anyone have any blockers",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=13,
                speaker="Sarthak Talaviya",
                text="from yesterday?",
                processed_text="from yesterday?",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 1
        res = results[0]
        assert res.sequence == 11
        assert res.source_sequences == [11, 12, 13]
        assert res.text == "Before we begin, does anyone have any blockers from yesterday?"
        assert res.processed_text == "Before we begin, does anyone have any blockers from yesterday?"
        assert res.merged is True

    # 3. Same-speaker complete sentences (MUST NOT MERGE!)
    def test_03_same_speaker_complete_sentences(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="Yesterday we completed the API.",
                processed_text="Yesterday we completed the API.",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="Today I will work on testing.",
                processed_text="Today I will work on testing.",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 2
        assert results[0].text == "Yesterday we completed the API."
        assert results[0].source_sequences == [1]
        assert results[0].merged is False

        assert results[1].text == "Today I will work on testing."
        assert results[1].source_sequences == [2]
        assert results[1].merged is False

    # 4. Different speakers (MUST NOT MERGE!)
    def test_04_different_speakers_never_merge(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="I have one issue with the database",
                processed_text="I have one issue with the database",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="What issue are you facing?",
                processed_text="What issue are you facing?",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 2
        assert results[0].speaker == "Sarthak Talaviya"
        assert results[0].merged is False
        assert results[1].speaker == "Harshit Pambhar"
        assert results[1].merged is False

    # 5. Hindi fragments
    def test_05_hindi_fragments(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="हाँ, मैं database",
                processed_text="हाँ, मैं database",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="connection देख रहा हूँ.",
                processed_text="connection देख रहा हूँ.",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 1
        res = results[0]
        assert res.source_sequences == [1, 2]
        assert res.text == "हाँ, मैं database connection देख रहा हूँ."
        assert res.processed_text == "हाँ, मैं database connection देख रहा हूँ."
        assert res.merged is True

    # 6. Spanish fragments
    def test_06_spanish_fragments(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Maria",
                text="Vamos a revisar",
                processed_text="Vamos a revisar",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Maria",
                text="el progreso del sprint.",
                processed_text="el progreso del sprint.",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 1
        res = results[0]
        assert res.source_sequences == [1, 2]
        assert res.text == "Vamos a revisar el progreso del sprint."
        assert res.processed_text == "Vamos a revisar el progreso del sprint."
        assert res.merged is True

    # 7. Mixed-language fragments
    def test_07_mixed_language_fragments(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="I have one issue with database connection",
                processed_text="I have one issue with database connection",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="जो API testing को affect कर रहा है.",
                processed_text="जो API testing को affect कर रहा है.",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 1
        res = results[0]
        assert res.source_sequences == [1, 2]
        assert (
            res.text
            == "I have one issue with database connection जो API testing को affect कर रहा है."
        )
        assert res.merged is True

    # 8. Punctuation-ending fragments (comma ending)
    def test_08_punctuation_ending_fragments(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Lead",
                text="If the tests pass,",
                processed_text="If the tests pass,",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Lead",
                text="we will deploy today.",
                processed_text="we will deploy today.",
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 1
        assert results[0].text == "If the tests pass, we will deploy today."
        assert results[0].merged is True

    # 9. Fragments without punctuation
    def test_09_fragments_without_punctuation(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="I have one issue with the database",
                processed_text="I have one issue with the database",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="connection that is affecting the API testing.",
                processed_text="connection that is affecting the API testing.",
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 1
        assert (
            results[0].text
            == "I have one issue with the database connection that is affecting the API testing."
        )
        assert results[0].merged is True

    # 10. Empty segment
    def test_10_empty_segment(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Alice",
                text="",
                processed_text="",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Alice",
                text="Starting now.",
                processed_text="Starting now.",
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 2
        assert results[0].text == ""
        assert results[0].merged is False
        assert results[1].text == "Starting now."

    # 11. Whitespace-only segment
    def test_11_whitespace_only_segment(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Alice",
                text="   ",
                processed_text="   ",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Alice",
                text="Starting now.",
                processed_text="Starting now.",
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 2
        assert results[0].merged is False

    # 12. Already complete sentence
    def test_12_already_complete_sentence(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Alice",
            text="The API endpoints have been verified.",
            processed_text="The API endpoints have been verified.",
            include_in_meeting=True,
        )
        results = merge_fragments([seg])
        assert len(results) == 1
        assert results[0].source_sequences == [1]
        assert results[0].merged is False

    # 13. Two consecutive but unrelated sentences
    def test_13_two_consecutive_unrelated_sentences(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Bob",
                text="We deployed the auth service yesterday.",
                processed_text="We deployed the auth service yesterday.",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Bob",
                text="Can anyone help review the payments PR?",
                processed_text="Can anyone help review the payments PR?",
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 2
        assert results[0].merged is False
        assert results[1].merged is False

    # 14. Filtered segment (include_in_meeting == False must NOT merge)
    def test_14_filtered_segment_not_merged(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="Can you hear me?",
                processed_text="Can you hear me?",
                relevance=RelevanceCategory.AUDIO_CHECK,
                include_in_meeting=False,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="I have an issue with the database.",
                processed_text="I have an issue with the database.",
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 2
        assert results[0].include_in_meeting is False
        assert results[0].merged is False
        assert results[0].source_sequences == [1]

        assert results[1].include_in_meeting is True
        assert results[1].merged is False
        assert results[1].source_sequences == [2]

    # 15. Multiple merged groups in one transcript
    def test_15_multiple_merged_groups_in_one_transcript(self):
        segments = [
            # Group 1 (Sarthak): seq 1, 2
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak",
                text="Let's start",
                processed_text="Let's start",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak",
                text="the meeting.",
                processed_text="the meeting.",
                include_in_meeting=True,
            ),
            # Single statement (Harshit): seq 3
            TranscriptSegment(
                sequence=3,
                speaker="Harshit",
                text="Sure.",
                processed_text="Sure.",
                include_in_meeting=True,
            ),
            # Group 2 (Harshit): seq 4, 5
            TranscriptSegment(
                sequence=4,
                speaker="Harshit",
                text="I worked on",
                processed_text="I worked on",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=5,
                speaker="Harshit",
                text="the payment gateway.",
                processed_text="the payment gateway.",
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 3

        # Group 1
        assert results[0].text == "Let's start the meeting."
        assert results[0].source_sequences == [1, 2]
        assert results[0].merged is True

        # Group 2 (single)
        assert results[1].text == "Sure."
        assert results[1].source_sequences == [3]
        assert results[1].merged is False

        # Group 3
        assert results[2].text == "I worked on the payment gateway."
        assert results[2].source_sequences == [4, 5]
        assert results[2].merged is True

    # 16. Repeated words from Part 3 preserved when merged
    def test_16_repeated_words_preserved_in_merge(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="ready ready.",
                processed_text="ready.",
                repetition_modified=True,
                repetition_type=RepetitionType.CONSECUTIVE_WORD,
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="for deployment.",
                processed_text="for deployment.",
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 1
        res = results[0]
        assert res.text == "ready ready. for deployment."
        assert res.processed_text == "ready. for deployment."
        assert res.repetition_modified is True
        assert res.repetition_type == RepetitionType.CONSECUTIVE_WORD
        assert res.source_sequences == [1, 2]
        assert res.merged is True

    # 17. Source sequence preservation
    def test_17_source_sequence_preservation(self):
        segments = [
            TranscriptSegment(
                sequence=101,
                speaker="Alice",
                text="Part one of",
                processed_text="Part one of",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=102,
                speaker="Alice",
                text="the conversation.",
                processed_text="the conversation.",
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert results[0].sequence == 101
        assert results[0].source_sequences == [101, 102]

    # 18. Metadata preservation
    def test_18_metadata_preservation(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Bob",
                text="Before we deploy,",
                processed_text="Before we deploy,",
                classification=SegmentClassification.CLEAN,
                confidence=0.98,
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
                filter_confidence=0.99,
                filter_reason="Work item",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Bob",
                text="we should verify the logs.",
                processed_text="we should verify the logs.",
                classification=SegmentClassification.CLEAN,
                confidence=0.99,
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
                filter_confidence=0.99,
                filter_reason="Work item",
            ),
        ]
        results = merge_fragments(segments)
        res = results[0]
        assert res.classification == SegmentClassification.CLEAN
        assert res.confidence == 0.99
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.include_in_meeting is True
        assert res.filter_confidence == 0.99
        assert res.merged is True

    # 19. Original speaker preservation
    def test_19_original_speaker_preservation(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="Reviewing the",
                processed_text="Reviewing the",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="pipeline status.",
                processed_text="pipeline status.",
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert results[0].speaker == "Sarthak Talaviya"

    # 20. Ordering preservation
    def test_20_ordering_preservation(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Speaker A",
                text="First fragment of",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Speaker A",
                text="sentence one.",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=3,
                speaker="Speaker B",
                text="Second speaker here.",
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 2
        assert results[0].sequence == 1
        assert results[1].sequence == 3
        assert results[0].source_sequences == [1, 2]
        assert results[1].source_sequences == [3]

    # Critical Test: No word correction or hallucination
    def test_critical_no_word_alteration_or_correction(self):
        """
        Critical Test from prompt:
        Given:
        Segment 10:
        speaker = "Sarthak Talaviya"
        text = "I will start my quick"

        Segment 11:
        speaker = "Sarthak Talaviya"
        text = "giving a quick update on the back end work."

        Part 5 must produce:
        "I will start my quick giving a quick update on the back end work."

        It MUST NOT produce:
        "I will start by giving a quick update on the backend work."
        """
        segments = [
            TranscriptSegment(
                sequence=10,
                speaker="Sarthak Talaviya",
                text="I will start my quick",
                processed_text="I will start my quick",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=11,
                speaker="Sarthak Talaviya",
                text="giving a quick update on the back end work.",
                processed_text="giving a quick update on the back end work.",
                include_in_meeting=True,
            ),
        ]
        results = merge_fragments(segments)
        assert len(results) == 1
        res = results[0]

        expected = "I will start my quick giving a quick update on the back end work."
        assert res.text == expected
        assert res.processed_text == expected
        assert res.source_sequences == [10, 11]
        assert res.merged is True

        # Explicitly verify NO rewriting of "my quick" -> "by" or "back end" -> "backend"
        assert "by giving" not in res.text
        assert "backend" not in res.text
