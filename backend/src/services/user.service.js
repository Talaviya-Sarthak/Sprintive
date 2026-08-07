import { searchUsers as repositorySearchUsers } from '../repositories/auth.repository.js';
import { teamRepository } from '../repositories/team.repository.js';
import { AppError } from '../middleware/error.middleware.js';

/**
 * Searches Sprintive users for the WhatsApp-style member-invitation picker.
 *
 * When a teamId is supplied, the requesting user must be a member of that
 * team so membership / pending-invitation flags are only exposed to people
 * who belong to the team. Without a teamId, a plain (flag-free) search is
 * returned.
 *
 * @param {{ query: string, teamId: string|null, userId: string }} opts
 * @returns {Promise<object[]>} sanitized user rows
 */
export async function searchUsers({ query, teamId, userId }) {
  if (teamId) {
    const isMember = await teamRepository.isMember(teamId, userId);
    if (!isMember) {
      throw new AppError('Access denied', 403);
    }
  }

  return repositorySearchUsers({ query, limit: 20, excludeUserId: userId, teamId: teamId ?? null });
}
