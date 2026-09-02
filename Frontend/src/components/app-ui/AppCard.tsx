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
        hoverable ? 'hover:border-[#3f3f46] hover:bg-[#18181b] transition-all duration-200' : ''
      }`
    : `bg-[#141417] border border-[#27272a] rounded-xl overflow-hidden flex flex-col justify-between ${
        hoverable ? 'hover:border-[#3f3f46] transition-all duration-200' : ''
      }`;

  const headerBorder = isDash ? 'border-b border-[#1a1a1e]' : 'border-b border-[#1a1a1e]';
  const footerBg = isDash
    ? 'bg-[#111215] border-t border-[#1a1a1e] text-[#71717a]'
    : 'bg-[#111215] border-t border-[#1a1a1e] text-[#71717a]';

  return (
    <motion.div
      whileHover={hoverable ? { y: -2 } : undefined}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`${containerClasses} ${className}`}
      {...(props as any)}
    >
      {(title || subtitle || action) && (
        <div className={`flex items-start justify-between gap-3 px-5 py-4 ${headerBorder}`}>
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className={`text-[13px] font-semibold tracking-tight truncate ${isDash ? 'text-[#f4f4f5]' : 'text-[#f4f4f5]'}`}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={`text-[12px] mt-0.5 leading-relaxed truncate ${isDash ? 'text-[#71717a]' : 'text-[#71717a]'}`}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="p-5 flex-1">{children}</div>

      {footer && (
        <div className={`px-5 py-3.5 flex items-center justify-between text-[13px] ${footerBg}`}>
          {footer}
        </div>
      )}
    </motion.div>
  );
}
