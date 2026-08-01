import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 800;

/**
 * SpeechRecognitionService — client for the AI service's Groq Whisper endpoint.
 *
 * Responsibilities:
 *  - Send one participant's audio to the AI service for transcription.
 *  - Retry transient failures (network, 5xx) with exponential backoff.
 *  - Return only recognized speech segments. No assembly, no analysis.
 */
export class SpeechRecognitionService {
  constructor({ baseUrl = env.aiServiceUrl } = {}) {
    this.baseUrl = baseUrl;
  }

  /**
   * @returns {string} Full endpoint URL.
   */
  endpoint() {
    const base = this.baseUrl.replace(/\/+$/, '');
    return `${base}/api/v1/speech/recognize`;
  }

  /**
   * Transcribe a single participant's audio.
   *
   * @param {object} opts
   * @param {string} opts.meetingId
   * @param {string} opts.participantId
   * @param {string} opts.participantName
   * @param {Buffer} opts.audio - Raw audio bytes
   * @param {string} [opts.mimeType]
   * @param {object} [opts.log] - Extra context for logs
   * @returns {Promise<Array<{start:number,end:number,text:string}>>}
   * @throws {Error} after exhausting retries
   */
  async transcribe({ meetingId, participantId, participantName, audio, mimeType = 'audio/webm', log = {} }) {
    const ctx = { meetingId, participantId, ...log };

    if (!audio || audio.byteLength === 0) {
      logger.warn('[speech] empty audio, skipping transcription', ctx);
      return [];
    }

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const segments = await this.#requestOnce({ meetingId, participantId, participantName, audio, mimeType });
        logger.info(`[speech] transcribed ${(audio.byteLength / 1024).toFixed(1)}KB audio (${segments.length} segments)`, ctx);
        return segments;
      } catch (err) {
        lastError = err;
        const retriable = this.#isRetriable(err);
        if (!retriable || attempt === MAX_ATTEMPTS) {
          logger.error(`[speech] transcription failed (attempt ${attempt}/${MAX_ATTEMPTS})`, ctx, err.message);
          throw err;
        }
        const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
        logger.warn(`[speech] retrying (attempt ${attempt}/${MAX_ATTEMPTS}) in ${delay}ms`, ctx, err.message);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw lastError ?? new Error('Transcription failed');
  }

  async #requestOnce({ meetingId, participantId, participantName, audio, mimeType }) {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mimeType }), 'recording');
    form.append('meeting_id', meetingId);
    form.append('participant_id', participantId);
    form.append('participant_name', participantName);

    let res;
    try {
      res = await fetch(this.endpoint(), { method: 'POST', body: form });
    } catch (cause) {
      const err = new Error(`AI service unreachable: ${cause.message}`);
      err.retriable = true;
      throw err;
    }

    const body = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(body); } catch { /* non-JSON body */ }

    if (!res.ok) {
      const err = new Error(`AI service responded ${res.status}: ${parsed?.detail ?? body.slice(0, 200)}`);
      err.retriable = res.status >= 500;
      throw err;
    }

    const segments = Array.isArray(parsed?.segments)
      ? parsed.segments
      : Array.isArray(parsed) ? parsed : [];
    return segments;
  }

  #isRetriable(err) {
    return err?.retriable === true;
  }
}

/** Singleton instance for the application. */
export const speechRecognitionService = new SpeechRecognitionService();
