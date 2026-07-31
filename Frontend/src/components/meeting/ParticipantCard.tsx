import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Participant } from '../../types';

interface Props {
  participant: Participant;
  isActive?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export default function ParticipantCard({ participant, isActive, videoRef }: Props) {
  const initials = participant.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);

  const bindVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (videoRef) {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
    } else {
      internalVideoRef.current = node;
    }
    if (node && participant.stream) {
      node.srcObject = participant.stream;
    }
  }, [participant.stream, videoRef]);

  useEffect(() => {
    const target = videoRef?.current ?? internalVideoRef.current;
    if (target && participant.stream) {
      target.srcObject = participant.stream;
    }
  }, [participant.stream, participant.isCameraOff, videoRef]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative rounded-2xl overflow-hidden bg-[#141417] border transition-all duration-300 aspect-video flex items-center justify-center ${
        isActive ? 'border-[#f4f4f5] shadow-md shadow-[#f4f4f5]/10' : 'border-[#27272a]'
      }`}
    >
      {/* Video */}
      {!participant.isCameraOff && participant.stream ? (
        <video
          ref={bindVideoRef}
          autoPlay
          playsInline
          muted={participant.id === 'local' || participant.role === 'host'}
          className="w-full h-full object-cover -scale-x-100"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#141417]">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-[#f4f4f5] font-semibold text-lg bg-[#1c1c21] border border-[#27272a]">
            {participant.avatar_url
              ? <img src={participant.avatar_url} alt={participant.full_name} className="w-full h-full rounded-full object-cover" />
              : initials}
          </div>
        </div>
      )}

      {/* Speaking ring */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-[#f4f4f5] pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3.5 py-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#f4f4f5] text-xs font-medium truncate max-w-[130px]">{participant.full_name}</span>
          {participant.role === 'host' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1c1c21] border border-[#27272a] text-[#f4f4f5] font-mono font-medium">Host</span>
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
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 23h8" />
              </svg>
            )}
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
      </div>

      {/* Speaking animation bars */}
      {isActive && (
        <div className="absolute top-3 right-3 flex items-end gap-0.5 h-4">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-1 bg-[#f4f4f5] rounded-full"
              animate={{ height: ['4px', '16px', '4px'] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
