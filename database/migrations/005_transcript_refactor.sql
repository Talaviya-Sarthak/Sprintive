-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 005_transcript_refactor.sql
-- Description: Remove recording tables. Refactor meeting_transcripts to
--              file-based storage (path, name, size, duration).
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop recording tables (no audio storage)
DROP TABLE IF EXISTS meeting_recordings CASCADE;
DROP TYPE  IF EXISTS recording_status;

-- Drop old transcript table (had inline content column)
DROP TABLE IF EXISTS meeting_transcripts CASCADE;

-- New transcript table — stores file metadata only
CREATE TABLE meeting_transcripts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id       UUID        NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  transcript_path  TEXT        NOT NULL,
  transcript_name  VARCHAR(255) NOT NULL,
  transcript_size  INTEGER     NOT NULL DEFAULT 0,
  duration         INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_meeting ON meeting_transcripts (meeting_id);
