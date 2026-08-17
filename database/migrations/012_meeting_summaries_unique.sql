-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 012_meeting_summaries_unique.sql
-- Description:
--   * Guarantee at most one summary row per meeting by adding a UNIQUE
--     constraint on meeting_summaries.meeting_id.
--
--   * The End Meeting flow upserts the summary via
--       INSERT ... ON CONFLICT (meeting_id) DO UPDATE
--     but the table only had a NON-unique index (idx_meeting_summaries_meeting),
--     so PostgreSQL raised `42P10: there is no unique or exclusion constraint
--     matching the ON CONFLICT specification`. endMeeting() then threw, the
--     `meeting:ended` broadcast never fired, and the speech-recognition
--     pipeline was never triggered — the meeting was stuck at 'completed'
--     with the room frozen. This constraint makes the upsert valid and
--     idempotent.
--
--   * It is also the DB-level backstop for the atomic ACTIVE→COMPLETED
--     transition enforced in the app layer: a racing second "end" can only
--     ever update the existing summary, never insert a duplicate.
--
-- Idempotent: safe to run repeatedly.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meeting_summaries_meeting_id_key'
  ) THEN
    ALTER TABLE meeting_summaries
      ADD CONSTRAINT meeting_summaries_meeting_id_key UNIQUE (meeting_id);
  END IF;
END $$;

COMMIT;