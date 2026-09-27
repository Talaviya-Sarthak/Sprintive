import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../middleware/error.middleware.js';
import { meetingRepository } from '../../repositories/meeting.repository.js';
import { storageService } from '../storage/storage.service.js';

/**
 * AI Handoff Service — orchestrates the deterministic handoff from
 * the 14-stage preprocessed transcript pipeline to the AI Service.
 *
 * Pipeline flow:
 *   READY_FOR_AI
 *       ↓
 *   Retrieve Clean Transcript (Supabase Storage)
 *       ↓
 *   Validate Transcript (presence, encoding, non-empty, authorization)
 *       ↓
 *   Send to AI Service (Internal API with service-to-service auth & timeout)
 *       ↓
 *   Acknowledge & Record (idempotent, retryable on transient failures)
 */
export class AIHandoffService {
  constructor() {
    this.aiServiceUrl = env.aiServiceUrl;
    this.internalServiceKey = env.internalServiceKey;
    this.timeoutMs = env.aiServiceTimeoutMs || 10000;

    // Concurrency and idempotency tracking
    this.inFlightHandoffs = new Map();
    this.completedHandoffs = new Map();
  }

  /**
   * Execute the clean transcript handoff to the AI service.
   *
   * @param {string} meetingId - Meeting UUID
   * @returns {Promise<object>} AI service response acknowledgement
   */
  async handoffCleanTranscript(meetingId) {
    if (!meetingId) {
      throw new AppError('Meeting ID is required for AI handoff', 400, 'INVALID_MEETING_ID');
    }

    // ── Concurrency Idempotency Guard ──
    if (this.inFlightHandoffs.has(meetingId)) {
      logger.warn(`[AI_HANDOFF_DUPLICATE] meeting_id=${meetingId} handoff is currently in flight, reusing promise`);
      return this.inFlightHandoffs.get(meetingId);
    }

    const handoffPromise = this._executeHandoff(meetingId);
    this.inFlightHandoffs.set(meetingId, handoffPromise);

    try {
      const result = await handoffPromise;
      return result;
    } finally {
      this.inFlightHandoffs.delete(meetingId);
    }
  }

