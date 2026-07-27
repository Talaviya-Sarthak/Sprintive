import { Router }            from 'express';
import { meetingController } from '../controllers/meeting.controller.js';
import { requireAuth }       from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

router.post('/',                    meetingController.createMeeting);
router.get('/',                     meetingController.getMeetings);
router.get('/:id',                  meetingController.getMeeting);
router.post('/:id/join',            meetingController.joinMeeting);
router.post('/:id/leave',           meetingController.leaveMeeting);
router.post('/:id/start',           meetingController.startMeeting);
router.post('/:id/end',             meetingController.endMeeting);
router.get('/:id/transcript',       meetingController.getTranscript);
router.get('/:id/chats',            meetingController.getChats);

export default router;
