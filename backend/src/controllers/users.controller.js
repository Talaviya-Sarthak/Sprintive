import { z } from 'zod';
import * as userService from '../services/user.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

const searchUsersSchema = z.object({
  query:  z.string().trim().min(1, 'Search query is required.').max(100),
  teamId: z.string().uuid().nullable().optional(),
});

/**
 * GET /api/users/search?query=...&teamId=...
 * Returns matching Sprintive users for the invitation picker.
 * Requires a valid access token (requireAuth middleware).
 */
export async function searchUsers(req, res, next) {
  try {
    const parsed = searchUsersSchema.safeParse({
      query:  req.query.query,
      teamId: req.query.teamId ?? null,
    });
    if (!parsed.success) {
      return sendError(res, {
        message:    parsed.error.errors[0].message,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        errors:     parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const users = await userService.searchUsers({ ...parsed.data, userId: req.user.id });
    return sendSuccess(res, { message: 'Users retrieved.', data: users });
  } catch (err) {
    next(err);
  }
}
