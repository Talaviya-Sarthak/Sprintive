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
    <section className="py-28 max-sm:py-18 bg-[var(--color-bg3)] overflow-hidden">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] rounded-full text-[11px] font-semibold text-[#3B82F6] uppercase tracking-[0.07em] mb-5">
            <Cpu size={12} /> AI Architecture
          </div>
          <h2 className="text-[clamp(28px,3.8vw,46px)] font-extrabold text-[var(--color-text-h)] leading-[1.12] tracking-[-0.025em] mb-4">
            How the AI Pipeline<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)' }}>
              Actually Works
            </span>
          </h2>
          <p className="text-[clamp(15px,1.8vw,17px)] text-[var(--color-text-body)] max-w-[560px] mx-auto leading-[1.75]">
            From raw audio to actionable sprint tasks — powered by state-of-the-art AI models.
          </p>
        </motion.div>

        <div className="flex flex-col items-center">
          {nodes.map((node, i) => (
            <div key={node.label} className="flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ scale: 1.06 }}
                className="bg-[var(--color-surface)] rounded-2xl px-8 py-4 flex items-center gap-3.5 min-w-[240px] cursor-default transition-all duration-300"
                style={{ border: `1px solid ${node.color}40` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: `${node.color}18`, border: `1px solid ${node.color}30` }}
                >
                  {node.icon}
                </div>
                <span className="text-[15px] font-bold text-[var(--color-text-h)]">{node.label}</span>
                <div
                  className="ml-auto w-2 h-2 rounded-full"
                  style={{ background: node.color, boxShadow: `0 0 8px ${node.color}` }}
                />
              </motion.div>

              {i < nodes.length - 1 && (
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 + 0.3, duration: 0.4 }}
                  className="w-0.5 h-7 opacity-60 origin-top relative"
                  style={{ background: `linear-gradient(to bottom, ${node.color}, ${nodes[i + 1].color})` }}
                >
                  <motion.div
                    animate={{ y: [0, 20, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1.5 h-1.5 rounded-full absolute left-1/2 -translate-x-1/2 mt-1"
                    style={{ background: node.color, boxShadow: `0 0 6px ${node.color}` }}
                  />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
