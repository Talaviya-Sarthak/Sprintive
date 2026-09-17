"""API integration tests for POST /transcript/remove-repetitions."""

from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)


class TestRepetitionAPI:
    """Integration test suite for the repetition removal endpoint."""

    def test_remove_repetitions_success(self):
        payload = {
            "meeting_id": "meeting_test_123",
            "segments": [
                {
                    "sequence": 1,
                    "speaker": "Sarthak Talaviya",
                    "text": "Good morning everyone.",
                    "classification": "CLEAN",
                    "confidence": 0.99,
                },
                {
                    "sequence": 2,
                    "speaker": "Harshit Pambhar",
                    "text": "Aló, aló, aló, aló.",
                    "classification": "POSSIBLE_REPETITION",
                    "confidence": 0.95,
                },
                {
                    "sequence": 3,
                    "speaker": "Sarthak Talaviya",
                    "text": "ready ready.",
                    "classification": "POSSIBLE_REPETITION",
                    "confidence": 0.92,
                },
            ],
        }

        response = client.post("/transcript/remove-repetitions", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["meeting_id"] == "meeting_test_123"
        segments = data["segments"]
        assert len(segments) == 3

        # Segment 1
        assert segments[0]["sequence"] == 1
        assert segments[0]["speaker"] == "Sarthak Talaviya"
        assert segments[0]["text"] == "Good morning everyone."
        assert segments[0]["processed_text"] == "Good morning everyone."
        assert segments[0]["repetition_modified"] is False
        assert segments[0]["is_duplicate"] is False

        # Segment 2
        assert segments[1]["sequence"] == 2
        assert segments[1]["speaker"] == "Harshit Pambhar"
        assert segments[1]["text"] == "Aló, aló, aló, aló."
        assert segments[1]["processed_text"] == "Aló."
        assert segments[1]["repetition_modified"] is True
        assert segments[1]["repetition_type"] == "CONSECUTIVE_WORD"
        assert segments[1]["is_duplicate"] is False

        # Segment 3
        assert segments[2]["sequence"] == 3
        assert segments[2]["speaker"] == "Sarthak Talaviya"
        assert segments[2]["text"] == "ready ready."
        assert segments[2]["processed_text"] == "ready."
        assert segments[2]["repetition_modified"] is True
        assert segments[2]["repetition_type"] == "CONSECUTIVE_WORD"
        assert segments[2]["is_duplicate"] is False

    def test_remove_repetitions_duplicate_segments(self):
        payload = {
            "meeting_id": "meeting_dup_123",
            "segments": [
                {
                    "sequence": 1,
                    "speaker": "Harshit Pambhar",
                    "text": "Database connection is failing.",
                },
                {
                    "sequence": 2,
                    "speaker": "Harshit Pambhar",
                    "text": "Database connection is failing.",
                },
            ],
        }

        response = client.post("/transcript/remove-repetitions", json=payload)
        assert response.status_code == 200

        data = response.json()
        segments = data["segments"]
        assert len(segments) == 2

        assert segments[0]["is_duplicate"] is False
        assert segments[0]["processed_text"] == "Database connection is failing."

        assert segments[1]["is_duplicate"] is True
        assert segments[1]["duplicate_of_sequence"] == 1
        assert segments[1]["processed_text"] == ""
        assert segments[1]["repetition_type"] == "EXACT_SEGMENT_DUPLICATE"

    def test_remove_repetitions_validation_error(self):
        # Missing required segments field
        response = client.post(
            "/transcript/remove-repetitions",
            json={"meeting_id": "test_err"},
        )
        assert response.status_code == 422
