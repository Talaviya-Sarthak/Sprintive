import type { MeetingStatus, MeetingType } from '../../types';

const statusStyles: Record<MeetingStatus, React.CSSProperties> = {
  scheduled: {
    backgroundColor: 'var(--app-surface-hover)',
    color: 'var(--app-text-secondary)',
    borderColor: 'var(--app-border)'
  },
  active: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10B981',
    borderColor: 'rgba(16, 185, 129, 0.2)'
  },
  ended: {
    backgroundColor: 'var(--app-surface-subtle)',
    color: 'var(--app-text-muted)',
    borderColor: 'var(--app-border)'
  },
  completed: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10B981',
    borderColor: 'rgba(16, 185, 129, 0.2)'
  },
  cancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
    borderColor: 'rgba(239, 68, 68, 0.2)'
  },
};

const statusLabels: Record<MeetingStatus, string> = {
  scheduled: 'Scheduled',
  active: 'Live',
  ended: 'Completed',
  completed: 'Completed',
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
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${sizeClasses}`}
      style={statusStyles[status]}
    >
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
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${sizeClasses}`}
      style={{
        backgroundColor: 'var(--app-surface-hover)',
        color: 'var(--app-text-secondary)',
        borderColor: 'var(--app-border)'
      }}
    >
      {typeLabels[type]}
    </span>
  );
}

interface RoleBadgeProps {
  role: 'host' | 'co-host' | 'participant' | 'scrum_master' | 'developer' | 'product_owner' | 'observer';
  size?: 'sm' | 'md';
}

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-[11px]';
  const colors: Record<string, React.CSSProperties> = {
    host: {
      backgroundColor: 'var(--app-surface-hover)',
      color: 'var(--app-text-primary)',
      borderColor: 'var(--app-border)'
    },
    'co-host': {
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      color: '#8B5CF6',
      borderColor: 'rgba(139, 92, 246, 0.2)'
    },
    participant: {
      backgroundColor: 'var(--app-surface-card)',
      color: 'var(--app-text-secondary)',
      borderColor: 'var(--app-border)'
    },
    scrum_master: {
      backgroundColor: 'var(--app-surface-hover)',
      color: 'var(--app-text-primary)',
      borderColor: 'var(--app-border)'
    },
    developer: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      color: '#10B981',
      borderColor: 'rgba(16, 185, 129, 0.2)'
    },
    product_owner: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      color: '#F59E0B',
      borderColor: 'rgba(245, 158, 11, 0.2)'
    },
    observer: {
      backgroundColor: 'var(--app-surface-card)',
      color: 'var(--app-text-secondary)',
      borderColor: 'var(--app-border)'
    },
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${sizeClasses}`}
      style={colors[role] ?? colors.participant}
    >
      {role.replace('_', ' ')}
    </span>
  );
}
