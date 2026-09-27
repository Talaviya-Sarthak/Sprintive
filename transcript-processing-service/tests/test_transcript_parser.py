import pytest
from app.services.transcript_parser import parse_transcript, parse_transcript_line
from app.models.transcript import ParsedTranscript, TranscriptSegment


class TestTranscriptParser:
    """Comprehensive unit test suite for Sprintive Transcript Parser (Module 1)."""

    def test_01_normal_english(self):
        """Test 1: Normal English dialogue parsed into speaker and text."""
        raw_input = "Sarthak Talaviya: Good morning everyone."
        result = parse_transcript(raw_input, meeting_id="m_001")

        assert len(result.segments) == 1
        segment = result.segments[0]
        assert segment.sequence == 1
        assert segment.speaker == "Sarthak Talaviya"
        assert segment.text == "Good morning everyone."

    def test_02_hindi_preservation(self):
        """Test 2: Hindi dialogue preserved exactly with all Unicode characters."""
        raw_input = "Harshit Pambhar: हाँ बोल"
        result = parse_transcript(raw_input, meeting_id="m_002")

        assert len(result.segments) == 1
        segment = result.segments[0]
        assert segment.speaker == "Harshit Pambhar"
        assert segment.text == "हाँ बोल"

    def test_03_spanish_preservation(self):
        """Test 3: Spanish dialogue preserved with inverted question mark and accents."""
        raw_input = "Sarthak Talaviya: ¿Aló?"
        result = parse_transcript(raw_input, meeting_id="m_003")

        assert len(result.segments) == 1
        segment = result.segments[0]
        assert segment.speaker == "Sarthak Talaviya"
        assert segment.text == "¿Aló?"

    def test_04_mixed_language(self):
        """Test 4: Mixed-language (Hinglish) dialogue preserved intact without translation."""
        raw_input = "Harshit Pambhar: हाँ backend ready है."
        result = parse_transcript(raw_input, meeting_id="m_004")

        assert len(result.segments) == 1
        segment = result.segments[0]
        assert segment.speaker == "Harshit Pambhar"
        assert segment.text == "हाँ backend ready है."

    def test_05_colon_inside_dialogue(self):
        """Test 5: Splits only on first colon; colons in dialogue text are preserved."""
        raw_input = "Sarthak Talaviya: The time is 10:30."
        result = parse_transcript(raw_input, meeting_id="m_005")

        assert len(result.segments) == 1
        segment = result.segments[0]
        assert segment.speaker == "Sarthak Talaviya"
        assert segment.text == "The time is 10:30."

    def test_06_repeated_words_and_stt_anomalies(self):
        """Test 6: Repeated words and STT spelling/grammar anomalies are NOT cleaned."""
        raw_input = "Sarthak Talaviya: ready ready. Advoid?"
        result = parse_transcript(raw_input, meeting_id="m_006")

        assert len(result.segments) == 1
        segment = result.segments[0]
        assert segment.speaker == "Sarthak Talaviya"
        # Must preserve 'ready ready. Advoid?' exactly without autocorrecting to 'Ready. Avoid?'
        assert segment.text == "ready ready. Advoid?"

    def test_07_consecutive_same_speaker(self):
        """Test 7: Consecutive segments from the same speaker remain distinct (not merged)."""
        raw_input = "Sarthak Talaviya: Hello.\nSarthak Talaviya: Let's start."
        result = parse_transcript(raw_input, meeting_id="m_007")

        assert len(result.segments) == 2
        assert result.segments[0].sequence == 1
        assert result.segments[0].speaker == "Sarthak Talaviya"
        assert result.segments[0].text == "Hello."

        assert result.segments[1].sequence == 2
        assert result.segments[1].speaker == "Sarthak Talaviya"
        assert result.segments[1].text == "Let's start."

    def test_08_multiple_speakers_sequence(self):
        """Test 8: Multiple speakers have monotonically increasing sequence numbers."""
        raw_input = (
            "Sarthak Talaviya: Good morning, everyone. Let's get started with today's meeting.\n"
            "Harshit Pambhar: I have one issue with the database connection that is affecting the API testing.\n"
            "Sarthak Talaviya: Understood, let's take a look."
        )
        result = parse_transcript(raw_input, meeting_id="m_008")

        assert len(result.segments) == 3
        assert [s.sequence for s in result.segments] == [1, 2, 3]
        assert result.segments[0].speaker == "Sarthak Talaviya"
        assert result.segments[1].speaker == "Harshit Pambhar"
        assert result.segments[2].speaker == "Sarthak Talaviya"

    def test_09_empty_and_whitespace_lines(self):
        """Test 9: Completely empty and whitespace-only lines do not generate segments."""
        raw_input = (
            "Sarthak Talaviya: Hello.\n"
            "\n"
            "   \n"
            "\t\n"
            "Harshit Pambhar: Hi.\n"
            "\n"
        )
        result = parse_transcript(raw_input, meeting_id="m_009")

        assert len(result.segments) == 2
        assert result.segments[0].sequence == 1
        assert result.segments[0].speaker == "Sarthak Talaviya"
        assert result.segments[0].text == "Hello."

        assert result.segments[1].sequence == 2
        assert result.segments[1].speaker == "Harshit Pambhar"
        assert result.segments[1].text == "Hi."

    def test_10_malformed_line_not_lost(self):
        """Test 10: Malformed lines without colon are preserved as UNKNOWN and emit warnings."""
        raw_input = (
            "Sarthak Talaviya: Hello team.\n"
            "[Unintelligible background chatter or STT artifact]\n"
            "Harshit Pambhar: Let's proceed."
        )
        result = parse_transcript(raw_input, meeting_id="m_010")

        # Crucial check: 3 segments, content not silently dropped
        assert len(result.segments) == 3
        assert result.segments[0].speaker == "Sarthak Talaviya"
        assert result.segments[0].text == "Hello team."

        # Segment 2 is preserved with UNKNOWN speaker
        assert result.segments[1].sequence == 2
        assert result.segments[1].speaker == "UNKNOWN"
        assert result.segments[1].text == "[Unintelligible background chatter or STT artifact]"

        assert result.segments[2].sequence == 3
        assert result.segments[2].speaker == "Harshit Pambhar"
        assert result.segments[2].text == "Let's proceed."

        # Warnings are captured
        assert len(result.warnings) == 1
        assert "malformed" in result.warnings[0].lower()

    def test_empty_string_input(self):
        """Test edge case: Empty input string returns empty ParsedTranscript."""
        result = parse_transcript("", meeting_id="empty_meet")
        assert result.meeting_id == "empty_meet"
        assert result.segments == []
        assert result.warnings == []

    def test_multiple_colons_in_text(self):
        """Test edge case: Multiple colons in text (e.g. URLs, JSON-like text, timestamps)."""
        raw_input = "Harshit Pambhar: Visit https://example.com/api:8080 at 12:45:00"
        result = parse_transcript(raw_input, meeting_id="m_colons")

        assert len(result.segments) == 1
        assert result.segments[0].speaker == "Harshit Pambhar"
        assert result.segments[0].text == "Visit https://example.com/api:8080 at 12:45:00"
