import { motion } from 'framer-motion';
import { Brain, MessageCircle } from 'lucide-react';
import { FaLinkedinIn, FaGithub, FaTwitter } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import type { LucideIcon } from 'lucide-react';

interface FooterCol {
  title: string;
  links: string[];
}

interface Social {
  icon: IconType | LucideIcon;
  label: string;
  href: string;
}

const cols: FooterCol[] = [
  { title: 'Product',   links: ['Features', 'Pricing', 'Roadmap', 'Integrations', 'Changelog'] },
  { title: 'Company',   links: ['About', 'Careers', 'Blog', 'Contact', 'Press'] },
  { title: 'Resources', links: ['Documentation', 'API Reference', 'Help Center', 'Community', 'Status'] },
  { title: 'Legal',     links: ['Privacy Policy', 'Terms of Service', 'Security', 'Cookie Policy', 'GDPR'] },
];

const socials: Social[] = [
  { icon: FaLinkedinIn,  label: 'LinkedIn', href: '#' },
  { icon: FaGithub,      label: 'GitHub',   href: '#' },
  { icon: FaTwitter,     label: 'Twitter',  href: '#' },
  { icon: MessageCircle, label: 'Discord',  href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-transparent pt-[72px] pb-8">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)] gap-10 mb-14">

          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-[9px] bg-[#F97316] flex items-center justify-center shadow-[0_2px_10px_rgba(249,115,22,0.35)] shrink-0">
                <Brain size={17} color="#fff" strokeWidth={2.2} />
              </div>
              <span className="text-[17px] font-bold text-[var(--color-text-h)] tracking-[-0.03em]">
                Sprin<span className="text-[#F97316]">tive</span>
              </span>
            </div>
            <p className="text-[13.5px] text-[var(--color-text-body)] leading-[1.7] mb-[22px] max-w-[220px]">
              AI-powered Agile project management. Let AI run your Scrum meetings so your team can focus on building.
            </p>
            <div className="flex gap-2">
              {socials.map(({ icon: Icon, label, href }) => (
                <motion.a
                  key={label}
                  href={href}
                  whileHover={{ y: -2 }}
                  aria-label={label}
                  className="w-[34px] h-[34px] rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] no-underline transition-all duration-200 hover:border-[rgba(249,115,22,0.4)] hover:text-[#F97316] hover:bg-[rgba(249,115,22,0.12)]"
                >
                  <Icon size={15} />
                </motion.a>
              ))}
            </div>
          </div>

          {cols.map(col => (
            <div key={col.title}>
              <h4 className="text-[11px] font-bold text-[var(--color-text-h)] tracking-[0.07em] uppercase mb-[18px]">{col.title}</h4>
              <ul className="list-none flex flex-col gap-[11px]">
                {col.links.map(link => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-[13.5px] text-[var(--color-text-body)] no-underline transition-colors duration-200 hover:text-[var(--color-text-h)]"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--color-border)] pt-6 flex items-center justify-between flex-wrap gap-3.5">
          <p className="text-[12.5px] text-[var(--color-text-muted)]">© 2026 ScrumMind. All rights reserved.</p>
          <div className="flex gap-5">
            {['Privacy', 'Terms', 'Security'].map(l => (
              <a
                key={l}
                href="#"
                className="text-[12.5px] text-[var(--color-text-muted)] no-underline transition-colors duration-200 hover:text-[var(--color-text-h)]"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
