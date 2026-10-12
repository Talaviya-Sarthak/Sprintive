import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validation.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authLimiter, refreshLimiter } from '../middleware/rateLimiter.middleware.js';
import { signupSchema, loginSchema, refreshSchema } from '../validations/auth.validation.js';

const router = Router();

// ─── Local Auth ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Rate-limited → Zod validation → controller
 */
router.post('/signup',
  authLimiter,
  validate(signupSchema),
  authController.signup
);

/**
 * POST /api/auth/login
 * Rate-limited → Zod validation → controller
 */
router.post('/login',
  authLimiter,
  validate(loginSchema),
  authController.login
);

/**
 * POST /api/auth/logout
 * Requires valid access token
 */
router.post('/logout',
  requireAuth,
  authController.logout
);

/**
 * POST /api/auth/refresh
 * Rate-limited → Zod validation → controller
 */
router.post('/refresh',
  refreshLimiter,
  validate(refreshSchema),
  authController.refresh
);

/**
 * GET /api/auth/me
 * Requires valid access token
 */
router.get('/me',
  requireAuth,
  authController.getMe
);

// ─── Google OAuth ─────────────────────────────────────────────────────────────

/**
 * GET /api/auth/google
 * Redirects to Google's consent screen, preserving redirect path in state
 */
router.get('/google', (req, res, next) => {
  const { redirect } = req.query;
  const safeRedirect = (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//'))
    ? redirect
    : null;
  passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email'],
    state: safeRedirect || undefined,
  })(req, res, next);
});

/**
 * GET /api/auth/google/callback
 * Google redirects here after user grants access
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/oauth/failure' }),
  authController.oauthCallback
);

// ─── GitHub OAuth ─────────────────────────────────────────────────────────────

/**
 * GET /api/auth/github
 * Redirects to GitHub's authorization page, preserving redirect path in state
 */
router.get('/github', (req, res, next) => {
  const { redirect } = req.query;
  const safeRedirect = (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//'))
    ? redirect
    : null;
  passport.authenticate('github', {
    session: false,
    scope: ['user:email'],
    state: safeRedirect || undefined,
  })(req, res, next);
});

/**
 * GET /api/auth/github/callback
 * GitHub redirects here after user grants access
 */
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/api/auth/oauth/failure' }),
  authController.oauthCallback
);

/**
 * GET /api/auth/oauth/failure
 * Fallback for OAuth failures
 */
router.get('/oauth/failure', authController.oauthFailure);

export default router;
