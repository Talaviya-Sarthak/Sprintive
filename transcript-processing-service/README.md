# Sprintive Transcript Processing Service

> **Modules Implemented:**
> - **Module 1: Transcript Parsing (Foundation)**
> - **Module 2: Noise & Filler Detection (Classification)**
> - **Module 3: Repetition Removal (Deduplication)**
> - **Module 4: Pre-Meeting & Irrelevant Content Filtering**
> - **Module 5: Sentence Segmentation & Fragment Merging**
> - **Module 6: STT Error Correction (Acoustic Correction with Traceability)**
> - **Module 7: Grammar & Punctuation Normalization (Readability & Punctuation)**
> - **Module 8: Technical Terminology Normalization (Canonical Technical Vocabulary)**
> - **Module 9: Contextual Consistency Check (Logical & Domain Validation)**

The **Sprintive Transcript Processing Service** is a modular Python/FastAPI service responsible for transforming raw meeting transcripts stored in Supabase into structured, validated data suitable for downstream AI analysis.

---

## 1. What the Service Does

### Module 1: Transcript Parsing
- **Receives** a meeting ID and raw transcript path (or raw text).
- **Retrieves** raw transcript content via an abstracted storage interface (`BaseTranscriptStorage`).
- **Parses** dialogue lines into structured `TranscriptSegment` items using the first colon (`:`) as separator.
- **Preserves** 100% verbatim content:
  - Exact speaker names
  - Exact dialogue text (spelling, casing, grammar, repetitions, filler words, noise, and STT errors)
  - Multilingual Unicode text (Hindi, Spanish, Gujarati, Hinglish)
  - Sequential chronological ordering
  - Consecutive utterances from the same speaker (not merged)
  - Non-standard/unparsed lines (preserved with `speaker="UNKNOWN"` and structured warning)
- **Leaves raw transcripts immutable**: The original files are never altered.

### Module 2: Noise & Filler Detection
- **Receives** structured transcript segments from Part 1.
- **Analyzes** segments using deterministic, multi-layered rules and configurable multilingual filler dictionaries.
- **Decorates** each segment with:
  - `classification`: `CLEAN`, `FILLER`, `NOISE`, `POSSIBLE_REPETITION`, `UNCERTAIN`
  - `confidence`: Deterministic score between `0.0` and `1.0`
- **Follows DETECT FIRST principle**:
  - No text is deleted, translated, merged, or rewritten.
  - Original `sequence`, `speaker`, `text`, and ordering remain 100% untouched.
- **Conservative on meaningful words**: Standalone words such as `yes`, `no`, `okay`, `fine`, `done`, and `ready` are recognized as meaningful affirmations (`CLEAN`) unless repeated.
- **Context-aware**: Considers adjacent utterances to identify repetitive acknowledgements (e.g. repeated `Okay.` from the same speaker).

---

## 2. Detection Categories & Rules

| Category | Description | Examples | Confidence |
| :--- | :--- | :--- | :--- |
| **`CLEAN`** | Grammatical sentences, informative dialogue, or standalone affirmations | `"Good morning everyone."`, `"हाँ बोल"`, `"Yes."`, `"Done."` | `0.90 - 0.99` |
| **`FILLER`** | Pure non-lexical sounds / filler words across languages | `"um"`, `"uh"`, `"हम्म"`, `"eh"`, `"yeah"` | `0.95 - 0.97` |
| **`NOISE`** | Non-verbal bracketed audio tags, empty segments, punctuation noise | `"[Background typing noise and low hum]"`, `"[cough]"`, `"--"` | `0.98 - 1.00` |
| **`POSSIBLE_REPETITION`** | Full-segment token repetitions or consecutive identical acknowledgements | `"ready ready."`, `"Aló, aló, aló, aló."`, `"um um um"`, repeated `"Okay."` | `0.90 - 0.95` |
| **`UNCERTAIN`** | Ambiguous, unclassified, or isolated fragments | `"xk"`, short non-lexical fragments | `0.50 - 0.65` |

---

## 3. What is Intentionally NOT Implemented Yet

Per system specifications, Part 2 is strictly a **classifier/detector**, not a cleaner. The following operations are deliberately excluded from this phase and will be handled by subsequent pipeline modules:

- ❌ Repetition removal (reserved for Part 3)
- ❌ Permanent deletion of noise/filler segments
- ❌ Pre-meeting chatter filtering
- ❌ Sentence, grammar, or punctuation correction
- ❌ Consecutive same-speaker segment merging
- ❌ Translation or language normalization
- ❌ LLM calls, embeddings, or semantic extraction
- ❌ Action items, summary, or blocker extraction

