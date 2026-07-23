import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users } from 'lucide-react';
import type { Meeting } from '../../types';
import { MeetingStatusBadge, MeetingTypeBadge } from '../ui/Badge';
import Button from '../ui/Button';

interface MeetingCardProps {
  meeting: Meeting;
  currentUserId: string;
  onEdit?: (meeting: Meeting) => void;
  onDelete?: (meeting: Meeting) => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const isOwner = (meeting: Meeting, userId: string) => meeting.host_id === userId;

export default function MeetingCard({ meeting, currentUserId, onEdit, onDelete }: MeetingCardProps) {
  const navigate = useNavigate();
  const owner = isOwner(meeting, currentUserId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group bg-[#111827] border border-white/8 rounded-2xl p-5 hover:border-white/16 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <MeetingTypeBadge type={meeting.meeting_type} />
            {meeting.sprint_name && (
              <span className="text-[11px] text-[#475569] font-medium">({meeting.sprint_name})</span>
            )}
          </div>
          <h3 className="text-base font-bold text-[#F8FAFC] truncate group-hover:text-[#3B82F6] transition-colors">
            {meeting.title}
          </h3>
          {meeting.description && (
            <p className="text-sm text-[#94A3B8] mt-1 line-clamp-2">{meeting.description}</p>
          )}
        </div>
        <MeetingStatusBadge status={meeting.status} size="md" />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs text-[#94A3B8]">
        <div className="flex items-center gap-1.5">
          <Calendar size={13} />
          <span>{formatDate(meeting.date)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={13} />
          <span>{formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={13} />
          <span>{meeting.duration_minutes} min</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={13} />
          <span>{meeting.participant_count} participants</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(meeting.host_name ?? 'Host')}
          </div>
          <div>
            <p className="text-sm font-medium text-[#F8FAFC]">{meeting.host_name}</p>
            <p className="text-[11px] text-[#475569]">Organizer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/meetings/${meeting.id}`)}
          >
            View Details
          </Button>
          {meeting.status === 'active' && (
            <Button
              variant="gradient"
              size="sm"
              onClick={() => navigate(`/meetings/${meeting.id}/live`)}
            >
              Join
            </Button>
          )}
          {owner && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit?.(meeting)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete?.(meeting)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}