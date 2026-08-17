-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 014_transcript_status.sql
-- Description:
--   * Add transcript_status to meeting_transcripts to track the STT pipeline state.
--   * Add storage metadata columns (storage_provider, storage_bucket, storage_path).
--   * These columns enable the frontend to show real-time transcript status and
--     support future S3 migration by recording which provider stored the file.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. TRANSCRIPT STATUS ENUM ──────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE transcript_status AS ENUM (
    'not_started',
    'recording',
    'finalizing',
    'uploading',
    'completed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. ADD COLUMNS TO meeting_transcripts ──────────────────────────────────

ALTER TABLE meeting_transcripts
  ADD COLUMN IF NOT EXISTS status           transcript_status NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS storage_bucket   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS storage_path     TEXT,
  ADD COLUMN IF NOT EXISTS completed_at     TIMESTAMPTZ;

-- ─── 3. INDEX FOR STATUS LOOKUPS ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_transcripts_status ON meeting_transcripts (status);
