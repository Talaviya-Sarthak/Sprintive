"""Unit and scenario tests for Part 7 — Grammar & Punctuation Normalization."""

import pytest
from app.models.transcript import (
    GrammarChangeDetail,
    GrammarChangeType,
    GrammarNormalizationLLMOutput,
    RelevanceCategory,
    TranscriptSegment,
)
from app.services.grammar_normalizer import (
    normalize_grammar_and_punctuation,
    select_input_text,
)
from app.services.llm_client import MockLLMClient


class TestGrammarNormalizer:
    """Comprehensive test suite covering all 20+ required scenarios for grammar and punctuation normalization."""

    # 1. Correct English sentence - no changes required
    def test_01_correct_english_sentence(self):
        segments = [
            TranscriptSegment(
                sequence=1,
                speaker="Sarthak Talaviya",
                text="The deployment completed successfully.",
                processed_text="The deployment completed successfully.",
                stt_corrected_text="The deployment completed successfully.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "deployment completed successfully": {
                    "corrected_text": "The deployment completed successfully.",
                    "modified": False,
                    "confidence": 0.99,
                    "changes": [],
                    "reason": "Sentence is already grammatically and punctuationally correct",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        assert len(results) == 1
        res = results[0]
        assert res.grammar_corrected_text == "The deployment completed successfully."
        assert res.grammar_modified is False
        assert len(res.grammar_changes) == 0

    # 2. Missing punctuation and capitalization (Critical Test 1)
    def test_02_missing_punctuation_critical_spec(self):
        segments = [
            TranscriptSegment(
                sequence=2,
                speaker="Sarthak Talaviya",
                text="Good morning everyone lets get started with todays meeting",
                processed_text="Good morning everyone lets get started with todays meeting",
                stt_corrected_text="Good morning everyone lets get started with todays meeting",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "Good morning everyone lets get started": {
                    "corrected_text": "Good morning, everyone. Let's get started with today's meeting.",
                    "modified": True,
                    "confidence": 0.96,
                    "changes": [
                        {"type": "PUNCTUATION", "description": "Added comma and period"},
                        {"type": "GRAMMAR", "description": "Added apostrophes for contractions"},
                    ],
                    "reason": "Added missing punctuation and apostrophes",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        res = results[0]
        assert res.grammar_corrected_text == "Good morning, everyone. Let's get started with today's meeting."
        assert res.grammar_modified is True
        assert res.grammar_confidence == 0.96
        assert len(res.grammar_changes) == 2
        assert res.grammar_changes[0].type == GrammarChangeType.PUNCTUATION

    # 3. Missing article
    def test_03_missing_article(self):
        segments = [
            TranscriptSegment(
                sequence=3,
                speaker="Harshit Pambhar",
                text="I have issue with database connection.",
                processed_text="I have issue with database connection.",
                stt_corrected_text="I have issue with database connection.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "I have issue with database connection": {
                    "corrected_text": "I have an issue with the database connection.",
                    "modified": True,
                    "confidence": 0.94,
                    "changes": [
                        {"type": "GRAMMAR", "description": "Added missing articles 'an' and 'the'"}
                    ],
                    "reason": "Inserted missing articles for grammatical readability",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        res = results[0]
        assert res.grammar_corrected_text == "I have an issue with the database connection."
        assert res.grammar_modified is True
        assert res.grammar_changes[0].type == GrammarChangeType.GRAMMAR

    # 4. Subject/verb agreement issue
    def test_04_subject_verb_agreement(self):
        segments = [
            TranscriptSegment(
                sequence=4,
                speaker="Harshit Pambhar",
                text="The tests is failing on staging.",
                processed_text="The tests is failing on staging.",
                stt_corrected_text="The tests is failing on staging.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "tests is failing": {
                    "corrected_text": "The tests are failing on staging.",
                    "modified": True,
                    "confidence": 0.95,
                    "changes": [
                        {"type": "GRAMMAR", "description": "Corrected subject-verb agreement"}
                    ],
                    "reason": "Plural subject requires 'are'",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        assert results[0].grammar_corrected_text == "The tests are failing on staging."
        assert results[0].grammar_modified is True

    # 5. Spoken word-order issue
    def test_05_word_order_issue(self):
        segments = [
            TranscriptSegment(
                sequence=5,
                speaker="Harshit Pambhar",
                text="Yesterday I the database restarted.",
                processed_text="Yesterday I the database restarted.",
                stt_corrected_text="Yesterday I the database restarted.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "Yesterday I the database restarted": {
                    "corrected_text": "Yesterday, I restarted the database.",
                    "modified": True,
                    "confidence": 0.93,
                    "changes": [
                        {"type": "WORD_ORDER", "description": "Normalized spoken word order"},
                        {"type": "PUNCTUATION", "description": "Added comma after introductory adverb"},
                    ],
                    "reason": "Natural English SVO word order restored",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        assert results[0].grammar_corrected_text == "Yesterday, I restarted the database."
        assert results[0].grammar_modified is True
        assert any(c.type == GrammarChangeType.WORD_ORDER for c in results[0].grammar_changes)

    # 6. Hindi sentence preserved without translation
    def test_06_hindi_sentence_preserved(self):
        segments = [
            TranscriptSegment(
                sequence=6,
                speaker="Harshit Pambhar",
                text="हाँ, मैं database connection देख रहा हूँ",
                processed_text="हाँ, मैं database connection देख रहा हूँ",
                stt_corrected_text="हाँ, मैं database connection देख रहा हूँ",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "database connection देख रहा हूँ": {
                    "corrected_text": "हाँ, मैं database connection देख रहा हूँ.",
                    "modified": True,
                    "confidence": 0.95,
                    "changes": [
                        {"type": "PUNCTUATION", "description": "Added terminal punctuation"}
                    ],
                    "reason": "Added Hindi purna viram/period without translation",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        assert results[0].grammar_corrected_text == "हाँ, मैं database connection देख रहा हूँ."
        assert "Yes, I am checking" not in results[0].grammar_corrected_text

    # 7. Spanish sentence preserved without translation
    def test_07_spanish_sentence_preserved(self):
        segments = [
            TranscriptSegment(
                sequence=7,
                speaker="Carlos",
                text="podemos revisar el estado de la base de datos",
                processed_text="podemos revisar el estado de la base de datos",
                stt_corrected_text="podemos revisar el estado de la base de datos",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "podemos revisar el estado": {
                    "corrected_text": "¿Podemos revisar el estado de la base de datos?",
                    "modified": True,
                    "confidence": 0.95,
                    "changes": [
                        {"type": "PUNCTUATION", "description": "Added Spanish opening/closing question marks"},
                        {"type": "CAPITALIZATION", "description": "Capitalized first word"},
                    ],
                    "reason": "Normalized Spanish question punctuation",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        assert results[0].grammar_corrected_text == "¿Podemos revisar el estado de la base de datos?"
        assert results[0].grammar_modified is True

    # 8. Mixed-language sentence preserved (Critical Test 4)
    def test_08_mixed_language_preserved_critical_spec(self):
        segments = [
            TranscriptSegment(
                sequence=8,
                speaker="Harshit Pambhar",
                text="I have one issue जो API testing को affect कर रहा है",
                processed_text="I have one issue जो API testing को affect कर रहा है",
                stt_corrected_text="I have one issue जो API testing को affect कर रहा है",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "affect कर रहा है": {
                    "corrected_text": "I have one issue जो API testing को affect कर रहा है.",
                    "modified": True,
                    "confidence": 0.95,
                    "changes": [
                        {"type": "PUNCTUATION", "description": "Added sentence-ending period"}
                    ],
                    "reason": "Preserved mixed-language structure with punctuation normalized",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        res = results[0]
        assert res.grammar_corrected_text == "I have one issue जो API testing को affect कर रहा है."
        assert res.grammar_modified is True
        # Ensure not converted to pure English or pure Hindi
        assert "जो" in res.grammar_corrected_text
        assert "affect कर रहा है" in res.grammar_corrected_text

    # 9. Technical sentence - terms preserved without broad normalization
    def test_09_technical_sentence_terms_preserved(self):
        segments = [
            TranscriptSegment(
                sequence=9,
                speaker="Sarthak Talaviya",
                text="We are testing the REST API and database",
                processed_text="We are testing the REST API and database",
                stt_corrected_text="We are testing the REST API and database",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "REST API and database": {
                    "corrected_text": "We are testing the REST API and database.",
                    "modified": True,
                    "confidence": 0.97,
                    "changes": [
                        {"type": "PUNCTUATION", "description": "Added terminal period"}
                    ],
                    "reason": "Added period; preserved technical terms intact",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        assert results[0].grammar_corrected_text == "We are testing the REST API and database."
        assert "REST API" in results[0].grammar_corrected_text

    # 10. Conversational style preserved - no artificial formalization
    def test_10_conversational_style_preserved(self):
        segments = [
            TranscriptSegment(
                sequence=10,
                speaker="Sarthak Talaviya",
                text="Yeah I think that's fine",
                processed_text="Yeah I think that's fine",
                stt_corrected_text="Yeah I think that's fine",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "Yeah I think that's fine": {
                    "corrected_text": "Yeah, I think that's fine.",
                    "modified": True,
                    "confidence": 0.96,
                    "changes": [
                        {"type": "PUNCTUATION", "description": "Added comma after 'Yeah' and terminal period"}
                    ],
                    "reason": "Preserved conversational tone while adding natural punctuation",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        res = results[0]
        assert res.grammar_corrected_text == "Yeah, I think that's fine."
        assert "Yes, I believe that is acceptable" not in res.grammar_corrected_text

    # 11. Ambiguous sentence preserved (Critical Test 3)
    def test_11_ambiguous_sentence_preserved_critical_spec(self):
        segments = [
            TranscriptSegment(
                sequence=11,
                speaker="Harshit Pambhar",
                text="रांच के पाव है हमारा खबर है?",
                processed_text="रांच के पाव है हमारा खबर है?",
                stt_corrected_text="रांच के पाव है हमारा खबर है?",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "रांच के पाव है हमारा खबर है?": {
                    "corrected_text": "रांच के पाव है हमारा खबर है?",
                    "modified": False,
                    "confidence": 0.40,
                    "changes": [],
                    "reason": "Meaning remains ambiguous; preserved unchanged without hallucinating",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        assert results[0].grammar_corrected_text == "रांच के पाव है हमारा खबर है?"
        assert results[0].grammar_modified is False

    # 12. Sentence requiring guessing is preserved rather than guessed
    def test_12_sentence_requiring_guessing_preserved(self):
        segments = [
            TranscriptSegment(
                sequence=12,
                speaker="Harshit Pambhar",
                text="I think we should first review what we come yesterday.",
                processed_text="I think we should first review what we come yesterday.",
                stt_corrected_text="I think we should first review what we come yesterday.",
                include_in_meeting=True,
            )
        ]
        # Ambiguous word: could be 'covered', 'completed', 'discussed', etc.
        mock_client = MockLLMClient(
            exact_matches={
                "what we come yesterday": {
                    "corrected_text": "I think we should first review what we come yesterday.",
                    "modified": False,
                    "confidence": 0.60,
                    "changes": [],
                    "reason": "Correcting would require guessing intended verb without context; preserved.",
                }
            }
        )
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        assert (
            results[0].grammar_corrected_text
            == "I think we should first review what we come yesterday."
        )
        assert results[0].grammar_modified is False

    # 13. LLM returns low confidence (< 0.85) -> rejected, original preserved
    def test_13_llm_low_confidence_rejected(self):
        segments = [
            TranscriptSegment(
                sequence=13,
                speaker="Harshit Pambhar",
                text="We must the server restart now.",
                processed_text="We must the server restart now.",
                stt_corrected_text="We must the server restart now.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(
            exact_matches={
                "server restart now": {
                    "corrected_text": "We must restart the server now.",
                    "modified": True,
                    "confidence": 0.70,  # Below threshold 0.85
                    "changes": [{"type": "WORD_ORDER", "description": "Adjusted verb placement"}],
                    "reason": "Tentative word order adjustment",
                }
            }
        )
        results = normalize_grammar_and_punctuation(
            segments, llm_client=mock_client, confidence_threshold=0.85
        )
        assert results[0].grammar_corrected_text == "We must the server restart now."
        assert results[0].grammar_modified is False
        assert "below threshold" in results[0].grammar_reason.lower()

    # 14. Invalid LLM response -> safe fallback
    def test_14_invalid_llm_response_fallback(self):
        segments = [
            TranscriptSegment(
                sequence=14,
                speaker="Harshit Pambhar",
                text="The build failed again.",
                processed_text="The build failed again.",
                stt_corrected_text="The build failed again.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(simulate_invalid_json=True)
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        assert results[0].grammar_corrected_text == "The build failed again."
        assert results[0].grammar_modified is False
        assert "Fallback due to LLM error" in results[0].grammar_reason

    # 15. LLM timeout -> safe fallback
    def test_15_llm_timeout_fallback(self):
        segments = [
            TranscriptSegment(
                sequence=15,
                speaker="Harshit Pambhar",
                text="The build failed again.",
                processed_text="The build failed again.",
                stt_corrected_text="The build failed again.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(simulate_timeout=True)
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        assert results[0].grammar_corrected_text == "The build failed again."
        assert results[0].grammar_modified is False
        assert "Fallback due to LLM error" in results[0].grammar_reason

    # 16. LLM API failure -> safe fallback
    def test_16_llm_api_failure_fallback(self):
        segments = [
            TranscriptSegment(
                sequence=16,
                speaker="Harshit Pambhar",
                text="The build failed again.",
                processed_text="The build failed again.",
                stt_corrected_text="The build failed again.",
                include_in_meeting=True,
            )
        ]
        mock_client = MockLLMClient(simulate_api_error=True)
        results = normalize_grammar_and_punctuation(segments, llm_client=mock_client)
        assert results[0].grammar_corrected_text == "The build failed again."
        assert results[0].grammar_modified is False
        assert "Fallback due to LLM error" in results[0].grammar_reason

    # 17. Input text priority with STT correction
    def test_17_input_priority_uses_stt_corrected_text(self):
        segment = TranscriptSegment(
            sequence=17,
            speaker="Harshit Pambhar",
            text="date abase is down",
            processed_text="date abase is down",
            stt_corrected_text="database is down",
            stt_modified=True,
            include_in_meeting=True,
        )
        assert select_input_text(segment) == "database is down"

        mock_client = MockLLMClient(
            exact_matches={
                "database is down": {
                    "corrected_text": "The database is down.",
                    "modified": True,
                    "confidence": 0.95,
                    "changes": [
                        {"type": "CAPITALIZATION", "description": "Capitalized first word"},
                        {"type": "PUNCTUATION", "description": "Added period"},
                        {"type": "GRAMMAR", "description": "Added article 'The'"},
                    ],
                    "reason": "Normalized capitalization, article, and punctuation",
                }
            }
        )
        results = normalize_grammar_and_punctuation([segment], llm_client=mock_client)
        assert results[0].grammar_corrected_text == "The database is down."
        assert results[0].grammar_modified is True

    # 18. Input text priority without STT correction
    def test_18_input_priority_uses_processed_text(self):
        segment = TranscriptSegment(
            sequence=18,
            speaker="Harshit Pambhar",
            text="backend is ready ready",
            processed_text="backend is ready",
            stt_corrected_text=None,
            stt_modified=False,
            include_in_meeting=True,
        )
        assert select_input_text(segment) == "backend is ready"

        mock_client = MockLLMClient(
            exact_matches={
                "backend is ready": {
                    "corrected_text": "The backend is ready.",
                    "modified": True,
                    "confidence": 0.95,
                    "changes": [
                        {"type": "CAPITALIZATION", "description": "Capitalized first word"},
                        {"type": "PUNCTUATION", "description": "Added period"},
                        {"type": "GRAMMAR", "description": "Added article 'The'"},
                    ],
                    "reason": "Normalized grammar and punctuation",
                }
            }
        )
        results = normalize_grammar_and_punctuation([segment], llm_client=mock_client)
        assert results[0].grammar_corrected_text == "The backend is ready."

    # 19. Original text preservation across all four levels of traceability
    def test_19_four_levels_of_traceability(self):
        segment = TranscriptSegment(
            sequence=19,
            speaker="Harshit Pambhar",
            text="Raw verbatim line 1",
            processed_text="Processed line 1",
            stt_corrected_text="STT corrected line 1",
            include_in_meeting=True,
        )
        mock_client = MockLLMClient(
            exact_matches={
                "STT corrected line 1": {
                    "corrected_text": "STT corrected line 1.",
                    "modified": True,
                    "confidence": 0.95,
                    "changes": [{"type": "PUNCTUATION", "description": "Added period"}],
                    "reason": "Punctuation normalized",
                }
            }
        )
        results = normalize_grammar_and_punctuation([segment], llm_client=mock_client)
        res = results[0]
        # Level 1: raw text
        assert res.text == "Raw verbatim line 1"
        # Level 2: processed text
        assert res.processed_text == "Processed line 1"
        # Level 3: STT corrected text
        assert res.stt_corrected_text == "STT corrected line 1"
        # Level 4: grammar corrected text
        assert res.grammar_corrected_text == "STT corrected line 1."

    # 20. Metadata preservation
    def test_20_metadata_preservation(self):
        segment = TranscriptSegment(
            sequence=20,
            source_sequences=[20, 21],
            speaker="Sarthak Talaviya",
            text="lets test",
            processed_text="lets test",
            stt_corrected_text="lets test",
            merged=True,
            include_in_meeting=True,
            relevance=RelevanceCategory.MEETING_CONTENT,
        )
        mock_client = MockLLMClient(
            exact_matches={
                "lets test": {
                    "corrected_text": "Let's test.",
                    "modified": True,
                    "confidence": 0.96,
                    "changes": [
                        {"type": "CAPITALIZATION", "description": "Capitalized"},
                        {"type": "PUNCTUATION", "description": "Added apostrophe and period"},
                    ],
                    "reason": "Punctuation normalized",
                }
            }
        )
        results = normalize_grammar_and_punctuation([segment], llm_client=mock_client)
        res = results[0]
        assert res.sequence == 20
        assert res.source_sequences == [20, 21]
        assert res.speaker == "Sarthak Talaviya"
        assert res.merged is True
        assert res.include_in_meeting is True
        assert res.relevance == RelevanceCategory.MEETING_CONTENT
        assert res.grammar_corrected_text == "Let's test."

    # 21. Critical Test 2: Summarization prevented
    def test_21_critical_test_2_summarization_prevented(self):
        segment = TranscriptSegment(
            sequence=21,
            speaker="Harshit Pambhar",
            text="I have one issue with the database connection that is affecting the API testing.",
            processed_text="I have one issue with the database connection that is affecting the API testing.",
            stt_corrected_text="I have one issue with the database connection that is affecting the API testing.",
            include_in_meeting=True,
        )
        mock_client = MockLLMClient(
            exact_matches={
                "affecting the API testing": {
                    "corrected_text": "I have one issue with the database connection that is affecting API testing.",
                    "modified": True,
                    "confidence": 0.95,
                    "changes": [
                        {"type": "GRAMMAR", "description": "Streamlined article usage before 'API testing'"}
                    ],
                    "reason": "Minor article improvement without altering meaning",
                }
            }
        )
        results = normalize_grammar_and_punctuation([segment], llm_client=mock_client)
        res = results[0]
        assert res.grammar_corrected_text == "I have one issue with the database connection that is affecting API testing."
        # Confirm it did NOT become a summary
        assert "primary blocker" not in res.grammar_corrected_text

    # 22. Segment excluded from meeting preserved as-is without LLM call
    def test_22_excluded_segment_preserved_without_llm_call(self):
        segment = TranscriptSegment(
            sequence=22,
            speaker="Harshit Pambhar",
            text="audio check 1 2 3",
            processed_text="audio check 1 2 3",
            stt_corrected_text="audio check 1 2 3",
            include_in_meeting=False,
            relevance=RelevanceCategory.AUDIO_CHECK,
        )
        mock_client = MockLLMClient()
        results = normalize_grammar_and_punctuation([segment], llm_client=mock_client)
        assert len(mock_client.call_history) == 0
        assert results[0].grammar_corrected_text == "audio check 1 2 3"
        assert results[0].grammar_modified is False
        assert results[0].include_in_meeting is False
