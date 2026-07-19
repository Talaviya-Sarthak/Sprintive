import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const faqs: FaqItem[] = [
  { q: 'How does AI understand our meetings?',    a: "ScrumMind uses OpenAI's Whisper for speech-to-text transcription and a fine-tuned LLM to understand Agile context. It identifies speakers, extracts tasks, detects blockers, and understands deadlines from natural conversation." },
  { q: 'Is our meeting data secure?',             a: 'Absolutely. ScrumMind is SOC 2 Type II compliant with end-to-end encryption for all recordings and transcripts. Data is stored in isolated tenant environments and never used to train AI models.' },
  { q: 'Can I import existing Jira projects?',    a: 'Yes! ScrumMind has a one-click Jira import that syncs your existing projects, epics, sprints, and tickets. Changes sync bidirectionally in real-time.' },
  { q: 'Does it support Google Meet?',            a: 'ScrumMind has a native Google Meet integration. Our AI bot joins your existing Google Meet calls and processes the audio in real-time without requiring you to switch platforms.' },
  { q: 'Can I use it with Zoom?',                 a: 'Yes, we support Zoom, Google Meet, Microsoft Teams, and our own built-in video meeting platform. The AI works seamlessly across all supported platforms.' },
  { q: 'How accurate is the transcription?',      a: 'Our transcription accuracy is 96%+ for English and supports 50+ languages. The AI also understands technical jargon, product names, and team-specific terminology that you can customize.' },
  { q: 'What happens if someone misses a meeting?', a: 'Absent team members receive an AI-generated summary with all decisions, action items, and their assigned tasks. They can also watch the recording with an interactive transcript.' },
  { q: 'Can I customize what the AI extracts?',   a: "Yes, you can configure extraction rules, custom fields, priority mappings, and even train the AI on your team's specific workflow patterns and terminology." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="contact" className="py-28 max-sm:py-18">
      <div className="max-w-[760px] mx-auto px-8 max-sm:px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-[5px] bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] rounded-full text-[11px] font-semibold text-[#3B82F6] uppercase tracking-[0.07em] mb-5">
            <HelpCircle size={11} /> FAQ
          </div>
          <h2 className="text-[clamp(28px,3.8vw,46px)] font-extrabold text-[var(--color-text-h)] leading-[1.12] tracking-[-0.025em] mb-4">
            Frequently Asked<br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-[clamp(15px,1.8vw,17px)] text-[var(--color-text-body)] max-w-[560px] mx-auto leading-[1.75]">
            Everything you need to know about ScrumMind.
          </p>
        </motion.div>

        <div className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={[
                'bg-[var(--color-surface)] rounded-xl overflow-hidden transition-all duration-200',
                open === i
                  ? 'border border-[rgba(59,130,246,0.35)] shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_8px_32px_rgba(59,130,246,0.12)]'
                  : 'border border-[var(--color-border)]',
              ].join(' ')}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-[22px] py-[18px] bg-transparent border-none cursor-pointer text-left gap-4"
              >
                <span className="text-[15px] font-semibold text-[var(--color-text-h)] leading-[1.4] tracking-[-0.01em]">{faq.q}</span>
                <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
                  <ChevronDown size={18} color={open === i ? '#3B82F6' : 'var(--color-text-muted)'} />
                </motion.div>
              </button>

              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-[22px] pb-[18px] border-t border-[var(--color-border)]">
                      <p className="pt-3.5 text-sm text-[var(--color-text-body)] leading-[1.75]">{faq.a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
