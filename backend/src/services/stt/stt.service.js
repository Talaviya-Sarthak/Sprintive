import { EventEmitter } from 'events';
import { deepgramProvider } from './deepgram.provider.js';
import { logger } from '../../utils/logger.js';

/**
 * STT Service — orchestrates live streaming speech-to-text for each meeting.
 *
 * Each participant gets their own Deepgram WebSocket session.
 * Audio chunks from the frontend are forwarded to Deepgram in real-time.
 * Partial results are emitted as stt:partial for live captions.
 * Final results are collected and stored for the transcript.
 *
 * Emits:
 *   'partial'  → { meetingId, participantId, speakerName, text, words, start, duration }
 *   'final'    → { meetingId, participantId, speakerName, text, words, start, duration }
 *   'segments' → { meetingId, segments: [...] }  (for backwards compat)
 *
 * Lifecycle:
 *   startSession(meetingId, participants[]) → creates Deepgram sessions
 *   processAudio(meetingId, participantId, audioBuffer) → forwards to Deepgram
 *   finalizeSession(meetingId) → closes sessions, returns all final segments
 *   abortSession(meetingId) → closes sessions without returning segments
 */
class STTService extends EventEmitter {
  constructor() {
    super();
    this.provider = deepgramProvider;

    // Map<meetingId, Map<participantId, { name, session, segments[] }>>
    this.meetings = new Map();

    this.finalizing = new Set();
  }

  /**
   * Initialize streaming STT sessions for a meeting.
   * Creates a Deepgram WebSocket session per participant.
   *
   * @param {string} meetingId
   * @param {Array<{ id: string, name: string }>} participants
   */
  startSession(meetingId, participants = []) {
    if (this.meetings.has(meetingId)) {
      logger.warn(`[stt] Session already exists for meeting ${meetingId}`);
      return;
    }

    const participantMap = new Map();

    for (const p of participants) {
      this._createParticipantSession(meetingId, participantMap, p.id, p.name);
    }

    this.meetings.set(meetingId, participantMap);
    logger.info(`[stt] Session started for meeting ${meetingId} with ${participants.length} participant(s)`);
  }

  /**
   * Ensure a session exists for a participant. Called lazily when audio arrives.
   */
  _ensureParticipantSession(meetingId, participantId, participantName) {
    let participantMap = this.meetings.get(meetingId);
    if (!participantMap) {
      participantMap = new Map();
      this.meetings.set(meetingId, participantMap);
    }

    let entry = participantMap.get(participantId);
    if (!entry) {
      this._createParticipantSession(meetingId, participantMap, participantId, participantName);
      entry = participantMap.get(participantId);
    } else if (!entry.session || entry.session._closed) {
      entry.name = participantName || entry.name;
      entry.session = this.provider.createSession({
        meetingId,
        participantId,
        participantName: entry.name,
      });
      this._bindSessionEvents(meetingId, participantId, entry);
      logger.info(`[stt] Re-created Deepgram session for returning participant ${entry.name} in meeting ${meetingId}`);
    }

    return entry;
  }

  _bindSessionEvents(meetingId, participantId, entry) {
    const session = entry.session;

    session.onPartial((result) => {
      this.emit('partial', {
        meetingId,
        participantId,
        speakerName: result.speakerName,
        text: result.text,
        words: result.words,
        start: result.start,
        duration: result.duration,
      });
    });

    session.onFinal((result) => {
      const segment = {
        speakerId: participantId,
        speakerName: result.speakerName,
        text: result.text,
        words: result.words,
        start: result.start,
        end: result.start + result.duration,
        duration: result.duration,
        timestamp: new Date(),
      };

      entry.segments.push(segment);

      logger.info(`[TRANSCRIPT ADD] meetingId=${meetingId} speakerName=${result.speakerName} speakerId=${participantId} text="${result.text}" start=${segment.start} end=${segment.end}`);

      this.emit('final', {
        meetingId,
        participantId,
        speakerName: result.speakerName,
        text: result.text,
        words: result.words,
        start: segment.start,
        end: segment.end,
      });

      this.emit('segments', { meetingId, segments: [segment] });
    });

    session.onError((err) => {
      logger.error(`[stt] Deepgram error for ${entry.name} in ${meetingId}: ${err.message}`);
    });

    session.onClose(() => {
      logger.debug(`[stt] Deepgram session closed for ${entry.name} in ${meetingId}`);
    });
  }

