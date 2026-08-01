-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 011_transcripts_nullable.sql
-- Description:
--   * Fix the End Meeting flow. meeting_transcripts.transcript_path and
--     transcript_name were created NOT NULL by migration 005, but the meeting
--     module stores in-memory transcript content (content column, added in 008)
--     and has no file yet — it inserts NULL for path/name. That violated the
--     constraint, threw an exception inside endMeeting(), and prevented the
--     speech-recognition pipeline from ever running.
--
--   * These columns are the optional file-backed transcript (path/name/size).
--     Making them nullable matches the consolidated schema.sql and the intent
--     that a transcript may be content-only until a file is generated.
--
-- Idempotent: safe to run repeatedly.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE meeting_transcripts
  ALTER COLUMN transcript_path  DROP NOT NULL,
  ALTER COLUMN transcript_name  DROP NOT NULL;

COMMIT;
