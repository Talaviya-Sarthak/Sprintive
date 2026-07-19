import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const rows: string[] = [
  'Meeting Recording',
  'AI Task Detection',
  'Auto Ticket Creation',
  'AI Meeting Summary',
  'Sprint Analytics',
  'Team Chat',
  'Kanban Board',
  'Automated Reports',
  'Smart Notifications',
  'Speaker Identification',
  'Blocker Detection',
  'Productivity Insights',
];

const scrumMind: boolean[] = [true, true, true, true, true, true, true, true, true, true, true, true];
const manual: boolean[]    = [false, false, false, false, false, true, true, false, false, false, false, false];

export default function ComparisonTable() {
  return (
    <section className="py-28 max-sm:py-18">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] rounded-full text-[11px] font-semibold text-[#3B82F6] uppercase tracking-[0.07em] mb-5">
            ⚡ Comparison
          </div>
          <h2 className="text-[clamp(28px,3.8vw,46px)] font-extrabold text-[var(--color-text-h)] leading-[1.12] tracking-[-0.025em] mb-4">
            ScrumMind vs<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)' }}>
              Traditional Scrum
            </span>
          </h2>
          <p className="text-[clamp(15px,1.8vw,17px)] text-[var(--color-text-body)] max-w-[560px] mx-auto leading-[1.75]">
            See why teams are switching from manual Agile processes to AI-powered automation.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
        >
          <div className="grid grid-cols-3 bg-[rgba(93,214,255,0.06)] border-b border-[var(--color-border)]">
            <div className="px-7 py-5 text-sm font-bold text-[var(--color-text-muted)]">Feature</div>
            <div className="px-7 py-5 text-center border-l border-[var(--color-border)]">
              <div className="text-base font-extrabold text-[#3B82F6]">🤖 ScrumMind</div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">AI-Powered</div>
            </div>
            <div className="px-7 py-5 text-center border-l border-[var(--color-border)]">
              <div className="text-base font-extrabold text-[var(--color-text-body)]">📋 Manual Scrum</div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Traditional</div>
            </div>
          </div>

          {rows.map((row, i) => (
            <motion.div
              key={row}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`grid grid-cols-3 hover:bg-[rgba(93,214,255,0.03)] transition-colors ${i < rows.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}
            >
              <div className="px-7 py-4 text-sm text-[var(--color-text-h)] font-medium">{row}</div>
              <div className="px-7 py-4 text-center border-l border-[var(--color-border)] flex items-center justify-center">
                {scrumMind[i] && (
                  <div className="w-7 h-7 rounded-full bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center">
                    <Check size={14} color="#22C55E" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="px-7 py-4 text-center border-l border-[var(--color-border)] flex items-center justify-center">
                {manual[i] ? (
                  <div className="w-7 h-7 rounded-full bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center">
                    <Check size={14} color="#22C55E" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] flex items-center justify-center">
                    <X size={14} color="#EF4444" strokeWidth={3} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
