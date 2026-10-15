"""Sprintive AI Observability & LangSmith Tracing Infrastructure.

Provides privacy-preserving, fault-tolerant tracing for LangGraph workflows,
ReAct reasoning loops, tool invocations, and custom LLM client calls.
"""

import functools
import logging
import os
import time
from typing import Any, Callable, Dict, List, Optional, TypeVar

from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])

# Try importing LangSmith components safely
try:
    from langsmith import Client, traceable
    from langsmith.run_helpers import get_current_run_tree
    _LANGSMITH_AVAILABLE = True
except ImportError:
    _LANGSMITH_AVAILABLE = False
    Client = None  # type: ignore
    traceable = None  # type: ignore
    get_current_run_tree = lambda: None  # type: ignore


# ---------------------------------------------------------------------------
# Privacy Redaction & Sanitization Filters (Section 5)
# ---------------------------------------------------------------------------

_SENSITIVE_KEY_NAMES = {
    "transcript",
    "raw_text",
    "clean_transcript",
    "api_key",
    "authorization",
    "service_role_key",
    "supabase_service_role_key",
    "llm_api_key",
    "groq_api_key",
    "openai_api_key",
    "secret",
    "token",
    "password",
}


def is_tracing_enabled() -> bool:
    """Return True if LangSmith tracing is actively configured and enabled."""
    if not _LANGSMITH_AVAILABLE:
        return False
    return bool(settings.LANGSMITH_TRACING and settings.LANGSMITH_API_KEY.strip())


def sanitize_trace_inputs(inputs: Any) -> Any:
    """
    Sanitize function/tool inputs before sending to LangSmith.
    Replaces confidential raw transcripts and secrets with safe structural metadata.
    """
    if isinstance(inputs, dict):
        sanitized = {}
        for k, v in inputs.items():
            k_lower = str(k).lower()
            if any(s in k_lower for s in ("key", "secret", "token", "password", "auth")):
                sanitized[k] = "[REDACTED_SECRET]"
            elif k_lower in ("transcript", "raw_text", "clean_transcript"):
                if isinstance(v, (str, bytes)):
                    sanitized[k] = f"[REDACTED_TRANSCRIPT: length={len(v)} chars]"
                else:
                    sanitized[k] = "[REDACTED_TRANSCRIPT]"
            elif k_lower in ("participants", "team_members") and isinstance(v, list):
                # Redact personal PII (email, phone, avatar) and retain only safe structural metadata
                sanitized[k] = [
                    {
                        "id": p.get("id") or p.get("user_id"),
                        "role": p.get("role", "member"),
                    }
                    if isinstance(p, dict)
                    else "[PARTICIPANT_INFO]"
                    for p in v
                ]
            elif isinstance(v, (dict, list)):
                sanitized[k] = sanitize_trace_inputs(v)
            else:
                sanitized[k] = v
        return sanitized

    if isinstance(inputs, list):
        return [sanitize_trace_inputs(item) for item in inputs]

    if isinstance(inputs, (str, bytes)):
        # If a single long text payload looks like a transcript, mask it
        if len(inputs) > 300:
            return f"[REDACTED_TEXT: length={len(inputs)} chars]"
        return inputs

    return inputs


def sanitize_trace_outputs(outputs: Any) -> Any:
    """
    Sanitize function/tool outputs before sending to LangSmith.
    Prevents echoing raw transcripts while preserving business summaries and metrics.
    """
    if outputs is None:
        return None

    if isinstance(outputs, BaseModel):
        data = outputs.model_dump()
        return sanitize_trace_outputs(data)

    if isinstance(outputs, dict):
        sanitized = {}
        for k, v in outputs.items():
            k_lower = str(k).lower()
            if any(s in k_lower for s in ("transcript", "raw_text", "clean_transcript")):
                if isinstance(v, (str, bytes)):
                    sanitized[k] = f"[REDACTED_TRANSCRIPT: length={len(v)} chars]"
                else:
                    sanitized[k] = "[REDACTED_TRANSCRIPT]"
            elif any(s in k_lower for s in ("key", "secret", "token", "password", "auth")):
                sanitized[k] = "[REDACTED_SECRET]"
            elif isinstance(v, (dict, list, BaseModel)):
                sanitized[k] = sanitize_trace_outputs(v)
            else:
                sanitized[k] = v
        return sanitized

    if isinstance(outputs, list):
        return [sanitize_trace_outputs(item) for item in outputs]

    return outputs


# ---------------------------------------------------------------------------
# Tracing Decorators & Context Wrappers
# ---------------------------------------------------------------------------

