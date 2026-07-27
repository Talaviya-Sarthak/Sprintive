import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-[#050505] text-[#A1A1AA] min-h-screen lg:h-screen flex flex-col justify-between relative overflow-x-hidden lg:overflow-hidden selection:bg-[#F97316]/25 selection:text-[#F97316]">
      {/* Background Engineering Grid Canvas */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Minimal Header */}
        <header className="px-6 py-4 max-w-[1280px] w-full mx-auto flex items-center justify-between">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-md bg-[#F97316] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#FFFFFF]">
              <Brain size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <span className="text-[18px] font-extrabold text-white tracking-[-0.03em]">
              Sprin<span className="text-[#F97316]">tive</span>
            </span>
          </div>

          <button
            onClick={() => navigate('/')}
            className="text-xs font-mono font-bold text-[#A1A1AA] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 bg-[#111111] px-3 py-1.5 border border-[#262626] shadow-[2px_2px_0px_#000000]"
          >
            <span>←</span>
            <span>BACK TO HOME</span>
          </button>
        </header>

        {/* Centered Main Viewport Container */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-2 w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-[420px]"
          >
            {children}
          </motion.div>
        </main>

        {/* Minimal Footer Line */}
        <footer className="px-6 py-3 max-w-[1280px] w-full mx-auto flex items-center justify-between text-[11px] font-mono text-[#52525B]">
          <span>© 2026 Sprintive Inc. All rights reserved.</span>
          <span className="hidden sm:inline">Protected by Enterprise Encryption</span>
        </footer>
      </div>
    </div>
  );
}
