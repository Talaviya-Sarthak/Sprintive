import { teamRepository } from '../repositories/team.repository.js';
import { AppError } from '../middleware/error.middleware.js';
import { logger } from '../utils/logger.js';

export const teamService = {
  async createTeam({ name, description, color, timezone, working_days, daily_scrum_time, invite_emails, avatar_url, userId }) {
    const team = await teamRepository.createWithOwner({
      name, description, avatar_url, color, timezone,
      working_days, daily_scrum_time, created_by: userId,
    });

    logger.info(`[teams] Team created — id=${team.id} name="${team.name}" owner=${userId} invite_code=${team.invite_code}`);

    // Create invitations for provided emails
    const invitations = await Promise.all(
      (invite_emails ?? []).map((email) =>
        teamRepository.createInvitation({ team_id: team.id, invited_by: userId, email })
      )
    );

    return { team, invitations };
  },

  async getTeam(id) {
    const team = await teamRepository.findById(id);
    if (!team) throw new AppError('Team not found', 404);
    return team;
  },

  async inviteMembers({ team_id, emails, userId }) {
    const team = await teamRepository.findById(team_id);
    if (!team) throw new AppError('Team not found', 404);
    if (team.created_by !== userId) throw new AppError('Only the team creator can invite members', 403);

    const invitations = await Promise.all(
      emails.map((email) =>
        teamRepository.createInvitation({ team_id, invited_by: userId, email })
      )
    );
    return invitations;
  },

  async generateInviteLink({ team_id, userId }) {
    const team = await teamRepository.findById(team_id);
    if (!team) throw new AppError('Team not found', 404);

    const invitation = await teamRepository.createInvitation({
      team_id, invited_by: userId, email: null,
    });
    return invitation;
  },

  async validateInviteToken(token) {
    await teamRepository.expireOldInvitations();
    const invitation = await teamRepository.findInvitationByToken(token);
    if (!invitation) throw new AppError('Invalid invitation link', 404);
    if (invitation.status !== 'pending') throw new AppError(`Invitation is ${invitation.status}`, 400);
    return invitation;
  },

  async acceptInvitation({ token, userId }) {
    const invitation = await this.validateInviteToken(token);
    const alreadyMember = await teamRepository.isMember(invitation.team_id, userId);
    if (!alreadyMember) {
      await teamRepository.addMember(invitation.team_id, userId, 'developer');
    }
    await teamRepository.updateInvitationStatus(token, 'accepted');
    const team = await teamRepository.findById(invitation.team_id);
    return team;
  },

  async rejectInvitation(token) {
    await teamRepository.expireOldInvitations();
    const invitation = await teamRepository.findInvitationByToken(token);
    if (!invitation) throw new AppError('Invalid invitation link', 404);
    await teamRepository.updateInvitationStatus(token, 'rejected');
  },
};
