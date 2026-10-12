import { sttService } from '../stt/stt.service.js';
import { storageService } from '../storage/storage.service.js';
import { meetingRepository } from '../../repositories/meeting.repository.js';
import { generateConversationFile } from './transcript.formatter.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import { logger } from '../../utils/logger.js';
import { aiHandoffService } from '../ai/ai-handoff.service.js';
import { taskResolutionService } from '../task-resolution/task-resolution.service.js';
import { enqueueTranscriptProcessing } from '../../queues/transcript.queue.js';

/**
 * Transcript Service — coordinates STT finalization, dialogue formatting,
 * storage upload, database persistence, and preprocessing integration.
 *
 * Lifecycle:
 *   raw_stored → processing → ready_for_ai (or failed)
 */
class TranscriptService {
  /**
   * Finalize the transcript for a completed meeting.
   *
   * Steps:
   * 1. Finalize STT session → get ordered segments
   * 2. Format segments into dialogue transcript
   * 3. Upload raw transcript to canonical object storage: meetings/{meetingId}/raw/conversation.txt
   * 4. Save transcript reference to database (idempotent upsert, status: raw_stored)
   * 5. Trigger preprocessing pipeline (asynchronously to avoid blocking meeting end)
   * 6. Return transcript data
   *
   * @param {string} meetingId
   * @returns {Promise<{id: string, meeting_id: string, content: string, status: string, storagePath: string, raw_transcript_path: string} | null>}
   */
  async finalizeTranscript(meetingId) {
    logger.info(`[transcript] Finalizing transcript for meeting ${meetingId}`);

    // 1. Finalize STT session (flushes remaining audio buffers)
    const segments = await sttService.finalizeSession(meetingId);
    const rawPath = storageService.getRawPath(meetingId);

    // If no dialogue was captured, mark as empty/failed explicitly — NEVER fake a transcript
    if (segments.length === 0) {
      logger.warn(`[transcript] No STT segments captured for meeting ${meetingId}. Marking transcript as empty/failed explicitly.`);
      const transcript = await meetingRepository.saveTranscript({
        meeting_id: meetingId,
        content: '',
        transcript_path: rawPath,
        transcript_name: 'conversation.txt',
        transcript_size: 0,
        duration: null,
        status: 'failed',
        storage_provider: env.storageProvider,
        storage_bucket: env.supabaseBucket,
        storage_path: rawPath,
        raw_transcript_path: rawPath,
        cleaned_transcript_path: null,
        error: 'No speech detected or recorded for this meeting',
      });

      await meetingRepository.upsertSummary({
        meeting_id: meetingId,
        duration_minutes: 0,
        attendance_count: 0,
        total_participants: 0,
        ai_summary: 'No speech was detected during this meeting, so no summary or tasks could be generated.',
        action_items: [],
        tickets_generated: [],
      });

      return {
        id: transcript.id,
        meeting_id: meetingId,
        content: '',
        status: 'failed',
        error: 'No speech detected or recorded for this meeting',
        storagePath: rawPath,
        raw_transcript_path: rawPath,
      };
    }

    const content = generateConversationFile(segments);

    // 2. Upload raw transcript to object storage
    let storageResult = null;
    try {
      storageResult = await storageService.uploadTranscript(meetingId, content);
      logger.info(`[TRANSCRIPT UPLOAD] meetingId=${meetingId} bucket=${storageResult.bucket} path=${storageResult.path} size=${storageResult.size} provider=${storageResult.provider}`);
    } catch (error) {
      logger.error(`[transcript] Storage upload failed for meeting ${meetingId}: ${error.message}`);
      // Continue — we still save the content in the database with raw_stored status
    }

    // 3. Save transcript reference to database (idempotent upsert)
    const transcript = await meetingRepository.saveTranscript({
      meeting_id: meetingId,
      content,
      transcript_path: storageResult?.path || rawPath,
      transcript_name: 'conversation.txt',
      transcript_size: Buffer.byteLength(content, 'utf8'),
      duration: null,
      status: 'raw_stored',
      storage_provider: storageResult?.provider || env.storageProvider,
      storage_bucket: storageResult?.bucket || env.supabaseBucket,
      storage_path: storageResult?.path || rawPath,
      raw_transcript_path: storageResult?.path || rawPath,
      cleaned_transcript_path: null,
      error: null,
    });

    logger.info(`[transcript] Raw transcript saved for meeting ${meetingId} (id=${transcript.id}, status=raw_stored)`);

    // 4. Enqueue transcript processing job to BullMQ queue
    try {
      await enqueueTranscriptProcessing({
        meetingId,
        rawTranscriptPath: storageResult?.path || rawPath,
        isRetry: false,
      });
      logger.info(`[transcript] Enqueued transcript processing job for meeting ${meetingId}`);
    } catch (queueErr) {
      logger.warn(`[transcript] Queue enqueue failed (${queueErr.message}), falling back to direct trigger for ${meetingId}`);
      this.triggerPreprocessing(meetingId, content, storageResult?.path || rawPath).catch((err) => {
        logger.error(`[transcript] Fallback direct preprocessing failed for ${meetingId}: ${err.message}`);
      });
    }

    return {
      id: transcript.id,
      meeting_id: meetingId,
      content,
      status: 'raw_stored',
      storagePath: storageResult?.path || rawPath,
      raw_transcript_path: storageResult?.path || rawPath,
      storageSize: storageResult?.size || Buffer.byteLength(content, 'utf8'),
      storageProvider: storageResult?.provider || env.storageProvider,
      storageBucket: storageResult?.bucket || env.supabaseBucket,
    };
  }

