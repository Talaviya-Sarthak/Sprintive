import { motion, AnimatePresence } from 'framer-motion';
import type { MeetingParticipant, ChatMessage } from '../../types';
import MeetingParticipants from './MeetingParticipants';
import MeetingChatPlaceholder from './MeetingChatPlaceholder';

interface MeetingSidebarProps {
  open: boolean;
  tab: 'participants' | 'chat';
  onTabChange: (tab: 'participants' | 'chat') => void;
  participants: MeetingParticipant[];
  chatMessages: ChatMessage[];
  currentUserId?: string;
}

export default function MeetingSidebar({ open, tab, onTabChange, participants, chatMessages, currentUserId }: MeetingSidebarProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="border-l border-[var(--app-border)] bg-[var(--app-surface-card)] flex flex-col overflow-hidden flex-shrink-0"
        >
          <div className="flex border-b border-[var(--app-border)]">
            {(['participants', 'chat'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors relative cursor-pointer ${
                  tab === t ? 'text-[var(--app-text-primary)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'
                }`}
              >
                {t === 'participants' ? `Participants (${participants.length})` : 'Chat'}
                {tab === t && (
                  <motion.div layoutId="sidebar-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--app-text-primary)]" />
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {tab === 'participants' && (
              <div className="h-full overflow-y-auto py-2">
                <MeetingParticipants participants={participants} currentUserId={currentUserId} />
              </div>
            )}
            {tab === 'chat' && (
              <div className="h-full">
                <MeetingChatPlaceholder messages={chatMessages} />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}