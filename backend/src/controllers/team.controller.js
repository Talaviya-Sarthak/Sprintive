import { teamService }        from '../services/team.service.js';
import { createTeamSchema, inviteMembersSchema, joinTeamSchema } from '../validators/team.validator.js';
import { env } from '../config/env.js';

export const teamController = {
  async createTeam(req, res, next) {
    try {
      const body   = createTeamSchema.parse(req.body);
      const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;
      const result = await teamService.createTeam({ ...body, avatar_url: avatar, userId: req.user.id });
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async getTeam(req, res, next) {
    try {
      const team = await teamService.getTeam(req.params.id);
      res.json({ success: true, data: team });
    } catch (err) { next(err); }
  },

  async inviteMembers(req, res, next) {
    try {
      const body        = inviteMembersSchema.parse(req.body);
      const invitations = await teamService.inviteMembers({ ...body, userId: req.user.id });
      const links       = invitations.map((inv) => ({
        email: inv.email,
        link:  `${env.frontendUrl}/join/${inv.token}`,
        token: inv.token,
      }));
      res.json({ success: true, data: links });
    } catch (err) { next(err); }
  },

  async generateInviteLink(req, res, next) {
    try {
      const { team_id } = req.body;
      if (!team_id) return res.status(400).json({ success: false, message: 'team_id required' });
      const invitation = await teamService.generateInviteLink({ team_id, userId: req.user.id });
      res.json({
        success: true,
        data: {
          token: invitation.token,
          link:  `${env.frontendUrl}/join/${invitation.token}`,
          expires_at: invitation.expires_at,
        },
      });
    } catch (err) { next(err); }
  },

  async getInvitePreview(req, res, next) {
    try {
      const invitation = await teamService.validateInviteToken(req.params.token);
      res.json({ success: true, data: invitation });
    } catch (err) { next(err); }
  },

  async acceptInvitation(req, res, next) {
    try {
      const { token } = joinTeamSchema.parse(req.body);
      const team      = await teamService.acceptInvitation({ token, userId: req.user.id });
      res.json({ success: true, data: team });
    } catch (err) { next(err); }
  },

  async rejectInvitation(req, res, next) {
    try {
      const { token } = joinTeamSchema.parse(req.body);
      await teamService.rejectInvitation(token);
      res.json({ success: true, message: 'Invitation declined' });
    } catch (err) { next(err); }
  },
};
