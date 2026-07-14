import { sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

/**
 * Catches any request that didn't match a registered route
 * and returns a consistent 404 JSON response.
 * Must be registered AFTER all routes.
 */
export function notFound(req, res) {
  sendError(res, {
    message:    `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: HTTP_STATUS.NOT_FOUND,
  });
}
