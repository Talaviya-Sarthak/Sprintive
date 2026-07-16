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
    <section id="contact">
      <div className="container" style={{ maxWidth: 760 }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="section-tag"><HelpCircle size={11} /> FAQ</div>
          <h2 className="section-title">Frequently Asked<br /><span className="glow-text">Questions</span></h2>
          <p className="section-sub">Everything you need to know about ScrumMind.</p>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {faqs.map((faq, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              style={{
                background: 'var(--surface)', borderRadius: 12, overflow: 'hidden',
                border: `1px solid ${open === i ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
                transition: 'border-color 0.2s ease',
                boxShadow: open === i ? 'var(--shadow-glow)' : 'none',
              }}
            >
              <button onClick={() => setOpen(open === i ? null : i)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', gap: 16, fontFamily: 'var(--font)',
              }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-h)', lineHeight: 1.4, letterSpacing: '-0.01em' }}>{faq.q}</span>
                <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.25 }} style={{ flexShrink: 0 }}>
                  <ChevronDown size={18} color={open === i ? 'var(--primary)' : 'var(--text-muted)'} />
                </motion.div>
              </button>

              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                  >
                    <div style={{ padding: '0 22px 18px', borderTop: '1px solid var(--border)' }}>
                      <p style={{ paddingTop: 14, fontSize: 14, color: 'var(--text)', lineHeight: 1.75 }}>{faq.a}</p>
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
