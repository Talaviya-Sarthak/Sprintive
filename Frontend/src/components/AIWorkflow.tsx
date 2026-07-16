import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';

interface WorkflowNode {
  label: string;
  icon: string;
  color: string;
}

const nodes: WorkflowNode[] = [
  { label: 'Meeting',           icon: '🎥', color: '#5DD6FF' },
  { label: 'Audio Streams',     icon: '🎤', color: '#7CE7FF' },
  { label: 'Whisper AI',        icon: '🔊', color: '#4E789C' },
  { label: 'Speaker ID',        icon: '👤', color: '#5DD6FF' },
  { label: 'Transcript',        icon: '📝', color: '#7CE7FF' },
  { label: 'LLM Analysis',      icon: '🧠', color: '#4E789C' },
  { label: 'AI Agents',         icon: '🤖', color: '#5DD6FF' },
  { label: 'Task Detection',    icon: '🎯', color: '#7CE7FF' },
  { label: 'Ticket Generation', icon: '🎫', color: '#4E789C' },
  { label: 'Sprint Board',      icon: '📌', color: '#5DD6FF' },
  { label: 'Notifications',     icon: '🔔', color: '#7CE7FF' },
  { label: 'Analytics',         icon: '📊', color: '#4E789C' },
];

export default function AIWorkflow() {
  return (
    <section style={{ background: 'var(--bg3)', overflow: 'hidden' }}>
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="section-tag"><Cpu size={12} /> AI Architecture</div>
          <h2 className="section-title">How the AI Pipeline<br /><span className="glow-text">Actually Works</span></h2>
          <p className="section-sub">From raw audio to actionable sprint tasks — powered by state-of-the-art AI models.</p>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {nodes.map((node, i) => (
            <div key={node.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ scale: 1.06, boxShadow: `0 0 30px ${node.color}40` }}
                style={{ background: 'var(--surface)', border: `1px solid ${node.color}40`, borderRadius: 16, padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 14, minWidth: 240, transition: 'all 0.3s', cursor: 'default' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${node.color}18`, border: `1px solid ${node.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  {node.icon}
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-h)' }}>{node.label}</span>
                <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: node.color, boxShadow: `0 0 8px ${node.color}` }} />
              </motion.div>

              {i < nodes.length - 1 && (
                <motion.div
                  initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08 + 0.3, duration: 0.4 }}
                  style={{ width: 2, height: 28, background: `linear-gradient(to bottom, ${node.color}, ${nodes[i + 1].color})`, opacity: 0.6, transformOrigin: 'top' }}>
                  <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: node.color, margin: '0 auto', marginTop: 4, boxShadow: `0 0 6px ${node.color}` }} />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
