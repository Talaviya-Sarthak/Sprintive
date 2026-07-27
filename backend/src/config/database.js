import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

/**
 * Neon PostgreSQL connection pool.
 * Neon requires SSL in production; the `ssl: { rejectUnauthorized: false }`
 * setting is compatible with Neon's managed TLS certificates.
 */
// Neon PostgreSQL requires SSL in ALL environments (including local dev).
// The connection string already contains sslmode=require, but we also set
// rejectUnauthorized:false here to accept Neon's managed TLS certificate.
const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * Verifies the database connection on startup.
 * Throws if the database is unreachable so the server fails fast.
 */
export async function connectDatabase() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[db] Connected to Neon PostgreSQL');
  } finally {
    client.release();
  }
}

/**
 * Execute a parameterized query.
 * All queries must go through this helper — never use raw pool.query
 * outside of this module to ensure consistent error handling.
 *
 * @param {string} text  - SQL query string with $1, $2 … placeholders
 * @param {any[]}  params - Bound parameter values
 */
export async function query(text, params = []) {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (env.isDev) {
    console.log(`[db] query (${Date.now() - start}ms):`, text.slice(0, 80));
  }
  return result;
}

export default pool;
