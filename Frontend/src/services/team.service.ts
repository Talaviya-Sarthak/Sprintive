import api from './api';
import type { Team, TeamMember, Invitation, DashboardData, CreateTeamPayload, UserSearchResult, InviteUsersResult } from '../types';

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
    return { team: data.data.team, invitations: data.data.invitations ?? [] };
  },

  async getMyTeams(): Promise<Team[]> {
    const { data } = await api.get('/teams');
    return data.data;
  },

  async getDashboard(): Promise<DashboardData> {
    const { data } = await api.get('/teams/dashboard');
    return data.data;
  },

  async getTeam(id: string): Promise<Team> {
    const { data } = await api.get(`/teams/${id}`);
    return data.data;
  },

  async updateTeam(id: string, payload: Partial<CreateTeamPayload>): Promise<Team> {
    const form = new FormData();
    if (payload.name)             form.append('name', payload.name);
    if (payload.description != null) form.append('description', payload.description);
    if (payload.color)            form.append('color', payload.color);
    if (payload.timezone)         form.append('timezone', payload.timezone);
    if (payload.working_days)     form.append('working_days', JSON.stringify(payload.working_days));
    if (payload.daily_scrum_time) form.append('daily_scrum_time', payload.daily_scrum_time);
    if (payload.avatar)           form.append('avatar', payload.avatar);
    const { data } = await api.patch(`/teams/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.data;
  },

  async deleteTeam(id: string): Promise<void> {
    await api.delete(`/teams/${id}`);
  },

  async getMembers(teamId: string): Promise<TeamMember[]> {
    const { data } = await api.get(`/teams/${teamId}/members`);
    return data.data;
  },

  async removeMember(teamId: string, memberId: string): Promise<void> {
    await api.delete(`/teams/${teamId}/members/${memberId}`);
  },

  async inviteMembers(teamId: string, emails: string[]) {
    const { data } = await api.post(`/teams/${teamId}/invite`, { team_id: teamId, emails });
    return data.data;
  },

  async getInvitations(teamId: string): Promise<Invitation[]> {
    const { data } = await api.get(`/teams/${teamId}/invitations`);
    return data.data;
  },

  async getInvitePreview(token: string): Promise<Invitation> {
    const { data } = await api.get(`/teams/invite/${token}`);
    return data.data;
  },

  async searchUsers(query: string, teamId?: string): Promise<UserSearchResult[]> {
    const { data } = await api.get('/users/search', {
      params: { query, ...(teamId ? { teamId } : {}) },
    });
    return data.data;
  },

  async inviteUsers(teamId: string, userIds: string[]): Promise<InviteUsersResult[]> {
    const { data } = await api.post(`/teams/${teamId}/invitations`, { userIds });
    return data.data;
  },

  async acceptInvitation(token: string): Promise<Team> {
    const { data } = await api.post('/teams/join', { token });
    return data.data;
  },

  async rejectInvitation(token: string): Promise<void> {
    await api.post('/teams/reject', { token });
  },

  async generateInviteLink(teamId: string): Promise<{ link: string }> {
    const { data } = await api.post(`/teams/${teamId}/invite-link`);
    return data.data;
  },

  async uploadAvatar(teamId: string, avatar: File): Promise<string> {
    const form = new FormData();
    form.append('avatar', avatar);
    const { data } = await api.post(`/teams/${teamId}/avatar`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.data.avatar_url;
  },
};
