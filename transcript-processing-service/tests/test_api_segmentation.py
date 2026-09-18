"""API integration tests for POST /transcript/merge-fragments."""

from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)


class TestSegmentationAPI:
    """Integration tests for fragment merging endpoint."""

    def test_merge_fragments_endpoint_success(self):
        payload = {
            "meeting_id": "meeting_segmentation_123",
            "segments": [
                {
                    "sequence": 11,
                    "speaker": "Sarthak Talaviya",
                    "text": "Before we begin,",
                    "processed_text": "Before we begin,",
                    "relevance": "MEETING_CONTENT",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 12,
                    "speaker": "Sarthak Talaviya",
                    "text": "does anyone have any blockers",
                    "processed_text": "does anyone have any blockers",
                    "relevance": "MEETING_CONTENT",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 13,
                    "speaker": "Sarthak Talaviya",
                    "text": "from yesterday?",
                    "processed_text": "from yesterday?",
                    "relevance": "MEETING_CONTENT",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 14,
                    "speaker": "Harshit Pambhar",
                    "text": "I have one issue with the database connection.",
                    "processed_text": "I have one issue with the database connection.",
                    "relevance": "MEETING_CONTENT",
                    "include_in_meeting": True,
                },
            ],
        }

        response = client.post("/transcript/merge-fragments", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["meeting_id"] == "meeting_segmentation_123"
        segments = data["segments"]
        assert len(segments) == 2

        # Segment 1 (merged from 11, 12, 13)
        assert segments[0]["sequence"] == 11
        assert segments[0]["source_sequences"] == [11, 12, 13]
        assert segments[0]["speaker"] == "Sarthak Talaviya"
        assert (
            segments[0]["text"]
            == "Before we begin, does anyone have any blockers from yesterday?"
        )
        assert segments[0]["merged"] is True

        # Segment 2 (unmerged 14)
        assert segments[1]["sequence"] == 14
        assert segments[1]["source_sequences"] == [14]
        assert segments[1]["speaker"] == "Harshit Pambhar"
        assert (
            segments[1]["text"]
            == "I have one issue with the database connection."
        )
        assert segments[1]["merged"] is False

    def test_merge_fragments_endpoint_validation_error(self):
        # Missing required fields
        response = client.post(
            "/transcript/merge-fragments",
            json={"meeting_id": "test_err"},
        )
        assert response.status_code == 422
