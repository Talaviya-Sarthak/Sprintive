"""API endpoint tests for POST /transcript/format-final (Part 13)."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestFinalFormattingAPI:
    """Integration tests for POST /transcript/format-final endpoint."""

    def test_format_final_endpoint_success(self):
        """Test formatting endpoint returns 200 OK and clean AI-ready transcript."""
        payload = {
            "meeting_id": "test_meeting_13",
            "segments": [
                {
                    "sequence": 1,
                    "speaker": "Sarthak Talaviya",
                    "text": "Good morning, everyone. Let's start the meeting.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 2,
                    "speaker": "Harshit Pambhar",
                    "text": "Good morning. I finished the auth module yesterday.",
                    "include_in_meeting": True,
                },
            ],
        }
        response = client.post("/transcript/format-final", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["meeting_id"] == "test_meeting_13"
        assert data["status"] == "READY"
        assert "Sarthak Talaviya: Good morning, everyone. Let's start the meeting." in data["transcript_text"]
        assert "Harshit Pambhar: Good morning. I finished the auth module yesterday." in data["transcript_text"]
        assert data["included_segments"] == 2
        assert data["excluded_segments"] == 0
        assert len(data["segments"]) == 2
        # Verify internal pipeline fields are omitted from final segments
        assert "processed_text" not in data["segments"][0]
        assert "semantic_status" not in data["segments"][0]

    def test_format_final_endpoint_with_warnings_and_filtering(self):
        """Test endpoint correctly excludes pre-meeting segment and handles semantic fallback."""
        payload = {
            "meeting_id": "test_meeting_13_warnings",
            "segments": [
                {
                    "sequence": 1,
                    "speaker": "Carlos",
                    "text": "Audio check one two.",
                    "include_in_meeting": False,
                },
                {
                    "sequence": 2,
                    "speaker": "Harshit Pambhar",
                    "text": "The API is not working.",
                    "terminology_normalized_text": "The API is working.",
                    "semantic_status": "SEMANTICALLY_CHANGED",
                    "semantic_flags": ["NEGATION_CHANGED"],
                    "include_in_meeting": True,
                },
            ],
        }
        response = client.post("/transcript/format-final", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "READY_WITH_WARNINGS"
        assert data["included_segments"] == 1
        assert data["excluded_segments"] == 1
        assert "Audio check" not in data["transcript_text"]
        # Must retain original "The API is not working."
        assert "Harshit Pambhar: The API is not working." in data["transcript_text"]
        assert len(data["warnings"]) >= 1
        assert data["warnings"][0]["type"] == "SEMANTIC_CHANGE_FALLBACK"

    def test_format_final_endpoint_empty_segments(self):
        """Test endpoint with empty segments list returns READY with empty text."""
        payload = {
            "meeting_id": "empty_meeting",
            "segments": [],
        }
        response = client.post("/transcript/format-final", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "READY"
        assert data["transcript_text"] == ""
        assert data["included_segments"] == 0
        assert data["excluded_segments"] == 0

    def test_format_final_endpoint_missing_required_fields(self):
        """Test validation error 422 when required segments list is omitted."""
        payload = {
            "meeting_id": "missing_segments",
        }
        response = client.post("/transcript/format-final", json=payload)
        assert response.status_code == 422
