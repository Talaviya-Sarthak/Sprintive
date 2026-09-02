import * as React from 'react';

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger' | 'success' | 'active' | 'mono' | 'mono-outline' | 'mono-ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
}

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ className = '', variant = 'secondary', size = 'sm', fullWidth, loading, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 ease-out select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none shrink-0 border';

    const variantStyles: Record<string, string> = {
      primary:
        'bg-[#F97316] text-white border-[#EA580C] hover:bg-[#EA580C] shadow-sm shadow-[#F97316]/20 active:scale-[0.98]',
      secondary:
        'bg-[#141417] text-[#a1a1aa] border-[#27272a] hover:bg-[#1c1c21] hover:text-[#f4f4f5] hover:border-[#3f3f46] active:scale-[0.98]',
      ghost:
        'bg-transparent text-[#71717a] border-transparent hover:bg-[#141417] hover:text-[#f4f4f5]',
      icon:
        'bg-[#141417] text-[#71717a] border-[#27272a] hover:bg-[#1c1c21] hover:text-[#f4f4f5] active:scale-[0.98]',
      danger:
        'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white active:scale-[0.98]',
      success:
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white active:scale-[0.98]',
      active:
        'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30 font-semibold',
      mono:
        'bg-[#f4f4f5] text-[#09090b] border-[#f4f4f5] hover:bg-[#e4e4e7] font-semibold active:scale-[0.98]',
      'mono-outline':
        'bg-[#141417] text-[#a1a1aa] border-[#27272a] hover:bg-[#1c1c21] hover:text-[#f4f4f5] hover:border-[#3f3f46] active:scale-[0.98]',
      'mono-ghost':
        'bg-transparent text-[#71717a] border-transparent hover:bg-[#141417] hover:text-[#f4f4f5]',
    };

    const sizeStyles: Record<string, string> = {
      xs: 'h-6 px-2 py-0.5 text-[11px]',
      sm: 'h-8 px-3 py-1.5 text-[13px]',
      md: 'h-9 px-3.5 py-2 text-[13px]',
      lg: 'h-10 px-4 py-2.5 text-sm',
      icon: 'h-8 w-8 p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant] || variantStyles.secondary} ${sizeStyles[size] || sizeStyles.sm} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin mr-1.5" />
        )}
        {children}
      </button>
    );
  }
);

AppButton.displayName = 'AppButton';
