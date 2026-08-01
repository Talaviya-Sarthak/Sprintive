-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase Diff: 010_participant_audio_error.sql
-- Mirrors database/migrations/010_participant_audio_error.sql
-- Adds `error` column for failure reasons + retriable partial index.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE participant_audio
  ADD COLUMN IF NOT EXISTS error TEXT;

COMMENT ON COLUMN participant_audio.error IS
  'Human-readable failure reason for status=failed recordings.';

CREATE INDEX IF NOT EXISTS idx_participant_audio_retriable
  ON participant_audio (meeting_id, status)
  WHERE status = 'failed' AND storage_key IS NOT NULL;

COMMIT;
