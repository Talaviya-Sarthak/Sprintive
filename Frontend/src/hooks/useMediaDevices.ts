import { useState, useEffect, useRef, useCallback } from 'react';

export function useMediaDevices() {
  const [stream, setStream]         = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted]       = useState(false);
  const [isCameraOff, setCamera]    = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  const isStoppedRef = useRef(false);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const stopAllTracks = useCallback((s: MediaStream | null) => {
    if (!s) return;
    s.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch { /* ignore */ }
    });
  }, []);

  const stopMedia = useCallback(() => {
    isStoppedRef.current = true;
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    if (streamRef.current) {
      stopAllTracks(streamRef.current);
      streamRef.current = null;
    }
    setStream(null);
  }, [stopAllTracks]);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      stopAllTracks(screenStreamRef.current);
      screenStreamRef.current = null;
    }
  }, [stopAllTracks]);

  useEffect(() => {
    mountedRef.current = true;
    isStoppedRef.current = false;
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    const acquireMedia = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mountedRef.current || isStoppedRef.current) {
          stopAllTracks(s);
          return;
        }
        s.getAudioTracks().forEach((t) => { t.enabled = true; });
        streamRef.current = s;
        setStream(s);
      } catch (err: any) {
        // Fallback: If camera is busy or unavailable, still acquire microphone
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          if (!mountedRef.current || isStoppedRef.current) {
            stopAllTracks(audioOnly);
            return;
          }
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
      mountedRef.current = false;
      // In dev StrictMode, React unmounts and immediately remounts.
      // We use a small timer: if component is remounted within 60ms, timer is cancelled.
      // On real unmount (user leaves meeting/navigates away), all tracks are stopped.
      cleanupTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) {
          isStoppedRef.current = true;
          if (streamRef.current) {
            stopAllTracks(streamRef.current);
            streamRef.current = null;
          }
          if (screenStreamRef.current) {
            stopAllTracks(screenStreamRef.current);
            screenStreamRef.current = null;
          }
        }
      }, 60);
    };
  }, [stopAllTracks]);

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

  return { stream, isMuted, isCameraOff, error, toggleMic, toggleCamera, startScreenShare, stopScreenShare, stopMedia };
}
