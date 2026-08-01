-- ─────────────────────────────────────────────────────────────────────────────
-- Sprintive — NEW SCHEMA (combined, final state)
--
-- This file is the consolidated database schema generated from every migration
-- in database/migrations/ (001 → 011), applied in order.
--
-- DO NOT hand-edit this file. Regenerate it from the migrations when they change:
--
--     node database/scripts/build_new_schema.js
--
-- It produces the exact same final state as running all migrations sequentially
-- against an empty database.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── 001_initial_schema.sql ─────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 001_initial_schema.sql
-- Description: Initial schema — users and refresh_tokens tables
-- Created: Phase 1 — Authentication Foundation
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM: auth provider ──────────────────────────────────────────────────────
CREATE TYPE auth_provider AS ENUM ('local', 'google', 'github');

-- ─── TABLE: users ─────────────────────────────────────────────────────────────
-- Designed to support future multi-tenancy (company_id FK can be added later).
-- avatar_url supports both OAuth-provided URLs and future upload paths.
CREATE TABLE IF NOT EXISTS users (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        VARCHAR(150)  NOT NULL,
  email            VARCHAR(255)  NOT NULL UNIQUE,
  password_hash    TEXT,                                   -- NULL for OAuth-only accounts
  auth_provider    auth_provider NOT NULL DEFAULT 'local',
  provider_id      VARCHAR(255),                           -- OAuth provider's user ID
  avatar_url       TEXT,
  email_verified   BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,    -- soft-disable without deletion
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Partial index: provider_id lookups only matter for OAuth rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider
  ON users (auth_provider, provider_id)
  WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ─── TABLE: refresh_tokens ────────────────────────────────────────────────────
-- Stored server-side so tokens can be revoked individually or in bulk.
-- family_id enables refresh-token rotation attack detection.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT        NOT NULL UNIQUE,               -- bcrypt hash of the raw token
  family_id    UUID        NOT NULL DEFAULT gen_random_uuid(), -- rotation family
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family  ON refresh_tokens (family_id);

-- ─── FUNCTION: auto-update updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 002_team.sql ─────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 002_team.sql
-- Description: Teams, TeamMembers, Invitations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE team_member_role AS ENUM ('scrum_master', 'developer', 'product_owner', 'observer');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');

CREATE TABLE IF NOT EXISTS teams (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(100) NOT NULL,
  description      TEXT,
  avatar_url       TEXT,
  color            VARCHAR(7)   NOT NULL DEFAULT '#3B82F6',
  timezone         VARCHAR(60)  NOT NULL DEFAULT 'UTC',
  working_days     INTEGER[]    NOT NULL DEFAULT '{1,2,3,4,5}',
  daily_scrum_time TIME         NOT NULL DEFAULT '09:00:00',
  created_by       UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams (created_by);

CREATE TABLE IF NOT EXISTS team_members (
  id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID             NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       team_member_role NOT NULL DEFAULT 'developer',
  joined_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);

CREATE TABLE IF NOT EXISTS invitations (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID              NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_by  UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email       VARCHAR(255),
  token       TEXT              NOT NULL UNIQUE,
  status      invitation_status NOT NULL DEFAULT 'pending',
  expires_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token   ON invitations (token);
CREATE INDEX IF NOT EXISTS idx_invitations_team    ON invitations (team_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email   ON invitations (email);

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 003_meeting.sql ─────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 003_meeting.sql
-- Description: Meetings, MeetingParticipants, MeetingChat, MeetingInvitations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE meeting_status   AS ENUM ('scheduled', 'active', 'ended', 'cancelled');
CREATE TYPE participant_role AS ENUM ('host', 'participant');

CREATE TABLE IF NOT EXISTS meetings (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID           NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title        VARCHAR(200)   NOT NULL,
  sprint_name  VARCHAR(100),
  host_id      UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status       meeting_status NOT NULL DEFAULT 'scheduled',
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_team   ON meetings (team_id);
CREATE INDEX IF NOT EXISTS idx_meetings_host   ON meetings (host_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings (status);

CREATE TABLE IF NOT EXISTS meeting_participants (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID             NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id     UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        participant_role NOT NULL DEFAULT 'participant',
  joined_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  left_at     TIMESTAMPTZ,
  UNIQUE (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mp_meeting ON meeting_participants (meeting_id);
CREATE INDEX IF NOT EXISTS idx_mp_user    ON meeting_participants (user_id);

CREATE TABLE IF NOT EXISTS meeting_chats (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID        NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_meeting ON meeting_chats (meeting_id);

CREATE TABLE IF NOT EXISTS meeting_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID        NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL,
  token       TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 004_recording.sql ─────────────────────────────────────────────────────────────────
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

-- ─── 005_transcript_refactor.sql ─────────────────────────────────────────────────────────────────
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

-- ─── 006_team_invite_code.sql ─────────────────────────────────────────────────────────────────
-- Migration: 006_team_invite_code.sql
-- Description: Add invite_code column to teams table

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20) UNIQUE;

-- Back-fill existing rows with a generated code so NOT NULL can be enforced
UPDATE teams
SET invite_code = 'SPR-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE invite_code IS NULL;

ALTER TABLE teams
  ALTER COLUMN invite_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_invite_code ON teams (invite_code);

-- ─── 007_profile_and_plan.sql ─────────────────────────────────────────────────────────────────
-- Migration: 007_profile_and_plan.sql
-- Description: Add profile fields and subscription plan to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone        VARCHAR(30),
  ADD COLUMN IF NOT EXISTS company      VARCHAR(150),
  ADD COLUMN IF NOT EXISTS designation  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bio          TEXT,
  ADD COLUMN IF NOT EXISTS country      VARCHAR(80),
  ADD COLUMN IF NOT EXISTS timezone     VARCHAR(60) NOT NULL DEFAULT 'UTC';

-- Subscription plan: free | pro
DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan subscription_plan NOT NULL DEFAULT 'free';

-- Free plan limits (enforced in application layer, stored here for reference)
-- max_owned_teams = 2, max_joined_teams = 1

-- ─── 008_meeting_enhancement.sql ─────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 008_meeting_enhancement.sql
-- Description: Add missing meeting columns, meeting_summaries table,
--              meeting_recordings table, and update meeting_transcripts
-- ─────────────────────────────────────────────────────────────────────────────



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

-- ─── 009_speech_recognition.sql ─────────────────────────────────────────────────────────────────
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

-- ─── 010_participant_audio_error.sql ─────────────────────────────────────────────────────────────────
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



ALTER TABLE participant_audio
  ADD COLUMN IF NOT EXISTS error TEXT;

COMMENT ON COLUMN participant_audio.error IS
  'Human-readable failure reason for status=failed recordings.';

-- Failed recordings that still have audio in object storage are retriable.
CREATE INDEX IF NOT EXISTS idx_participant_audio_retriable
  ON participant_audio (meeting_id, status)
  WHERE status = 'failed' AND storage_key IS NOT NULL;

-- ─── 011_transcripts_nullable.sql ─────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 011_transcripts_nullable.sql
-- Description:
--   * Fix the End Meeting flow. meeting_transcripts.transcript_path and
--     transcript_name were created NOT NULL by migration 005, but the meeting
--     module stores in-memory transcript content (content column, added in 008)
--     and has no file yet — it inserts NULL for path/name. That violated the
--     constraint, threw an exception inside endMeeting(), and prevented the
--     speech-recognition pipeline from ever running.
--
--   * These columns are the optional file-backed transcript (path/name/size).
--     Making them nullable matches the consolidated schema.sql and the intent
--     that a transcript may be content-only until a file is generated.
--
-- Idempotent: safe to run repeatedly.
-- ─────────────────────────────────────────────────────────────────────────────



ALTER TABLE meeting_transcripts
  ALTER COLUMN transcript_path  DROP NOT NULL,
  ALTER COLUMN transcript_name  DROP NOT NULL;

COMMIT;