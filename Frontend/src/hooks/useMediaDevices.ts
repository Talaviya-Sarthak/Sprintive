import { useState, useEffect, useRef, useCallback } from 'react';

export function useMediaDevices() {
  const [stream, setStream]         = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted]       = useState(false);
  const [isCameraOff, setCamera]    = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const acquireMedia = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mountedRef.current) { s.getTracks().forEach((t) => t.stop()); return; }
        s.getAudioTracks().forEach((t) => { t.enabled = true; });
        streamRef.current = s;
        setStream(s);
      } catch (err: any) {
        // Fallback: If camera is busy or unavailable, still acquire microphone
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          if (!mountedRef.current) { audioOnly.getTracks().forEach((t) => t.stop()); return; }
          audioOnly.getAudioTracks().forEach((t) => { t.enabled = true; });
          streamRef.current = audioOnly;
          setStream(audioOnly);
          setCamera(true); // camera is off because only mic was acquired
          return;
        } catch { /* both failed */ }

        if (err.name === 'NotAllowedError') setError('Camera/mic permission denied. Please allow access in your browser settings.');
        else if (err.name === 'NotFoundError') setError('No camera or microphone found.');
        else if (err.name === 'NotReadableError') setError('Camera or microphone is in use by another app.');
        else setError('Camera/mic access denied: ' + err.message);
      }
    };
    acquireMedia();
    return () => {
      // Only stop tracks on real unmount (StrictMode phantom unmount must not kill the camera)
      mountedRef.current = false;
      if (import.meta.env.DEV) return;
      streamRef.current?.getTracks().forEach((t) => { t.stop(); });
    };
  }, []);

  const toggleMic = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCamera((prev) => {
      const next = !prev;
      streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  }, []);

  const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = s;
      return s;
    } catch { return null; }
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
  }, []);

  const stopMedia = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  };

  return { stream, isMuted, isCameraOff, error, toggleMic, toggleCamera, startScreenShare, stopScreenShare, stopMedia };
}
