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
