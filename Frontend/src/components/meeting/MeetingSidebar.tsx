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
          className="border-l border-white/6 bg-[#0d1117] flex flex-col overflow-hidden flex-shrink-0"
        >
          <div className="flex border-b border-white/6">
            {(['participants', 'chat'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors relative ${
                  tab === t ? 'text-[#3B82F6]' : 'text-[#475569] hover:text-[#94A3B8]'
                }`}
              >
                {t === 'participants' ? `Participants (${participants.length})` : 'Chat'}
                {tab === t && (
                  <motion.div layoutId="sidebar-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3B82F6]" />
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