import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface CounterProps {
  target: number;
  suffix?: string;
  duration?: number;
}

function Counter({ target, suffix = '%', duration = 2 }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

interface Stat {
  value: number;
  suffix: string;
  label: string;
  desc: string;
}

interface Benefit {
  icon: string;
  title: string;
  desc: string;
}

const stats: Stat[] = [
  { value: 95, suffix: '%', label: 'Reduction in Manual Scrum Work',  desc: 'Teams spend 95% less time on administrative Agile tasks.' },
  { value: 90, suffix: '%', label: 'Automatic Ticket Creation',        desc: '9 out of 10 tickets are created automatically from meetings.' },
  { value: 4,  suffix: '×', label: 'Faster Sprint Planning',           desc: 'Sprint planning sessions are 4x faster with AI pre-populated backlogs.' },
  { value: 80, suffix: '%', label: 'Less Meeting Documentation',       desc: 'AI handles 80% of all meeting documentation automatically.' },
];

const benefits: Benefit[] = [
  { icon: '🚀', title: 'Ship Faster',         desc: 'Eliminate the overhead of manual Agile processes and focus on building.' },
  { icon: '🎯', title: 'Zero Missed Tasks',    desc: 'AI captures every action item, blocker, and deadline from every meeting.' },
  { icon: '🔄', title: 'Always in Sync',       desc: 'Your Kanban board, backlog, and sprint are always up to date automatically.' },
  { icon: '📊', title: 'Data-Driven Sprints',  desc: 'Make sprint decisions based on real velocity data and AI insights.' },
];

export default function Benefits() {
  return (
    <section className="py-28 max-sm:py-18 bg-transparent">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-18"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] rounded-full text-[11px] font-semibold text-[#3B82F6] uppercase tracking-[0.07em] mb-5">
            <TrendingUp size={11} /> Results
          </div>
          <h2 className="text-[clamp(28px,3.8vw,46px)] font-extrabold text-[var(--color-text-h)] leading-[1.12] tracking-[-0.025em] mb-4">
            Real Results for<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] bg-clip-text text-transparent">
              Real Agile Teams
            </span>
          </h2>
          <p className="text-[clamp(15px,1.8vw,17px)] text-[var(--color-text-body)] max-w-[560px] mx-auto leading-[1.75]">
            Teams using ScrumMind report dramatic improvements in productivity and sprint efficiency.
          </p>
        </motion.div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 mb-16">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.09 }}
              whileHover={{ y: -4, boxShadow: '0 4px 16px rgba(0,0,0,0.4),0 2px 6px rgba(0,0,0,0.3)' }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-6 py-7 text-center relative overflow-hidden transition-all duration-200 hover:border-[var(--color-border2)]"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #3B82F6, #06B6D4)' }} />
              <div className="text-[clamp(38px,5vw,52px)] font-extrabold leading-none mb-2.5 tracking-[-0.03em]">
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)' }}>
                  <Counter target={s.value} suffix={s.suffix} />
                </span>
              </div>
              <div className="text-sm font-bold text-[var(--color-text-h)] mb-2 tracking-[-0.01em]">{s.label}</div>
              <div className="text-[13px] text-[var(--color-text-body)] leading-[1.6]">{s.desc}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.09 }}
              whileHover={{ y: -4, boxShadow: '0 4px 16px rgba(0,0,0,0.4),0 2px 6px rgba(0,0,0,0.3)' }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex gap-4 px-5 py-[22px] transition-all duration-200 hover:border-[var(--color-border2)]"
            >
              <div className="text-[26px] shrink-0 leading-none">{b.icon}</div>
              <div>
                <h3 className="text-[15px] font-bold text-[var(--color-text-h)] mb-[7px] tracking-[-0.01em]">{b.title}</h3>
                <p className="text-[13.5px] text-[var(--color-text-body)] leading-[1.65]">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
