import { findUserById, updateUserProfile, getUserTeamStats } from '../repositories/auth.repository.js';
import { teamRepository } from '../repositories/team.repository.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { z } from 'zod';

const updateProfileSchema = z.object({
  full_name:   z.string().trim().min(2).max(150).optional(),
  phone:       z.string().max(30).optional().nullable(),
  company:     z.string().max(150).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
  bio:         z.string().max(500).optional().nullable(),
  country:     z.string().max(80).optional().nullable(),
  timezone:    z.string().max(60).optional(),
  remove_avatar: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
});

export const profileController = {
  async getProfile(req, res, next) {
    try {
      const user  = await findUserById(req.user.id);
      if (!user) return sendError(res, { message: 'User not found', statusCode: HTTP_STATUS.NOT_FOUND });

      const { password_hash, ...safe } = user;
      const stats  = await getUserTeamStats(req.user.id);
      const teams  = await teamRepository.findByUser(req.user.id);

      return sendSuccess(res, {
        message: 'Profile retrieved.',
        data: {
          ...safe,
          owned_teams:  teams.filter(t => t.created_by === req.user.id),
          joined_teams: teams.filter(t => t.created_by !== req.user.id),
          stats,
        },
      });
    } catch (err) { next(err); }
  },

  async updateProfile(req, res, next) {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, {
          message:    parsed.error.errors[0].message,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          errors:     parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      const fields = { ...parsed.data };
      if (req.file) {
        fields.avatar_url = `/uploads/${req.file.filename}`;
      } else if (fields.remove_avatar === true || fields.remove_avatar === 'true') {
        fields.avatar_url = null;
      }
      delete fields.remove_avatar;

      const updated = await updateUserProfile(req.user.id, fields);
      if (!updated) return sendError(res, { message: 'No fields to update', statusCode: HTTP_STATUS.BAD_REQUEST });

      const { password_hash, ...safe } = updated;
      return sendSuccess(res, { message: 'Profile updated.', data: safe });
    } catch (err) { next(err); }
  },
};
