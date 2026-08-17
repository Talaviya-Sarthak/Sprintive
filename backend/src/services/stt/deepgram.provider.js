import WebSocket from 'ws';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Deepgram streaming STT provider.
 *
 * Opens a WebSocket connection to Deepgram's live transcription endpoint
 * and streams audio chunks for real-time transcription with partial/final results.
 *
 * Provider interface:
 *   createSession({ meetingId, participantId, participantName }) → Session
 *   session.sendAudio(buffer)
 *   session.on('partial', callback)
 *   session.on('final', callback)
 *   session.close()
 */

const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen';
const KEEPALIVE_INTERVAL_MS = 5000;

export class DeepgramStreamingProvider {
  constructor() {
    this.apiKey = env.deepgramApiKey;
    this.model = env.deepgramModel || 'nova-3';
  }

  /**
   * Create a new streaming STT session for a participant.
   * Opens a WebSocket to Deepgram and returns a session object.
   *
   * @param {{ meetingId: string, participantId: string, participantName: string }} metadata
   * @returns {DeepgramSession}
   */
  createSession({ meetingId, participantId, participantName }) {
    return new DeepgramSession({
      apiKey: this.apiKey,
      model: this.model,
      meetingId,
      participantId,
      participantName,
    });
  }
}

class DeepgramSession {
  constructor({ apiKey, model, meetingId, participantId, participantName }) {
    this.meetingId = meetingId;
    this.participantId = participantId;
    this.participantName = participantName;
    this._partialCallbacks = [];
    this._finalCallbacks = [];
    this._errorCallbacks = [];
    this._openCallbacks = [];
    this._closeCallbacks = [];
    this._closed = false;
    this._keepaliveTimer = null;

    const params = new URLSearchParams({
      model,
      language: 'multi',
      interim_results: 'true',
      punctuate: 'true',
      smart_format: 'true',
      encoding: 'opus',
      sample_rate: '48000',
      channels: '1',
      endpointing: '300',
      utterance_end_ms: '1000',
      vad_events: 'true',
    });

    const url = `${DEEPGRAM_WS_URL}?${params.toString()}`;

    this.ws = new WebSocket(url, {
      headers: { Authorization: `Token ${apiKey}` },
    });

    this.ws.on('open', () => {
      logger.info(`[deepgram] Session opened: meeting=${meetingId} participant=${participantName}`);
      this._startKeepalive();
      for (const cb of this._openCallbacks) cb();
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this._handleMessage(msg);
      } catch (err) {
        logger.error(`[deepgram] Failed to parse message: ${err.message}`);
      }
    });

    this.ws.on('error', (err) => {
      logger.error(`[deepgram] WebSocket error for ${participantName}: ${err.message}`);
      for (const cb of this._errorCallbacks) cb(err);
    });

    this.ws.on('close', (code, reason) => {
      logger.info(`[deepgram] Session closed for ${participantName}: code=${code} reason=${reason}`);
      this._stopKeepalive();
      this._closed = true;
      for (const cb of this._closeCallbacks) cb(code, reason);
    });
  }

  _handleMessage(msg) {
    const type = msg.type;

    if (type === 'Results') {
      const alternative = msg.channel?.alternatives?.[0];
      if (!alternative) return;

      const transcript = alternative.transcript?.trim();
      if (!transcript) return;

      const isFinal = msg.is_final === true;
      const speechFinal = msg.speech_final === true;

      const result = {
        text: transcript,
        confidence: alternative.confidence || 0,
        words: alternative.words || [],
        start: msg.start || 0,
        duration: msg.duration || 0,
        isFinal,
        speechFinal,
        speakerName: this.participantName,
        participantId: this.participantId,
        meetingId: this.meetingId,
      };

      if (isFinal || speechFinal) {
        for (const cb of this._finalCallbacks) cb(result);
      } else {
        for (const cb of this._partialCallbacks) cb(result);
      }
    } else if (type === 'UtteranceEnd') {
      logger.debug(`[deepgram] UtteranceEnd for ${this.participantName}`);
    } else if (type === 'SpeechStarted') {
      logger.debug(`[deepgram] SpeechStarted for ${this.participantName}`);
    } else if (type === 'Metadata') {
      logger.debug(`[deepgram] Metadata for ${this.participantName}: model=${msg.model}`);
    }
  }

  _startKeepalive() {
    this._keepaliveTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
      }
    }, KEEPALIVE_INTERVAL_MS);
  }

  _stopKeepalive() {
    if (this._keepaliveTimer) {
      clearInterval(this._keepaliveTimer);
      this._keepaliveTimer = null;
    }
  }

  /**
   * Send an audio chunk to Deepgram for transcription.
   * @param {Buffer} audioBuffer - Raw audio data (opus encoded)
   */
  sendAudio(audioBuffer) {
    if (this._closed || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(audioBuffer);
  }

  /**
   * Register a callback for partial (interim) transcription results.
   * @param {(result: { text, confidence, words, start, duration, isFinal, speechFinal, speakerName, participantId, meetingId }) => void} cb
   */
  onPartial(cb) {
    this._partialCallbacks.push(cb);
  }

  /**
   * Register a callback for final transcription results.
   * @param {(result: { text, confidence, words, start, duration, isFinal, speechFinal, speakerName, participantId, meetingId }) => void} cb
   */
  onFinal(cb) {
    this._finalCallbacks.push(cb);
  }

  /**
   * Register a callback for errors.
   */
  onError(cb) {
    this._errorCallbacks.push(cb);
  }

  /**
   * Register a callback for when the WebSocket opens.
   */
  onOpen(cb) {
    this._openCallbacks.push(cb);
  }

  /**
   * Register a callback for when the WebSocket closes.
   */
  onClose(cb) {
    this._closeCallbacks.push(cb);
  }

  /**
   * Finalize and close the session.
   * Sends a Finalize message to flush remaining audio, then closes the WebSocket.
   */
  async close() {
    if (this._closed) return;
    this._stopKeepalive();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.ws.terminate();
        resolve();
      }, 3000);

      this.ws.once('close', () => {
        clearTimeout(timeout);
        resolve();
      });

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'Finalize' }));
      } else {
        this.ws.terminate();
      }
    });
  }

  get isOpen() {
    return !this._closed && this.ws.readyState === WebSocket.OPEN;
  }
}

export const deepgramProvider = new DeepgramStreamingProvider();
