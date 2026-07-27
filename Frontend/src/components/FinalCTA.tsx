import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Calendar, ArrowRight } from 'lucide-react';

export default function FinalCTA() {
  const navigate = useNavigate();
  return (
    <section className="py-28 max-sm:py-18 bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[60%] h-[80%] rounded-full top-[10%] left-[20%] blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)' }}
        />
      </div>

      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(249,115,22,0.1)] border border-[rgba(249,115,22,0.25)] rounded-full text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.07em] mb-6">
            🚀 Get Started Today
          </div>

          <h2 className="text-[clamp(30px,4.5vw,56px)] font-extrabold text-[var(--color-text-h)] leading-[1.1] tracking-[-0.03em] mb-5">
            Ready to Let AI Run<br />
            <span className="bg-gradient-to-r from-[#F97316] to-[#FDBA74] bg-clip-text text-transparent">
              Your Scrum Meetings?
            </span>
          </h2>

          <p className="text-[clamp(15px,1.8vw,18px)] text-[var(--color-text-body)] max-w-[520px] mx-auto mb-10 leading-[1.75]">
            Join 500+ teams who've eliminated manual Agile overhead. Start your free trial today — no credit card required.
          </p>

          <div className="flex gap-3 justify-center flex-wrap mb-10">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/signup')}
              className="inline-flex items-center gap-2 px-7 py-[13px] bg-[#F97316] text-white font-semibold text-[15px] rounded-xl border-none cursor-pointer transition-all duration-200 hover:bg-[#EA580C] shadow-[0_1px_3px_rgba(0,0,0,0.2),0_4px_14px_rgba(249,115,22,0.3)] tracking-[-0.01em]"
            >
              <Zap size={16} /> Start Free Trial <ArrowRight size={15} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-7 py-[13px] bg-transparent text-[var(--color-text-h)] font-semibold text-[15px] rounded-xl border border-[var(--color-border2)] cursor-pointer transition-all duration-200 hover:bg-[var(--color-surface2)] hover:border-[#F97316] hover:text-[#F97316] tracking-[-0.01em]"
            >
              <Calendar size={16} /> Schedule Demo
            </motion.button>
          </div>

          <div className="flex gap-7 justify-center flex-wrap">
            {['✅ 14-day free trial', '✅ No credit card required', '✅ Cancel anytime', '✅ Setup in 5 minutes'].map(item => (
              <span key={item} className="text-[13px] text-[var(--color-text-muted)] font-medium">{item}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
