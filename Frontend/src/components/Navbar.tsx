import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, Menu, X, Sun, Moon, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const links = ['Home', 'Features', 'How It Works', 'Pricing', 'Testimonials', 'Contact'];
const ids    = ['hero', 'features', 'how-it-works', 'pricing', 'testimonials', 'contact'];

interface NavbarProps {
  theme?: string;
  toggleTheme?: () => void;
}

export default function Navbar({ theme: themeProp, toggleTheme: toggleProp }: NavbarProps) {
  const ctx = (() => { try { return useTheme(); } catch { return null; } })();
  const theme       = ctx ? ctx.theme       : themeProp;
  const toggleTheme = ctx ? ctx.toggleTheme : toggleProp;

  const [scrolled, setScrolled] = useState(false);
  const [open,     setOpen]     = useState(false);
  const [active,   setActive]   = useState('hero');
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
      const current = ids.findLast(id => {
        const el = document.getElementById(id);
        return el && el.getBoundingClientRect().top <= 100;
      });
      if (current) setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={[
        'fixed top-0 left-0 right-0 z-[1000] transition-all duration-300',
        scrolled
          ? theme === 'dark'
            ? 'bg-[#0B1220]/92 backdrop-blur-[20px] saturate-180 border-b border-white/7'
            : 'bg-white/92 backdrop-blur-[20px] saturate-180 border-b border-[#E2E8F0]'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      <div className="max-w-[1160px] mx-auto px-8 max-sm:px-4 flex items-center justify-between h-16">

        <motion.button
          whileHover={{ opacity: 0.85 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer p-0"
        >
          <div className="w-8 h-8 rounded-[9px] bg-[#3B82F6] flex items-center justify-center shadow-[0_2px_8px_rgba(59,130,246,0.4)] shrink-0">
            <Brain size={17} color="#fff" strokeWidth={2.2} />
          </div>
          <span className="text-[17px] font-bold text-[var(--color-text-h)] tracking-[-0.03em]">
            Scrum<span className="text-[#3B82F6]">Mind</span>
          </span>
        </motion.button>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-0.5 items-center">
          {links.map((l, i) => {
            const isActive = active === ids[i];
            return (
              <button
                key={l}
                onClick={() => scrollTo(ids[i])}
                className={[
                  'border-none cursor-pointer text-[13.5px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200 tracking-[-0.01em]',
                  isActive
                    ? 'bg-[rgba(59,130,246,0.12)] text-[#3B82F6] font-semibold'
                    : 'bg-transparent text-[var(--color-text-body)] hover:text-[var(--color-text-h)] hover:bg-[var(--color-surface2)]',
                ].join(' ')}
              >
                {l}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg w-[34px] h-[34px] cursor-pointer text-[var(--color-text-muted)] flex items-center justify-center transition-all duration-200 shrink-0"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/login')}
            className="hidden md:inline-flex items-center gap-2 px-[18px] py-[7px] bg-transparent text-[var(--color-text-h)] font-semibold text-[13.5px] rounded-xl border border-[var(--color-border2)] cursor-pointer transition-all duration-200 hover:bg-[var(--color-surface2)] hover:border-[#3B82F6] hover:text-[#3B82F6] hover:-translate-y-px active:translate-y-0 whitespace-nowrap tracking-[-0.01em]"
          >
            Login
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-2 px-[18px] py-2 bg-[#3B82F6] text-white font-semibold text-[13.5px] rounded-xl border-none cursor-pointer transition-all duration-200 hover:bg-[#2563EB] hover:-translate-y-px active:translate-y-0 whitespace-nowrap tracking-[-0.01em] shadow-[0_1px_3px_rgba(0,0,0,0.2),0_4px_12px_rgba(59,130,246,0.3)]"
          >
            <Zap size={13} /> Get Started
          </motion.button>

          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden bg-transparent border-none cursor-pointer text-[var(--color-text-h)] p-1.5 rounded-lg"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={[
              'backdrop-blur-[20px] border-t border-[var(--color-border)] px-5 pb-6 pt-2',
              theme === 'dark' ? 'bg-[#0B1220]/98' : 'bg-white/98',
            ].join(' ')}
          >
            {links.map((l, i) => (
              <button
                key={l}
                onClick={() => scrollTo(ids[i])}
                className={[
                  'flex w-full text-left bg-transparent border-none text-[15px] font-medium py-3 px-1 border-b border-[var(--color-border)] cursor-pointer tracking-[-0.01em]',
                  active === ids[i] ? 'text-[#3B82F6]' : 'text-[var(--color-text-h)]',
                ].join(' ')}
              >
                {l}
              </button>
            ))}
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => { navigate('/login'); setOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-transparent text-[var(--color-text-h)] font-semibold text-sm rounded-xl border border-[var(--color-border2)] cursor-pointer transition-all duration-200 hover:bg-[var(--color-surface2)] hover:border-[#3B82F6] hover:text-[#3B82F6]"
              >
                Login
              </button>
              <button
                onClick={() => { navigate('/signup'); setOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#3B82F6] text-white font-semibold text-sm rounded-xl border-none cursor-pointer transition-all duration-200 hover:bg-[#2563EB]"
              >
                <Zap size={13} /> Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
