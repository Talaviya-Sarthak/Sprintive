import { motion } from 'framer-motion';
import { Users, CalendarPlus, MessageCircle, FileText, LayoutDashboard, Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  color: string;
  num: string;
  title: string;
  desc: string;
}

const steps: Step[] = [
  { icon: Users,           color: '#3B82F6', num: '01', title: 'Create Your Workspace',        desc: 'Set up your company workspace and invite your team members in just a few clicks.' },
  { icon: CalendarPlus,    color: '#06B6D4', num: '02', title: 'Schedule or Start a Meeting',  desc: 'Create standups, sprint planning, or retrospectives — or jump into an instant meeting anytime.' },
  { icon: MessageCircle,   color: '#8B5CF6', num: '03', title: 'Collaborate with Your Team',   desc: 'Discuss progress, blockers, and sprint goals while everyone stays connected in one place.' },
  { icon: FileText,        color: '#10B981', num: '04', title: 'Review Your Meeting Summary',  desc: 'Get an organized summary with action items, responsibilities, deadlines, and key decisions.' },
  { icon: LayoutDashboard, color: '#F59E0B', num: '05', title: 'Manage Your Sprint',           desc: 'Track tasks, monitor progress, and keep projects moving using the built-in workspace.' },
  { icon: Bell,            color: '#06B6D4', num: '06', title: 'Stay Updated',                 desc: 'Receive notifications, revisit past meetings, and keep your entire team aligned all sprint long.' },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 max-sm:py-18 bg-transparent">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-18"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(249,115,22,0.1)] border border-[rgba(249,115,22,0.25)] rounded-full text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.07em] mb-5">
            🗺️ How It Works
          </div>
          <h2 className="text-[clamp(28px,3.8vw,46px)] font-extrabold text-[var(--color-text-h)] leading-[1.12] tracking-[-0.025em] mb-4">
            Everything You Need,<br />
            <span className="bg-gradient-to-r from-[#F97316] to-[#FDBA74] bg-clip-text text-transparent">
              From Day One
            </span>
          </h2>
          <p className="text-[clamp(15px,1.8vw,17px)] text-[var(--color-text-body)] max-w-[560px] mx-auto leading-[1.75]">
            Sign up today and you'll be running your first AI-powered meeting in under 5 minutes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isLastInRow = (i + 1) % 3 === 0;
            return (
              <div key={step.num} className="relative">
                <motion.div
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-48px' }}
                  transition={{ duration: 0.5, delay: i * 0.09 }}
                  whileHover={{ y: -6, boxShadow: '0 4px 16px rgba(0,0,0,0.4),0 2px 6px rgba(0,0,0,0.3)' }}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-7 h-full relative overflow-hidden transition-all duration-200 hover:border-[var(--color-border2)]"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${step.color}, transparent)` }} />
                  <div
                    className="absolute top-4 right-4 text-[10px] font-bold rounded-full px-[9px] py-[3px] tracking-[0.04em]"
                    style={{ color: step.color, background: `${step.color}14`, border: `1px solid ${step.color}28` }}
                  >
                    {step.num}
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    className="w-14 h-14 rounded-[14px] flex items-center justify-center mb-5 transition-all duration-200"
                    style={{ background: `${step.color}12`, border: `1px solid ${step.color}24` }}
                  >
                    <Icon size={24} color={step.color} strokeWidth={1.7} />
                  </motion.div>
                  <h3 className="text-base font-bold text-[var(--color-text-h)] mb-2.5 tracking-[-0.015em] leading-[1.3]">{step.title}</h3>
                  <p className="text-[13.5px] text-[var(--color-text-body)] leading-[1.7]">{step.desc}</p>
                </motion.div>

                {/* Horizontal arrow (desktop only, not last in row) */}
                {!isLastInRow && i < steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.09 + 0.35 }}
                    className="hidden lg:flex absolute top-1/2 -right-3.5 -translate-y-1/2 items-center gap-px origin-left z-10"
                  >
                    <div className="w-3.5 h-[1.5px] bg-[var(--color-border2)] rounded-sm" />
                    <div className="w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-[var(--color-border2)]" />
                  </motion.div>
                )}

                {/* Down arrow after step 3 */}
                {i === 2 && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0 }}
                    whileInView={{ opacity: 1, scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="hidden lg:flex absolute -bottom-[18px] left-1/2 -translate-x-1/2 flex-col items-center gap-px origin-top z-10"
                  >
                    <div className="w-[1.5px] h-3.5 bg-[var(--color-border2)] rounded-sm" />
                    <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-[var(--color-border2)]" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12 text-sm text-[var(--color-text-muted)]"
        >
          That's it. No training required. Your team will feel at home from the very first meeting.
        </motion.p>
      </div>
    </section>
  );
}
