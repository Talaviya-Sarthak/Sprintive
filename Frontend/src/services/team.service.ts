import api from './api';
import type { Team, Invitation, CreateTeamPayload } from '../types';

export const teamService = {
  async createTeam(payload: CreateTeamPayload): Promise<{ team: Team; invitations: Invitation[] }> {
    const form = new FormData();
    form.append('name', payload.name);
    if (payload.description) form.append('description', payload.description);
    form.append('color', payload.color);
    form.append('timezone', payload.timezone);
    form.append('working_days', JSON.stringify(payload.working_days));
    form.append('daily_scrum_time', payload.daily_scrum_time);
    form.append('invite_emails', JSON.stringify(payload.invite_emails));
    if (payload.avatar) form.append('avatar', payload.avatar);
    const { data } = await api.post('/teams', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.data;
  },

  async getTeam(id: string): Promise<Team> {
    const { data } = await api.get(`/teams/${id}`);
    return data.data;
  },

  async inviteMembers(team_id: string, emails: string[]) {
    const { data } = await api.post('/teams/invite', { team_id, emails });
    return data.data;
  },

  async generateInviteLink(team_id: string) {
    const { data } = await api.post('/teams/invite-link', { team_id });
    return data.data as { token: string; link: string; expires_at: string };
  },

  async getInvitePreview(token: string): Promise<Invitation> {
    const { data } = await api.get(`/teams/invite/${token}`);
    return data.data;
  },

  async acceptInvitation(token: string): Promise<Team> {
    const { data } = await api.post('/teams/join', { token });
    return data.data;
  },

  async rejectInvitation(token: string) {
    const { data } = await api.post('/teams/reject', { token });
    return data;
  },
};
