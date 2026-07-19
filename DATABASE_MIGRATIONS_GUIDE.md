# How to Add New Database Migrations

## Quick Guide for Adding Database Changes

### 1. Create a New Migration File
Create a new SQL file in `database/migrations/` with the next sequential number:

```
database/migrations/008_your_migration_name.sql
```

Format: `NNN_description.sql` (e.g., `008_add_notifications_table.sql`)

### 2. Write Your Migration SQL
Make sure your SQL is **idempotent** (safe to run multiple times):

```sql
-- ✅ GOOD - Won't error if table already exists
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ✅ GOOD - Won't error if index already exists
CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table (name);

-- ✅ GOOD - Won't error if column already exists
ALTER TABLE existing_table
  ADD COLUMN IF NOT EXISTS new_column VARCHAR(100);
```

### ❌ AVOID (Non-idempotent SQL):
```sql
-- ❌ BAD - Will error if table already exists
CREATE TABLE new_table (...);

-- ❌ BAD - Will error if column already exists
ALTER TABLE users ADD COLUMN email VARCHAR(255);
```

### 3. Apply the Migration
```bash
npm run migrate
```

The system will:
- Check if migration has been applied before
- Skip it if already applied
- Run it if new
- Track it in `schema_migrations` table

### 4. Verify It Worked
```bash
# Run migrate again - should skip this migration
npm run migrate

# Should output:
# ⏭️  SKIP: 008_your_migration_name.sql (already applied)
```

## Examples

### Adding a New Table
```sql
-- database/migrations/008_create_notifications.sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);
```

### Adding a Column
```sql
-- database/migrations/009_add_phone_to_users.sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
```

### Modifying Data
```sql
-- database/migrations/010_backfill_user_plans.sql
UPDATE users
SET plan = 'free'
WHERE plan IS NULL;
```

### Creating an Index
```sql
-- database/migrations/011_add_email_index.sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
```

## Available Commands

```bash
# Apply pending migrations
npm run migrate

# Mark existing migrations as applied (ONE-TIME SETUP)
npm run migrate:mark

# Check migration status in database
npm run migrate --verbose
```

## Database Query for Migration Status

```sql
-- See all applied migrations
SELECT version, name, executed_at, execution_time_ms
FROM schema_migrations
ORDER BY executed_at DESC;

-- Remove a migration (to re-run)
DELETE FROM schema_migrations WHERE version = '008_example';
```

## Important Rules

1. **Always use `IF NOT EXISTS`** in DDL (CREATE TABLE, INDEX, etc.)
2. **Never modify applied migrations** - create new ones instead
3. **Use transactions** for complex data migrations
4. **Test migrations locally** before deploying
5. **Keep migration files small** and focused on one change
6. **Use descriptive filenames** (e.g., `008_add_notifications.sql`)

## Neon-Specific Tips

✅ Works great with Neon PostgreSQL  
✅ No manual tracking needed - versioning system handles it  
✅ Safe for cloud environments  
✅ Can run deploy multiple times without issues  

## Troubleshooting

### Error: "relation already exists"
→ Add `IF NOT EXISTS` to your CREATE statements

### Migration shows as applied but nothing changed
→ Check if previous migration had an error
→ Manually verify schema with SQL queries

### Need to re-run a migration
→ Delete from schema_migrations: `DELETE FROM schema_migrations WHERE version = '008_example'`
→ Re-run: `npm run migrate`

---

**That's it!** Just add a new file to `database/migrations/` and run `npm run migrate` ✨
