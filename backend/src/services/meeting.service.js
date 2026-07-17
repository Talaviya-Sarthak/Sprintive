import { meetingRepository } from '../repositories/meeting.repository.js';
import { teamRepository }    from '../repositories/team.repository.js';
import { AppError }          from '../middleware/error.middleware.js';
import fs                    from 'fs';
import path                  from 'path';

const TRANSCRIPTS_DIR = path.resolve('storage/transcripts');

export const meetingService = {
  async createMeeting({ team_id, title, sprint_name, userId }) {
    const isMember = await teamRepository.isMember(team_id, userId);
    if (!isMember) throw new AppError('You are not a member of this team', 403);

    const meeting = await meetingRepository.create({ team_id, title, sprint_name, host_id: userId });
    return meeting;
  },

  async getMeeting(id) {
    const meeting = await meetingRepository.findById(id);
    if (!meeting) throw new AppError('Meeting not found', 404);
    return meeting;
  },

  async getTeamMeetings(team_id, userId) {
    const isMember = await teamRepository.isMember(team_id, userId);
    if (!isMember) throw new AppError('You are not a member of this team', 403);
    return meetingRepository.findByTeam(team_id);
  },

  async joinMeeting(meeting_id, userId) {
    const meeting = await meetingRepository.findById(meeting_id);
    if (!meeting) throw new AppError('Meeting not found', 404);
    if (meeting.status === 'ended') throw new AppError('Meeting has ended', 400);

    const role = meeting.host_id === userId ? 'host' : 'participant';
    const participant = await meetingRepository.addParticipant(meeting_id, userId, role);
    const participants = await meetingRepository.getParticipants(meeting_id);
    return { meeting, participant, participants };
  },

  async startMeeting(meeting_id, userId) {
    const meeting = await meetingRepository.findById(meeting_id);
    if (!meeting) throw new AppError('Meeting not found', 404);
    if (meeting.host_id !== userId) throw new AppError('Only the host can start the meeting', 403);
    if (meeting.status === 'active') throw new AppError('Meeting already started', 400);

    const updated = await meetingRepository.updateStatus(meeting_id, 'active', { started_at: new Date() });
    return { meeting: updated };
  },

  async endMeeting(meeting_id, userId) {
    const meeting = await meetingRepository.findById(meeting_id);
    if (!meeting) throw new AppError('Meeting not found', 404);
    if (meeting.host_id !== userId) throw new AppError('Only the host can end the meeting', 403);

    const updated = await meetingRepository.updateStatus(meeting_id, 'ended', { ended_at: new Date() });

    // Write transcript file
    fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
    const fileName = `${meeting_id}_${Date.now()}.txt`;
    const filePath = path.join(TRANSCRIPTS_DIR, fileName);
    const content  = `Transcript for meeting ${meeting_id}\nGenerated at: ${new Date().toISOString()}`;
    fs.writeFileSync(filePath, content, 'utf8');

    const transcript = await meetingRepository.saveTranscript({
      meeting_id,
      transcript_path: filePath,
      transcript_name: fileName,
      transcript_size: Buffer.byteLength(content, 'utf8'),
      duration:        null,
    });

    return { meeting: updated, transcript };
  },

  async leaveMeeting(meeting_id, userId) {
    await meetingRepository.removeParticipant(meeting_id, userId);
  },

  async getParticipants(meeting_id) {
    return meetingRepository.getParticipants(meeting_id);
  },

  async getTranscript(meeting_id) {
    const t = await meetingRepository.getTranscript(meeting_id);
    if (!t) throw new AppError('Transcript not found', 404);
    return t;
  },

  async saveChat({ meeting_id, user_id, message }) {
    return meetingRepository.saveChat({ meeting_id, user_id, message });
  },

  async getChats(meeting_id) {
    return meetingRepository.getChats(meeting_id);
  },
};
