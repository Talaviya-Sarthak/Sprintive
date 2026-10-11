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


GROQ_FALLBACK_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "allam-2-7b",
    "openai/gpt-oss-20b",
]

def parse_groq_retry_seconds(error_text: str) -> Optional[float]:
    match = re.search(r"try again in (?:(\d+)m)?([0-9.]+)s", error_text, re.IGNORECASE)
    if match:
        minutes = float(match.group(1)) if match.group(1) else 0.0
        seconds = float(match.group(2))
        return (minutes * 60.0) + seconds
    return None


class OpenAICompatibleLLMClient(BaseLLMClient):
    """
    LLM client for any OpenAI-compatible API (OpenAI, Groq, Ollama, OpenRouter, etc.).
    Uses httpx with configurable timeouts, retries, and rate-limit fallbacks.
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
        self.model = model if model is not None else settings.LLM_MODEL
        self.temperature = temperature if temperature is not None else settings.LLM_TEMPERATURE
        self.max_tokens = (
            max_tokens if max_tokens is not None else getattr(settings, "LLM_MAX_TOKENS", 1024)
        )
        self.timeout_seconds = (
            timeout_seconds if timeout_seconds is not None else settings.LLM_TIMEOUT_SECONDS
        )
        self.max_retries = max_retries if max_retries is not None else settings.LLM_MAX_RETRIES

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
    ) -> T:
        if not self.api_key:
            raise LLMClientError("LLM API key not configured; falling back to rule-based engine.")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": self.temperature,
            "response_format": {"type": "json_object"},
        }
        if self.max_tokens:
            payload["max_tokens"] = self.max_tokens

        endpoint = f"{self.base_url}/chat/completions"
        last_exception: Optional[Exception] = None
        tried_models: set = {self.model}

        for attempt in range(self.max_retries + 1):
            try:
                with httpx.Client(timeout=self.timeout_seconds) as client:
                    response = client.post(endpoint, json=payload, headers=headers)

                if response.status_code != 200:
                    err_text = response.text
                    if "json_validate_failed" in err_text:
                        logger.warning("Groq json_validate_failed detected. Removing response_format constraint for subsequent attempts.")
                        payload.pop("response_format", None)
                    raise LLMClientError(
                        f"LLM API returned HTTP {response.status_code}: {err_text}"
                    )

                data = response.json()
                choices = data.get("choices", [])
                if not choices:
                    raise LLMClientError("LLM returned empty choices list.")

                content = choices[0].get("message", {}).get("content", "")
                if not content:
                    raise LLMClientError("LLM returned empty message content.")

                # Clean markdown codeblocks if LLM wraps in ```json ... ```
                cleaned_content = re.sub(r"^```json\s*|\s*```$", "", content.strip(), flags=re.MULTILINE)

                # Extract JSON substring if wrapped with text or reasoning tokens
                json_match = re.search(r"(\{[\s\S]*\})", cleaned_content)
                if json_match:
                    cleaned_content = json_match.group(1)

                parsed_json = json.loads(cleaned_content)
                return response_model.model_validate(parsed_json)

            except httpx.TimeoutException as te:
                last_exception = LLMTimeoutError(f"LLM request timed out after {self.timeout_seconds}s: {te}")
                logger.warning("LLM attempt %d timed out: %s", attempt + 1, te)
            except json.JSONDecodeError as jde:
                last_exception = LLMResponseValidationError(f"Invalid JSON returned by LLM: {jde}")
                logger.warning("LLM attempt %d returned malformed JSON: %s", attempt + 1, jde)
            except ValidationError as ve:
                last_exception = LLMResponseValidationError(f"LLM response failed schema validation: {ve}")
                logger.warning("LLM attempt %d schema mismatch: %s", attempt + 1, ve)
            except Exception as exc:
                last_exception = LLMClientError(f"LLM communication error: {exc}")
                logger.warning("LLM attempt %d error: %s", attempt + 1, exc)

            if attempt < self.max_retries:
                exc_str = str(last_exception) if last_exception else ""
                
                # Check if Model was not found / not accessible on provider (404)
                if "model_not_found" in exc_str.lower() or "does not exist" in exc_str.lower() or "404" in exc_str:
                    next_model = next((m for m in GROQ_FALLBACK_MODELS if m not in tried_models), None)
                    if next_model:
                        logger.warning("Model %s not found (404). Auto-switching to fallback model: %s", payload["model"], next_model)
                        tried_models.add(next_model)
                        payload["model"] = next_model
                        self.model = next_model
                        time.sleep(0.5)
                        continue
                    else:
                        logger.warning("All LLM fallback models exhausted for model_not_found. Falling back immediately to rule-based engine.")
                        raise last_exception

                # Check if Daily Token Quota (TPD) was exceeded
                if "tokens per day" in exc_str.lower() or "tpd" in exc_str.lower():
                    next_model = next((m for m in GROQ_FALLBACK_MODELS if m not in tried_models), None)
                    if next_model:
                        logger.warning("Daily token limit (TPD) reached for model %s. Auto-switching to fallback model: %s", payload["model"], next_model)
                        tried_models.add(next_model)
                        payload["model"] = next_model
                        self.model = next_model
                        time.sleep(1.0)
                        continue
                    else:
                        logger.warning("All LLM fallback models exhausted for daily quota. Falling back immediately to rule-based engine.")
                        raise last_exception

                # Standard rate limit backoff
                wait_time = 0.5 * (attempt + 1)
                if "429" in exc_str:
                    groq_secs = parse_groq_retry_seconds(exc_str)
                    if groq_secs is not None and groq_secs <= 20.0:
                        wait_time = groq_secs + 1.0
                    elif groq_secs is not None and groq_secs > 20.0:
                        # Wait time too long for inline wait (minutes); try alternate model
                        next_model = next((m for m in GROQ_FALLBACK_MODELS if m not in tried_models), None)
                        if next_model:
                            logger.warning("Rate limit wait (%.1fs) too long. Switching to fallback model: %s", groq_secs, next_model)
                            tried_models.add(next_model)
                            payload["model"] = next_model
                            self.model = next_model
                            time.sleep(1.0)
                            continue
                        wait_time = 15.0
                    else:
                        wait_time = min(5.0 * (attempt + 1), 15.0)
                    logger.info("Rate limit (429) detected: sleeping %.2fs before attempt %d...", wait_time, attempt + 2)
                time.sleep(wait_time)

        if last_exception:
            raise last_exception
        raise LLMClientError("LLM generation failed with unknown error.")


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
