import api from './api';
import type { Meeting, Participant, ChatMessage, Recording, Transcript, CreateMeetingPayload } from '../types';

export const meetingService = {
  async createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
    const { data } = await api.post('/meetings', payload);
    return data.data;
  },

  async getMeetings(team_id: string): Promise<Meeting[]> {
    const { data } = await api.get('/meetings', { params: { team_id } });
    return data.data;
  },

  async getMeeting(id: string): Promise<Meeting> {
    const { data } = await api.get(`/meetings/${id}`);
    return data.data;
  },

  async joinMeeting(id: string): Promise<{ meeting: Meeting; participants: Participant[] }> {
    const { data } = await api.post(`/meetings/${id}/join`);
    return data.data;
  },

  async startMeeting(id: string): Promise<{ meeting: Meeting; recording: Recording }> {
    const { data } = await api.post(`/meetings/${id}/start`);
    return data.data;
  },

  async endMeeting(id: string): Promise<{ meeting: Meeting; recording: Recording; transcript: Transcript }> {
    const { data } = await api.post(`/meetings/${id}/end`);
    return data.data;
  },

  async getTranscript(id: string): Promise<Transcript> {
    const { data } = await api.get(`/meetings/${id}/transcript`);
    return data.data;
  },

  async getRecording(id: string): Promise<Recording> {
    const { data } = await api.get(`/meetings/${id}/recording`);
    return data.data;
  },

  async getChats(id: string): Promise<ChatMessage[]> {
    const { data } = await api.get(`/meetings/${id}/chats`);
    return data.data;
  },

  async getParticipants(id: string): Promise<Participant[]> {
    const { data } = await api.get(`/meetings/${id}/join`);
    return data.data?.participants ?? [];
  },

  async leaveMeeting(id: string): Promise<void> {
    await api.post(`/meetings/${id}/leave`).catch(() => {});
  },
};
