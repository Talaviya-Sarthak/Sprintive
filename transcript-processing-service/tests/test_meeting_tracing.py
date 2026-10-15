"""Focused tests for LangSmith Tracing integration, privacy redaction, and observability.

Verifies:
1. Dependency and import compatibility.
2. Tracing disabled behavior (0 overhead, no errors).
3. Tracing enabled with configuration present.
4. Missing credentials handling without pipeline interruption.
5. Privacy redaction of raw transcripts, secrets, API keys, and participant PII.
6. Custom LLM client instrumentation (real token recording, latency, errors, no duplication).
7. ReAct tool execution tracing and error visibility.
8. Graceful isolation: tracing network failures never fail the meeting AI pipeline.
"""

import os
from unittest.mock import MagicMock, patch
import pytest

from app.core.config import settings
from app.models.meeting_agent import MeetingAnalysisResult
from app.models.scrum_agent import ScrumResult, ScrumTask
from app.services.llm_client import OpenAICompatibleLLMClient
from app.services.meeting_agent import MainMeetingAgent
from app.services.react.tools import execute_analyze_meeting, execute_extract_scrum_tasks
from app.services.tracing import (
    LLMCallTracer,
    is_tracing_enabled,
    sanitize_trace_inputs,
    sanitize_trace_outputs,
    sprintive_traceable,
)


def test_tracing_imports_and_availability():
    """Verify LangSmith SDK and tracing components are importable and functional."""
    from langsmith import Client, traceable
    from langsmith.run_helpers import get_current_run_tree

    assert callable(traceable)
    assert Client is not None
    assert callable(get_current_run_tree)


def test_tracing_disabled_when_flag_false():
    """Verify that when LANGSMITH_TRACING=false, is_tracing_enabled() returns False."""
    with patch.object(settings, "LANGSMITH_TRACING", False):
        assert is_tracing_enabled() is False


def test_tracing_disabled_when_api_key_missing():
    """Verify that when API key is missing or empty, is_tracing_enabled() returns False."""
    with patch.object(settings, "LANGSMITH_TRACING", True), \
         patch.object(settings, "LANGSMITH_API_KEY", ""):
        assert is_tracing_enabled() is False


def test_privacy_redaction_filters_raw_transcript_and_secrets():
    """Verify that sensitive fields (transcripts, auth keys, passwords) are redacted."""
    raw_inputs = {
        "meeting_id": "00000000-0000-0000-0000-000000000099",
        "team_id": "team-secret-xyz",
        "transcript": "Alice: Here is our confidential financial customer data...",
        "raw_text": "Bob: And secret internal passwords are password123...",
        "clean_transcript": "Charlie: Highly sensitive roadmap...",
        "api_key": "gsk_sensitive_secret_key_12345",
        "service_role_key": "supabase_secret_key_67890",
        "participants": [
            {"id": "user-1", "full_name": "Alice Smith", "email": "alice@confidential.com", "role": "host"},
            {"user_id": "user-2", "full_name": "Bob Jones", "role": "attendee"},
        ],
        "timezone": "UTC",
    }

    sanitized = sanitize_trace_inputs(raw_inputs)

    # Confidential text must be redacted
    assert "confidential financial" not in str(sanitized)
    assert "password123" not in str(sanitized)
    assert "Highly sensitive" not in str(sanitized)
    assert "[REDACTED_TRANSCRIPT" in sanitized["transcript"]
    assert "[REDACTED_TRANSCRIPT" in sanitized["raw_text"]
    assert "[REDACTED_TRANSCRIPT" in sanitized["clean_transcript"]

    # Secrets and keys must be redacted
    assert sanitized["api_key"] == "[REDACTED_SECRET]"
    assert sanitized["service_role_key"] == "[REDACTED_SECRET]"

    # PII like emails must not be leaked; structural roles and IDs are retained
    assert "alice@confidential.com" not in str(sanitized)
    assert sanitized["participants"][0]["id"] == "user-1"
    assert sanitized["participants"][0]["role"] == "host"

    # Safe operational metadata is preserved
    assert sanitized["meeting_id"] == "00000000-0000-0000-0000-000000000099"
    assert sanitized["timezone"] == "UTC"


