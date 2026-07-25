import api from './api';
import type { Meeting, Participant, ChatMessage, MeetingParticipant, MeetingSummary, CreateMeetingPayload } from '../types';

export interface MeetingFilters {
  search?: string;
  status?: string;
  meeting_type?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
}

export const meetingService = {
  async createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
    const { data } = await api.post('/meetings', payload);
    return data.data;
  },

  async getMeetings(team_id: string, filters: MeetingFilters = {}): Promise<Meeting[]> {
    const { data } = await api.get('/meetings', { params: { team_id, ...filters } });
    return data.data;
  },

  async getTeamMeetings(teamId: string, filters: MeetingFilters = {}): Promise<Meeting[]> {
    const { data } = await api.get(`/teams/${teamId}/meetings`, { params: filters });
    return data.data;
  },

  async getMeeting(id: string): Promise<Meeting> {
    const { data } = await api.get(`/meetings/${id}`);
    return data.data;
  },

  async updateMeeting(id: string, payload: Partial<CreateMeetingPayload>): Promise<Meeting> {
    const { data } = await api.put(`/meetings/${id}`, payload);
    return data.data;
  },

  async deleteMeeting(id: string): Promise<void> {
    await api.delete(`/meetings/${id}`);
  },

  async joinMeeting(id: string): Promise<{ meeting: Meeting; participants: Participant[] }> {
    const { data } = await api.post(`/meetings/${id}/join`);
    return data.data;
  },

  async leaveMeeting(id: string): Promise<void> {
    await api.post(`/meetings/${id}/leave`);
  },

  async startMeeting(id: string): Promise<{ meeting: Meeting }> {
    const { data } = await api.post(`/meetings/${id}/start`);
    return data.data;
  },

  async endMeeting(id: string): Promise<{ meeting: Meeting; transcript: any; summary: any }> {
    const { data } = await api.post(`/meetings/${id}/end`);
    return data.data;
  },

  async getTranscript(id: string): Promise<any> {
    const { data } = await api.get(`/meetings/${id}/transcript`);
    return data.data;
  },

  async getChats(id: string): Promise<ChatMessage[]> {
    const { data } = await api.get(`/meetings/${id}/chats`);
    return data.data;
  },

  async sendMessage(id: string, message: string): Promise<ChatMessage> {
    const { data } = await api.post(`/meetings/${id}/messages`, { message });
    return data.data;
  },

  async getParticipants(id: string): Promise<MeetingParticipant[]> {
    const { data } = await api.get(`/meetings/${id}/participants`);
    return data.data;
  },

  async getSummary(id: string): Promise<MeetingSummary> {
    const { data } = await api.get(`/meetings/${id}/summary`);
    return data.data;
  },

  async getTeamMembers(team_id: string): Promise<{ user_id: string; full_name: string }[]> {
    const { data } = await api.get(`/teams/${team_id}/members`);
    return data.data;
  },
};
