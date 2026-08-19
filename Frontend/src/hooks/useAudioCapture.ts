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
 * This format is compatible with Deepgram's streaming API with encoding=linear16.
 *
 * Falls back to MediaRecorder with WebM/Opus if Web Audio API is not available.
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
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const onChunkRef = useRef(onAudioChunk);
  onChunkRef.current = onAudioChunk;

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
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

    const TARGET_SAMPLE_RATE = 16000;
    const BUFFER_SIZE = 4096; // ScriptProcessorNode buffer size (must be power of 2)

    try {
      const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(audioStream);
      sourceRef.current = source;

      const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      // Calculate how many samples to accumulate before sending a chunk
      const samplesPerChunk = Math.floor(TARGET_SAMPLE_RATE * chunkIntervalMs / 1000);
      let sampleBuffer: Int16Array[] = [];
      let bufferedSamples = 0;

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);

        // The browser's actual sample rate may differ from our target
        // ScriptProcessorNode with AudioContext({sampleRate: 16000}) should give us 16kHz
        // but if the hardware doesn't support it, AudioContext will use the closest rate
        const actualSampleRate = audioContext.sampleRate;
        const resampleRatio = TARGET_SAMPLE_RATE / actualSampleRate;

        // Resample if needed (simple linear interpolation)
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

        // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
        const int16Chunk = new Int16Array(resampled.length);
        for (let i = 0; i < resampled.length; i++) {
          const s = Math.max(-1, Math.min(1, resampled[i]));
          int16Chunk[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        sampleBuffer.push(int16Chunk);
        bufferedSamples += int16Chunk.length;

        // When we have enough samples, send a chunk
        if (bufferedSamples >= samplesPerChunk) {
          // Concatenate all buffered samples
          const merged = new Int16Array(bufferedSamples);
          let offset = 0;
          for (const chunk of sampleBuffer) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }
          sampleBuffer = [];
          bufferedSamples = 0;

          // Create a Blob from the Int16Array (raw PCM)
          const blob = new Blob([merged.buffer], { type: 'audio/pcm' });
          onChunkRef.current(blob);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log(`[audio-capture] Started PCM capture: targetRate=${TARGET_SAMPLE_RATE} actualRate=${audioContext.sampleRate} bufferSize=${BUFFER_SIZE} chunkInterval=${chunkIntervalMs}ms`);
    } catch (err) {
      console.warn('[audio-capture] Web Audio API capture failed, falling back to MediaRecorder:', err);

      // Fallback to MediaRecorder with WebM/Opus
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
