import { useState, useEffect } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Cpu, Users, Layers, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';

const principles = [
  {
    icon: Cpu,
    title: 'AI First',
    description: 'Every meeting should generate useful work automatically, without manual note-taking.',
  },
  {
    icon: Users,
    title: 'Built For Teams',
    description: 'Designed specifically for modern engineering, product, and agile development teams.',
  },
  {
    icon: Layers,
    title: 'Simple By Design',
    description: 'Less noise. More clarity. Every feature serves to streamline workflows.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy Matters',
    description: 'Your conversations and workspace data remain end-to-end secure and under your control.',
  },
];

// Motion variant definitions
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const lineExpand: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.6, ease: 'easeInOut' },
  },
};

export default function About() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const bgColor = isLight ? 'bg-[#f8fafc]' : 'bg-[#050505]';
  const textColor = isLight ? 'text-[#475569]' : 'text-[#A1A1AA]';
  const headingColor = isLight ? 'text-[#0f172a]' : 'text-white';
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.045)';
  const cardBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#111111]';
  const cardBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#262626]';
  const dividerColor = isLight ? 'bg-[#e2e8f0]' : 'bg-[#262626]';
  const highlightText = isLight ? 'text-[#0f172a] font-medium' : 'text-white font-medium';

  useEffect(() => {
    if (shouldReduceMotion) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [shouldReduceMotion]);

  return (
    <div className={`${bgColor} ${textColor} min-h-screen relative overflow-x-hidden selection:bg-[#F97316]/25 selection:text-[#F97316]`}>
      {/* Background Engineering Grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: '44px 44px',
        }}
      />

      {/* Subtle Mouse-Responsive Radial Glow (Desktop Only) */}
      {!shouldReduceMotion && (
        <div
          className="fixed inset-0 pointer-events-none z-0 hidden lg:block transition-opacity duration-500 opacity-60"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(249, 115, 22, 0.06), transparent 80%)`,
          }}
        />
      )}

      <div className="relative z-10">
        <Navbar />

        <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-[1140px] mx-auto space-y-28">
          
          {/* HERO SECTION */}
          <motion.section
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            variants={staggerContainer}
            className="text-left relative"
          >
            {/* Floating Decorative Accent Element */}
            {!shouldReduceMotion && (
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-6 right-10 w-2 h-2 bg-[#F97316] hidden md:block opacity-60"
              />
            )}

            {/* 1. Small Neo-Brutalist Badge */}
            <motion.div variants={fadeInUp} className="inline-block mb-6">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 ${cardBg} border ${cardBorder} shadow-[2px_2px_0px_#F97316] text-[#F97316] font-mono text-xs font-bold uppercase tracking-wider`}>
                <span className="w-1.5 h-1.5 bg-[#F97316] rounded-full animate-pulse" />
                <span>ABOUT</span>
                <span className={textColor}>↓</span>
              </div>
            </motion.div>

            {/* 2. Editorial Heading - Animated Line by Line */}
            <h1 className={`text-4xl sm:text-6xl lg:text-7xl font-extrabold ${headingColor} tracking-tight leading-[1.05] mb-6 overflow-hidden`}>
              <motion.span variants={fadeInUp} className="block">
                Meetings Should
              </motion.span>
              <motion.span variants={fadeInUp} className="block text-[#F97316]">
                Create Progress.
              </motion.span>
            </h1>

            {/* 3. Description */}
            <motion.p
              variants={fadeInUp}
              className={`text-base sm:text-lg lg:text-xl ${textColor} max-w-2xl leading-relaxed mb-8`}
            >
              Sprintive transforms conversations into action. Every meeting becomes searchable knowledge, actionable tasks, and an organized sprint—automatically.
            </motion.p>

            {/* 4. Action Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
              <Button
                variant="orange"
                size="lg"
                onClick={() => navigate('/signup')}
                className="gap-2"
              >
                <Zap size={16} strokeWidth={2.5} />
                <span>Get Started Free</span>
              </Button>
              <Button
                variant="neutral"
                size="lg"
                onClick={() => navigate('/contact')}
                className="gap-2"
              >
                <span>Talk to Engineering</span>
                <ArrowRight size={15} />
              </Button>
            </motion.div>
          </motion.section>

          {/* PHILOSOPHY SECTION */}
          <motion.section
            initial={shouldReduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="pt-12 relative"
          >
            {/* Animated Expanding Divider */}
            <motion.div
              variants={lineExpand}
              className={`w-full h-[1px] ${dividerColor} origin-left mb-16`}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <motion.div variants={fadeInUp} className="lg:col-span-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 bg-[#F97316]" />
                  <span className="text-xs font-mono font-bold text-[#F97316] uppercase tracking-wider">
                    01 / PHILOSOPHY
                  </span>
                </div>
                <h2 className={`text-2xl sm:text-3xl font-extrabold ${headingColor} tracking-tight`}>
                  Why Sprintive Exists
                </h2>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className={`lg:col-span-8 space-y-4 text-sm sm:text-base ${textColor} leading-relaxed`}
              >
                <p>
                  Modern teams spend too much time manually documenting meetings, taking notes, and assigning tasks instead of building great products.
                </p>
                <p className={`${highlightText} border-l-2 border-[#F97316] pl-4 py-1`}>
                  Sprintive removes manual work by allowing AI to capture conversations, identify key decisions, extract action items, and organize work automatically.
                </p>
              </motion.div>
            </div>
          </motion.section>

          {/* PRINCIPLES SECTION */}
          <motion.section
            initial={shouldReduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="space-y-8"
          >
            <motion.div variants={fadeInUp}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 bg-[#F97316]" />
                <span className="text-xs font-mono font-bold text-[#F97316] uppercase tracking-wider">
                  02 / PRINCIPLES
                </span>
              </div>
              <h2 className={`text-2xl sm:text-3xl font-extrabold ${headingColor} tracking-tight`}>
                Our Core Principles
              </h2>
            </motion.div>

            {/* Staggered Principle Cards */}
            <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {principles.map((p) => {
                const Icon = p.icon;
                return (
                  <motion.div
                    key={p.title}
                    variants={fadeInUp}
                    className={`p-6 ${cardBg} border-2 ${isLight ? 'border-[#0f172a]' : 'border-black'} shadow-[4px_4px_0px_#FFFFFF] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#FFFFFF] hover:border-[#F97316]/60 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden`}
                  >
                    {/* Subtle Orange Hover Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#F97316] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                    <div>
                      <div className={`w-10 h-10 ${isLight ? 'bg-white' : 'bg-[#1A1A1A]'} border ${cardBorder} flex items-center justify-center text-[#F97316] mb-4 group-hover:border-[#F97316] transition-colors`}>
                        <Icon size={20} strokeWidth={2} />
                      </div>
                      <h3 className={`text-lg font-bold ${headingColor} mb-2 group-hover:text-[#F97316] transition-colors`}>
                        {p.title}
                      </h3>
                      <p className={`text-xs sm:text-sm ${textColor} leading-relaxed`}>
                        {p.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.section>

          {/* VISION SECTION */}
          <motion.section
            initial={shouldReduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeInUp}
            className={`${cardBg} border-2 ${isLight ? 'border-[#0f172a]' : 'border-black'} shadow-[6px_6px_0px_#FFFFFF] p-8 sm:p-12 text-left relative overflow-hidden`}
          >
            {/* Subtle floating dot */}
            {!shouldReduceMotion && (
              <motion.div
                animate={{ x: [0, 10, 0], y: [0, -6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-6 right-8 w-2 h-2 bg-[#F97316]/50 rounded-full"
              />
            )}

            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 bg-[#F97316]" />
              <span className="text-xs font-mono font-bold text-[#F97316] uppercase tracking-wider">
                03 / VISION
              </span>
            </div>

            <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold ${headingColor} tracking-tight leading-tight mb-4`}>
              The Future Of Meetings <br />
              <span className="text-[#F97316]">Is Action.</span>
            </h2>
            <p className={`text-sm sm:text-base ${textColor} max-w-2xl leading-relaxed`}>
              We envision a world where meetings are no longer a disruption to deep work, but a catalyst for immediate execution.
            </p>
          </motion.section>

          {/* CTA SECTION */}
          <motion.section
            initial={shouldReduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="pt-12 pb-8 text-center sm:text-left relative"
          >
            {/* Horizontal Expanding Divider */}
            <motion.div
              variants={lineExpand}
              className={`w-full h-[1px] ${dividerColor} origin-left mb-12`}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <motion.div variants={fadeInUp}>
                <h2 className={`text-2xl sm:text-3xl font-extrabold ${headingColor} tracking-tight mb-2`}>
                  Ready To Experience Sprintive?
                </h2>
                <p className={`text-xs sm:text-sm ${textColor}`}>
                  Join high-performing teams automating meeting notes and execution.
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  variant="orange"
                  size="lg"
                  onClick={() => navigate('/signup')}
                  className="gap-2 justify-center"
                >
                  <Zap size={16} strokeWidth={2.5} />
                  <span>Start Free Trial</span>
                </Button>
                <Button
                  variant="neutral"
                  size="lg"
                  onClick={() => navigate('/contact')}
                  className="gap-2 justify-center"
                >
                  <span>Book Demo</span>
                  <ArrowRight size={15} />
                </Button>
              </motion.div>
            </div>
          </motion.section>

        </main>

        <Footer />
      </div>
    </div>
  );
}
