import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, Menu, X, Zap } from 'lucide-react';
import { Button } from './ui/Button';

const links = ['Home', 'Features', 'How It Works', 'Pricing', 'Testimonials', 'FAQ'];
const ids = ['hero', 'features', 'how-it-works', 'pricing', 'testimonials', 'contact'];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('hero');
  const navigate = useNavigate();

  useEffect(() => {
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
        className={[
          'max-w-[1320px] mx-auto flex items-center justify-between h-14 px-2 sm:px-4 rounded-lg bg-transparent transition-all duration-200',
          scrolled ? 'backdrop-blur-md bg-black/40' : 'bg-transparent',
        ].join(' ')}
      >
        {/* Static Sprintive Logo (Not in a button) */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer select-none py-1 group"
        >
          <div className="w-8 h-8 rounded-md bg-[#F97316] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#FFFFFF]">
            <Brain size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="text-[18px] font-extrabold text-white tracking-[-0.03em]">
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
            className="bg-[#111111]/95 backdrop-blur-md border-2 border-black rounded-lg shadow-[4px_4px_0px_#FFFFFF] p-4 mt-3 flex flex-col gap-2 max-w-[1320px] mx-auto"
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

            <div className="flex gap-2.5 mt-2 pt-2 border-t-2 border-[#262626]">
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
