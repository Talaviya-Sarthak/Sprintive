import * as React from 'react';
import { motion } from 'framer-motion';

export interface AppCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  hoverable?: boolean;
  variant?: 'default' | 'dashboard';
}

export function AppCard({
  title,
  subtitle,
  action,
  footer,
  hoverable = false,
  variant = 'default',
  children,
  className = '',
  ...props
}: AppCardProps) {
  const isDash = variant === 'dashboard';

  const containerStyle: React.CSSProperties = isDash
    ? {
        backgroundColor: 'var(--app-surface-card)',
        border: '1px solid var(--app-border)',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }
    : {
        backgroundColor: 'var(--app-surface-card)',
        border: '1px solid var(--app-border)',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        boxShadow: 'var(--app-shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      };

  return (
    <motion.div
      whileHover={hoverable ? { y: -1.5 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={containerStyle}
      className={className}
      onMouseEnter={hoverable ? e => {
        e.currentTarget.style.borderColor = 'var(--app-border-focus)';
        e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
      } : undefined}
      onMouseLeave={hoverable ? e => {
        e.currentTarget.style.borderColor = 'var(--app-border)';
        e.currentTarget.style.backgroundColor = 'var(--app-surface-card)';
      } : undefined}
      {...(props as any)}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--app-border-subtle)' }}>
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-xs font-semibold tracking-tight truncate" style={{ color: 'var(--app-text-primary)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] mt-0.5 leading-normal truncate" style={{ color: 'var(--app-text-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="p-5 flex-1">{children}</div>

      {footer && (
        <div className="px-4 py-3 flex items-center justify-between text-xs" style={{ backgroundColor: 'var(--app-surface-subtle)', borderTop: '1px solid var(--app-border-subtle)', color: 'var(--app-text-secondary)' }}>
          {footer}
        </div>
      )}
    </motion.div>
  );
}
