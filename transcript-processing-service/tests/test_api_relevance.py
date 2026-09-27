"""API integration tests for POST /transcript/filter-relevance."""

from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)


class TestRelevanceAPI:
    """Integration tests for relevance filtering endpoint."""

    def test_filter_relevance_endpoint_success(self):
        payload = {
            "meeting_id": "meeting_relevance_123",
            "segments": [
                {
                    "sequence": 1,
                    "speaker": "Harshit Pambhar",
                    "text": "Hello, can you hear me?",
                    "processed_text": "Hello, can you hear me?",
                    "classification": "CLEAN",
                    "confidence": 0.95,
                    "repetition_modified": False,
                },
                {
                    "sequence": 2,
                    "speaker": "Sarthak Talaviya",
                    "text": "Good morning everyone. Let's get started with today's meeting.",
                    "processed_text": "Good morning everyone. Let's get started with today's meeting.",
                    "classification": "CLEAN",
                    "confidence": 0.99,
                    "repetition_modified": False,
                },
                {
                    "sequence": 3,
                    "speaker": "Harshit Pambhar",
                    "text": "I have one issue with the database connection.",
                    "processed_text": "I have one issue with the database connection.",
                    "classification": "CLEAN",
                    "confidence": 0.99,
                    "repetition_modified": False,
                },
            ],
        }

        response = client.post("/transcript/filter-relevance", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["meeting_id"] == "meeting_relevance_123"
        segments = data["segments"]
        assert len(segments) == 3

        # Segment 1: Audio check before meeting start
        assert segments[0]["sequence"] == 1
        assert segments[0]["relevance"] == "AUDIO_CHECK"
        assert segments[0]["include_in_meeting"] is False
        assert segments[0]["filter_confidence"] >= 0.90
        assert segments[0]["text"] == "Hello, can you hear me?"

        # Segment 2: Meeting start
        assert segments[1]["sequence"] == 2
        assert segments[1]["relevance"] == "MEETING_CONTENT"
        assert segments[1]["include_in_meeting"] is True

        # Segment 3: Work / Technical
        assert segments[2]["sequence"] == 3
        assert segments[2]["relevance"] == "MEETING_CONTENT"
        assert segments[2]["include_in_meeting"] is True

    def test_filter_relevance_endpoint_validation_error(self):
        # Missing segments
        response = client.post(
            "/transcript/filter-relevance",
            json={"meeting_id": "test_err"},
        )
        assert response.status_code == 422
