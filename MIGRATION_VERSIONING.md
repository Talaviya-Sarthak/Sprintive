# Database Migration Versioning System

## Overview
A robust, Neon-compatible migration versioning system that tracks which migrations have been applied, preventing duplicate runs and data corruption.

---

## Features

✅ **Version Tracking** — Each migration is tracked with version number and SHA256 hash  
✅ **Idempotent** — Can run migrations multiple times safely  
✅ **Neon-Ready** — Works seamlessly with cloud PostgreSQL (Neon)  
✅ **Change Detection** — Warns if migration files are modified  
✅ **Execution Times** — Records how long each migration took  
✅ **Clear Reporting** — Detailed summary of applied/skipped migrations  

---

## How It Works

### 1. **Migration Tracking Table**
All applied migrations are recorded in `schema_migrations`:
```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(500) NOT NULL,
  hash VARCHAR(64) NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_time_ms INT
);
```

### 2. **Version Format**
Versions are derived from filenames (without `.sql`):
- `001_initial_schema` → version `001_initial_schema`
- `007_profile_and_plan` → version `007_profile_and_plan`

### 3. **File Hash Tracking**
Each migration's SHA256 hash is stored. If a file is modified after being applied, you'll get a warning.

---

## Available Commands

### Apply Pending Migrations
```bash
npm run migrate
```
Applies only migrations that haven't been applied yet. Safe to run multiple times.

**Output:**
```
📝 Applying: 008_new_feature.sql...
✅ Applied in 1250ms

⏭️  SKIP: 001_initial_schema.sql (already applied)
```

### Mark Existing Migrations as Applied
```bash
npm run migrate:mark
```
Use this **once** to register all existing migrations without re-running them. Run this first if:
- You just added the versioning system to an existing database
- Your database already has the schema but no migration tracking

**Output:**
```
✅ Marked as applied: 001_initial_schema.sql
✅ Marked as applied: 002_team.sql
...
```

---

## Usage Workflow

### First Time Setup (Existing Database)

1. **Copy migration files** to `database/migrations/`
2. **Add versioning system** by running:
   ```bash
   npm run migrate:mark
   ```
   This marks all existing migrations as applied without re-running them.

3. **From now on**, new migrations are applied automatically:
   ```bash
   npm run migrate
   ```

### Creating New Migrations

1. Create a new SQL file in `database/migrations/`:
   ```
   008_add_new_table.sql
   009_add_column_to_users.sql
   ```

2. Write your migration with idempotent SQL:
   ```sql
   -- Good: Use IF NOT EXISTS
   CREATE TABLE IF NOT EXISTS new_table (...);
   
   -- Good: Use IF NOT EXISTS for indexes
   CREATE INDEX IF NOT EXISTS idx_name ON table(column);
   
   -- Avoid: Non-idempotent (will fail on second run)
   CREATE TABLE new_table (...);  -- ❌ Will error if table exists
   ```

3. Run migrations:
   ```bash
   npm run migrate
   ```

---

## Important Notes

### ⚠️ Versioning Prevents Duplicates
Once a migration is marked as applied, it will **never run again**, even if you modify the file. This prevents:
- ❌ Duplicate data inserts
- ❌ Duplicate constraints
- ❌ Accidental schema overwrites

### ✅ File Changes Are Detected
If you modify a migration file after it's been applied, you'll see a warning:
```
⚠️  WARNING: 005_transcript_refactor.sql has different content than applied version!
   Previous hash: a1b2c3d4...
   Current hash:  x9y8z7w6...
   Skipping (use manual intervention to re-apply)
```

**To re-apply a modified migration:**
1. Manually delete the row from `schema_migrations`
2. Re-run `npm run migrate`

### 🔍 View Applied Migrations
```sql
SELECT version, name, executed_at, execution_time_ms 
FROM schema_migrations 
ORDER BY executed_at;
```

---

## Database Query Reference

### Check Migration Status
```sql
SELECT * FROM schema_migrations ORDER BY executed_at DESC;
```

### Remove a Migration (for re-running)
```sql
DELETE FROM schema_migrations WHERE version = '008_example';
```

### Get Migration Statistics
```sql
SELECT 
  COUNT(*) as total_migrations,
  SUM(execution_time_ms) as total_time_ms,
  AVG(execution_time_ms) as avg_time_ms,
  MAX(execution_time_ms) as max_time_ms
FROM schema_migrations;
```

---

## Troubleshooting

### Error: "type already exists"
**Cause:** Migration file has `CREATE TYPE` without `IF NOT EXISTS`  
**Fix:** Modify the migration to include `IF NOT EXISTS`:
```sql
-- Before
CREATE TYPE my_enum AS ENUM ('a', 'b');

-- After
CREATE TYPE IF NOT EXISTS my_enum AS ENUM ('a', 'b');
```

### Error: "relation already exists"
**Cause:** Migration file has `CREATE TABLE` without `IF NOT EXISTS`  
**Fix:** Use `IF NOT EXISTS`:
```sql
-- Before
CREATE TABLE users (...);

-- After
CREATE TABLE IF NOT EXISTS users (...);
```

### Migration Shows Completed but Schema Wasn't Updated
**Cause:** The migration might have failed but still got marked as applied  
**Fix:** Check the actual error logs, then manually delete from schema_migrations and re-run

---

## Best Practices

1. **Always Use `IF NOT EXISTS`** in DDL statements
   ```sql
   CREATE TABLE IF NOT EXISTS ...
   CREATE INDEX IF NOT EXISTS ...
   CREATE TYPE IF NOT EXISTS ...
   ```

2. **Use Transactions** for data migrations
   ```sql
   BEGIN;
     UPDATE table SET column = value WHERE condition;
   COMMIT;
   ```

3. **Test Migrations Locally** before deploying to Neon
   ```bash
   # Run twice to verify idempotency
   npm run migrate
   npm run migrate  # Should show all SKIP
   ```

4. **Never Modify Applied Migrations** — Create new ones instead
   ```
   ❌ 008_new_column.sql (modified after application)
   ✅ 008_new_column.sql (original) + 008b_fix_column.sql (new)
   ```

5. **Include Descriptive Filenames**
   ```
   ✅ 008_add_profile_fields.sql
   ✅ 009_create_invitations_table.sql
   ❌ 008_changes.sql
   ❌ 009_fix.sql
   ```

---

## Architecture

```
database/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_team.sql
│   └── ...
└── schema/
    └── schema.sql (reference schema)

backend/
├── scripts/
│   ├── apply_migrations.js (runs pending migrations)
│   ├── mark_migrations.js  (marks existing as applied)
│   └── ...
└── package.json (npm scripts)
```

---

## Example Workflow

```bash
# Initial setup on existing database
npm run migrate:mark
# ✅ Marks 007 existing migrations as applied

# Developer adds new migration
# Creates: database/migrations/008_add_notifications.sql

# Deploy to Neon
npm run migrate
# ✅ Applies only 008_add_notifications.sql

# Run again (safe - all already applied)
npm run migrate
# ⏭️  SKIP: (all 8 migrations)
```

---

## File Locations

- **Migration Scripts:** `backend/scripts/apply_migrations.js`, `backend/scripts/mark_migrations.js`
- **Migration Files:** `database/migrations/*.sql`
- **Tracking Table:** `schema_migrations` (auto-created in database)
- **Package Scripts:** `backend/package.json` (`migrate`, `migrate:mark`)

---

## Support

For issues or questions about migrations:
1. Check `schema_migrations` table for status
2. Review migration file for idempotency issues
3. Check error messages for specific SQL errors
