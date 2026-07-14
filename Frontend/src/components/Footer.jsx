import { motion } from 'framer-motion';
import { Brain, MessageCircle } from 'lucide-react';
import { FaLinkedinIn, FaGithub, FaTwitter } from 'react-icons/fa';

const cols = [
  { title: 'Product',   links: ['Features', 'Pricing', 'Roadmap', 'Integrations', 'Changelog'] },
  { title: 'Company',   links: ['About', 'Careers', 'Blog', 'Contact', 'Press'] },
  { title: 'Resources', links: ['Documentation', 'API Reference', 'Help Center', 'Community', 'Status'] },
  { title: 'Legal',     links: ['Privacy Policy', 'Terms of Service', 'Security', 'Cookie Policy', 'GDPR'] },
];

const socials = [
  { icon: FaLinkedinIn,   label: 'LinkedIn', href: '#' },
  { icon: FaGithub,       label: 'GitHub',   href: '#' },
  { icon: FaTwitter,      label: 'Twitter',  href: '#' },
  { icon: MessageCircle,  label: 'Discord',  href: '#' },
];

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)', padding: '72px 0 32px' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', gap: 40, marginBottom: 56 }} className="footer-grid">

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(59,130,246,0.35)', flexShrink: 0 }}>
                <Brain size={17} color="#fff" strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.03em' }}>
                Scrum<span style={{ color: 'var(--primary)' }}>Mind</span>
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.7, marginBottom: 22, maxWidth: 220 }}>
              AI-powered Agile project management. Let AI run your Scrum meetings so your team can focus on building.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {socials.map(({ icon: Icon, label, href }) => (
                <motion.a key={label} href={href} whileHover={{ y: -2 }} aria-label={label}
                  style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-glow)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--surface)'; }}>
                  <Icon size={15} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {cols.map(col => (
            <div key={col.title}>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 18 }}>{col.title}</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" style={{ fontSize: 13.5, color: 'var(--text)', textDecoration: 'none', transition: 'color 0.2s ease' }}
                      onMouseEnter={e => e.target.style.color = 'var(--text-h)'}
                      onMouseLeave={e => e.target.style.color = 'var(--text)'}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>© 2026 ScrumMind. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms', 'Security'].map(l => (
              <a key={l} href="#" style={{ fontSize: 12.5, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s ease' }}
                onMouseEnter={e => e.target.style.color = 'var(--text-h)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 480px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