  _createParticipantSession(meetingId, participantMap, participantId, participantName) {
    const session = this.provider.createSession({
      meetingId,
      participantId,
      participantName,
    });

    const entry = { name: participantName, session, segments: [] };
    participantMap.set(participantId, entry);

    this._bindSessionEvents(meetingId, participantId, entry);

    logger.info(`[stt] Created Deepgram session for ${participantName} in meeting ${meetingId}`);
  }

  /**
   * Close a single participant's Deepgram WebSocket session when they leave the meeting.
   * Flushes remaining audio and closes connection, while keeping their accumulated
   * segments intact for the final meeting transcript.
   *
   * @param {string} meetingId
   * @param {string} participantId
   */
  async closeParticipantSession(meetingId, participantId) {
    const participantMap = this.meetings.get(meetingId);
    if (!participantMap) return;

    const entry = participantMap.get(participantId);
    if (!entry || !entry.session) return;

    logger.info(`[stt] Closing participant Deepgram session for ${entry.name || participantId} in meeting ${meetingId}`);
    try {
      await entry.session.close();
    } catch (err) {
      logger.error(`[stt] Error closing Deepgram session for participant ${participantId}: ${err.message}`);
    }
  }

  /**
   * Forward an audio chunk to the participant's Deepgram session.
   *
   * @param {string} meetingId
   * @param {string} participantId
   * @param {Buffer} audioBuffer - Raw audio data
   * @param {string} participantName - Display name (used if session is created lazily)
   */
  processAudio(meetingId, participantId, audioBuffer, participantName = 'Unknown') {
    if (!this.meetings.has(meetingId)) {
      logger.warn(`[stt] No session for meeting ${meetingId}, ignoring audio`);
      return;
    }

    const entry = this._ensureParticipantSession(meetingId, participantId, participantName);
    logger.debug(`[stt] Sending audio: meeting=${meetingId} participant=${participantName} size=${audioBuffer.length}`);
    entry.session.sendAudio(audioBuffer);
  }

  /**
   * Finalize all STT sessions for a meeting.
   * Closes Deepgram connections and returns all collected final segments.
   *
   * @param {string} meetingId
   * @returns {Promise<Array>} All final segments sorted chronologically
   */
  async finalizeSession(meetingId) {
    if (this.finalizing.has(meetingId)) {
      logger.warn(`[stt] Session ${meetingId} already finalizing`);
      return [];
    }

    this.finalizing.add(meetingId);

    const participantMap = this.meetings.get(meetingId);
    if (!participantMap) {
      this.finalizing.delete(meetingId);
      return [];
    }

    // Close all open Deepgram sessions (sends Finalize to flush remaining audio)
    const closePromises = [];
    for (const [, entry] of participantMap) {
      if (entry.session && !entry.session._closed) {
        closePromises.push(entry.session.close().catch(() => {}));
      }
    }
    await Promise.all(closePromises);

    // Collect all final segments
    const allSegments = [];
    for (const [, entry] of participantMap) {
      allSegments.push(...entry.segments);
    }

    // Sort chronologically by start time
    allSegments.sort((a, b) => a.start - b.start);

    logger.info(`[TRANSCRIPT FINALIZE] meetingId=${meetingId} totalSegments=${allSegments.length}`);
    for (const seg of allSegments) {
      logger.info(`[TRANSCRIPT SEGMENT] meetingId=${meetingId} speakerName=${seg.speakerName} speakerId=${seg.speakerId} text="${seg.text}" start=${seg.start} end=${seg.end}`);
    }

    // Clean up
    this.meetings.delete(meetingId);
    this.finalizing.delete(meetingId);

    logger.info(`[stt] Session finalized for meeting ${meetingId}: ${allSegments.length} total segment(s)`);
    return allSegments;
  }

  /**
   * Abort the STT session without returning segments.
   */
  abortSession(meetingId) {
    const participantMap = this.meetings.get(meetingId);
    if (participantMap) {
      for (const [, entry] of participantMap) {
        entry.session.close().catch(() => {});
      }
    }
    this.meetings.delete(meetingId);
    this.finalizing.delete(meetingId);
    logger.info(`[stt] Session aborted for meeting ${meetingId}`);
  }

  /**
   * Check if a meeting has an active STT session.
   */
  hasSession(meetingId) {
    return this.meetings.has(meetingId);
  }

  /**
   * Check if a meeting is currently finalizing.
   */
  isFinalizing(meetingId) {
    return this.finalizing.has(meetingId);
  }

  /**
   * Get the list of participant IDs for a meeting.
   */
  getParticipantIds(meetingId) {
    const participantMap = this.meetings.get(meetingId);
    if (!participantMap) return [];
    return Array.from(participantMap.keys());
  }
}

export const sttService = new STTService();
