import { motion } from 'framer-motion';
import type { MeetingParticipant } from '../../types';
import { RoleBadge } from '../ui/Badge';

interface MeetingParticipantsProps {
  participants: MeetingParticipant[];
  currentUserId?: string;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function MeetingParticipants({ participants, currentUserId }: MeetingParticipantsProps) {
  return (
    <div className="space-y-1">
      {participants.map((p) => {
        const isMe = p.user_id === currentUserId;
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--app-surface-hover)] transition-colors border border-transparent hover:border-[var(--app-border)]"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold">
                {p.avatar_url
                  ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                  : getInitials(p.full_name)}
              </div>
              {p.is_speaking && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--app-surface-card)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--app-text-primary)] font-medium truncate">
                {p.full_name}{isMe && <span className="text-[var(--app-text-muted)] font-normal"> (you)</span>}
              </p>
              <p className="text-[11px] text-[var(--app-text-muted)]">
                {p.joined_at ? `Joined ${new Date(p.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Invited'}
              </p>
            </div>
            <RoleBadge role={p.role} />
          </motion.div>
        );
      })}
    </div>
  );
}