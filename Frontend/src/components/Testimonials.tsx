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
    <section id="testimonials" className="py-28 max-sm:py-18 bg-[var(--color-bg2)]">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] rounded-full text-[11px] font-semibold text-[#3B82F6] uppercase tracking-[0.07em] mb-5">
            <Quote size={11} /> Testimonials
          </div>
          <h2 className="text-[clamp(28px,3.8vw,46px)] font-extrabold text-[var(--color-text-h)] leading-[1.12] tracking-[-0.025em] mb-4">
            Loved by Agile Teams<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] bg-clip-text text-transparent">
              Worldwide
            </span>
          </h2>
          <p className="text-[clamp(15px,1.8vw,17px)] text-[var(--color-text-body)] max-w-[560px] mx-auto leading-[1.75]">
            Join hundreds of teams who've transformed their Agile workflow with ScrumMind.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {visible.map((t, i) => (
              <motion.div
                key={`${t.name}-${current}`}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.97 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
                whileHover={{ y: -6, boxShadow: '0 4px 16px rgba(0,0,0,0.4),0 2px 6px rgba(0,0,0,0.3)' }}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 relative overflow-hidden transition-all duration-200 hover:border-[var(--color-border2)]"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${t.color}, transparent)` }} />

                <div className="flex gap-[3px] mb-3.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={13} color="#F59E0B" fill="#F59E0B" />
                  ))}
                </div>

                <p className="text-sm text-[var(--color-text-body)] leading-[1.72] mb-5 italic">
                  "{t.quote}"
                </p>

                <div className="flex items-center gap-[11px]">
                  <div
                    className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[13px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}99)` }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--color-text-h)] tracking-[-0.01em]">{t.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-px">{t.role} · {t.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex justify-center items-center gap-3.5 mt-8">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={prev}
            className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] cursor-pointer flex items-center justify-center text-[var(--color-text-h)] transition-all duration-200 hover:border-[var(--color-border2)]"
          >
            <ChevronLeft size={16} />
          </motion.button>
          <div className="flex gap-1.5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => { setAuto(false); setCurrent(i); }}
                className="h-[7px] rounded-full border-none cursor-pointer transition-all duration-300 p-0"
                style={{
                  width: i === current ? 20 : 7,
                  background: i === current ? '#3B82F6' : 'var(--color-border)',
                }}
              />
            ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={next}
            className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] cursor-pointer flex items-center justify-center text-[var(--color-text-h)] transition-all duration-200 hover:border-[var(--color-border2)]"
          >
            <ChevronRight size={16} />
          </motion.button>
        </div>
      </div>
    </section>
  );
}
