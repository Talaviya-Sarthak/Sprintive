import { motion } from 'framer-motion';
import { Video, Mic, FileText, Bot, Ticket, BarChart3, Calendar, MessageSquare, Bell, FolderOpen, TrendingUp, Shield, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
}

const features: Feature[] = [
  { icon: Video,         title: 'Built-in Video Meetings',     desc: 'Host standups, planning sessions, and retros directly in ScrumMind — no extra tools needed.',                    color: '#3B82F6' },
  { icon: Mic,           title: 'Automatic Meeting Recording', desc: 'Every meeting is recorded and stored so your team can revisit any discussion at any time.',                       color: '#06B6D4' },
  { icon: FileText,      title: 'Meeting Summaries',           desc: 'Get a clean, organized summary after every meeting with key points and decisions highlighted.',                   color: '#3B82F6' },
  { icon: Bot,           title: 'Smart Action Items',          desc: 'ScrumMind picks up on tasks, responsibilities, and deadlines discussed during your meeting.',                     color: '#8B5CF6' },
  { icon: Ticket,        title: 'Task Management',             desc: 'Create, assign, and track tasks directly from your meeting summary with one click.',                             color: '#06B6D4' },
  { icon: BarChart3,     title: 'Sprint Analytics',            desc: "Visual dashboards that show your team's progress, sprint health, and upcoming milestones.",                      color: '#3B82F6' },
  { icon: Calendar,      title: 'Meeting Scheduler',           desc: 'Schedule recurring standups, planning sessions, and reviews with your whole team in seconds.',                   color: '#10B981' },
  { icon: MessageSquare, title: 'Team Chat',                   desc: 'Stay connected between meetings with threaded conversations tied to tasks and sprints.',                         color: '#06B6D4' },
  { icon: Bell,          title: 'Smart Notifications',         desc: 'Get timely reminders for upcoming meetings, deadlines, and tasks assigned to you.',                              color: '#F59E0B' },
  { icon: FolderOpen,    title: 'Meeting History',             desc: 'Browse a full archive of past meetings, summaries, and decisions whenever you need them.',                       color: '#3B82F6' },
  { icon: TrendingUp,    title: 'Productivity Insights',       desc: 'Understand how your team works and where time is being spent across sprints.',                                   color: '#10B981' },
  { icon: Shield,        title: 'Enterprise Security',         desc: 'Your data is protected with end-to-end encryption, SSO, and role-based access controls.',                       color: '#8B5CF6' },
];

export default function Features() {
  return (
    <section id="features" className="py-28 max-sm:py-18">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] rounded-full text-[11px] font-semibold text-[#3B82F6] uppercase tracking-[0.07em] mb-5">
            <Sparkles size={11} /> Features
          </div>
          <h2 className="text-[clamp(28px,3.8vw,46px)] font-extrabold text-[var(--color-text-h)] leading-[1.12] tracking-[-0.025em] mb-4">
            Everything Your Agile Team<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] bg-clip-text text-transparent">
              Will Ever Need
            </span>
          </h2>
          <p className="text-[clamp(15px,1.8vw,17px)] text-[var(--color-text-body)] max-w-[560px] mx-auto leading-[1.75]">
            One platform that replaces your meeting tool, note-taking app, project tracker, and analytics dashboard.
          </p>
        </motion.div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                whileHover={{ y: -4, boxShadow: '0 4px 16px rgba(0,0,0,0.4),0 2px 6px rgba(0,0,0,0.3)' }}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 cursor-default relative overflow-hidden transition-all duration-200 hover:border-[var(--color-border2)]"
              >
                <div
                  className="absolute top-0 right-0 w-16 h-16 rounded-[0_12px_0_64px]"
                  style={{ background: `radial-gradient(circle at top right, ${f.color}18, transparent)` }}
                />
                <div
                  className="w-11 h-11 rounded-[11px] flex items-center justify-center mb-4"
                  style={{ background: `${f.color}14`, border: `1px solid ${f.color}28` }}
                >
                  <Icon size={20} color={f.color} strokeWidth={1.8} />
                </div>
                <h3 className="text-[15px] font-bold text-[var(--color-text-h)] mb-2 tracking-[-0.01em]">{f.title}</h3>
                <p className="text-[13.5px] text-[var(--color-text-body)] leading-[1.65]">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
