import type { MeetingStatus, MeetingType } from '../../types';

const statusStyles: Record<MeetingStatus, string> = {
  scheduled: 'bg-[#F59E0B]/12 text-[#F59E0B] border-[#F59E0B]/25',
  active: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
  ended: 'bg-[#64748B]/15 text-[#CBD5E1] border-[#64748B]/25',
  cancelled: 'bg-red-500/12 text-red-400 border-red-500/25',
};

const statusLabels: Record<MeetingStatus, string> = {
  scheduled: 'Scheduled',
  active: 'Live',
  ended: 'Completed',
  cancelled: 'Cancelled',
};

const typeLabels: Record<MeetingType, string> = {
  daily_scrum: 'Daily Scrum',
  sprint_planning: 'Sprint Planning',
  review: 'Sprint Review',
  retrospective: 'Retrospective',
  custom: 'Custom',
};

interface StatusBadgeProps {
  status: MeetingStatus;
  size?: 'sm' | 'md';
}

export function MeetingStatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses} ${statusStyles[status]}`}>
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {statusLabels[status]}
    </span>
  );
}

interface TypeBadgeProps {
  type: MeetingType;
  size?: 'sm' | 'md';
}

export function MeetingTypeBadge({ type, size = 'sm' }: TypeBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center rounded-md border border-[#232636] bg-[#141722] text-[#94A3B8] font-medium ${sizeClasses}`}>
      {typeLabels[type]}
    </span>
  );
}

interface RoleBadgeProps {
  role: 'host' | 'co-host' | 'participant' | 'scrum_master' | 'developer' | 'product_owner' | 'observer';
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';
  const colors: Record<string, string> = {
    host: 'bg-[#F97316]/12 text-[#F97316] border-[#F97316]/25',
    'co-host': 'bg-purple-500/12 text-purple-400 border-purple-500/25',
    participant: 'bg-[#141722] text-[#94A3B8] border-[#232636]',
    scrum_master: 'bg-[#F97316]/12 text-[#F97316] border-[#F97316]/25',
    developer: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25',
    product_owner: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
    observer: 'bg-[#141722] text-[#94A3B8] border-[#232636]',
  };
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${colors[role] ?? colors.participant}`}>
      {role.replace('_', ' ')}
    </span>
  );
}