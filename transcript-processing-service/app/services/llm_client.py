"""LLM client interface and implementations for STT correction."""

import json
import logging
import re
import time
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMClientError(Exception):
    """Base exception for LLM client communication and parsing errors."""


class LLMTimeoutError(LLMClientError):
    """Exception raised when an LLM request times out."""


class LLMResponseValidationError(LLMClientError):
    """Exception raised when the LLM returns invalid JSON or schema mismatch."""


class BaseLLMClient(ABC):
    """Abstract base class for LLM clients."""

    @abstractmethod
    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
    ) -> T:
        """
        Generate a response adhering strictly to the given Pydantic model.

        Args:
            system_prompt: The system role instructions.
            user_prompt: The user role prompt with context and input.
            response_model: Pydantic model class used to validate and parse output.

        Returns:
            Validated instance of response_model.

        Raises:
            LLMTimeoutError: If the request times out.
            LLMClientError: If network/HTTP error occurs.
            LLMResponseValidationError: If LLM output fails schema validation.
        """
        pass


import random
import threading
from enum import Enum

class GroqErrorCategory(str, Enum):
    """Categorized Groq / OpenAI error types for bounded recovery decisions."""
    TPD_EXCEEDED = "tpd_exceeded"            # Tokens Per Day limit reached (long cooldown)
    TPM_EXCEEDED = "tpm_exceeded"            # Tokens Per Minute limit reached (short cooldown)
    RPM_EXCEEDED = "rpm_exceeded"            # Requests Per Minute limit reached (short cooldown)
    MODEL_UNAVAILABLE = "model_unavailable"  # Model does not exist / 404 (permanent blacklist)
    AUTH_ERROR = "auth_error"                # 401 / 403 Invalid API key or permissions (non-retryable)
    VALIDATION_ERROR = "validation_error"    # 400 Bad request or schema violation
    SERVER_ERROR = "server_error"            # 5xx Temporary provider failure (retryable)
    TIMEOUT_ERROR = "timeout_error"          # Network / HTTP timeout
    CLIENT_ERROR = "client_error"            # Other non-retryable 4xx errors
    UNKNOWN = "unknown"


class NonRetryableLLMError(LLMClientError):
    """Exception raised for non-retryable errors such as invalid API credentials."""


class AllModelsExhaustedError(LLMClientError):
    """Exception raised when all primary and fallback LLM models have exhausted quota or are unavailable."""


def parse_groq_retry_seconds(error_text: str) -> Optional[float]:
    """Parse retry delay duration from Groq rate limit message."""
    # Matches patterns like: 'try again in 5m43.2s', 'try again in 12.5s', 'try again in 1h2m3s'
    match = re.search(r"try again in (?:(\d+)h)?(?:(\d+)m)?([0-9.]+)s", error_text, re.IGNORECASE)
    if match:
        hours = float(match.group(1)) if match.group(1) else 0.0
        minutes = float(match.group(2)) if match.group(2) else 0.0
        seconds = float(match.group(3))
        return (hours * 3600.0) + (minutes * 60.0) + seconds
    return None


def classify_groq_error(
    status_code: int,
    response_text: str,
    headers: Optional[Dict[str, str]] = None,
) -> tuple[GroqErrorCategory, Optional[float]]:
    """
    Classify Groq HTTP response errors using status code, error body, and response headers.
    Returns (GroqErrorCategory, retry_delay_seconds).
    """
    retry_delay: Optional[float] = None
    lower_text = response_text.lower()

    # 1. Parse retry delay from Retry-After header if present
    if headers:
        retry_header = headers.get("retry-after") or headers.get("Retry-After")
        if retry_header:
            try:
                retry_delay = float(retry_header)
            except ValueError:
                pass

    # 2. Check retry delay from message body if not found in headers
    if retry_delay is None:
        retry_delay = parse_groq_retry_seconds(response_text)

    # 3. Categorize by status code and message contents
    if status_code in (401, 403) or "invalid_api_key" in lower_text or "unauthorized" in lower_text:
        return GroqErrorCategory.AUTH_ERROR, None

    if (
        status_code == 404
        or "model_not_found" in lower_text
        or "does not exist" in lower_text
        or "model unavailable" in lower_text
    ):
        return GroqErrorCategory.MODEL_UNAVAILABLE, None

    if status_code == 429:
        if "tokens per day" in lower_text or "tpd" in lower_text:
            return GroqErrorCategory.TPD_EXCEEDED, retry_delay
        if "tokens per minute" in lower_text or "tpm" in lower_text:
            return GroqErrorCategory.TPM_EXCEEDED, retry_delay
        if "requests per minute" in lower_text or "rpm" in lower_text:
            return GroqErrorCategory.RPM_EXCEEDED, retry_delay
        return GroqErrorCategory.TPM_EXCEEDED, retry_delay

    if status_code == 400:
        if "json_validate_failed" in lower_text:
            return GroqErrorCategory.VALIDATION_ERROR, None
        return GroqErrorCategory.CLIENT_ERROR, None

    if 500 <= status_code < 600:
        return GroqErrorCategory.SERVER_ERROR, retry_delay

    return GroqErrorCategory.CLIENT_ERROR, None


