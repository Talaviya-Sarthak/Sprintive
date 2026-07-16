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
    <section id="how-it-works" className="section-alt">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 72 }}
        >
          <div className="section-tag">🗺️ How It Works</div>
          <h2 className="section-title">Everything You Need,<br /><span className="glow-text">From Day One</span></h2>
          <p className="section-sub">Sign up today and you'll be running your first AI-powered meeting in under 5 minutes.</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="journey-grid">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isLastInRow = (i + 1) % 3 === 0;
            return (
              <div key={step.num} style={{ position: 'relative' }}>
                <motion.div
                  initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-48px' }}
                  transition={{ duration: 0.5, delay: i * 0.09 }}
                  whileHover={{ y: -6, boxShadow: 'var(--shadow-md)' }}
                  className="card"
                  style={{ padding: '28px 24px', height: '100%', position: 'relative', overflow: 'hidden' }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${step.color}, transparent)` }} />

                  <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, fontWeight: 700, color: step.color, background: `${step.color}14`, border: `1px solid ${step.color}28`, borderRadius: 99, padding: '3px 9px', letterSpacing: '0.04em' }}>{step.num}</div>

                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    style={{ width: 56, height: 56, borderRadius: 14, background: `${step.color}12`, border: `1px solid ${step.color}24`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, transition: 'all 0.2s ease' }}
                  >
                    <Icon size={24} color={step.color} strokeWidth={1.7} />
                  </motion.div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, letterSpacing: '-0.015em', lineHeight: 1.3 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.7 }}>{step.desc}</p>
                </motion.div>

                {!isLastInRow && i < steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }} whileInView={{ opacity: 1, scaleX: 1 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.09 + 0.35 }}
                    className="step-arrow"
                    style={{ position: 'absolute', top: '50%', right: -14, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 1, transformOrigin: 'left', zIndex: 10 }}
                  >
                    <div style={{ width: 14, height: 1.5, background: 'var(--border2)', borderRadius: 1 }} />
                    <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid var(--border2)' }} />
                  </motion.div>
                )}

                {i === 2 && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0 }} whileInView={{ opacity: 1, scaleY: 1 }}
                    viewport={{ once: true }} transition={{ delay: 0.5 }}
                    className="step-arrow"
                    style={{ position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, transformOrigin: 'top', zIndex: 10 }}
                  >
                    <div style={{ width: 1.5, height: 14, background: 'var(--border2)', borderRadius: 1 }} />
                    <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid var(--border2)' }} />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ delay: 0.3 }}
          style={{ textAlign: 'center', marginTop: 48, fontSize: 14, color: 'var(--text-muted)' }}
        >
          That's it. No training required. Your team will feel at home from the very first meeting.
        </motion.p>
      </div>

      <style>{`
        @media (max-width: 860px)  { .journey-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 540px)  { .journey-grid { grid-template-columns: 1fr !important; } .step-arrow { display: none !important; } }
      `}</style>
    </section>
  );
}
