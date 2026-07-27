import { env } from '../config/env.js';
import * as authService from '../services/auth.service.js';
import { teamRepository } from '../repositories/team.repository.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

/**
 * POST /api/auth/signup
 * Body validated by signupSchema before reaching this controller.
 */
export async function signup(req, res, next) {
  try {
    const result = await authService.signup(req.body);
    return sendSuccess(res, {
      message:    'Account created successfully.',
      data:       result,
      statusCode: HTTP_STATUS.CREATED,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Body validated by loginSchema before reaching this controller.
 */
export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return sendSuccess(res, {
      message: 'Logged in successfully.',
      data:    result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Requires a valid access token (requireAuth middleware).
 */
export async function logout(req, res, next) {
  try {
    await authService.logout(req.user.id);
    return sendSuccess(res, { message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Body validated by refreshSchema before reaching this controller.
 */
export async function refresh(req, res, next) {
  try {
    const result = await authService.refreshTokens(req.body.refresh_token);
    return sendSuccess(res, {
      message: 'Tokens refreshed successfully.',
      data:    result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Requires a valid access token (requireAuth middleware).
 */
export async function getMe(req, res, next) {
  try {
    const user  = await authService.getCurrentUser(req.user.id);
    const teams = await teamRepository.findByUser(req.user.id);
    return sendSuccess(res, {
      message: 'User profile retrieved.',
      data:    { user, teams },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/google/callback
 * GET /api/auth/github/callback
 *
 * Called by Passport after a successful OAuth flow.
 * Redirects to the frontend with tokens in the query string.
 *
 * NOTE: In a production hardening pass, replace query-string tokens
 * with a short-lived one-time code exchanged server-side.
 */
export async function oauthCallback(req, res, next) {
  try {
    const result = await authService.handleOAuthSuccess(req.user);
    const params = new URLSearchParams({
      access_token:  result.accessToken,
      refresh_token: result.refreshToken,
    });
    return res.redirect(`${env.frontendUrl}/auth/callback?${params.toString()}`);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles OAuth strategy failures (user denied access or provider error).
 */
export function oauthFailure(_req, res) {
  return sendError(res, {
    message:    'OAuth authentication failed. Please try again.',
    statusCode: HTTP_STATUS.UNAUTHORIZED,
  });
}
