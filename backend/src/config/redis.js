import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Sanitize a Redis URL for safe logging (removes password).
 *
 * @param {string} url
 * @returns {string}
 */
export function sanitizeRedisUrl(url) {
  if (!url) return '<not configured>';
  try {
    const parsed = new URL(url);
    const maskedAuth = parsed.password ? `${parsed.username || 'default'}:****@` : '';
    return `${parsed.protocol}//${maskedAuth}${parsed.host}`;
  } catch {
    return '<invalid url>';
  }
}

/**
 * Validate that REDIS_URL is configured and parse its connection settings.
 *
 * @param {string} [customUrl]
 * @returns {object} ioredis options
 */
export function getRedisConfig(customUrl = null) {
  const connectionUrl = (customUrl !== null && customUrl !== undefined) ? customUrl : env.redisUrl;

  if (!connectionUrl) {
    throw new Error(
      'REDIS_URL is required for BullMQ queues and workers. Please configure REDIS_URL in your environment.'
    );
  }

  const isTls = connectionUrl.startsWith('rediss://');

  const options = {
    // Required by BullMQ:
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // Connection resilience:
    connectTimeout: 15000,
    keepAlive: 30000,
    retryStrategy(times) {
      // Exponential backoff with a cap at 20 seconds
      const delay = Math.min(times * 1000, 20000);
      return delay;
    },
  };

  if (isTls) {
    options.tls = {
      rejectUnauthorized: true,
    };
  }

  return { connectionUrl, options, isTls };
}

let _sharedRedisInstance = null;

/**
 * Create a new ioredis connection configured for BullMQ.
 * Note: BullMQ requires dedicated connections for Queues, Workers, and QueueEvents.
 *
 * @param {object} [overrideOptions]
 * @returns {Redis}
 */
export function createRedisConnection(overrideOptions = {}) {
  const { connectionUrl, options } = getRedisConfig();

  const client = new Redis(connectionUrl, {
    ...options,
    ...overrideOptions,
  });

  client.on('error', (err) => {
    logger.error(`[redis] Connection error (${sanitizeRedisUrl(connectionUrl)}): ${err.message}`);
  });

  client.on('connect', () => {
    logger.info(`[redis] Connected successfully to ${sanitizeRedisUrl(connectionUrl)}`);
  });

  return client;
}

/**
 * Get or create a shared Redis client for general caching / queue management.
 *
 * @returns {Redis}
 */
export function getSharedRedisClient() {
  if (!_sharedRedisInstance) {
    _sharedRedisInstance = createRedisConnection({ lazyConnect: true });
  }
  return _sharedRedisInstance;
}

/**
 * Gracefully close shared Redis connections.
 */
export async function closeRedisConnection() {
  if (_sharedRedisInstance) {
    try {
      await _sharedRedisInstance.quit();
    } catch (err) {
      logger.warn(`[redis] Error closing shared connection: ${err.message}`);
    } finally {
      _sharedRedisInstance = null;
    }
  }
}
