import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const { rows } = await pool.query(
  `SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'teams' AND column_name = 'invite_code'`
);
console.log('invite_code column:', rows[0] ?? 'NOT FOUND');
await pool.end();
