import { motion } from 'framer-motion';
import { Video, Mic, FileText, Bot, Ticket, BarChart3, Calendar, MessageSquare, Bell, FolderOpen, TrendingUp, Shield, Sparkles } from 'lucide-react';

const features = [
  { icon: Video,        title: 'Built-in Video Meetings',     desc: 'Host standups, planning sessions, and retros directly in ScrumMind — no extra tools needed.',                    color: '#3B82F6' },
  { icon: Mic,          title: 'Automatic Meeting Recording', desc: 'Every meeting is recorded and stored so your team can revisit any discussion at any time.',                       color: '#06B6D4' },
  { icon: FileText,     title: 'Meeting Summaries',           desc: 'Get a clean, organized summary after every meeting with key points and decisions highlighted.',                   color: '#3B82F6' },
  { icon: Bot,          title: 'Smart Action Items',          desc: 'ScrumMind picks up on tasks, responsibilities, and deadlines discussed during your meeting.',                     color: '#8B5CF6' },
  { icon: Ticket,       title: 'Task Management',             desc: 'Create, assign, and track tasks directly from your meeting summary with one click.',                             color: '#06B6D4' },
  { icon: BarChart3,    title: 'Sprint Analytics',            desc: "Visual dashboards that show your team's progress, sprint health, and upcoming milestones.",                      color: '#3B82F6' },
  { icon: Calendar,     title: 'Meeting Scheduler',           desc: 'Schedule recurring standups, planning sessions, and reviews with your whole team in seconds.',                   color: '#10B981' },
  { icon: MessageSquare,title: 'Team Chat',                   desc: 'Stay connected between meetings with threaded conversations tied to tasks and sprints.',                         color: '#06B6D4' },
  { icon: Bell,         title: 'Smart Notifications',         desc: 'Get timely reminders for upcoming meetings, deadlines, and tasks assigned to you.',                              color: '#F59E0B' },
  { icon: FolderOpen,   title: 'Meeting History',             desc: 'Browse a full archive of past meetings, summaries, and decisions whenever you need them.',                       color: '#3B82F6' },
  { icon: TrendingUp,   title: 'Productivity Insights',       desc: 'Understand how your team works and where time is being spent across sprints.',                                   color: '#10B981' },
  { icon: Shield,       title: 'Enterprise Security',         desc: 'Your data is protected with end-to-end encryption, SSO, and role-based access controls.',                       color: '#8B5CF6' },
];

export default function Features() {
  return (
    <section id="features">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <div className="section-tag"><Sparkles size={11} /> Features</div>
          <h2 className="section-title">Everything Your Agile Team<br /><span className="glow-text">Will Ever Need</span></h2>
          <p className="section-sub">One platform that replaces your meeting tool, note-taking app, project tracker, and analytics dashboard.</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(272px, 1fr))', gap: 16 }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.5 }}
                whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
                className="card"
                style={{ padding: '24px', cursor: 'default', position: 'relative', overflow: 'hidden' }}
              >
                {/* Subtle corner accent */}
                <div style={{
                  position: 'absolute', top: 0, right: 0, width: 64, height: 64,
                  background: `radial-gradient(circle at top right, ${f.color}18, transparent)`,
                  borderRadius: '0 12px 0 64px',
                }} />

                <div style={{
                  width: 44, height: 44, borderRadius: 11,
                  background: `${f.color}14`, border: `1px solid ${f.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}>
                  <Icon size={20} color={f.color} strokeWidth={1.8} />
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)', marginBottom: 8, letterSpacing: '-0.01em' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.65 }}>{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
