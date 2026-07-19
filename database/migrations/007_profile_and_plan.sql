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
