import { motion } from 'framer-motion';
import { Check, Zap, Star, Building2 } from 'lucide-react';
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
  return (
    <section id="pricing" className="section-alt">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="section-tag">💰 Pricing</div>
          <h2 className="section-title">Simple, Transparent<br /><span className="glow-text">Pricing</span></h2>
          <p className="section-sub">Start free. Upgrade when your team is ready. No hidden fees, no surprises.</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div key={plan.name}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                whileHover={{ y: -6, boxShadow: plan.highlight ? 'var(--shadow-glow)' : 'var(--shadow-md)' }}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${plan.highlight ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                  borderRadius: 16,
                  padding: '32px 28px',
                  position: 'relative', overflow: 'hidden',
                  boxShadow: plan.highlight ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                  transition: 'all 0.25s ease',
                }}
              >
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--primary), var(--accent))' }} />
                )}
                {plan.badge && (
                  <div style={{ position: 'absolute', top: 18, right: 18, background: 'var(--primary)', borderRadius: 99, padding: '3px 11px', fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>{plan.badge}</div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${plan.color}14`, border: `1px solid ${plan.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={plan.color} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.02em' }}>{plan.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{plan.desc}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: plan.highlight ? 'var(--primary)' : 'var(--text-h)', letterSpacing: '-0.04em' }}>{plan.price}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 2 }}>{plan.period}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${plan.color}14`, border: `1px solid ${plan.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={10} color={plan.color} strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{f}</span>
                    </div>
                  ))}
                </div>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className={plan.highlight ? 'btn-primary' : 'btn-secondary'}
                  style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '11px 20px' }}>
                  {plan.cta}
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: 'var(--text-muted)' }}>
          All plans include a 14-day free trial. No credit card required. Cancel anytime.
        </motion.p>
      </div>
    </section>
  );
}
