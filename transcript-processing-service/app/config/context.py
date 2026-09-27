"""Configuration settings and known entity vocabularies for Part 9 - Contextual Consistency Check."""

from typing import List, Set

DEFAULT_CONTEXT_CONFIDENCE_THRESHOLD: float = 0.80
DEFAULT_CONTEXT_BEFORE: int = 3
DEFAULT_CONTEXT_AFTER: int = 3

# Known technical entities (technologies, tools, protocols, frameworks)
KNOWN_TECHNICAL_ENTITIES: Set[str] = {
    "PostgreSQL",
    "Supabase",
    "React",
    "FastAPI",
    "WebRTC",
    "API",
    "REST API",
    "Node.js",
    "JavaScript",
    "TypeScript",
    "GraphQL",
    "Docker",
    "Kubernetes",
    "GitHub",
    "Whisper",
    "STT",
    "LLM",
    "CI/CD",
    "Vite",
    "SQL",
    "Express",
}

# Known project and architectural entities
KNOWN_PROJECT_ENTITIES: Set[str] = {
    "backend",
    "frontend",
    "database",
    "authentication",
    "auth",
    "deployment",
    "testing",
    "endpoint",
    "microservice",
    "server",
    "client",
    "ui",
    "cache",
    "queue",
}

# Known meeting and Scrum agile entities
KNOWN_MEETING_ENTITIES: Set[str] = {
    "sprint",
    "sprint review",
    "sprint planning",
    "daily standup",
    "standup",
    "retrospective",
    "blocker",
    "backlog",
    "story",
    "ticket",
    "pull request",
    "pr",
    "commit",
    "demo",
    "merge conflict",
}

# Common temporal indicators that establish timeline and resolve apparent contradictions
TEMPORAL_INDICATORS: Set[str] = {
    "yesterday",
    "today",
    "tomorrow",
    "currently",
    "now",
    "earlier",
    "later",
    "before",
    "after",
    "recently",
    "previously",
    "initially",
    "fixed",
    "resolved",
    "working now",
    "fixed now",
    "right now",
    "at the moment",
}

# Natural topic change indicators that are normal in Scrum meetings and NOT contextual errors
TOPIC_CHANGE_INDICATORS: List[str] = [
    "now let's discuss",
    "let's move to",
    "let's talk about",
    "next item is",
    "moving on to",
    "next up is",
    "what about",
    "shifting to",
    "on another note",
    "tomorrow is",
    "sprint review is",
    "sprint planning is",
]
