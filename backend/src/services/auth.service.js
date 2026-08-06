import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import {
  findUserByEmail,
  findUserById,
  findUserByProvider,
  createLocalUser,
  createOAuthUser,
  linkOAuthProvider,
  saveRefreshToken,
  revokeRefreshToken,
  revokeTokenFamily,
  revokeAllUserTokens,
  findActiveRefreshTokensForUser,
} from '../repositories/auth.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { BCRYPT_ROUNDS } from '../utils/constants.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses the REFRESH_TOKEN_EXPIRY env string (e.g. "7d") into milliseconds.
 * Supports: s (seconds), m (minutes), h (hours), d (days).
 */
function parseExpiryMs(expiry) {
  const unit  = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);
  const map   = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (map[unit] ?? 86_400_000);
}

/**
 * Issues a new access + refresh token pair and persists the refresh token.
 * The raw refresh token is returned to the client; only its bcrypt hash
 * is stored in the database.
 */
async function issueTokenPair(user, familyId = null) {
  const accessToken  = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + parseExpiryMs(env.refreshTokenExpiry));

  await saveRefreshToken({
    userId:    user.id,
    tokenHash,
    familyId:  familyId ?? crypto.randomUUID(),
    expiresAt,
  });

  return { accessToken, refreshToken };
}

/**
 * Strips sensitive fields before returning user data to the client.
 */
function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Registers a new local user.
 * Throws 409 if the email is already in use.
 */
export async function signup({ full_name, email, password }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const user         = await createLocalUser({ fullName: full_name, email, passwordHash });
  const tokens       = await issueTokenPair(user);

  return { user: sanitizeUser(user), ...tokens };
}

/**
 * Authenticates a local user with email + password.
 * Throws 401 for invalid credentials (intentionally vague for security).
 */
export async function login({ email, password }) {
  const user = await findUserByEmail(email);

  // Constant-time comparison even when user doesn't exist (prevents timing attacks)
  const passwordHash = user?.password_hash ?? '$2a$12$invalidhashfortimingprotection';
  const valid        = await comparePassword(password, passwordHash);

  if (!user || !valid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Your account has been deactivated. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  const tokens = await issueTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
}

/**
 * Revokes all refresh tokens for the user (logout from all devices).
 */
export async function logout(userId) {
  await revokeAllUserTokens(userId);
}

/**
 * Rotates a refresh token.
 *
 * Security model:
 *  1. Verify the JWT signature of the incoming refresh token.
 *  2. Fetch all non-expired tokens for this user from the repository.
 *  3. bcrypt.compare each until a match is found.
 *  4. If the matched token is already revoked → reuse attack → revoke entire family.
 *  5. Revoke the old token and issue a new pair in the same family.
 */
export async function refreshTokens(rawRefreshToken) {
  // Step 1: Verify JWT signature
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    const err = new Error('Invalid or expired refresh token.');
    err.statusCode = 401;
    throw err;
  }

  // Step 2: Fetch candidates via repository (no dynamic imports)
  const candidates = await findActiveRefreshTokensForUser(payload.sub);

  let matchedToken = null;
  for (const row of candidates) {
    const match = await bcrypt.compare(rawRefreshToken, row.token_hash);
    if (match) { matchedToken = row; break; }
  }

  if (!matchedToken) {
    const err = new Error('Refresh token not found.');
    err.statusCode = 401;
    throw err;
  }

  // Step 3: Reuse attack detection
  if (matchedToken.revoked) {
    await revokeTokenFamily(matchedToken.family_id);
    const err = new Error('Token reuse detected. All sessions have been invalidated.');
    err.statusCode = 401;
    throw err;
  }

  // Step 4: Rotate — revoke old, issue new in same family
  await revokeRefreshToken(matchedToken.id);

  const user = await findUserById(payload.sub);
  if (!user || !user.is_active) {
    const err = new Error('User not found or deactivated.');
    err.statusCode = 401;
    throw err;
  }

  const tokens = await issueTokenPair(user, matchedToken.family_id);
  return { user: sanitizeUser(user), ...tokens };
}

/**
 * Returns the authenticated user's profile (sanitized).
 */
export async function getCurrentUser(userId) {
  const user = await findUserById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  return sanitizeUser(user);
}

/**
 * Resolves an OAuth profile to a user account, linking or creating as needed.
 *
 * Resolution order (never inserts a duplicate email):
 *   1. Match an existing user by (provider, providerId) → return it.
 *   2. Otherwise match by email → link the OAuth identity to that account,
 *      preserving the existing password_hash so email/password login still works.
 *   3. Otherwise create a brand-new user from the OAuth profile.
 *
 * A Postgres unique-violation (code 23505) can only occur under a race between
 * two concurrent sign-ins for the same brand-new identity; it is caught and
 * re-resolved rather than bubbling up as a 409 to the client.
 *
 * @param {{ provider: string, providerId: string, email: string|null,
 *            fullName: string, avatarUrl: string|null }} data
 * @returns {Promise<object>} resolved user row
 */
export async function findOrCreateOAuthUser({ provider, providerId, email, fullName, avatarUrl }) {
  // 1. Existing OAuth identity → already linked, just sign in.
  let user = await findUserByProvider(provider, providerId);
  if (user) return user;

  // 2. Same email → link the OAuth account to the existing user.
  if (email) {
    user = await findUserByEmail(email);
    if (user) return linkOAuthProvider(user.id, { provider, providerId, avatarUrl });
  }

  // 3. No account at all → create one from the OAuth profile.
  try {
    return await createOAuthUser({ provider, providerId, email, fullName, avatarUrl });
  } catch (err) {
    // Race: a concurrent request inserted this user between our lookups.
    // Re-resolve by provider, then by email, instead of failing the sign-in.
    if (err.code === '23505') {
      user = await findUserByProvider(provider, providerId);
      if (user) return user;

      if (email) {
        user = await findUserByEmail(email);
        if (user) return linkOAuthProvider(user.id, { provider, providerId, avatarUrl });
      }
    }
    throw err;
  }
}

/**
 * Issues tokens for an OAuth-authenticated user.
 * Called after Passport successfully authenticates via Google/GitHub.
 */
export async function handleOAuthSuccess(user) {
  const tokens = await issueTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
}
