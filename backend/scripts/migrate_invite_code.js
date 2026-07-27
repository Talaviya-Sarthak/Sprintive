import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync(join(__dirname, '../../database/migrations/006_team_invite_code.sql'), 'utf8');

try {
  await pool.query(sql);
  console.log('[migrate] 006_team_invite_code applied successfully');
} catch (err) {
  console.error('[migrate] Error:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
