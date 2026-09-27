import { useState, useMemo } from 'react';
import type { Meeting, MeetingStatus, MeetingType } from '../types';
import { mockMeetings, mockParticipants, mockChatMessages, mockMeetingSummaries, mockTeamMembers } from '../data/meetings';

const today = new Date().toISOString().split('T')[0];

export function useMeetingMockData(teamId?: string) {
  const [meetings, setMeetings] = useState<Meeting[]>(mockMeetings);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MeetingType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date');

  const teamMeetings = useMemo(() =>
    teamId ? meetings.filter(m => m.team_id === teamId) : meetings,
    [meetings, teamId]
  );

  const filteredMeetings = useMemo(() => {
    let filtered = teamMeetings;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.host_name?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(m => m.meeting_type === typeFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title': return a.title.localeCompare(b.title);
        case 'status': return a.status.localeCompare(b.status);
        case 'date': return new Date(b.date).getTime() - new Date(a.date).getTime();
        default: return 0;
      }
    });

    return filtered;
  }, [teamMeetings, search, statusFilter, typeFilter, sortBy]);

  const upcoming = useMemo(() => filteredMeetings.filter(m => m.status === 'scheduled'), [filteredMeetings]);
  const ongoing = useMemo(() => filteredMeetings.filter(m => m.status === 'active'), [filteredMeetings]);
  const completed = useMemo(() => filteredMeetings.filter(m => m.status === 'ended' || m.status === 'completed' || m.status === 'cancelled'), [filteredMeetings]);

  const getMeeting = (meetingId: string) => meetings.find(m => m.id === meetingId) ?? null;
  const getParticipants = (meetingId: string) => mockParticipants[meetingId] ?? [];
  const getChatMessages = (meetingId: string) => mockChatMessages[meetingId] ?? [];
  const getMeetingSummary = (meetingId: string) => mockMeetingSummaries[meetingId] ?? null;
  const getTeamMembers = () => mockTeamMembers;

  const createMeeting = (data: Partial<Meeting>) => {
    const now = new Date();
    const defaultStart = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const endDate = new Date(now.getTime() + 30 * 60000);
    const defaultEnd = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
    const newMeeting: Meeting = {
      id: `m${Date.now()}`,
      team_id: teamId ?? 'team-1',
      title: data.title ?? 'Untitled Meeting',
      description: data.description ?? '',
      meeting_type: data.meeting_type ?? 'daily_scrum',
      host_id: 'u1',
      host_name: 'Alex Chen',
      host_avatar: '',
      status: 'scheduled',
      date: data.date ?? today,
      start_time: data.start_time ?? defaultStart,
      end_time: data.end_time ?? defaultEnd,
      timezone: data.timezone ?? 'America/New_York',
      duration_minutes: data.duration_minutes ?? 30,
      agenda: data.agenda ?? [],
      participant_count: data.participant_count ?? 2,
      created_at: new Date().toISOString(),
    };
    setMeetings(prev => [newMeeting, ...prev]);
    return newMeeting;
  };

  const updateMeeting = (meetingId: string, data: Partial<Meeting>) => {
    setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, ...data } : m));
  };

  const deleteMeeting = (meetingId: string) => {
    setMeetings(prev => prev.filter(m => m.id !== meetingId));
  };

  return {
    meetings: filteredMeetings,
    upcoming,
    ongoing,
    completed,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy,
    getMeeting,
    getParticipants,
    getChatMessages,
    getMeetingSummary,
    getTeamMembers,
    createMeeting,
    updateMeeting,
    deleteMeeting,
  };
}