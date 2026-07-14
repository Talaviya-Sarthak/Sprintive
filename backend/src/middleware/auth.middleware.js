import passport from 'passport';
import { sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

/**
 * Protects a route by requiring a valid JWT access token.
 * Attaches the authenticated user to req.user on success.
 *
 * Usage:
 *   router.get('/me', requireAuth, controller.getMe);
 */
export function requireAuth(req, res, next) {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err)    return next(err);
    if (!user)  return sendError(res, {
      message:    'Authentication required. Please log in.',
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    });
    req.user = user;
    next();
  })(req, res, next);
}
