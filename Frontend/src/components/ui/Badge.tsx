import type { MeetingStatus, MeetingType } from '../../types';

const statusStyles: Record<MeetingStatus, string> = {
  scheduled: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/20',
  active: 'bg-green-500/15 text-green-400 border-green-500/20',
  ended: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/20',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
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
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${sizeClasses} ${statusStyles[status]}`}>
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
      {statusLabels[status]}
    </span>
  );
}

interface TypeBadgeProps {
  type: MeetingType;
  size?: 'sm' | 'md';
}

export function MeetingTypeBadge({ type, size = 'sm' }: TypeBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full border border-white/10 bg-white/5 text-[#94A3B8] font-medium ${sizeClasses}`}>
      {typeLabels[type]}
    </span>
  );
}

interface RoleBadgeProps {
  role: 'host' | 'co-host' | 'participant' | 'scrum_master' | 'developer' | 'product_owner' | 'observer';
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  const colors: Record<string, string> = {
    host: 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/20',
    'co-host': 'bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/20',
    participant: 'bg-white/10 text-[#94A3B8] border-white/10',
    scrum_master: 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/20',
    developer: 'bg-green-500/15 text-green-400 border-green-500/20',
    product_owner: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/20',
    observer: 'bg-white/10 text-[#94A3B8] border-white/10',
  };
  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${sizeClasses} ${colors[role]}`}>
      {role.replace('_', ' ')}
    </span>
  );
}