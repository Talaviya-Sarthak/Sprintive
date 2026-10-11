import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { meetingRepository } from '../../repositories/meeting.repository.js';
import { storageService } from '../storage/storage.service.js';
import { aiHandoffService } from '../ai/ai-handoff.service.js';
import { UnrecoverableError } from 'bullmq';

/**
 * Custom error class for Rate Limit (HTTP 429) conditions.
 */
export class GroqRateLimitError extends Error {
  constructor(message, retryAfterSeconds = 15) {
    super(message);
    this.name = 'GroqRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Process a single transcript-processing job popped by the Worker.
 *
 * @param {import('bullmq').Job} job - BullMQ Job instance
 * @returns {Promise<object>} Processing outcome
 */
export async function processTranscriptJob(job) {
  const { meetingId, rawTranscriptPath } = job.data;

  logger.info(`[worker:job] Starting transcript processing for meeting ${meetingId} (jobId=${job.id}, attempt=${job.attemptsMade + 1})`);

  // 1. Validation
  if (!meetingId) {
    throw new UnrecoverableError('Invalid job payload: missing meetingId');
  }

  // 2. Fetch transcript record from PostgreSQL
  const dbTranscript = await meetingRepository.getTranscript(meetingId);
  if (!dbTranscript) {
    throw new UnrecoverableError(`Transcript record not found in database for meeting ${meetingId}`);
  }

  // 3. Idempotency Check: if already ready_for_ai with cleaned_path, do not re-process
  if (dbTranscript.status === 'ready_for_ai' && dbTranscript.cleaned_transcript_path) {
    logger.info(`[worker:job] Meeting ${meetingId} is already in ready_for_ai status. Skipping duplicate work.`);
    return {
      status: 'already_completed',
      meetingId,
      cleanedTranscriptPath: dbTranscript.cleaned_transcript_path,
    };
  }

  // 4. Update database status to 'processing'
  await meetingRepository.updateTranscriptStatus({
    meeting_id: meetingId,
    status: 'processing',
    error: null,
  });

  await job.updateProgress(10);

  // 5. Invoke Python Transcript Processing Service (FastAPI)
  const serviceBaseUrl = (env.transcriptProcessingServiceUrl || 'http://localhost:8001').replace(/\/+$/, '');
  const url = `${serviceBaseUrl}/transcript/process`;

  const payload = {
    meeting_id: meetingId,
    raw_text: dbTranscript.content || undefined,
    raw_transcript_path: rawTranscriptPath || dbTranscript.raw_transcript_path || storageService.getRawPath(meetingId),
    async_processing: false,
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (netErr) {
    logger.error(`[worker:job] Network failure calling transcript service (${url}): ${netErr.message}`);
    // Transient network error -> throw standard error to trigger BullMQ exponential retry
    throw new Error(`Failed to reach transcript service: ${netErr.message}`);
  }

  // 6. Handle HTTP 429 Rate Limits from Groq / Transcript Service
  if (response.status === 429) {
    const errorBody = await response.text();
    const retryAfterHeader = response.headers.get('retry-after');
    let retryAfterSecs = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 15;

    // Check if error body specifies seconds
    const match = errorBody.match(/try again in (?:(\d+)m)?([0-9.]+)s/i);
    if (match) {
      const minutes = match[1] ? parseFloat(match[1]) : 0;
      const seconds = match[2] ? parseFloat(match[2]) : 0;
      retryAfterSecs = Math.ceil(minutes * 60 + seconds) + 2;
    }

    logger.warn(`[worker:job] Groq rate limit (429) detected for meeting ${meetingId}. Retry suggested in ${retryAfterSecs}s. Details: ${errorBody}`);

    // Update DB with informative transient status message
    await meetingRepository.updateTranscriptStatus({
      meeting_id: meetingId,
      status: 'processing',
      error: `Rate limit reached. Retrying automatically in ${retryAfterSecs}s...`,
    });

    throw new GroqRateLimitError(
      `Groq rate limit reached (HTTP 429). Retrying in ${retryAfterSecs}s.`,
      retryAfterSecs
    );
  }

  // 7. Handle Unrecoverable Errors (400, 404, 422)
  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`[worker:job] Transcript service returned HTTP ${response.status}: ${errorText}`);

    if ([400, 404, 422].includes(response.status)) {
      // Permanent failure (e.g., malformed meeting ID or empty transcript)
      await meetingRepository.updateTranscriptStatus({
        meeting_id: meetingId,
        status: 'failed',
        error: `Transcript processing unrecoverable error: ${errorText}`,
      });
      throw new UnrecoverableError(`Unrecoverable error (${response.status}): ${errorText}`);
    }

    // 500 / other errors -> retryable
    throw new Error(`Transcript service error (${response.status}): ${errorText}`);
  }

  // 8. Parse and validate successful result
  const result = await response.json();
  const cleanedPath = result.cleaned_transcript_path || storageService.getCleanedPath(meetingId);

  logger.info(`[worker:job] Transcript processing succeeded for meeting ${meetingId}: status=${result.processing_status}, cleaned_path=${cleanedPath}`);

  await job.updateProgress(80);

  // 9. Update PostgreSQL status to 'ready_for_ai'
  await meetingRepository.updateTranscriptStatus({
    meeting_id: meetingId,
    status: 'ready_for_ai',
    cleaned_transcript_path: cleanedPath,
    completed_at: new Date(),
    error: null,
  });

  await job.updateProgress(90);

  // 10. Automatically trigger AI Service handoff (non-blocking for worker completion)
  aiHandoffService.handoffWithRetry(meetingId).catch((aiErr) => {
    logger.warn(`[worker:job] Downstream AI handoff could not complete for meeting ${meetingId}: ${aiErr.message}`);
  });

  await job.updateProgress(100);

  return {
    success: true,
    meetingId,
    cleanedTranscriptPath: cleanedPath,
    durationMs: result.duration_ms,
    metrics: result.metrics,
  };
}
