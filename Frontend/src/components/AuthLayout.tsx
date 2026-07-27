import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, Sun, Moon, Users, CheckSquare, BarChart3, MessageSquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { LucideIcon } from 'lucide-react';

interface FloatingCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  color: string;
  className?: string;
}

function FloatingCard({ icon: Icon, title, value, color, className = '' }: FloatingCardProps) {
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut' }}
      className={`absolute bg-[rgba(17,24,39,0.75)] backdrop-blur-[16px] border border-white/10 rounded-[14px] px-4 py-3 flex items-center gap-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] min-w-[180px] ${className}`}
    >
      <div
        className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={16} color={color} strokeWidth={1.8} />
      </div>
      <div>
        <div className="text-[10px] text-white/50 font-semibold uppercase tracking-[0.06em]">{title}</div>
        <div className="text-sm font-bold text-[#F8FAFC] mt-px">{value}</div>
      </div>
    </motion.div>
  );
}

function BrandPanel() {
  return (
    <div
      className="hidden md:flex flex-[0_0_48%] relative overflow-hidden flex-col justify-center px-14 py-[60px]"
      style={{ background: 'linear-gradient(145deg, #0B1220 0%, #0F1E3A 50%, #0B1220 100%)' }}
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute w-[500px] h-[500px] rounded-full -top-[100px] -left-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute w-[400px] h-[400px] rounded-full -bottom-[80px] -right-[80px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2.5 mb-14"
        >
          <div className="w-9 h-9 rounded-[10px] bg-[#3B82F6] flex items-center justify-center shadow-[0_4px_16px_rgba(59,130,246,0.5)]">
            <Brain size={19} color="#fff" strokeWidth={2.2} />
          </div>
          <span className="text-[19px] font-bold text-[#F8FAFC] tracking-[-0.03em]">
            Scrum<span className="text-[#3B82F6]">Mind</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="text-[clamp(28px,3vw,40px)] font-extrabold text-[#F8FAFC] leading-[1.15] tracking-[-0.03em] mb-4">
            Your team's meetings,<br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}
            >
              tasks & sprints
            </span>
            <br />in one place.
          </h1>
          <p className="text-[15px] text-[rgba(203,213,225,0.8)] leading-[1.7] max-w-[360px]">
            Join 500+ teams who run smarter standups, never miss an action item, and ship faster with ScrumMind.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="relative h-[220px] mt-12"
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[160px] h-[160px] rounded-full border border-[rgba(59,130,246,0.15)]"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] rounded-full border border-[rgba(6,182,212,0.12)]"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }} />

          <FloatingCard icon={Users}         title="Active Team"      value="12 Members"    color="#3B82F6" className="top-0 left-0" />
          <FloatingCard icon={CheckSquare}   title="Tasks Done"       value="28 / 35"       color="#10B981" className="top-0 right-0" />
          <FloatingCard icon={BarChart3}     title="Sprint Progress"  value="80% Complete"  color="#06B6D4" className="bottom-0 left-5" />
          <FloatingCard icon={MessageSquare} title="Team Chat"        value="4 new messages" color="#8B5CF6" className="bottom-0 right-0" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-7 mt-10"
        >
          {[['500+', 'Teams'], ['95%', 'Time Saved'], ['4.9★', 'Rating']].map(([val, label]) => (
            <div key={label}>
              <div className="text-[20px] font-extrabold text-[#3B82F6] tracking-[-0.02em]">{val}</div>
              <div className="text-[11px] text-[rgba(148,163,184,0.8)] font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      <BrandPanel />

      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--color-border)]">
          <button
            onClick={() => navigate('/')}
            className="bg-transparent border-none cursor-pointer text-[var(--color-text-muted)] text-[13px] font-medium flex items-center gap-1.5 transition-colors duration-200 hover:text-[var(--color-text-h)]"
          >
            ← Back to home
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg w-[34px] h-[34px] cursor-pointer text-[var(--color-text-muted)] flex items-center justify-center"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </motion.button>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-[420px]"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
