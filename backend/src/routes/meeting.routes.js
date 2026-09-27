import { Router }            from 'express';
import { meetingController } from '../controllers/meeting.controller.js';
import { requireAuth }       from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

// Meeting CRUD
router.post('/',                    meetingController.createMeeting);
router.get('/',                     meetingController.getMeetings);
router.get('/:id',                  meetingController.getMeeting);
router.put('/:id',                  meetingController.updateMeeting);
router.delete('/:id',               meetingController.deleteMeeting);

// Meeting lifecycle
router.post('/:id/join',            meetingController.joinMeeting);
router.post('/:id/leave',           meetingController.leaveMeeting);
router.post('/:id/start',           meetingController.startMeeting);
router.post('/:id/end',             meetingController.endMeeting);

// Meeting data
router.get('/:id/participants',     meetingController.getParticipants);
router.get('/:id/transcript',       meetingController.getTranscript);
router.post('/:id/transcript/retry', meetingController.retryTranscript);
router.post('/:id/ai/handoff',        meetingController.triggerAiHandoff);
router.get('/:id/summary',          meetingController.getSummary);
router.get('/:id/chats',            meetingController.getChats);
router.post('/:id/messages',        meetingController.sendMessage);

export default router;
