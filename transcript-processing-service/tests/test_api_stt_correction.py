"""API integration tests for POST /transcript/correct-stt (Part 6)."""

from fastapi.testclient import TestClient
import pytest
from app.main import app
from app.services.llm_client import MockLLMClient, set_llm_client

client = TestClient(app)


class TestSTTCorrectionAPI:
    """Integration tests for the STT error correction API endpoint."""

    @pytest.fixture(autouse=True)
    def setup_mock_llm(self):
        """Configure mock LLM client for API tests."""
        mock_client = MockLLMClient(
            exact_matches={
                "date abase connection": {
                    "corrected_text": "I have one issue with the database connection.",
                    "modified": True,
                    "confidence": 0.96,
                    "error_type": "TECHNICAL_TERM_MISRECOGNITION",
                    "reason": "Likely technical-term recognition error",
                },
                "रांच के पाव है हमारा खबर है?": {
                    "corrected_text": "रांच के पाव है हमारा खबर है?",
                    "modified": False,
                    "confidence": 0.50,
                    "error_type": None,
                    "reason": "Ambiguous speech; cannot determine intended words",
                },
            }
        )
        set_llm_client(mock_client)
        yield
        set_llm_client(None)

    def test_correct_stt_endpoint_success(self):
        payload = {
            "meeting_id": "meeting_stt_123",
            "segments": [
                {
                    "sequence": 1,
                    "source_sequences": [1],
                    "speaker": "Sarthak Talaviya",
                    "text": "Good morning everyone.",
                    "processed_text": "Good morning everyone.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 2,
                    "source_sequences": [2],
                    "speaker": "Harshit Pambhar",
                    "text": "I have one issue with the date abase connection.",
                    "processed_text": "I have one issue with the date abase connection.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 3,
                    "source_sequences": [3],
                    "speaker": "Harshit Pambhar",
                    "text": "रांच के पाव है हमारा खबर है?",
                    "processed_text": "रांच के पाव है हमारा खबर है?",
                    "include_in_meeting": True,
                },
            ],
        }

        response = client.post("/transcript/correct-stt", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["meeting_id"] == "meeting_stt_123"
        segments = data["segments"]
        assert len(segments) == 3

        # Segment 1: Unchanged normal speech
        assert segments[0]["sequence"] == 1
        assert segments[0]["speaker"] == "Sarthak Talaviya"
        assert segments[0]["text"] == "Good morning everyone."
        assert segments[0]["processed_text"] == "Good morning everyone."
        assert segments[0]["stt_corrected_text"] == "Good morning everyone."
        assert segments[0]["stt_modified"] is False

        # Segment 2: Corrected technical term STT error
        assert segments[1]["sequence"] == 2
        assert segments[1]["speaker"] == "Harshit Pambhar"
        # Original text and processed text remain 100% immutable
        assert segments[1]["text"] == "I have one issue with the date abase connection."
        assert segments[1]["processed_text"] == "I have one issue with the date abase connection."
        # Corrected text field updated
        assert segments[1]["stt_corrected_text"] == "I have one issue with the database connection."
        assert segments[1]["stt_modified"] is True
        assert segments[1]["stt_confidence"] == 0.96
        assert segments[1]["stt_error_type"] == "TECHNICAL_TERM_MISRECOGNITION"

        # Segment 3: Ambiguous speech preserved
        assert segments[2]["sequence"] == 3
        assert segments[2]["speaker"] == "Harshit Pambhar"
        assert segments[2]["text"] == "रांच के पाव है हमारा खबर है?"
        assert segments[2]["processed_text"] == "रांच के पाव है हमारा खबर है?"
        assert segments[2]["stt_corrected_text"] == "रांच के पाव है हमारा खबर है?"
        assert segments[2]["stt_modified"] is False

    def test_correct_stt_endpoint_validation_error(self):
        # Missing required 'segments' field
        response = client.post(
            "/transcript/correct-stt",
            json={"meeting_id": "missing_segments"},
        )
        assert response.status_code == 422
