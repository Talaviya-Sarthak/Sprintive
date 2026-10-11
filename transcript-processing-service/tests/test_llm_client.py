"""Comprehensive unit tests for Groq LLM client error classification, circuit breaker,
model fallback chain, bounded backoffs, and safe degradation.
All external HTTP requests are mocked with unittest.mock / respx / pytest.
"""

import time
import pytest
from unittest.mock import MagicMock, patch
from pydantic import BaseModel
import httpx

from app.core.config import settings
from app.models.transcript import (
    SegmentClassification,
    STTCorrectionLLMOutput,
    STTErrorType,
    TranscriptSegment,
)
from app.services.llm_client import (
    AllModelsExhaustedError,
    GroqErrorCategory,
    LLMClientError,
    LLMResponseValidationError,
    LLMTimeoutError,
    ModelCircuitBreaker,
    NonRetryableLLMError,
    OpenAICompatibleLLMClient,
    classify_groq_error,
    model_circuit_breaker,
    parse_groq_retry_seconds,
)
from app.services.stt_corrector import correct_stt_segments


class DummyResponseModel(BaseModel):
    result: str
    confidence: float


@pytest.fixture(autouse=True)
def reset_circuit_breaker():
    """Ensure a clean circuit breaker state before each test."""
    model_circuit_breaker.reset()
    yield
    model_circuit_breaker.reset()


def test_error_classification_tpd():
    """Verify Daily Token Limit (TPD) is correctly classified."""
    body = (
        '{"error":{"message":"Rate limit reached for model `qwen/qwen3.8-27b` in organization '
        '`org-123` on tokens per day (TPD): Limit 200000, Used 198833, Requested 1534. '
        'Please try again in 5m43.2s.","type":"tokens","code":"rate_limit_exceeded"}}'
    )
    cat, retry_s = classify_groq_error(429, body)
    assert cat == GroqErrorCategory.TPD_EXCEEDED
    assert retry_s == pytest.approx(343.2, 0.1)


def test_error_classification_tpm():
    """Verify Per-Minute Token Limit (TPM) is correctly classified."""
    body = (
        '{"error":{"message":"Rate limit reached for model `allam-2-7b` on tokens per minute (TPM): '
        'Limit 6000, Used 5500, Requested 1200. Please try again in 4.5s.","type":"tokens"}}'
    )
    cat, retry_s = classify_groq_error(429, body)
    assert cat == GroqErrorCategory.TPM_EXCEEDED
    assert retry_s == pytest.approx(4.5, 0.1)


def test_error_classification_retry_after_header():
    """Verify Retry-After header takes precedence or is parsed."""
    headers = {"retry-after": "12.0"}
    body = '{"error":{"message":"Too many requests"}}'
    cat, retry_s = classify_groq_error(429, body, headers=headers)
    assert cat == GroqErrorCategory.TPM_EXCEEDED
    assert retry_s == 12.0


def test_error_classification_model_not_found_404():
    """Verify 404 / model_not_found is classified as MODEL_UNAVAILABLE."""
    body = '{"error":{"message":"The model `openai/gpt-oss-120b` does not exist or you do not have access."}}'
    cat, retry_s = classify_groq_error(404, body)
    assert cat == GroqErrorCategory.MODEL_UNAVAILABLE
    assert retry_s is None


def test_error_classification_auth_error_401():
    """Verify 401 invalid API key is classified as AUTH_ERROR."""
    body = '{"error":{"message":"Invalid API Key provided","type":"invalid_request_error"}}'
    cat, retry_s = classify_groq_error(401, body)
    assert cat == GroqErrorCategory.AUTH_ERROR
    assert retry_s is None


def test_error_classification_server_error_503():
    """Verify 503 is classified as SERVER_ERROR."""
    body = "Service Unavailable"
    cat, retry_s = classify_groq_error(503, body)
    assert cat == GroqErrorCategory.SERVER_ERROR


def test_circuit_breaker_mark_and_expire():
    """Verify circuit breaker blocks and unblocks after duration."""
    cb = ModelCircuitBreaker()
    cb.mark_blocked("model-a", duration_seconds=0.1, reason="Test TPM")
    assert not cb.is_available("model-a")
    time.sleep(0.15)
    assert cb.is_available("model-a")


def test_circuit_breaker_permanent_unavailable():
    """Verify 404 model remains permanently unavailable."""
    cb = ModelCircuitBreaker()
    cb.mark_unavailable("model-deleted", reason="404 not found")
    assert not cb.is_available("model-deleted")
    time.sleep(0.05)
    assert not cb.is_available("model-deleted")
    assert "model-deleted" not in cb.filter_available_models(["model-deleted", "model-ok"])


