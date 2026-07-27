-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 004_recording.sql
-- Description: MeetingRecordings, MeetingTranscripts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE recording_status AS ENUM ('processing', 'ready', 'failed');

CREATE TABLE IF NOT EXISTS meeting_recordings (
  id            UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    UUID             NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  created_by    UUID             NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recording_url TEXT,
  duration      INTEGER,
  status        recording_status NOT NULL DEFAULT 'processing',
  started_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recordings_meeting ON meeting_recordings (meeting_id);

CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID        NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_meeting ON meeting_transcripts (meeting_id);

CREATE TRIGGER trg_recordings_updated_at
  BEFORE UPDATE ON meeting_recordings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
