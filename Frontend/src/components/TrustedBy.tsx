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
    <section style={{ padding: '56px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} className="section-alt">
      <div className="container">
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 32 }}
        >
          Trusted by 500+ teams worldwide
        </motion.p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
          {companies.map((c, i) => (
            <motion.div key={c.name}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              whileHover={{ y: -2, borderColor: 'var(--border2)' }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, cursor: 'default',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>{c.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
