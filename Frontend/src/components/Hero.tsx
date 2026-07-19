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
    <div className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-3.5">
        <div className="w-[7px] h-[7px] rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
        <span className="text-[var(--color-text-h)] text-xs font-semibold">Daily Scrum — Live</span>
        <div className="ml-auto bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.2)] rounded-md px-2 py-0.5 text-[10px] font-semibold text-[#3B82F6]">Recording</div>
      </div>
      <div className="grid grid-cols-2 gap-[7px]">
        {members.map((m, i) => (
          <div
            key={m}
            className={`bg-[var(--color-bg3)] rounded-[9px] p-[10px_11px] flex items-center gap-2 border ${i === 0 ? 'border-[rgba(59,130,246,0.3)]' : 'border-[var(--color-border)]'}`}
          >
            <div
              className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, hsl(${i * 55 + 200},65%,55%), hsl(${i * 55 + 240},65%,65%))` }}
            >
              {m}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-[var(--color-text-h)] font-semibold whitespace-nowrap">Member {m}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">{i === 0 ? 'Speaking…' : 'Listening'}</div>
            </div>
            {i === 0 && (
              <div className="ml-auto flex gap-0.5 items-end h-3.5">
                {[3, 5, 4, 6, 3].map((h, j) => (
                  <motion.div
                    key={j}
                    animate={{ height: [h * 1.5, h * 3, h * 1.5] }}
                    transition={{ duration: 0.55, repeat: Infinity, delay: j * 0.1 }}
                    className="w-[2.5px] bg-[#3B82F6] rounded-sm"
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
    <div className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-xl p-3.5 mb-3">
      <div className="flex items-center gap-[7px] mb-[11px]">
        <FileText size={13} color="#3B82F6" />
        <span className="text-xs font-semibold text-[var(--color-text-h)]">Meeting Summary</span>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="ml-auto w-1.5 h-1.5 rounded-full bg-[#10B981]"
        />
      </div>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.35 + 0.4 }}
          className="flex gap-2 mb-[7px] items-start"
        >
          <span className="text-[10px] text-[#3B82F6] font-bold min-w-[44px] pt-px">{item.name}</span>
          <span className="flex-1 text-[11px] text-[var(--color-text-body)] leading-[1.5]">{item.text}</span>
          <span className="text-[9px] font-semibold bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.18)] rounded-[5px] px-[7px] py-0.5 text-[#3B82F6] whitespace-nowrap">{item.tag}</span>
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
    <div className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-xl p-3.5">
      <div className="flex items-center gap-[7px] mb-[11px]">
        <CheckSquare size={13} color="#3B82F6" />
        <span className="text-xs font-semibold text-[var(--color-text-h)]">Sprint Board</span>
        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="ml-auto text-[10px] text-[#10B981] font-semibold"
        >
          ↑ 3 tasks added
        </motion.span>
      </div>
      <div className="grid grid-cols-3 gap-[7px]">
        {cols.map(col => (
          <div key={col.title}>
            <div className="text-[9px] font-bold mb-[5px] uppercase tracking-[0.06em]" style={{ color: col.color }}>{col.title}</div>
            {col.tasks.map(t => (
              <div key={t} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-[7px] py-[5px] text-[10px] text-[var(--color-text-body)] mb-1">{t}</div>
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
    <section id="hero" className="min-h-screen flex items-center relative overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[700px] h-[700px] rounded-full -top-[200px] -left-[200px]"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[600px] h-[600px] rounded-full -bottom-[150px] -right-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5 relative z-10 w-full py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-[72px] items-center">

          {/* Left */}
          <div>
            <motion.div {...fadeUp(0)}>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] rounded-full text-[11px] font-semibold text-[#3B82F6] uppercase tracking-[0.07em] mb-5">
                <Sparkles size={11} /> AI-Powered Agile Platform
              </div>
            </motion.div>

            <motion.h1
              {...fadeUp(0.08)}
              className="text-[clamp(30px,4.2vw,54px)] font-extrabold text-[var(--color-text-h)] leading-[1.1] tracking-[-0.03em] mb-5"
            >
              AI That Runs Your{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)' }}
              >
                Scrum Meetings
              </span>{' '}
              So Your Team Can Focus on Building.
            </motion.h1>

            <motion.p
              {...fadeUp(0.16)}
              className="text-[clamp(15px,1.6vw,17px)] text-[var(--color-text-body)] leading-[1.75] mb-8 max-w-[500px]"
            >
              ScrumMind brings your team's meetings, tasks, and sprint management into one place — so every standup ends with a clear summary, assigned responsibilities, and a team that knows exactly what to do next.
            </motion.p>

            <motion.div {...fadeUp(0.24)} className="flex gap-3 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-2 px-7 py-3 bg-[#3B82F6] text-white font-semibold text-[15px] rounded-xl border-none cursor-pointer transition-all duration-200 hover:bg-[#2563EB] hover:-translate-y-px active:translate-y-0 shadow-[0_1px_3px_rgba(0,0,0,0.2),0_4px_12px_rgba(59,130,246,0.3)] tracking-[-0.01em]"
              >
                <Zap size={15} /> Start Free Trial
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-7 py-3 bg-transparent text-[var(--color-text-h)] font-semibold text-[15px] rounded-xl border border-[var(--color-border2)] cursor-pointer transition-all duration-200 hover:bg-[var(--color-surface2)] hover:border-[#3B82F6] hover:text-[#3B82F6] hover:-translate-y-px active:translate-y-0 tracking-[-0.01em]"
              >
                <Play size={15} /> Watch Demo
              </motion.button>
            </motion.div>

            <motion.div {...fadeUp(0.32)} className="flex gap-9 mt-10 flex-wrap">
              {[['500+', 'Teams'], ['95%', 'Time Saved'], ['4.9★', 'Rating']].map(([val, label]) => (
                <div key={label}>
                  <div className="text-[22px] font-extrabold text-[var(--color-text-h)] tracking-[-0.02em]">{val}</div>
                  <div className="text-xs text-[var(--color-text-muted)] font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — UI preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="relative">
              <div
                className="absolute inset-[-1px] rounded-[20px] z-0 blur-[1px]"
                style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(6,182,212,0.15), transparent)' }}
              />
              <div className="bg-[rgba(17,24,39,0.7)] backdrop-blur-[24px] border border-[var(--color-border)] rounded-[18px] p-4 relative z-10 light:bg-[rgba(255,255,255,0.85)]">
                <MeetingCard />
                <SummaryCard />
                <SprintCard />
              </div>

              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-[18px] -right-[18px] z-20 bg-[#3B82F6] rounded-[10px] px-3.5 py-[9px] shadow-[0_4px_20px_rgba(59,130,246,0.4)]"
              >
                <div className="text-[11px] font-bold text-white">✨ Summary Ready</div>
                <div className="text-[10px] text-white/75 mt-px">3 action items found</div>
              </motion.div>

              <motion.div
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-[14px] -left-[18px] z-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] px-3.5 py-[9px] shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
              >
                <div className="text-[11px] font-bold text-[#10B981]">✅ Sprint Updated</div>
                <div className="text-[10px] text-[var(--color-text-muted)] mt-px">Board synced</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
