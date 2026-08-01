import { logger } from '../../utils/logger.js';
import { getStorageProvider } from '../storage/StorageService.js';
import { speechRecognitionService } from '../speech/SpeechRecognitionService.js';
import { recordingRepository } from '../../repositories/recording.repository.js';
import { speechSegmentRepository } from '../../repositories/speechSegment.repository.js';
import { meetingRepository } from '../../repositories/meeting.repository.js';

const MIME_EXT = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'application/octet-stream': 'webm',
};

function extFromMime(mime) {
  return MIME_EXT[(mime ?? '').toLowerCase()] ?? 'webm';
}

/**
 * MeetingEndService — orchestrates the speech-recognition pipeline.
 *
 * Flow (per meeting):
 *   Meeting ends → finalize recordings → upload to StorageProvider
 *   → Groq Whisper (via SpeechRecognitionService) → persist speech_segments.
 *
 * The pipeline is resilient:
 *  - Pending uploads that never arrived are marked 'missing'.
 *  - Transient AI/storage failures retry; permanent failures are recorded
 *    on the row (status='failed') and logged — never silently dropped.
 */
export class MeetingEndService {
  constructor({ storage = getStorageProvider(), speech = speechRecognitionService, recordingRepo = recordingRepository, segmentRepo = speechSegmentRepository, meetingRepo = meetingRepository } = {}) {
    this.storage = storage;
    this.speech = speech;
    this.recordingRepo = recordingRepo;
    this.segmentRepo = segmentRepo;
    this.meetingRepo = meetingRepo;
  }

  /**
   * Accept a participant recording upload: persist to storage and, if the
   * meeting has already ended, transcribe it immediately (late upload).
   *
   * @returns {Promise<object>} The stored participant_audio row.
   */
  async acceptUpload({ meetingId, participantId, participantName, buffer, mimeType, durationMs, startedAt, endedAt }) {
    const row = await this.recordingRepo.create({
      meeting_id: meetingId,
      participant_id: participantId,
      participant_name: participantName || participantId,
      mime_type: mimeType ?? null,
      size_bytes: buffer?.byteLength ?? null,
      duration_ms: durationMs ?? null,
      started_at: startedAt ? new Date(startedAt) : null,
      ended_at: endedAt ? new Date(endedAt) : null,
      status: 'pending',
    });

    const key = this.buildKey(meetingId, row.id, mimeType);

    try {
      await this.storage.upload(key, buffer, { contentType: mimeType ?? 'application/octet-stream' });
      await this.recordingRepo.markStored(row.id, {
        storage_key: key,
        mime_type: mimeType ?? null,
        size_bytes: buffer?.byteLength ?? null,
        duration_ms: durationMs ?? null,
      });
      logger.info(`[recording] stored ${key} for participant ${participantId}`);
    } catch (err) {
      await this.recordingRepo.updateStatus(row.id, 'failed', { error: err.message });
      logger.error('[recording] upload to storage failed', { meetingId, participantId, rowId: row.id }, err.message);
      throw err;
    }

    const stored = await this.recordingRepo.findById(row.id);

    // Late upload: meeting already completed → transcribe now.
    const meeting = await this.meetingRepo.findById(meetingId);
    if (meeting?.status === 'completed') {
      void this.processRecording(stored.id).catch((e) => {
        logger.error('[recording] late-upload transcription failed', { meetingId, audioId: stored.id }, e.message);
      });
    }

    return stored;
  }

  /**
   * Finalize a meeting: mark missing uploads, then transcribe every stored
   * recording. Called asynchronously after the meeting status changes.
   */
  async finalizeMeeting(meetingId) {
    const participants = await this.meetingRepo.getParticipants(meetingId);

    await this.recordingRepo.markPendingAsMissing(meetingId);
    await this.recordingRepo.createMissingForAbsentParticipants(meetingId, participants);

    const pending = await this.recordingRepo.findReadyForProcessing(meetingId);
    logger.info(`[pipeline] finalizing meeting ${meetingId}: ${pending.length} recording(s) to process`);

    const results = [];
    for (const audio of pending) {
      try {
        const res = await this.processRecording(audio.id);
        results.push({ audioId: audio.id, ok: true, ...res });
      } catch (err) {
        results.push({ audioId: audio.id, ok: false, error: err.message });
      }
    }

    const ok = results.filter((r) => r.ok).length;
    logger.info(`[pipeline] meeting ${meetingId} finalized: ${ok}/${results.length} recordings processed`);
    return results;
  }

  /**
   * Transcribe a single stored recording and persist its segments.
   * Safe to retry: prior segments are removed before re-inserting.
   */
  async processRecording(audioId) {
    const audio = await this.recordingRepo.findById(audioId);
    if (!audio) throw new Error(`Recording ${audioId} not found`);

    if (audio.status !== 'stored' && audio.status !== 'failed') {
      return { skipped: true, reason: `status=${audio.status}` };
    }
    if (!audio.storage_key) {
      // Never reached object storage (e.g. upload failure) — retrying is pointless.
      return { skipped: true, reason: 'missing storage key' };
    }

    await this.recordingRepo.updateStatus(audioId, 'processing');
    const ctx = { meetingId: audio.meeting_id, participantId: audio.participant_id, audioId };

    try {
      const buffer = await this.storage.download(audio.storage_key);
      if (!buffer || buffer.byteLength === 0) throw new Error('Downloaded audio is empty');

      const segments = await this.speech.transcribe({
        meetingId: audio.meeting_id,
        participantId: audio.participant_id,
        participantName: audio.participant_name,
        audio: buffer,
        mimeType: audio.mime_type ?? 'application/octet-stream',
        log: ctx,
      });

      // Retry safety: never leave stale segments behind.
      await this.segmentRepo.deleteByAudio(audioId);
      const inserted = await this.segmentRepo.bulkCreate({
        meeting_id: audio.meeting_id,
        participant_id: audio.participant_id,
        participant_name: audio.participant_name,
        audio_id: audioId,
        segments,
      });

      await this.recordingRepo.updateStatus(audioId, 'completed', { ended_at: new Date() });
      logger.info(`[pipeline] stored ${inserted} segment(s) for ${audio.participant_name}`, ctx);
      return { segments: inserted };
    } catch (err) {
      await this.recordingRepo.updateStatus(audioId, 'failed', { error: err.message });
      logger.error('[pipeline] transcription failed for recording', ctx, err.message);
      throw err;
    }
  }

  /**
   * Build a provider-agnostic object key.
   * Never a URL — only a key path inside the bucket.
   */
  buildKey(meetingId, audioId, mimeType) {
    return `meetings/${meetingId}/${audioId}.${extFromMime(mimeType)}`;
  }
}

/** Singleton wired to real dependencies. */
export const meetingEndService = new MeetingEndService();
