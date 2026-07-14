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
