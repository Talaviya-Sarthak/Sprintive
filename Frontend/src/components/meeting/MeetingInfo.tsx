import { Calendar, Clock, MapPin, Users, Tag } from 'lucide-react';

interface MeetingInfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MeetingInfoItem({ icon, label, value }: MeetingInfoItemProps) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#1c1c21] border border-[#27272a]">
      <div className="w-8 h-8 rounded-lg bg-[#141417] border border-[#27272a] flex items-center justify-center text-[#a1a1aa] shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider">{label}</p>
        <p className="text-xs font-semibold text-[#f4f4f5] break-words mt-0.5">{value}</p>
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
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
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