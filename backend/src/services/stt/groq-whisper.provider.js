import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Groq Whisper STT provider.
 * Calls the existing AI service at AI_SERVICE_URL for speech recognition.
 * 
 * Provider interface:
 *   transcribeAudio(audioBuffer, mimeType, metadata) → SpeechSegment[]
 */
export class GroqWhisperProvider {
  constructor() {
    this.aiServiceUrl = env.aiServiceUrl;
  }

  /**
   * Transcribe an audio buffer via the AI service's /api/v1/speech/recognize endpoint.
   * @param {Buffer} audioBuffer - Raw audio bytes
   * @param {string} mimeType - Audio MIME type (e.g. "audio/webm")
   * @param {object} metadata - { meetingId, participantId, participantName }
   * @returns {Promise<Array<{start: number, end: number, text: string}>>}
   */
  async transcribeAudio(audioBuffer, mimeType, { meetingId, participantId, participantName }) {
    const url = `${this.aiServiceUrl}/api/v1/speech/recognize`;

    // Build multipart form data
    const formData = new FormData();
    const ext = this._extForMime(mimeType);
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', blob, `audio.${ext}`);
    formData.append('meeting_id', meetingId);
    formData.append('participant_id', participantId);
    formData.append('participant_name', participantName);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`STT provider error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.segments || [];
  }

  _extForMime(mimeType) {
    const map = {
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
    };
    return map[mimeType] || 'webm';
  }
}
