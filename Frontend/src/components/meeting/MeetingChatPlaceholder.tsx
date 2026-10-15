import { motion } from 'framer-motion';
import type { ChatMessage } from '../../types';

interface MeetingChatPlaceholderProps {
  messages: ChatMessage[];
}

function groupMessages(messages: ChatMessage[]) {
  const groups: ChatMessage[][] = [];
  messages.forEach((msg) => {
    const last = groups[groups.length - 1];
    if (last && last[0].user_id === msg.user_id) {
      last.push(msg);
    } else {
      groups.push([msg]);
    }
  });
  return groups;
}

export default function MeetingChatPlaceholder({ messages }: MeetingChatPlaceholderProps) {
  const groups = groupMessages(messages);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {groups.map((group, gi) => {
          const initials = (typeof group[0]?.full_name === 'string' ? group[0].full_name : '').split(' ').map((n) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?';
          return (
            <motion.div
              key={gi}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-1">
                {group[0].avatar_url
                  ? <img src={group[0].avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                  : initials}
              </div>
              <div className="flex flex-col gap-1 max-w-[80%]">
                <span className="text-[11px] text-[var(--app-text-muted)] font-medium px-1">{group[0].full_name}</span>
                {group.map((msg, mi) => (
                  <div key={mi} className="px-3 py-2 rounded-2xl text-sm leading-relaxed bg-[var(--app-surface-subtle)] text-[var(--app-text-primary)] border border-[var(--app-border)] rounded-tl-sm">
                    {msg.message}
                  </div>
                ))}
                <span className="text-[10px] text-[var(--app-text-muted)] px-1">
                  {new Date(group[group.length - 1].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="px-3 pb-3 pt-2 border-t border-[var(--app-border)]">
        <div className="flex items-center gap-2 bg-[var(--app-surface-subtle)] rounded-xl border border-[var(--app-border)] px-3 py-2">
          <input
            placeholder="Type a message..."
            disabled
            className="flex-1 bg-transparent text-sm text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] outline-none"
          />
          <button disabled className="w-7 h-7 rounded-lg bg-[var(--app-text-primary)]/50 text-[var(--app-bg)] flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}