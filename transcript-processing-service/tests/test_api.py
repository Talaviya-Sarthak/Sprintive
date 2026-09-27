import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_endpoint():
    """Verify GET /health works."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_api_parse_with_raw_text():
    """Verify POST /transcript/parse with direct raw_text."""
    payload = {
        "meeting_id": "meeting_api_123",
        "raw_text": (
            "Sarthak Talaviya: Good morning everyone.\n"
            "Harshit Pambhar: हाँ बोल\n"
        ),
    }
    response = client.post("/transcript/parse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["meeting_id"] == "meeting_api_123"
    assert len(data["segments"]) == 2
    assert data["segments"][0]["sequence"] == 1
    assert data["segments"][0]["speaker"] == "Sarthak Talaviya"
    assert data["segments"][0]["text"] == "Good morning everyone."
    assert data["segments"][1]["sequence"] == 2
    assert data["segments"][1]["speaker"] == "Harshit Pambhar"
    assert data["segments"][1]["text"] == "हाँ बोल"


def test_api_parse_with_local_file_path():
    """Verify POST /transcript/parse with transcript_path pointing to a file."""
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_real_transcript.txt")
    payload = {
        "meeting_id": "meeting_from_file",
        "transcript_path": fixture_path,
    }
    response = client.post("/transcript/parse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["meeting_id"] == "meeting_from_file"
    assert len(data["segments"]) == 13


def test_api_missing_both_path_and_raw_text():
    """Verify POST /transcript/parse returns 400 when both parameters are omitted."""
    payload = {
        "meeting_id": "meeting_empty",
    }
    response = client.post("/transcript/parse", json=payload)
    assert response.status_code == 400
    assert "Either 'transcript_path' or 'raw_text' must be provided" in response.json()["detail"]


def test_api_file_not_found():
    """Verify POST /transcript/parse returns 404 when file does not exist."""
    payload = {
        "meeting_id": "meeting_404",
        "transcript_path": "non_existent_dir/non_existent_file.txt",
    }
    response = client.post("/transcript/parse", json=payload)
    assert response.status_code == 404
