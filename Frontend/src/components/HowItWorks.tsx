import { motion } from 'framer-motion';
import { Calendar, Mic, FileText, Bot, CheckSquare, Layout, Rocket, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PipelineStep {
  step: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  previewType: 'meeting' | 'listening' | 'transcript' | 'analysis' | 'tasks' | 'kanban' | 'sprint';
}

const pipelineSteps: PipelineStep[] = [
  {
    step: '01',
    title: 'Meeting Created',
    desc: 'Launch standups, planning, or retros in 1-click.',
    icon: Calendar,
    previewType: 'meeting',
  },
  {
    step: '02',
    title: 'AI Listens',
    desc: 'Real-time voice processing & noise-isolated audio stream.',
    icon: Mic,
    previewType: 'listening',
  },
  {
    step: '03',
    title: 'Live Transcript',
    desc: 'Instant speaker-diarized text generated live.',
    icon: FileText,
    previewType: 'transcript',
  },
  {
    step: '04',
    title: 'AI Analysis',
    desc: 'Context-aware extraction of decisions & blockers.',
    icon: Bot,
    previewType: 'analysis',
  },
  {
    step: '05',
    title: 'Task Extraction',
    desc: 'Automatically assigned tickets with priority tags.',
    icon: CheckSquare,
    previewType: 'tasks',
  },
  {
    step: '06',
    title: 'Kanban Updated',
    desc: 'Sprint board syncs instantly without manual entry.',
    icon: Layout,
    previewType: 'kanban',
  },
  {
    step: '07',
    title: 'Sprint Ready',
    desc: 'Clear goals, automated insights, and team alignment.',
    icon: Rocket,
    previewType: 'sprint',
  },
];

function MicroPreview({ type, isLight }: { type: PipelineStep['previewType']; isLight: boolean }) {
  const previewBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#16161B]';
  const previewBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';
  const itemBg = isLight ? 'bg-[#e2e8f0]' : 'bg-[#262626]';
  const mutedText = isLight ? 'text-[#475569]' : 'text-[#A1A1AA]';

  if (type === 'meeting') {
    return (
      <div className={`flex items-center justify-center gap-2 h-10 w-full ${previewBg} rounded-[3px] border ${previewBorder} overflow-hidden px-2`}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            className={`w-4 h-4 rounded-full border ${isLight ? 'border-[#0f172a]' : 'border-black'} flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-[#F97316]' : itemBg}`}
          >
            {String.fromCharCode(65 + i)}
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === 'listening') {
    return (
      <div className={`flex items-center justify-center gap-1 h-10 w-full ${previewBg} rounded-[3px] border ${previewBorder} px-3`}>
        {[4, 8, 14, 20, 12, 18, 10, 6].map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: [h, 24, h] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.08 }}
            className="w-[3px] bg-[#F97316] rounded-sm"
          />
        ))}
      </div>
    );
  }

  if (type === 'transcript') {
    return (
      <div className={`flex flex-col justify-center gap-1.5 h-10 w-full ${previewBg} rounded-[3px] border ${previewBorder} p-2`}>
        <motion.div
          animate={{ width: ['20%', '85%', '85%'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-1.5 bg-[#F97316] rounded-sm"
        />
        <motion.div
          animate={{ width: ['0%', '60%', '60%'] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
          className={`h-1.5 ${mutedText.replace('text-', 'bg-')} rounded-sm`}
        />
      </div>
    );
  }

  if (type === 'analysis') {
    return (
      <div className={`flex items-center justify-center gap-2 h-10 w-full ${previewBg} rounded-[3px] border ${previewBorder}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 border-2 border-[#F97316] border-t-transparent rounded-full"
        />
        <span className="text-[10px] font-mono text-[#F97316] uppercase font-bold">Analyzing…</span>
      </div>
    );
  }

  if (type === 'tasks') {
    return (
      <div className={`flex flex-col justify-center gap-1.5 h-10 w-full ${previewBg} rounded-[3px] border ${previewBorder} px-3`}>
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: [0.3, 1, 1], x: [-6, 0, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.6 }}
            className="flex items-center gap-2"
          >
            <div className="w-2.5 h-2.5 rounded-[1px] bg-[#F97316]" />
            <div className={`h-1.5 ${mutedText.replace('text-', 'bg-')} rounded-sm flex-1`} />
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === 'kanban') {
    return (
      <div className={`grid grid-cols-2 gap-1.5 h-10 w-full ${previewBg} rounded-[3px] border ${previewBorder} p-1.5`}>
        <div className={`${itemBg} rounded-[2px] p-1`}>
          <div className={`h-1 w-full ${mutedText.replace('text-', 'bg-')} rounded-sm`} />
        </div>
        <div className={`${itemBg} rounded-[2px] p-1 relative overflow-hidden`}>
          <motion.div
            animate={{ x: [-20, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
            className="h-1.5 w-full bg-[#F97316] rounded-sm"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-1.5 h-10 w-full ${previewBg} rounded-[3px] border ${previewBorder}`}>
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="w-3 h-3 bg-[#10B981] rounded-full shadow-[0_0_8px_#10B981]"
      />
      <span className="text-[10px] font-mono text-[#10B981] uppercase font-bold tracking-wider">100% Synced</span>
    </div>
  );
}

export default function HowItWorks() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const headingColor = isLight ? 'text-[#0f172a]' : 'text-[#FFFFFF]';
  const cardBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#111111]';
  const cardBorder = isLight ? 'border-[#0f172a]' : 'border-black';
  const shadowClass = isLight ? 'shadow-[3px_3px_0px_0px_#0f172a]' : 'shadow-[3px_3px_0px_0px_#262626]';
  const hoverShadow = isLight ? 'group-hover:shadow-[1px_1px_0px_0px_#0f172a]' : 'group-hover:shadow-[1px_1px_0px_0px_#262626]';
  const iconBg = isLight ? 'bg-[#f1f5f9]' : 'bg-[#1A1A1E]';
  const iconBorder = isLight ? 'border-[#0f172a]' : 'border-black';
  const titleColor = isLight ? 'text-[#0f172a]' : 'text-[#FFFFFF]';
  const descColor = isLight ? 'text-[#475569]' : 'text-[#A1A1AA]';
  const trackBg = isLight ? 'bg-[#e2e8f0]' : 'bg-[#262626]';

  return (
    <section id="how-it-works" className="py-24 max-sm:py-16 bg-transparent relative overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-8 max-sm:px-5">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 select-none"
        >
          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black ${headingColor} tracking-tight uppercase leading-tight`}>
            FROM CONVERSATION TO<br />
            <span className="text-[#F97316]">SPRINT IN MINUTES</span>
          </h2>
        </motion.div>

        {/* Animated Horizontal Pipeline Container */}
        <div className="relative">
          {/* Main Desktop Connecting Track Line */}
          <div className={`hidden lg:block absolute top-[52px] left-[40px] right-[40px] h-[2px] ${trackBg} z-0`}>
            <motion.div
              animate={{ x: ['0%', '100%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#F97316] to-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 lg:gap-3 relative z-10">
            {pipelineSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="group flex flex-col h-full"
                >
                  {/* Neo-Brutalist Pipeline Step Card */}
                  <div
                    className={`
                      flex-1 flex flex-col justify-between p-4
                      ${cardBg} border-2 ${cardBorder} rounded-[4px]
                      ${shadowClass}
                      ${hoverShadow} group-hover:translate-x-[2px] group-hover:translate-y-[2px]
                      transition-all duration-150 ease-out select-none
                    `}
                  >
                    <div>
                      {/* Step Badge & Icon */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono font-bold text-[#F97316] tracking-widest uppercase">
                          {step.step}
                        </span>
                        <div className={`w-7 h-7 rounded-[4px] ${iconBg} border ${iconBorder} flex items-center justify-center text-[#F97316] group-hover:text-white transition-colors duration-150`}>
                          <Icon size={14} strokeWidth={2.2} />
                        </div>
                      </div>

                      {/* Title & Short Description */}
                      <h3 className={`text-xs font-bold ${titleColor} uppercase tracking-tight mb-1 group-hover:text-[#F97316] transition-colors duration-150`}>
                        {step.title}
                      </h3>
                      <p className={`text-[11px] ${descColor} leading-snug mb-3`}>
                        {step.desc}
                      </p>
                    </div>

                    {/* Micro Preview Animation */}
                    <div className="mt-2">
                      <MicroPreview type={step.previewType} isLight={isLight} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center flex flex-col items-center justify-center gap-4"
        >
          <Button
            variant="orange"
            size="lg"
            onClick={() => navigate('/signup')}
          >
            Start Your First AI Meeting <ArrowRight size={14} className="ml-1" />
          </Button>

          <span className={`text-xs font-mono ${descColor} uppercase tracking-wider`}>
            No credit card required · 5-minute setup
          </span>
        </motion.div>
      </div>
    </section>
  );
}

