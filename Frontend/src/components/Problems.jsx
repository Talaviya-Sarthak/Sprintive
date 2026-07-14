import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

const problems = [
  { icon: '📝', title: 'Manual Note Taking', desc: 'Engineers waste 30+ minutes per meeting writing notes instead of building.' },
  { icon: '🗑️', title: 'Forgotten Action Items', desc: 'Critical tasks get lost in chat threads and never make it to the backlog.' },
  { icon: '🎥', title: 'No Meeting Recordings', desc: 'Team members who miss meetings have no way to catch up on decisions.' },
  { icon: '💬', title: 'Lost Discussions', desc: 'Valuable context from standups disappears with no searchable archive.' },
  { icon: '🔄', title: 'Jira Updates Done Manually', desc: 'Developers spend hours updating tickets instead of writing code.' },
  { icon: '📊', title: 'Difficult Sprint Tracking', desc: 'No real-time visibility into sprint progress, blockers, or velocity.' },
];

export default function Problems() {
  return (
    <section style={{ background: 'var(--bg2)' }}>
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="section-tag"><AlertCircle size={12} /> The Problem</div>
          <h2 className="section-title">Scrum Meetings Waste<br /><span className="glow-text">Too Much Time</span></h2>
          <p className="section-sub">Your team is spending more time managing Agile processes than actually building. Here's what's broken.</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {problems.map((p, i) => (
            <motion.div key={p.title}
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6, borderColor: 'rgba(239,68,68,0.4)' }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28, transition: 'all 0.3s', cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {p.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16, color: '#EF4444', fontWeight: 700 }}>❌</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>{p.title}</h3>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{p.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
