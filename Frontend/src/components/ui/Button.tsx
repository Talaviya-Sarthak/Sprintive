import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient' | 'neutral' | 'orange' | 'active' | 'icon';
  size?: 'default' | 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'neutral', size = 'default', fullWidth, loading, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-extrabold text-[12px] uppercase tracking-wider rounded-[4px] border-2 cursor-pointer transition-all duration-150 ease-out select-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none whitespace-nowrap';

    const variantStyles: Record<string, string> = {
      // Neo-brutalism variants: button color remains black on hover, text turns orange, border remains black
      neutral:
        'bg-[#111111] text-white border-[#111111] shadow-[0.9px_0.9px_0px_#FFFFFF] hover:bg-[#111111] hover:text-[#F97316] hover:border-[#111111] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0px_#FFFFFF]',
      orange:
        'bg-[#F97316] text-white border-[#111111] shadow-[0.9px_0.9px_0px_#FFFFFF] hover:bg-[#F97316] hover:text-white hover:border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#FFFFFF]',
      active:
        'bg-[#F97316] text-white border-[#111111] shadow-[0.9px_0.9px_0px_#FFFFFF] translate-x-0 translate-y-0',
      icon:
        'bg-[#111111] text-white border-[#111111] shadow-[0.9px_0.9px_0px_#FFFFFF] hover:bg-[#111111] hover:text-[#F97316] hover:border-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#FFFFFF]',

      // App compatibility variants
      default:
        'bg-[#F97316] text-white border-black shadow-[3px_3px_0px_#FFFFFF] hover:bg-[#F97316] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#FFFFFF]',
      primary:
        'bg-[#F97316] text-white border-black shadow-[3px_3px_0px_#FFFFFF] hover:bg-[#EA580C]',
      secondary:
        'bg-[#111111] text-white border-black shadow-[3px_3px_0px_#FFFFFF] hover:bg-[#111111] hover:text-[#F97316]',
      danger:
        'bg-red-600 text-white border-black shadow-[3px_3px_0px_#FFFFFF] hover:bg-red-700',
      ghost:
        'bg-transparent text-white border-transparent shadow-none hover:bg-[#171719]',
      gradient:
        'bg-gradient-to-r from-[#F97316] to-[#FDBA74] text-white border-black shadow-[3px_3px_0px_#FFFFFF]',
    };

    const sizeStyles: Record<string, string> = {
      default: 'h-9 px-3.5 py-1.5',
      sm: 'h-8 px-3 py-1 text-[11px]',
      md: 'h-9 px-3.5 py-1.5 text-xs',
      lg: 'h-10 px-5 py-2 text-sm',
      icon: 'h-9 w-9 p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant] || variantStyles.neutral} ${sizeStyles[size] || sizeStyles.default} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
