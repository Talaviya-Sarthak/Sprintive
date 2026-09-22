"""Project terminology and technical vocabulary configuration for STT error correction."""

from typing import List

# Configurable technical vocabulary for Sprintive (Scrum & software development platform).
# Note: Part 6 uses these only as contextual evidence to help detect acoustic/phonetic
# STT recognition errors. Broad technical terminology normalization belongs to Part 8.
TECHNICAL_TERMS: List[str] = [
    "API",
    "REST API",
    "backend",
    "frontend",
    "database",
    "PostgreSQL",
    "Supabase",
    "React",
    "TypeScript",
    "FastAPI",
    "WebRTC",
    "STT",
    "Whisper",
    "Scrum",
    "sprint",
    "standup",
    "blocker",
    "deployment",
    "Docker",
    "Kubernetes",
    "GraphQL",
    "SQL",
    "endpoint",
    "microservice",
    "CI/CD",
    "PR",
    "pull request",
    "commit",
    "merge conflict",
]


def get_technical_terms() -> List[str]:
    """Return a copy of the configured technical terms list."""
    return list(TECHNICAL_TERMS)


def format_terms_for_prompt() -> str:
    """Format technical terms as a comma-separated string for prompt context injection."""
    return ", ".join(TECHNICAL_TERMS)
