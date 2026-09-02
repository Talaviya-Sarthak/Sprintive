import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, Menu, X, Zap, Sun, Moon } from 'lucide-react';
import { Button } from './ui/Button';
import { useTheme } from '../context/ThemeContext';

const links = ['Home', 'Features', 'Pricing', 'About', 'Contact'];
const ids = ['hero', 'features', 'pricing', 'about', 'contact'];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('hero');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (window.location.pathname === '/contact') {
      setActive('contact');
      return;
    }
    if (window.location.pathname === '/about') {
      setActive('about');
      return;
    }

    const onScroll = () => {
      setScrolled(window.scrollY > 16);
      const current = ids.findLast(id => {
        const el = document.getElementById(id);
        return el && el.getBoundingClientRect().top <= 120;
      });
      if (current) setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    if (id === 'contact') {
      navigate('/contact');
      setOpen(false);
      return;
    }
    if (id === 'about') {
      navigate('/about');
      setOpen(false);
      return;
    }

    if (window.location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
      setOpen(false);
      return;
    }

    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 right-0 z-[1000] py-3.5 px-4 md:px-8 transition-all duration-300"
    >
      <div
        className="max-w-[1320px] mx-auto flex items-center justify-between h-14 px-2 sm:px-4 rounded-lg transition-all duration-200"
        style={{
          backgroundColor: scrolled ? 'var(--landing-nav-scrolled-bg)' : 'var(--landing-nav-bg)',
          backdropFilter: scrolled ? 'blur(12px)' : 'none'
        }}
      >
        {/* Static Sprintive Logo (Not in a button) */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer select-none py-1 group"
        >
          <div className="w-8 h-8 rounded-md bg-[#F97316] flex items-center justify-center shrink-0" style={{ boxShadow: 'var(--landing-shadow)' }}>
            <Brain size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="text-[18px] font-extrabold tracking-[-0.03em]" style={{ color: 'var(--landing-text-heading)' }}>
            Sprin<span className="text-[#F97316]">tive</span>
          </span>
        </div>

        {/* Desktop Navigation Links — Slightly Rounded Neo-Brutalist Buttons */}
        <div className="hidden md:flex gap-2.5 items-center">
          {links.map((l, i) => {
            const isActive = active === ids[i];
            return (
              <Button
                key={l}
                variant={isActive ? 'active' : 'neutral'}
                size="default"
                onClick={() => scrollTo(ids[i])}
              >
                {l}
              </Button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-[4px] border-2 border-[#111111] flex items-center justify-center cursor-pointer transition-all duration-150 active:translate-x-[3px] active:translate-y-[3px]"
            style={{ 
              backgroundColor: theme === 'dark' ? '#111111' : '#f8fafc',
              color: theme === 'dark' ? '#F97316' : '#F97316',
              boxShadow: 'var(--landing-shadow)'
            }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <Button
            variant="neutral"
            size="default"
            onClick={() => navigate('/login')}
            className="hidden md:inline-flex"
          >
            Login
          </Button>

          <Button
            variant="orange"
            size="default"
            onClick={() => navigate('/signup')}
            className="gap-1.5"
          >
            <Zap size={13} strokeWidth={2.5} /> Get Started
          </Button>

          {/* Mobile Menu Toggle Button */}
          <Button
            variant="icon"
            size="icon"
            onClick={() => setOpen(o => !o)}
            className="md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="backdrop-blur-md border-2 rounded-lg p-4 mt-3 flex flex-col gap-2 max-w-[1320px] mx-auto"
            style={{ 
              backgroundColor: 'var(--landing-card-bg)',
              borderColor: 'var(--landing-card-border)',
              boxShadow: 'var(--landing-shadow)'
            }}
          >
            {links.map((l, i) => (
              <Button
                key={l}
                variant={active === ids[i] ? 'active' : 'neutral'}
                size="default"
                onClick={() => scrollTo(ids[i])}
                className="w-full justify-start text-left"
              >
                {l}
              </Button>
            ))}

            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-[4px] border-2 border-[#111111] cursor-pointer transition-all duration-150"
              style={{ 
                backgroundColor: theme === 'dark' ? '#111111' : '#f8fafc',
                color: theme === 'dark' ? '#ffffff' : '#0f172a',
                boxShadow: 'var(--landing-shadow)'
              }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span className="text-[12px] font-extrabold uppercase tracking-wider">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>

            <div className="flex gap-2.5 mt-2 pt-2 border-t-2" style={{ borderColor: 'var(--landing-card-border)' }}>
              <Button
                variant="neutral"
                size="default"
                onClick={() => { navigate('/login'); setOpen(false); }}
                className="flex-1"
              >
                Login
              </Button>
              <Button
                variant="orange"
                size="default"
                onClick={() => { navigate('/signup'); setOpen(false); }}
                className="flex-1 gap-1.5"
              >
                <Zap size={13} strokeWidth={2.5} /> Get Started
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
