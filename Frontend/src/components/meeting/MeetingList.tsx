import { AnimatePresence } from 'framer-motion';
import type { Meeting } from '../../types';
import MeetingCard from './MeetingCard';

interface MeetingListProps {
  meetings: Meeting[];
  currentUserId: string;
  onEdit?: (meeting: Meeting) => void;
  onDelete?: (meeting: Meeting) => void;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
}

export default function MeetingList({ meetings, currentUserId, onEdit, onDelete, emptyMessage, emptyAction }: MeetingListProps) {
  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3z" />
          </svg>
        </div>
        <p className="text-[#94A3B8] text-sm mb-3">{emptyMessage ?? 'No meetings found'}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-3">
        {meetings.map(meeting => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            currentUserId={currentUserId}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </AnimatePresence>
  );
}