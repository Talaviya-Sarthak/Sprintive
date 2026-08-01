import { meetingEndService } from '../services/meeting/MeetingEndService.js';
import { meetingRepository } from '../repositories/meeting.repository.js';
import { sendError } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Handles per-participant audio recording uploads.
 * Uploads are accepted while a meeting is active OR shortly after it
 * completes (late uploads from clients that disconnected before the end).
 */
export const recordingController = {
  async uploadRecording(req, res, next) {
    try {
      const { meetingId } = req.params;
      const user = req.user;
      const file = req.file;

      if (!file || file.size === 0) {
        return sendError(res, {
          message: 'No audio file provided',
          statusCode: HTTP_STATUS.BAD_REQUEST,
        });
      }

      const meeting = await meetingRepository.findById(meetingId);
      if (!meeting) {
        return sendError(res, {
          message: 'Meeting not found',
          statusCode: HTTP_STATUS.NOT_FOUND,
        });
      }
      if (meeting.status === 'cancelled') {
        return sendError(res, {
          message: 'Meeting is cancelled; recordings are not accepted.',
          statusCode: HTTP_STATUS.BAD_REQUEST,
        });
      }

      const { duration_ms, started_at, ended_at } = req.body;

      const row = await meetingEndService.acceptUpload({
        meetingId,
        participantId: user.id,
        participantName: user.full_name || user.email || user.id,
        buffer: file.buffer,
        mimeType: file.mimetype || 'audio/webm',
        durationMs: duration_ms ? Number(duration_ms) : null,
        startedAt: started_at ? new Date(started_at) : null,
        endedAt: ended_at ? new Date(ended_at) : null,
      });

      res.status(HTTP_STATUS.CREATED).json({ success: true, data: row });
    } catch (err) {
      logger.error('[recording] upload handler failed', { meetingId: req.params.meetingId }, err.message);
      next(err);
    }
  },
};
