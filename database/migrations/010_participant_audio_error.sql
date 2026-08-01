-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 010_participant_audio_error.sql
-- Description:
--   * Add `error` column to participant_audio so failed uploads / failed
--     transcriptions can record the failure reason (Task 10 — Error Handling).
--     Failure details were previously persisted via `UPDATE participant_audio
--     SET error = …` but the column did not exist, causing the failure path
--     itself to throw. This migration closes that gap.
--
--   * Add a partial index so retries can quickly find failed recordings that
--     still have a storage_key (i.e. audio uploaded but transcription failed).
--
-- Idempotent: safe to run repeatedly.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE participant_audio
  ADD COLUMN IF NOT EXISTS error TEXT;

COMMENT ON COLUMN participant_audio.error IS
  'Human-readable failure reason for status=failed recordings.';

-- Failed recordings that still have audio in object storage are retriable.
CREATE INDEX IF NOT EXISTS idx_participant_audio_retriable
  ON participant_audio (meeting_id, status)
  WHERE status = 'failed' AND storage_key IS NOT NULL;

COMMIT;
