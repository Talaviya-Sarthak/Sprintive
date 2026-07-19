import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import 'dotenv/config';

const { fileURLToPath } = await import('url');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initializeMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(500) NOT NULL,
      hash VARCHAR(64) NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      execution_time_ms INT
    );
    
    CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations (version);
  `);
}

function calculateFileHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query('SELECT version, hash FROM schema_migrations ORDER BY version');
  return rows;
}

async function applyMigration(client, version, name, filePath, hash) {
  const startTime = Date.now();
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  try {
    await client.query(sql);
    const executionTime = Date.now() - startTime;
    
    await client.query(
      'INSERT INTO schema_migrations (version, name, hash, execution_time_ms) VALUES ($1, $2, $3, $4)',
      [version, name, hash, executionTime]
    );
    
    return { success: true, executionTime };
  } catch (err) {
    throw new Error(`Migration ${version} failed: ${err.message}`);
  }
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running database migrations with versioning...\n');

    // Initialize migrations tracking table
    await initializeMigrationsTable(client);
    console.log('✅ Migrations table initialized\n');

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '..', '..', 'database', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    // Get already applied migrations
    const appliedMigrations = await getAppliedMigrations(client);
    const appliedVersions = new Map(appliedMigrations.map(m => [m.version, m.hash]));

    console.log(`📊 Found ${migrationFiles.length} migration files`);
    console.log(`✓ Already applied: ${appliedMigrations.length}\n`);

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const version = file.replace('.sql', '');
      const hash = calculateFileHash(filePath);
      const name = file;

      if (appliedVersions.has(version)) {
        const previousHash = appliedVersions.get(version);
        if (previousHash === hash) {
          console.log(`⏭️  SKIP: ${file} (already applied)`);
          skippedCount++;
        } else {
          console.warn(`⚠️  WARNING: ${file} has different content than applied version!`);
          console.warn(`   Previous hash: ${previousHash}`);
          console.warn(`   Current hash:  ${hash}`);
          console.warn(`   Skipping (use manual intervention to re-apply)\n`);
          skippedCount++;
        }
      } else {
        try {
          console.log(`📝 Applying: ${file}...`);
          const { executionTime } = await applyMigration(client, version, name, filePath, hash);
          console.log(`✅ Applied in ${executionTime}ms\n`);
          appliedCount++;
        } catch (err) {
          console.error(`❌ Failed: ${err.message}\n`);
          throw err;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Migration Summary:`);
    console.log(`   • Applied: ${appliedCount}`);
    console.log(`   • Skipped: ${skippedCount}`);
    console.log(`   • Total:   ${appliedCount + skippedCount}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('\n❌ Migration process failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
