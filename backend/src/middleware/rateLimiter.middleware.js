import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { env } from '../config/env.js';

const rateLimitHandler = (_req, res) =>
  sendError(res, {
    message:    'Too many requests. Please try again later.',
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  });

/**
 * Strict limiter for auth mutation endpoints (signup, login).
 * In development: skipped to avoid blocking local developer workflows.
 * In production: 10 attempts per IP per 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              env.isDev ? 1000 : 10,
  skip:             () => env.isDev,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
});

/**
 * Moderate limiter for token refresh.
 * In development: skipped.
 * In production: 30 requests per IP per 15 minutes.
 */
export const refreshLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              env.isDev ? 5000 : 30,
  skip:             () => env.isDev,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
});

/**
 * General API limiter applied globally.
 * In development: skipped so rapid polling does not block requests.
 * In production: 200 requests per IP per 15 minutes.
 */
export const globalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              env.isDev ? 50000 : 200,
  skip:             () => env.isDev,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
});

