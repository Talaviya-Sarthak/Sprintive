import { Calendar, Clock, MapPin, Users, Tag } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface MeetingInfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MeetingInfoItem({ icon, label, value }: MeetingInfoItemProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const cardBg = 'bg-[var(--app-surface-card)]';
  const cardBorder = 'border-[var(--app-border)]';
  const iconBg = 'bg-[var(--app-surface-subtle)]';
  const iconColor = 'text-[var(--app-text-secondary)]';
  const labelColor = 'text-[var(--app-text-muted)]';
  const valueColor = 'text-[var(--app-text-primary)]';

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl ${cardBg} border ${cardBorder}`}>
      <div className={`w-8 h-8 rounded-lg ${iconBg} border ${cardBorder} flex items-center justify-center ${iconColor} shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-mono ${labelColor} uppercase tracking-wider`}>{label}</p>
        <p className={`text-xs font-semibold ${valueColor} break-words mt-0.5`}>{value}</p>
      </div>
    </div>
  );
}

interface MeetingInfoProps {
  items: { icon: React.ReactNode; label: string; value: string }[];
}

export default function MeetingInfo({ items }: MeetingInfoProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <MeetingInfoItem key={i} {...item} />
      ))}
    </div>
  );
}

export function formatDateLong(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatTime12h(time: string) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${(m ?? 0).toString().padStart(2, '0')} ${ampm}`;
}

export function getMeetingInfoItems(meeting: {
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  duration_minutes: number;
  host_name?: string;
  meeting_type: string;
  participant_count: number;
  description?: string;
}) {
  return [
    { icon: <Calendar size={15} />, label: 'Date', value: formatDateLong(meeting.date) },
    { icon: <Clock size={15} />, label: 'Time', value: `${formatTime12h(meeting.start_time)} - ${formatTime12h(meeting.end_time)}` },
    { icon: <MapPin size={15} />, label: 'Timezone', value: meeting.timezone },
    { icon: <Clock size={15} />, label: 'Duration', value: `${meeting.duration_minutes} minutes` },
    { icon: <Users size={15} />, label: 'Participants', value: `${meeting.participant_count} people` },
    { icon: <Tag size={15} />, label: 'Meeting Type', value: meeting.meeting_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
  ];
}