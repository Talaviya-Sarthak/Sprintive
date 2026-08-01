import { motion } from 'framer-motion';
import { Check, Zap, Star, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
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
  badge?: string;
}

const plans: Plan[] = [
  {
    name: 'Starter', icon: Zap, price: '₹499', period: '/month',
    desc: 'Perfect for small teams getting started with AI-powered Agile.',
    features: ['5 Team Members', '10 Meetings/month', 'AI Meeting Notes', 'Kanban Board', 'Basic Analytics', 'Email Support'],
    cta: 'Start Free', highlight: false,
  },
  {
    name: 'Professional', icon: Star, price: '₹1,499', period: '/month',
    desc: 'Everything you need to run a world-class Agile team.',
    features: ['Unlimited Members', 'Unlimited Meetings', 'Full AI Suite', 'Advanced Analytics', 'Team Chat', 'Smart Notifications', 'Sprint Reports', 'Priority Support'],
    cta: 'Start Free Trial', highlight: true, badge: 'Most Popular',
  },
  {
    name: 'Enterprise', icon: Building2, price: 'Custom', period: ' pricing',
    desc: 'For large organizations with advanced security and compliance needs.',
    features: ['Unlimited Users', 'SSO / SAML', 'Dedicated AI Model', 'Custom Integrations', 'Priority SLA', 'Dedicated Manager', 'Custom Contracts', 'On-premise Option'],
    cta: 'Contact Sales', highlight: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  return (
    <section id="pricing" className="py-24 max-sm:py-16 bg-transparent relative overflow-hidden">
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-5">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 select-none"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#FFFFFF] tracking-tight uppercase leading-tight">
            SIMPLE, TRANSPARENT<br />
            <span className="text-[#F97316]">PRICING FOR TEAMS</span>
          </h2>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="h-full flex flex-col"
              >
                {/* Neo-Brutalist Card matching feature-card style (White bg, 4px black border, shadow-neo, bold black text) */}
                <div
                  className={`
                    relative flex-1 flex flex-col justify-between p-6 bg-white border-4 border-black shadow-neo
                    select-none transition-all duration-150
                  `}
                >
                  {/* Top Orange Header Accent Line for Recommended Plan */}
                  {plan.highlight && (
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#F97316]" />
                  )}

                  {/* Neo-Brutalist Badge */}
                  {plan.badge && (
                    <div className="absolute top-4 right-4 bg-[#F97316] text-white border-2 border-black px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    {/* Header matching feature card header */}
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <div>
                        <h3 className="font-black text-2xl uppercase tracking-tighter leading-none text-black mb-2">{plan.name}</h3>
                        <p className="font-bold text-xs text-black leading-snug">{plan.desc}</p>
                      </div>
                      <div className="w-8 h-8 bg-[#F97316] rounded-full flex-shrink-0 flex items-center justify-center text-white">
                        <Icon size={16} strokeWidth={2.5} />
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="mb-6 pb-4 border-b-2 border-black">
                      <span className="text-4xl sm:text-5xl font-black tracking-tighter text-black">
                        {plan.price}
                      </span>
                      <span className="text-xs font-mono font-bold uppercase text-black ml-1">{plan.period}</span>
                    </div>

                    {/* Features List */}
                    <div className="flex flex-col gap-2.5 mb-8">
                      {plan.features.map(f => (
                        <div key={f} className="flex items-center gap-2.5">
                          <div className="w-4 h-4 bg-black text-white rounded-full flex items-center justify-center shrink-0">
                            <Check size={10} strokeWidth={3} />
                          </div>
                          <span className="text-xs font-bold text-black">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button
                    variant={plan.highlight ? 'orange' : 'neutral'}
                    fullWidth
                    onClick={() => navigate(plan.highlight ? '/signup' : '#')}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12 text-xs font-mono text-zinc-500 uppercase tracking-wider"
        >
          All plans include a 14-day free trial. No credit card required. Cancel anytime.
        </motion.p>
      </div>
    </section>
  );
}
