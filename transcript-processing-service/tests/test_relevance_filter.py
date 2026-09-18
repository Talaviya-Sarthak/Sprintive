"""Unit tests for Part 4 - Pre-Meeting / Irrelevant Content Filtering."""

import pytest
from app.models.transcript import (
    RelevanceCategory,
    RepetitionType,
    SegmentClassification,
    TranscriptSegment,
)
from app.services.relevance_filter import filter_irrelevant_content


class TestRelevanceFilter:
    """Comprehensive test suite covering all 20 required scenarios and invariants."""

    # 1. Normal meeting content
    def test_01_normal_meeting_content(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="Let's review yesterday's progress.",
            processed_text="Let's review yesterday's progress.",
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.include_in_meeting is True
        assert res.filter_confidence >= 0.90
        assert res.text == "Let's review yesterday's progress."

    # 2. Pre-meeting conversation
    def test_02_pre_meeting_conversation(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="Are you joining from home?",
                processed_text="Are you joining from home?",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="Let's get started with today's standup.",
                processed_text="Let's get started with today's standup.",
            ),
        ]
        results = filter_irrelevant_content(segments)
        assert results[0].relevance == RelevanceCategory.PRE_MEETING
        assert results[0].include_in_meeting is False
        assert results[1].relevance == RelevanceCategory.MEETING_CONTENT
        assert results[1].include_in_meeting is True

    # 3. Microphone check
    def test_03_microphone_check(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Alice",
            text="Is my mic working?",
            processed_text="Is my mic working?",
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        assert res.relevance == RelevanceCategory.AUDIO_CHECK
        assert res.include_in_meeting is False
        assert res.filter_confidence >= 0.90

    # 4. "Can you hear me?"
    def test_04_can_you_hear_me(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="Can you hear me?",
            processed_text="Can you hear me?",
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        assert res.relevance == RelevanceCategory.AUDIO_CHECK
        assert res.include_in_meeting is False

    # 5. "Hello hello testing"
    def test_05_hello_hello_testing(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Bob",
            text="Hello hello testing.",
            processed_text="Hello testing.",
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        assert res.relevance == RelevanceCategory.AUDIO_CHECK
        assert res.include_in_meeting is False

    # 6. Connection setup
    def test_06_connection_setup(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Dev",
            text="Can you see my screen?",
            processed_text="Can you see my screen?",
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        assert res.relevance == RelevanceCategory.CONNECTION_CHECK
        assert res.include_in_meeting is False

    # 7. "Let's get started"
    def test_07_lets_get_started(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Scrum Master",
            text="Let's get started.",
            processed_text="Let's get started.",
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.include_in_meeting is True
        assert res.filter_confidence >= 0.95

    # 8. "Let's start the standup"
    def test_08_lets_start_the_standup(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Scrum Master",
            text="Okay team, let's start the standup.",
            processed_text="Okay team, let's start the standup.",
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.include_in_meeting is True

    # 9. Greeting that is actually part of the meeting
    def test_09_greeting_part_of_meeting(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Sarthak Talaviya",
            text="Good morning, everyone. Let's get started with today's meeting.",
            processed_text="Good morning, everyone. Let's get started with today's meeting.",
            classification=SegmentClassification.CLEAN,
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.include_in_meeting is True
        assert res.filter_confidence >= 0.95

    # 10. Short meaningful responses post-meeting start
    def test_10_short_meaningful_responses(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Scrum Master",
                text="Let's get started. Harshit, did you finish the PR?",
                processed_text="Let's get started. Harshit, did you finish the PR?",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="Yes.",
                processed_text="Yes.",
            ),
            TranscriptSegment(
                sequence=3,
                speaker="Harshit Pambhar",
                text="Done.",
                processed_text="Done.",
            ),
        ]
        results = filter_irrelevant_content(segments)
        assert results[1].relevance == RelevanceCategory.MEETING_CONTENT
        assert results[1].include_in_meeting is True
        assert results[2].relevance == RelevanceCategory.MEETING_CONTENT
        assert results[2].include_in_meeting is True

    # 11. Clearly irrelevant conversation
    def test_11_clearly_irrelevant_conversation(self):
        seg1 = TranscriptSegment(
            sequence=1,
            speaker="Dev",
            text="Did you order food?",
            processed_text="Did you order food?",
        )
        seg2 = TranscriptSegment(
            sequence=2,
            speaker="Dev",
            text="What time are we going for lunch?",
            processed_text="What time are we going for lunch?",
        )
        results = filter_irrelevant_content([seg1, seg2])
        assert results[0].relevance == RelevanceCategory.IRRELEVANT
        assert results[0].include_in_meeting is False
        assert results[1].relevance == RelevanceCategory.IRRELEVANT
        assert results[1].include_in_meeting is False

    # 12. Mixed-language content
    def test_12_mixed_language_content(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="हाँ बोल, एक minute.",
                processed_text="हाँ बोल, एक minute.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="Let's get started with today's meeting.",
                processed_text="Let's get started with today's meeting.",
            ),
        ]
        results = filter_irrelevant_content(segments)
        assert results[0].relevance == RelevanceCategory.PRE_MEETING
        assert results[0].include_in_meeting is False
        assert results[0].text == "हाँ बोल, एक minute."  # Non-translated!
        assert results[1].relevance == RelevanceCategory.MEETING_CONTENT
        assert results[1].include_in_meeting is True

    # 13. Hindi content
    def test_13_hindi_content(self):
        seg_audio = TranscriptSegment(
            sequence=1,
            speaker="Dev",
            text="मेरी आवाज़ आ रही है?",
            processed_text="मेरी आवाज़ आ रही है?",
        )
        seg_work = TranscriptSegment(
            sequence=2,
            speaker="Dev",
            text="डेटाबेस में समस्या है।",
            processed_text="डेटाबेस में समस्या है।",
        )
        results = filter_irrelevant_content([seg_audio, seg_work])
        assert results[0].relevance == RelevanceCategory.AUDIO_CHECK
        assert results[0].include_in_meeting is False
        assert results[1].relevance == RelevanceCategory.MEETING_CONTENT
        assert results[1].include_in_meeting is True

    # 14. Spanish content
    def test_14_spanish_content(self):
        seg_audio = TranscriptSegment(
            sequence=1,
            speaker="Maria",
            text="¿Me escuchan?",
            processed_text="¿Me escuchan?",
        )
        seg_work = TranscriptSegment(
            sequence=2,
            speaker="Maria",
            text="El API no responde a las peticiones del frontend.",
            processed_text="El API no responde a las peticiones del frontend.",
        )
        results = filter_irrelevant_content([seg_audio, seg_work])
        assert results[0].relevance == RelevanceCategory.AUDIO_CHECK
        assert results[0].include_in_meeting is False
        assert results[1].relevance == RelevanceCategory.MEETING_CONTENT
        assert results[1].include_in_meeting is True

    # 15. Technical discussion mentioning "connection"
    def test_15_technical_discussion_mentioning_connection(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="The API cannot connect to the production database.",
            processed_text="The API cannot connect to the production database.",
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        # Must NOT be classified as CONNECTION_CHECK!
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.include_in_meeting is True

    # 16. Audio check containing legitimate meeting information
    def test_16_audio_check_with_meeting_information(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            text="Can you hear me? I also wanted to explain the database issue.",
            processed_text="Can you hear me? I also wanted to explain the database issue.",
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        # Must be preserved because of substantive database issue!
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.include_in_meeting is True

    # 17. Uncertain content
    def test_17_uncertain_content(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="Dev",
            text="Some ambiguous phrasing here.",
            processed_text="Some ambiguous phrasing here.",
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        assert res.include_in_meeting is True
        assert res.relevance in {RelevanceCategory.UNCERTAIN, RelevanceCategory.MEETING_CONTENT}

    # 18. Empty segment
    def test_18_empty_segment(self):
        seg = TranscriptSegment(
            sequence=1,
            speaker="System",
            text="",
            processed_text="",
        )
        results = filter_irrelevant_content([seg])
        res = results[0]
        assert res.text == ""
        assert res.include_in_meeting is True
        assert res.relevance == RelevanceCategory.UNCERTAIN

    # 19. Multiple speakers
    def test_19_multiple_speakers(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="Can everyone hear me?",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="Yes. Let's get started with the sprint review.",
            ),
            TranscriptSegment(
                sequence=3,
                speaker="Alice",
                text="We deployed the new auth service.",
            ),
        ]
        results = filter_irrelevant_content(segments)
        assert results[0].relevance == RelevanceCategory.AUDIO_CHECK
        assert results[0].include_in_meeting is False
        assert results[1].relevance == RelevanceCategory.MEETING_CONTENT
        assert results[1].include_in_meeting is True
        assert results[2].relevance == RelevanceCategory.MEETING_CONTENT
        assert results[2].include_in_meeting is True

    # 20. Meeting-start context
    def test_20_meeting_start_context(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="Give me one minute.",
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="Wait, Sarthak is joining.",
            ),
            TranscriptSegment(
                sequence=3,
                speaker="Sarthak Talaviya",
                text="Good morning everyone. Let's begin today's meeting.",
            ),
            TranscriptSegment(
                sequence=4,
                speaker="Harshit Pambhar",
                text="I have one issue with the database connection.",
            ),
        ]
        results = filter_irrelevant_content(segments)

        # Segments 1 & 2 before start
        assert results[0].relevance == RelevanceCategory.PRE_MEETING
        assert results[0].include_in_meeting is False
        assert results[1].relevance == RelevanceCategory.PRE_MEETING
        assert results[1].include_in_meeting is False

        # Segments 3 & 4 at and after start
        assert results[2].relevance == RelevanceCategory.MEETING_CONTENT
        assert results[2].include_in_meeting is True
        assert results[3].relevance == RelevanceCategory.MEETING_CONTENT
        assert results[3].include_in_meeting is True

    # Preservation of Part 1, 2, and 3 metadata and invariants
    def test_invariants_and_metadata_preservation(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit Pambhar",
                text="ready ready.",
                processed_text="ready.",
                classification=SegmentClassification.POSSIBLE_REPETITION,
                confidence=0.95,
                repetition_modified=True,
                repetition_type=RepetitionType.CONSECUTIVE_WORD,
                is_duplicate=False,
                duplicate_of_sequence=None,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="Database connection is failing.",
                processed_text="",
                classification=SegmentClassification.CLEAN,
                confidence=0.99,
                repetition_modified=True,
                repetition_type=RepetitionType.EXACT_SEGMENT_DUPLICATE,
                is_duplicate=True,
                duplicate_of_sequence=1,
            ),
        ]
        results = filter_irrelevant_content(segments)
        assert len(results) == 2

        # Verify segment 1 preservation
        res1 = results[0]
        assert res1.sequence == 1
        assert res1.speaker == "Harshit Pambhar"
        assert res1.text == "ready ready."  # Verbatim Part 1!
        assert res1.classification == SegmentClassification.POSSIBLE_REPETITION  # Part 2!
        assert res1.confidence == 0.95  # Part 2!
        assert res1.processed_text == "ready."  # Part 3!
        assert res1.repetition_modified is True  # Part 3!
        assert res1.repetition_type == RepetitionType.CONSECUTIVE_WORD  # Part 3!
        assert res1.is_duplicate is False  # Part 3!

        # Verify segment 2 preservation
        res2 = results[1]
        assert res2.sequence == 2
        assert res2.speaker == "Harshit Pambhar"
        assert res2.text == "Database connection is failing."
        assert res2.is_duplicate is True
        assert res2.duplicate_of_sequence == 1
