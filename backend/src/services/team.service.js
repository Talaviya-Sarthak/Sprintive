import { teamRepository }    from '../repositories/team.repository.js';
import { findUserByEmail }   from '../repositories/auth.repository.js';
import { AppError }          from '../middleware/error.middleware.js';
import { sendInvitationEmail } from '../utils/email.js';
import { logger }            from '../utils/logger.js';
import { env }               from '../config/env.js';
import { PLAN_LIMITS }       from '../utils/constants.js';

export const teamService = {
  async createTeam({ name, description, color, timezone, working_days, daily_scrum_time, invite_emails, avatar_url, userId }) {
    // Free plan: max 2 owned teams
    const ownedCount = await teamRepository.countOwnedTeams(userId);
    if (ownedCount >= PLAN_LIMITS.free.maxOwnedTeams) {
      throw new AppError('You have reached your free plan limit of 2 owned teams. Upgrade to Pro to create more.', 403);
    }

    console.log('[teamService] Creating team:', { name, timezone, working_days: JSON.stringify(working_days), daily_scrum_time });

    try {
      const team = await teamRepository.createWithOwner({
        name, description, avatar_url, color, timezone,
        working_days, daily_scrum_time, created_by: userId,
      });

      console.log('[teamService] Team created successfully:', { id: team.id, name: team.name });
      logger.info(`[teams] Team created — id=${team.id} name="${team.name}" owner=${userId}`);

      // Send email invitations
      const invitations = [];
      for (const email of (invite_emails ?? [])) {
        const inv = await this._createAndSendInvitation({ team, email, invitedBy: userId });
        invitations.push(inv);
      }

      return { team, invitations };
    } catch (err) {
      console.error('[teamService] Error creating team:', err);
      throw err;
    }
  },

  async getTeam(id, requestingUserId) {
    const team = await teamRepository.findById(id);
    if (!team) throw new AppError('Team not found', 404);
    if (requestingUserId) {
      const isMember = await teamRepository.isMember(id, requestingUserId);
      if (!isMember) throw new AppError('Access denied', 403);
    }
    return team;
  },

  async getUserTeams(userId) {
    return teamRepository.findByUser(userId);
  },

  async updateTeam({ id, userId, fields }) {
    const team = await teamRepository.findById(id);
    if (!team) throw new AppError('Team not found', 404);
    if (team.created_by !== userId) throw new AppError('Only the team owner can update team settings', 403);
    const updated = await teamRepository.update(id, fields);
    return updated;
  },

  async deleteTeam({ id, userId }) {
    const team = await teamRepository.findById(id);
    if (!team) throw new AppError('Team not found', 404);
    if (team.created_by !== userId) throw new AppError('Only the team owner can delete this team', 403);
    await teamRepository.delete(id);
  },

  async getMembers(team_id, requestingUserId) {
    const isMember = await teamRepository.isMember(team_id, requestingUserId);
    if (!isMember) throw new AppError('Access denied', 403);
    return teamRepository.getMembers(team_id);
  },

  async removeMember({ team_id, member_user_id, requestingUserId }) {
    const team = await teamRepository.findById(team_id);
    if (!team) throw new AppError('Team not found', 404);
    if (team.created_by !== requestingUserId) throw new AppError('Only the team owner can remove members', 403);
    if (member_user_id === requestingUserId) throw new AppError('Owner cannot remove themselves', 400);
    await teamRepository.removeMember(team_id, member_user_id);
  },

  async inviteMembers({ team_id, emails, userId }) {
    const team = await teamRepository.findById(team_id);
    if (!team) throw new AppError('Team not found', 404);
    if (team.created_by !== userId) throw new AppError('Only the team owner can invite members', 403);

    const results = [];
    for (const email of emails) {
      // Skip if already a pending invitation for this email
      const existing = await teamRepository.findPendingInvitationByEmail(team_id, email);
      if (existing) {
        results.push({ email, status: 'already_invited', token: existing.token });
        continue;
      }
      const inv = await this._createAndSendInvitation({ team, email, invitedBy: userId });
      results.push({ email, status: 'invited', token: inv.token });
    }
    return results;
  },

  async _createAndSendInvitation({ team, email, invitedBy }) {
    const inv = await teamRepository.createInvitation({ team_id: team.id, invited_by: invitedBy, email });

    // Fetch inviter name
    const { rows } = await import('../config/database.js').then(m =>
      m.query('SELECT full_name FROM users WHERE id=$1', [invitedBy])
    );
    const inviterName = rows?.[0]?.full_name ?? 'A team member';

    const acceptUrl = `${env.frontendUrl}/join/${inv.token}`;
    await sendInvitationEmail({
      to:          email,
      inviterName,
      teamName:    team.name,
      teamColor:   team.color,
      acceptUrl,
      expiresAt:   inv.expires_at,
    });

    return inv;
  },

  async getTeamInvitations(team_id, requestingUserId) {
    const team = await teamRepository.findById(team_id);
    if (!team) throw new AppError('Team not found', 404);
    if (team.created_by !== requestingUserId) throw new AppError('Only the team owner can view invitations', 403);
    await teamRepository.expireOldInvitations();
    return teamRepository.getTeamInvitations(team_id);
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

    // Free plan: max 1 joined team
    const alreadyMember = await teamRepository.isMember(invitation.team_id, userId);
    if (!alreadyMember) {
      const joinedCount = await teamRepository.countJoinedTeams(userId);
      if (joinedCount >= PLAN_LIMITS.free.maxJoinedTeams) {
        throw new AppError('You have reached your free plan limit of 1 joined team. Upgrade to Pro to join more teams.', 403);
      }
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

  async getDashboard(userId) {
    const teams = await teamRepository.findByUser(userId);
    const ownedTeams  = teams.filter(t => t.created_by === userId);
    const joinedTeams = teams.filter(t => t.created_by !== userId);
    return {
      owned_teams:  ownedTeams,
      joined_teams: joinedTeams,
      plan: 'free',
      limits: PLAN_LIMITS.free,
    };
  },
};
