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
          <label className="block text-[11px] font-mono font-semibold text-[#52525b] uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-[#52525b] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-[#141417] border border-[#27272a] rounded-lg text-[13px] text-[#f4f4f5] placeholder-[#52525b] outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 transition-all duration-150 ${
              icon ? 'pl-9' : 'pl-3'
            } ${shortcut ? 'pr-12' : 'pr-3'} py-2.5 ${
              error ? 'border-red-500/50 focus:ring-red-500/20' : ''
            } ${className}`}
            {...props}
          />
          {shortcut && (
            <kbd className="absolute right-2.5 text-[10px] font-mono text-[#52525b] bg-[#1c1c21] px-1.5 py-0.5 rounded border border-[#27272a]">
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
