import { useEffect, useRef, useCallback } from 'react';

interface UseAudioCaptureOptions {
  stream: MediaStream | null;
  enabled: boolean;
  onAudioChunk: (blob: Blob) => void;
  chunkIntervalMs?: number;
}

/**
 * Captures audio from a MediaStream and streams raw PCM chunks for real-time STT.
 *
 * Uses the Web Audio API (AudioContext + ScriptProcessorNode) to capture raw audio,
 * downsample to 16kHz mono, and convert to 16-bit signed little-endian PCM (linear16).
 *
 * Format is compatible with Deepgram's streaming API with encoding=linear16, sample_rate=16000.
 */
export function useAudioCapture({
  stream,
  enabled,
  onAudioChunk,
  chunkIntervalMs = 250,
}: UseAudioCaptureOptions) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const onChunkRef = useRef(onAudioChunk);
  onChunkRef.current = onAudioChunk;

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch { /* ignore */ }
      processorRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch { /* ignore */ }
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch { /* ignore */ }
      audioContextRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch { /* already stopped */ }
    }
    recorderRef.current = null;
    // NOTE: We deliberately do NOT call track.stop() here because the microphone
    // track is owned and managed by useMediaDevices. Stopping it would permanently kill the mic!
  }, []);

  useEffect(() => {
    if (!stream || !enabled) {
      stopRecording();
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0 || !audioTracks[0].enabled) {
      console.warn('[audio-capture] No active/enabled audio tracks in stream, pausing capture');
      return;
    }

    const TARGET_SAMPLE_RATE = 16000;
    const BUFFER_SIZE = 4096; // ScriptProcessorNode buffer size (must be power of 2)

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx({ sampleRate: TARGET_SAMPLE_RATE });
      audioContextRef.current = audioContext;

      // Ensure AudioContext is resumed (browsers default to 'suspended' state without user gesture in frame)
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('[audio-capture] AudioContext resumed successfully, state:', audioContext.state);
        }).catch((err) => {
          console.warn('[audio-capture] Failed to resume AudioContext:', err);
        });
      }

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      // Calculate how many samples to accumulate before sending a chunk (~250ms)
      const samplesPerChunk = Math.floor(TARGET_SAMPLE_RATE * chunkIntervalMs / 1000);
      let sampleBuffer: Int16Array[] = [];
      let bufferedSamples = 0;

      processor.onaudioprocess = (event) => {
        // Ensure context isn't suspended
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);

        // Check if browser native sample rate differs from target 16kHz
        const actualSampleRate = audioContext.sampleRate;
        const resampleRatio = TARGET_SAMPLE_RATE / actualSampleRate;

        let resampled: Float32Array;
        if (Math.abs(actualSampleRate - TARGET_SAMPLE_RATE) > 1) {
          const outputLength = Math.floor(inputData.length * resampleRatio);
          resampled = new Float32Array(outputLength);
          for (let i = 0; i < outputLength; i++) {
            const srcIndex = i / resampleRatio;
            const srcIndexFloor = Math.floor(srcIndex);
            const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
            const fraction = srcIndex - srcIndexFloor;
            resampled[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction;
          }
        } else {
          resampled = new Float32Array(inputData);
        }

        // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767] (linear16 PCM)
        const int16Chunk = new Int16Array(resampled.length);
        for (let i = 0; i < resampled.length; i++) {
          const s = Math.max(-1, Math.min(1, resampled[i]));
          int16Chunk[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        sampleBuffer.push(int16Chunk);
        bufferedSamples += int16Chunk.length;

        // When enough samples accumulated, emit raw PCM chunk
        if (bufferedSamples >= samplesPerChunk) {
          const merged = new Int16Array(bufferedSamples);
          let offset = 0;
          for (const chunk of sampleBuffer) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }
          sampleBuffer = [];
          bufferedSamples = 0;

          // Create a Blob from the Int16Array (raw PCM 16kHz mono)
          const blob = new Blob([merged.buffer], { type: 'audio/pcm' });
          onChunkRef.current(blob);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log(`[audio-capture] Started PCM capture: targetRate=${TARGET_SAMPLE_RATE} actualRate=${audioContext.sampleRate} bufferSize=${BUFFER_SIZE} chunkInterval=${chunkIntervalMs}ms`);
    } catch (err) {
      console.warn('[audio-capture] Web Audio API capture failed, falling back to MediaRecorder:', err);

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
        const recorder = new MediaRecorder(stream, {
          mimeType: supportedMime,
          audioBitsPerSecond: 64000,
        });

        console.log(`[audio-capture] Starting MediaRecorder fallback: mime=${supportedMime}`);

        recorder.ondataavailable = async (event) => {
          if (event.data && event.data.size > 0) {
            onChunkRef.current(event.data);
          }
        };

        recorder.onerror = () => {};
        recorder.onstop = () => {
          recorderRef.current = null;
        };

        recorder.start(chunkIntervalMs);
        recorderRef.current = recorder;
      } catch (err2) {
        console.warn('[audio-capture] MediaRecorder not supported or failed to start:', err2);
      }
    }

    return () => {
      stopRecording();
    };
  }, [stream, enabled, chunkIntervalMs, stopRecording]);

  return { stopRecording };
}
