import { meetingService }                                from '../services/meeting.service.js';
import { createMeetingSchema, updateMeetingSchema, sendMessageSchema } from '../validators/meeting.validator.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

export const meetingController = {
  async createMeeting(req, res, next) {
    try {
      const body    = createMeetingSchema.parse(req.body);
      const meeting = await meetingService.createMeeting({ ...body, userId: req.user.id });
      res.status(201).json({ success: true, data: meeting });
    } catch (err) { next(err); }
  },

  async getMeetings(req, res, next) {
    try {
      const { team_id } = req.query;
      if (!team_id) return sendError(res, { message: 'team_id is required', statusCode: HTTP_STATUS.BAD_REQUEST });

      const { search, status, meeting_type, sort_by, sort_order, page, limit } = req.query;
      const result = await meetingService.getTeamMeetings(team_id, req.user.id, { search, status, meeting_type, sort_by, sort_order, page, limit });
      res.json({ success: true, data: result.meetings, total: result.total });
    } catch (err) { next(err); }
  },

  async getMeeting(req, res, next) {
    try {
      const meeting = await meetingService.getMeeting(req.params.id);
      res.json({ success: true, data: meeting });
    } catch (err) { next(err); }
  },

  async updateMeeting(req, res, next) {
    try {
      const body = updateMeetingSchema.parse(req.body);
      const meeting = await meetingService.updateMeeting(req.params.id, req.user.id, body);
      res.json({ success: true, data: meeting });
    } catch (err) { next(err); }
  },

  async deleteMeeting(req, res, next) {
    try {
      await meetingService.deleteMeeting(req.params.id, req.user.id);
      res.json({ success: true, message: 'Meeting deleted' });
    } catch (err) { next(err); }
  },

  async getTeamMeetings(req, res, next) {
    try {
      const { teamId } = req.params;
      const { search, status, meeting_type, sort_by, sort_order, page, limit } = req.query;
      const result = await meetingService.getTeamMeetings(teamId, req.user.id, { search, status, meeting_type, sort_by, sort_order, page, limit });
      res.json({ success: true, data: result.meetings, total: result.total });
    } catch (err) { next(err); }
  },

  async leaveMeeting(req, res, next) {
    try {
      await meetingService.leaveMeeting(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (err) { next(err); }
  },

  async joinMeeting(req, res, next) {
    try {
      const result = await meetingService.joinMeeting(req.params.id, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async startMeeting(req, res, next) {
    try {
      const result = await meetingService.startMeeting(req.params.id, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async endMeeting(req, res, next) {
    try {
      const result = await meetingService.endMeeting(req.params.id, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async getTranscript(req, res, next) {
    try {
      const transcript = await meetingService.getTranscript(req.params.id);
      res.json({ success: true, data: transcript });
    } catch (err) { next(err); }
  },

  async getChats(req, res, next) {
    try {
      const chats = await meetingService.getChats(req.params.id);
      res.json({ success: true, data: chats });
    } catch (err) { next(err); }
  },

  async sendMessage(req, res, next) {
    try {
      const { message } = sendMessageSchema.parse(req.body);
      const chat = await meetingService.saveChat({ meeting_id: req.params.id, user_id: req.user.id, message });
      res.status(201).json({ success: true, data: chat });
    } catch (err) { next(err); }
  },

  async getSummary(req, res, next) {
    try {
      const summary = await meetingService.getSummary(req.params.id);
      res.json({ success: true, data: summary });
    } catch (err) { next(err); }
  },

  async getParticipants(req, res, next) {
    try {
      const participants = await meetingService.getParticipants(req.params.id);
      res.json({ success: true, data: participants });
    } catch (err) { next(err); }
  },

  async getTeamMembers(req, res, next) {
    try {
      const members = await meetingService.getTeamMembers(req.params.teamId);
      res.json({ success: true, data: members });
    } catch (err) { next(err); }
  },
};
