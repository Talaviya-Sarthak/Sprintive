import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const faqs: FaqItem[] = [
  { q: 'WHAT IS SPRINTIVE?', a: "Sprintive is an AI-powered intelligence platform that unifies video meetings, automated transcripts, task extraction, and Agile sprint boards into a single seamless workspace." },
  { q: 'HOW DOES AI EXTRACT TASKS?', a: "Sprintive uses speech-to-text models combined with a fine-tuned Agile LLM. It listens to natural standup conversations, detects action items, assigns owners, identifies blockers, and sets deadlines automatically." },
  { q: 'IS MY MEETING DATA SECURE?', a: "Absolutely. Sprintive is SOC 2 Type II compliant with end-to-end encryption for all audio streams and transcripts. Data is isolated in secure tenant environments and never used for AI model training." },
  { q: 'CAN I IMPORT EXISTING JIRA PROJECTS?', a: "Yes! Sprintive offers a 1-click Jira & GitHub integration that imports your existing projects, sprints, and backlogs while maintaining real-time bidirectional sync." },
  { q: 'DOES IT SUPPORT GOOGLE MEET & ZOOM?', a: "Yes. Sprintive integrates with Google Meet, Zoom, and Microsoft Teams. Our AI assistant joins your call automatically or you can host directly in Sprintive." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 max-sm:py-16 bg-transparent relative overflow-hidden">
      <div className="max-w-[900px] mx-auto px-8 max-sm:px-5">
        {/* Editorial Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 select-none"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#FFFFFF] tracking-tight uppercase leading-tight">
            FREQUENTLY<br />
            <span className="text-[#F97316]">ASKED QUESTIONS</span>
          </h2>
        </motion.div>

        {/* Accordion List */}
        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            const num = (i + 1).toString().padStart(2, '0');

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="select-none"
              >
                {/* Accordion Header Row */}
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className={`
                    w-full flex items-center justify-between p-4 sm:p-5
                    border-2 border-black rounded-[4px] cursor-pointer
                    transition-all duration-150 ease-out text-left gap-4
                    ${isOpen
                      ? 'bg-[#F97316] text-black shadow-[3px_3px_0px_0px_#000]'
                      : 'bg-[#111111] text-white shadow-[3px_3px_0px_0px_#262626] hover:shadow-[1px_1px_0px_0px_#262626] hover:translate-x-[2px] hover:translate-y-[2px]'
                    }
                  `}
                >
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                    <span className={`font-mono text-sm sm:text-base font-bold shrink-0 ${isOpen ? 'text-black' : 'text-[#F97316]'}`}>
                      {num}
                    </span>
                    <div className={`w-[1px] h-5 ${isOpen ? 'bg-black/30' : 'bg-[#262626]'}`} />
                    <span className={`text-sm sm:text-base font-bold tracking-tight uppercase truncate ${isOpen ? 'text-black' : 'text-white'}`}>
                      {faq.q}
                    </span>
                  </div>

                  <div className={`p-1 rounded-[2px] border ${isOpen ? 'border-black bg-black text-white' : 'border-[#262626] bg-[#1A1A1E] text-[#F97316]'}`}>
                    {isOpen ? <Minus size={16} strokeWidth={2.5} /> : <Plus size={16} strokeWidth={2.5} />}
                  </div>
                </button>

                {/* Answer Extension Box */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 p-5 sm:p-6 bg-[#141417] border-2 border-black rounded-[4px] shadow-[3px_3px_0px_0px_#262626]">
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-mono">
                          {faq.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

