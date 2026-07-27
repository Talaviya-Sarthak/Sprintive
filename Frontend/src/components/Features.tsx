import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { BreakableCard } from './ui/features-card';

interface Feature {
  title: string;
  desc: string;
}

const features: Feature[] = [
  { title: 'Video Meetings',     desc: 'Host standups, planning sessions, and retros directly in Sprintive — no extra tools needed.' },
  { title: 'Auto Recording',     desc: 'Every meeting is recorded and stored so your team can revisit any discussion at any time.' },
  { title: 'AI Summaries',       desc: 'Get clean, organized meeting summaries with key points and decisions automatically highlighted.' },
  { title: 'Smart Tasks',        desc: 'Extract action items, responsibilities, and deadlines directly from meeting conversations.' },
  { title: 'Sprint Analytics',   desc: "Visual dashboards tracking team progress, sprint velocity, and upcoming milestones." },
  { title: 'Team Chat',          desc: 'Stay connected between meetings with threaded discussions tied directly to tasks and sprints.' },
];

export default function Features() {
  return (
    <section id="features" className="py-24 max-sm:py-16 bg-transparent">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[rgba(249,115,22,0.1)] border border-[rgba(249,115,22,0.25)] rounded-full text-xs font-semibold text-[#F97316] uppercase tracking-wider mb-4">
            <Sparkles size={13} /> Features
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[var(--color-text-h)] tracking-tight mb-3">
            Built for High-Velocity Agile Teams
          </h2>
          <p className="text-base sm:text-lg text-[var(--color-text-body)] max-w-xl mx-auto leading-relaxed">
            Everything your team needs to run seamless meetings, track sprints, and execute faster.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="h-64 w-full"
            >
              <BreakableCard
                title={f.title}
                description={f.desc}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest pointer-events-none select-none">
          Shake cards to break them free
        </div>
      </div>
    </section>
  );
}
