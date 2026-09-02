import * as React from 'react';

export interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  shortcut?: string;
  error?: string;
  label?: string;
}

export const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(
  ({ icon, shortcut, error, label, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-[11px] font-mono font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 pointer-events-none flex items-center justify-center" style={{ color: 'var(--app-text-muted)' }}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full border rounded-lg text-xs outline-none transition-colors ${
              icon ? 'pl-9' : 'pl-3'
            } ${shortcut ? 'pr-12' : 'pr-3'} py-2.5 ${
              error ? 'border-red-500/50 focus:ring-red-500/20' : ''
            } ${className}`}
            style={{
              backgroundColor: 'var(--app-surface-card)',
              borderColor: error ? undefined : 'var(--app-border)',
              color: 'var(--app-text-primary)'
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--app-border-focus)';
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--app-border-focus)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = error ? 'rgba(239, 68, 68, 0.5)' : 'var(--app-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            {...props}
          />
          {shortcut && (
            <kbd className="absolute right-2.5 text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ color: 'var(--app-text-muted)', backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)' }}>
              {shortcut}
            </kbd>
          )}
        </div>
        {error && <p className="text-[11px] text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  }
);

AppInput.displayName = 'AppInput';
