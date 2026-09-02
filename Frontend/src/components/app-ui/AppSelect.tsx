import * as React from 'react';

export interface AppSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const AppSelect = React.forwardRef<HTMLSelectElement, AppSelectProps>(
  ({ label, options, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-[11px] font-mono font-medium uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-colors ${
            error ? 'border-red-500/50' : ''
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
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} style={{ backgroundColor: 'var(--app-surface-card)', color: 'var(--app-text-primary)' }}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[11px] text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  }
);

AppSelect.displayName = 'AppSelect';
