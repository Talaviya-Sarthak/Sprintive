import { useEffect, useRef, useCallback } from 'react';

interface UseAudioCaptureOptions {
  stream: MediaStream | null;
  enabled: boolean;
  onAudioChunk: (blob: Blob) => void;
  chunkIntervalMs?: number;
}

/**
 * Captures audio from a MediaStream and streams small chunks for real-time STT.
 *
 * Uses MediaRecorder with a 250ms timeslice to produce frequent, small audio chunks
 * suitable for streaming to Deepgram's WebSocket API.
 *
 * The chunks are raw WebM/Opus frames that Deepgram can consume directly.
 */
export function useAudioCapture({
  stream,
  enabled,
  onAudioChunk,
  chunkIntervalMs = 250,
}: UseAudioCaptureOptions) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const onChunkRef = useRef(onAudioChunk);
  onChunkRef.current = onAudioChunk;

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* already stopped */ }
    }
    recorderRef.current = null;

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!stream || !enabled) {
      stopRecording();
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('[audio-capture] No audio tracks in stream, skipping recording');
      return;
    }

    const audioStream = new MediaStream(audioTracks);
    audioStreamRef.current = audioStream;

    // Prefer Opus in WebM for Deepgram compatibility
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    const supportedMime = mimeTypes.find(t => MediaRecorder.isTypeSupported(t));

    if (!supportedMime) {
      console.warn('[audio-capture] No supported MIME type found for MediaRecorder');
      return;
    }

    try {
      const recorder = new MediaRecorder(audioStream, {
        mimeType: supportedMime,
        audioBitsPerSecond: 64000,
      });

      recorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          onChunkRef.current(event.data);
        }
      };

      recorder.onerror = () => {
        // Silently handle — will retry on next interval
      };

      recorder.onstop = () => {
        recorderRef.current = null;
      };

      // Use timeslice to get frequent small chunks for streaming
      recorder.start(chunkIntervalMs);
      recorderRef.current = recorder;
    } catch (err) {
      console.warn('[audio-capture] MediaRecorder not supported or failed to start:', err);
    }

    return () => {
      stopRecording();
    };
  }, [stream, enabled, chunkIntervalMs, stopRecording]);

  return { stopRecording };
}
