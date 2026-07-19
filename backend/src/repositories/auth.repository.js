import { query } from '../config/database.js';

// ─── User Queries ─────────────────────────────────────────────────────────────

/**
 * Finds a user by their email address.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT * FROM users WHERE email = $1 AND is_active = TRUE LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

/**
 * Finds a user by their primary key (UUID).
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function findUserById(id) {
  const { rows } = await query(
    `SELECT * FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Finds a user by OAuth provider + provider-specific ID.
 * @param {string} provider  - 'google' | 'github'
 * @param {string} providerId
 * @returns {Promise<object|null>}
 */
export async function findUserByProvider(provider, providerId) {
  const { rows } = await query(
    `SELECT * FROM users
     WHERE auth_provider = $1 AND provider_id = $2 AND is_active = TRUE
     LIMIT 1`,
    [provider, providerId]
  );
  return rows[0] ?? null;
}

/**
 * Creates a new local (email/password) user.
 * @param {{ fullName: string, email: string, passwordHash: string }} data
 * @returns {Promise<object>} created user row
 */
export async function createLocalUser({ fullName, email, passwordHash }) {
  const { rows } = await query(
    `INSERT INTO users (full_name, email, password_hash, auth_provider)
     VALUES ($1, $2, $3, 'local')
     RETURNING id, full_name, email, avatar_url, email_verified, created_at`,
    [fullName, email, passwordHash]
  );
  return rows[0];
}

/**
 * Finds an existing OAuth user or creates a new one.
 * On conflict (same provider + provider_id), updates name and avatar.
 *
 * @param {{ provider: string, providerId: string, email: string|null,
 *            fullName: string, avatarUrl: string|null }} data
 * @returns {Promise<object>}
 */
export async function findOrCreateOAuthUser({ provider, providerId, email, fullName, avatarUrl }) {
  const { rows } = await query(
    `INSERT INTO users (full_name, email, auth_provider, provider_id, avatar_url, email_verified)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (auth_provider, provider_id)
       WHERE provider_id IS NOT NULL
     DO UPDATE SET
       full_name  = EXCLUDED.full_name,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = NOW()
     RETURNING id, full_name, email, avatar_url, email_verified, auth_provider, created_at`,
    [fullName, email, provider, providerId, avatarUrl]
  );
  return rows[0];
}

// ─── Refresh Token Queries ────────────────────────────────────────────────────

/**
 * Persists a hashed refresh token for a user.
 * @param {{ userId: string, tokenHash: string, familyId: string, expiresAt: Date }} data
 * @returns {Promise<object>}
 */
export async function saveRefreshToken({ userId, tokenHash, familyId, expiresAt }) {
  const { rows } = await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId, tokenHash, familyId, expiresAt]
  );
  return rows[0];
}

/**
 * Finds a valid (non-revoked, non-expired) refresh token by its hash.
 * @param {string} tokenHash
 * @returns {Promise<object|null>}
 */
export async function findRefreshToken(tokenHash) {
  const { rows } = await query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1
       AND revoked    = FALSE
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] ?? null;
}

/**
 * Returns all non-expired refresh token rows for a user.
 * Used during token rotation to bcrypt.compare the incoming raw token
 * against stored hashes (bcrypt hashes are not reversible).
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
export async function findActiveRefreshTokensForUser(userId) {
  const { rows } = await query(
    `SELECT * FROM refresh_tokens
     WHERE user_id   = $1
       AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Revokes a single refresh token by its ID.
 * @param {string} tokenId
 */
export async function revokeRefreshToken(tokenId) {
  await query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`,
    [tokenId]
  );
}

/**
 * Revokes all tokens in a rotation family.
 * Called when a reuse attack is detected (a revoked token is presented again).
 * @param {string} familyId
 */
export async function revokeTokenFamily(familyId) {
  await query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE family_id = $1`,
    [familyId]
  );
}

/**
 * Revokes all active refresh tokens for a user (logout all devices).
 * @param {string} userId
 */
export async function revokeAllUserTokens(userId) {
  await query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
    [userId]
  );
}

/**
 * Updates a user's profile fields.
 */
export async function updateUserProfile(userId, fields) {
  const allowed = ['full_name','phone','company','designation','bio','country','timezone','avatar_url'];
  const sets = [];
  const vals = [];
  let idx = 1;
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) { sets.push(`${k}=$${idx++}`); vals.push(v); }
  }
  if (!sets.length) return null;
  vals.push(userId);
  const { rows } = await query(
    `UPDATE users SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${idx} RETURNING *`,
    vals
  );
  return rows[0] ?? null;
}

/**
 * Returns owned team count and joined (non-owned) team count for a user.
 */
export async function getUserTeamStats(userId) {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*) FROM teams WHERE created_by = $1) AS owned_count,
       (SELECT COUNT(*) FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = $1 AND t.created_by <> $1) AS joined_count`,
    [userId]
  );
  return { ownedCount: parseInt(rows[0].owned_count, 10), joinedCount: parseInt(rows[0].joined_count, 10) };
}
