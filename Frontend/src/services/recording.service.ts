import api from './api';
import type { AudioRecording } from '../types';
import type { CapturedRecording } from '../hooks/useParticipantRecording';

export interface UploadRecordingPayload {
  blob: Blob;
  mimeType: string;
  participantId: string;
  participantName: string;
  durationMs: number;
  startedAt?: number;
  endedAt?: number;
}

const MIME_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
};

function mimeExt(mimeType: string): string {
  return MIME_EXT[mimeType.toLowerCase()] ?? 'webm';
}

export const recordingService = {
  /**
   * Upload this participant's recording to the backend.
   * The backend persists it to object storage and triggers transcription.
   */
  async uploadRecording(meetingId: string, payload: UploadRecordingPayload): Promise<AudioRecording> {
    const form = new FormData();
    form.append(
      'file',
      new File([payload.blob], `recording.${mimeExt(payload.mimeType)}`, { type: payload.mimeType || 'audio/webm' })
    );
    form.append('duration_ms', String(Math.round(payload.durationMs)));
    if (payload.startedAt) form.append('started_at', new Date(payload.startedAt).toISOString());
    if (payload.endedAt) form.append('ended_at', new Date(payload.endedAt).toISOString());

    const { data } = await api.post(`/meetings/${meetingId}/recordings`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    });
    return data.data;
  },
};

/**
 * Stop the local recorder and submit the captured audio for processing.
 * Failures are logged and never throw, so the meeting end flow is not blocked.
 */
export async function submitLocalRecording(opts: {
  meetingId: string;
  captured: CapturedRecording;
  participantId: string;
  participantName: string;
}): Promise<void> {
  try {
    await recordingService.uploadRecording(opts.meetingId, {
      blob: opts.captured.blob,
      mimeType: opts.captured.mimeType,
      participantId: opts.participantId,
      participantName: opts.participantName,
      durationMs: opts.captured.durationMs,
      startedAt: opts.captured.startedAt,
      endedAt: opts.captured.endedAt,
    });
  } catch (err) {
    console.error('[recording] upload failed', err);
  }
}
