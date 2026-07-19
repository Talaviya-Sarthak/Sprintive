import { motion } from 'framer-motion';
import { Check, Zap, Star, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface Plan {
  name: string;
  icon: LucideIcon;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  highlight: boolean;
  color: string;
  badge?: string;
}

const plans: Plan[] = [
  {
    name: 'Starter', icon: Zap, price: '₹499', period: '/month',
    desc: 'Perfect for small teams getting started with AI-powered Agile.',
    features: ['5 Team Members', '10 Meetings/month', 'AI Meeting Notes', 'Kanban Board', 'Basic Analytics', 'Email Support'],
    cta: 'Start Free', highlight: false, color: '#64748B',
  },
  {
    name: 'Professional', icon: Star, price: '₹1,499', period: '/month',
    desc: 'Everything you need to run a world-class Agile team.',
    features: ['Unlimited Members', 'Unlimited Meetings', 'Full AI Suite', 'Advanced Analytics', 'Team Chat', 'Smart Notifications', 'Sprint Reports', 'Priority Support'],
    cta: 'Start Free Trial', highlight: true, color: '#3B82F6', badge: 'Most Popular',
  },
  {
    name: 'Enterprise', icon: Building2, price: 'Custom', period: ' pricing',
    desc: 'For large organizations with advanced security and compliance needs.',
    features: ['Unlimited Users', 'SSO / SAML', 'Dedicated AI Model', 'Custom Integrations', 'Priority SLA', 'Dedicated Manager', 'Custom Contracts', 'On-premise Option'],
    cta: 'Contact Sales', highlight: false, color: '#06B6D4',
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  return (
    <section id="pricing" className="py-28 max-sm:py-18 bg-[var(--color-bg2)]">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] rounded-full text-[11px] font-semibold text-[#3B82F6] uppercase tracking-[0.07em] mb-5">
            💰 Pricing
          </div>
          <h2 className="text-[clamp(28px,3.8vw,46px)] font-extrabold text-[var(--color-text-h)] leading-[1.12] tracking-[-0.025em] mb-4">
            Simple, Transparent<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-[clamp(15px,1.8vw,17px)] text-[var(--color-text-body)] max-w-[560px] mx-auto leading-[1.75]">
            Start free. Upgrade when your team is ready. No hidden fees, no surprises.
          </p>
        </motion.div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 items-start">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                whileHover={{ y: -6 }}
                className={[
                  'bg-[var(--color-surface)] rounded-2xl px-7 py-8 relative overflow-hidden transition-all duration-200',
                  plan.highlight
                    ? 'border border-[rgba(59,130,246,0.4)] shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_8px_32px_rgba(59,130,246,0.12)]'
                    : 'border border-[var(--color-border)] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]',
                ].join(' ')}
              >
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #3B82F6, #06B6D4)' }} />
                )}
                {plan.badge && (
                  <div className="absolute top-[18px] right-[18px] bg-[#3B82F6] rounded-full px-[11px] py-[3px] text-[10px] font-bold text-white tracking-[0.02em]">
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                    style={{ background: `${plan.color}14`, border: `1px solid ${plan.color}28` }}
                  >
                    <Icon size={18} color={plan.color} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div className="text-[17px] font-bold text-[var(--color-text-h)] tracking-[-0.02em]">{plan.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-px">{plan.desc}</div>
                  </div>
                </div>

                <div className="mb-6 pb-6 border-b border-[var(--color-border)]">
                  <span className="text-[40px] font-extrabold tracking-[-0.04em]" style={{ color: plan.highlight ? '#3B82F6' : 'var(--color-text-h)' }}>
                    {plan.price}
                  </span>
                  <span className="text-sm text-[var(--color-text-muted)] ml-0.5">{plan.period}</span>
                </div>

                <div className="flex flex-col gap-[11px] mb-7">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2.5">
                      <div
                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${plan.color}14`, border: `1px solid ${plan.color}28` }}
                      >
                        <Check size={10} color={plan.color} strokeWidth={3} />
                      </div>
                      <span className="text-[13.5px] text-[var(--color-text-body)]">{f}</span>
                    </div>
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(plan.highlight ? '/signup' : '#')}
                  className={[
                    'w-full flex items-center justify-center gap-2 text-sm font-semibold px-5 py-[11px] rounded-xl border cursor-pointer transition-all duration-200 tracking-[-0.01em]',
                    plan.highlight
                      ? 'bg-[#3B82F6] text-white border-transparent hover:bg-[#2563EB] shadow-[0_1px_3px_rgba(0,0,0,0.2),0_4px_12px_rgba(59,130,246,0.3)]'
                      : 'bg-transparent text-[var(--color-text-h)] border-[var(--color-border2)] hover:bg-[var(--color-surface2)] hover:border-[#3B82F6] hover:text-[#3B82F6]',
                  ].join(' ')}
                >
                  {plan.cta}
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-7 text-[13px] text-[var(--color-text-muted)]"
        >
          All plans include a 14-day free trial. No credit card required. Cancel anytime.
        </motion.p>
      </div>
    </section>
  );
}
