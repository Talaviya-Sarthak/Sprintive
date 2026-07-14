import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, Menu, X, Sun, Moon, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

const links = ['Home', 'Features', 'How It Works', 'Pricing', 'Testimonials', 'Contact'];
const ids    = ['hero', 'features', 'how-it-works', 'pricing', 'testimonials', 'contact'];

export default function Navbar({ theme: themeProp, toggleTheme: toggleProp }) {
  // Support both prop-based (legacy) and context-based usage
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

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  };

  const navBg = scrolled
    ? theme === 'dark' ? 'rgba(11,18,32,0.92)' : 'rgba(255,255,255,0.92)'
    : 'transparent';

  return (
    <motion.nav
      initial={{ y: -72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: navBg,
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

        {/* Logo */}
        <motion.button whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(59,130,246,0.4)', flexShrink: 0 }}>
            <Brain size={17} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.03em', fontFamily: 'var(--font)' }}>
            Scrum<span style={{ color: 'var(--primary)' }}>Mind</span>
          </span>
        </motion.button>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }} className="sm-desktop-nav">
          {links.map((l, i) => {
            const isActive = active === ids[i];
            return (
              <button key={l} onClick={() => scrollTo(ids[i])} style={{
                background: isActive ? 'var(--primary-glow)' : 'none',
                border: 'none', cursor: 'pointer',
                color: isActive ? 'var(--primary)' : 'var(--text)',
                fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                padding: '7px 13px', borderRadius: 8,
                transition: 'all 0.2s ease', fontFamily: 'var(--font)', letterSpacing: '-0.01em',
              }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text-h)'; e.currentTarget.style.background = 'var(--surface2)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'none'; } }}
              >{l}</button>
            );
          })}
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleTheme}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', flexShrink: 0 }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </motion.button>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/login')}
            className="btn-secondary sm-desktop-nav" style={{ padding: '7px 18px', fontSize: 13.5 }}>
            Login
          </motion.button>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/signup')}
            className="btn-primary" style={{ padding: '8px 18px', fontSize: 13.5 }}>
            <Zap size={13} /> Get Started
          </motion.button>

          <button onClick={() => setOpen(o => !o)} className="sm-mobile-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-h)', display: 'none', padding: 6, borderRadius: 8 }}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            style={{ background: theme === 'dark' ? 'rgba(11,18,32,0.98)' : 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)', padding: '8px 20px 24px' }}>
            {links.map((l, i) => (
              <button key={l} onClick={() => scrollTo(ids[i])} style={{
                display: 'flex', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                color: active === ids[i] ? 'var(--primary)' : 'var(--text-h)',
                fontSize: 15, fontWeight: 500, padding: '13px 4px',
                borderBottom: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font)', letterSpacing: '-0.01em',
              }}>{l}</button>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { navigate('/login'); setOpen(false); }} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Login</button>
              <button onClick={() => { navigate('/signup'); setOpen(false); }} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                <Zap size={13} /> Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 860px) { .sm-desktop-nav { display: none !important; } .sm-mobile-btn { display: flex !important; } }
        @media (max-width: 480px) { nav > div { padding: 0 16px !important; } }
      `}</style>
    </motion.nav>
  );
}
