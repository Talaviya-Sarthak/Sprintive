import * as React from 'react';

export interface AppSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const AppSelect = React.forwardRef<HTMLSelectElement, AppSelectProps>(
  ({ label, options, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-[11px] font-semibold text-[#CBD5E1] uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full bg-[#0C0D14] border border-[#1E2232] rounded-lg px-3 py-1.5 text-xs text-[#F8FAFC] outline-none focus:border-[#F97316] transition-colors ${
            error ? 'border-red-500/50' : ''
          } ${className}`}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-[#11131C] text-[#F8FAFC]">
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
