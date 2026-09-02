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
          <label className="block text-[11px] font-mono font-semibold text-[#52525b] uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full bg-[#141417] border border-[#27272a] rounded-lg px-3 py-2.5 text-[13px] text-[#f4f4f5] outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 transition-all duration-150 ${
            error ? 'border-red-500/50 focus:ring-red-500/20' : ''
          } ${className}`}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-[#141417] text-[#f4f4f5]">
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
