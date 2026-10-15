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

    const getVariantStyle = (variant: string): React.CSSProperties => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: 'var(--app-action-bg)',
            color: 'var(--app-action-text)',
            borderColor: 'var(--app-action-bg)',
            fontWeight: 500,
            boxShadow: 'var(--app-shadow-sm)'
          };
        case 'secondary':
          return {
            backgroundColor: 'var(--app-surface-card)',
            color: 'var(--app-text-primary)',
            borderColor: 'var(--app-border)'
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: 'var(--app-text-secondary)',
            borderColor: 'transparent'
          };
        case 'icon':
          return {
            backgroundColor: 'var(--app-surface-card)',
            color: 'var(--app-text-secondary)',
            borderColor: 'var(--app-border)'
          };
        case 'danger':
          return {
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#EF4444',
            borderColor: 'rgba(239, 68, 68, 0.2)'
          };
        case 'success':
          return {
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#10B981',
            borderColor: 'rgba(16, 185, 129, 0.2)'
          };
        case 'active':
          return {
            backgroundColor: 'var(--app-surface-active)',
            color: 'var(--app-text-primary)',
            borderColor: 'var(--app-border-focus)',
            fontWeight: 500
          };
        case 'mono':
          return {
            backgroundColor: 'var(--app-action-bg)',
            color: 'var(--app-action-text)',
            borderColor: 'var(--app-action-bg)',
            fontWeight: 500
          };
        case 'mono-outline':
          return {
            backgroundColor: 'var(--app-surface-card)',
            color: 'var(--app-text-primary)',
            borderColor: 'var(--app-border)'
          };
        case 'mono-ghost':
          return {
            backgroundColor: 'transparent',
            color: 'var(--app-text-secondary)',
            borderColor: 'transparent'
          };
        default:
          return {
            backgroundColor: 'var(--app-surface-card)',
            color: 'var(--app-text-secondary)',
            borderColor: 'var(--app-border)'
          };
      }
    };

    const sizeStyles: Record<string, string> = {
      xs: 'h-6 px-2 py-0.5 text-[11px]',
      sm: 'h-8 px-3 py-1.5 text-[13px]',
      md: 'h-9 px-3.5 py-2 text-[13px]',
      lg: 'h-10 px-4 py-2.5 text-sm',
      icon: 'h-8 w-8 p-0 flex items-center justify-center',
    };

    const variantStyle = getVariantStyle(variant);

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant === 'secondary') {
        e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
        e.currentTarget.style.color = 'var(--app-text-primary)';
        e.currentTarget.style.borderColor = 'var(--app-border-focus)';
      } else if (variant === 'ghost' || variant === 'mono-ghost') {
        e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
        e.currentTarget.style.color = 'var(--app-text-primary)';
      } else if (variant === 'icon') {
        e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
        e.currentTarget.style.color = 'var(--app-text-primary)';
      } else if (variant === 'mono-outline') {
        e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
        e.currentTarget.style.borderColor = 'var(--app-border-focus)';
      } else if (variant === 'primary' || variant === 'mono') {
        e.currentTarget.style.opacity = '0.9';
      } else if (variant === 'danger') {
        e.currentTarget.style.backgroundColor = '#EF4444';
        e.currentTarget.style.color = '#ffffff';
      } else if (variant === 'success') {
        e.currentTarget.style.backgroundColor = '#10B981';
        e.currentTarget.style.color = '#ffffff';
      }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant === 'secondary') {
        e.currentTarget.style.backgroundColor = 'var(--app-surface-card)';
        e.currentTarget.style.color = 'var(--app-text-primary)';
        e.currentTarget.style.borderColor = 'var(--app-border)';
      } else if (variant === 'ghost' || variant === 'mono-ghost') {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--app-text-secondary)';
      } else if (variant === 'icon') {
        e.currentTarget.style.backgroundColor = 'var(--app-surface-card)';
        e.currentTarget.style.color = 'var(--app-text-secondary)';
      } else if (variant === 'mono-outline') {
        e.currentTarget.style.backgroundColor = 'var(--app-surface-card)';
        e.currentTarget.style.borderColor = 'var(--app-border)';
      } else if (variant === 'primary' || variant === 'mono') {
        e.currentTarget.style.opacity = '1';
      } else if (variant === 'danger') {
        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        e.currentTarget.style.color = '#EF4444';
      } else if (variant === 'success') {
        e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        e.currentTarget.style.color = '#10B981';
      }
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles[size] || sizeStyles.sm} ${fullWidth ? 'w-full' : ''} ${className}`}
        style={variantStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
