"""Configuration, pattern definitions, and thresholds for pre-meeting and relevance filtering."""

from typing import List, Set

# Explicit phrases signaling the formal start of a meeting across English, Hindi, and Spanish
MEETING_START_PATTERNS: List[str] = [
    # English
    "let's get started",
    "lets get started",
    "let's begin",
    "lets begin",
    "let's start",
    "lets start",
    "let's start today's meeting",
    "lets start today's meeting",
    "let's start the meeting",
    "lets start the meeting",
    "let's start today's standup",
    "lets start today's standup",
    "let's start the standup",
    "lets start the standup",
    "we'll begin with",
    "we will begin with",
    "we can get started",
    "shall we start",
    "let's kick off",
    "kick off today's",
    # Hindi (Devanagari & Romanized)
    "शुरू करते हैं",
    "मीटिंग शुरू करते हैं",
    "चलो शुरू करें",
    "शुरू करें",
    "start karte hain",
    "meeting shuru karte hain",
    "chalo shuru karein",
    # Spanish
    "vamos a empezar",
    "comencemos la reunión",
    "comencemos la reunion",
    "comencemos",
    "empecemos la reunión",
    "empecemos la reunion",
    "empecemos",
    "vamos a comenzar",
]

# Audio and microphone testing patterns (English, Hindi, Spanish)
AUDIO_CHECK_PATTERNS: List[str] = [
    # English
    "can you hear me",
    "am i audible",
    "is my mic working",
    "hello hello testing",
    "hello testing",
    "mic testing",
    "sound testing",
    "testing testing",
    "testing 1 2 3",
    "can you hear my voice",
    "mic check",
    "hear me okay",
    "hear me now",
    "you guys can hear me",
    "can everyone hear me",
    "sound check",
    "mic is working",

    # Hindi
    "आवाज़ आ रही है",
    "मेरी आवाज़ आ रही है",
    "सुन पा रहे हो",
    "aawaz aa rahi hai",
    "awaaz aa rahi hai",
    "meri aawaz aa rahi hai",
    # Spanish
    "¿me escuchan?",
    "me escuchan",
    "¿se escucha?",
    "se escucha",
    "¿pueden oírme?",
    "pueden oirme",
    "probando micrófono",
    "probando microfono",
]

# Network and connection/screen setup patterns (English, Hindi, Spanish)
CONNECTION_CHECK_PATTERNS: List[str] = [
    # English
    "can you see my screen",
    "can everyone see my screen",
    "is my screen visible",
    "my connection is unstable",
    "connection is unstable",
    "wait let me reconnect",
    "let me reconnect",
    "is everyone connected",
    "dropped off the call",
    "poor connection",
    "screen share working",
    # Hindi
    "स्क्रीन दिख रही है",
    "स्क्रीन दिख रहा है",
    "screen dikh rahi hai",
    "connection unstable hai",
    # Spanish
    "¿pueden ver mi pantalla?",
    "pueden ver mi pantalla",
    "mi conexión es inestable",
    "mi conexion es inestable",
    "pantalla compartida",
]

# Pre-meeting arrival, casual waiting, and readiness checks (before meeting start)
PRE_MEETING_PATTERNS: List[str] = [
    # English
    "are you joining from home",
    "joining from home",
    "give me one minute",
    "give me a minute",
    "give me two minutes",
    "wait sarthak is joining",
    "is joining",
    "can everyone join the call",
    "wait for everyone to join",
    "waiting for everyone",
    "just joined",
    "hold on a second",
    "give it another minute",
    "anyone else joining",
    "let's wait for",
    # Hindi
    "एक minute",
    "ek minute",
    "रुक जाओ",
    "सब आ गए क्या",
    "sab aa gaye",
    # Spanish
    "espera un minuto",
    "dame un minuto",
    "se está uniendo",
    "se esta uniendo",
    "esperemos un momento",
]

# Unambiguously irrelevant social/food chatter
IRRELEVANT_PATTERNS: List[str] = [
    # English
    "order food",
    "ordered food",
    "time are we going for lunch",
    "going for lunch",
    "send me that photo",
    "what's for lunch",
    "whats for lunch",
    "dinner plans",
    "coffee break",
    "weekend was good",
    "traffic was terrible",
    "movie yesterday",
    # Hindi
    "खाना आ गया",
    "लंच के लिए",
    "फोटो भेज देना",
    # Spanish
    "pedir comida",
    "hora del almuerzo",
    "mándame esa foto",
    "mandame esa foto",
]

# Technical and project terms that strictly protect a segment from being filtered out.
# If ANY of these appear in a segment, it must ALWAYS be preserved as MEETING_CONTENT.
TECHNICAL_MEETING_KEYWORDS: Set[str] = {
    # Engineering & Architecture
    "database",
    "db",
    "api",
    "production",
    "prod",
    "deploy",
    "deployment",
    "frontend",
    "backend",
    "issue",
    "issues",
    "bug",
    "bugs",
    "fix",
    "fixed",
    "pr",
    "commit",
    "code",
    "unit test",
    "integration test",
    "api test",
    "test suite",
    "test case",
    "test cases",
    "unit",
    "integration",
    "sprint",
    "ticket",
    "tickets",
    "jira",
    "server",
    "logs",
    "error",
    "errors",
    "exception",
    "query",
    "queries",
    "pipeline",
    "endpoint",
    "endpoints",
    "service",
    "services",
    "docker",
    "auth",
    "authentication",
    "login",
    "migration",
    "schema",
    "table",
    "client",
    "feature",
    "features",
    "progress",
    "blocker",
    "blockers",
    "standup",
    "review",
    "architecture",
    "repository",
    "repo",
    "branch",
    "merge",
    "build",
    "cache",
    # Hindi technical keywords
    "डेटाबेस",
    "समस्या",
    "काम",
    "बग",
    "फ़ीचर",

}

# Confidence thresholds
CONFIDENCE_HIGH: float = 0.95
CONFIDENCE_MEDIUM: float = 0.85
CONFIDENCE_LOW: float = 0.60
EXCLUSION_THRESHOLD: float = 0.90
