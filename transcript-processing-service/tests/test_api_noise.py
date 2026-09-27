"""End-to-end API tests for POST /transcript/analyze-noise."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_analyze_noise_endpoint_success():
    """Verify POST /transcript/analyze-noise processes segments and preserves verbatim text."""
    payload = {
        "meeting_id": "meeting_noise_001",
        "segments": [
            {
                "sequence": 1,
                "speaker": "Sarthak Talaviya",
                "text": "Good morning everyone.",
            },
            {
                "sequence": 2,
                "speaker": "Harshit Pambhar",
                "text": "Aló, aló, aló, aló.",
            },
            {
                "sequence": 3,
                "speaker": "Harshit Pambhar",
                "text": "I have one issue with the database connection.",
            },
            {
                "sequence": 4,
                "speaker": "Sarthak Talaviya",
                "text": "ready ready.",
            },
            {
                "sequence": 5,
                "speaker": "Harshit Pambhar",
                "text": "um",
            },
            {
                "sequence": 6,
                "speaker": "UNKNOWN",
                "text": "[Background typing noise and low hum]",
            },
        ],
    }

    response = client.post("/transcript/analyze-noise", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["meeting_id"] == "meeting_noise_001"
    segments = data["segments"]
    assert len(segments) == 6

    # 1. CLEAN
    assert segments[0]["sequence"] == 1
    assert segments[0]["speaker"] == "Sarthak Talaviya"
    assert segments[0]["text"] == "Good morning everyone."
    assert segments[0]["classification"] == "CLEAN"
    assert segments[0]["confidence"] >= 0.95

    # 2. POSSIBLE_REPETITION
    assert segments[1]["sequence"] == 2
    assert segments[1]["speaker"] == "Harshit Pambhar"
    assert segments[1]["text"] == "Aló, aló, aló, aló."
    assert segments[1]["classification"] == "POSSIBLE_REPETITION"

    # 3. CLEAN
    assert segments[2]["classification"] == "CLEAN"

    # 4. POSSIBLE_REPETITION
    assert segments[3]["sequence"] == 4
    assert segments[3]["text"] == "ready ready."
    assert segments[3]["classification"] == "POSSIBLE_REPETITION"

    # 5. FILLER
    assert segments[4]["text"] == "um"
    assert segments[4]["classification"] == "FILLER"

    # 6. NOISE
    assert segments[5]["text"] == "[Background typing noise and low hum]"
    assert segments[5]["classification"] == "NOISE"


def test_analyze_noise_endpoint_empty_segments():
    """Verify POST /transcript/analyze-noise with empty segments list returns empty response."""
    payload = {
        "meeting_id": "meeting_empty",
        "segments": [],
    }
    response = client.post("/transcript/analyze-noise", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["meeting_id"] == "meeting_empty"
    assert data["segments"] == []


def test_analyze_noise_endpoint_invalid_payload():
    """Verify POST /transcript/analyze-noise returns 422 for missing required fields."""
    response = client.post("/transcript/analyze-noise", json={"meeting_id": "m1"})
    assert response.status_code == 422
