import 'dotenv/config';
import { Worker } from 'bullmq';
import { createRedisConnection, sanitizeRedisUrl } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { meetingRepository } from '../repositories/meeting.repository.js';
import { processTranscriptJob, GroqRateLimitError } from '../services/transcript/transcript-job.processor.js';
import { TRANSCRIPT_QUEUE_NAME } from '../queues/transcript.queue.js';

logger.info('[worker:init] Initializing Sprintive Transcript Background Worker...');

if (!env.redisUrl) {
  logger.error('[worker:init] FATAL: REDIS_URL is not configured. Worker cannot start.');
  process.exit(1);
}

const workerRedisConnection = createRedisConnection({
  // Worker-specific connection settings
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * BullMQ Worker instance.
 *
 * Concurrency is strictly set to 1 to serialize transcript processing jobs across
 * Groq's 7,000 ITPM / 1,000 OTPM rate-limit window.
 */
export const transcriptWorker = new Worker(
  TRANSCRIPT_QUEUE_NAME,
  async (job) => {
    return processTranscriptJob(job);
  },
  {
    connection: workerRedisConnection,
    concurrency: 1, // Single job at a time to prevent Groq token-per-minute spikes
    limiter: {
      max: 1,
      duration: 2000, // Enforce minimum 2 seconds between job dispatches
    },
    lockDuration: 300000, // 5 minutes lock duration for lengthy LLM pipelines
    lockRenewTime: 60000, // Renew lock every 1 minute
  }
);

// Worker Lifecycle Events
transcriptWorker.on('active', (job) => {
  logger.info(`[worker:event] Job active: id=${job.id} meetingId=${job.data.meetingId} attempt=${job.attemptsMade + 1}`);
});

transcriptWorker.on('completed', (job, result) => {
  logger.info(`[worker:event] Job completed: id=${job.id} meetingId=${job.data.meetingId}`);
});

transcriptWorker.on('failed', async (job, err) => {
  if (!job) {
    logger.error(`[worker:event] Unknown job failed: ${err.message}`);
    return;
  }

  const { meetingId } = job.data;
  const isFinalAttempt = job.attemptsMade >= (job.opts?.attempts || 3);

  logger.warn(
    `[worker:event] Job failed: id=${job.id} meetingId=${meetingId} attempt=${job.attemptsMade}/${job.opts?.attempts || 3}. Reason: ${err.message}`
  );

  // If retries are completely exhausted, mark database record as 'failed'
  if (isFinalAttempt) {
    logger.error(`[worker:event] Job ${job.id} exhausted all retries. Marking transcript for ${meetingId} as failed in database.`);
    try {
      await meetingRepository.updateTranscriptStatus({
        meeting_id: meetingId,
        status: 'failed',
        error: `Transcript processing failed after ${job.attemptsMade} attempts: ${err.message}`,
      });
    } catch (dbErr) {
      logger.error(`[worker:event] Failed to record final failure in database for ${meetingId}: ${dbErr.message}`);
    }
  }
});

transcriptWorker.on('error', (err) => {
  logger.error(`[worker:event] Worker error: ${err.message}`);
});

transcriptWorker.on('stalled', (jobId) => {
  logger.warn(`[worker:event] Job stalled (recovered by lock manager): ${jobId}`);
});

// Graceful Shutdown Handling
let isShuttingDown = false;

async function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`[worker:shutdown] Received ${signal}. Starting graceful shutdown...`);

  try {
    // 1. Pause worker to stop picking up new jobs
    await transcriptWorker.pause(true);
    logger.info('[worker:shutdown] Paused worker from accepting new jobs.');

    // 2. Wait for currently active job to finish (up to 30s)
    await transcriptWorker.close();
    logger.info('[worker:shutdown] Worker closed successfully.');

    // 3. Close worker Redis connection
    await workerRedisConnection.quit();
    logger.info('[worker:shutdown] Redis connection closed.');

    logger.info('[worker:shutdown] Graceful shutdown complete. Exiting.');
    process.exit(0);
  } catch (err) {
    logger.error(`[worker:shutdown] Error during graceful shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

logger.info(`[worker:ready] Transcript Worker is listening for jobs on queue '${TRANSCRIPT_QUEUE_NAME}' with concurrency=1.`);
