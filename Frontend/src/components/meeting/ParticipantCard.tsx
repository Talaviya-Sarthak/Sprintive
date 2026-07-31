import { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Participant } from '../../types';

interface Props {
  participant: Participant;
  isActive?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export default function ParticipantCard({ participant, isActive, videoRef }: Props) {
  const initials = participant.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const internalRef = useRef<HTMLVideoElement | null>(null);
  const playedStreams = useRef<Set<string>>(new Set());
  const isLocal = !!videoRef;
  const showVideo = participant.isCameraOff !== true && (!!participant.stream || isLocal);

  const handleVideoRef = useCallback((el: HTMLVideoElement | null) => {
    internalRef.current = el;
    if (videoRef) (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
  }, [videoRef]);

  useEffect(() => {
    const el = videoRef?.current || internalRef.current;
    if (el && participant.stream) {
      if (el.srcObject !== participant.stream) {
        el.srcObject = participant.stream;
      }
      const sid = participant.stream.id;
      if (!playedStreams.current.has(sid)) {
        playedStreams.current.add(sid);
        el.play().catch(() => {});
      }
    }
  }, [participant.stream]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative rounded-2xl overflow-hidden bg-[#0d1117] border transition-all duration-300 aspect-video ${
        isActive ? 'border-[#3B82F6] shadow-[0_0_0_2px_rgba(59,130,246,0.4)]' : 'border-white/8'
      }`}
    >
      {/* Video: uses merged callback ref that handles both local and remote */}
      {participant.isCameraOff !== true && (participant.stream || videoRef) ? (
        <video
          ref={handleVideoRef}
          autoPlay
          playsInline
          muted={participant.role === 'host' || !!videoRef}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1f2e] to-[#0d1117]">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl bg-gradient-to-br from-[#3B82F6] to-[#06B6D4]">
            {participant.avatar_url
              ? <img src={participant.avatar_url} alt={participant.full_name} className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>
        </div>
      )}

      {/* Speaking ring */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-[#3B82F6] pointer-events-none"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-medium truncate max-w-[120px]">{participant.full_name}</span>
          {participant.role === 'host' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] font-semibold">Host</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mic status */}
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${participant.isMuted ? 'bg-red-500/20' : 'bg-white/10'}`}>
            {participant.isMuted ? (
              <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" /><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v3M8 23h8" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 23h8" />
              </svg>
            )}
          </div>
          {/* Network dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
        </div>
      </div>

      {/* Speaking animation bars */}
      {isActive && (
        <div className="absolute top-3 right-3 flex items-end gap-0.5 h-4">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-1 bg-[#3B82F6] rounded-full"
              animate={{ height: ['4px', '16px', '4px'] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
