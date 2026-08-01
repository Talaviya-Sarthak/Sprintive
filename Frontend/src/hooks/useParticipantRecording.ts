import { useEffect, useRef, useCallback, useState } from 'react';

export interface CapturedRecording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  startedAt: number;
  endedAt: number;
}

function pickSupportedMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      // fall through to next candidate
    }
  }
  return null;
}

/**
 * Records the participant's local audio track into a Blob.
 *
 * Each participant records their own stream independently — the backend maps
 * socketId → participantId, so no speaker diarization is ever needed.
 *
 * `active` should be true only while the meeting is live, so recording starts
 * and stops automatically with the meeting lifecycle.
 */
export function useParticipantRecording(stream: MediaStream | null, active: boolean) {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const mimeRef = useRef<string>('audio/webm');

  useEffect(() => {
    if (!stream || !active) return;
    if (typeof MediaRecorder === 'undefined') return;

    const audioStream = new MediaStream(stream.getAudioTracks());
    if (audioStream.getAudioTracks().length === 0) return;

    const mime = pickSupportedMime();
    mimeRef.current = mime ?? 'audio/webm';

    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(audioStream, { mimeType: mime }) : new MediaRecorder(audioStream);
    } catch {
      recorder = new MediaRecorder(audioStream);
    }

    chunksRef.current = [];
    startedAtRef.current = Date.now();
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstart = () => setIsRecording(true);
    recorder.onstop = () => setIsRecording(false);
    recorder.start(1000);
    recorderRef.current = recorder;

    return () => {
      // Stop the recorder (releases the media stream) but KEEP recorderRef and
      // chunksRef intact so a late stopAndGetBlob() can still collect the audio.
      if (recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { /* already stopping */ }
      }
    };
  }, [stream, active]);

  /**
   * Stop the recorder and return the captured audio (or null if none).
   * Safe to call multiple times.
   */
  const stopAndGetBlob = useCallback(async (): Promise<CapturedRecording | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return null;

    if (recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const onStop = () => {
          recorder.removeEventListener('stop', onStop);
          resolve();
        };
        recorder.addEventListener('stop', onStop);
        try { recorder.stop(); } catch { resolve(); }
      });
    }

    const mimeType = (recorder.mimeType || mimeRef.current).split(';')[0];
    const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
    const startedAt = startedAtRef.current ?? Date.now();
    const endedAt = Date.now();

    recorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = null;

    if (blob.size === 0) return null;
    return { blob, mimeType: mimeType || 'audio/webm', durationMs: endedAt - startedAt, startedAt, endedAt };
  }, []);

  return { isRecording, stopAndGetBlob };
}
