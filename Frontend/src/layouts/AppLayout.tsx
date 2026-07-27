import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, LayoutDashboard, Users, Settings, User, LogOut, ChevronDown, Menu, X, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  teamId?: string;
}

export default function AppLayout({ children, teamId }: AppLayoutProps) {
  const { user, teams, logout } = useAuth();
  const { theme, toggleTheme }  = useTheme();
  const navigate  = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);

  const currentTeam = teamId ? teams.find(t => t.id === teamId) : null;
  const initials    = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = teamId ? [
    { to: `/teams/${teamId}`,          icon: LayoutDashboard, label: 'Overview'  },
    { to: `/teams/${teamId}/members`,  icon: Users,           label: 'Members'   },
    { to: `/teams/${teamId}/settings`, icon: Settings,        label: 'Settings'  },
    { to: `/teams/${teamId}/meetings`, icon: Calendar,        label: 'Meetings'  },
  ] : [];

  const sidebar = (
    <div className="flex flex-col h-full bg-[#0d1117] border-r border-white/6 w-64">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/6">
        <div className="w-8 h-8 rounded-[9px] bg-[#3B82F6] flex items-center justify-center shadow-[0_2px_8px_rgba(59,130,246,0.4)]">
          <Brain size={17} color="#fff" strokeWidth={2.2} />
        </div>
        <span className="text-[17px] font-bold text-[#F8FAFC] tracking-[-0.03em]">
          Sprintive
        </span>
      </div>

      {/* Team switcher */}
      {teams.length > 0 && (
        <div className="px-3 py-3 border-b border-white/6">
          <button
            onClick={() => setTeamMenuOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: currentTeam?.color ?? '#3B82F6' }}
            >
              {currentTeam?.name?.[0]?.toUpperCase() ?? 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#F8FAFC] truncate">{currentTeam?.name ?? 'Select Team'}</p>
              <p className="text-[11px] text-[#475569] capitalize">{currentTeam?.my_role?.replace('_', ' ') ?? ''}</p>
            </div>
            <ChevronDown size={14} className={`text-[#475569] transition-transform ${teamMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {teamMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1 space-y-0.5"
              >
                {teams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { navigate(`/teams/${t.id}`); setTeamMenuOpen(false); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${t.id === teamId ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'hover:bg-white/5 text-[#CBD5E1]'}`}
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: t.color }}>
                      {t.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm truncate">{t.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => { navigate('/teams/create'); setTeamMenuOpen(false); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-white/5 text-[#475569] hover:text-[#94A3B8] transition-colors"
                >
                  <div className="w-6 h-6 rounded-md border border-dashed border-white/20 flex items-center justify-center text-[#475569] text-sm">+</div>
                  <span className="text-sm">New Team</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <NavLink
          to="/dashboard"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'}`
          }
        >
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={label === 'Overview'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'}`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-white/6 space-y-0.5">
        <NavLink
          to="/profile"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'}`
          }
        >
          <User size={16} />
          Profile
        </NavLink>

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC] transition-colors"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>

        {/* User chip */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
            {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" /> : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#F8FAFC] truncate">{user?.full_name}</p>
            <p className="text-[11px] text-[#475569] truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0B1220] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">{sidebar}</div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/6 bg-[#0d1117]">
          <button onClick={() => setSidebarOpen(true)} className="text-[#94A3B8]">
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-[#F8FAFC]">{currentTeam?.name ?? 'Sprintive'}</span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold overflow-hidden">
            {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" /> : initials}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
