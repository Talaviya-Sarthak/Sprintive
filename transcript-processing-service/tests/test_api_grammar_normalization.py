"""API integration tests for POST /transcript/normalize-grammar (Part 7)."""

from fastapi.testclient import TestClient
import pytest
from app.main import app
from app.services.llm_client import MockLLMClient, set_llm_client

client = TestClient(app)


class TestGrammarNormalizationAPI:
    """Integration tests for the grammar and punctuation normalization API endpoint."""

    @pytest.fixture(autouse=True)
    def setup_mock_llm(self):
        """Configure mock LLM client for API tests."""
        mock_client = MockLLMClient(
            exact_matches={
                "Good morning everyone lets get started with todays meeting": {
                    "corrected_text": "Good morning, everyone. Let's get started with today's meeting.",
                    "modified": True,
                    "confidence": 0.96,
                    "changes": [
                        {"type": "PUNCTUATION", "description": "Added comma and period"},
                        {"type": "GRAMMAR", "description": "Added apostrophes for contractions"},
                    ],
                    "reason": "Normalized punctuation and apostrophes",
                },
                "I have one issue with the database connection": {
                    "corrected_text": "I have an issue with the database connection.",
                    "modified": True,
                    "confidence": 0.95,
                    "changes": [
                        {"type": "GRAMMAR", "description": "Replaced 'one' with article 'an'"}
                    ],
                    "reason": "Minor article improvement",
                },
                "रांच के पाव है हमारा खबर है?": {
                    "corrected_text": "रांच के पाव है हमारा खबर है?",
                    "modified": False,
                    "confidence": 0.50,
                    "changes": [],
                    "reason": "Ambiguous speech preserved unchanged",
                },
            }
        )
        set_llm_client(mock_client)
        yield
        set_llm_client(None)

    def test_normalize_grammar_endpoint_success(self):
        payload = {
            "meeting_id": "meeting_grammar_123",
            "segments": [
                {
                    "sequence": 1,
                    "source_sequences": [1],
                    "speaker": "Sarthak Talaviya",
                    "text": "Good morning everyone lets get started with todays meeting",
                    "processed_text": "Good morning everyone lets get started with todays meeting",
                    "stt_corrected_text": "Good morning everyone lets get started with todays meeting",
                    "include_in_meeting": True,
                },
                {
                    "sequence": 2,
                    "source_sequences": [2],
                    "speaker": "Harshit Pambhar",
                    "text": "I have one issue with the date abase connection.",
                    "processed_text": "I have one issue with the date abase connection.",
                    "stt_corrected_text": "I have one issue with the database connection.",
                    "stt_modified": True,
                    "include_in_meeting": True,
                },
                {
                    "sequence": 3,
                    "source_sequences": [3],
                    "speaker": "Harshit Pambhar",
                    "text": "रांच के पाव है हमारा खबर है?",
                    "processed_text": "रांच के पाव है हमारा खबर है?",
                    "stt_corrected_text": "रांच के पाव है हमारा खबर है?",
                    "include_in_meeting": True,
                },
            ],
        }

        response = client.post("/transcript/normalize-grammar", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["meeting_id"] == "meeting_grammar_123"
        segments = data["segments"]
        assert len(segments) == 3

        # Segment 1: Normalized punctuation
        assert segments[0]["sequence"] == 1
        assert segments[0]["speaker"] == "Sarthak Talaviya"
        assert segments[0]["grammar_corrected_text"] == "Good morning, everyone. Let's get started with today's meeting."
        assert segments[0]["grammar_modified"] is True
        assert segments[0]["grammar_confidence"] == 0.96

        # Segment 2: Uses stt_corrected_text and normalizes grammar
        assert segments[1]["sequence"] == 2
        assert segments[1]["speaker"] == "Harshit Pambhar"
        # Invariant: text, processed_text, stt_corrected_text all preserved
        assert segments[1]["text"] == "I have one issue with the date abase connection."
        assert segments[1]["processed_text"] == "I have one issue with the date abase connection."
        assert segments[1]["stt_corrected_text"] == "I have one issue with the database connection."
        assert segments[1]["stt_modified"] is True
        assert segments[1]["grammar_corrected_text"] == "I have an issue with the database connection."
        assert segments[1]["grammar_modified"] is True

        # Segment 3: Ambiguous speech preserved
        assert segments[2]["sequence"] == 3
        assert segments[2]["speaker"] == "Harshit Pambhar"
        assert segments[2]["text"] == "रांच के पाव है हमारा खबर है?"
        assert segments[2]["grammar_corrected_text"] == "रांच के पाव है हमारा खबर है?"
        assert segments[2]["grammar_modified"] is False

    def test_normalize_grammar_endpoint_validation_error(self):
        # Missing required 'segments' field
        response = client.post(
            "/transcript/normalize-grammar",
            json={"meeting_id": "missing_segments"},
        )
        assert response.status_code == 422
