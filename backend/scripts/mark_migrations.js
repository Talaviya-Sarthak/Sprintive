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

function calculateFileHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function markMigrationsAsApplied() {
  const client = await pool.connect();
  try {
    console.log('🔄 Marking existing migrations as applied...\n');

    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(500) NOT NULL,
        hash VARCHAR(64) NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        execution_time_ms INT
      );
    `);

    const migrationsDir = path.join(__dirname, '..', '..', 'database', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let markedCount = 0;
    let skippedCount = 0;

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const version = file.replace('.sql', '');
      const hash = calculateFileHash(filePath);
      const name = file;

      try {
        const { rows } = await client.query(
          'SELECT version FROM schema_migrations WHERE version = $1',
          [version]
        );

        if (rows.length === 0) {
          // Mark as applied without re-executing
          await client.query(
            `INSERT INTO schema_migrations (version, name, hash, executed_at, execution_time_ms) 
             VALUES ($1, $2, $3, NOW(), 0)`,
            [version, name, hash]
          );
          console.log(`✅ Marked as applied: ${file}`);
          markedCount++;
        } else {
          console.log(`⏭️  Already tracked: ${file}`);
          skippedCount++;
        }
      } catch (err) {
        console.error(`❌ Error marking ${file}:`, err.message);
        throw err;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✨ Migration Mark Summary:`);
    console.log(`   • Marked as applied: ${markedCount}`);
    console.log(`   • Already tracked:   ${skippedCount}`);
    console.log(`   • Total:             ${markedCount + skippedCount}`);
    console.log('='.repeat(60));
    console.log('\n💡 Run "npm run migrate" to apply any new migrations');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

markMigrationsAsApplied();
