-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 013_remove_participant_recording.sql
-- Description:
--   * Removes the per-participant audio recording / speech-recognition
--     pipeline (participant_audio, speech_segments, participant_audio_status).
--
--   * Audio is no longer uploaded to object storage. Meetings instead persist a
--     dialogue-based raw transcript into meeting_transcripts (Supabase/Postgres)
--     when the meeting ends.
--
-- Idempotent: safe to run repeatedly.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

DROP TABLE IF EXISTS speech_segments;
DROP TABLE IF EXISTS participant_audio;

DROP TYPE IF EXISTS participant_audio_status;

COMMIT;