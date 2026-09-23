"""Unit and scenario tests for Part 8 — Technical Terminology Normalization."""

import pytest
from app.models.transcript import (
    RelevanceCategory,
    TerminologyAnalysisLLMOutput,
    TerminologyChangeDetail,
    TerminologyChangeType,
    TranscriptSegment,
)
from app.services.llm_client import MockLLMClient
from app.services.terminology_normalizer import (
    mask_protected_patterns,
    normalize_terminology,
    select_input_text,
    unmask_protected_patterns,
)


class TestTerminologyNormalizer:
    """Comprehensive test suite covering all 26+ required scenarios for technical terminology normalization."""

    # 1. Exact canonical term (already canonical, no unnecessary modification)
    def test_01_exact_canonical_term(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="We are using PostgreSQL for persistence.",
                grammar_corrected_text="We are using PostgreSQL for persistence.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "We are using PostgreSQL for persistence."
        assert res.terminology_modified is False
        assert len(res.terminology_changes) == 0

    # 2. Lowercase term
    def test_02_lowercase_term(self):
        segments = [
            TranscriptSegment(
                sequence=2,
                speaker="Harshit Pambhar",
                text="The service runs on fastapi.",
                grammar_corrected_text="The service runs on fastapi.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "The service runs on FastAPI."
        assert res.terminology_modified is True
        assert len(res.terminology_changes) == 1
        assert res.terminology_changes[0].original == "fastapi"
        assert res.terminology_changes[0].normalized == "FastAPI"

    # 3. Case variation (javascript -> JavaScript, typescript -> TypeScript)
    def test_03_case_variation(self):
        segments = [
            TranscriptSegment(
                sequence=3,
                speaker="Sarthak Talaviya",
                text="We migrated from javascript to typescript.",
                grammar_corrected_text="We migrated from javascript to typescript.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "We migrated from JavaScript to TypeScript."
        assert res.terminology_modified is True
        assert len(res.terminology_changes) == 2

    # 4. Known spelling variant (superbase -> Supabase)
    def test_04_known_spelling_variant(self):
        segments = [
            TranscriptSegment(
                sequence=4,
                speaker="Harshit Pambhar",
                text="The database is hosted on superbase.",
                grammar_corrected_text="The database is hosted on superbase.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "The database is hosted on Supabase."
        assert res.terminology_modified is True
        assert res.terminology_changes[0].original == "superbase"
        assert res.terminology_changes[0].normalized == "Supabase"

    # 5. Technical pronunciation variant (post gre SQL -> PostgreSQL)
    def test_05_technical_pronunciation_variant(self):
        segments = [
            TranscriptSegment(
                sequence=5,
                speaker="Harshit Pambhar",
                text="We need to upgrade post gre sql before release.",
                grammar_corrected_text="We need to upgrade post gre sql before release.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "We need to upgrade PostgreSQL before release."
        assert res.terminology_modified is True

    # 6. Multi-word term longest-match (rest api -> REST API, not separately matching rest)
    def test_06_multi_word_term_longest_match(self):
        segments = [
            TranscriptSegment(
                sequence=6,
                speaker="Sarthak Talaviya",
                text="The rest api is documented in swagger.",
                grammar_corrected_text="The rest api is documented in swagger.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "The REST API is documented in swagger."
        assert res.terminology_modified is True
        assert len(res.terminology_changes) == 1
        assert res.terminology_changes[0].original.lower() == "rest api"
        assert res.terminology_changes[0].normalized == "REST API"

    # 7. Word boundary protection (capital does not become cAPIal)
    def test_07_word_boundary_protection(self):
        segments = [
            TranscriptSegment(
                sequence=7,
                speaker="Sarthak Talaviya",
                text="We need to conserve our capital.",
                grammar_corrected_text="We need to conserve our capital.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "We need to conserve our capital."
        assert res.terminology_modified is False
        assert "cAPIal" not in res.terminology_normalized_text

    # 8. Ordinary English word resembling technical term (Critical Test 3: react verb)
    def test_08_ordinary_english_resembling_term_critical_spec(self):
        segments = [
            TranscriptSegment(
                sequence=8,
                speaker="Sarthak Talaviya",
                text="How did he react to the issue?",
                grammar_corrected_text="How did he react to the issue?",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "How did he react to the issue?"
        assert res.terminology_modified is False
        assert "React" not in res.terminology_normalized_text

    # 9. React framework in frontend technical context (Critical Test 2)
    def test_09_react_technical_context_critical_spec(self):
        segments = [
            TranscriptSegment(
                sequence=9,
                speaker="Harshit Pambhar",
                text="We are using React for the frontend.",
                grammar_corrected_text="We are using React for the frontend.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        # Already canonical React
        assert res.terminology_normalized_text == "We are using React for the frontend."
        assert res.terminology_modified is False

        # If lowercase "react" in frontend context:
        segment_lower = TranscriptSegment(
            sequence=10,
            speaker="Harshit Pambhar",
            text="We are using react for the frontend.",
            grammar_corrected_text="We are using react for the frontend.",
            include_in_meeting=True,
        )
        res_lower = normalize_terminology([segment_lower])[0]
        assert res_lower.terminology_normalized_text == "We are using React for the frontend."
        assert res_lower.terminology_modified is True

    # 10. Postgres -> PostgreSQL
    def test_10_postgres_to_postgresql(self):
        segments = [
            TranscriptSegment(
                sequence=11,
                speaker="Harshit Pambhar",
                text="The postgres cluster is running.",
                grammar_corrected_text="The postgres cluster is running.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "The PostgreSQL cluster is running."
        assert res.terminology_modified is True

    # 11. Critical Test 1: post gre SQL -> PostgreSQL and fast api -> FastAPI
    def test_11_critical_test_1_post_gre_sql_and_fast_api(self):
        segments = [
            TranscriptSegment(
                sequence=12,
                speaker="Harshit Pambhar",
                text="The post gre SQL database is connected to the fast api backend.",
                grammar_corrected_text="The post gre SQL database is connected to the fast api backend.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert (
            res.terminology_normalized_text
            == "The PostgreSQL database is connected to the FastAPI backend."
        )
        assert res.terminology_modified is True
        assert len(res.terminology_changes) == 2
        normalized_names = [c.normalized for c in res.terminology_changes]
        assert "PostgreSQL" in normalized_names
        assert "FastAPI" in normalized_names

    # 12. fast api -> FastAPI
    def test_12_fast_api_to_fastapi(self):
        segments = [
            TranscriptSegment(
                sequence=13,
                speaker="Harshit Pambhar",
                text="The fast api server is listening on port 8001.",
                grammar_corrected_text="The fast api server is listening on port 8001.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        assert results[0].terminology_normalized_text == "The FastAPI server is listening on port 8001."
        assert results[0].terminology_modified is True

    # 13. web rtc -> WebRTC
    def test_13_web_rtc_to_webrtc(self):
        segments = [
            TranscriptSegment(
                sequence=14,
                speaker="Harshit Pambhar",
                text="We are streaming audio using web rtc.",
                grammar_corrected_text="We are streaming audio using web rtc.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        assert results[0].terminology_normalized_text == "We are streaming audio using WebRTC."
        assert results[0].terminology_modified is True

    # 14. node js -> Node.js
    def test_14_node_js_to_nodejs(self):
        segments = [
            TranscriptSegment(
                sequence=15,
                speaker="Harshit Pambhar",
                text="Our backend is built with node js and express.",
                grammar_corrected_text="Our backend is built with node js and express.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        assert "Node.js" in results[0].terminology_normalized_text
        assert results[0].terminology_modified is True

    # 15. Critical Test 4: Hindi with technical term
    def test_15_hindi_with_technical_term_critical_spec(self):
        segments = [
            TranscriptSegment(
                sequence=16,
                speaker="Harshit Pambhar",
                text="मैं supabase database use कर रहा हूँ.",
                grammar_corrected_text="मैं supabase database use कर रहा हूँ.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "मैं Supabase database use कर रहा हूँ."
        assert res.terminology_modified is True
        assert "मैं" in res.terminology_normalized_text
        assert "कर रहा हूँ" in res.terminology_normalized_text

    # 16. Spanish with technical term
    def test_16_spanish_with_technical_term(self):
        segments = [
            TranscriptSegment(
                sequence=17,
                speaker="Carlos",
                text="Estoy trabajando en el backend de supabase.",
                grammar_corrected_text="Estoy trabajando en el backend de supabase.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "Estoy trabajando en el backend de Supabase."
        assert res.terminology_modified is True

    # 17. Mixed-language transcript
    def test_17_mixed_language_transcript(self):
        segments = [
            TranscriptSegment(
                sequence=18,
                speaker="Harshit Pambhar",
                text="हाँ fast api backend ready है.",
                grammar_corrected_text="हाँ fast api backend ready है.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        assert results[0].terminology_normalized_text == "हाँ FastAPI backend ready है."
        assert results[0].terminology_modified is True

    # 18. Unknown technical term preserved without hallucinating
    def test_18_unknown_technical_term_preserved(self):
        segments = [
            TranscriptSegment(
                sequence=19,
                speaker="Harshit Pambhar",
                text="We used SomeInternalTool for indexing.",
                grammar_corrected_text="We used SomeInternalTool for indexing.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        assert results[0].terminology_normalized_text == "We used SomeInternalTool for indexing."
        assert results[0].terminology_modified is False

    # 19. URL protection
    def test_19_url_protection(self):
        segments = [
            TranscriptSegment(
                sequence=20,
                speaker="Harshit Pambhar",
                text="Check https://api.sprintive.com/v1/health for status.",
                grammar_corrected_text="Check https://api.sprintive.com/v1/health for status.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        assert "https://api.sprintive.com/v1/health" in results[0].terminology_normalized_text

    # 20. Critical Test 5: API endpoint protection
    def test_20_api_endpoint_protection_critical_spec(self):
        segments = [
            TranscriptSegment(
                sequence=21,
                speaker="Harshit Pambhar",
                text="The endpoint /api/users is failing.",
                grammar_corrected_text="The endpoint /api/users is failing.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        res = results[0]
        assert res.terminology_normalized_text == "The endpoint /api/users is failing."
        assert res.terminology_modified is False
        assert "/api/users" in res.terminology_normalized_text

    # 21. Code-like identifier protection (e.g. getUserAPI)
    def test_21_code_like_identifier_protection(self):
        segments = [
            TranscriptSegment(
                sequence=22,
                speaker="Harshit Pambhar",
                text="Call the getUserAPI function before rendering.",
                grammar_corrected_text="Call the getUserAPI function before rendering.",
                include_in_meeting=True,
            )
        ]
        results = normalize_terminology(segments)
        assert "getUserAPI" in results[0].terminology_normalized_text
        assert "getUserREST API" not in results[0].terminology_normalized_text

    # 22. LLM high-confidence disambiguation for ambiguous term
    def test_22_llm_high_confidence_disambiguation(self):
        segments = [
            TranscriptSegment(
                sequence=23,
                speaker="Sarthak Talaviya",
                text="I recommend using react here.",
                grammar_corrected_text="I recommend using react here.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "using react here": {
                    "term": "react",
                    "is_technical": True,
                    "canonical_term": "React",
                    "confidence": 0.96,
                    "reason": "Sentence refers to adopting the frontend library",
                }
            }
        )
        results = normalize_terminology(segments, llm_client=mock_client)
        assert results[0].terminology_normalized_text == "I recommend using React here."
        assert results[0].terminology_modified is True

    # 23. LLM low-confidence fallback (< 0.90) preserves original
    def test_23_llm_low_confidence_fallback(self):
        segments = [
            TranscriptSegment(
                sequence=24,
                speaker="Sarthak Talaviya",
                text="Let us see how users react.",
                grammar_corrected_text="Let us see how users react.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "users react": {
                    "term": "react",
                    "is_technical": False,
                    "canonical_term": None,
                    "confidence": 0.60,
                    "reason": "Ordinary verb usage",
                }
            }
        )
        results = normalize_terminology(segments, llm_client=mock_client)
        assert results[0].terminology_normalized_text == "Let us see how users react."
        assert results[0].terminology_modified is False

    # 24. LLM failure / timeout graceful fallback
    def test_24_llm_failure_graceful_fallback(self):
        segments = [
            TranscriptSegment(
                sequence=25,
                speaker="Harshit Pambhar",
                text="The fast api service is connected.",
                grammar_corrected_text="The fast api service is connected.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(simulate_timeout=True)
        # Even if LLM fails, deterministic dictionary mapping still works!
        results = normalize_terminology(segments, llm_client=mock_client)
        assert results[0].terminology_normalized_text == "The FastAPI service is connected."
        assert results[0].terminology_modified is True

    # 25. Five levels of traceability preserved
    def test_25_five_levels_of_traceability(self):
        segment = TranscriptSegment(
            sequence=26,
            speaker="Harshit Pambhar",
            text="Raw date abase fast api",
            processed_text="Processed date abase fast api",
            stt_corrected_text="STT database fast api",
            stt_modified=True,
            grammar_corrected_text="The database and fast api.",
            grammar_modified=True,
            include_in_meeting=True,
        )
        results = normalize_terminology([segment])
        res = results[0]
        # Level 1: raw verbatim text
        assert res.text == "Raw date abase fast api"
        # Level 2: processed text
        assert res.processed_text == "Processed date abase fast api"
        # Level 3: STT corrected text
        assert res.stt_corrected_text == "STT database fast api"
        # Level 4: grammar corrected text
        assert res.grammar_corrected_text == "The database and fast api."
        # Level 5: terminology normalized text
        assert res.terminology_normalized_text == "The database and FastAPI."

    # 26. Metadata preservation
    def test_26_metadata_preservation(self):
        segment = TranscriptSegment(
            sequence=27,
            source_sequences=[27, 28],
            speaker="Harshit Pambhar",
            text="webrtc call",
            grammar_corrected_text="webrtc call",
            merged=True,
            include_in_meeting=True,
            relevance=RelevanceCategory.MEETING_CONTENT,
        )
        results = normalize_terminology([segment])
        res = results[0]
        assert res.sequence == 27
        assert res.source_sequences == [27, 28]
        assert res.speaker == "Harshit Pambhar"
        assert res.merged is True
        assert res.include_in_meeting is True
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.terminology_normalized_text == "WebRTC call"
        assert res.terminology_modified is True

    # 27. Segment excluded from meeting preserved without normalization
    def test_27_excluded_segment_preserved(self):
        segment = TranscriptSegment(
            sequence=28,
            speaker="Harshit Pambhar",
            text="superbase test",
            grammar_corrected_text="superbase test",
            include_in_meeting=False,
            relevance=RelevanceCategory.AUDIO_CHECK,
        )
        results = normalize_terminology([segment])
        res = results[0]
        assert res.terminology_normalized_text == "superbase test"
        assert res.terminology_modified is False
        assert res.include_in_meeting is False
