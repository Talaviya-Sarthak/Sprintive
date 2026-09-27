-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 015_transcript_pipeline.sql
-- Description:
--   * Add missing pipeline status values to transcript_status enum:
--       'raw_stored', 'processing', 'ready_for_ai'
--   * Add raw_transcript_path, cleaned_transcript_path, error, updated_at
--     to meeting_transcripts to support the 14-stage transcript cleaning pipeline.
--   * Enforce UNIQUE (meeting_id) on meeting_transcripts for idempotency.
--   * Add auto-updating trigger for updated_at.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. EXTEND transcript_status ENUM ─────────────────────────────────────────

DO $$ BEGIN
  ALTER TYPE transcript_status ADD VALUE IF NOT EXISTS 'raw_stored';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE transcript_status ADD VALUE IF NOT EXISTS 'processing';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE transcript_status ADD VALUE IF NOT EXISTS 'ready_for_ai';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. ADD PIPELINE COLUMNS TO meeting_transcripts ──────────────────────────

ALTER TABLE meeting_transcripts
  ADD COLUMN IF NOT EXISTS status                  transcript_status NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS storage_provider        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS storage_bucket          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS storage_path            TEXT,
  ADD COLUMN IF NOT EXISTS raw_transcript_path     TEXT,
  ADD COLUMN IF NOT EXISTS cleaned_transcript_path TEXT,
  ADD COLUMN IF NOT EXISTS error                   TEXT,
  ADD COLUMN IF NOT EXISTS completed_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── 3. ENSURE UNIQUE (meeting_id) IDEMPOTENCY CONSTRAINT ─────────────────────

-- Delete any older duplicate rows if they exist before applying unique constraint
DELETE FROM meeting_transcripts a USING meeting_transcripts b
WHERE a.meeting_id = b.meeting_id
  AND a.created_at < b.created_at;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meeting_transcripts_meeting_id_key'
  ) THEN
    ALTER TABLE meeting_transcripts
      ADD CONSTRAINT meeting_transcripts_meeting_id_key UNIQUE (meeting_id);
  END IF;
END $$;

-- ─── 4. UPDATED_AT TRIGGER ────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_meeting_transcripts_updated_at'
  ) THEN
    CREATE TRIGGER trg_meeting_transcripts_updated_at
      BEFORE UPDATE ON meeting_transcripts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