  async _executeHandoff(meetingId) {
    logger.info(`[AI_HANDOFF_STARTED] meeting_id=${meetingId}`);

    // 1. Verify meeting exists
    const meeting = await meetingRepository.findById(meetingId);
    if (!meeting) {
      logger.error(`[AI_HANDOFF_FAILED] meeting_id=${meetingId} error=MEETING_NOT_FOUND`);
      throw new AppError('Meeting not found', 404, 'MEETING_NOT_FOUND');
    }

    // 2. Verify transcript record exists
    const dbTranscript = await meetingRepository.getTranscript(meetingId);
    if (!dbTranscript) {
      logger.error(`[AI_HANDOFF_FAILED] meeting_id=${meetingId} error=TRANSCRIPT_NOT_FOUND`);
      throw new AppError('Transcript record not found for meeting', 404, 'TRANSCRIPT_NOT_FOUND');
    }

    // 3. Verify transcript status is READY_FOR_AI
    if (dbTranscript.status !== 'ready_for_ai') {
      logger.error(`[AI_HANDOFF_FAILED] meeting_id=${meetingId} status=${dbTranscript.status} error=TRANSCRIPT_NOT_READY`);
      throw new AppError(
        `Transcript is not ready for AI processing (current status: ${dbTranscript.status})`,
        409,
        'TRANSCRIPT_NOT_READY'
      );
    }

    // 4. Resolve cleaned transcript storage path (database is canonical source of truth)
    const cleanedPath = dbTranscript.cleaned_transcript_path || dbTranscript.storage_path;
    if (!cleanedPath) {
      logger.error(`[AI_HANDOFF_FAILED] meeting_id=${meetingId} error=CLEAN_TRANSCRIPT_PATH_MISSING`);
      throw new AppError('Cleaned transcript path missing from metadata', 422, 'CLEAN_TRANSCRIPT_PATH_MISSING');
    }

    // 5. Retrieve cleaned transcript from Supabase Storage
    let cleanContent;
    try {
      cleanContent = await storageService.getTranscript(cleanedPath);
    } catch (storageErr) {
      logger.error(`[AI_HANDOFF_FAILED] meeting_id=${meetingId} error=TRANSCRIPT_RETRIEVAL_FAILED details=${storageErr.message}`);
      throw new AppError(
        `Failed to retrieve cleaned transcript from storage: ${storageErr.message}`,
        502,
        'TRANSCRIPT_RETRIEVAL_FAILED'
      );
    }

    // 6. Validate transcript content
    if (typeof cleanContent !== 'string' || !cleanContent.trim()) {
      logger.error(`[AI_HANDOFF_FAILED] meeting_id=${meetingId} error=CLEAN_TRANSCRIPT_EMPTY`);
      throw new AppError('Cleaned transcript is empty or contains only whitespace', 422, 'CLEAN_TRANSCRIPT_EMPTY');
    }

    logger.info(`[AI_TRANSCRIPT_RETRIEVED] meeting_id=${meetingId} path=${cleanedPath} length=${cleanContent.length}`);

    // 7. Check if already acknowledged in memory
    if (this.completedHandoffs.has(meetingId)) {
      const cached = this.completedHandoffs.get(meetingId);
      logger.info(`[AI_HANDOFF_IDEMPOTENT] meeting_id=${meetingId} returning existing completion acknowledgement`);
      return { ...cached, idempotent: true };
    }

    // 8. Dispatch to AI Service with timeout & internal authentication
    const endpoint = `${this.aiServiceUrl}/api/v1/meetings/analyze`;
    logger.info(`[AI_REQUEST_SENT] meeting_id=${meetingId} target=${endpoint}`);

    const payload = {
      meeting_id: meetingId,
      transcript: cleanContent,
      language: 'en',
      transcript_version: '1.0',
      metadata: {
        title: meeting.title,
        team_id: meeting.team_id,
        duration_minutes: meeting.duration_minutes || dbTranscript.duration,
        cleaned_path: cleanedPath,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Key': this.internalServiceKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const status = response.status;
        const errorCode = status >= 500 ? 'AI_SERVICE_UNAVAILABLE' : 'AI_SERVICE_ERROR';
        logger.error(`[AI_HANDOFF_FAILED] meeting_id=${meetingId} status=${status} response=${errorText}`);
        throw new AppError(
          `AI service responded with status ${status}: ${errorText}`,
          status >= 500 ? 503 : status,
          errorCode
        );
      }

      const responseData = await response.json();
      logger.info(`[AI_HANDOFF_SUCCEEDED] meeting_id=${meetingId} status=${responseData.status} accepted=${responseData.accepted}`);

      this.completedHandoffs.set(meetingId, responseData);
      return responseData;

    } catch (err) {
      clearTimeout(timeoutId);

      const isAbort = err.name === 'AbortError' || err.code === 'ABORT_ERR';
      if (isAbort) {
        logger.error(`[AI_HANDOFF_FAILED] meeting_id=${meetingId} error=AI_SERVICE_TIMEOUT`);
        throw new AppError('AI service request timed out', 504, 'AI_SERVICE_TIMEOUT');
      }

      if (err instanceof AppError) {
        throw err;
      }

      logger.error(`[AI_HANDOFF_FAILED] meeting_id=${meetingId} error=AI_SERVICE_UNAVAILABLE details=${err.message}`);
      throw new AppError(`AI service communication failed: ${err.message}`, 503, 'AI_SERVICE_UNAVAILABLE');
    }
  }

  /**
   * Deterministic retry wrapper for transient AI handoff failures.
   *
   * @param {string} meetingId
   * @param {number} maxRetries
   * @returns {Promise<object>}
   */
  async handoffWithRetry(meetingId, maxRetries = 2) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await this.handoffCleanTranscript(meetingId);
      } catch (err) {
        attempt++;
        const isTransient =
          err.code === 'AI_SERVICE_TIMEOUT' ||
          err.code === 'AI_SERVICE_UNAVAILABLE' ||
          err.statusCode === 503 ||
          err.statusCode === 504;

        if (!isTransient || attempt > maxRetries) {
          throw err;
        }

        logger.warn(`[AI_HANDOFF_RETRY] meeting_id=${meetingId} attempt=${attempt}/${maxRetries} error=${err.code}`);
        await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
      }
    }
  }
}

export const aiHandoffService = new AIHandoffService();
