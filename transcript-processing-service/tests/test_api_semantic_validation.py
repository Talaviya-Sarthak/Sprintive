"""API integration tests for POST /transcript/validate-semantics (Part 12)."""

from fastapi.testclient import TestClient
import pytest
from app.main import app
from app.models.semantic_validation import (
    SemanticFlagType,
    SemanticValidationStatus,
)
from app.services.llm_client import MockLLMClient, set_llm_client

client = TestClient(app)


class TestSemanticValidationAPI:
    """Integration tests for the semantic preservation validation API endpoint."""

    @pytest.fixture(autouse=True)
    def setup_mock_llm(self):
        """Configure mock LLM client for API tests."""
        mock_client = MockLLMClient(
            default_response={
                "status": "SEMANTICALLY_PRESERVED",
                "confidence": 0.96,
                "flags": [],
                "changed_elements": [],
                "reason": "Dialogue meaning, facts, and intent are preserved.",
            }
        )
        set_llm_client(mock_client)
        yield
        set_llm_client(None)

    def test_validate_semantics_endpoint_success(self):
        """Test successful POST /transcript/validate-semantics with valid preserved segments."""
        payload = {
            "meeting_id": "meeting_semantic_123",
            "segments": [
                {
                    "sequence": 1,
                    "speaker": "Sarthak Talaviya",
                    "text": "Good morning, everyone. Let's start the meeting.",
                    "terminology_normalized_text": "Good morning everyone, let's start the meeting.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 2,
                    "speaker": "Harshit Pambhar",
                    "text": "I'll fix the backend issue tomorrow.",
                    "terminology_normalized_text": "I will resolve the backend problem tomorrow.",
                    "include_in_meeting": True,
                },
            ],
        }

        response = client.post("/transcript/validate-semantics", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["meeting_id"] == "meeting_semantic_123"
        assert len(data["segments"]) == 2

        seg1 = data["segments"][0]
        assert seg1["semantic_status"] == "SEMANTICALLY_PRESERVED"
        assert seg1["text"] == "Good morning, everyone. Let's start the meeting."
        assert seg1["speaker"] == "Sarthak Talaviya"

        seg2 = data["segments"][1]
        assert seg2["semantic_status"] == "SEMANTICALLY_PRESERVED"
        assert seg2["text"] == "I'll fix the backend issue tomorrow."
        assert seg2["speaker"] == "Harshit Pambhar"

    def test_validate_semantics_endpoint_flags_semantic_change(self):
        """Test that factual or negation changes are detected and flagged."""
        payload = {
            "meeting_id": "meeting_semantic_flag",
            "segments": [
                {
                    "sequence": 1,
                    "speaker": "Harshit Pambhar",
                    "text": "The API is not working.",
                    "terminology_normalized_text": "The API is working.",
                    "include_in_meeting": True,
                }
            ],
        }

        response = client.post("/transcript/validate-semantics", json=payload)
        assert response.status_code == 200

        data = response.json()
        seg = data["segments"][0]
        assert seg["semantic_status"] == "SEMANTICALLY_CHANGED"
        assert "NEGATION_CHANGED" in seg["semantic_flags"]
        assert seg["text"] == "The API is not working."
        assert seg["speaker"] == "Harshit Pambhar"

    def test_validate_semantics_endpoint_empty_segments(self):
        """Test API behavior when segments list is empty."""
        payload = {
            "meeting_id": "empty_meeting",
            "segments": [],
        }
        response = client.post("/transcript/validate-semantics", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["segments"] == []

    def test_validate_semantics_endpoint_missing_required_fields(self):
        """Test 422 Unprocessable Entity error when required fields are missing."""
        payload = {"meeting_id": "invalid_payload"}
        response = client.post("/transcript/validate-semantics", json=payload)
        assert response.status_code == 422
