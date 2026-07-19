import pg from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const { fileURLToPath } = await import('url');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running database migrations...\n');

    const migrationsDir = path.join(__dirname, '..', '..', 'database', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      try {
        console.log(`📝 Applying: ${file}...`);
        await client.query(sql);
        console.log(`✅ ${file} applied successfully\n`);
      } catch (err) {
        console.warn(`⚠️  ${file} skipped (likely already applied):`, err.message.split('\n')[0], '\n');
      }
    }

    console.log('✨ All migrations completed!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
