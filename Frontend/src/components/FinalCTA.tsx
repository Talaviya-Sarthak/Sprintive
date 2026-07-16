import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Calendar, ArrowRight } from 'lucide-react';

export default function FinalCTA() {
  const navigate = useNavigate();
  return (
    <section className="section-alt" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: '60%', height: '80%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', top: '10%', left: '20%' }}
        />
        <motion.div
          animate={{ scale: [1.08, 1, 1.08], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', width: '40%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', bottom: '5%', right: '15%' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '64px 64px', opacity: 0.5,
        }} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div className="section-tag" style={{ margin: '0 auto 24px' }}>🚀 Get Started Today</div>

          <h2 style={{
            fontSize: 'clamp(30px, 4.5vw, 56px)', fontWeight: 800,
            color: 'var(--text-h)', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20,
          }}>
            Ready to Let AI Run<br />
            <span className="glow-text">Your Scrum Meetings?</span>
          </h2>

          <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--text)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.75 }}>
            Join 500+ teams who've eliminated manual Agile overhead. Start your free trial today — no credit card required.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/signup')}
              className="btn-primary" style={{ fontSize: 15, padding: '13px 28px' }}>
              <Zap size={16} /> Start Free Trial <ArrowRight size={15} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="btn-secondary" style={{ fontSize: 15, padding: '13px 28px' }}>
              <Calendar size={16} /> Schedule Demo
            </motion.button>
          </div>

          <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['✅ 14-day free trial', '✅ No credit card required', '✅ Cancel anytime', '✅ Setup in 5 minutes'].map(item => (
              <span key={item} style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{item}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
