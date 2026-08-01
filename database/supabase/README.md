# Supabase Database Sync

This folder holds SQL **diff** files that mirror the canonical migrations in
`../migrations/`. They are kept in sync so Supabase can apply the same schema
changes when the storage/provider layer changes.

## Rules

- Canonical migrations live in `database/migrations/` (source of truth).
- Every migration `NNN_*.sql` must have a matching diff here with the same
  number and content.
- Never modify a diff after it has been applied to Supabase.
- The database is **storage-provider agnostic**: it stores only metadata and
  object keys, never provider URLs.

## Apply

Apply the diffs in numeric order inside the Supabase SQL editor (or via the
Supabase CLI). Diffs are idempotent where possible (`IF NOT EXISTS`).

| Diff | Description |
|------|-------------|
| `009_speech_recognition.sql` | `meeting_status` + `completed`, `participant_audio`, `speech_segments` |

> Diffs for `001`–`008` live in `database/migrations/` (the source of truth).
> Copy them here if a Supabase-side re-sync is ever required.