  /**
   * Trigger the 14-stage transcript cleaning pipeline on the transcript-processing-service.
   *
   * @param {string} meetingId - Meeting UUID
   * @param {string|null} rawText - Optional raw transcript string
   * @param {string|null} rawTranscriptPath - Canonical storage path to raw transcript
   * @returns {Promise<object>} ProcessTranscriptResponse from FastAPI service
   */
  async triggerPreprocessing(meetingId, rawText = null, rawTranscriptPath = null) {
    logger.info(`[transcript] Triggering preprocessing for meeting ${meetingId}`);

    // Update DB status to 'processing'
    await meetingRepository.updateTranscriptStatus({
      meeting_id: meetingId,
      status: 'processing',
      error: null,
    });

    const rawServiceUrl = env.transcriptProcessingServiceUrl || 'http://127.0.0.1:8001';
    const serviceBaseUrl = rawServiceUrl.replace('localhost', '127.0.0.1').replace(/\/+$/, '');
    const url = `${serviceBaseUrl}/transcript/process`;

    try {
      const payload = {
        meeting_id: meetingId,
        raw_text: rawText || undefined,
        raw_transcript_path: rawTranscriptPath || storageService.getRawPath(meetingId),
        async_processing: false,
        run_ai_pipeline: true,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Preprocessing service returned status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      logger.info(`[transcript] Preprocessing succeeded for meeting ${meetingId}: status=${result.processing_status}, cleaned_path=${result.cleaned_transcript_path}`);

      // Update DB status to 'ready_for_ai'
      await meetingRepository.updateTranscriptStatus({
        meeting_id: meetingId,
        status: 'ready_for_ai',
        cleaned_transcript_path: result.cleaned_transcript_path || storageService.getCleanedPath(meetingId),
        completed_at: new Date(),
        error: null,
      });

      // If AI pipeline produced analysis or scrum tasks, persist them via Stage 3
      if (result.scrum_analysis?.tasks || result.meeting_analysis) {
        try {
          await taskResolutionService.resolveAndPersist({
            meetingId,
            scrumResult: result.scrum_analysis || { tasks: [] },
            aiSummary: result.meeting_analysis?.summary || null,
            actionItems: result.meeting_analysis?.action_items || [],
          });
          logger.info(`[transcript] Successfully resolved and persisted Stage 3 tasks for meeting ${meetingId}`);
        } catch (stage3Err) {
          logger.error(`[AI PIPELINE] stage=task-resolution status=failed error=${stage3Err.message}`);
          await meetingRepository.updateTranscriptStatus({
            meeting_id: meetingId,
            status: 'failed',
            error: `Task resolution failed: ${stage3Err.message}`,
          });
          throw stage3Err;
        }
      }

      return result;
    } catch (err) {
      let friendlyError = err.message;
      if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
        friendlyError = `Preprocessing service unreachable at ${url}. Ensure transcript-processing-service is running.`;
      }

      logger.error(`[transcript] Preprocessing failed for meeting ${meetingId}: ${friendlyError}`);

      // Record failure without deleting or corrupting the raw transcript
      await meetingRepository.updateTranscriptStatus({
        meeting_id: meetingId,
        status: 'failed',
        error: friendlyError,
      });

      throw new Error(friendlyError);
    }
  }

  /**
   * Retry preprocessing for a previously stored raw transcript.
   *
   * @param {string} meetingId
   * @returns {Promise<object>}
   */
  async retryPreprocessing(meetingId) {
    logger.info(`[transcript] Retrying preprocessing for meeting ${meetingId}`);
    const dbTranscript = await meetingRepository.getTranscript(meetingId);
    if (!dbTranscript) {
      throw new AppError('Transcript not found for meeting', 404);
    }

    let rawText = dbTranscript.content;
    const rawPath = dbTranscript.raw_transcript_path || dbTranscript.transcript_path || storageService.getRawPath(meetingId);

    if (!rawText && rawPath) {
      try {
        rawText = await storageService.getTranscript(rawPath);
      } catch (err) {
        logger.warn(`[transcript] Could not read raw transcript from storage during retry: ${err.message}`);
      }
    }

    if (!rawText || !rawText.trim()) {
      throw new AppError('No transcript audio/text was captured for this meeting; cannot retry AI processing.', 400);
    }

    // Reset DB status to raw_stored and clear past error for the retry
    await meetingRepository.updateTranscriptStatus({
      meeting_id: meetingId,
      status: 'raw_stored',
      error: null,
    });

    try {
      const queueResult = await enqueueTranscriptProcessing({
        meetingId,
        rawTranscriptPath: rawPath,
        isRetry: true,
      });

      return {
        success: true,
        message: 'Transcript preprocessing job re-enqueued successfully',
        meetingId,
        jobId: queueResult.jobId,
        status: 'raw_stored',
      };
    } catch (queueErr) {
      logger.warn(`[transcript] Queue unavailable during retry (${queueErr.message}), falling back to direct trigger`);
      return this.triggerPreprocessing(meetingId, rawText, rawPath);
    }
  }

