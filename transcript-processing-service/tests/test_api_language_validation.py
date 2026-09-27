"""API integration tests for POST /transcript/validate-language (Part 11)."""

from fastapi.testclient import TestClient
import pytest
from app.main import app
from app.models.language_validation import (
    LanguageFlagType,
    LanguagePreservationStatus,
)
from app.services.llm_client import MockLLMClient, set_llm_client

client = TestClient(app)


class TestLanguageValidationAPI:
    """Integration tests for the language preservation validation API endpoint."""

    @pytest.fixture(autouse=True)
    def setup_mock_llm(self):
        """Configure mock LLM client for API tests."""
        mock_client = MockLLMClient(
            default_response={
                "status": "PRESERVED",
                "confidence": 0.96,
                "flags": [],
                "original_languages": ["hi", "en"],
                "processed_languages": ["hi", "en"],
                "original_primary_language": "hi",
                "processed_primary_language": "hi",
                "is_original_mixed_language": True,
                "is_processed_mixed_language": True,
                "reason": "Multilingual language characteristics preserved.",
            }
        )
        set_llm_client(mock_client)
        yield
        set_llm_client(None)

    def test_validate_language_endpoint_success(self):
        """Test successful POST /transcript/validate-language with multilingual segments."""
        payload = {
            "meeting_id": "meeting_lang_123",
            "segments": [
                {
                    "sequence": 1,
                    "source_sequences": [1],
                    "speaker": "Sarthak Talaviya",
                    "text": "Good morning everyone. Let's start the meeting.",
                    "terminology_normalized_text": "Good morning everyone. Let's start the meeting.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 2,
                    "source_sequences": [2],
                    "speaker": "Harshit Pambhar",
                    "text": "हाँ bol, database connection check कर.",
                    "terminology_normalized_text": "हाँ बोल, database connection check कर.",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 3,
                    "source_sequences": [3],
                    "speaker": "Elena Rodriguez",
                    "text": "Sí, podemos revisar el endpoint mañana.",
                    "terminology_normalized_text": "Sí, podemos revisar el endpoint mañana.",
                    "include_in_meeting": True,
                },
            ],
        }

        response = client.post("/transcript/validate-language", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["meeting_id"] == "meeting_lang_123"
        assert len(data["segments"]) == 3

        # Check transcript-level profile
        profile = data["transcript_language_profile"]
        assert "primary_language" in profile
        assert "languages_detected" in profile
        assert "mixed_language_segments" in profile
        assert "language_change_flags" in profile
        assert profile["language_change_flags"] == 0

        # Check segment 1 (English)
        seg1 = data["segments"][0]
        assert seg1["language_preservation_status"] == "PRESERVED"
        assert seg1["original_primary_language"] == "en"
        assert seg1["text"] == "Good morning everyone. Let's start the meeting."
        assert seg1["speaker"] == "Sarthak Talaviya"

        # Check segment 2 (Hindi + English)
        seg2 = data["segments"][1]
        assert seg2["language_preservation_status"] == "PRESERVED"
        assert "hi" in seg2["original_languages"]
        assert seg2["text"] == "हाँ bol, database connection check कर."
        assert seg2["speaker"] == "Harshit Pambhar"

        # Check segment 3 (Spanish + English)
        seg3 = data["segments"][2]
        assert seg3["language_preservation_status"] == "PRESERVED"
        assert "es" in seg3["original_languages"]
        assert seg3["text"] == "Sí, podemos revisar el endpoint mañana."
        assert seg3["speaker"] == "Elena Rodriguez"

    def test_validate_language_accidental_translation_flagged(self):
        """Test that accidental translation is flagged with LANGUAGE_CHANGED and UNEXPECTED_TRANSLATION."""
        payload = {
            "meeting_id": "meeting_trans_flag",
            "segments": [
                {
                    "sequence": 1,
                    "speaker": "Harshit Pambhar",
                    "text": "हाँ बोल, बाद में discuss करते हैं.",
                    "terminology_normalized_text": "Yes, speak. We will discuss it later.",
                    "include_in_meeting": True,
                }
            ],
        }

        response = client.post("/transcript/validate-language", json=payload)
        assert response.status_code == 200

        data = response.json()
        seg = data["segments"][0]
        assert seg["language_preservation_status"] == "LANGUAGE_CHANGED"
        assert "UNEXPECTED_TRANSLATION" in seg["language_flags"]
        assert data["transcript_language_profile"]["language_change_flags"] == 1
        # Text and speaker invariants
        assert seg["text"] == "हाँ बोल, बाद में discuss करते हैं."
        assert seg["speaker"] == "Harshit Pambhar"

    def test_validate_language_endpoint_empty_segments(self):
        """Test API behavior when segments list is empty."""
        payload = {
            "meeting_id": "empty_meeting",
            "segments": [],
        }
        response = client.post("/transcript/validate-language", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["segments"] == []
        assert data["transcript_language_profile"]["mixed_language_segments"] == 0
        assert data["transcript_language_profile"]["language_change_flags"] == 0

    def test_validate_language_endpoint_missing_required_fields(self):
        """Test 422 Unprocessable Entity error when required fields are missing."""
        payload = {"meeting_id": "invalid_payload"}
        response = client.post("/transcript/validate-language", json=payload)
        assert response.status_code == 422
