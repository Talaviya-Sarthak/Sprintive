import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

function Counter({ target, suffix = '%', duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
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

const stats = [
  { value: 95, suffix: '%', label: 'Reduction in Manual Scrum Work',  desc: 'Teams spend 95% less time on administrative Agile tasks.' },
  { value: 90, suffix: '%', label: 'Automatic Ticket Creation',        desc: '9 out of 10 tickets are created automatically from meetings.' },
  { value: 4,  suffix: '×', label: 'Faster Sprint Planning',           desc: 'Sprint planning sessions are 4x faster with AI pre-populated backlogs.' },
  { value: 80, suffix: '%', label: 'Less Meeting Documentation',       desc: 'AI handles 80% of all meeting documentation automatically.' },
];

const benefits = [
  { icon: '🚀', title: 'Ship Faster',         desc: 'Eliminate the overhead of manual Agile processes and focus on building.' },
  { icon: '🎯', title: 'Zero Missed Tasks',    desc: 'AI captures every action item, blocker, and deadline from every meeting.' },
  { icon: '🔄', title: 'Always in Sync',       desc: 'Your Kanban board, backlog, and sprint are always up to date automatically.' },
  { icon: '📊', title: 'Data-Driven Sprints',  desc: 'Make sprint decisions based on real velocity data and AI insights.' },
];

export default function Benefits() {
  return (
    <section>
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 72 }}>
          <div className="section-tag"><TrendingUp size={11} /> Results</div>
          <h2 className="section-title">Real Results for<br /><span className="glow-text">Real Agile Teams</span></h2>
          <p className="section-sub">Teams using ScrumMind report dramatic improvements in productivity and sprint efficiency.</p>
        </motion.div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 64 }}>
          {stats.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.09 }}
              whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
              className="card"
              style={{ padding: '28px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--primary), var(--accent))' }} />
              <div style={{ fontSize: 'clamp(38px, 5vw, 52px)', fontWeight: 800, lineHeight: 1, marginBottom: 10, letterSpacing: '-0.03em' }}>
                <span className="glow-text"><Counter target={s.value} suffix={s.suffix} /></span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)', marginBottom: 8, letterSpacing: '-0.01em' }}>{s.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{s.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Benefits */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {benefits.map((b, i) => (
            <motion.div key={b.title}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.09 }}
              whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
              className="card"
              style={{ display: 'flex', gap: 16, padding: '22px 20px' }}
            >
              <div style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>{b.icon}</div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)', marginBottom: 7, letterSpacing: '-0.01em' }}>{b.title}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.65 }}>{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
