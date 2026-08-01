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

  const containerClasses = isDash
    ? `bg-[#141417] border border-[#27272a] rounded-xl overflow-hidden flex flex-col justify-between ${
        hoverable ? 'hover:border-[#3f3f46] hover:bg-[#18181b] transition-all duration-150' : ''
      }`
    : `bg-[#11131C] border border-[#1E2232] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between ${
        hoverable ? 'hover:border-[#2A2F45] transition-colors duration-150' : ''
      }`;

  const headerBorder = isDash ? 'border-b border-[#1f1f23]' : 'border-b border-[#181A26]';
  const footerBg = isDash ? 'bg-[#121215] border-t border-[#1f1f23] text-[#a1a1aa]' : 'bg-[#0C0D14] border-t border-[#181A26] text-[#94A3B8]';

  return (
    <motion.div
      whileHover={hoverable ? { y: -1.5 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`${containerClasses} ${className}`}
      {...(props as any)}
    >
      {(title || subtitle || action) && (
        <div className={`flex items-start justify-between gap-3 px-4 py-3.5 ${headerBorder}`}>
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className={`text-xs font-semibold tracking-tight truncate ${isDash ? 'text-[#f4f4f5]' : 'text-[#F8FAFC]'}`}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={`text-[11px] mt-0.5 leading-normal truncate ${isDash ? 'text-[#a1a1aa]' : 'text-[#64748B]'}`}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="p-4 flex-1">{children}</div>

      {footer && (
        <div className={`px-4 py-3 flex items-center justify-between text-xs ${footerBg}`}>
          {footer}
        </div>
      )}
    </motion.div>
  );
}
