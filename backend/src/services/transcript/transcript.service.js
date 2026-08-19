import { sttService } from '../stt/stt.service.js';
import { storageService } from '../storage/storage.service.js';
import { meetingRepository } from '../../repositories/meeting.repository.js';
import { generateConversationFile } from './transcript.formatter.js';
import { logger } from '../../utils/logger.js';

/**
 * Transcript Service — coordinates STT finalization, dialogue formatting,
 * storage upload, and database persistence.
 *
 * Called during the meeting:end flow.
 */
class TranscriptService {
  /**
   * Finalize the transcript for a completed meeting.
   *
   * Steps:
   * 1. Finalize STT session → get ordered segments
   * 2. Format segments into dialogue transcript
   * 3. Upload transcript to object storage
   * 4. Save transcript reference to database
   * 5. Return transcript data
   *
   * @param {string} meetingId
   * @returns {Promise<{content: string, storagePath: string, storageSize: number} | null>}
   */
  async finalizeTranscript(meetingId) {
    logger.info(`[transcript] Finalizing transcript for meeting ${meetingId}`);

    // 1. Finalize STT session (flushes remaining audio buffers)
    const segments = await sttService.finalizeSession(meetingId);

    let content;
    if (segments.length === 0) {
      // No STT segments — fall back to empty transcript
      content = 'No dialogue was captured for this meeting.';
      logger.info(`[transcript] No STT segments for meeting ${meetingId}, using fallback`);
    } else {
      // 2. Format into dialogue transcript
      content = generateConversationFile(segments);
    }

    // 3. Upload to object storage
    let storageResult = null;
    try {
      storageResult = await storageService.uploadTranscript(meetingId, content);
      logger.info(`[TRANSCRIPT UPLOAD] meetingId=${meetingId} bucket=${storageResult.bucket} path=${storageResult.path} size=${storageResult.size} provider=${storageResult.provider}`);
    } catch (error) {
      logger.error(`[transcript] Storage upload failed for meeting ${meetingId}: ${error.message}`);
      // Continue — we still save the content in the database
    }

    // 4. Save transcript reference to database
    const transcript = await meetingRepository.saveTranscript({
      meeting_id: meetingId,
      content,
      transcript_path: storageResult?.path || null,
      transcript_name: storageResult ? `${meetingId}.txt` : null,
      transcript_size: Buffer.byteLength(content, 'utf8'),
      duration: null,
    });

    logger.info(`[transcript] Transcript saved for meeting ${meetingId} (id=${transcript.id})`);

    return {
      id: transcript.id,
      meeting_id: meetingId,
      content,
      storagePath: storageResult?.path || null,
      storageSize: storageResult?.size || 0,
      storageProvider: storageResult?.provider || null,
      storageBucket: storageResult?.bucket || null,
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
      if (dbTranscript.transcript_path) {
        try {
          const content = await storageService.getTranscript(dbTranscript.transcript_path);
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
