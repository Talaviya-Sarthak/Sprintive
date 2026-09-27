import { meetingRepository } from '../repositories/meeting.repository.js';
import { teamRepository }    from '../repositories/team.repository.js';
import { transcriptService } from './transcript/transcript.service.js';
import { aiHandoffService }   from './ai/ai-handoff.service.js';
import { AppError }          from '../middleware/error.middleware.js';
import fs                    from 'fs';
import path                  from 'path';

const TRANSCRIPTS_DIR = path.resolve('storage/transcripts');

export const meetingService = {
  /**
   * Helper to verify meeting existence and user membership in the meeting's team.
   * Throws 404 if meeting doesn't exist, 403 if user is not on the team.
   */
  async assertMeetingAccess(meetingId, userId) {
    const meeting = await meetingRepository.findById(meetingId);
    if (!meeting) throw new AppError('Meeting not found', 404);
    const isMember = await teamRepository.isMember(meeting.team_id, userId);
    if (!isMember) throw new AppError('You are not authorized to access this meeting', 403);
    return meeting;
  },

  async createMeeting({ team_id, title, description, sprint_name, meeting_type, date, start_time, end_time, timezone, duration_minutes, agenda, userId }) {
    const isMember = await teamRepository.isMember(team_id, userId);
    if (!isMember) throw new AppError('You are not a member of this team', 403);

    let scheduled_start = null;
    let scheduled_end = null;

    if (date && start_time) {
      const offset = timezone ? getNumericTimezoneOffset(timezone, date) : '';
      scheduled_start = new Date(`${date}T${start_time}:00${offset}`);
      if (Number.isNaN(scheduled_start.getTime())) {
        throw new AppError('Invalid meeting start date or time.', 422);
      }
    }
    if (date && end_time) {
      const offset = timezone ? getNumericTimezoneOffset(timezone, date) : '';
      scheduled_end = new Date(`${date}T${end_time}:00${offset}`);
      if (Number.isNaN(scheduled_end.getTime())) {
        throw new AppError('Invalid meeting end date or time.', 422);
      }
    }

    if (!duration_minutes && scheduled_start && scheduled_end) {
      duration_minutes = Math.round((scheduled_end - scheduled_start) / 60000);
    }

    const meeting = await meetingRepository.create({
      team_id, title, description, sprint_name, meeting_type,
      host_id: userId,
      scheduled_start, scheduled_end, timezone, duration_minutes, agenda,
    });

    // Auto-add creator as participant
    await meetingRepository.addParticipant(meeting.id, userId, 'host');

    return this.transformMeeting(meeting);
  },

  async getMeeting(id, userId) {
    const meeting = await this.assertMeetingAccess(id, userId);
    return this.transformMeeting(meeting);
  },

  async getTeamMeetings(team_id, userId, filters = {}) {
    const isMember = await teamRepository.isMember(team_id, userId);
    if (!isMember) throw new AppError('You are not a member of this team', 403);

    const result = await meetingRepository.findByTeam(team_id, filters);
    return {
      meetings: result.meetings.map(m => this.transformMeeting(m)),
      total: result.total,
    };
  },

  async updateMeeting(meeting_id, userId, data) {
    const meeting = await this.assertMeetingAccess(meeting_id, userId);
    if (meeting.host_id !== userId) throw new AppError('Only the host can update the meeting', 403);

    const fields = {};

    if (data.title !== undefined) fields.title = data.title;
    if (data.description !== undefined) fields.description = data.description;
    if (data.sprint_name !== undefined) fields.sprint_name = data.sprint_name;
    if (data.meeting_type !== undefined) fields.meeting_type = data.meeting_type;
    if (data.timezone !== undefined) fields.timezone = data.timezone;
    if (data.duration_minutes !== undefined) fields.duration_minutes = data.duration_minutes;
    if (data.agenda !== undefined) fields.agenda = data.agenda;

    if (data.date && data.start_time) {
      const offset = data.timezone ? getNumericTimezoneOffset(data.timezone, data.date) : '';
      fields.scheduled_start = new Date(`${data.date}T${data.start_time}:00${offset}`);
      if (Number.isNaN(fields.scheduled_start.getTime())) {
        throw new AppError('Invalid meeting start date or time.', 422);
      }
    }
    if (data.date && data.end_time) {
      const offset = data.timezone ? getNumericTimezoneOffset(data.timezone, data.date) : '';
      fields.scheduled_end = new Date(`${data.date}T${data.end_time}:00${offset}`);
      if (Number.isNaN(fields.scheduled_end.getTime())) {
        throw new AppError('Invalid meeting end date or time.', 422);
      }
    }

    const updated = await meetingRepository.update(meeting_id, fields);
    if (!updated) throw new AppError('No changes applied', 400);
    return this.transformMeeting(updated);
  },

  async deleteMeeting(meeting_id, userId) {
    const meeting = await this.assertMeetingAccess(meeting_id, userId);
    if (meeting.host_id !== userId) throw new AppError('Only the host can delete the meeting', 403);

    await meetingRepository.remove(meeting_id);
  },

  async joinMeeting(meeting_id, userId) {
    const meeting = await this.assertMeetingAccess(meeting_id, userId);
    if (meeting.status === 'ended' || meeting.status === 'completed') throw new AppError('Meeting has ended', 400);

    if (meeting.status === 'scheduled' && meeting.scheduled_start) {
      const scheduledStart = new Date(meeting.scheduled_start);
      if (Date.now() < scheduledStart.getTime()) {
        throw new AppError('Meeting has not started yet', 400);
      }
    }

    await meetingRepository.addParticipant(meeting_id, userId, 'participant');
    const participants = await meetingRepository.getParticipants(meeting_id);
    return { meeting: this.transformMeeting(meeting), participants };
  },

  async startMeeting(meeting_id, userId) {
    const meeting = await this.assertMeetingAccess(meeting_id, userId);
    if (meeting.host_id !== userId) throw new AppError('Only the host can start the meeting', 403);
    if (meeting.status === 'active') throw new AppError('Meeting already started', 400);
    if (['ended', 'completed', 'cancelled'].includes(meeting.status)) {
      throw new AppError('Meeting has already ended', 400);
    }

    const updated = await meetingRepository.updateStatus(meeting_id, 'active', { started_at: new Date() });
    return { meeting: this.transformMeeting(updated) };
  },

  async endMeeting(meeting_id, userId) {
    const meeting = await this.assertMeetingAccess(meeting_id, userId);
    if (meeting.host_id !== userId) throw new AppError('Only the host can end the meeting', 403);

    // ACTIVE/SCHEDULED → COMPLETED. Atomic: only one caller can win the race
    const updated = await meetingRepository.markCompleted(meeting_id);
    if (!updated) {
      throw new AppError('Meeting has already ended', 400);
    }

    // Generate summary record
    const participants = await meetingRepository.getParticipants(meeting_id);
    const summary = await meetingRepository.upsertSummary({
      meeting_id,
      duration_minutes: meeting.duration_minutes || 0,
      attendance_count: participants.length,
      total_participants: participants.length,
      ai_summary: 'Meeting summary will be available once AI processing is complete.',
      action_items: [],
      tickets_generated: [],
    });

    return {
      meeting: this.transformMeeting(updated),
      summary,
    };
  },

  async leaveMeeting(meeting_id, userId) {
    await this.assertMeetingAccess(meeting_id, userId);
    await meetingRepository.removeParticipant(meeting_id, userId);
  },

  async getParticipants(meeting_id, userId) {
    await this.assertMeetingAccess(meeting_id, userId);
    return meetingRepository.getParticipants(meeting_id);
  },

  async getTranscript(meeting_id, userId) {
    await this.assertMeetingAccess(meeting_id, userId);
    const t = await transcriptService.getTranscript(meeting_id);
    if (!t) throw new AppError('Transcript not found', 404);
    return t;
  },

  async getSummary(meeting_id, userId) {
    const meeting = await this.assertMeetingAccess(meeting_id, userId);
    const summary = await meetingRepository.getSummary(meeting_id);
    if (!summary) {
      return {
        id: null,
        meeting_id,
        duration_minutes: meeting.duration_minutes || 0,
        attendance_count: 0,
        total_participants: 0,
        ai_summary: 'No summary available yet. The meeting summary will be generated after the meeting ends.',
        action_items: [],
        tickets_generated: [],
        created_at: new Date().toISOString(),
      };
    }
    return summary;
  },

  async saveChat({ meeting_id, user_id, message }) {
    await this.assertMeetingAccess(meeting_id, user_id);
    return meetingRepository.saveChat({ meeting_id, user_id, message });
  },

  async getChats(meeting_id, userId) {
    await this.assertMeetingAccess(meeting_id, userId);
    return meetingRepository.getChats(meeting_id);
  },

  async getTeamMembers(team_id, userId) {
    const isMember = await teamRepository.isMember(team_id, userId);
    if (!isMember) throw new AppError('You are not a member of this team', 403);
    return meetingRepository.getTeamMembers(team_id);
  },

  async retryTranscript(meeting_id, userId) {
    await this.assertMeetingAccess(meeting_id, userId);
    return transcriptService.retryPreprocessing(meeting_id);
  },

  async triggerAiHandoff(meeting_id, userId) {
    await this.assertMeetingAccess(meeting_id, userId);
    return aiHandoffService.handoffWithRetry(meeting_id);
  },

  // ── Helpers ──────────────────────────────────────────────────────────────────

  transformMeeting(m) {
    if (!m) return null;

    let date = '';
    let start_time = '';
    let end_time = '';
    const tz = m.timezone || 'UTC';

    if (m.scheduled_start) {
      const s = new Date(m.scheduled_start);
      try {
        const dateFormatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const timeFormatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        date = dateFormatter.format(s);
        start_time = timeFormatter.format(s);
      } catch {
        date = s.toISOString().split('T')[0];
        start_time = `${String(s.getUTCHours()).padStart(2, '0')}:${String(s.getUTCMinutes()).padStart(2, '0')}`;
      }
    }

    if (m.scheduled_end) {
      const e = new Date(m.scheduled_end);
      try {
        const timeFormatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        end_time = timeFormatter.format(e);
      } catch {
        end_time = `${String(e.getUTCHours()).padStart(2, '0')}:${String(e.getUTCMinutes()).padStart(2, '0')}`;
      }
    }

    return {
      id: m.id,
      team_id: m.team_id,
      team_name: m.team_name || '',
      title: m.title,
      description: m.description || '',
      sprint_name: m.sprint_name || '',
      meeting_type: m.meeting_type || 'daily_scrum',
      host_id: m.host_id,
      host_name: m.host_name || '',
      host_avatar: m.host_avatar || '',
      status: m.status,
      date,
      start_time,
      end_time,
      timezone: m.timezone || 'UTC',
      duration_minutes: m.duration_minutes || 0,
      agenda: Array.isArray(m.agenda) ? m.agenda : (typeof m.agenda === 'string' ? JSON.parse(m.agenda) : []),
      participant_count: parseInt(m.participant_count) || 0,
      started_at: m.started_at ? new Date(m.started_at).toISOString() : undefined,
      ended_at: m.ended_at ? new Date(m.ended_at).toISOString() : undefined,
      created_at: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(),
    };
  },
};

function getNumericTimezoneOffset(timezone, dateStr) {
  try {
    const refDate = dateStr ? new Date(dateStr + 'T12:00:00Z') : new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(refDate);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart) {
      const value = tzPart.value;
      if (!value || value === 'GMT' || value === 'UTC') return '+00:00';
      const normalized = value.replace(/^GMT/, '');
      const m = normalized.match(/^([+-])(\d{1,2}):?(\d{2})?$/);
      if (m) {
        const sign = m[1];
        const h = m[2].padStart(2, '0');
        const min = (m[3] || '00').padStart(2, '0');
        return `${sign}${h}:${min}`;
      }
    }
  } catch {
    // fallback
  }
  return '+00:00';
}
