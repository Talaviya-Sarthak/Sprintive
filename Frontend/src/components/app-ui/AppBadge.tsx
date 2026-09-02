import * as React from 'react';

export interface AppBadgeProps {
  variant?: 'neutral' | 'orange' | 'emerald' | 'amber' | 'blue' | 'purple' | 'red' | 'mono';
  size?: 'xs' | 'sm';
  children: React.ReactNode;
  pulse?: boolean;
}

export function AppBadge({ variant = 'neutral', size = 'xs', children, pulse = false }: AppBadgeProps) {
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]';

  const getVariantStyle = (variant: string): React.CSSProperties => {
    switch (variant) {
      case 'neutral':
        return {
          backgroundColor: 'var(--app-surface-hover)',
          color: 'var(--app-text-secondary)',
          borderColor: 'var(--app-border)'
        };
      case 'mono':
        return {
          backgroundColor: 'var(--app-surface-subtle)',
          color: 'var(--app-text-secondary)',
          borderColor: 'var(--app-border)'
        };
      case 'orange':
        return {
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          color: '#F97316',
          borderColor: 'rgba(249, 115, 22, 0.25)'
        };
      case 'emerald':
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: '#10B981',
          borderColor: 'rgba(16, 185, 129, 0.25)'
        };
      case 'amber':
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: '#F59E0B',
          borderColor: 'rgba(245, 158, 11, 0.25)'
        };
      case 'blue':
        return {
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          color: '#3B82F6',
          borderColor: 'rgba(59, 130, 246, 0.25)'
        };
      case 'purple':
        return {
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          color: '#8B5CF6',
          borderColor: 'rgba(139, 92, 246, 0.25)'
        };
      case 'red':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#EF4444',
          borderColor: 'rgba(239, 68, 68, 0.25)'
        };
      default:
        return {
          backgroundColor: 'var(--app-surface-hover)',
          color: 'var(--app-text-secondary)',
          borderColor: 'var(--app-border)'
        };
    }
  };

  const variantStyle = getVariantStyle(variant);

  const getPulseColor = (variant: string): string => {
    switch (variant) {
      case 'emerald':
        return '#10B981';
      case 'orange':
        return '#F97316';
      case 'red':
        return '#EF4444';
      default:
        return 'var(--app-text-muted)';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium tracking-tight ${sizeClasses}`}
      style={variantStyle}
    >
      {pulse && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: getPulseColor(variant) }}
        />
      )}
      {children}
    </span>
  );
}
