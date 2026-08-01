# Database Management - Quick Start

## 🎯 Mission Accomplished
✅ **Team Creation 500 Error** - FIXED  
✅ **Migration Versioning System** - IMPLEMENTED  
✅ **Safe, Repeatable Migrations** - READY TO USE  

---

## 📋 What You Need to Know

### The Problem We Solved
- POST /api/teams was returning 500 error
- Root cause: `invite_code` column was NOT NULL but code wasn't generating it
- **Solution:** Added automatic invite code generation (format: `SPR-XXXXXX`)

### The Migration System We Built
A versioning system that tracks which migrations have been applied:
- Prevents duplicate runs of same migration
- Detects if migration files change
- Records execution time
- Safe for Neon cloud database

---

## 🚀 Common Tasks

### Create a New Database Migration

**Step 1:** Create a new SQL file
```
database/migrations/008_your_change.sql
```

**Step 2:** Write SQL with `IF NOT EXISTS` for safety
```sql
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Step 3:** Run migrations
```bash
npm run migrate
```

### Check Migration Status
```bash
# See all applied migrations
SELECT version, name, executed_at FROM schema_migrations ORDER BY executed_at DESC;
```

### Re-run a Migration
```bash
# Delete from tracking table
DELETE FROM schema_migrations WHERE version = '008_example';

# Re-run migrations
npm run migrate
```

---

## 📁 Directory Structure

```
database/
├── migrations/                    # 👈 Add new SQL files here
│   ├── 001_initial_schema.sql     # Already applied
│   ├── 002_team.sql
│   ├── ...
│   └── 009_speech_recognition.sql
├── schema/
│   └── schema.sql                 # Reference only
├── supabase/
│   ├── diff/                      # Mirrors of migrations for Supabase
│   └── README.md
└── README.md                      # This file
```

> **Rule:** All SQL lives inside `database/`. Never place migrations in
> `backend/` or `ai-service/`.

---

## ✨ Key Features

| Feature | Benefit |
|---------|---------|
| **Versioning** | Track which migrations are applied |
| **Idempotent** | Safe to run multiple times |
| **Hash Tracking** | Detect if migrations were modified |
| **Execution Time** | Monitor query performance |
| **Neon Ready** | Works seamlessly with cloud DB |

---

## 🎓 Examples

### Example 1: Add a New Table
```sql
-- database/migrations/008_add_notifications.sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
```

### Example 2: Add a Column  
```sql
-- database/migrations/009_add_user_timezone.sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(60) DEFAULT 'UTC';
```

### Example 3: Backfill Data
```sql
-- database/migrations/010_backfill_user_plans.sql
UPDATE users
SET plan = 'free'
WHERE plan IS NULL AND created_at < NOW() - INTERVAL '1 day';
```

---

## 📚 Full Documentation

- **Migration System Details:** See `MIGRATION_VERSIONING.md`
- **How to Add Migrations:** See `DATABASE_MIGRATIONS_GUIDE.md`
- **Team Creation Fixed:** See session notes

---

## 🔧 Available Commands

```bash
# Apply pending migrations only
npm run migrate

# Mark existing migrations as applied (ONE-TIME SETUP)
npm run migrate:mark

# View migration history
SELECT * FROM schema_migrations ORDER BY executed_at DESC;
```

---

## ✅ Current Status

- **Database Version:** 9 migrations applied
- **Last Migration:** 009_speech_recognition.sql
- **Migration System:** Active and tracking
- **Team Creation:** ✅ Fixed and working
- **Speech Recognition:** ✅ participant_audio + speech_segments tables added

---

## 🚨 Important Rules

1. ✅ Always use `IF NOT EXISTS` in CREATE statements
2. ✅ Never modify migrations after they're applied
3. ✅ Use transactions for complex data changes
4. ✅ Test migrations locally first
5. ❌ Don't run `CREATE TABLE` without `IF NOT EXISTS`
6. ❌ Don't rename columns without proper migration steps

---

**Questions?** Check the documentation files or review the migration history in the `schema_migrations` table.
