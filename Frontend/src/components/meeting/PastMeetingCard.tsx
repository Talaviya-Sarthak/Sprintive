import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Meeting } from '../../types';
import { MeetingStatusBadge } from '../ui/Badge';

interface PastMeetingCardProps {
  meeting: Meeting;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function PastMeetingCard({ meeting }: PastMeetingCardProps) {
  const navigate = useNavigate();

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={() => navigate(meeting.status === 'ended' ? `/meetings/${meeting.id}/summary` : `/meetings/${meeting.id}`)}
      className="w-full text-left bg-[#111827] border border-white/8 rounded-2xl p-5 hover:border-white/16 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-[#475569] mb-1">{formatDate(meeting.date)}</p>
          <h4 className="text-base font-bold text-[#F8FAFC] group-hover:text-[#3B82F6] transition-colors">
            {meeting.title}
          </h4>
        </div>
        <MeetingStatusBadge status={meeting.status} />
      </div>
      <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
        <div className="flex items-center gap-1.5">
          <Clock size={13} />
          <span>{formatTime(meeting.start_time)} — {meeting.duration_minutes} min</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={13} />
          <span>{meeting.meeting_type.replace('_', ' ')}</span>
        </div>
      </div>
      {meeting.status === 'ended' && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[#3B82F6] font-medium">
          <CheckCircle size={12} />
          Summary available
        </div>
      )}
    </motion.button>
  );
}