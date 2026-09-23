"""API integration tests for POST /transcript/normalize-terminology (Part 8)."""

from fastapi.testclient import TestClient
import pytest
from app.main import app
from app.services.llm_client import MockLLMClient, set_llm_client

client = TestClient(app)


class TestTerminologyNormalizationAPI:
    """Integration tests for the technical terminology normalization API endpoint."""

    @pytest.fixture(autouse=True)
    def setup_mock_llm(self):
        """Configure mock LLM client for API tests."""
        mock_client = MockLLMClient(
            exact_matches={
                # Mock response for ambiguous term "react" in technical context
                "I will implement the frontend using React and Vite.": {
                    "is_technical": True,
                    "canonical_form": "React",
                    "confidence": 0.98,
                    "reason": "Refers to React JavaScript library for frontend development",
                },
                # Mock response for ambiguous term "react" in conversational context
                "How will the client react to this change?": {
                    "is_technical": False,
                    "canonical_form": "react",
                    "confidence": 0.95,
                    "reason": "Ordinary English verb expressing reaction",
                },
            }
        )
        set_llm_client(mock_client)
        yield
        set_llm_client(None)

    def test_normalize_terminology_endpoint_success(self):
        payload = {
            "meeting_id": "meeting_terminology_123",
            "segments": [
                {
                    "sequence": 1,
                    "source_sequences": [1],
                    "speaker": "Sarthak Talaviya",
                    "text": "We are connecting to post gre SQL using fast api.",
                    "processed_text": "We are connecting to post gre SQL using fast api.",
                    "stt_corrected_text": "We are connecting to post gre SQL using fast api.",
                    "grammar_corrected_text": "We are connecting to post gre SQL using fast api.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 2,
                    "source_sequences": [2],
                    "speaker": "Harshit Pambhar",
                    "text": "I will implement the frontend using react and vite.",
                    "processed_text": "I will implement the frontend using react and vite.",
                    "stt_corrected_text": "I will implement the frontend using react and vite.",
                    "grammar_corrected_text": "I will implement the frontend using react and vite.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 3,
                    "source_sequences": [3],
                    "speaker": "Harshit Pambhar",
                    "text": "The endpoint /api/users is returning a 200 OK status.",
                    "processed_text": "The endpoint /api/users is returning a 200 OK status.",
                    "stt_corrected_text": "The endpoint /api/users is returning a 200 OK status.",
                    "grammar_corrected_text": "The endpoint /api/users is returning a 200 OK status.",
                    "include_in_meeting": True,
                },
            ],
        }

        response = client.post("/transcript/normalize-terminology", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["meeting_id"] == "meeting_terminology_123"
        segments = data["segments"]
        assert len(segments) == 3

        # Segment 1: Deterministic terms: "PostgreSQL" and "FastAPI"
        assert segments[0]["sequence"] == 1
        assert segments[0]["speaker"] == "Sarthak Talaviya"
        assert (
            segments[0]["terminology_normalized_text"]
            == "We are connecting to PostgreSQL using FastAPI."
        )
        assert segments[0]["terminology_modified"] is True
        assert len(segments[0]["terminology_changes"]) == 2

        # Traceability invariant: all previous tiers preserved intact
        assert segments[0]["text"] == "We are connecting to post gre SQL using fast api."
        assert segments[0]["processed_text"] == "We are connecting to post gre SQL using fast api."
        assert segments[0]["stt_corrected_text"] == "We are connecting to post gre SQL using fast api."
        assert segments[0]["grammar_corrected_text"] == "We are connecting to post gre SQL using fast api."

        # Segment 2: Ambiguous "react" -> "React" (frontend context) and deterministic "vite" -> "Vite"
        assert segments[1]["sequence"] == 2
        assert segments[1]["speaker"] == "Harshit Pambhar"
        assert (
            segments[1]["terminology_normalized_text"]
            == "I will implement the frontend using React and Vite."
        )
        assert segments[1]["terminology_modified"] is True

        # Segment 3: Protected pattern /api/users preserved intact
        assert segments[2]["sequence"] == 3
        assert segments[2]["speaker"] == "Harshit Pambhar"
        assert "/api/users" in segments[2]["terminology_normalized_text"]

    def test_normalize_terminology_endpoint_validation_error(self):
        # Missing required 'segments' field
        response = client.post(
            "/transcript/normalize-terminology",
            json={"meeting_id": "missing_segments"},
        )
        assert response.status_code == 422

    def test_normalize_terminology_empty_segments(self):
        response = client.post(
            "/transcript/normalize-terminology",
            json={"meeting_id": "meeting_empty", "segments": []},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["meeting_id"] == "meeting_empty"
        assert data["segments"] == []
