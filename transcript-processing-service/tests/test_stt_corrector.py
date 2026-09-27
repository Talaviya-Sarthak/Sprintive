"""Comprehensive unit and scenario tests for Part 6 — STT Error Correction."""

import pytest
from app.models.transcript import (
    RelevanceCategory,
    STTCorrectionLLMOutput,
    STTErrorType,
    TranscriptSegment,
)
from app.services.llm_client import (
    LLMClientError,
    LLMResponseValidationError,
    LLMTimeoutError,
    MockLLMClient,
)
from app.services.stt_corrector import correct_stt_segments


class TestSTTCorrector:
    """Test suite covering all required 20+ scenarios for STT error correction."""

    # 1. Normal sentence - no STT error
    def test_01_normal_sentence(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="Good morning, everyone. Let's get started with today's meeting.",
                processed_text="Good morning, everyone. Let's get started with today's meeting.",
                merged=False,
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "Good morning": {
                    "corrected_text": "Good morning, everyone. Let's get started with today's meeting.",
                    "modified": False,
                    "confidence": 0.99,
                    "error_type": None,
                    "reason": "Normal speech with no STT recognition errors",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert len(results) == 1
        res = results[0]
        assert res.text == "Good morning, everyone. Let's get started with today's meeting."
        assert res.processed_text == "Good morning, everyone. Let's get started with today's meeting."
        assert res.stt_corrected_text == "Good morning, everyone. Let's get started with today's meeting."
        assert res.stt_modified is False
        assert res.stt_error_type is None

    # 2. Obvious STT error (Critical Test 1)
    def test_02_obvious_stt_error_and_critical_spec(self):
        segments = [
            TranscriptSegment(
                sequence=15,
                source_sequences=[15, 16],
                speaker="Harshit Pambhar",
                text="I have one issue with the date abase connection.",
                processed_text="I have one issue with the date abase connection.",
                merged=True,
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "date abase connection": {
                    "corrected_text": "I have one issue with the database connection.",
                    "modified": True,
                    "confidence": 0.96,
                    "error_type": "TECHNICAL_TERM_MISRECOGNITION",
                    "reason": "Likely technical-term recognition error",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert len(results) == 1
        res = results[0]
        # Invariant: original text and processed_text are strictly preserved
        assert res.text == "I have one issue with the date abase connection."
        assert res.processed_text == "I have one issue with the date abase connection."
        # Corrected text field populated
        assert res.stt_corrected_text == "I have one issue with the database connection."
        assert res.stt_modified is True
        assert res.stt_confidence == 0.96
        assert res.stt_error_type == STTErrorType.TECHNICAL_TERM_MISRECOGNITION
        assert res.stt_reason == "Likely technical-term recognition error"
        assert res.merged is True
        assert res.source_sequences == [15, 16]

    # 3. Technical-term STT error (e.g. "rest a p i" -> "REST API")
    def test_03_technical_term_stt_error(self):
        segments = [
            TranscriptSegment(
                sequence=5,
                speaker="Harshit Pambhar",
                text="The rest a p i endpoint is failing under load.",
                processed_text="The rest a p i endpoint is failing under load.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "rest a p i": {
                    "corrected_text": "The REST API endpoint is failing under load.",
                    "modified": True,
                    "confidence": 0.97,
                    "error_type": "TECHNICAL_TERM_MISRECOGNITION",
                    "reason": "Acoustic spelling out of REST API",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].stt_corrected_text == "The REST API endpoint is failing under load."
        assert results[0].stt_modified is True
        assert results[0].stt_error_type == STTErrorType.TECHNICAL_TERM_MISRECOGNITION

    # 4. Ambiguous sentence preserved (Critical Test 2)
    def test_04_ambiguous_sentence_preserved_critical_spec(self):
        segments = [
            TranscriptSegment(
                sequence=8,
                speaker="Harshit Pambhar",
                text="रांच के पाव है हमारा खबर है?",
                processed_text="रांच के पाव है हमारा खबर है?",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "रांच के पाव है हमारा खबर है?": {
                    "corrected_text": "रांच के पाव है हमारा खबर है?",
                    "modified": False,
                    "confidence": 0.45,
                    "error_type": None,
                    "reason": "Ambiguous speech; cannot determine intended words without hallucinating",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        res = results[0]
        assert res.text == "रांच के पाव है हमारा खबर है?"
        assert res.processed_text == "रांच के पाव है हमारा खबर है?"
        assert res.stt_corrected_text == "रांच के पाव है हमारा खबर है?"
        assert res.stt_modified is False

    # 5. Hindi sentence preserved without translation
    def test_05_hindi_sentence_preserved(self):
        segments = [
            TranscriptSegment(
                sequence=9,
                speaker="Harshit Pambhar",
                text="हाँ, मैं database connection देख रहा हूँ.",
                processed_text="हाँ, मैं database connection देख रहा हूँ.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "database connection देख रहा हूँ": {
                    "corrected_text": "हाँ, मैं database connection देख रहा हूँ.",
                    "modified": False,
                    "confidence": 0.98,
                    "error_type": None,
                    "reason": "Valid Hindi sentence with accurate technical terms",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].stt_corrected_text == "हाँ, मैं database connection देख रहा हूँ."
        assert results[0].stt_modified is False
        assert "Yes, I am checking" not in results[0].stt_corrected_text

    # 6. Spanish sentence preserved without translation
    def test_06_spanish_sentence_preserved(self):
        segments = [
            TranscriptSegment(
                sequence=10,
                speaker="Carlos",
                text="¿Podemos revisar el estado de la base de datos?",
                processed_text="¿Podemos revisar el estado de la base de datos?",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "base de datos": {
                    "corrected_text": "¿Podemos revisar el estado de la base de datos?",
                    "modified": False,
                    "confidence": 0.99,
                    "error_type": None,
                    "reason": "Valid Spanish speech without STT errors",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].stt_corrected_text == "¿Podemos revisar el estado de la base de datos?"
        assert results[0].stt_modified is False

    # 7. Mixed-language sentence preserved (Hinglish)
    def test_07_mixed_language_sentence(self):
        segments = [
            TranscriptSegment(
                sequence=11,
                speaker="Harshit Pambhar",
                text="I have one issue जो API testing को affect कर रहा है.",
                processed_text="I have one issue जो API testing को affect कर रहा है.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "affect कर रहा है": {
                    "corrected_text": "I have one issue जो API testing को affect कर रहा है.",
                    "modified": False,
                    "confidence": 0.98,
                    "error_type": None,
                    "reason": "Natural mixed-language speech preserved",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].stt_corrected_text == "I have one issue जो API testing को affect कर रहा है."
        assert results[0].stt_modified is False

    # 8. Technical vocabulary context used as evidence
    def test_08_technical_vocabulary(self):
        segments = [
            TranscriptSegment(
                sequence=12,
                speaker="Sarthak Talaviya",
                text="We deployed the new version to super base yesterday.",
                processed_text="We deployed the new version to super base yesterday.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "super base": {
                    "corrected_text": "We deployed the new version to Supabase yesterday.",
                    "modified": True,
                    "confidence": 0.95,
                    "error_type": "TECHNICAL_TERM_MISRECOGNITION",
                    "reason": "Recognized Supabase technical term misheard as super base",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].stt_corrected_text == "We deployed the new version to Supabase yesterday."
        assert results[0].stt_modified is True
        assert results[0].stt_error_type == STTErrorType.TECHNICAL_TERM_MISRECOGNITION

    # 9. Word-boundary issue (preserving "back end" when not an obvious STT error)
    def test_09_word_boundary_issue(self):
        segments = [
            TranscriptSegment(
                sequence=13,
                speaker="Sarthak Talaviya",
                text="The back end is working.",
                processed_text="The back end is working.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "back end is working": {
                    "corrected_text": "The back end is working.",
                    "modified": False,
                    "confidence": 0.95,
                    "error_type": None,
                    "reason": "Valid natural speech; do not automatically normalize to backend in Part 6",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].stt_corrected_text == "The back end is working."
        assert results[0].stt_modified is False

    # 10. Homophone-like issue
    def test_10_homophone_like_issue(self):
        segments = [
            TranscriptSegment(
                sequence=14,
                speaker="Sarthak Talaviya",
                text="Please sink the git repository before committing.",
                processed_text="Please sink the git repository before committing.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "sink the git repository": {
                    "corrected_text": "Please sync the git repository before committing.",
                    "modified": True,
                    "confidence": 0.94,
                    "error_type": "HOMOPHONE_OR_SIMILAR_SOUND",
                    "reason": "Acoustic homophone 'sink' used in place of 'sync' in git context",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].stt_corrected_text == "Please sync the git repository before committing."
        assert results[0].stt_modified is True
        assert results[0].stt_error_type == STTErrorType.HOMOPHONE_OR_SIMILAR_SOUND

    # 11. No correction required
    def test_11_no_correction_required(self):
        segments = [
            TranscriptSegment(
                sequence=15,
                speaker="Sarthak Talaviya",
                text="Everything is on track for tomorrow's release.",
                processed_text="Everything is on track for tomorrow's release.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient()
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].stt_corrected_text == "Everything is on track for tomorrow's release."
        assert results[0].stt_modified is False

    # 12. LLM returns low confidence (< 0.90) -> preserve original
    def test_12_llm_returns_low_confidence(self):
        segments = [
            TranscriptSegment(
                sequence=16,
                speaker="Harshit Pambhar",
                text="Maybe the docker daemon is not up.",
                processed_text="Maybe the docker daemon is not up.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "docker daemon": {
                    "corrected_text": "Maybe the Docker daemon is not up.",
                    "modified": True,
                    "confidence": 0.72,  # Below threshold of 0.90
                    "error_type": "TECHNICAL_TERM_MISRECOGNITION",
                    "reason": "Uncertain about casing error vs STT misrecognition",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client, confidence_threshold=0.90)
        assert results[0].stt_corrected_text == "Maybe the docker daemon is not up."
        assert results[0].stt_modified is False
        assert results[0].stt_error_type is None
        assert "below threshold" in results[0].stt_reason.lower()

    # 13. LLM returns invalid JSON -> safe fallback
    def test_13_llm_returns_invalid_json(self):
        segments = [
            TranscriptSegment(
                sequence=17,
                speaker="Harshit Pambhar",
                text="Testing the WebRTC stream.",
                processed_text="Testing the WebRTC stream.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(simulate_invalid_json=True)
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert len(results) == 1
        assert results[0].stt_corrected_text == "Testing the WebRTC stream."
        assert results[0].stt_modified is False
        assert "Fallback due to LLM error" in results[0].stt_reason

    # 14. LLM timeout -> safe fallback
    def test_14_llm_timeout(self):
        segments = [
            TranscriptSegment(
                sequence=18,
                speaker="Harshit Pambhar",
                text="Checking the database replica.",
                processed_text="Checking the database replica.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(simulate_timeout=True)
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].stt_corrected_text == "Checking the database replica."
        assert results[0].stt_modified is False
        assert "Fallback due to LLM error" in results[0].stt_reason

    # 15. LLM API failure (HTTP 500) -> safe fallback
    def test_15_llm_api_failure(self):
        segments = [
            TranscriptSegment(
                sequence=19,
                speaker="Harshit Pambhar",
                text="Checking the database replica.",
                processed_text="Checking the database replica.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(simulate_api_error=True)
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].stt_corrected_text == "Checking the database replica."
        assert results[0].stt_modified is False
        assert "Fallback due to LLM error" in results[0].stt_reason

    # 16. Different speakers preserved
    def test_16_different_speakers(self):
        segments = [
            TranscriptSegment(
                sequence=20,
                speaker="Alice",
                text="I have an issue with the date abase.",
                processed_text="I have an issue with the date abase.",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=21,
                speaker="Bob",
                text="Did you check the port config?",
                processed_text="Did you check the port config?",
                include_in_meeting=True,
            ),
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "date abase": {
                    "corrected_text": "I have an issue with the database.",
                    "modified": True,
                    "confidence": 0.96,
                    "error_type": "TECHNICAL_TERM_MISRECOGNITION",
                    "reason": "database misrecognition",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].speaker == "Alice"
        assert results[0].stt_corrected_text == "I have an issue with the database."
        assert results[1].speaker == "Bob"
        assert results[1].stt_corrected_text == "Did you check the port config?"

    # 17. Context-dependent correction
    def test_17_context_dependent_correction(self):
        segments = [
            TranscriptSegment(
                sequence=22,
                speaker="Harshit Pambhar",
                text="We are testing the REST API.",
                processed_text="We are testing the REST API.",
                include_in_meeting=True,
            ),
            TranscriptSegment(
                sequence=23,
                speaker="Harshit Pambhar",
                text="The rest API is failing.",
                processed_text="The rest API is failing.",
                include_in_meeting=True,
            ),
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "rest API is failing": {
                    "corrected_text": "The REST API is failing.",
                    "modified": True,
                    "confidence": 0.95,
                    "error_type": "TECHNICAL_TERM_MISRECOGNITION",
                    "reason": "Previous context established REST API terminology",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[1].stt_corrected_text == "The REST API is failing."
        assert results[1].stt_modified is True

    # 18. Correction that would alter meaning / grammar rewriting rejected
    def test_18_grammar_rewriting_rejected(self):
        segments = [
            TranscriptSegment(
                sequence=24,
                speaker="Sarthak Talaviya",
                text="I will start my quick giving a quick update on the back end work.",
                processed_text="I will start my quick giving a quick update on the back end work.",
                include_in_meeting=True,
            )
        ]
        # LLM correctly adheres to constraints and does not rewrite grammar
        mock_client = MockLLMClient(
            exact_matches={
                "start my quick": {
                    "corrected_text": "I will start my quick giving a quick update on the back end work.",
                    "modified": False,
                    "confidence": 0.96,
                    "error_type": None,
                    "reason": "Colloquial / grammar error, not an STT acoustic misrecognition; preserved.",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert (
            results[0].stt_corrected_text
            == "I will start my quick giving a quick update on the back end work."
        )
        assert results[0].stt_modified is False

    # 19. Original text preservation across all 3 levels of traceability
    def test_19_original_text_preservation(self):
        segments = [
            TranscriptSegment(
                sequence=25,
                speaker="Harshit Pambhar",
                text="Original raw text with date abase.",
                processed_text="Processed text with date abase.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "date abase": {
                    "corrected_text": "Processed text with database.",
                    "modified": True,
                    "confidence": 0.95,
                    "error_type": "TECHNICAL_TERM_MISRECOGNITION",
                    "reason": "database correction",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        res = results[0]
        # Level 1: raw text
        assert res.text == "Original raw text with date abase."
        # Level 2: processed text
        assert res.processed_text == "Processed text with date abase."
        # Level 3: stt corrected text
        assert res.stt_corrected_text == "Processed text with database."

    # 20. Upstream metadata preservation
    def test_20_metadata_preservation(self):
        segments = [
            TranscriptSegment(
                sequence=26,
                source_sequences=[26, 27, 28],
                speaker="Harshit Pambhar",
                text="Testing date abase connection.",
                processed_text="Testing date abase connection.",
                classification=None,
                confidence=None,
                repetition_modified=True,
                is_duplicate=False,
                relevance=RelevanceCategory.MEETING_CONTENT,
                include_in_meeting=True,
                merged=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "date abase": {
                    "corrected_text": "Testing database connection.",
                    "modified": True,
                    "confidence": 0.96,
                    "error_type": "TECHNICAL_TERM_MISRECOGNITION",
                    "reason": "database",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        res = results[0]
        assert res.sequence == 26
        assert res.source_sequences == [26, 27, 28]
        assert res.speaker == "Harshit Pambhar"
        assert res.repetition_modified is True
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.include_in_meeting is True
        assert res.merged is True
        assert res.stt_corrected_text == "Testing database connection."
        assert res.stt_modified is True

    # 21. Partial word error and phonetic misrecognition categories
    def test_21_additional_error_categories(self):
        segments = [
            TranscriptSegment(
                sequence=29,
                speaker="Harshit Pambhar",
                text="The docu- is not ready.",
                processed_text="The docu- is not ready.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "docu-": {
                    "corrected_text": "The documentation is not ready.",
                    "modified": True,
                    "confidence": 0.93,
                    "error_type": "PARTIAL_WORD_ERROR",
                    "reason": "Clipped partial word in Scrum documentation context",
                }
            }
        )
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert results[0].stt_error_type == STTErrorType.PARTIAL_WORD_ERROR
        assert results[0].stt_corrected_text == "The documentation is not ready."

    # 22. Segment excluded from meeting (include_in_meeting=False) is preserved as is
    def test_22_excluded_segment_preserved_without_llm_call(self):
        segments = [
            TranscriptSegment(
                sequence=30,
                speaker="Harshit Pambhar",
                text="Hello can you hear me?",
                processed_text="Hello can you hear me?",
                include_in_meeting=False,
                relevance=RelevanceCategory.AUDIO_CHECK,
            )
        ]
        mock_client = MockLLMClient()
        results = correct_stt_segments(segments, llm_client=mock_client)
        assert len(mock_client.call_history) == 0  # No LLM call made for excluded segment
        assert results[0].stt_corrected_text == "Hello can you hear me?"
        assert results[0].stt_modified is False
        assert results[0].include_in_meeting is False

    # 23. OpenAICompatibleLLMClient success and markdown stripping
    def test_23_openai_compatible_client_success(self, monkeypatch):
        from unittest.mock import MagicMock
        from app.services.llm_client import OpenAICompatibleLLMClient

        client = OpenAICompatibleLLMClient(
            api_key="test-key",
            base_url="https://mock.openai.com/v1",
            model="test-model",
            timeout_seconds=5.0,
            max_retries=0,
        )

        mock_post = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '```json\n{"corrected_text": "database", "modified": true, "confidence": 0.98, "error_type": "TECHNICAL_TERM_MISRECOGNITION", "reason": "test"}\n```'
                    }
                }
            ]
        }
        mock_post.return_value = mock_response
        monkeypatch.setattr("httpx.Client.post", mock_post)

        res = client.generate_structured(
            system_prompt="sys",
            user_prompt="user",
            response_model=STTCorrectionLLMOutput,
        )
        assert res.corrected_text == "database"
        assert res.modified is True
        assert res.confidence == 0.98

    # 24. OpenAICompatibleLLMClient error and timeout handling
    def test_24_openai_compatible_client_errors(self, monkeypatch):
        import httpx
        from unittest.mock import MagicMock
        from app.services.llm_client import (
            LLMClientError,
            LLMResponseValidationError,
            LLMTimeoutError,
            OpenAICompatibleLLMClient,
        )

        client = OpenAICompatibleLLMClient(
            api_key="test-key",
            base_url="https://mock.openai.com/v1",
            max_retries=0,
        )

        # Timeout
        def raise_timeout(*args, **kwargs):
            raise httpx.ReadTimeout("Read timed out")

        monkeypatch.setattr("httpx.Client.post", raise_timeout)
        with pytest.raises(LLMTimeoutError):
            client.generate_structured("sys", "user", STTCorrectionLLMOutput)

        # HTTP 500 error
        mock_500 = MagicMock()
        mock_500.status_code = 500
        mock_500.text = "Internal Server Error"
        monkeypatch.setattr("httpx.Client.post", lambda *a, **kw: mock_500)
        with pytest.raises(LLMClientError):
            client.generate_structured("sys", "user", STTCorrectionLLMOutput)

        # Malformed JSON
        mock_bad_json = MagicMock()
        mock_bad_json.status_code = 200
        mock_bad_json.json.return_value = {
            "choices": [{"message": {"content": "not valid json"}}]
        }
        monkeypatch.setattr("httpx.Client.post", lambda *a, **kw: mock_bad_json)
        with pytest.raises(LLMResponseValidationError):
            client.generate_structured("sys", "user", STTCorrectionLLMOutput)
