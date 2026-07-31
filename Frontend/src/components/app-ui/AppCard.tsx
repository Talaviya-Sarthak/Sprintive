import * as React from 'react';
import { motion } from 'framer-motion';

export interface AppCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  hoverable?: boolean;
}

export function AppCard({
  title,
  subtitle,
  action,
  footer,
  hoverable = false,
  children,
  className = '',
  ...props
}: AppCardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -1.5 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`bg-[#11131C] border border-[#1E2232] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between ${
        hoverable ? 'hover:border-[#2A2F45] transition-colors duration-150' : ''
      } ${className}`}
      {...(props as any)}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-3 px-4 py-3.5 border-b border-[#181A26]">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-xs font-semibold text-[#F8FAFC] tracking-tight truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-[#64748B] mt-0.5 leading-normal truncate">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="p-4 flex-1">{children}</div>

      {footer && (
        <div className="px-4 py-3 bg-[#0C0D14] border-t border-[#181A26] flex items-center justify-between text-xs text-[#94A3B8]">
          {footer}
        </div>
      )}
    </motion.div>
  );
}
