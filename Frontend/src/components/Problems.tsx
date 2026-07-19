import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface Problem {
  icon: string;
  title: string;
  desc: string;
}

const problems: Problem[] = [
  { icon: '📝', title: 'Manual Note Taking',       desc: 'Engineers waste 30+ minutes per meeting writing notes instead of building.' },
  { icon: '🗑️', title: 'Forgotten Action Items',   desc: 'Critical tasks get lost in chat threads and never make it to the backlog.' },
  { icon: '🎥', title: 'No Meeting Recordings',    desc: 'Team members who miss meetings have no way to catch up on decisions.' },
  { icon: '💬', title: 'Lost Discussions',          desc: 'Valuable context from standups disappears with no searchable archive.' },
  { icon: '🔄', title: 'Jira Updates Done Manually', desc: 'Developers spend hours updating tickets instead of writing code.' },
  { icon: '📊', title: 'Difficult Sprint Tracking', desc: 'No real-time visibility into sprint progress, blockers, or velocity.' },
];

export default function Problems() {
  return (
    <section className="bg-[var(--color-bg2)] py-28 max-sm:py-18">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] rounded-full text-[11px] font-semibold text-[#3B82F6] uppercase tracking-[0.07em] mb-5">
            <AlertCircle size={12} /> The Problem
          </div>
          <h2 className="text-[clamp(28px,3.8vw,46px)] font-extrabold text-[var(--color-text-h)] leading-[1.12] tracking-[-0.025em] mb-4">
            Scrum Meetings Waste<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] bg-clip-text text-transparent">
              Too Much Time
            </span>
          </h2>
          <p className="text-[clamp(15px,1.8vw,17px)] text-[var(--color-text-body)] max-w-[560px] mx-auto leading-[1.75]">
            Your team is spending more time managing Agile processes than actually building. Here's what's broken.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {problems.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6, borderColor: 'rgba(239,68,68,0.4)' }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-7 transition-all duration-300 cursor-default hover:border-red-500/40"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xl shrink-0">
                  {p.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base text-[#EF4444] font-bold">❌</span>
                    <h3 className="text-base font-bold text-[var(--color-text-h)]">{p.title}</h3>
                  </div>
                  <p className="text-sm text-[var(--color-text-body)] leading-relaxed">{p.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
