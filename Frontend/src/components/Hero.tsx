import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Play, CheckCircle2, Mic, Bot, CheckSquare, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] as const },
});

// Live Interactive AI Workflow Demo Loop Component
function LiveWorkflowDemo() {
  const [step, setStep] = useState(1);

  // 5-step automated workflow loop (~2.4s per step)
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev >= 5 ? 1 : prev + 1));
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-[460px] h-[480px] flex flex-col justify-between p-4 bg-[#111111] border-2 border-black rounded-[4px] shadow-[5px_5px_0px_0px_#F97316] select-none overflow-hidden">
      {/* Live Workflow Stage Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#262626] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
            Live AI Workflow Loop
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-[#F97316] uppercase tracking-widest bg-[rgba(249,115,22,0.1)] px-2 py-0.5 rounded-[2px] border border-[rgba(249,115,22,0.25)]">
          Stage 0{step} / 05
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-2.5 overflow-hidden py-2">
        {/* Step 1: Live Meeting Card (Always active for context) */}
        <div className="bg-[#1A1A1E] border border-[#262626] rounded-[4px] p-2.5 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
              <span className="text-xs font-bold text-white uppercase tracking-tight">Daily Scrum — Live</span>
            </div>
            <div className="flex items-center gap-1 bg-[#F97316]/10 border border-[#F97316]/30 px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold text-[#F97316]">
              <Mic size={9} className="animate-pulse" /> RECORDING
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {['Alex (Lead)', 'Sam (Dev)', 'Priya (PM)', 'David (QA)'].map((name, i) => (
              <div
                key={name}
                className={`p-1.5 rounded-[3px] border flex items-center gap-1.5 ${i === 0 ? 'bg-[#241A14] border-[#F97316]/40' : 'bg-[#111111] border-[#262626]'
                  }`}
              >
                <div className="w-4.5 h-4.5 rounded-full bg-[#F97316] text-white font-black text-[8px] flex items-center justify-center shrink-0">
                  {name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold text-white truncate">{name}</div>
                </div>
                {i === 0 && (
                  <div className="flex gap-0.5 items-end h-2.5 shrink-0">
                    {[4, 8, 10, 6].map((h, j) => (
                      <motion.div
                        key={j}
                        animate={{ height: [h, 12, h] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: j * 0.1 }}
                        className="w-[2px] bg-[#F97316] rounded-sm"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Transition Area for Steps 2, 3, 4 */}
        <div className="flex-1 flex flex-col gap-2 justify-center min-h-0 overflow-hidden">
          {/* Step 2+: Live Transcript Stream */}
          {step >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-[#1A1A1E] border border-[#262626] rounded-[4px] p-2.5 shrink-0"
            >
              <div className="text-[9px] font-mono uppercase tracking-wider text-[#A1A1AA] mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" /> Live Transcript Stream
              </div>
              <div className="font-mono text-[11px] text-white leading-tight space-y-1">
                <p className="truncate">
                  <span className="text-[#F97316] font-bold">Alex:</span> "I'll complete the authentication module by EOD."
                </p>
                {step >= 3 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                    <span className="text-[#A1A1AA] font-bold">Sam:</span> "Blocked on payment gateway access key."
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3+: AI Analysis & Decision Extraction */}
          {step >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-[#1A1A1E] border border-[#F97316]/40 rounded-[4px] p-2.5 shrink-0"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Bot size={13} className="text-[#F97316]" />
                <span className="text-[11px] font-bold text-white uppercase tracking-tight">AI Decision Extraction</span>
                <span className="ml-auto text-[8px] font-mono text-[#F97316] uppercase animate-pulse">Analyzing…</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { tag: '✓ Action Item', text: 'Auth Module' },
                  { tag: '🚫 Blocker', text: 'Payment Key' },
                  { tag: '📅 Deadline', text: 'Friday EOD' },
                ].map((chip) => (
                  <div
                    key={chip.tag}
                    className="flex items-center gap-1 bg-[#111111] border border-[#262626] px-1.5 py-0.5 rounded-[2px] text-[9px]"
                  >
                    <span className="font-mono font-bold text-[#F97316]">{chip.tag}:</span>
                    <span className="text-zinc-300 font-medium">{chip.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 4+: Sprint Board Synced */}
          {step >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-[#1A1A1E] border border-[#262626] rounded-[4px] p-2.5 shrink-0"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <CheckSquare size={12} className="text-[#F97316]" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-tight">Sprint Board Synced</span>
                </div>
                <span className="text-[9px] font-mono text-[#10B981] font-bold">↑ 2 Tickets Created</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { col: 'To Do', task: 'Payment Key', color: '#A1A1AA' },
                  { col: 'In Progress', task: 'Auth Module', color: '#F97316' },
                  { col: 'Done', task: 'Setup Repo', color: '#10B981' },
                ].map((c) => (
                  <div key={c.col} className="bg-[#111111] border border-[#262626] rounded-[2px] p-1">
                    <div className="text-[8px] font-mono font-bold uppercase mb-0.5" style={{ color: c.color }}>{c.col}</div>
                    <div className="text-[9px] text-white font-medium truncate bg-[#1D1D22] px-1 py-0.5 rounded-[1px] border border-[#262626]">
                      {c.task}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Step 5: Success Notification (Fixed height footer overlay) */}
      <AnimatePresence>
        {step === 5 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="shrink-0 bg-[#10B981] text-black border-2 border-black rounded-[3px] p-2 shadow-[2px_2px_0px_#000] flex items-center justify-between mt-1"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} strokeWidth={2.5} />
              <div>
                <div className="text-[11px] font-black uppercase leading-none">Sprint Updated & Synced</div>
                <div className="text-[9px] font-semibold opacity-90 leading-none mt-0.5">2 tasks added · Summary ready</div>
              </div>
            </div>
            <Sparkles size={13} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  return (
    <section id="hero" className="min-h-screen flex items-center relative overflow-hidden pt-24 md:pt-20 pb-12 bg-transparent">
      {/* Soft Radial Orange Glow behind main hero headline */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute w-[700px] h-[420px] rounded-full top-[10%] left-[50%] -translate-x-1/2 blur-[140px] opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.85) 0%, transparent 70%)' }}
        />
      </div>

      <div className="max-w-[1320px] mx-auto px-6 max-sm:px-4 relative z-10 w-full py-4 md:py-8 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* Left Column: Headline & Action CTAs */}
          <div className="md:pl-6 lg:pl-10">
            {/* Editorial Display Typography Stack */}
            <motion.h1
              {...fadeUp(0.08)}
              className="uppercase text-white mb-6 select-none"
            >
              <span className="block font-sans text-[clamp(36px,4.5vw,62px)] font-extrabold text-white tracking-tight leading-[0.95] mb-1">
                AI FOR
              </span>
              <span className="block font-display text-[clamp(105px,13.5vw,175px)] font-black text-[#F97316] leading-[0.8] tracking-tight my-1.5">
                SCRUM
              </span>
              <span className="block font-sans text-[clamp(36px,4.5vw,62px)] font-extrabold text-white tracking-tight leading-[0.95] mt-1">
                TEAMS.
              </span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.16)}
              className="font-mono text-[clamp(13px,1.2vw,15px)] text-[#CBD5E1] tracking-wide leading-[1.7] mb-8 max-w-[440px] font-normal"
            >
              AI meeting intelligence that turns conversations into organized sprints.
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

          {/* Right Column — Live Product AI Workflow Demonstration */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            className="flex justify-center items-center w-full"
          >
            <LiveWorkflowDemo />
          </motion.div>

        </div>
      </div>
    </section>
  );
}

