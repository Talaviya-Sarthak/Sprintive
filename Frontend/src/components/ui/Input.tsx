interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[#CBD5E1]">{label}</label>}
      <input
        {...props}
        className={`w-full bg-[#0d1117] border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] text-sm outline-none focus:border-[#3B82F6] transition-colors ${className}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[#CBD5E1]">{label}</label>}
      <select
        {...props}
        className={`w-full bg-[#0d1117] border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-[#F8FAFC] text-sm outline-none focus:border-[#3B82F6] transition-colors ${className}`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-[#0d1117]">{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-[#CBD5E1]">{label}</label>}
      <textarea
        {...props}
        className={`w-full bg-[#0d1117] border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#475569] text-sm outline-none focus:border-[#3B82F6] transition-colors resize-none ${className}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}