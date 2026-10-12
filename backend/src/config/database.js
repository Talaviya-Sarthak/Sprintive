import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

/**
 * Neon PostgreSQL connection pool.
 * Neon requires SSL in production; the `ssl: { rejectUnauthorized: false }`
 * setting is compatible with Neon's managed TLS certificates.
 */
const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

/**
 * Handle idle client errors gracefully.
 * Neon and cloud Postgres providers periodically terminate idle connections
 * or scale down instances, emitting 'read ECONNRESET' or 'Connection terminated unexpectedly'.
 * Without this listener, Node treats unhandled EventEmitter errors as fatal exceptions and crashes.
 */
pool.on('error', (err, client) => {
  console.warn('[db] Unexpected error on idle PostgreSQL client (safely discarded):', err.message);
});

function isTransientConnectionError(err) {
  if (!err) return false;
  const msg = err.message || '';
  const code = err.code || '';
  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === '57P01' || // admin shutdown
    code === '57P02' || // crash shutdown
    code === '57P03' || // cannot connect now
    code === '08006' || // connection failure
    code === '08001' || // unable to establish connection
    code === '08004' || // connection rejected
    msg.includes('Connection terminated') ||
    msg.includes('read ECONNRESET') ||
    msg.includes('connection reset by peer') ||
    msg.includes('closed the connection unexpectedly') ||
    msg.includes('timeout')
  );
}

// Wrap pool.query directly so all repositories benefit from transient retry protection
const rawPoolQuery = pool.query.bind(pool);
pool.query = async function (text, params) {
  const start = Date.now();
  try {
    const result = await rawPoolQuery(text, params);
    if (env.isDev && typeof text === 'string') {
      console.log(`[db] query (${Date.now() - start}ms):`, text.slice(0, 80));
    }
    return result;
  } catch (err) {
    if (isTransientConnectionError(err)) {
      console.warn(`[db] Transient connection failure (${err.message}), retrying query once...`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      const retryStart = Date.now();
      const result = await rawPoolQuery(text, params);
      if (env.isDev && typeof text === 'string') {
        console.log(`[db] query retry (${Date.now() - retryStart}ms):`, text.slice(0, 80));
      }
      return result;
    }
    throw err;
  }
};

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
 * Execute a parameterized query with retry on transient network drops.
 * All queries must go through this helper — never use raw pool.query
 * outside of this module to ensure consistent error handling.
 *
 * @param {string} text   - SQL query string with $1, $2 … placeholders
 * @param {any[]}  params - Bound parameter values
 */
export async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Graceful pool shutdown handler
 */
export async function closeDatabase() {
  try {
    await pool.end();
    console.log('[db] PostgreSQL pool closed cleanly');
  } catch (err) {
    console.error('[db] Error closing pool:', err.message);
  }
}

export default pool;
