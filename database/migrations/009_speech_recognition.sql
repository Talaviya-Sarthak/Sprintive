-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 009_speech_recognition.sql
-- Description:
--   * Add 'completed' status to the meeting_status enum (ACTIVE → COMPLETED).
--   * Create participant_audio — per-participant recording metadata.
--     Stores ONLY the storage object key (provider-agnostic). Never a URL.
--   * Create speech_segments — recognized speech output from Groq Whisper.
--
-- NOTE: No provider-specific values are stored. The storage layer is a
--       pluggable abstraction (Supabase today, S3 in the future).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── 1. MEETING STATUS ────────────────────────────────────────────────────────
-- Extend the enum so meetings transition ACTIVE → COMPLETED when they end.

DO $$ BEGIN
  ALTER TYPE meeting_status ADD VALUE IF NOT EXISTS 'completed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. PARTICIPANT AUDIO ─────────────────────────────────────────────────────
-- One row per participant recording. Only the object key is stored.

CREATE TYPE participant_audio_status AS ENUM (
  'pending',      -- received by the backend, not yet uploaded to storage
  'stored',       -- uploaded to object storage, awaiting transcription
  'processing',   -- transcription in progress
  'completed',    -- transcribed successfully
  'failed',       -- upload or transcription failed
  'missing'       -- no audio was received for this participant
);

CREATE TABLE IF NOT EXISTS participant_audio (
  id               UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id       UUID                     NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  participant_id   UUID                     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_name VARCHAR(150)             NOT NULL,
  storage_key      TEXT                     UNIQUE,
  mime_type        VARCHAR(100),
  size_bytes       BIGINT,
  duration_ms      INTEGER,
  status           participant_audio_status NOT NULL DEFAULT 'pending',
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participant_audio_meeting     ON participant_audio (meeting_id);
CREATE INDEX IF NOT EXISTS idx_participant_audio_participant ON participant_audio (participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_audio_status      ON participant_audio (status);

CREATE TRIGGER trg_participant_audio_updated_at
  BEFORE UPDATE ON participant_audio
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 3. SPEECH SEGMENTS ───────────────────────────────────────────────────────
-- Recognized speech per participant. Stored for future AI processing
-- (summarization, task extraction, etc. — implemented later).

CREATE TABLE IF NOT EXISTS speech_segments (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id       UUID             NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  participant_id   UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_name VARCHAR(150)     NOT NULL,
  audio_id         UUID             REFERENCES participant_audio(id) ON DELETE SET NULL,
  start_time       DOUBLE PRECISION NOT NULL DEFAULT 0,
  end_time         DOUBLE PRECISION NOT NULL DEFAULT 0,
  text             TEXT             NOT NULL,
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speech_segments_meeting     ON speech_segments (meeting_id);
CREATE INDEX IF NOT EXISTS idx_speech_segments_participant ON speech_segments (participant_id);
CREATE INDEX IF NOT EXISTS idx_speech_segments_audio       ON speech_segments (audio_id);

COMMIT;
