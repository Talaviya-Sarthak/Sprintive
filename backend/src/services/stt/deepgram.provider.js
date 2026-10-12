import WebSocket from 'ws';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Deepgram streaming STT provider.
 *
 * Opens a WebSocket connection to Deepgram's live transcription endpoint
 * and streams audio chunks for real-time transcription with partial/final results.
 *
 * Audio format: Raw PCM 16-bit signed little-endian, 16kHz mono (linear16).
 * The frontend captures audio via Web Audio API and sends raw PCM buffers.
 *
 * Provider interface:
 *   createSession({ meetingId, participantId, participantName }) → Session
 *   session.sendAudio(buffer)
 *   session.on('partial', callback)
 *   session.on('final', callback)
 *   session.close()
 */

const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen';
const KEEPALIVE_INTERVAL_MS = 3000;
const AUDIO_BUFFER_MAX_MS = 2000; // Max buffer duration before dropping old audio

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
    this._audioBuffer = []; // Buffer audio until WebSocket opens
    this._isOpen = false;

    const params = new URLSearchParams({
      model,
      language: 'multi',
      interim_results: 'true',
      punctuate: 'true',
      smart_format: 'true',
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
      endpointing: '300',
      utterance_end_ms: '1000',
      vad_events: 'true',
    });

    const url = `${DEEPGRAM_WS_URL}?${params.toString()}`;

    this.ws = new WebSocket(url, {
      headers: { Authorization: `Token ${apiKey}` },
    });

    this.ws.on('unexpected-response', (req, res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        logger.error(`[deepgram] Unexpected handshake response for ${participantName}: status=${res.statusCode} body=${body}`);
      });
    });

    this.ws.on('open', () => {
      logger.info(`[deepgram] Session opened: meeting=${meetingId} participant=${participantName}`);
      this._isOpen = true;
      this._startKeepalive();
      this._flushAudioBuffer();
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
      this._isOpen = false;
      for (const cb of this._closeCallbacks) cb(code, reason);
    });
  }

  /**
   * Flush buffered audio chunks to Deepgram once the WebSocket is open.
   */
  _flushAudioBuffer() {
    if (this._audioBuffer.length === 0) return;
    logger.info(`[deepgram] Flushing ${this._audioBuffer.length} buffered audio chunks for ${this.participantName}`);
    for (const chunk of this._audioBuffer) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(chunk);
      }
    }
    this._audioBuffer = [];
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
        logger.info(`[STT FINAL] meetingId=${this.meetingId} participantId=${this.participantId} participantName=${this.participantName} text="${transcript}" start=${msg.start} duration=${msg.duration}`);
        for (const cb of this._finalCallbacks) cb(result);
      } else {
        logger.debug(`[STT PARTIAL] meetingId=${this.meetingId} participantId=${this.participantId} participantName=${this.participantName} text="${transcript}" start=${msg.start}`);
        for (const cb of this._partialCallbacks) cb(result);
      }
    } else if (type === 'UtteranceEnd') {
      logger.info(`[deepgram] UtteranceEnd for ${this.participantName}`);
    } else if (type === 'SpeechStarted') {
      logger.info(`[deepgram] SpeechStarted for ${this.participantName}`);
    } else if (type === 'SpeechEnded') {
      logger.info(`[deepgram] SpeechEnded for ${this.participantName}`);
    } else if (type === 'Metadata') {
      logger.debug(`[deepgram] Metadata for ${this.participantName}: model=${msg.model}`);
    } else {
      logger.debug(`[deepgram] Unknown message type=${type} for ${this.participantName}`);
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
   * If the WebSocket is not yet open, the audio is buffered and flushed on open.
   *
   * @param {Buffer} audioBuffer - Raw PCM audio data (16-bit signed LE, 16kHz mono)
   */
  sendAudio(audioBuffer) {
    if (this._closed) {
      logger.warn(`[deepgram] Cannot send audio: session closed participant=${this.participantName}`);
      return;
    }

    if (this._isOpen && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioBuffer);
    } else {
      // Buffer audio until WebSocket opens
      this._audioBuffer.push(audioBuffer);
      // Drop old audio if buffer grows too large (prevent memory leak)
      const maxChunks = Math.ceil(AUDIO_BUFFER_MAX_MS / 250); // ~250ms per chunk
      if (this._audioBuffer.length > maxChunks) {
        const dropped = this._audioBuffer.length - maxChunks;
        this._audioBuffer.splice(0, dropped);
        logger.warn(`[deepgram] Dropped ${dropped} buffered audio chunks for ${this.participantName} (buffer overflow)`);
      }
    }
  }

  /**
   * Register a callback for partial (interim) transcription results.
   */
  onPartial(cb) {
    this._partialCallbacks.push(cb);
  }

  /**
   * Register a callback for final transcription results.
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
   * Sends a Finalize message to flush remaining audio, waits for final results,
   * then closes the WebSocket.
   */
  async close() {
    if (this._closed) return;
    this._stopKeepalive();

    // Send Finalize to flush remaining audio in Deepgram's buffer
    if (this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'Finalize' }));
      } catch (err) {
        logger.warn(`[deepgram] Failed to send Finalize: ${err.message}`);
      }

      // Wait briefly (up to 1500ms) for Deepgram to send final results or initiate close
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 1500);
        this.ws.once('close', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }

    if (this._closed) return;
    this._closed = true;

    // Close the WebSocket connection cleanly
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        try { this.ws.terminate(); } catch (_) {}
        resolve();
      }, 1500);

      this.ws.once('close', () => {
        clearTimeout(timeout);
        resolve();
      });

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      } else {
        try { this.ws.terminate(); } catch (_) {}
        resolve();
      }
    });
  }

  get isOpen() {
    return !this._closed && this.ws.readyState === WebSocket.OPEN;
  }
}

export const deepgramProvider = new DeepgramStreamingProvider();
