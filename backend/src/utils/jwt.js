import jwt from 'jsonwebtoken';
import { accessTokenOptions, refreshTokenOptions } from '../config/jwt.js';

/**
 * Signs a new access token for the given user.
 * @param {{ id: string, email: string }} user
 * @returns {string}
 */
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, type: 'access' },
    accessTokenOptions.secret,
    accessTokenOptions.options
  );
}

/**
 * Signs a new refresh token for the given user.
 * @param {{ id: string }} user
 * @returns {string}
 */
export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    refreshTokenOptions.secret,
    refreshTokenOptions.options
  );
}

/**
 * Verifies an access token and returns its decoded payload.
 * Throws a JsonWebTokenError if invalid or expired.
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, accessTokenOptions.secret, {
    issuer:   accessTokenOptions.options.issuer,
    audience: accessTokenOptions.options.audience,
  });
}

/**
 * Verifies a refresh token and returns its decoded payload.
 * Throws a JsonWebTokenError if invalid or expired.
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshTokenOptions.secret, {
    issuer:   refreshTokenOptions.options.issuer,
    audience: refreshTokenOptions.options.audience,
  });
}
