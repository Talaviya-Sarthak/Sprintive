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
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-[11px] font-semibold text-[#CBD5E1] uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-2.5 text-[#64748B] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-[#0C0D14] border border-[#1E2232] rounded-lg text-xs text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#F97316] transition-colors ${
              icon ? 'pl-8' : 'pl-3'
            } ${shortcut ? 'pr-12' : 'pr-3'} py-1.5 ${
              error ? 'border-red-500/50' : ''
            } ${className}`}
            {...props}
          />
          {shortcut && (
            <kbd className="absolute right-2 text-[10px] font-mono text-[#64748B] bg-[#171A26] px-1.5 py-0.5 rounded border border-[#232738]">
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


