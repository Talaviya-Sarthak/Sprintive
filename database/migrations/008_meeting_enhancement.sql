-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 008_meeting_enhancement.sql
-- Description: Add missing meeting columns, meeting_summaries table,
--              meeting_recordings table, and update meeting_transcripts
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── 1. ENHANCE meetings TABLE ────────────────────────────────────────────────

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS meeting_type     VARCHAR(30) NOT NULL DEFAULT 'daily_scrum',
  ADD COLUMN IF NOT EXISTS agenda           JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_start  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone         VARCHAR(60) NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30;

CREATE INDEX IF NOT EXISTS idx_meetings_meeting_type   ON meetings (meeting_type);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_start ON meetings (scheduled_start);
CREATE INDEX IF NOT EXISTS idx_meetings_timezone        ON meetings (timezone);

-- ─── 2. UPDATE meeting_transcripts ────────────────────────────────────────────
-- Add content column back (was removed in migration 005 for file-based storage)
-- We keep both approaches: content for frontend display, file path for storage

ALTER TABLE meeting_transcripts
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Back-fill content for existing rows from file if available
-- (no-op for new databases, safety for existing)

-- ─── 3. CREATE meeting_summaries TABLE ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_summaries (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id         UUID        NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  duration_minutes   INTEGER     NOT NULL DEFAULT 0,
  attendance_count   INTEGER     NOT NULL DEFAULT 0,
  total_participants INTEGER     NOT NULL DEFAULT 0,
  ai_summary         TEXT,
  action_items       JSONB       DEFAULT '[]'::jsonb,
  tickets_generated  JSONB       DEFAULT '[]'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_summaries_meeting ON meeting_summaries (meeting_id);

CREATE TRIGGER trg_meeting_summaries_updated_at
  BEFORE UPDATE ON meeting_summaries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 4. CREATE meeting_recordings TABLE ───────────────────────────────────────

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

CREATE TRIGGER trg_recordings_updated_at
  BEFORE UPDATE ON meeting_recordings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 5. ADD attendance_status TO meeting_participants ─────────────────────────

ALTER TABLE meeting_participants
  ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20) NOT NULL DEFAULT 'pending';

COMMIT;
