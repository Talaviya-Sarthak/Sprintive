import * as React from 'react';

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger' | 'success' | 'active';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
}

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ className = '', variant = 'secondary', size = 'sm', fullWidth, loading, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-md transition-all duration-120 ease-out select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none shrink-0 border';

    const variantStyles: Record<string, string> = {
      // Modern Linear/GitHub styled button variants
      primary:
        'bg-[#F97316] text-white border-[#EA580C] hover:bg-[#EA580C] shadow-sm active:scale-[0.98]',
      secondary:
        'bg-[#12141D] text-[#CBD5E1] border-[#232636] hover:bg-[#181B28] hover:text-[#F8FAFC] hover:border-[#2E3347] active:scale-[0.98]',
      ghost:
        'bg-transparent text-[#94A3B8] border-transparent hover:bg-[#161824] hover:text-[#F8FAFC]',
      icon:
        'bg-[#12141D] text-[#94A3B8] border-[#232636] hover:bg-[#181B28] hover:text-[#F8FAFC] active:scale-[0.98]',
      danger:
        'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white active:scale-[0.98]',
      success:
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white active:scale-[0.98]',
      active:
        'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30 font-semibold',
    };

    const sizeStyles: Record<string, string> = {
      xs: 'h-6 px-2 py-0.5 text-[10px]',
      sm: 'h-7.5 px-2.5 py-1 text-xs',
      md: 'h-8.5 px-3 py-1.5 text-xs',
      lg: 'h-9.5 px-4 py-2 text-sm',
      icon: 'h-7.5 w-7.5 p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant] || variantStyles.secondary} ${sizeStyles[size] || sizeStyles.sm} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {loading && (
          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
        )}
        {children}
      </button>
    );
  }
);

AppButton.displayName = 'AppButton';
