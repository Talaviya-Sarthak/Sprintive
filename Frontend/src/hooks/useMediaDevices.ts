import { useState, useEffect, useRef } from 'react';

export function useMediaDevices() {
  const [stream, setStream]         = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted]       = useState(false);
  const [isCameraOff, setCamera]    = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((s) => { streamRef.current = s; setStream(s); })
      .catch(() => setError('Camera/mic access denied'));
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const toggleMic = () => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    setIsMuted((v) => !v);
  };

  const toggleCamera = () => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = isCameraOff; });
    setCamera((v) => !v);
  };

  const startScreenShare = async (): Promise<MediaStream | null> => {
    try {
      return await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch { return null; }
  };

  const stopMedia = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  };

  return { stream, isMuted, isCameraOff, error, toggleMic, toggleCamera, startScreenShare, stopMedia };
}