def sprintive_traceable(
    name: str,
    run_type: str = "chain",
    tags: Optional[List[str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Callable[[F], F]:
    """
    Safe decorator that wraps functions with LangSmith traceable when enabled,
    enforcing privacy redaction and fault-tolerant fallback.
    """
    def decorator(func: F) -> F:
        if not is_tracing_enabled():
            return func

        try:
            effective_tags = list(tags or [])
            if "sprintive" not in effective_tags:
                effective_tags.append("sprintive")

            project = settings.LANGSMITH_PROJECT or "sprintive-meeting-ai"

            traced_func = traceable(
                name=name,
                run_type=run_type,
                tags=effective_tags,
                metadata=metadata,
                project_name=project,
                process_inputs=sanitize_trace_inputs,
                process_outputs=sanitize_trace_outputs,
            )(func)
            return functools.wraps(func)(traced_func)
        except Exception as exc:
            logger.warning("Failed to initialize LangSmith tracer for %s: %s; running untraced.", name, exc)
            return func

    return decorator


# ---------------------------------------------------------------------------
# LLM Execution Tracer (Section 4)
# ---------------------------------------------------------------------------

class LLMCallTracer:
    """
    Context manager for capturing structured LLM calls with real token metrics,
    latency, provider name, and error status without fabricating traces.
    """

    def __init__(
        self,
        model: str,
        provider: str,
        system_prompt: str,
        user_prompt: str,
        response_model_name: str,
        temperature: float,
        attempt: int = 1,
    ):
        self.model = model
        self.provider = provider
        self.system_prompt = system_prompt
        self.user_prompt = user_prompt
        self.response_model_name = response_model_name
        self.temperature = temperature
        self.attempt = attempt
        self.start_ts = 0.0
        self._run_tree = None

    def __enter__(self):
        self.start_ts = time.perf_counter()
        if not is_tracing_enabled():
            return self

        try:
            parent_run = get_current_run_tree()
            project = settings.LANGSMITH_PROJECT or "sprintive-meeting-ai"

            # Create an LLM run span nested under the active parent or standalone
            from langsmith.run_trees import RunTree

            safe_inputs = {
                "system_prompt_preview": self.system_prompt[:200] + ("..." if len(self.system_prompt) > 200 else ""),
                "user_prompt_preview": self.user_prompt[:200] + ("..." if len(self.user_prompt) > 200 else ""),
                "prompt_length_chars": len(self.system_prompt) + len(self.user_prompt),
                "expected_schema": self.response_model_name,
            }

            self._run_tree = RunTree(
                name=f"llm:{self.model}",
                run_type="llm",
                inputs=safe_inputs,
                parent_run=parent_run,
                project_name=project,
                tags=["llm", self.provider, self.model],
                extra={
                    "metadata": {
                        "provider": self.provider,
                        "model": self.model,
                        "temperature": self.temperature,
                        "attempt": self.attempt,
                        "response_model": self.response_model_name,
                    }
                },
            )
            self._run_tree.post()
        except Exception as exc:
            logger.debug("Failed to start LangSmith LLM span: %s", exc)
            self._run_tree = None

        return self

    def record_success(self, raw_data: Dict[str, Any], validated_output: Any):
        """Record successful completion with real provider token usage if reported."""
        duration_ms = int((time.perf_counter() - self.start_ts) * 1000)
        if not self._run_tree:
            return

        try:
            safe_outputs = {
                "status": "success",
                "structured_model": self.response_model_name,
                "latency_ms": duration_ms,
            }

            # Capture real usage reported by provider (never invented)
            usage = raw_data.get("usage")
            if isinstance(usage, dict):
                prompt_tokens = usage.get("prompt_tokens")
                completion_tokens = usage.get("completion_tokens")
                total_tokens = usage.get("total_tokens")
                if total_tokens is not None:
                    safe_outputs["usage"] = {
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": total_tokens,
                    }
                    self._run_tree.extra["usage"] = safe_outputs["usage"]

            self._run_tree.end(outputs=safe_outputs)
            self._run_tree.patch()
        except Exception as exc:
            logger.debug("Failed to finalize LangSmith LLM span: %s", exc)

    def record_error(self, error: Exception, status_code: Optional[int] = None):
        """Record error details on the LLM run span."""
        duration_ms = int((time.perf_counter() - self.start_ts) * 1000)
        if not self._run_tree:
            return

        try:
            self._run_tree.end(
                error=f"{type(error).__name__}: {str(error)}" + (f" (HTTP {status_code})" if status_code else ""),
                outputs={"status": "error", "latency_ms": duration_ms},
            )
            self._run_tree.patch()
        except Exception as exc:
            logger.debug("Failed to record error on LangSmith LLM span: %s", exc)

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_val and self._run_tree and self._run_tree.end_time is None:
            self.record_error(exc_val)
        return False
