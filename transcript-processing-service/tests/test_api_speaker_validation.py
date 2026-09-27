"""API integration tests for POST /transcript/validate-speakers (Part 10)."""

from fastapi.testclient import TestClient
import pytest
from app.main import app
from app.models.speaker_validation import SpeakerFlagType, SpeakerValidationStatus
from app.services.llm_client import MockLLMClient, set_llm_client

client = TestClient(app)


class TestSpeakerValidationAPI:
    """Integration tests for the speaker attribution validation API endpoint."""

    @pytest.fixture(autouse=True)
    def setup_mock_llm(self):
        """Configure mock LLM client for API tests."""
        mock_client = MockLLMClient(
            default_response={
                "status": "VALID",
                "confidence": 0.96,
                "flags": [],
                "suggested_speaker": None,
                "reason": "Attribution is consistent with conversation turn-taking.",
            }
        )
        set_llm_client(mock_client)
        yield
        set_llm_client(None)

    def test_validate_speakers_endpoint_success(self):
        payload = {
            "meeting_id": "meeting_speaker_123",
            "segments": [
                {
                    "sequence": 15,
                    "source_sequences": [15],
                    "speaker": "Sarthak Talaviya",
                    "text": "Harshit, can you explain the database issue?",
                    "processed_text": "Harshit, can you explain the database issue?",
                    "stt_corrected_text": "Harshit, can you explain the database issue?",
                    "grammar_corrected_text": "Harshit, can you explain the database issue?",
                    "terminology_normalized_text": "Harshit, can you explain the database issue?",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 16,
                    "source_sequences": [16],
                    "speaker": "Harshit Pambhar",
                    "text": "Yes. The database connection is failing during API testing.",
                    "processed_text": "Yes. The database connection is failing during API testing.",
                    "stt_corrected_text": "Yes. The database connection is failing during API testing.",
                    "grammar_corrected_text": "Yes. The database connection is failing during API testing.",
                    "terminology_normalized_text": "Yes. The database connection is failing during API testing.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 17,
                    "source_sequences": [17],
                    "speaker": "Sarthak Talaviya",
                    "text": "We need to investigate the database",
                    "processed_text": "We need to investigate the database",
                    "stt_corrected_text": "We need to investigate the database",
                    "grammar_corrected_text": "We need to investigate the database",
                    "terminology_normalized_text": "We need to investigate the database",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 18,
                    "source_sequences": [18],
                    "speaker": "Harshit Pambhar",
                    "text": "connection issue first.",
                    "processed_text": "connection issue first.",
                    "stt_corrected_text": "connection issue first.",
                    "grammar_corrected_text": "connection issue first.",
                    "terminology_normalized_text": "connection issue first.",
                    "include_in_meeting": True,
                },
            ],
        }

        response = client.post("/transcript/validate-speakers", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["meeting_id"] == "meeting_speaker_123"
        segments = data["segments"]
        assert len(segments) == 4

        # Segment 15 & 16: Expected direct QA
        assert segments[0]["speaker"] == "Sarthak Talaviya"
        assert segments[0]["speaker_validation_status"] == "VALID"
        assert segments[1]["speaker"] == "Harshit Pambhar"
        assert segments[1]["speaker_validation_status"] == "VALID"

        # Segment 17: Valid statement
        assert segments[2]["speaker"] == "Sarthak Talaviya"
        assert segments[2]["speaker_validation_status"] == "VALID"

        # Segment 18: Unfinished continuation mismatch -> POSSIBLE_MISATTRIBUTION
        assert segments[3]["speaker"] == "Harshit Pambhar"  # Original speaker preserved!
        assert segments[3]["speaker_validation_status"] == "POSSIBLE_MISATTRIBUTION"
        assert "POSSIBLE_FRAGMENT_MISATTRIBUTION" in segments[3]["speaker_flags"]
        assert segments[3]["suggested_speaker"] == "Sarthak Talaviya"
        assert segments[3]["speaker_correction"] is None

        # Invariant check: original speaker and text preserved on all segments
        assert segments[0]["speaker"] == "Sarthak Talaviya"
        assert segments[1]["speaker"] == "Harshit Pambhar"
        assert segments[2]["speaker"] == "Sarthak Talaviya"
        assert segments[3]["speaker"] == "Harshit Pambhar"

    def test_validate_speakers_endpoint_validation_error(self):
        # Missing required 'segments' field
        response = client.post(
            "/transcript/validate-speakers",
            json={"meeting_id": "missing_segments"},
        )
        assert response.status_code == 422

    def test_validate_speakers_endpoint_empty_segments(self):
        response = client.post(
            "/transcript/validate-speakers",
            json={"meeting_id": "meeting_empty", "segments": []},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["meeting_id"] == "meeting_empty"
        assert data["segments"] == []
