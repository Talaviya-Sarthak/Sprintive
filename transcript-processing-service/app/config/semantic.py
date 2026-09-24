"""Configuration settings, thresholds, and semantic lexicons for Part 12 — Semantic Preservation Validation."""

from typing import Dict, Set

# Confidence thresholds
SEMANTIC_CONFIDENCE_STRONG: float = 0.90
SEMANTIC_CONFIDENCE_REVIEW: float = 0.75

# Default conversational context window
DEFAULT_SEMANTIC_CONTEXT_BEFORE: int = 3
DEFAULT_SEMANTIC_CONTEXT_AFTER: int = 3

# Negation words across English, Hindi, and Spanish
NEGATION_WORDS: Set[str] = {
    # English
    "not", "no", "never", "none", "nobody", "nothing", "neither", "nor", "nowhere",
    "cannot", "cant", "can't", "wont", "won't", "dont", "don't", "doesnt", "doesn't",
    "didnt", "didn't", "isnt", "isn't", "arent", "aren't", "wasnt", "wasn't",
    "werent", "weren't", "havent", "haven't", "hasnt", "hasn't", "hadnt", "hadn't",
    "shouldnt", "shouldn't", "wouldnt", "wouldn't", "couldnt", "couldn't",
    # Hindi
    "nahi", "nahin", "na", "mat", "नहीं", "ना", "मत",
    # Spanish
    "nunca", "jamás", "jamas", "tampoco", "nada", "nadie", "ningún", "ningun", "ninguna",
}

# Number words mapping to canonical integer
NUMBER_WORDS: Dict[str, int] = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5,
    # Hindi
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "chhah": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5,
    # Spanish
    "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
}

# Date and temporal relative markers (avoiding standalone modal verbs like "may")
DATE_MARKERS: Set[str] = {
    # Relative days
    "today", "tomorrow", "yesterday", "tonight",
    "aaj", "kal", "parso", "hoy", "mañana", "ayer",
    # Days of week
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "mon", "tue", "wed", "thu", "fri", "sat", "sun",
    # Relative weeks/months
    "next week", "this week", "last week", "next month", "this month", "last month",
    "end of week", "end of day", "eod", "eow",
    # Months (standalone "may" omitted to avoid collision with modal verb)
    "january", "february", "march", "april", "june", "july", "august",
    "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
}

# Uncertainty markers (epistemic modality)
UNCERTAINTY_MARKERS: Set[str] = {
    "i think", "i believe", "i guess", "i suppose", "maybe", "probably",
    "possibly", "perhaps", "might", "may", "could", "seems", "seemed",
    "appears", "appeared", "likely", "unlikely", "doubtful", "not sure",
    "lagta hai", "shayad", "tal vez", "quizás", "quizas", "posiblemente",
}

# Causal indicators
CAUSAL_MARKERS: Set[str] = {
    "because", "since", "due to", "as a result", "therefore", "caused by",
    "causing", "leads to", "leading to", "kyunki", "porque",
}

# Conditionality markers
CONDITIONAL_MARKERS: Set[str] = {
    "if", "unless", "provided that", "in case", "whether", "agar", "si",
}
