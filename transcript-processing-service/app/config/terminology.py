"""Project terminology and technical vocabulary configuration for STT and Terminology Normalization."""

from typing import Any, Dict, List, Tuple

# Configurable technical vocabulary for Sprintive (Scrum & software development platform).
# Used by Part 6 as contextual evidence for STT correction.
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
    "Vite",
]

# Canonical terminology dictionary for Part 8 Technical Terminology Normalization.
# Maps technical concepts to canonical representation, known phonetic/written variants,
# and whether the term is ambiguous in conversational English (requiring context disambiguation).
CANONICAL_TECHNICAL_TERMS: Dict[str, Dict[str, Any]] = {
    "PostgreSQL": {
        "canonical": "PostgreSQL",
        "variants": [
            "post gre sql",
            "postgre sql",
            "postgres sql",
            "postgresql",
            "postgres",
        ],
        "ambiguous": False,
    },
    "Supabase": {
        "canonical": "Supabase",
        "variants": ["superbase", "supabase"],
        "ambiguous": False,
    },
    "FastAPI": {
        "canonical": "FastAPI",
        "variants": ["fast api", "fastapi"],
        "ambiguous": False,
    },
    "WebRTC": {
        "canonical": "WebRTC",
        "variants": ["web rtc", "webrtc"],
        "ambiguous": False,
    },
    "Node.js": {
        "canonical": "Node.js",
        "variants": ["node js", "nodejs", "node.js"],
        "ambiguous": False,
    },
    "JavaScript": {
        "canonical": "JavaScript",
        "variants": ["javascript", "java script"],
        "ambiguous": False,
    },
    "TypeScript": {
        "canonical": "TypeScript",
        "variants": ["typescript", "type script"],
        "ambiguous": False,
    },
    "REST API": {
        "canonical": "REST API",
        "variants": ["rest api", "rest-api", "restapi"],
        "ambiguous": False,
    },
    "API": {
        "canonical": "API",
        "variants": ["api"],
        "ambiguous": False,
    },
    "GraphQL": {
        "canonical": "GraphQL",
        "variants": ["graphql", "graph ql"],
        "ambiguous": False,
    },
    "Docker": {
        "canonical": "Docker",
        "variants": ["docker"],
        "ambiguous": False,
    },
    "Kubernetes": {
        "canonical": "Kubernetes",
        "variants": ["kubernetes", "k8s"],
        "ambiguous": False,
    },
    "GitHub": {
        "canonical": "GitHub",
        "variants": ["github", "git hub"],
        "ambiguous": False,
    },
    "Scrum Master": {
        "canonical": "Scrum Master",
        "variants": ["scrum master", "scrum-master"],
        "ambiguous": False,
    },
    "daily standup": {
        "canonical": "daily standup",
        "variants": ["daily stand up", "daily standup", "daily-standup"],
        "ambiguous": False,
    },
    "sprint review": {
        "canonical": "sprint review",
        "variants": ["sprint review", "sprint-review"],
        "ambiguous": False,
    },
    "sprint planning": {
        "canonical": "sprint planning",
        "variants": ["sprint planning", "sprint-planning"],
        "ambiguous": False,
    },
    "Scrum": {
        "canonical": "Scrum",
        "variants": ["scrum"],
        "ambiguous": False,
    },
    "Whisper": {
        "canonical": "Whisper",
        "variants": ["whisper"],
        "ambiguous": False,
    },
    "STT": {
        "canonical": "STT",
        "variants": ["stt"],
        "ambiguous": False,
    },
    "LLM": {
        "canonical": "LLM",
        "variants": ["llm"],
        "ambiguous": False,
    },
    "CI/CD": {
        "canonical": "CI/CD",
        "variants": ["ci/cd", "ci cd"],
        "ambiguous": False,
    },
    "Vite": {
        "canonical": "Vite",
        "variants": ["vite"],
        "ambiguous": False,
    },
    # Ambiguous terms (can be technical or ordinary language)
    "React": {
        "canonical": "React",
        "variants": ["react"],
        "ambiguous": True,
        "technical_hints": [
            "frontend",
            "library",
            "component",
            "ui",
            "hook",
            "javascript",
            "typescript",
            "framework",
            "redux",
            "state",
            "props",
            "jsx",
            "tsx",
            "web",
            "app",
            "using",
        ],
        "non_technical_hints": [
            "how did",
            "why did",
            "react to",
            "react against",
            "reacted",
            "reacting",
        ],
    },
    "Express": {
        "canonical": "Express",
        "variants": ["express js", "express.js", "express"],
        "ambiguous": True,
        "technical_hints": [
            "backend",
            "node",
            "nodejs",
            "server",
            "middleware",
            "api",
            "framework",
            "routing",
        ],
        "non_technical_hints": [
            "express feelings",
            "express concern",
            "express opinions",
            "to express",
        ],
    },
}


def get_technical_terms() -> List[str]:
    """Return a copy of the configured technical terms list."""
    return list(TECHNICAL_TERMS)


def format_terms_for_prompt() -> str:
    """Format technical terms as a comma-separated string for prompt context injection."""
    return ", ".join(TECHNICAL_TERMS)


def get_canonical_terms_dict() -> Dict[str, Dict[str, Any]]:
    """Return dictionary of canonical terms and their variants."""
    return dict(CANONICAL_TECHNICAL_TERMS)


def get_sorted_variant_mappings() -> List[Tuple[str, str, bool, Dict[str, Any]]]:
    """
    Return all variant mappings sorted by variant length descending to guarantee
    longest-match-first replacement.
    Format: list of (variant, canonical, is_ambiguous, term_info)
    """
    mappings: List[Tuple[str, str, bool, Dict[str, Any]]] = []
    for term_key, term_info in CANONICAL_TECHNICAL_TERMS.items():
        canonical = term_info["canonical"]
        is_ambiguous = term_info.get("ambiguous", False)
        # Include canonical itself in variants if needed
        variants = set(term_info.get("variants", []))
        variants.add(canonical.lower())
        for variant in variants:
            mappings.append((variant, canonical, is_ambiguous, term_info))

    # Sort by length descending, and secondary sort alphabetically
    mappings.sort(key=lambda item: (-len(item[0]), item[0]))
    return mappings
