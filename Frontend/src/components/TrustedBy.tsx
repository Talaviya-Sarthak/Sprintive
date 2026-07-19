import { motion } from 'framer-motion';

interface Company {
  name: string;
  icon: string;
}

const companies: Company[] = [
  { name: 'TechStartup',  icon: '⚡' },
  { name: 'EnterpriseX',  icon: '🏢' },
  { name: 'RemoteFirst',  icon: '🌍' },
  { name: 'ProductLab',   icon: '🔬' },
  { name: 'ScaleUp',      icon: '📈' },
  { name: 'DevForge',     icon: '⚙️' },
  { name: 'CloudBase',    icon: '☁️' },
  { name: 'AgileHQ',      icon: '🎯' },
];

export default function TrustedBy() {
  return (
    <section className="py-14 border-t border-[var(--color-border)] border-b bg-[var(--color-bg2)]">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs font-semibold text-[var(--color-text-muted)] tracking-[0.1em] uppercase mb-8"
        >
          Trusted by 500+ teams worldwide
        </motion.p>

        <div className="flex gap-2.5 flex-wrap justify-center items-center">
          {companies.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -2 }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] cursor-default transition-all duration-200 hover:border-[var(--color-border2)] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]"
            >
              <span className="text-base">{c.icon}</span>
              <span className="text-[13px] font-semibold text-[var(--color-text-body)] whitespace-nowrap">{c.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