class ModelCircuitBreaker:
    """
    Thread-safe, process-level circuit breaker and quota state manager for LLM models.
    Tracks quota-exhausted models and blacklists unavailable (404) models across calls.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._blocked_until: Dict[str, float] = {}
        self._unavailable_models: set[str] = set()
        self._block_reasons: Dict[str, str] = {}

    def mark_blocked(self, model: str, duration_seconds: float, reason: str = "") -> None:
        """Temporarily block a model due to rate limit exhaustion (TPD/TPM)."""
        with self._lock:
            expires_at = time.time() + max(0.01, duration_seconds)
            self._blocked_until[model] = max(self._blocked_until.get(model, 0.0), expires_at)
            self._block_reasons[model] = reason
            logger.warning(
                "Circuit breaker: model '%s' BLOCKED for %.1fs (until %s). Reason: %s",
                model,
                duration_seconds,
                time.strftime("%H:%M:%S", time.localtime(expires_at)),
                reason,
            )

    def mark_unavailable(self, model: str, reason: str = "") -> None:
        """Permanently mark a model as unavailable (404/not supported on account)."""
        with self._lock:
            self._unavailable_models.add(model)
            self._block_reasons[model] = reason
            logger.warning(
                "Circuit breaker: model '%s' marked PERMANENTLY UNAVAILABLE. Reason: %s",
                model,
                reason,
            )

    def is_available(self, model: str) -> bool:
        """Check whether a model is currently eligible for API calls."""
        with self._lock:
            if model in self._unavailable_models:
                return False
            blocked_until = self._blocked_until.get(model, 0.0)
            if time.time() < blocked_until:
                return False
            return True

    def get_remaining_block_time(self, model: str) -> float:
        """Return remaining seconds until a model unblocks (or 0 if available)."""
        with self._lock:
            if model in self._unavailable_models:
                return float("inf")
            blocked_until = self._blocked_until.get(model, 0.0)
            return max(0.0, blocked_until - time.time())

    def filter_available_models(self, candidate_models: List[str]) -> List[str]:
        """Return subset of models that are not blocked or unavailable."""
        now = time.time()
        with self._lock:
            available = []
            for m in candidate_models:
                if m in self._unavailable_models:
                    continue
                if now < self._blocked_until.get(m, 0.0):
                    continue
                available.append(m)
            return available

    def reset(self) -> None:
        """Reset all circuit breaker tracking (useful for testing)."""
        with self._lock:
            self._blocked_until.clear()
            self._unavailable_models.clear()
            self._block_reasons.clear()


# Shared singleton circuit breaker
model_circuit_breaker = ModelCircuitBreaker()

# Pacing and concurrency limiter
_concurrency_semaphore = threading.Semaphore(settings.GROQ_CONCURRENCY_LIMIT)
_last_request_time: float = 0.0
_pacing_lock = threading.Lock()


def _pace_request(pacing_delay: float) -> None:
    """Enforce minimum spacing between outbound LLM requests to prevent TPM bursts."""
    global _last_request_time
    with _pacing_lock:
        now = time.time()
        elapsed = now - _last_request_time
        if elapsed < pacing_delay:
            time.sleep(pacing_delay - elapsed)
        _last_request_time = time.time()


class OpenAICompatibleLLMClient(BaseLLMClient):
    """
    Production-grade LLM client for OpenAI-compatible APIs (Groq, OpenAI, Ollama).
    Features:
    - Structured Groq error classification (TPD, TPM, RPM, 404, 401, 5xx)
    - Process-level ModelCircuitBreaker tracking
    - Bounded exponential backoff with jitter
    - Deterministic, non-looping model fallback chain
    - Fast 0ms fail-fast when all candidate models are quota-exhausted
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None,
        max_tokens: Optional[int] = None,
    ):
        self.api_key = api_key if api_key is not None else settings.LLM_API_KEY
        self.base_url = (base_url if base_url is not None else settings.LLM_BASE_URL).rstrip("/")
        self.model = model if model is not None else settings.GROQ_PRIMARY_MODEL
        self.temperature = temperature if temperature is not None else settings.LLM_TEMPERATURE
        self.max_tokens = (
            max_tokens if max_tokens is not None else getattr(settings, "LLM_MAX_TOKENS", 1024)
        )
        self.timeout_seconds = (
            timeout_seconds if timeout_seconds is not None else settings.GROQ_REQUEST_TIMEOUT
        )
        self.max_retries = max_retries if max_retries is not None else settings.GROQ_MAX_RETRIES

    def _get_candidate_models(self) -> List[str]:
        """Build deterministic, ordered list of candidate models without duplicates."""
        chain = [self.model]
        configured_fallbacks = [
            m.strip()
            for m in settings.GROQ_FALLBACK_MODELS.split(",")
            if m.strip()
        ]
        for fb in configured_fallbacks:
            if fb not in chain:
                chain.append(fb)
        return chain

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
    ) -> T:
        if not self.api_key:
            raise LLMClientError("LLM API key not configured; falling back to rule-based engine.")

        candidate_chain = self._get_candidate_models()

        # Fast circuit-breaker check: If all candidate models are currently blocked/unavailable,
        # fail fast in 0ms without consuming network or waiting.
        available_models = model_circuit_breaker.filter_available_models(candidate_chain)
        if not available_models:
            raise AllModelsExhaustedError(
                f"All configured LLM models ({candidate_chain}) are currently rate-limited or unavailable."
            )

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        endpoint = f"{self.base_url}/chat/completions"

        last_exception: Optional[Exception] = None

        # Iterate through models in deterministic order
        for current_model in candidate_chain:
            if not model_circuit_breaker.is_available(current_model):
                rem = model_circuit_breaker.get_remaining_block_time(current_model)
                logger.debug("Skipping model %s: circuit breaker open (%.1fs remaining)", current_model, rem)
                continue

            payload: Dict[str, Any] = {
                "model": current_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": self.temperature,
                "response_format": {"type": "json_object"},
            }
            if self.max_tokens:
                payload["max_tokens"] = self.max_tokens

            model_succeeded = False

            for attempt in range(self.max_retries + 1):
                # Request pacing and concurrency throttle
                _pace_request(settings.GROQ_PACING_DELAY_SECONDS)

                try:
                    with _concurrency_semaphore:
                        with httpx.Client(timeout=self.timeout_seconds) as client:
                            response = client.post(endpoint, json=payload, headers=headers)

                    if response.status_code == 200:
                        data = response.json()
                        choices = data.get("choices", [])
                        if not choices:
                            raise LLMClientError(f"LLM returned empty choices list for model {current_model}.")

                        content = choices[0].get("message", {}).get("content", "")
                        if not content:
                            raise LLMClientError(f"LLM returned empty content for model {current_model}.")

                        cleaned_content = re.sub(
                            r"^```json\s*|\s*```$", "", content.strip(), flags=re.MULTILINE
                        )
                        json_match = re.search(r"(\{[\s\S]*\})", cleaned_content)
                        if json_match:
                            cleaned_content = json_match.group(1)

                        parsed_json = json.loads(cleaned_content)
                        validated_result = response_model.model_validate(parsed_json)
                        model_succeeded = True
                        return validated_result

                    # HTTP Error classification
                    status_code = response.status_code
                    raw_text = response.text
                    resp_headers = dict(response.headers)
                    error_category, retry_delay = classify_groq_error(
                        status_code=status_code,
                        response_text=raw_text,
                        headers=resp_headers,
                    )

                    logger.warning(
                        "Groq API error: model=%s status=%d category=%s retry_delay=%s (attempt %d/%d)",
                        current_model,
                        status_code,
                        error_category.value,
                        f"{retry_delay:.1f}s" if retry_delay is not None else "None",
                        attempt + 1,
                        self.max_retries + 1,
                    )

                    # Non-retryable authentication error
                    if error_category == GroqErrorCategory.AUTH_ERROR:
                        raise NonRetryableLLMError(
                            f"Groq authentication error (HTTP {status_code}): Invalid API key or permission."
                        )

                    # Model unavailable / 404: blacklist permanently and switch immediately
                    if error_category == GroqErrorCategory.MODEL_UNAVAILABLE:
                        model_circuit_breaker.mark_unavailable(
                            current_model, f"HTTP {status_code} Model not found"
                        )
                        last_exception = LLMClientError(
                            f"Model '{current_model}' unavailable on provider (HTTP {status_code})."
                        )
                        break

                    # Daily token limit (TPD): block model and switch immediately without retrying
                    if error_category == GroqErrorCategory.TPD_EXCEEDED:
                        cooldown = (
                            retry_delay
                            if (retry_delay is not None and retry_delay >= 60.0)
                            else settings.GROQ_CIRCUIT_BREAKER_COOLDOWN_SECONDS
                        )
                        model_circuit_breaker.mark_blocked(
                            current_model, cooldown, "Daily token limit (TPD) exhausted"
                        )
                        last_exception = LLMClientError(
                            f"Daily token limit (TPD) exceeded for model '{current_model}'."
                        )
                        break

                    # Per-minute token limit (TPM) or Request rate limit (RPM)
                    if error_category in (GroqErrorCategory.TPM_EXCEEDED, GroqErrorCategory.RPM_EXCEEDED):
                        # If provider specifies wait time <= MAX_BACKOFF, sleep with jitter and retry
                        if retry_delay is not None and retry_delay <= settings.GROQ_MAX_BACKOFF_SECONDS:
                            if attempt < self.max_retries:
                                wait_s = retry_delay + random.uniform(0.1, 0.4)
                                logger.info(
                                    "Rate limit (TPM/RPM) for %s: sleeping %.2fs before retry...",
                                    current_model,
                                    wait_s,
                                )
                                time.sleep(wait_s)
                                continue
                        # Wait time too long or retries exhausted: block model temporarily and try next model
                        cooldown = retry_delay if retry_delay is not None else 60.0
                        model_circuit_breaker.mark_blocked(
                            current_model, cooldown, f"{error_category.value} wait exceeded backoff limit"
                        )
                        last_exception = LLMClientError(
                            f"Rate limit ({error_category.value}) for model '{current_model}'."
                        )
                        break

                    # JSON validate failed: strip response_format and retry immediately
                    if error_category == GroqErrorCategory.VALIDATION_ERROR:
                        payload.pop("response_format", None)
                        continue

                    # Server error (5xx): bounded exponential backoff
                    if error_category == GroqErrorCategory.SERVER_ERROR:
                        last_exception = LLMClientError(
                            f"Provider server error (HTTP {status_code}) on model '{current_model}'."
                        )
                        if attempt < self.max_retries:
                            backoff = min(
                                (2.0 ** attempt) + random.uniform(0.1, 0.5),
                                settings.GROQ_MAX_BACKOFF_SECONDS,
                            )
                            time.sleep(backoff)
                            continue
                        break

                    # Other client errors (e.g. invalid request structure)
                    last_exception = LLMClientError(
                        f"LLM API returned client error (HTTP {status_code}) on model '{current_model}'."
                    )
                    break

                except httpx.TimeoutException as te:
                    last_exception = LLMTimeoutError(
                        f"LLM request timed out after {self.timeout_seconds}s on model '{current_model}': {te}"
                    )
                    logger.warning("LLM attempt %d timed out on %s: %s", attempt + 1, current_model, te)
                    if attempt < self.max_retries:
                        time.sleep(1.0 + random.uniform(0.1, 0.3))
                        continue
                    break

                except (json.JSONDecodeError, ValidationError) as ve:
                    last_exception = LLMResponseValidationError(
                        f"LLM output validation error on model '{current_model}': {ve}"
                    )
                    logger.warning("LLM output validation failed on %s: %s", current_model, ve)
                    break

                except NonRetryableLLMError:
                    raise

                except Exception as exc:
                    last_exception = LLMClientError(
                        f"LLM communication error on model '{current_model}': {exc}"
                    )
                    logger.warning("LLM attempt %d unexpected error on %s: %s", attempt + 1, current_model, exc)
                    if attempt < self.max_retries:
                        time.sleep(1.0)
                        continue
                    break

            if model_succeeded:
                break

        if last_exception:
            # Check if all models failed
            all_exhausted = not model_circuit_breaker.filter_available_models(candidate_chain)
            if all_exhausted:
                raise AllModelsExhaustedError(
                    f"All configured LLM models ({candidate_chain}) failed or exhausted their quota. Last error: {last_exception}"
                )
            raise last_exception

        raise AllModelsExhaustedError("All candidate LLM models failed without raising a specific exception.")



