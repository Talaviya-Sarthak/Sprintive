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
  style?: React.CSSProperties;
}

function FloatingCard({ icon: Icon, title, value, color, style }: FloatingCardProps) {
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        background: 'rgba(17,24,39,0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        minWidth: 180,
        ...style,
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} strokeWidth={1.8} />
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', marginTop: 1 }}>{value}</div>
      </div>
    </motion.div>
  );
}

function BrandPanel() {
  return (
    <div style={{
      flex: '0 0 48%', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(145deg, #0B1220 0%, #0F1E3A 50%, #0B1220 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '60px 56px',
    }} className="auth-brand-panel">
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.65, 0.4] }} transition={{ duration: 8, repeat: Infinity }}
        style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)', top: -100, left: -100, pointerEvents: 'none' }} />
      <motion.div animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 10, repeat: Infinity }}
        style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', bottom: -80, right: -80, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 56 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(59,130,246,0.5)' }}>
            <Brain size={19} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 19, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.03em', fontFamily: 'var(--font)' }}>
            Scrum<span style={{ color: '#3B82F6' }}>Mind</span>
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <h1 style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Your team's meetings,<br />
            <span style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              tasks & sprints
            </span>
            <br />in one place.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(203,213,225,0.8)', lineHeight: 1.7, maxWidth: 360 }}>
            Join 500+ teams who run smarter standups, never miss an action item, and ship faster with ScrumMind.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}
          style={{ position: 'relative', height: 220, marginTop: 48 }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', border: '1px solid rgba(59,130,246,0.15)' }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', border: '1px solid rgba(6,182,212,0.12)' }} />

          <FloatingCard icon={Users}         title="Active Team"      value="12 Members"    color="#3B82F6" style={{ top: 0,   left: 0 }} />
          <FloatingCard icon={CheckSquare}   title="Tasks Done"       value="28 / 35"       color="#10B981" style={{ top: 0,   right: 0 }} />
          <FloatingCard icon={BarChart3}     title="Sprint Progress"  value="80% Complete"  color="#06B6D4" style={{ bottom: 0, left: 20 }} />
          <FloatingCard icon={MessageSquare} title="Team Chat"        value="4 new messages" color="#8B5CF6" style={{ bottom: 0, right: 0 }} />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ display: 'flex', gap: 28, marginTop: 40 }}>
          {[['500+', 'Teams'], ['95%', 'Time Saved'], ['4.9★', 'Rating']].map(([val, label]) => (
            <div key={label}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#3B82F6', letterSpacing: '-0.02em' }}>{val}</div>
              <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.8)', fontWeight: 500, marginTop: 2 }}>{label}</div>
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
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
      <BrandPanel />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font)', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-h)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            ← Back to home
          </button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleTheme}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </motion.button>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: '100%', maxWidth: 420 }}
          >
            {children}
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .auth-brand-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