def test_successful_primary_model_response():
    """Verify primary model succeeds on first attempt."""
    client = OpenAICompatibleLLMClient(api_key="gsk-test", model="qwen/qwen3.8-27b")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": '{"result":"success","confidence":0.99}'}}]
    }

    with patch("httpx.Client.post", return_value=mock_resp) as mock_post:
        res = client.generate_structured("sys", "user", DummyResponseModel)
        assert res.result == "success"
        assert res.confidence == 0.99
        assert mock_post.call_count == 1
        # Ensure called with primary model
        call_json = mock_post.call_args[1]["json"]
        assert call_json["model"] == "qwen/qwen3.8-27b"


def test_primary_model_tpd_falls_over_to_fallback():
    """Verify primary model TPD exhaustion immediately blocks primary and fails over to fallback 1."""
    client = OpenAICompatibleLLMClient(api_key="gsk-test", model="qwen/qwen3.8-27b")

    resp_429 = MagicMock()
    resp_429.status_code = 429
    resp_429.text = '{"error":{"message":"Rate limit reached on tokens per day (TPD). Try again in 10m0s."}}'
    resp_429.headers = {}

    resp_200 = MagicMock()
    resp_200.status_code = 200
    resp_200.json.return_value = {
        "choices": [{"message": {"content": '{"result":"fallback_success","confidence":0.95}'}}]
    }

    with patch("httpx.Client.post", side_effect=[resp_429, resp_200]) as mock_post:
        res = client.generate_structured("sys", "user", DummyResponseModel)
        assert res.result == "fallback_success"
        assert mock_post.call_count == 2
        # First call was qwen
        assert mock_post.call_args_list[0][1]["json"]["model"] == "qwen/qwen3.8-27b"
        # Second call switched to first fallback
        assert mock_post.call_args_list[1][1]["json"]["model"] == "openai/gpt-oss-120b"

    # Circuit breaker must now report primary model is blocked
    assert not model_circuit_breaker.is_available("qwen/qwen3.8-27b")


def test_skipping_quota_exhausted_model_on_subsequent_call():
    """Verify that a model blocked in circuit breaker is skipped in 0ms on subsequent calls."""
    client = OpenAICompatibleLLMClient(api_key="gsk-test", model="qwen/qwen3.8-27b")

    # Manually block primary model
    model_circuit_breaker.mark_blocked("qwen/qwen3.8-27b", duration_seconds=60.0, reason="TPD")

    resp_200 = MagicMock()
    resp_200.status_code = 200
    resp_200.json.return_value = {
        "choices": [{"message": {"content": '{"result":"direct_fallback","confidence":0.90}'}}]
    }

    with patch("httpx.Client.post", return_value=resp_200) as mock_post:
        res = client.generate_structured("sys", "user", DummyResponseModel)
        assert res.result == "direct_fallback"
        # Should have called openai/gpt-oss-120b directly without attempting qwen!
        assert mock_post.call_count == 1
        assert mock_post.call_args[1]["json"]["model"] == "openai/gpt-oss-120b"


def test_model_404_blacklisted_permanently_and_switches():
    """Verify 404 response causes permanent blacklist and immediately tries next fallback."""
    client = OpenAICompatibleLLMClient(api_key="gsk-test", model="qwen/qwen3.8-27b")

    resp_404 = MagicMock()
    resp_404.status_code = 404
    resp_404.text = '{"error":{"message":"The model `qwen/qwen3.8-27b` does not exist."}}'
    resp_404.headers = {}

    resp_200 = MagicMock()
    resp_200.status_code = 200
    resp_200.json.return_value = {
        "choices": [{"message": {"content": '{"result":"switched_after_404","confidence":0.92}'}}]
    }

    with patch("httpx.Client.post", side_effect=[resp_404, resp_200]) as mock_post:
        res = client.generate_structured("sys", "user", DummyResponseModel)
        assert res.result == "switched_after_404"
        assert mock_post.call_count == 2
        assert mock_post.call_args_list[1][1]["json"]["model"] == "openai/gpt-oss-120b"

    assert not model_circuit_breaker.is_available("qwen/qwen3.8-27b")
    # Even after time passes, unavailable is permanent
    time.sleep(0.05)
    assert not model_circuit_breaker.is_available("qwen/qwen3.8-27b")


def test_auth_error_raises_non_retryable_immediately():
    """Verify 401/403 raises NonRetryableLLMError without retrying or looping."""
    client = OpenAICompatibleLLMClient(api_key="gsk-invalid", model="qwen/qwen3.8-27b")

    resp_401 = MagicMock()
    resp_401.status_code = 401
    resp_401.text = '{"error":{"message":"Invalid API key provided."}}'
    resp_401.headers = {}

    with patch("httpx.Client.post", return_value=resp_401) as mock_post:
        with pytest.raises(NonRetryableLLMError):
            client.generate_structured("sys", "user", DummyResponseModel)
        # Must fail fast after exactly 1 attempt
        assert mock_post.call_count == 1


