-- ─────────────────────────────────────────────────────────────────────────────
-- Sprintive — Complete Database Schema (latest state)
-- Migrations applied: 001 → 011
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

CREATE TYPE auth_provider     AS ENUM ('local', 'google', 'github');
CREATE TYPE team_member_role  AS ENUM ('scrum_master', 'developer', 'product_owner', 'observer');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE meeting_status    AS ENUM ('scheduled', 'active', 'ended', 'completed', 'cancelled');
CREATE TYPE participant_role  AS ENUM ('host', 'participant');
CREATE TYPE participant_audio_status AS ENUM ('pending', 'stored', 'processing', 'completed', 'failed', 'missing');


-- ─── FUNCTION ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ─── USERS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      VARCHAR(150)  NOT NULL,
  email          VARCHAR(255)  NOT NULL UNIQUE,
  password_hash  TEXT,
  auth_provider  auth_provider NOT NULL DEFAULT 'local',
  provider_id    VARCHAR(255),
  avatar_url     TEXT,
  email_verified BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider ON users (auth_provider, provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── REFRESH TOKENS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  family_id   UUID        NOT NULL DEFAULT gen_random_uuid(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family  ON refresh_tokens (family_id);

-- ─── TEAMS ────────────────────────────────────────────────────────────────────

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
CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── TEAM MEMBERS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_members (
  id        UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID             NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      team_member_role NOT NULL DEFAULT 'developer',
  joined_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);

-- ─── INVITATIONS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invitations (
  id         UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID              NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_by UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email      VARCHAR(255),
  token      TEXT              NOT NULL UNIQUE,
  status     invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ       NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations (token);
CREATE INDEX IF NOT EXISTS idx_invitations_team  ON invitations (team_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations (email);
CREATE TRIGGER trg_invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── MEETINGS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meetings (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id          UUID           NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title            VARCHAR(200)   NOT NULL,
  description      TEXT,
  sprint_name      VARCHAR(100),
  meeting_type     VARCHAR(30)    NOT NULL DEFAULT 'daily_scrum',
  host_id          UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status           meeting_status NOT NULL DEFAULT 'scheduled',
  agenda           JSONB          DEFAULT '[]'::jsonb,
  scheduled_start  TIMESTAMPTZ,
  scheduled_end    TIMESTAMPTZ,
  timezone         VARCHAR(60)    NOT NULL DEFAULT 'UTC',
  duration_minutes INTEGER        NOT NULL DEFAULT 30,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_team           ON meetings (team_id);
CREATE INDEX IF NOT EXISTS idx_meetings_host           ON meetings (host_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status         ON meetings (status);
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_type   ON meetings (meeting_type);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_start ON meetings (scheduled_start);
CREATE INDEX IF NOT EXISTS idx_meetings_timezone        ON meetings (timezone);
CREATE TRIGGER trg_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── MEETING PARTICIPANTS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_participants (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id        UUID             NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id           UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role              participant_role NOT NULL DEFAULT 'participant',
  attendance_status VARCHAR(20)      NOT NULL DEFAULT 'pending',
  joined_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  left_at           TIMESTAMPTZ,
  UNIQUE (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mp_meeting ON meeting_participants (meeting_id);
CREATE INDEX IF NOT EXISTS idx_mp_user    ON meeting_participants (user_id);

-- ─── MEETING CHATS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_chats (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID        NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_meeting ON meeting_chats (meeting_id);

-- ─── MEETING INVITATIONS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_invitations (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID         NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  email      VARCHAR(255) NOT NULL,
  token      TEXT         NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── MEETING TRANSCRIPTS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id       UUID         NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  content          TEXT,
  transcript_path  TEXT,
  transcript_name  VARCHAR(255),
  transcript_size  INTEGER      NOT NULL DEFAULT 0,
  duration         INTEGER,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_meeting ON meeting_transcripts (meeting_id);

-- ─── MEETING SUMMARIES ────────────────────────────────────────────────────────

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

-- ─── MEETING RECORDINGS ───────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE recording_status AS ENUM ('processing', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- ─── PARTICIPANT AUDIO ────────────────────────────────────────────────────────
-- One row per participant recording. Only the object key is stored.
-- The storage layer is provider-agnostic (Supabase today, S3 in the future).

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
  error            TEXT,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participant_audio_meeting     ON participant_audio (meeting_id);
CREATE INDEX IF NOT EXISTS idx_participant_audio_participant ON participant_audio (participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_audio_status      ON participant_audio (status);
CREATE INDEX IF NOT EXISTS idx_participant_audio_retriable
  ON participant_audio (meeting_id, status)
  WHERE status = 'failed' AND storage_key IS NOT NULL;

CREATE TRIGGER trg_participant_audio_updated_at
  BEFORE UPDATE ON participant_audio
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── SPEECH SEGMENTS ──────────────────────────────────────────────────────────
-- Recognized speech per participant, stored for future AI processing.

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
