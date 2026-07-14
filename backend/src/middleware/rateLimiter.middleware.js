import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

const rateLimitHandler = (_req, res) =>
  sendError(res, {
    message:    'Too many requests. Please try again later.',
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  });

/**
 * Strict limiter for auth mutation endpoints (signup, login).
 * 10 attempts per IP per 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
});

/**
 * Moderate limiter for token refresh.
 * 30 requests per IP per 15 minutes.
 */
export const refreshLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              30,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
});

/**
 * General API limiter applied globally.
 * 200 requests per IP per 15 minutes.
 */
export const globalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
});
