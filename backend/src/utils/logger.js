import morgan from 'morgan';
import { env } from '../config/env.js';

/**
 * HTTP request logger middleware (Morgan).
 * Uses 'dev' format in development for colorized output,
 * 'combined' in production for structured log lines.
 */
export const httpLogger = morgan(env.isDev ? 'dev' : 'combined');

/**
 * Lightweight application-level logger.
 * Wraps console methods with a timestamp prefix.
 * Replace with Winston/Pino in a future logging upgrade.
 */
export const logger = {
  info:  (...args) => console.log(`[${new Date().toISOString()}] [INFO]`, ...args),
  warn:  (...args) => console.warn(`[${new Date().toISOString()}] [WARN]`, ...args),
  error: (...args) => console.error(`[${new Date().toISOString()}] [ERROR]`, ...args),
  debug: (...args) => {
    if (env.isDev) console.debug(`[${new Date().toISOString()}] [DEBUG]`, ...args);
  },
};
