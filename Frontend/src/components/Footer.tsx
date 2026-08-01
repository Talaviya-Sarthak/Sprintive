import { Brain, MessageSquare } from 'lucide-react';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterCol {
  title: string;
  links: FooterLink[];
}

const cols: FooterCol[] = [
  { title: 'Product', links: [{ label: 'Features', href: '/#features' }, { label: 'Pricing', href: '/#pricing' }, { label: 'Roadmap', href: '#' }, { label: 'Integrations', href: '#' }] },
  { title: 'Company', links: [{ label: 'About', href: '/about' }, { label: 'Blog', href: '#' }, { label: 'Contact', href: '/contact' }, { label: 'Careers', href: '#' }] },
  { title: 'Resources', links: [{ label: 'Documentation', href: '#' }, { label: 'Help Center', href: '#' }, { label: 'API', href: '#' }, { label: 'Community', href: '#' }] },
  { title: 'Legal', links: [{ label: 'Privacy', href: '#' }, { label: 'Terms', href: '#' }, { label: 'Cookies', href: '#' }] },
];

function GithubIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function TwitterIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

const socials = [
  { icon: GithubIcon, label: 'GitHub', href: '#' },
  { icon: LinkedinIcon, label: 'LinkedIn', href: '#' },
  { icon: TwitterIcon, label: 'X (Twitter)', href: '#' },
  { icon: MessageSquare, label: 'Discord', href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-transparent pt-16 pb-12 relative z-10">
      <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
        {/* Thin Minimal Top Divider */}
        <div className="w-full h-[1px] bg-[#262626] mb-12" />

        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-[4px] bg-[#F97316] flex items-center justify-center shrink-0">
                  <Brain size={16} color="#FFFFFF" strokeWidth={2.2} />
                </div>
                <span className="text-base font-bold text-[#FFFFFF] tracking-tight">
                  Sprint<span className="text-[#F97316]">ive</span>
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-[220px]">
                AI-powered meeting intelligence for modern agile teams.
              </p>
            </div>

            {/* Social Icons */}
            <div className="flex gap-3 mt-6">
              {socials.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-[4px] bg-[#111111] border border-[#262626] flex items-center justify-center text-[#A1A1AA] hover:text-[#F97316] hover:border-[#F97316] transition-colors duration-150"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
            {cols.map((col) => (
              <div key={col.title}>
                <h4 className="text-[11px] font-mono font-bold text-[#FFFFFF] uppercase tracking-wider mb-4">
                  {col.title}
                </h4>
                <ul className="space-y-2.5 list-none p-0 m-0">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-xs text-[#A1A1AA] hover:text-[#F97316] transition-colors duration-150 block text-decoration-none"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-6 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#A1A1AA]">
          <span>© 2026 Sprintive. All rights reserved.</span>
          <span>Built for Modern Engineering Teams</span>
        </div>
      </div>
    </footer>
  );
}

