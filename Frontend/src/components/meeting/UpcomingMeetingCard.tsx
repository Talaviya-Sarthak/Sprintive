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
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function UpcomingMeetingCard({ meeting }: UpcomingMeetingCardProps) {
  const navigate = useNavigate();

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={() => navigate(`/meetings/${meeting.id}`)}
      className="w-full text-left bg-[#111827] border border-white/8 rounded-2xl p-5 hover:border-[#3B82F6]/30 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-[#3B82F6] uppercase tracking-wider mb-1">
            {formatDate(meeting.date)}
          </p>
          <h4 className="text-base font-bold text-[#F8FAFC] group-hover:text-[#3B82F6] transition-colors">
            {meeting.title}
          </h4>
        </div>
        <MeetingStatusBadge status={meeting.status} />
      </div>
      <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
        <div className="flex items-center gap-1.5">
          <Clock size={13} />
          <span>{formatTime(meeting.start_time)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={13} />
          <span>{meeting.participant_count}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-[#3B82F6] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        View details <ArrowRight size={12} />
      </div>
    </motion.button>
  );
}