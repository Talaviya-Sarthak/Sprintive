import * as React from 'react';

export interface AppBadgeProps {
  variant?: 'neutral' | 'orange' | 'emerald' | 'amber' | 'blue' | 'purple' | 'red' | 'mono';
  size?: 'xs' | 'sm';
  children: React.ReactNode;
  pulse?: boolean;
}

export function AppBadge({ variant = 'neutral', size = 'xs', children, pulse = false }: AppBadgeProps) {
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]';

  const variantStyles: Record<string, string> = {
    neutral: 'bg-[#171A26] text-[#94A3B8] border-[#232738]',
    mono: 'bg-[#1f1f23] text-[#a1a1aa] border-[#27272a]',
    orange: 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/25',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
    red: 'bg-red-500/10 text-red-400 border-red-500/25',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium tracking-tight ${sizeClasses} ${
        variantStyles[variant] || variantStyles.neutral
      }`}
    >
      {pulse && (
        <span
          className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            variant === 'emerald'
              ? 'bg-emerald-400'
              : variant === 'orange'
              ? 'bg-[#F97316]'
              : variant === 'red'
              ? 'bg-red-400'
              : 'bg-[#94A3B8]'
          }`}
        />
      )}
      {children}
    </span>
  );
}
