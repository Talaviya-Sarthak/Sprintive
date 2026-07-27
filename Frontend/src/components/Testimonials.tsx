import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Button } from './ui/Button';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  quote: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  { name: 'Priya Sharma',   role: 'Product Manager',  company: 'TechStartup', avatar: 'PS', quote: 'Sprintive saves us nearly 8 hours every week. The AI-generated meeting summaries are incredibly accurate and our team actually reads them.', rating: 5 },
  { name: 'Marcus Chen',    role: 'Scrum Master',      company: 'EnterpriseX', avatar: 'MC', quote: 'The AI-generated tasks are incredibly accurate. It catches things that even I miss during standups. Our sprint completion rate went from 70% to 94%.', rating: 5 },
  { name: 'Sarah Johnson',  role: 'Engineering Lead',  company: 'RemoteFirst', avatar: 'SJ', quote: 'We completely stopped writing meeting notes manually. The AI understands context so well that it even identifies implicit blockers from the conversation.', rating: 5 },
  { name: 'Arjun Patel',    role: 'Founder & CEO',     company: 'ProductLab',  avatar: 'AP', quote: "It feels like having an AI project manager on the team. Sprintive has transformed how we run Agile. I can't imagine going back to manual processes.", rating: 5 },
  { name: 'Emma Rodriguez', role: 'VP Engineering',    company: 'ScaleUp',     avatar: 'ER', quote: 'The Kanban board updates automatically after every standup. Our developers love it because they spend zero time on ticket management now.', rating: 5 },
  { name: 'David Kim',      role: 'CTO',               company: 'DevForge',    avatar: 'DK', quote: "Enterprise security was our main concern. Sprintive's SOC 2 compliance and end-to-end encryption gave us the confidence to roll it out company-wide.", rating: 5 },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, [auto]);

  const prev = () => { setAuto(false); setCurrent(c => (c - 1 + testimonials.length) % testimonials.length); };
  const next = () => { setAuto(false); setCurrent(c => (c + 1) % testimonials.length); };

  const visible = [0, 1, 2].map(offset => testimonials[(current + offset) % testimonials.length]);

  return (
    <section
      id="testimonials"
      className="py-24 max-sm:py-16 bg-transparent relative overflow-hidden"
      onMouseEnter={() => setAuto(false)}
      onMouseLeave={() => setAuto(true)}
    >
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 select-none"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#FFFFFF] tracking-tight uppercase leading-tight">
            LOVED BY<br />
            <span className="text-[#F97316]">MODERN TEAMS</span>
          </h2>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          <AnimatePresence mode="popLayout">
            {visible.map((t, i) => (
              <motion.div
                key={`${t.name}-${current}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
                className="h-full flex flex-col"
              >
                {/* Sharp Neo-Brutalist Card with Hard Offset Layer & Tactile Pressed Hover */}
                <div
                  className="
                    relative flex-1 flex flex-col justify-between p-6 
                    bg-[#111111] border-2 border-black rounded-[4px]
                    shadow-[4px_4px_0px_0px_#262626] 
                    hover:shadow-[1.5px_1.5px_0px_0px_#262626] hover:translate-x-[2.5px] hover:translate-y-[2.5px]
                    transition-all duration-150 ease-out select-none
                  "
                >
                  <div>
                    {/* Header: Subtle Rating Stars & Minimal Quote Icon */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#262626]">
                      <div className="flex gap-1">
                        {Array.from({ length: t.rating }).map((_, j) => (
                          <Star key={j} size={13} className="text-[#F97316] fill-[#F97316]" />
                        ))}
                      </div>
                      <Quote size={16} className="text-[#F97316] opacity-80" />
                    </div>

                    {/* Quote */}
                    <p className="text-xs text-[#A1A1AA] leading-relaxed mb-6 font-normal">
                      "{t.quote}"
                    </p>
                  </div>

                  {/* Author Meta */}
                  <div className="flex items-center gap-3 pt-3 border-t border-[#262626]">
                    {/* Sharp Rectangular Avatar */}
                    <div className="w-9 h-9 rounded-[4px] bg-[#1F1F23] border border-[#262626] text-white flex items-center justify-center text-xs font-black shrink-0 tracking-wider">
                      {t.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#FFFFFF] tracking-tight truncate">{t.name}</div>
                      <div className="text-[11px] font-mono text-[#A1A1AA] truncate">{t.role} · <span className="text-[#F97316] font-semibold">{t.company}</span></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Navigation & Controls */}
        <div className="flex justify-center items-center gap-4 mt-12">
          <Button
            variant="icon"
            onClick={prev}
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={16} />
          </Button>

          {/* Indicator Indicators */}
          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => { setAuto(false); setCurrent(i); }}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-[2px] cursor-pointer transition-all duration-200 border-none p-0 ${
                  i === current
                    ? 'w-6 bg-[#F97316]'
                    : 'w-2 bg-[#262626] hover:bg-[#A1A1AA]'
                }`}
              />
            ))}
          </div>

          <Button
            variant="icon"
            onClick={next}
            aria-label="Next testimonial"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
}

