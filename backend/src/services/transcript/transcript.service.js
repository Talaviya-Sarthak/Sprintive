import { sttService } from '../stt/stt.service.js';
import { storageService } from '../storage/storage.service.js';
import { meetingRepository } from '../../repositories/meeting.repository.js';
import { generateConversationFile } from './transcript.formatter.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import { logger } from '../../utils/logger.js';
import { aiHandoffService } from '../ai/ai-handoff.service.js';

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

    let content;
    if (segments.length === 0) {
      content = 'No dialogue was captured for this meeting.';
      logger.info(`[transcript] No STT segments for meeting ${meetingId}, using fallback`);
    } else {
      content = generateConversationFile(segments);
    }

    const rawPath = storageService.getRawPath(meetingId);

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

    // 4. Trigger preprocessing asynchronously (non-blocking for meeting-end flow)
    this.triggerPreprocessing(meetingId, content, storageResult?.path || rawPath)
      .catch((err) => {
        logger.error(`[transcript] Background preprocessing failed for ${meetingId}: ${err.message}`);
      });

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

    const serviceBaseUrl = (env.transcriptProcessingServiceUrl || 'http://localhost:8001').replace(/\/+$/, '');
    const url = `${serviceBaseUrl}/transcript/process`;

    try {
      const payload = {
        meeting_id: meetingId,
        raw_text: rawText || undefined,
        raw_transcript_path: rawTranscriptPath || storageService.getRawPath(meetingId),
        async_processing: false,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

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

      // Automatically trigger clean transcript handoff to AI service (non-blocking)
      aiHandoffService.handoffWithRetry(meetingId).catch((aiErr) => {
        logger.warn(`[transcript] Background AI handoff could not complete for meeting ${meetingId}: ${aiErr.message}`);
      });

      return result;
    } catch (err) {
      logger.error(`[transcript] Preprocessing failed for meeting ${meetingId}: ${err.message}`);

      // Record failure without deleting or corrupting the raw transcript
      await meetingRepository.updateTranscriptStatus({
        meeting_id: meetingId,
        status: 'failed',
        error: err.message,
      });

      throw err;
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

    return this.triggerPreprocessing(meetingId, rawText, rawPath);
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
