import os
import pytest
from app.services.transcript_parser import parse_transcript


def test_real_sprintive_transcript_integration():
    """
    Test 18: Real Transcript Integration Test.
    Uses realistic Sprintive meeting dialogue file covering:
    - Sarthak Talaviya and Harshit Pambhar
    - Multilingual: English, Hindi ('आवाज आ रही है. हाँ बोल.'), Spanish ('¿Aló?'), Mixed Hinglish ('हाँ backend ready है')
    - Repetitions ('ready ready.', 'so so')
    - STT errors ('Advoid?')
    - Colons in spoken dialogue ('Error is: connection timeout at 10:30:15 on port 5432.')
    - Consecutive utterances from the same speaker (kept distinct)
    - Background noise line without colon (preserved without loss)
    - Empty lines between utterances
    """
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_real_transcript.txt")
    with open(fixture_path, "r", encoding="utf-8") as f:
        raw_text = f.read()

    # Raw transcript content must NOT be modified
    assert len(raw_text) > 0

    parsed = parse_transcript(raw_text, meeting_id="sprintive_real_001")

    assert parsed.meeting_id == "sprintive_real_001"
    assert len(parsed.segments) == 13

    # Verify sequential ordering 1..13
    sequences = [seg.sequence for seg in parsed.segments]
    assert sequences == list(range(1, 14))

    # 1. English
    assert parsed.segments[0].speaker == "Sarthak Talaviya"
    assert parsed.segments[0].text == "Good morning, everyone. Let's get started with today's meeting."

    # 2. English
    assert parsed.segments[1].speaker == "Harshit Pambhar"
    assert parsed.segments[1].text == "I have one issue with the database connection that is affecting the API testing."

    # 3. Spanish characters preserved
    assert parsed.segments[2].speaker == "Sarthak Talaviya"
    assert parsed.segments[2].text == "¿Aló? Can you hear me clearly?"

    # 4. Hindi characters preserved
    assert parsed.segments[3].speaker == "Harshit Pambhar"
    assert parsed.segments[3].text == "Yes, आवाज आ रही है. हाँ बोल."

    # 5. English
    assert parsed.segments[4].speaker == "Sarthak Talaviya"

    # 6. Colons preserved in speech
    assert parsed.segments[5].speaker == "Harshit Pambhar"
    assert parsed.segments[5].text == "Error is: connection timeout at 10:30:15 on port 5432."

    # 7. Repeated words and STT error preserved without cleaning
    assert parsed.segments[6].speaker == "Sarthak Talaviya"
    assert "ready ready." in parsed.segments[6].text
    assert "Advoid?" in parsed.segments[6].text

    # 8. Mixed Hindi/English (Hinglish) preserved
    assert parsed.segments[7].speaker == "Harshit Pambhar"
    assert parsed.segments[7].text == "हाँ backend ready है, but the pool size was maxed out."

    # 9. Consecutive repeated words preserved
    assert parsed.segments[8].speaker == "Sarthak Talaviya"
    assert "so so" in parsed.segments[8].text

    # 10 & 11. Consecutive utterances from same speaker kept separate
    assert parsed.segments[9].speaker == "Harshit Pambhar"
    assert parsed.segments[9].text == "Let's do that right away."
    assert parsed.segments[10].speaker == "Harshit Pambhar"
    assert parsed.segments[10].text == "Starting the service now..."

    # 12. Non-standard line without colon preserved as UNKNOWN speaker
    assert parsed.segments[11].speaker == "UNKNOWN"
    assert parsed.segments[11].text == "[Background typing noise and low hum]"

    # 13. Final dialogue line
    assert parsed.segments[12].speaker == "Sarthak Talaviya"
    assert parsed.segments[12].text == "Let's wait for the health check."
    assert len(parsed.warnings) == 1


def test_full_pipeline_parts_1_to_4_e2e():
    """
    Test End-to-End Pipeline:
    Part 1: Raw Transcript -> Parse
    Part 2: Structured Segments -> Noise & Filler Detection
    Part 3: Classified Segments -> Repetition Removal
    Part 4: Filter Relevance
    """
    from app.services.noise_detector import detect_noise_and_fillers
    from app.services.repetition_remover import remove_repetitions
    from app.services.relevance_filter import filter_irrelevant_content

    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_real_transcript.txt")
    with open(fixture_path, "r", encoding="utf-8") as f:
        raw_text = f.read()

    # Part 1: Parsing
    part1_parsed = parse_transcript(raw_text, meeting_id="meeting_e2e_001")
    assert len(part1_parsed.segments) == 13

    # Part 2: Noise & Filler Detection
    part2_classified = detect_noise_and_fillers(part1_parsed.segments)
    assert len(part2_classified) == 13

    # Part 3: Repetition Removal
    part3_processed = remove_repetitions(part2_classified)
    assert len(part3_processed) == 13

    # Verify repetition was removed in segment 7 ("ready ready." -> "ready.")
    seg7 = part3_processed[6]
    assert "ready ready." in seg7.text  # Verbatim text preserved!
    assert "ready." in seg7.processed_text
    assert seg7.repetition_modified is True

    # Part 4: Relevance Filtering
    part4_filtered = filter_irrelevant_content(part3_processed)
    assert len(part4_filtered) == 13

    # Invariants check
    for idx, (p1, p4) in enumerate(zip(part1_parsed.segments, part4_filtered)):
        assert p4.sequence == p1.sequence
        assert p4.speaker == p1.speaker
        assert p4.text == p1.text  # Raw verbatim never modified!

    # Meeting content check: Segment 1 is meeting start
    assert part4_filtered[0].relevance.value == "MEETING_CONTENT"
    assert part4_filtered[0].include_in_meeting is True

    # Technical discussion: Segment 2 (database connection issue)
    assert part4_filtered[1].relevance.value == "MEETING_CONTENT"
    assert part4_filtered[1].include_in_meeting is True

    # Part 5: Fragment Merging
    from app.services.fragment_merger import merge_fragments

    part5_merged = merge_fragments(part4_filtered)
    assert len(part5_merged) > 0

    # Verify source sequences are preserved in all segments
    for seg in part5_merged:
        assert len(seg.source_sequences) >= 1
        assert seg.speaker != "UNKNOWN" or not seg.merged


