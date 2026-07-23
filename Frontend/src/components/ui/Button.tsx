import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export default function Button({
  children, onClick, type = 'button', variant = 'primary', size = 'md',
  disabled, loading, className = '', fullWidth,
}: ButtonProps) {
  const variantClasses: Record<string, string> = {
    primary: 'bg-[#3B82F6] hover:bg-[#2563EB] text-white disabled:opacity-60',
    secondary: 'bg-white/6 hover:bg-white/10 text-[#CBD5E1] border border-white/10 disabled:opacity-50',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-50',
    ghost: 'text-[#475569] hover:text-[#94A3B8] hover:bg-white/5 disabled:opacity-50',
    gradient: 'bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-white disabled:opacity-60 shadow-lg shadow-[#3B82F6]/20',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-xl',
  };

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={onClick}
      type={type}
      disabled={disabled || loading}
      className={`${variantClasses[variant]} ${sizeClasses[size]} font-semibold transition-colors flex items-center justify-center gap-2 ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </motion.button>
  );
}