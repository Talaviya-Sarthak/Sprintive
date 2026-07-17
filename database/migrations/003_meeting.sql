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