  /**
   * Compute unified end-to-end processing status for a meeting.
   *
   * @param {string} meetingId
   * @returns {Promise<object>}
   */
  async getProcessingStatus(meetingId) {
    const meeting = await meetingRepository.findById(meetingId);
    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    const transcript = await meetingRepository.getTranscript(meetingId);
    const summary = await meetingRepository.getSummary(meetingId);
    const isFinalizingStt = sttService.isFinalizing(meetingId);

    // Compute meeting status
    const isMeetingEnded = ['ended', 'completed', 'cancelled'].includes(meeting.status);
    let meetingStatus = isMeetingEnded ? 'ended' : (isFinalizingStt ? 'ending' : (meeting.status === 'active' ? 'live' : 'scheduled'));

    // Compute transcript status
    let transcriptStatus = 'recording';
    if (isFinalizingStt) {
      transcriptStatus = 'finalizing';
    } else if (transcript) {
      if (transcript.status === 'failed') transcriptStatus = 'failed';
      else if (transcript.status === 'ready_for_ai') transcriptStatus = 'ready';
      else if (transcript.status === 'processing') transcriptStatus = 'preprocessing';
      else if (transcript.status === 'raw_stored') transcriptStatus = 'raw_stored';
      else transcriptStatus = transcript.status;
    } else if (isMeetingEnded) {
      transcriptStatus = 'finalizing';
    }

    // Compute AI status
    const hasTickets = Array.isArray(summary?.tickets_generated) && summary.tickets_generated.length > 0;
    const hasCompletedAiSummary = summary?.ai_summary &&
      !summary.ai_summary.includes('once AI processing is complete') &&
      !summary.ai_summary.includes('No summary available yet') &&
      !summary.ai_summary.includes('No speech was detected');

    let aiStatus = 'pending';
    if (transcriptStatus === 'failed') {
      aiStatus = 'failed';
    } else if (hasTickets || (hasCompletedAiSummary && transcriptStatus === 'ready')) {
      aiStatus = 'completed';
    } else if (transcriptStatus === 'ready') {
      aiStatus = 'resolving_tasks';
    } else if (transcriptStatus === 'preprocessing') {
      aiStatus = 'analyzing';
    }

    // Current stage for UI stepper
    let currentStage = 'pending';
    if (transcriptStatus === 'failed') {
      currentStage = 'failed';
    } else if (aiStatus === 'completed') {
      currentStage = 'completed';
    } else if (transcriptStatus === 'finalizing') {
      currentStage = 'finalizing_transcript';
    } else if (transcriptStatus === 'raw_stored') {
      currentStage = 'saving_transcript';
    } else if (transcriptStatus === 'preprocessing') {
      currentStage = 'cleaning_transcript';
    } else if (aiStatus === 'analyzing') {
      currentStage = 'analyzing_meeting';
    } else if (aiStatus === 'resolving_tasks') {
      currentStage = 'resolving_tasks';
    }

    const isProcessing = isMeetingEnded && transcriptStatus !== 'failed' && aiStatus !== 'completed';

    return {
      meeting_id: meetingId,
      meeting_status: meetingStatus,
      transcript_status: transcriptStatus,
      ai_status: aiStatus,
      current_stage: currentStage,
      is_processing: isProcessing,
      error: transcript?.error || null,
      tickets_count: summary?.tickets_generated?.length || 0,
      has_summary: Boolean(hasCompletedAiSummary),
    };
  }

  /**
   * Get the transcript for a meeting.
   * First checks the database, then falls back to storage if needed.
   */
  async getTranscript(meetingId) {
    const dbTranscript = await meetingRepository.getTranscript(meetingId);
    if (dbTranscript) {
      // If we have content in DB, return it directly
      if (dbTranscript.content) {
        return dbTranscript;
      }
      // If we have a storage path, fetch from storage
      const fetchPath = dbTranscript.cleaned_transcript_path || dbTranscript.raw_transcript_path || dbTranscript.transcript_path;
      if (fetchPath) {
        try {
          const content = await storageService.getTranscript(fetchPath);
          return { ...dbTranscript, content };
        } catch (error) {
          logger.error(`[transcript] Failed to fetch from storage: ${error.message}`);
        }
      }
    }
    return dbTranscript;
  }
}

export const transcriptService = new TranscriptService();
