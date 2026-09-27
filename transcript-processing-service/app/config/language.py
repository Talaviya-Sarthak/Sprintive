"""Configuration settings and constants for Part 11 — Language Preservation Check."""

from typing import Set

# Confidence thresholds
LANGUAGE_CONFIDENCE_STRONG: float = 0.90
LANGUAGE_CONFIDENCE_REVIEW: float = 0.75

# Language codes (extensible)
LANG_EN: str = "en"
LANG_HI: str = "hi"
LANG_ES: str = "es"
LANG_UNKNOWN: str = "unknown"
LANG_MIXED: str = "mixed"

# Unicode script patterns
DEVANAGARI_REGEX: str = r"[\u0900-\u097F]"
SPANISH_SPECIAL_CHAR_REGEX: str = r"[áéíóúüñÁÉÍÓÚÜÑ¿¡]"

# Hinglish / Romanized Hindi keywords (case-insensitive, avoiding English collisions)
HINGLISH_WORDS: Set[str] = {
    "hai", "hain", "ho", "hoon", "hun", "tha", "thi",
    "ka", "ki", "ke", "ko", "se", "mein", "par", "pe",
    "raha", "rahi", "rahe",
    "kar", "karo", "kare", "karenge", "karna", "karte", "karti", "karta", "kiya",
    "nahi", "nahin", "na",
    "haan",
    "bol", "bolo", "bole", "bolna",
    "baad", "abhi", "ek", "teen",
    "kya", "kyun", "kyu", "kaise", "kab", "kahan", "kitna",
    "yeh", "woh",
    "apna", "apne", "apni",
    "hum", "tum", "aap", "mera", "meri", "mere", "tera", "teri", "tere",
    "aaj", "kal",
    "samajh", "aaya", "aayi", "aaye",
    "kuch", "sab", "toh", "bhi",
    "gaya", "gayi", "gaye", "hua", "hui", "hue",
    "le", "lo", "diya", "liye",
    "aur", "ya", "lekin", "magar",
    "accha", "achha", "theek", "thik",
    "chal", "chalo",
}

# Spanish keywords (case-insensitive, avoiding English collisions)
SPANISH_WORDS: Set[str] = {
    "el", "la", "los", "las", "un", "una", "unos", "unas",
    "del", "para", "por", "con", "sobre", "entre", "hacia", "desde", "hasta",
    "pero", "sino", "aunque",
    "que", "qué", "quien", "quién", "cual", "cuál", "donde", "dónde", "cuando", "cuándo", "como", "cómo",
    "es", "son", "fue", "ser", "estar", "está", "están", "estaba", "estaban", "hemos", "han",
    "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas", "aquel", "aquella",
    "yo", "tú", "tu", "él", "ella", "nosotros", "nosotras", "ellos", "ellas", "usted", "ustedes",
    "mi", "mis", "su", "sus", "nuestro", "nuestra",
    "sí", "más", "mas", "menos",
    "bien", "muy", "mal", "bueno", "buena", "buenos", "buenas",
    "hoy", "mañana", "ayer", "ahora", "después", "despues", "tarde", "pronto",
    "hola", "adiós", "adios", "gracias", "favor", "por favor",
    "podemos", "puede", "puedo", "pueden", "hacer", "revisar", "problema", "problemas",
    "equipo", "proyecto", "reunión", "reunion", "tiempo", "trabajo", "vamos", "hablar",
    "tema", "temas", "código", "codigo",
}

# Short expressions that may be language-neutral or ambiguous in isolation
AMBIGUOUS_SHORT_EXPRESSIONS: Set[str] = {
    "ok", "okay", "yes", "no", "yeah", "yep", "sure", "fine",
    "hi", "hello", "hey", "bye", "thanks", "thank you",
    "हाँ", "हा", "हाँजी", "नहीं", "ना", "ठीक", "अच्छा",
    "sí", "si", "hola", "adiós", "bien", "gracias",
}