class MockLLMClient(BaseLLMClient):
    """
    Mock LLM client for tests and deterministic simulations.
    Allows registering custom handler functions, matching dictionaries, or raising exceptions.
    """

    def __init__(
        self,
        default_response_fn: Optional[Callable[[str, str], Any]] = None,
        default_response: Optional[Any] = None,
        exact_matches: Optional[Dict[str, Any]] = None,
        simulate_timeout: bool = False,
        simulate_api_error: bool = False,
        simulate_invalid_json: bool = False,
    ):
        if default_response is not None and default_response_fn is None:
            self.default_response_fn = lambda s, u: default_response
        else:
            self.default_response_fn = default_response_fn
        self.exact_matches = exact_matches or {}
        self.simulate_timeout = simulate_timeout
        self.simulate_api_error = simulate_api_error
        self.simulate_invalid_json = simulate_invalid_json
        self.call_history: List[Dict[str, Any]] = []

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
    ) -> T:
        self.call_history.append(
            {"system_prompt": system_prompt, "user_prompt": user_prompt}
        )

        if self.simulate_timeout:
            raise LLMTimeoutError("Simulated LLM timeout")

        if self.simulate_api_error:
            raise LLMClientError("Simulated LLM API failure (HTTP 500)")

        if self.simulate_invalid_json:
            raise LLMResponseValidationError("Simulated invalid JSON output")

        # Extract target text from prompt if possible
        match = re.search(r"Original text: (.*)", user_prompt)
        orig_text = match.group(1).strip() if match else ""

        # Check exact matches against target text first (to avoid matching text in surrounding context)
        for key, canned in self.exact_matches.items():
            if (orig_text and key in orig_text) or (not orig_text and key in user_prompt):
                if isinstance(canned, Exception):
                    raise canned
                if isinstance(canned, dict):
                    return response_model.model_validate(canned)
                if isinstance(canned, response_model):
                    return canned

        # If custom response function provided
        if self.default_response_fn:
            result = self.default_response_fn(system_prompt, user_prompt)
            if isinstance(result, Exception):
                raise result
            if isinstance(result, dict):
                return response_model.model_validate(result)
            if isinstance(result, response_model):
                return result

        # Default fallback: return original text unchanged with modified=False
        return response_model.model_validate(
            {
                "corrected_text": orig_text,
                "modified": False,
                "confidence": 1.0,
                "error_type": None,
                "reason": "Default mock fallback: no STT error detected",
            }
        )


_active_llm_client: Optional[BaseLLMClient] = None


def get_llm_client() -> BaseLLMClient:
    """Dependency provider returning the configured LLM client."""
    global _active_llm_client
    if _active_llm_client is not None:
        return _active_llm_client

    if settings.LLM_PROVIDER.lower() == "mock":
        return MockLLMClient()

    return OpenAICompatibleLLMClient()


def set_llm_client(client: Optional[BaseLLMClient]) -> None:
    """Set or override the active LLM client (primarily for testing)."""
    global _active_llm_client
    _active_llm_client = client
