import { meetingService }                          from '../services/meeting.service.js';
import { createMeetingSchema, joinMeetingSchema } from '../validators/meeting.validator.js';

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
      if (!team_id) return res.status(400).json({ success: false, message: 'team_id required' });
      const meetings = await meetingService.getTeamMeetings(team_id, req.user.id);
      res.json({ success: true, data: meetings });
    } catch (err) { next(err); }
  },

  async getMeeting(req, res, next) {
    try {
      const meeting = await meetingService.getMeeting(req.params.id);
      res.json({ success: true, data: meeting });
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
};
