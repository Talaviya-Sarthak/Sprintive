import { motion } from 'framer-motion';
import type { Participant } from '../../types';

interface Props {
  participants: Participant[];
  currentUserId: string;
}

export default function ParticipantsList({ participants, currentUserId }: Props) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3 overflow-y-auto">
      {participants.map((p) => {
        const initials = p.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
        const isMe = p.user_id === currentUserId;
        return (
          <motion.div
            key={p.user_id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/4 transition-colors"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold">
                {p.avatar_url
                  ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                  : initials}
              </div>
              {p.isSpeaking && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#3B82F6] border-2 border-[#0d1117]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#F8FAFC] font-medium truncate">
                {p.full_name}{isMe && <span className="text-[#94A3B8] font-normal"> (you)</span>}
              </p>
              <p className="text-[11px] text-[#475569] capitalize">{p.role}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {p.isMuted && (
                <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                </svg>
              )}
              {p.isCameraOff && (
                <svg className="w-3.5 h-3.5 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3z" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
