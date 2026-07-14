import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const rows = [
  'Meeting Recording',
  'AI Task Detection',
  'Auto Ticket Creation',
  'AI Meeting Summary',
  'Sprint Analytics',
  'Team Chat',
  'Kanban Board',
  'Automated Reports',
  'Smart Notifications',
  'Speaker Identification',
  'Blocker Detection',
  'Productivity Insights',
];

const scrumMind = [true, true, true, true, true, true, true, true, true, true, true, true];
const manual = [false, false, false, false, false, true, true, false, false, false, false, false];

export default function ComparisonTable() {
  return (
    <section>
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="section-tag">⚡ Comparison</div>
          <h2 className="section-title">ScrumMind vs<br /><span className="glow-text">Traditional Scrum</span></h2>
          <p className="section-sub">See why teams are switching from manual Agile processes to AI-powered automation.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'rgba(93,214,255,0.06)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '20px 28px', fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>Feature</div>
            <div style={{ padding: '20px 28px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>🤖 ScrumMind</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>AI-Powered</div>
            </div>
            <div style={{ padding: '20px 28px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>📋 Manual Scrum</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Traditional</div>
            </div>
          </div>

          {rows.map((row, i) => (
            <motion.div key={row} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(93,214,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ padding: '16px 28px', fontSize: 14, color: 'var(--text-h)', fontWeight: 500 }}>{row}</div>
              <div style={{ padding: '16px 28px', textAlign: 'center', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} color="#22C55E" strokeWidth={3} />
                </div>
              </div>
              <div style={{ padding: '16px 28px', textAlign: 'center', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {manual[i] ? (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#22C55E" strokeWidth={3} />
                  </div>
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={14} color="#EF4444" strokeWidth={3} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
