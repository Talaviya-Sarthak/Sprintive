import { teamService }   from '../services/team.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { HTTP_STATUS }  from '../utils/constants.js';
import {
  createTeamSchema,
  updateTeamSchema,
  inviteMembersSchema,
  joinTeamSchema,
} from '../validators/team.validator.js';

export const teamController = {
  async createTeam(req, res, next) {
    try {
      const parsed = createTeamSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, {
          message:    parsed.error.errors[0].message,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          errors:     parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;
      const result = await teamService.createTeam({ ...parsed.data, avatar_url: avatar, userId: req.user.id });
      return sendSuccess(res, { message: 'Team created.', data: result, statusCode: HTTP_STATUS.CREATED });
    } catch (err) {
      console.error('createTeam error:', err);
      next(err);
    }
  },

  async getMyTeams(req, res, next) {
    try {
      const teams = await teamService.getUserTeams(req.user.id);
      return sendSuccess(res, { message: 'Teams retrieved.', data: teams });
    } catch (err) { next(err); }
  },

  async getDashboard(req, res, next) {
    try {
      const data = await teamService.getDashboard(req.user.id);
      return sendSuccess(res, { message: 'Dashboard data retrieved.', data });
    } catch (err) { next(err); }
  },

  async getTeam(req, res, next) {
    try {
      const team = await teamService.getTeam(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Team retrieved.', data: team });
    } catch (err) { next(err); }
  },

  async updateTeam(req, res, next) {
    try {
      const parsed = updateTeamSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, {
          message:    parsed.error.errors[0].message,
          statusCode: HTTP_STATUS.BAD_REQUEST,
          errors:     parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;
      const fields = { ...parsed.data, ...(avatar ? { avatar_url: avatar } : {}) };
      const team   = await teamService.updateTeam({ id: req.params.id, userId: req.user.id, fields });
      return sendSuccess(res, { message: 'Team updated.', data: team });
    } catch (err) { next(err); }
  },

  async deleteTeam(req, res, next) {
    try {
      await teamService.deleteTeam({ id: req.params.id, userId: req.user.id });
      return sendSuccess(res, { message: 'Team deleted.' });
    } catch (err) { next(err); }
  },

  async getMembers(req, res, next) {
    try {
      const members = await teamService.getMembers(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Members retrieved.', data: members });
    } catch (err) { next(err); }
  },

  async removeMember(req, res, next) {
    try {
      await teamService.removeMember({
        team_id:          req.params.id,
        member_user_id:   req.params.memberId,
        requestingUserId: req.user.id,
      });
      return sendSuccess(res, { message: 'Member removed.' });
    } catch (err) { next(err); }
  },

  async inviteMembers(req, res, next) {
    try {
      const body    = inviteMembersSchema.parse(req.body);
      const results = await teamService.inviteMembers({ ...body, userId: req.user.id });
      return sendSuccess(res, { message: 'Invitations sent.', data: results });
    } catch (err) { next(err); }
  },

  async getInvitations(req, res, next) {
    try {
      const invitations = await teamService.getTeamInvitations(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Invitations retrieved.', data: invitations });
    } catch (err) { next(err); }
  },

  async getInvitePreview(req, res, next) {
    try {
      const invitation = await teamService.validateInviteToken(req.params.token);
      return sendSuccess(res, { message: 'Invitation retrieved.', data: invitation });
    } catch (err) { next(err); }
  },

  async acceptInvitation(req, res, next) {
    try {
      const { token } = joinTeamSchema.parse(req.body);
      const team      = await teamService.acceptInvitation({ token, userId: req.user.id });
      return sendSuccess(res, { message: 'Joined team successfully.', data: team });
    } catch (err) { next(err); }
  },

  async rejectInvitation(req, res, next) {
    try {
      const { token } = joinTeamSchema.parse(req.body);
      await teamService.rejectInvitation(token);
      return sendSuccess(res, { message: 'Invitation declined.' });
    } catch (err) { next(err); }
  },
};
