"""API integration tests for POST /transcript/validate-context (Part 9)."""

from fastapi.testclient import TestClient
import pytest
from app.main import app
from app.models.transcript import ContextFlagType, ContextValidationStatus
from app.services.llm_client import MockLLMClient, set_llm_client

client = TestClient(app)


class TestContextualValidationAPI:
    """Integration tests for the contextual consistency validation endpoint."""

    @pytest.fixture(autouse=True)
    def setup_mock_llm(self):
        """Configure mock LLM client for API tests."""
        mock_client = MockLLMClient(
            default_response={
                "status": "CONSISTENT",
                "confidence": 0.95,
                "flags": [],
                "reason": "Dialogue is consistent with meeting context.",
            }
        )
        set_llm_client(mock_client)
        yield
        set_llm_client(None)

    def test_validate_context_endpoint_success(self):
        payload = {
            "meeting_id": "meeting_context_123",
            "segments": [
                {
                    "sequence": 1,
                    "source_sequences": [1],
                    "speaker": "Harshit Pambhar",
                    "text": "I have an issue with the PostgreSQL database.",
                    "processed_text": "I have an issue with the PostgreSQL database.",
                    "stt_corrected_text": "I have an issue with the PostgreSQL database.",
                    "grammar_corrected_text": "I have an issue with the PostgreSQL database.",
                    "terminology_normalized_text": "I have an issue with the PostgreSQL database.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 2,
                    "source_sequences": [2],
                    "speaker": "Sarthak Talaviya",
                    "text": "Let's check the PostgreSQL connection.",
                    "processed_text": "Let's check the PostgreSQL connection.",
                    "stt_corrected_text": "Let's check the PostgreSQL connection.",
                    "grammar_corrected_text": "Let's check the PostgreSQL connection.",
                    "terminology_normalized_text": "Let's check the PostgreSQL connection.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 3,
                    "source_sequences": [3],
                    "speaker": "Sarthak Talaviya",
                    "text": "Let's check the React database.",
                    "processed_text": "Let's check the React database.",
                    "stt_corrected_text": "Let's check the React database.",
                    "grammar_corrected_text": "Let's check the React database.",
                    "terminology_normalized_text": "Let's check the React database.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 4,
                    "source_sequences": [4],
                    "speaker": "Sarthak Talaviya",
                    "text": "Now let's discuss the sprint review.",
                    "processed_text": "Now let's discuss the sprint review.",
                    "stt_corrected_text": "Now let's discuss the sprint review.",
                    "grammar_corrected_text": "Now let's discuss the sprint review.",
                    "terminology_normalized_text": "Now let's discuss the sprint review.",
                    "include_in_meeting": True,
                },
            ],
        }

        response = client.post("/transcript/validate-context", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["meeting_id"] == "meeting_context_123"
        segments = data["segments"]
        assert len(segments) == 4

        # Segment 1 & 2: Consistent PostgreSQL discussion
        assert segments[0]["context_status"] == "CONSISTENT"
        assert segments[0]["context_flags"] == []
        assert segments[1]["context_status"] == "CONSISTENT"
        assert segments[1]["context_flags"] == []

        # Segment 3: Technical context mismatch ("React database")
        assert segments[2]["context_status"] == "POSSIBLE_INCONSISTENCY"
        assert any(
            f["type"] == "TECHNICAL_CONTEXT_MISMATCH" for f in segments[2]["context_flags"]
        )
        # Invariant: text is strictly preserved
        assert segments[2]["terminology_normalized_text"] == "Let's check the React database."
        assert segments[2]["text"] == "Let's check the React database."

        # Segment 4: Normal topic transition is CONSISTENT
        assert segments[3]["context_status"] == "CONSISTENT"
        assert segments[3]["context_flags"] == []

        # All 5 tiers preserved on all segments
        for seg in segments:
            assert "text" in seg
            assert "processed_text" in seg
            assert "stt_corrected_text" in seg
            assert "grammar_corrected_text" in seg
            assert "terminology_normalized_text" in seg

    def test_validate_context_endpoint_validation_error(self):
        # Missing required 'segments' field
        response = client.post(
            "/transcript/validate-context",
            json={"meeting_id": "missing_segments"},
        )
        assert response.status_code == 422

    def test_validate_context_endpoint_empty_segments(self):
        response = client.post(
            "/transcript/validate-context",
            json={"meeting_id": "meeting_empty", "segments": []},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["meeting_id"] == "meeting_empty"
        assert data["segments"] == []