def test_all_models_rate_limited_raises_all_models_exhausted_error():
    """Verify that when all models fail rate limits, AllModelsExhaustedError is raised."""
    client = OpenAICompatibleLLMClient(api_key="gsk-test", model="qwen/qwen3.8-27b")

    resp_429 = MagicMock()
    resp_429.status_code = 429
    resp_429.text = '{"error":{"message":"tokens per day limit reached. Try again in 2h."}}'
    resp_429.headers = {}

    with patch("httpx.Client.post", return_value=resp_429) as mock_post:
        with pytest.raises(AllModelsExhaustedError):
            client.generate_structured("sys", "user", DummyResponseModel)

        # Verified candidate chain is: qwen, openai/gpt-oss-120b, allam-2-7b, openai/gpt-oss-20b (4 models)
        assert mock_post.call_count == 4


def test_fast_fail_when_circuit_breaker_has_all_models_blocked():
    """Verify that if all candidate models are blocked in circuit breaker, call fails in 0ms without network."""
    client = OpenAICompatibleLLMClient(api_key="gsk-test", model="qwen/qwen3.8-27b")

    candidate_chain = client._get_candidate_models()
    for m in candidate_chain:
        model_circuit_breaker.mark_blocked(m, duration_seconds=60.0, reason="Test all blocked")

    with patch("httpx.Client.post") as mock_post:
        with pytest.raises(AllModelsExhaustedError):
            client.generate_structured("sys", "user", DummyResponseModel)
        # Zero HTTP calls made!
        assert mock_post.call_count == 0


def test_stt_corrector_preserves_original_text_on_all_models_exhausted():
    """Verify STT corrector safely degrades and preserves text when AllModelsExhaustedError occurs."""
    segments = [
        TranscriptSegment(
            sequence=1,
            speaker="Alice",
            text="Let us discuss the sprint backlog.",
            start_time=0.0,
            end_time=2.0,
            classification=SegmentClassification.UNCERTAIN,
            confidence=0.70,
        ),
        TranscriptSegment(
            sequence=2,
            speaker="Bob",
            text="I will take the auth ticket.",
            start_time=2.0,
            end_time=4.0,
            classification=SegmentClassification.UNCERTAIN,
            confidence=0.70,
        ),
    ]

    mock_client = MagicMock()
    mock_client.generate_structured.side_effect = AllModelsExhaustedError("All models quota exhausted")

    corrected = correct_stt_segments(segments, llm_client=mock_client)

    assert len(corrected) == 2
    # Both preserved original text
    assert corrected[0].stt_corrected_text == "Let us discuss the sprint backlog."
    assert corrected[0].stt_modified is False
    assert corrected[1].stt_corrected_text == "I will take the auth ticket."
    assert corrected[1].stt_modified is False

    # Fast fail guard ensured generate_structured was only called ONCE, not twice!
    assert mock_client.generate_structured.call_count == 1


def test_token_reduction_skips_clean_high_confidence_segments():
    """Verify clean segments with confidence >= 0.98 skip LLM call entirely."""
    segments = [
        TranscriptSegment(
            sequence=1,
            speaker="Alice",
            text="Good morning everyone.",
            start_time=0.0,
            end_time=2.0,
            classification=SegmentClassification.CLEAN,
            confidence=0.99,
        ),
        TranscriptSegment(
            sequence=2,
            speaker="Bob",
            text="We need to fix the cash error.",  # STT typo for cache
            start_time=2.0,
            end_time=4.0,
            classification=SegmentClassification.UNCERTAIN,
            confidence=0.75,
        ),
    ]

    mock_client = MagicMock()
    mock_client.generate_structured.return_value = STTCorrectionLLMOutput(
        corrected_text="We need to fix the cache error.",
        modified=True,
        confidence=0.95,
        error_type=STTErrorType.HOMOPHONE_OR_SIMILAR_SOUND,
        reason="cash -> cache in software development context",
    )

    corrected = correct_stt_segments(segments, llm_client=mock_client)

    assert len(corrected) == 2
    # Segment 1 was skipped without LLM call
    assert corrected[0].stt_modified is False
    assert corrected[0].stt_corrected_text == "Good morning everyone."
    assert "High-confidence clean segment" in corrected[0].stt_reason

    # Segment 2 received correction
    assert corrected[1].stt_modified is True
    assert corrected[1].stt_corrected_text == "We need to fix the cache error."

    # LLM called only once (for segment 2)
    assert mock_client.generate_structured.call_count == 1
