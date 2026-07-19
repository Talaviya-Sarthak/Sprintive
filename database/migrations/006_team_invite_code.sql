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
