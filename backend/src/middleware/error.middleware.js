import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    if (code) {
      this.code = code;
    }
  }
}

/**
 * Centralized error-handling middleware.
 * Must be registered LAST in the Express middleware chain (4 arguments).
 *
 * Handles:
 *  - JWT errors (expired / invalid tokens)
 *  - PostgreSQL unique-constraint violations
 *  - Generic application errors
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} —`, err.message);

  // JWT: token expired
  if (err.name === 'TokenExpiredError') {
    return sendError(res, {
      message:    'Your session has expired. Please log in again.',
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    });
  }

  // JWT: invalid token
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, {
      message:    'Invalid token. Please log in again.',
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    });
  }

  // Zod: validation error
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field:   e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, {
      message:    'Validation failed',
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      errors,
    });
  }

  // PostgreSQL: unique constraint violation (code 23505)
  if (err.code === '23505') {
    return sendError(res, {
      message:    'A record with this value already exists.',
      statusCode: HTTP_STATUS.CONFLICT,
    });
  }

  // Application-level errors with an explicit statusCode
  if (err.statusCode) {
    return sendError(res, {
      message:    err.message,
      statusCode: err.statusCode,
    });
  }

  // Fallback: unexpected server error
  return sendError(res, {
    message:    'An unexpected error occurred. Please try again.',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  });
}