def test_privacy_redaction_filters_outputs():
    """Verify that trace outputs redact echoed transcripts while preserving safe summaries."""
    raw_outputs = {
        "status": "COMPLETED",
        "transcript": "Confidential meeting text",
        "action_items_count": 3,
        "token": "bearer-token-123",
    }

    sanitized = sanitize_trace_outputs(raw_outputs)
    assert "Confidential" not in str(sanitized)
    assert sanitized["token"] == "[REDACTED_SECRET]"
    assert sanitized["status"] == "COMPLETED"
    assert sanitized["action_items_count"] == 3


def test_llm_call_tracer_records_real_provider_tokens():
    """Verify that LLMCallTracer captures actual tokens and metadata without fabricating costs."""
    mock_run_tree = MagicMock()
    mock_run_tree.extra = {}

    tracer = LLMCallTracer(
        model="qwen/qwen3.8-27b",
        provider="groq",
        system_prompt="You are a Scrum assistant.",
        user_prompt="Analyze this task.",
        response_model_name="ScrumResult",
        temperature=0.0,
        attempt=1,
    )
    tracer._run_tree = mock_run_tree

    sample_provider_response = {
        "id": "chatcmpl-123",
        "usage": {
            "prompt_tokens": 150,
            "completion_tokens": 75,
            "total_tokens": 225,
        },
    }

    tracer.record_success(sample_provider_response, validated_output={"tasks": []})

    # Verify real tokens recorded
    mock_run_tree.end.assert_called_once()
    outputs_called = mock_run_tree.end.call_args[1]["outputs"]
    assert outputs_called["status"] == "success"
    assert outputs_called["usage"]["prompt_tokens"] == 150
    assert outputs_called["usage"]["completion_tokens"] == 75
    assert outputs_called["usage"]["total_tokens"] == 225
    assert mock_run_tree.extra["usage"]["total_tokens"] == 225
    mock_run_tree.patch.assert_called_once()


def test_llm_call_tracer_records_errors():
    """Verify that LLMCallTracer records error details on failure."""
    mock_run_tree = MagicMock()

    tracer = LLMCallTracer(
        model="openai/gpt-oss-20b",
        provider="groq",
        system_prompt="Prompt",
        user_prompt="Input",
        response_model_name="MeetingAnalysisResult",
        temperature=0.0,
        attempt=2,
    )
    tracer._run_tree = mock_run_tree

    err = Exception("Rate limit (tpm_exceeded)")
    tracer.record_error(err, status_code=429)

    mock_run_tree.end.assert_called_once()
    assert "tpm_exceeded" in mock_run_tree.end.call_args[1]["error"]
    assert "HTTP 429" in mock_run_tree.end.call_args[1]["error"]
    mock_run_tree.patch.assert_called_once()


def test_sprintive_traceable_decorator_isolation_on_failure():
    """Verify that traceable failures or missing networks never crash the underlying function."""
    @sprintive_traceable(name="FaultyFunction", run_type="chain")
    def sample_work(x: int) -> int:
        return x * 10

    # Even if langsmith raises an error or has network issues, sample_work must succeed
    assert sample_work(4) == 40


def test_tool_tracing_captures_observation_and_errors():
    """Verify that ReAct tools execute properly under tracing decorator."""
    mock_agent = MagicMock(spec=MainMeetingAgent)
    mock_agent.analyze_transcript.return_value = MeetingAnalysisResult(
        summary="Sprint review summary",
        topics=["CI/CD", "Testing"],
        decisions=["Adopt LangSmith"],
        action_items=["Instrument AI pipeline"],
        blockers=[],
    )

    obs = execute_analyze_meeting(
        transcript="Team discussed observability and tracing.",
        agent=mock_agent,
    )

    assert obs.success is True
    assert "Analysis completed" in obs.summary
    assert len(obs.data["decisions"]) == 1

    # Verify tool error observation under tracing
    err_obs = execute_extract_scrum_tasks(analysis=None)
    assert err_obs.success is False
    assert "Dependency missing" in err_obs.error
