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
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${(m ?? 0).toString().padStart(2, '0')} ${ampm}`;
}

export default function PastMeetingCard({ meeting }: PastMeetingCardProps) {
  const navigate = useNavigate();

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={() => navigate(meeting.status === 'ended' ? `/meetings/${meeting.id}/summary` : `/meetings/${meeting.id}`)}
      className="w-full text-left border rounded-2xl p-5 transition-all group"
      style={{
        backgroundColor: 'var(--app-surface-card)',
        borderColor: 'var(--app-border)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--app-text-muted)' }}>{formatDate(meeting.date)}</p>
          <h4 className="text-base font-semibold group-hover:text-[#3B82F6] transition-colors" style={{ color: 'var(--app-text-primary)' }}>
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