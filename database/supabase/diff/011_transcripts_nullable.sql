-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase Diff: 011_transcripts_nullable.sql
-- Mirrors database/migrations/011_transcripts_nullable.sql
-- Fixes End Meeting flow by allowing content-only transcripts (NULL path/name).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE meeting_transcripts
  ALTER COLUMN transcript_path  DROP NOT NULL,
  ALTER COLUMN transcript_name  DROP NOT NULL;

COMMIT;
