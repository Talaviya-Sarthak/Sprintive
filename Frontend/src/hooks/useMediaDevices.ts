import { useState, useEffect, useRef, useCallback } from 'react';

export function useMediaDevices() {
  const [stream, setStream]         = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted]       = useState(false);
  const [isCameraOff, setCamera]    = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((s) => { streamRef.current = s; setStream(s); })
      .catch((err) => {
        if (err.name === 'NotAllowedError') setError('Camera/mic permission denied. Please allow access in your browser settings.');
        else if (err.name === 'NotFoundError') setError('No camera or microphone found.');
        else if (err.name === 'NotReadableError') setError('Camera or microphone is in use by another app.');
        else setError('Camera/mic access denied: ' + err.message);
      });
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
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
      return await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch { return null; }
  }, []);

  return { stream, isMuted, isCameraOff, error, toggleMic, toggleCamera, startScreenShare };
}
