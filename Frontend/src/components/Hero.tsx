import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Play, FileText, CheckSquare } from 'lucide-react';
import { Button } from './ui/Button';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] as const },
});

function MeetingCard() {
  const members = ['A', 'B', 'C', 'D'];
  return (
    <div className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg p-3 mb-2.5">
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
        <span className="text-[var(--color-text-h)] text-[11px] font-semibold">Daily Scrum — Live</span>
        <div className="ml-auto bg-[rgba(249,115,22,0.12)] border border-[rgba(249,115,22,0.2)] rounded px-2 py-0.5 text-[9.5px] font-semibold text-[#F97316]">Recording</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {members.map((m, i) => (
          <div
            key={m}
            className={`bg-[var(--color-bg3)] rounded-md p-2 flex items-center gap-2 border ${i === 0 ? 'border-[rgba(249,115,22,0.35)]' : 'border-[var(--color-border)]'}`}
          >
            <div
              className="w-5.5 h-5.5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, hsl(${i * 30 + 15},75%,50%), hsl(${i * 30 + 35},75%,60%))` }}
            >
              {m}
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] text-[var(--color-text-h)] font-semibold whitespace-nowrap">Member {m}</div>
              <div className="text-[9px] text-[var(--color-text-muted)]">{i === 0 ? 'Speaking…' : 'Listening'}</div>
            </div>
            {i === 0 && (
              <div className="ml-auto flex gap-0.5 items-end h-3">
                {[3, 5, 4, 6, 3].map((h, j) => (
                  <motion.div
                    key={j}
                    animate={{ height: [h * 1.2, h * 2.4, h * 1.2] }}
                    transition={{ duration: 0.55, repeat: Infinity, delay: j * 0.1 }}
                    className="w-[2px] bg-[#F97316] rounded-sm"
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
    { name: 'Alex',    text: 'Blocked on payment flow, need access from team', tag: '🚫 Blocker' },
    { name: 'Sam',     text: 'Will finish the dashboard by Thursday EOD',       tag: '📅 Deadline' },
    { name: 'Summary', text: 'Action item: Resolve payment access — Owner: Alex',tag: '✅ Action' },
  ];
  return (
    <div className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg p-3 mb-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <FileText size={13} color="#F97316" />
        <span className="text-[11.5px] font-semibold text-[var(--color-text-h)]">Meeting Summary</span>
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
          transition={{ delay: i * 0.2 + 0.3 }}
          className="flex gap-2 mb-1.5 items-start"
        >
          <span className="text-[10px] text-[#F97316] font-bold min-w-[42px] pt-px">{item.name}</span>
          <span className="flex-1 text-[10.5px] text-[var(--color-text-body)] leading-[1.35] truncate">{item.text}</span>
          <span className="text-[9px] font-semibold bg-[rgba(249,115,22,0.1)] border border-[rgba(249,115,22,0.2)] rounded px-1.5 py-0.5 text-[#F97316] whitespace-nowrap">{item.tag}</span>
        </motion.div>
      ))}
    </div>
  );
}

function SprintCard() {
  const cols = [
    { title: 'To Do',       color: '#94A3B8', tasks: ['Auth API', 'UI Tests'] },
    { title: 'In Progress', color: '#F97316', tasks: ['Dashboard'] },
    { title: 'Done',        color: '#10B981', tasks: ['Login', 'DB Setup'] },
  ];
  return (
    <div className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <CheckSquare size={13} color="#F97316" />
        <span className="text-[11.5px] font-semibold text-[var(--color-text-h)]">Sprint Board</span>
        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="ml-auto text-[9.5px] text-[#10B981] font-semibold"
        >
          ↑ 3 tasks added
        </motion.span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {cols.map(col => (
          <div key={col.title}>
            <div className="text-[9px] font-bold mb-1 uppercase tracking-[0.05em]" style={{ color: col.color }}>{col.title}</div>
            {col.tasks.map(t => (
              <div key={t} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[9.5px] text-[var(--color-text-body)] mb-1 truncate">{t}</div>
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
    <section id="hero" className="min-h-screen flex items-center relative overflow-hidden pt-24 md:pt-20 pb-8 bg-transparent">
      {/* Soft Radial Orange Glow behind main hero headline */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute w-[700px] h-[420px] rounded-full top-[10%] left-[50%] -translate-x-1/2 blur-[140px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.85) 0%, transparent 70%)' }}
        />
      </div>

      <div className="max-w-[1320px] mx-auto px-6 max-sm:px-4 relative z-10 w-full py-4 md:py-8 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">

          {/* Left Column: Shifted slightly to center */}
          <div className="md:pl-6 lg:pl-10">
            {/* Editorial Display Typography Stack */}
            <motion.h1
              {...fadeUp(0.08)}
              className="font-display uppercase tracking-tight text-white mb-5 select-none"
            >
              <span className="block text-[clamp(32px,3.8vw,50px)] font-semibold tracking-wider text-slate-200 leading-[1.02]">
                AI THAT RUNS YOUR
              </span>
              <span className="block text-[clamp(76px,10vw,135px)] leading-[0.85] font-black text-[#F97316] drop-shadow-[0_4px_35px_rgba(249,115,22,0.3)] my-1">
                SCRUM
              </span>
              <span className="block text-[clamp(32px,3.8vw,50px)] font-semibold tracking-wider text-slate-200 leading-[1.05]">
                MEETINGS & SPRINTS.
              </span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.16)}
              className="text-[clamp(15px,1.5vw,17px)] text-[#A1A1AA] leading-[1.65] mb-7 max-w-[500px] font-normal"
            >
              Sprintive unifies meetings, tasks, and sprint management into one intelligence hub — so every standup ends with automated summaries, clear ownership, and zero friction.
            </motion.p>

            {/* Hero CTA Action Buttons */}
            <motion.div {...fadeUp(0.24)} className="flex gap-3.5 flex-wrap items-center">
              <Button
                variant="orange"
                size="lg"
                onClick={() => navigate('/signup')}
                className="gap-2 text-xs py-3 px-7"
              >
                <Zap size={15} strokeWidth={2.5} /> Start Free Trial
              </Button>

              <Button
                variant="neutral"
                size="lg"
                className="gap-2 text-xs py-3 px-7"
              >
                <Play size={15} strokeWidth={2.5} /> Watch Demo
              </Button>
            </motion.div>
          </div>

          {/* Right Column — Wider Product Showcase, Centered */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            className="flex justify-center items-center w-full"
          >
            <div className="relative w-full max-w-[500px]">
              <div
                className="absolute inset-[-1px] rounded-[18px] z-0 blur-[1px]"
                style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.25), rgba(253,186,116,0.15), transparent)' }}
              />
              <div className="bg-[#0F0F10]/95 backdrop-blur-[24px] border-2 border-[#262626] rounded-[18px] p-3.5 relative z-10 shadow-[4px_4px_0px_#000000]">
                <MeetingCard />
                <SummaryCard />
                <SprintCard />
              </div>

              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-[14px] -right-[10px] z-20 bg-[#F97316] rounded px-3 py-1.5 border-2 border-black shadow-[2.5px_2.5px_0px_#000000]"
              >
                <div className="text-[10px] font-extrabold text-white uppercase tracking-wider">✨ Summary Ready</div>
                <div className="text-[9px] text-white/80 mt-px font-semibold">3 action items found</div>
              </motion.div>

              <motion.div
                animate={{ y: [4, -4, 4] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-[12px] -left-[10px] z-20 bg-[#111111] border-2 border-[#262626] rounded px-3 py-1.5 shadow-[2.5px_2.5px_0px_#000000]"
              >
                <div className="text-[10px] font-extrabold text-[#10B981] uppercase tracking-wider">✅ Sprint Updated</div>
                <div className="text-[9px] text-[#A1A1AA] mt-px font-semibold">Board synced</div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
