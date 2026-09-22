"""Prompt package re-exports."""

from app.prompts.grammar_normalization import (
    GRAMMAR_SYSTEM_PROMPT,
    build_grammar_normalization_user_prompt,
)
from app.prompts.stt_correction import (
    SYSTEM_PROMPT,
    build_stt_correction_user_prompt,
)

__all__ = [
    "SYSTEM_PROMPT",
    "build_stt_correction_user_prompt",
    "GRAMMAR_SYSTEM_PROMPT",
    "build_grammar_normalization_user_prompt",
]
