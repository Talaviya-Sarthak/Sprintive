import { Router } from 'express';
import multer from 'multer';
import { recordingController } from '../controllers/recording.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Per-participant audio uploads (in-memory; forwarded to object storage).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per recording
});

router.use(requireAuth);

// POST /api/meetings/:meetingId/recordings
router.post('/:meetingId/recordings', upload.single('file'), recordingController.uploadRecording);

export default router;