---

## 4. Folder Structure

```
transcript-processing-service/
│
├── app/
│   ├── __init__.py
│   │
│   ├── main.py                        # FastAPI entrypoint, middleware, lifespan
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       └── transcript.py          # /transcript/parse & /transcript/analyze-noise routes
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── transcript.py              # TranscriptSegment, ParsedTranscript, AnalyzeNoise models
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── transcript_parser.py       # Pure, decoupled transcript parsing logic (Part 1)
│   │   ├── transcript_storage.py      # Abstract storage interface & Local implementation
│   │   ├── transcript_service.py      # Orchestrator connecting storage, parser, and detector
│   │   └── noise_detector.py          # Multi-layered noise & filler detection service (Part 2)
│   │
│   └── core/
│       ├── __init__.py
│       ├── config.py                  # Environment and application settings
│       └── fillers.py                 # Multilingual filler dictionaries (en, hi, es) & noise regexes
│
├── tests/
│   ├── __init__.py
│   ├── test_transcript_parser.py      # 10 unit tests covering core parsing rules
│   ├── test_real_transcript.py        # Integration test with realistic Sprintive transcript
│   ├── test_noise_detector.py         # 16 unit & context tests for noise/filler detection
│   ├── test_api.py                    # End-to-end FastAPI tests for /transcript/parse
│   ├── test_api_noise.py              # End-to-end FastAPI tests for /transcript/analyze-noise
│   └── fixtures/
│       └── sample_real_transcript.txt # Realistic multi-speaker multilingual transcript
│
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

---

## 5. Installation & Setup

### Prerequisites
- Python 3.11+
- `pip`

### 1. Set Up Virtual Environment (Recommended)

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 3. Environment Configuration

Copy `.env.example` to `.env`:

```powershell
cp .env.example .env
```

---

## 6. Running the Service

Start the FastAPI server using `uvicorn`:

```powershell
uvicorn app.main:app --reload --port 8001
```

Once running:
- **Interactive OpenAPI Documentation**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **ReDoc Documentation**: [http://localhost:8001/redoc](http://localhost:8001/redoc)
- **Health Check**: [http://localhost:8001/health](http://localhost:8001/health)

---

## 7. Running Tests

Run the complete test suite using `pytest`:

```powershell
pytest -v
```

All 39 unit and integration tests will execute, covering:
1. Normal English sentences (`CLEAN`)
2. Hindi sentences and Unicode safety (`हाँ बोल`) (`CLEAN`)
3. Spanish punctuation and characters (`¿Aló?`) (`CLEAN`)
4. Mixed-language Hinglish dialogue (`हाँ backend ready है.`) (`CLEAN`)
5. Filler words in English, Hindi, Spanish (`um`, `uh`, `हम्म`, `eh`, `yeah`) (`FILLER`)
6. Repeated words intra-segment (`ready ready.`) (`POSSIBLE_REPETITION`)
7. Repeated short utterances (`Aló, aló, aló, aló.`) (`POSSIBLE_REPETITION`)
8. Non-verbal bracketed noise (`[Background typing noise and low hum]`) (`NOISE`)
9. Meaningful standalone "yes" (`CLEAN`)
10. Meaningful standalone "no" (`CLEAN`)
11. Meaningful standalone and contextual "okay" (`CLEAN`)
12. Meaningful standalone "done" (`CLEAN`)
13. Meaningful standalone "ready" (`CLEAN`)
14. Empty/whitespace/punctuation segment (`NOISE`)
15. Punctuation variations preserved without text mutation
16. Critical multilingual preservation (`अरे एक minute बोल बाद ले.` unmodified)
17. Contextual consecutive repetitions (`Okay.` followed by `Okay.`) (`POSSIBLE_REPETITION`)
18. End-to-end API endpoints for `/transcript/parse` and `/transcript/analyze-noise`

---

## 8. API Specification

### Endpoint: `POST /transcript/analyze-noise`

#### Request Payload
```json
{
  "meeting_id": "meeting_123",
  "segments": [
    {
      "sequence": 1,
      "speaker": "Sarthak Talaviya",
      "text": "Good morning everyone."
    },
    {
      "sequence": 2,
      "speaker": "Harshit Pambhar",
      "text": "Aló, aló, aló, aló."
    },
    {
      "sequence": 3,
      "speaker": "Harshit Pambhar",
      "text": "I have one issue with the database connection."
    },
    {
      "sequence": 4,
      "speaker": "Sarthak Talaviya",
      "text": "ready ready."
    },
    {
      "sequence": 5,
      "speaker": "Harshit Pambhar",
      "text": "um"
    },
    {
      "sequence": 6,
      "speaker": "UNKNOWN",
      "text": "[Background typing noise and low hum]"
    }
  ]
}
```

#### Successful Response (`200 OK`)
```json
{
  "meeting_id": "meeting_123",
  "segments": [
    {
      "sequence": 1,
      "speaker": "Sarthak Talaviya",
      "text": "Good morning everyone.",
      "classification": "CLEAN",
      "confidence": 0.99
    },
    {
      "sequence": 2,
      "speaker": "Harshit Pambhar",
      "text": "Aló, aló, aló, aló.",
      "classification": "POSSIBLE_REPETITION",
      "confidence": 0.95
    },
    {
      "sequence": 3,
      "speaker": "Harshit Pambhar",
      "text": "I have one issue with the database connection.",
      "classification": "CLEAN",
      "confidence": 0.99
    },
    {
      "sequence": 4,
      "speaker": "Sarthak Talaviya",
      "text": "ready ready.",
      "classification": "POSSIBLE_REPETITION",
      "confidence": 0.95
    },
    {
      "sequence": 5,
      "speaker": "Harshit Pambhar",
      "text": "um",
      "classification": "FILLER",
      "confidence": 0.97
    },
    {
      "sequence": 6,
      "speaker": "UNKNOWN",
      "text": "[Background typing noise and low hum]",
      "classification": "NOISE",
      "confidence": 0.98
    }
  ]
}
```

---

### Endpoint: `POST /transcript/correct-stt` (Part 6)

Corrects speech-to-text recognition errors using structured LLM analysis while strictly preserving raw text, processed text, speaker, and language.

#### Request Payload
```json
{
  "meeting_id": "meeting_123",
  "segments": [
    {
      "sequence": 15,
      "source_sequences": [15, 16],
      "speaker": "Harshit Pambhar",
      "text": "I have one issue with the date abase connection.",
      "processed_text": "I have one issue with the date abase connection.",
      "merged": true,
      "include_in_meeting": true
    }
  ]
}
```

#### Successful Response (`200 OK`)
```json
{
  "meeting_id": "meeting_123",
  "segments": [
    {
      "sequence": 15,
      "source_sequences": [15, 16],
      "speaker": "Harshit Pambhar",
      "text": "I have one issue with the date abase connection.",
      "processed_text": "I have one issue with the date abase connection.",
      "stt_corrected_text": "I have one issue with the database connection.",
      "stt_modified": true,
      "stt_confidence": 0.96,
      "stt_error_type": "TECHNICAL_TERM_MISRECOGNITION",
      "stt_reason": "Likely STT recognition error for technical term",
      "merged": true,
      "include_in_meeting": true
    }
  ]
}
```

---

### Endpoint: `POST /transcript/normalize-grammar` (Part 7)

Improves grammatical readability and normalizes punctuation across transcript segments while strictly preserving speaker intent, conversational tone, meaning, language, and conversation structure.

#### Request Payload
```json
{
  "meeting_id": "meeting_123",
  "segments": [
    {
      "sequence": 15,
      "source_sequences": [15, 16],
      "speaker": "Harshit Pambhar",
      "text": "I have one issue with the date abase connection.",
      "processed_text": "I have one issue with the date abase connection.",
      "stt_corrected_text": "I have one issue with the database connection.",
      "stt_modified": true,
      "merged": true,
      "include_in_meeting": true
    }
  ]
}
```

#### Successful Response (`200 OK`)
```json
{
  "meeting_id": "meeting_123",
  "segments": [
    {
      "sequence": 15,
      "source_sequences": [15, 16],
      "speaker": "Harshit Pambhar",
      "text": "I have one issue with the date abase connection.",
      "processed_text": "I have one issue with the date abase connection.",
      "stt_corrected_text": "I have one issue with the database connection.",
      "stt_modified": true,
      "grammar_corrected_text": "I have an issue with the database connection.",
      "grammar_modified": true,
      "grammar_confidence": 0.95,
      "grammar_changes": [
        {
          "type": "GRAMMAR",
          "description": "Adjusted article for grammatical readability"
        }
      ],
      "merged": true,
      "include_in_meeting": true
    }
  ]
}
```

---

### Endpoint: `POST /transcript/normalize-terminology` (Part 8)

Normalizes software engineering and technical vocabulary into official canonical casing and spelling (e.g. `post gre SQL` &rarr; `PostgreSQL`, `fast api` &rarr; `FastAPI`, `web rtc` &rarr; `WebRTC`, `node js` &rarr; `Node.js`) while preserving ordinary words, multilingual dialogue, code identifiers (`getUserAPI`), and API paths (`/api/users`).

#### Request Payload
```json
{
  "meeting_id": "meeting_123",
  "segments": [
    {
      "sequence": 15,
      "source_sequences": [15, 16],
      "speaker": "Harshit Pambhar",
      "text": "We are connecting to post gre SQL using fast api.",
      "processed_text": "We are connecting to post gre SQL using fast api.",
      "stt_corrected_text": "We are connecting to post gre SQL using fast api.",
      "grammar_corrected_text": "We are connecting to post gre SQL using fast api.",
      "merged": true,
      "include_in_meeting": true
    }
  ]
}
```

#### Successful Response (`200 OK`)
```json
{
  "meeting_id": "meeting_123",
  "segments": [
    {
      "sequence": 15,
      "source_sequences": [15, 16],
      "speaker": "Harshit Pambhar",
      "text": "We are connecting to post gre SQL using fast api.",
      "processed_text": "We are connecting to post gre SQL using fast api.",
      "stt_corrected_text": "We are connecting to post gre SQL using fast api.",
      "grammar_corrected_text": "We are connecting to post gre SQL using fast api.",
      "terminology_normalized_text": "We are connecting to PostgreSQL using FastAPI.",
      "terminology_modified": true,
      "terminology_changes": [
        {
          "original_term": "post gre SQL",
          "canonical_term": "PostgreSQL",
          "change_type": "DETERMINISTIC_DICTIONARY",
          "confidence": 1.0,
          "reason": "Canonical dictionary normalization"
        },
        {
          "original_term": "fast api",
          "canonical_term": "FastAPI",
          "change_type": "DETERMINISTIC_DICTIONARY",
          "confidence": 1.0,
          "reason": "Canonical dictionary normalization"
        }
      ],
      "merged": true,
      "include_in_meeting": true
    }
  ]
}
```

---

### Endpoint: `POST /transcript/validate-context` (Part 9)

Validates whether the processed transcript remains logically, factually, and contextually consistent with surrounding conversation. Adheres strictly to the principle **CHECK &rarr; FLAG &rarr; PRESERVE**. Under no circumstances is transcript text modified or rewritten.

#### Request Payload
```json
{
  "meeting_id": "meeting_123",
  "segments": [
    {
      "sequence": 15,
      "source_sequences": [15, 16],
      "speaker": "Harshit Pambhar",
      "text": "The API is failing.",
      "processed_text": "The API is failing.",
      "stt_corrected_text": "The API is failing.",
      "grammar_corrected_text": "The API is failing.",
      "terminology_normalized_text": "The API is failing.",
      "include_in_meeting": true
    },
    {
      "sequence": 16,
      "source_sequences": [17],
      "speaker": "Sarthak Talaviya",
      "text": "Let's check the React database.",
      "processed_text": "Let's check the React database.",
      "stt_corrected_text": "Let's check the React database.",
      "grammar_corrected_text": "Let's check the React database.",
      "terminology_normalized_text": "Let's check the React database.",
      "include_in_meeting": true
    }
  ]
}
```

#### Successful Response (`200 OK`)
```json
{
  "meeting_id": "meeting_123",
  "segments": [
    {
      "sequence": 15,
      "source_sequences": [15, 16],
      "speaker": "Harshit Pambhar",
      "text": "The API is failing.",
      "processed_text": "The API is failing.",
      "stt_corrected_text": "The API is failing.",
      "grammar_corrected_text": "The API is failing.",
      "terminology_normalized_text": "The API is failing.",
      "context_status": "CONSISTENT",
      "context_confidence": 0.96,
      "context_flags": [],
      "context_reason": "Statement is clear and consistent with conversation.",
      "include_in_meeting": true
    },
    {
      "sequence": 16,
      "source_sequences": [17],
      "speaker": "Sarthak Talaviya",
      "text": "Let's check the React database.",
      "processed_text": "Let's check the React database.",
      "stt_corrected_text": "Let's check the React database.",
      "grammar_corrected_text": "Let's check the React database.",
      "terminology_normalized_text": "Let's check the React database.",
      "context_status": "POSSIBLE_INCONSISTENCY",
      "context_confidence": 0.88,
      "context_flags": [
        {
          "type": "TECHNICAL_CONTEXT_MISMATCH",
          "description": "The phrase 'React database' combines a frontend UI library with a database concept, which is unusual and may represent an error."
        }
      ],
      "context_reason": "The phrase 'React database' combines a frontend UI library with a database concept, which is unusual and may represent an error.",
      "include_in_meeting": true
    }
  ]
}
```


