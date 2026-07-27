import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Clock, MapPin, Send, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/Button';

function GithubIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function TwitterIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

function DiscordIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M7.5 4.8c1.5-.5 3.1-.8 4.7-.8s3.2.3 4.7.8c0 0 2.1 3.5 2.1 9.2 0 0-1.3 2.1-4.7 2.2 0 0-.6-.7-1-1.3 2.3-.6 3.2-1.9 3.2-1.9-.7.5-1.5.8-2.3 1.1-.9.3-1.8.5-2.7.5s-1.8-.2-2.7-.5c-.8-.3-1.6-.6-2.3-1.1 0 0 .9 1.3 3.2 1.9-.4.6-1 1.3-1 1.3-3.4-.1-4.7-2.2-4.7-2.2 0-5.7 2.1-9.2 2.1-9.2z" />
    </svg>
  );
}

const socialLinks = [
  { icon: GithubIcon, label: 'GitHub', href: '#' },
  { icon: LinkedinIcon, label: 'LinkedIn', href: '#' },
  { icon: TwitterIcon, label: 'X (Twitter)', href: '#' },
  { icon: DiscordIcon, label: 'Discord', href: '#' },
];

const contactCards = [
  {
    icon: Mail,
    title: 'Support & Inquiries',
    value: 'support@sprintive.ai',
    href: 'mailto:support@sprintive.ai',
  },
  {
    icon: Clock,
    title: 'Response Time',
    value: 'Within 24 Hours',
    href: null,
  },
  {
    icon: MapPin,
    title: 'HQ Location',
    value: 'Remote • Global / India',
    href: null,
  },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusState, setStatusState] = useState<'idle' | 'success' | 'error'>('idle');

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setStatusState('error');
      return;
    }

    setIsSubmitting(true);
    setStatusState('idle');

    setTimeout(() => {
      setIsSubmitting(false);
      setStatusState('success');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
      setErrors({});
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="bg-[#050505] text-[#A1A1AA] min-h-screen lg:h-screen flex flex-col justify-between relative overflow-x-hidden lg:overflow-hidden selection:bg-[#F97316]/25 selection:text-[#F97316]">
      {/* Background Engineering Grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between">
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 pb-6 lg:pt-20 lg:pb-8 max-w-[1280px] w-full mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
            
            {/* LEFT COLUMN (40%) */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-5 flex flex-col justify-between space-y-6"
            >
              <div>
                {/* Neo-Brutalist Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#111111] border border-[#262626] shadow-[2px_2px_0px_#F97316] text-[#F97316] font-mono text-[11px] font-bold uppercase tracking-wider mb-4">
                  <span>CONTACT</span>
                  <span className="text-[#A1A1AA]">/</span>
                  <span>ENGINEERING</span>
                </div>

                {/* Editorial Heading */}
                <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold text-[#FFFFFF] tracking-tight leading-[1.08] mb-3">
                  Let's Talk.
                </h1>

                {/* Single Concise Description */}
                <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed max-w-md">
                  Questions, partnerships, or support—we're here to help.
                </p>
              </div>

              {/* Minimal Information Cards */}
              <div className="space-y-3 pt-1">
                {contactCards.map((card) => {
                  const Icon = card.icon;
                  const cardElement = (
                    <div className="p-3.5 bg-[#111111] border border-[#262626] shadow-[3px_3px_0px_#000000] flex items-center gap-3.5 hover:border-[#F97316]/50 transition-colors">
                      <div className="w-8 h-8 bg-[#1A1A1A] border border-[#262626] flex items-center justify-center text-[#F97316] shrink-0">
                        <Icon size={15} strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider font-semibold">
                          {card.title}
                        </div>
                        <div className="text-xs font-bold text-[#FFFFFF] truncate mt-0.5">
                          {card.value}
                        </div>
                      </div>
                    </div>
                  );

                  return card.href ? (
                    <a key={card.title} href={card.href} className="block text-decoration-none">
                      {cardElement}
                    </a>
                  ) : (
                    <div key={card.title}>{cardElement}</div>
                  );
                })}
              </div>

              {/* Social Links & Trust Indicator */}
              <div className="pt-2 flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  {socialLinks.map(({ icon: Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      className="w-8 h-8 bg-[#111111] border border-[#262626] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center text-[#A1A1AA] hover:text-[#F97316] hover:border-[#F97316] transition-colors duration-150"
                    >
                      <Icon size={14} />
                    </a>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#A1A1AA]">
                  <ShieldCheck size={13} className="text-[#F97316]" />
                  <span>Direct Dev Channel</span>
                </div>
              </div>
            </motion.div>

            {/* RIGHT COLUMN (60%) - Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-7"
            >
              <div className="bg-[#111111] border-2 border-black shadow-[6px_6px_0px_#FFFFFF] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[#262626]">
                  <h2 className="text-base font-bold text-[#FFFFFF] tracking-tight">
                    Send us a message
                  </h2>
                  <span className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider">
                    Fast response guaranteed
                  </span>
                </div>

                {/* Inline Status Alerts */}
                {statusState === 'success' && (
                  <div className="mb-4 p-3 bg-[#050505] border border-[#F97316] text-[#FFFFFF] flex items-center gap-2.5 text-xs">
                    <CheckCircle2 size={16} className="text-[#F97316] shrink-0" />
                    <span>Message received. We'll be in touch shortly!</span>
                  </div>
                )}

                {statusState === 'error' && (
                  <div className="mb-4 p-3 bg-[#050505] border border-red-500 text-[#FFFFFF] flex items-center gap-2.5 text-xs">
                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                    <span>Please complete all required fields correctly.</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Name & Email Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-[10px] font-mono font-bold text-[#FFFFFF] uppercase tracking-wider mb-1.5"
                      >
                        Name <span className="text-[#F97316]">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Alex Morgan"
                        className={`w-full bg-[#050505] text-[#FFFFFF] placeholder-[#52525B] px-3.5 py-2.5 border ${
                          errors.name ? 'border-red-500' : 'border-[#262626]'
                        } focus:outline-none focus:border-[#F97316] transition-colors text-xs font-medium`}
                      />
                      {errors.name && (
                        <p className="text-[10px] text-red-500 mt-1 font-mono">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-[10px] font-mono font-bold text-[#FFFFFF] uppercase tracking-wider mb-1.5"
                      >
                        Email <span className="text-[#F97316]">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="alex@company.com"
                        className={`w-full bg-[#050505] text-[#FFFFFF] placeholder-[#52525B] px-3.5 py-2.5 border ${
                          errors.email ? 'border-red-500' : 'border-[#262626]'
                        } focus:outline-none focus:border-[#F97316] transition-colors text-xs font-medium`}
                      />
                      {errors.email && (
                        <p className="text-[10px] text-red-500 mt-1 font-mono">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Subject Field */}
                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-[10px] font-mono font-bold text-[#FFFFFF] uppercase tracking-wider mb-1.5"
                    >
                      Subject <span className="text-[#F97316]">*</span>
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="How can we assist you?"
                      className={`w-full bg-[#050505] text-[#FFFFFF] placeholder-[#52525B] px-3.5 py-2.5 border ${
                        errors.subject ? 'border-red-500' : 'border-[#262626]'
                      } focus:outline-none focus:border-[#F97316] transition-colors text-xs font-medium`}
                    />
                    {errors.subject && (
                      <p className="text-[10px] text-red-500 mt-1 font-mono">{errors.subject}</p>
                    )}
                  </div>

                  {/* Message Field */}
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-[10px] font-mono font-bold text-[#FFFFFF] uppercase tracking-wider mb-1.5"
                    >
                      Message <span className="text-[#F97316]">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Write your message here..."
                      className={`w-full bg-[#050505] text-[#FFFFFF] placeholder-[#52525B] px-3.5 py-2.5 border ${
                        errors.message ? 'border-red-500' : 'border-[#262626]'
                      } focus:outline-none focus:border-[#F97316] transition-colors text-xs font-medium resize-none`}
                    />
                    {errors.message && (
                      <p className="text-[10px] text-red-500 mt-1 font-mono">{errors.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="orange"
                      size="default"
                      disabled={isSubmitting}
                      className="w-full justify-center gap-2 py-3"
                    >
                      {isSubmitting ? (
                        <span>Sending Message...</span>
                      ) : (
                        <>
                          <Send size={14} strokeWidth={2.5} />
                          <span>Submit Inquiry</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>

          </div>
        </main>
      </div>
    </div>
  );
}
