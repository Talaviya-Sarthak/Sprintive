import { motion } from 'framer-motion';
import { Clock, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Meeting } from '../../types';
import { MeetingStatusBadge } from '../ui/Badge';

interface UpcomingMeetingCardProps {
  meeting: Meeting;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(time: string) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${(m ?? 0).toString().padStart(2, '0')} ${ampm}`;
}

export default function UpcomingMeetingCard({ meeting }: UpcomingMeetingCardProps) {
  const navigate = useNavigate();

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={() => navigate(`/meetings/${meeting.id}`)}
      className="w-full text-left bg-[var(--app-surface-card)] border border-[var(--app-border)] rounded-2xl p-5 hover:border-[var(--app-border-focus)] hover:bg-[var(--app-surface-hover)] shadow-xs transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            {formatDate(meeting.date)}
          </p>
          <h4 className="text-base font-bold text-[var(--app-text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {meeting.title}
          </h4>
        </div>
        <MeetingStatusBadge status={meeting.status} />
      </div>
      <div className="flex items-center gap-4 text-xs text-[var(--app-text-muted)]">
        <div className="flex items-center gap-1.5">
          <Clock size={13} />
          <span>{formatTime(meeting.start_time)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={13} />
          <span>{meeting.participant_count}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        View details <ArrowRight size={12} />
      </div>
    </motion.button>
  );
}