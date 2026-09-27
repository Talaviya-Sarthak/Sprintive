"""Comprehensive unit and scenario tests for Part 13: Final Transcript Formatting.

Validates all 22 required scenarios:
1. basic formatting
2. speaker formatting
3. chronological ordering
4. filtered segments excluded
5. original text fallback
6. STT corrected text selection
7. grammar corrected text selection
8. terminology normalized text selection
9. unsafe semantic correction fallback
10. speaker suggestion not automatically applied
11. consecutive same-speaker formatting
12. merged segment formatting
13. multilingual UTF-8 output
14. empty segment handling
15. duplicate detection
16. warning generation
17. READY status
18. READY_WITH_WARNINGS status
19. BLOCKED status
20. preservation of semantic validation
21. preservation of speaker identity
22. preservation of conversation order
"""

import os
import tempfile
import pytest

from app.config.formatting import FormattingConfig
from app.models.final_transcript import FinalizationStatus
from app.models.semantic_validation import SemanticFlagType, SemanticValidationStatus
from app.models.transcript import TranscriptSegment
from app.services.transcript_formatter import format_final_transcript, save_cleaned_conversation_txt
from app.services.final_text_selector import select_final_speaker, select_final_text


class TestTranscriptFormatter:
    """Test suite covering all 22 requirements for Part 13."""

    def test_01_basic_formatting(self):
        """1. Basic formatting: Speaker Name: sentence separated by blank lines."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="Good morning, everyone. Let's start the meeting.",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="Good morning. I am ready with today's updates.",
                include_in_meeting=True,
            ),
        ]
        res = format_final_transcript(segments)
        expected = (
            "Sarthak Talaviya: Good morning, everyone. Let's start the meeting.\n\n"
            "Harshit Pambhar: Good morning. I am ready with today's updates."
        )
        assert res.transcript_text == expected
        assert len(res.segments) == 2
        assert res.included_segments == 2
        assert res.excluded_segments == 0
        assert res.status == FinalizationStatus.READY

    def test_02_speaker_formatting(self):
        """2. Speaker formatting: Authoritative validated speaker used if present; custom separators."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="First update.",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="UNKNOWN",
                validated_speaker="Harshit Pambhar",
                text="Second update.",
                include_in_meeting=True,
            ),
        ]
        config = FormattingConfig(speaker_separator=" -> ")
        res = format_final_transcript(segments, config=config)
        assert "Sarthak Talaviya -> First update." in res.transcript_text
        assert "Harshit Pambhar -> Second update." in res.transcript_text
        assert res.segments[1].speaker == "Harshit Pambhar"

    def test_03_chronological_ordering(self):
        """3. Chronological ordering: Out of order input segments are sorted chronologically."""
        segments = [
            TranscriptSegment(sequence=3, speaker="Harshit", text="Third item.", include_in_meeting=True),
            TranscriptSegment(sequence=1, speaker="Sarthak", text="First item.", include_in_meeting=True),
            TranscriptSegment(sequence=2, speaker="Harshit", text="Second item.", include_in_meeting=True),
        ]
        res = format_final_transcript(segments)
        assert res.segments[0].sequence == 1
        assert res.segments[1].sequence == 2
        assert res.segments[2].sequence == 3
        expected = "Sarthak: First item.\n\nHarshit: Second item.\n\nHarshit: Third item."
        assert res.transcript_text == expected

    def test_04_filtered_segments_excluded(self):
        """4. Filtered segments excluded: include_in_meeting=False excluded from final transcript."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak",
                text="Can everyone hear me? Audio check.",
                include_in_meeting=False,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak",
                text="Good morning, let's start the standup.",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=3,
                speaker="Harshit",
                text="I finished the auth module.",
                include_in_meeting=True,
            ),
        ]
        res = format_final_transcript(segments)
        assert "Audio check" not in res.transcript_text
        assert res.included_segments == 2
        assert res.excluded_segments == 1
        assert len(res.segments) == 2
        assert res.segments[0].sequence == 2

    def test_05_original_text_fallback(self):
        """5. Original text fallback: when no stage modified text, selects original verbatim text."""
        seg = TranscriptSegment(
            sequence=1,
            speaker="Sarthak",
            text="Original unmodified text.",
            terminology_modified=False,
            grammar_modified=False,
            stt_modified=False,
            include_in_meeting=True,
        )
        text, warnings = select_final_text(seg)
        assert text == "Original unmodified text."
        assert len(warnings) == 0

    def test_06_stt_corrected_text_selection(self):
        """6. STT corrected text selection: selects stt_corrected_text when stt_modified=True."""
        seg = TranscriptSegment(
            sequence=1,
            speaker="Harshit",
            text="We need to fix the cash issue.",
            stt_corrected_text="We need to fix the cache issue.",
            stt_modified=True,
            include_in_meeting=True,
        )
        text, warnings = select_final_text(seg)
        assert text == "We need to fix the cache issue."

    def test_07_grammar_corrected_text_selection(self):
        """7. Grammar corrected text selection: grammar_corrected_text preferred over stt_corrected_text."""
        seg = TranscriptSegment(
            sequence=1,
            speaker="Harshit",
            text="We needs to fixes the cache issue.",
            stt_corrected_text="We needs to fixes the cache issue.",
            stt_modified=True,
            grammar_corrected_text="We need to fix the cache issue.",
            grammar_modified=True,
            include_in_meeting=True,
        )
        text, warnings = select_final_text(seg)
        assert text == "We need to fix the cache issue."

    def test_08_terminology_normalized_text_selection(self):
        """8. Terminology normalized text selection: terminology_normalized_text has top priority."""
        seg = TranscriptSegment(
            sequence=1,
            speaker="Harshit",
            text="The issue is in postgres database.",
            stt_corrected_text="The issue is in postgres database.",
            stt_modified=False,
            grammar_corrected_text="The issue is in postgres database.",
            grammar_modified=False,
            terminology_normalized_text="The issue is in PostgreSQL database.",
            terminology_modified=True,
            include_in_meeting=True,
        )
        text, warnings = select_final_text(seg)
        assert text == "The issue is in PostgreSQL database."

    def test_09_unsafe_semantic_correction_fallback(self):
        """9. Unsafe semantic correction fallback: SEMANTICALLY_CHANGED falls back to original text."""
        seg = TranscriptSegment(
            sequence=1,
            speaker="Harshit",
            text="I don't have access to the database.",
            terminology_normalized_text="I have access to the database.",
            terminology_modified=True,
            semantic_status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
            semantic_flags=[SemanticFlagType.NEGATION_CHANGED],
            include_in_meeting=True,
        )
        text, warnings = select_final_text(seg)
        # Must NOT select "I have access to the database."
        assert text == "I don't have access to the database."
        assert any(w.type == "SEMANTIC_CHANGE_FALLBACK" for w in warnings)

    def test_10_speaker_suggestion_not_automatically_applied(self):
        """10. Speaker suggestion not automatically applied: suggested_speaker does NOT replace speaker."""
        seg = TranscriptSegment(
            sequence=1,
            speaker="Harshit Pambhar",
            suggested_speaker="Sarthak Talaviya",
            text="I will check the logs.",
            include_in_meeting=True,
        )
        speaker = select_final_speaker(seg)
        assert speaker == "Harshit Pambhar"
        assert speaker != "Sarthak Talaviya"

    def test_11_consecutive_same_speaker_formatting(self):
        """11. Consecutive same-speaker formatting: combines consecutive turns when enabled."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Sarthak", text="Good morning everyone.", include_in_meeting=True),
            TranscriptSegment(sequence=2, speaker="Sarthak", text="Let's get started.", include_in_meeting=True),
            TranscriptSegment(sequence=3, speaker="Harshit", text="I'm ready.", include_in_meeting=True),
        ]
        config = FormattingConfig(combine_consecutive_speaker_turns=True)
        res = format_final_transcript(segments, config=config)
        assert len(res.segments) == 2
        assert res.segments[0].speaker == "Sarthak"
        assert res.segments[0].text == "Good morning everyone. Let's get started."
        assert res.segments[1].speaker == "Harshit"
        assert res.segments[1].text == "I'm ready."

    def test_12_merged_segment_formatting(self):
        """12. Merged segment formatting: uses min(source_sequences) to preserve chronological position."""
        segments = [
            TranscriptSegment(
                sequence=4,
                source_sequences=[1, 2],
                speaker="Sarthak",
                text="Good morning everyone, let's start the standup.",
                merged=True,
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=3,
                speaker="Harshit",
                text="Yes, let's start.",
                include_in_meeting=True,
            ),
        ]
        res = format_final_transcript(segments)
        # Since merged segment has source_sequences=[1, 2], it should sort before sequence 3
        assert res.segments[0].speaker == "Sarthak"
        assert res.segments[1].speaker == "Harshit"

    def test_13_multilingual_utf8_output(self):
        """13. Multilingual UTF-8 output: preserves Hindi, Spanish, and code-switching without corruption."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit",
                text="हाँ बोल, database connection check कर.",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=2,
                speaker="Carlos",
                text="Hola equipo, ¿cómo están?",
                include_in_meeting=True,
            ),
        ]
        res = format_final_transcript(segments)
        assert "हाँ बोल, database connection check कर." in res.transcript_text
        assert "Hola equipo, ¿cómo están?" in res.transcript_text

        # Test writing to file with UTF-8
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = os.path.join(tmpdir, "cleaned_conversation.txt")
            save_cleaned_conversation_txt(res.transcript_text, file_path)
            assert os.path.exists(file_path)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            assert "हाँ बोल, database connection check कर." in content
            assert "Hola equipo, ¿cómo están?" in content

    def test_14_empty_segment_handling(self):
        """14. Empty segment handling: segment with whitespace/empty text is safely skipped."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Sarthak", text="Hello.", include_in_meeting=True),
            TranscriptSegment(sequence=2, speaker="Harshit", text="   ", include_in_meeting=True),
            TranscriptSegment(sequence=3, speaker="Carlos", text="Ready.", include_in_meeting=True),
        ]
        res = format_final_transcript(segments)
        assert len(res.segments) == 2
        assert res.segments[0].speaker == "Sarthak"
        assert res.segments[1].speaker == "Carlos"
        assert any(w.type == "EMPTY_SEGMENT_SKIPPED" for w in res.warnings)

    def test_15_duplicate_detection(self):
        """15. Duplicate detection: flags duplicate sequence numbers or identical adjacent segments."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Sarthak", text="Good morning.", include_in_meeting=True),
            TranscriptSegment(sequence=2, speaker="Sarthak", text="Good morning.", include_in_meeting=True),
        ]
        res = format_final_transcript(segments)
        assert any(w.type == "DUPLICATE_SEGMENT" for w in res.warnings)
        assert res.status == FinalizationStatus.READY_WITH_WARNINGS

    def test_16_warning_generation(self):
        """16. Warning generation: captures warnings with sequence, type, and message."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit",
                text="The issue is in PostgreSQL.",
                terminology_normalized_text="The issue is in Supabase.",
                semantic_status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
                semantic_flags=[SemanticFlagType.TECHNICAL_ENTITY_CHANGED],
                include_in_meeting=True,
            )
        ]
        res = format_final_transcript(segments)
        assert len(res.warnings) >= 1
        w = res.warnings[0]
        assert w.sequence == 1
        assert w.type == "SEMANTIC_CHANGE_FALLBACK"
        assert "PostgreSQL" in res.transcript_text

    def test_17_ready_status(self):
        """17. READY status: valid clean transcript yields READY status."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Sarthak", text="Standup started.", include_in_meeting=True),
            TranscriptSegment(sequence=2, speaker="Harshit", text="Everything is on track.", include_in_meeting=True),
        ]
        res = format_final_transcript(segments)
        assert res.status == FinalizationStatus.READY
        assert len(res.warnings) == 0

    def test_18_ready_with_warnings_status(self):
        """18. READY_WITH_WARNINGS status: minor warnings (e.g. possible semantic change) yield READY_WITH_WARNINGS."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit",
                text="The issue may be related to the connection pool.",
                terminology_normalized_text="The issue is related to the connection pool.",
                semantic_status=SemanticValidationStatus.POSSIBLE_SEMANTIC_CHANGE,
                semantic_flags=[SemanticFlagType.CERTAINTY_CHANGED],
                include_in_meeting=True,
            )
        ]
        res = format_final_transcript(segments)
        assert res.status == FinalizationStatus.READY_WITH_WARNINGS
        assert len(res.warnings) >= 1

    def test_19_blocked_status(self):
        """19. BLOCKED status: block_on_critical_semantic_change triggers BLOCKED when fallback is disabled."""
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Harshit",
                text="We have 3 blockers.",
                terminology_normalized_text="We have 5 blockers.",
                semantic_status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
                semantic_flags=[SemanticFlagType.QUANTITY_CHANGED],
                include_in_meeting=True,
            )
        ]
        config = FormattingConfig(
            block_on_critical_semantic_change=True,
            fallback_on_semantic_change=False,
        )
        res = format_final_transcript(segments, config=config)
        assert res.status == FinalizationStatus.BLOCKED
        assert any(w.type == "CRITICAL_SEMANTIC_CHANGE_BLOCKED" for w in res.warnings)

    def test_20_preservation_of_semantic_validation(self):
        """20. Preservation of semantic validation: does not mutate internal validation metadata on input segments."""
        original_flags = [SemanticFlagType.NEGATION_CHANGED]
        seg = TranscriptSegment(
            sequence=1,
            speaker="Harshit",
            text="I don't have access.",
            semantic_status=SemanticValidationStatus.SEMANTICALLY_CHANGED,
            semantic_flags=list(original_flags),
            include_in_meeting=True,
        )
        _ = format_final_transcript([seg])
        assert seg.semantic_status == SemanticValidationStatus.SEMANTICALLY_CHANGED
        assert seg.semantic_flags == original_flags

    def test_21_preservation_of_speaker_identity(self):
        """21. Preservation of speaker identity: original speaker is strictly preserved."""
        segments = [
            TranscriptSegment(sequence=1, speaker="Sarthak Talaviya", text="Hello.", include_in_meeting=True),
            TranscriptSegment(sequence=2, speaker="Harshit Pambhar", text="Hi.", include_in_meeting=True),
        ]
        res = format_final_transcript(segments)
        assert res.segments[0].speaker == "Sarthak Talaviya"
        assert res.segments[1].speaker == "Harshit Pambhar"

    def test_22_preservation_of_conversation_order(self):
        """22. Preservation of conversation order: conversation turn order is preserved in output."""
        segments = [
            TranscriptSegment(sequence=1, speaker="A", text="First", include_in_meeting=True),
            TranscriptSegment(sequence=2, speaker="B", text="Second", include_in_meeting=True),
            TranscriptSegment(sequence=3, speaker="C", text="Third", include_in_meeting=True),
            TranscriptSegment(sequence=4, speaker="D", text="Fourth", include_in_meeting=True),
        ]
        res = format_final_transcript(segments)
        assert [s.sequence for s in res.segments] == [1, 2, 3, 4]
        assert [s.speaker for s in res.segments] == ["A", "B", "C", "D"]
        expected_turns = ["A: First", "B: Second", "C: Third", "D: Fourth"]
        assert res.transcript_text == "\n\n".join(expected_turns)
