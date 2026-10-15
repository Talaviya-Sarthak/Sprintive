import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, ArrowRight } from 'lucide-react';
import type { Meeting, MeetingType } from '../../types';
import { MeetingStatusBadge, MeetingTypeBadge } from '../ui/Badge';
import { AppCard, AppButton } from '../app-ui';

interface MeetingCardProps {
  meeting: Meeting;
  currentUserId: string;
  onEdit?: (meeting: Meeting) => void;
  onDelete?: (meeting: Meeting) => void;
}

function getMeetingDateValue(meeting: Meeting) {
  return meeting.date ?? meeting.started_at ?? meeting.created_at;
}

function getMeetingStartValue(meeting: Meeting) {
  return meeting.start_time ?? meeting.started_at ?? meeting.created_at;
}

function getMeetingEndValue(meeting: Meeting) {
  return meeting.end_time ?? meeting.ended_at;
}

function formatDate(value?: string) {
  if (!value) return 'Date TBD';
  const d = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Date TBD';

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(value?: string) {
  if (!value) return null;

  if (value.includes('T')) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  const [h, m = 0] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${(m ?? 0).toString().padStart(2, '0')} ${ampm}`;
}

function formatTimeRange(meeting: Meeting) {
  const start = formatTime(getMeetingStartValue(meeting));
  const end = formatTime(getMeetingEndValue(meeting));
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  return 'Time TBD';
}

function getInitials(name?: any): string {
  if (!name || typeof name !== 'string') return '?';
  return name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?';
}

function isMeetingJoinable(meeting: Meeting): boolean {
  if (meeting.status === 'active') return true;
  if (meeting.status !== 'scheduled') return false;
  if (!meeting.date || !meeting.start_time) return false;
  const [y, m, d] = meeting.date.split('-').map(Number);
  const [h, min] = meeting.start_time.split(':').map(Number);
  if ([y, m, d, h, min].some(Number.isNaN)) return false;
  const scheduledStart = new Date(y, m - 1, d, h, min);
  return Date.now() >= scheduledStart.getTime();
}

const isOwner = (meeting: Meeting, userId: string) => meeting.host_id === userId;

export default function MeetingCard({ meeting, currentUserId, onEdit, onDelete }: MeetingCardProps) {
  const navigate = useNavigate();
  const owner = isOwner(meeting, currentUserId);
  const meetingType = (meeting.meeting_type ?? 'daily_scrum') as MeetingType;
  const hostName = meeting.host_name ?? 'Host';

  return (
    <AppCard
      variant="dashboard"
      hoverable
      title={
        <div className="flex items-center gap-2.5">
          <MeetingTypeBadge type={meetingType} />
          {meeting.sprint_name && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--app-text-muted)' }}>{meeting.sprint_name}</span>
          )}
        </div>
      }
      action={<MeetingStatusBadge status={meeting.status} size="sm" />}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0" style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}>
              {getInitials(hostName)}
            </div>
            <span className="text-xs font-medium truncate" style={{ color: 'var(--app-text-secondary)' }}>{hostName}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {meeting.status === 'active' && (
              <AppButton
                variant="mono"
                size="xs"
                onClick={() => navigate(`/meetings/${meeting.id}/lobby`)}
              >
                Join Live
              </AppButton>
            )}
            {meeting.status === 'scheduled' && isMeetingJoinable(meeting) && (
              <AppButton
                variant="mono"
                size="xs"
                onClick={() => navigate(`/meetings/${meeting.id}/lobby`)}
              >
                Join
              </AppButton>
            )}
            {meeting.status === 'scheduled' && !isMeetingJoinable(meeting) && (
              <span className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ color: 'var(--app-text-muted)' }}>
                Starts at {formatTime(meeting.start_time)}
              </span>
            )}
            <AppButton
              variant="mono-outline"
              size="xs"
              onClick={() => navigate(`/meetings/${meeting.id}`)}
            >
              <span>Details</span>
              <ArrowRight size={11} className="ml-1" />
            </AppButton>
            {owner && (
              <>
                <AppButton variant="mono-ghost" size="xs" onClick={() => onEdit?.(meeting)}>
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
          className="text-xs font-semibold truncate transition-colors cursor-pointer"
          style={{ color: 'var(--app-text-primary)' }}
        >
          {meeting.title}
        </h3>
        {meeting.description && (
          <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'var(--app-text-secondary)' }}>{meeting.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[11px]" style={{ color: 'var(--app-text-muted)' }}>
          <span className="flex items-center gap-1">
            <Calendar size={12} style={{ color: 'var(--app-text-secondary)' }} /> {formatDate(getMeetingDateValue(meeting))}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} style={{ color: 'var(--app-text-muted)' }} /> {formatTimeRange(meeting)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={12} style={{ color: 'var(--app-text-muted)' }} /> {meeting.participant_count ?? 0}
          </span>
        </div>
      </div>
    </AppCard>
  );
}
