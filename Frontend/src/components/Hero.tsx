import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Play, Sparkles, FileText, CheckSquare } from 'lucide-react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] as const },
});

function MeetingCard() {
  const members = ['A', 'B', 'C', 'D'];
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
        <span style={{ color: 'var(--text-h)', fontSize: 12, fontWeight: 600 }}>Daily Scrum — Live</span>
        <div style={{ marginLeft: 'auto', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, padding: '2px 9px', fontSize: 10, fontWeight: 600, color: 'var(--primary)' }}>Recording</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {members.map((m, i) => (
          <div key={m} style={{ background: 'var(--bg3)', borderRadius: 9, padding: '10px 11px', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${i === 0 ? 'rgba(59,130,246,0.3)' : 'var(--border)'}` }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, hsl(${i * 55 + 200},65%,55%), hsl(${i * 55 + 240},65%,65%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{m}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-h)', fontWeight: 600, whiteSpace: 'nowrap' }}>Member {m}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{i === 0 ? 'Speaking…' : 'Listening'}</div>
            </div>
            {i === 0 && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
                {[3, 5, 4, 6, 3].map((h, j) => (
                  <motion.div key={j}
                    animate={{ height: [h * 1.5, h * 3, h * 1.5] }}
                    transition={{ duration: 0.55, repeat: Infinity, delay: j * 0.1 }}
                    style={{ width: 2.5, background: 'var(--primary)', borderRadius: 2 }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard() {
  const items = [
    { name: 'Alex',    text: 'Blocked on the payment flow, need access from the team', tag: '🚫 Blocker' },
    { name: 'Sam',     text: 'Will finish the dashboard by Thursday EOD',               tag: '📅 Deadline' },
    { name: 'Summary', text: 'Action item: Resolve payment access — Owner: Alex',       tag: '✅ Action' },
  ];
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11 }}>
        <FileText size={13} color="var(--primary)" />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-h)' }}>Meeting Summary</span>
        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
          style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
      </div>
      {items.map((item, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.35 + 0.4 }}
          style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}
        >
          <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, minWidth: 44, paddingTop: 1 }}>{item.name}</span>
          <span style={{ flex: 1, fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>{item.text}</span>
          <span style={{ fontSize: 9, fontWeight: 600, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 5, padding: '2px 7px', color: 'var(--primary)', whiteSpace: 'nowrap' }}>{item.tag}</span>
        </motion.div>
      ))}
    </div>
  );
}

function SprintCard() {
  const cols = [
    { title: 'To Do',       color: '#94A3B8', tasks: ['Auth API', 'UI Tests'] },
    { title: 'In Progress', color: '#3B82F6', tasks: ['Dashboard'] },
    { title: 'Done',        color: '#10B981', tasks: ['Login', 'DB Setup'] },
  ];
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11 }}>
        <CheckSquare size={13} color="var(--primary)" />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-h)' }}>Sprint Board</span>
        <motion.span animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ marginLeft: 'auto', fontSize: 10, color: '#10B981', fontWeight: 600 }}>↑ 3 tasks added</motion.span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
        {cols.map(col => (
          <div key={col.title}>
            <div style={{ fontSize: 9, fontWeight: 700, color: col.color, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.title}</div>
            {col.tasks.map(t => (
              <div key={t} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px', fontSize: 10, color: 'var(--text)', marginBottom: 4 }}>{t}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  return (
    <section id="hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 64 }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', top: -200, left: -200 }}
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', bottom: -150, right: -100 }}
        />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '64px 64px', opacity: 0.4 }} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1, width: '100%', padding: '80px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }} className="hero-grid">

          <div>
            <motion.div {...fadeUp(0)}>
              <div className="section-tag"><Sparkles size={11} /> AI-Powered Agile Platform</div>
            </motion.div>

            <motion.h1 {...fadeUp(0.08)} style={{ fontSize: 'clamp(30px, 4.2vw, 54px)', fontWeight: 800, color: 'var(--text-h)', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
              AI That Runs Your{' '}
              <span className="glow-text">Scrum Meetings</span>{' '}
              So Your Team Can Focus on Building.
            </motion.h1>

            <motion.p {...fadeUp(0.16)} style={{ fontSize: 'clamp(15px, 1.6vw, 17px)', color: 'var(--text)', lineHeight: 1.75, marginBottom: 32, maxWidth: 500 }}>
              ScrumMind brings your team's meetings, tasks, and sprint management into one place — so every standup ends with a clear summary, assigned responsibilities, and a team that knows exactly what to do next.
            </motion.p>

            <motion.div {...fadeUp(0.24)} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/signup')}
                className="btn-primary" style={{ fontSize: 15, padding: '12px 28px' }}>
                <Zap size={15} /> Start Free Trial
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="btn-secondary" style={{ fontSize: 15, padding: '12px 28px' }}>
                <Play size={15} /> Watch Demo
              </motion.button>
            </motion.div>

            <motion.div {...fadeUp(0.32)} style={{ display: 'flex', gap: 36, marginTop: 40, flexWrap: 'wrap' }}>
              {[['500+', 'Teams'], ['95%', 'Time Saved'], ['4.9★', 'Rating']].map(([val, label]) => (
                <div key={label}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-h)', letterSpacing: '-0.02em' }}>{val}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          >
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: -1, borderRadius: 20, background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(6,182,212,0.15), transparent)', filter: 'blur(1px)', zIndex: 0 }} />
              <div className="glass" style={{ borderRadius: 18, padding: 16, position: 'relative', zIndex: 1 }}>
                <MeetingCard />
                <SummaryCard />
                <SprintCard />
              </div>

              <motion.div
                animate={{ y: [-5, 5, -5] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', top: -18, right: -18, zIndex: 2, background: 'var(--primary)', borderRadius: 10, padding: '9px 14px', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>✨ Summary Ready</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>3 action items found</div>
              </motion.div>

              <motion.div
                animate={{ y: [5, -5, 5] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', bottom: -14, left: -18, zIndex: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 14px', boxShadow: 'var(--shadow-md)' }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>✅ Sprint Updated</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Board synced</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
        }
      `}</style>
    </section>
  );
}
