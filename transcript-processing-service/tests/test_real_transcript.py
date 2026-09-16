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
