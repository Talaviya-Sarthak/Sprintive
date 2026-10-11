import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const TRANSCRIPT_QUEUE_NAME = 'transcript-processing';

let _transcriptQueue = null;
let _queueRedisConnection = null;

/**
 * Get or initialize the BullMQ Transcript Queue.
 *
 * @returns {Queue}
 */
export function getTranscriptQueue() {
  if (_transcriptQueue) {
    return _transcriptQueue;
  }

  if (!env.redisUrl) {
    logger.warn('[queue] REDIS_URL not configured. Transcript queue is disabled.');
    return null;
  }

  try {
    _queueRedisConnection = createRedisConnection();

    _transcriptQueue = new Queue(TRANSCRIPT_QUEUE_NAME, {
      connection: _queueRedisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10s initial delay (10s, 20s, 40s...)
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 3600, // 24 hours
        },
        removeOnFail: {
          count: 500,
          age: 7 * 24 * 3600, // 7 days
        },
      },
    });

    _transcriptQueue.on('error', (err) => {
      logger.error(`[queue:${TRANSCRIPT_QUEUE_NAME}] Queue error: ${err.message}`);
    });

    logger.info(`[queue] Initialized BullMQ queue: ${TRANSCRIPT_QUEUE_NAME}`);
    return _transcriptQueue;
  } catch (err) {
    logger.error(`[queue] Failed to initialize queue ${TRANSCRIPT_QUEUE_NAME}: ${err.message}`);
    return null;
  }
}

/**
 * Enqueue a transcript for background processing.
 *
 * @param {object} params
 * @param {string} params.meetingId - Meeting UUID
 * @param {string} [params.rawTranscriptPath] - Canonical object storage path
 * @param {boolean} [params.isRetry] - Whether this is an explicit user retry
 * @returns {Promise<{jobId: string, enqueued: boolean, status: string}>}
 */
export async function enqueueTranscriptProcessing({
  meetingId,
  rawTranscriptPath = null,
  isRetry = false,
}) {
  if (!meetingId) {
    throw new Error('meetingId is required to enqueue transcript processing');
  }

  const queue = getTranscriptQueue();
  if (!queue) {
    throw new Error('Transcript queue is unavailable. Verify that REDIS_URL is configured.');
  }

  const defaultJobId = `transcript-${meetingId}`;

  // If this is an explicit retry, remove any existing failed or completed job record
  // so BullMQ does not block the new execution under duplicate-ID protection.
  if (isRetry) {
    try {
      const existingJob = await queue.getJob(defaultJobId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state === 'failed' || state === 'completed') {
          await existingJob.remove();
          logger.info(`[queue] Removed previous ${state} job ${defaultJobId} for retry`);
        }
      }
    } catch (cleanupErr) {
      logger.warn(`[queue] Could not remove old job ${defaultJobId} during retry: ${cleanupErr.message}`);
    }
  }

  const jobId = isRetry ? `transcript-${meetingId}-${Date.now()}` : defaultJobId;

  try {
    const job = await queue.add(
      'process-transcript',
      {
        meetingId,
        rawTranscriptPath,
        enqueuedAt: new Date().toISOString(),
        isRetry,
      },
      {
        jobId,
      }
    );

    logger.info(`[queue] Enqueued transcript job: jobId=${job.id} meetingId=${meetingId} isRetry=${isRetry}`);

    return {
      jobId: job.id,
      enqueued: true,
      status: 'queued',
    };
  } catch (err) {
    logger.error(`[queue] Failed to enqueue transcript for meeting ${meetingId}: ${err.message}`);
    throw err;
  }
}

/**
 * Get job status and state for a meeting transcript.
 *
 * @param {string} meetingId
 * @returns {Promise<{state: string, progress: number, attemptsMade: number, failedReason: string}|null>}
 */
export async function getTranscriptJobState(meetingId) {
  const queue = getTranscriptQueue();
  if (!queue) return null;

  try {
    const job = await queue.getJob(`transcript-${meetingId}`);
    if (!job) return null;

    const state = await job.getState();
    return {
      id: job.id,
      state,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
    };
  } catch (err) {
    logger.warn(`[queue] Failed to get job state for ${meetingId}: ${err.message}`);
    return null;
  }
}

/**
 * Gracefully close the queue connection.
 */
export async function closeTranscriptQueue() {
  if (_transcriptQueue) {
    try {
      await _transcriptQueue.close();
      logger.info(`[queue] Closed queue: ${TRANSCRIPT_QUEUE_NAME}`);
    } catch (err) {
      logger.warn(`[queue] Error closing queue: ${err.message}`);
    } finally {
      _transcriptQueue = null;
    }
  }

  if (_queueRedisConnection) {
    try {
      await _queueRedisConnection.quit();
    } catch (err) {
      logger.warn(`[queue] Error closing queue Redis connection: ${err.message}`);
    } finally {
      _queueRedisConnection = null;
    }
  }
}
