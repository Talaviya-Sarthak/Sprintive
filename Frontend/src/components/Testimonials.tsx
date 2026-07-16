import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  color: string;
  quote: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  { name: 'Priya Sharma',   role: 'Product Manager',  company: 'TechStartup', avatar: 'PS', color: '#3B82F6', quote: 'ScrumMind saves us nearly 8 hours every week. The AI-generated meeting summaries are incredibly accurate and our team actually reads them.',                                                                rating: 5 },
  { name: 'Marcus Chen',    role: 'Scrum Master',      company: 'EnterpriseX', avatar: 'MC', color: '#06B6D4', quote: 'The AI-generated tasks are incredibly accurate. It catches things that even I miss during standups. Our sprint completion rate went from 70% to 94%.',                                                    rating: 5 },
  { name: 'Sarah Johnson',  role: 'Engineering Lead',  company: 'RemoteFirst', avatar: 'SJ', color: '#8B5CF6', quote: 'We completely stopped writing meeting notes manually. The AI understands context so well that it even identifies implicit blockers from the conversation.',                                               rating: 5 },
  { name: 'Arjun Patel',    role: 'Founder & CEO',     company: 'ProductLab',  avatar: 'AP', color: '#10B981', quote: "It feels like having an AI project manager on the team. ScrumMind has transformed how we run Agile. I can't imagine going back to manual processes.",                                                  rating: 5 },
  { name: 'Emma Rodriguez', role: 'VP Engineering',    company: 'ScaleUp',     avatar: 'ER', color: '#F59E0B', quote: 'The Kanban board updates automatically after every standup. Our developers love it because they spend zero time on ticket management now.',                                                             rating: 5 },
  { name: 'David Kim',      role: 'CTO',               company: 'DevForge',    avatar: 'DK', color: '#06B6D4', quote: "Enterprise security was our main concern. ScrumMind's SOC 2 compliance and end-to-end encryption gave us the confidence to roll it out company-wide.",                                                rating: 5 },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % testimonials.length), 4500);
    return () => clearInterval(t);
  }, [auto]);

  const prev = () => { setAuto(false); setCurrent(c => (c - 1 + testimonials.length) % testimonials.length); };
  const next = () => { setAuto(false); setCurrent(c => (c + 1) % testimonials.length); };

  const visible = [0, 1, 2].map(offset => testimonials[(current + offset) % testimonials.length]);

  return (
    <section id="testimonials" className="section-alt">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="section-tag"><Quote size={11} /> Testimonials</div>
          <h2 className="section-title">Loved by Agile Teams<br /><span className="glow-text">Worldwide</span></h2>
          <p className="section-sub">Join hundreds of teams who've transformed their Agile workflow with ScrumMind.</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="testimonial-grid">
          <AnimatePresence mode="popLayout">
            {visible.map((t, i) => (
              <motion.div key={`${t.name}-${current}`}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.97 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                whileHover={{ y: -6, boxShadow: 'var(--shadow-md)' }}
                className="card"
                style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${t.color}, transparent)` }} />

                <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                  {Array.from({ length: t.rating }).map((_, j) => <Star key={j} size={13} color="#F59E0B" fill="#F59E0B" />)}
                </div>

                <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.72, marginBottom: 20, fontStyle: 'italic' }}>
                  "{t.quote}"
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${t.color}, ${t.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.01em' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{t.role} · {t.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 32 }}>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={prev}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-h)', transition: 'all 0.2s' }}>
            <ChevronLeft size={16} />
          </motion.button>
          <div style={{ display: 'flex', gap: 6 }}>
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => { setAuto(false); setCurrent(i); }}
                style={{ width: i === current ? 20 : 7, height: 7, borderRadius: 99, background: i === current ? 'var(--primary)' : 'var(--border)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0 }} />
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={next}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-h)', transition: 'all 0.2s' }}>
            <ChevronRight size={16} />
          </motion.button>
        </div>
      </div>
      <style>{`@media (max-width: 768px) { .testimonial-grid { grid-template-columns: 1fr !important; } .testimonial-grid > *:not(:first-child) { display: none; } }`}</style>
    </section>
  );
}
