import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, ArrowRight } from 'lucide-react';
import type { Meeting } from '../../types';
import { MeetingStatusBadge, MeetingTypeBadge } from '../ui/Badge';
import { AppCard, AppButton, AppBadge } from '../app-ui';

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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    <AppCard
      hoverable
      title={
        <div className="flex items-center gap-2">
          <MeetingTypeBadge type={meeting.meeting_type} />
          {meeting.sprint_name && (
            <span className="text-[10px] text-[#64748B] font-mono">{meeting.sprint_name}</span>
          )}
        </div>
      }
      action={<MeetingStatusBadge status={meeting.status} size="sm" />}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white text-[9px] font-bold shrink-0">
              {getInitials(meeting.host_name ?? 'Host')}
            </div>
            <span className="text-xs text-[#CBD5E1] font-medium">{meeting.host_name}</span>
          </div>

          <div className="flex items-center gap-1">
            {meeting.status === 'active' && (
              <AppButton
                variant="primary"
                size="xs"
                onClick={() => navigate(`/meetings/${meeting.id}/live`)}
              >
                Join Live
              </AppButton>
            )}
            <AppButton
              variant="secondary"
              size="xs"
              onClick={() => navigate(`/meetings/${meeting.id}`)}
            >
              <span>Details</span>
              <ArrowRight size={11} className="ml-1" />
            </AppButton>
            {owner && (
              <>
                <AppButton variant="ghost" size="xs" onClick={() => onEdit?.(meeting)}>
                  Edit
                </AppButton>
                <AppButton variant="danger" size="xs" onClick={() => onDelete?.(meeting)}>
                  Delete
                </AppButton>
              </>
            )}
          </div>
        </div>
      }
    >
      <div>
        <h3
          onClick={() => navigate(`/meetings/${meeting.id}`)}
          className="text-xs font-bold text-[#F8FAFC] truncate hover:text-[#F97316] transition-colors cursor-pointer"
        >
          {meeting.title}
        </h3>
        {meeting.description && (
          <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">{meeting.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[11px] text-[#64748B]">
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-[#F97316]" /> {formatDate(meeting.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} /> {meeting.participant_count}
          </span>
        </div>
      </div>
    </AppCard>
  );
}
