import type { MeetingStatus, MeetingType } from '../../types';

const statusStyles: Record<MeetingStatus, React.CSSProperties> = {
  scheduled: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    color: '#60A5FA',
    borderColor: 'rgba(59, 130, 246, 0.28)'
  },
  active: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34D399',
    borderColor: 'rgba(16, 185, 129, 0.35)'
  },
  ended: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: '#10B981',
    borderColor: 'rgba(16, 185, 129, 0.28)'
  },
  completed: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: '#10B981',
    borderColor: 'rgba(16, 185, 129, 0.28)'
  },
  cancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: '#F87171',
    borderColor: 'rgba(239, 68, 68, 0.28)'
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

const typeStyles: Record<MeetingType, React.CSSProperties> = {
  daily_scrum: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    color: '#38BDF8',
    borderColor: 'rgba(14, 165, 233, 0.25)',
  },
  sprint_planning: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    color: '#A78BFA',
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  review: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    color: '#FBBF24',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  retrospective: {
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    color: '#2DD4BF',
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  custom: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    color: '#818CF8',
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
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
      style={typeStyles[type] ?? typeStyles.custom}
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
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      color: '#60A5FA',
      borderColor: 'rgba(59, 130, 246, 0.25)'
    },
    'co-host': {
      backgroundColor: 'rgba(168, 85, 247, 0.12)',
      color: '#C084FC',
      borderColor: 'rgba(168, 85, 247, 0.25)'
    },
    participant: {
      backgroundColor: 'var(--app-surface-hover)',
      color: 'var(--app-text-secondary)',
      borderColor: 'var(--app-border)'
    },
    scrum_master: {
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
      color: '#A78BFA',
      borderColor: 'rgba(139, 92, 246, 0.25)'
    },
    developer: {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      color: '#34D399',
      borderColor: 'rgba(16, 185, 129, 0.25)'
    },
    product_owner: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      color: '#FBBF24',
      borderColor: 'rgba(245, 158, 11, 0.25)'
    },
    observer: {
      backgroundColor: 'var(--app-surface-hover)',
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
