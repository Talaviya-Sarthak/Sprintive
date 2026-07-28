import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  LayoutDashboard,
  Users,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Menu,
  Calendar,
  Search,
  Bell,
  Plus,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  teamId?: string;
}

export default function AppLayout({ children, teamId }: AppLayoutProps) {
  const { user, teams, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const currentTeam = teamId ? teams.find(t => t.id === teamId) : null;
  const initials =
    user?.full_name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = teamId
    ? [
        { to: `/teams/${teamId}`, icon: LayoutDashboard, label: 'Overview' },
        { to: `/teams/${teamId}/members`, icon: Users, label: 'Members' },
        { to: `/teams/${teamId}/settings`, icon: Settings, label: 'Settings' },
        { to: `/teams/${teamId}/meetings`, icon: Calendar, label: 'Meetings' },
      ]
    : [];

  const mockNotifications = [
    { id: 1, title: 'Sprint Review Scheduled', time: '10m ago', unread: true },
    { id: 2, title: 'Alex tagged you in AI Action Item', time: '1h ago', unread: true },
    { id: 3, title: 'Meeting Summary Ready for Scrum #14', time: '3h ago', unread: false },
  ];

  const sidebar = (
    <div className="flex flex-col h-full bg-[#0C0D14] border-r border-[#1E2232] w-[230px] select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#181A26]">
        <div
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-md bg-[#F97316] flex items-center justify-center shadow-xs">
            <Brain size={14} color="#ffffff" strokeWidth={2.2} />
          </div>
          <span className="text-sm font-bold text-[#F8FAFC] tracking-tight">
            Sprin<span className="text-[#F97316]">tive</span>
          </span>
        </div>

        <span className="text-[9px] font-mono font-semibold text-[#F97316] bg-[#F97316]/10 px-1.5 py-0.2 rounded border border-[#F97316]/20">
          PRO
        </span>
      </div>

      {/* Team Switcher Dropdown */}
      <div className="px-2.5 py-2.5 border-b border-[#181A26] relative">
        <button
          onClick={() => setTeamMenuOpen(v => !v)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#12141D] hover:bg-[#181B28] border border-[#1E2232] transition-all text-left cursor-pointer"
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-xs"
            style={{ background: currentTeam?.color ?? '#F97316' }}
          >
            {currentTeam?.name?.[0]?.toUpperCase() ?? 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-[#F8FAFC] truncate">
              {currentTeam?.name ?? 'Personal Workspace'}
            </p>
          </div>
          <ChevronDown
            size={12}
            className={`text-[#64748B] transition-transform duration-200 ${
              teamMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {teamMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-2.5 right-2.5 top-full mt-1.5 p-1 bg-[#12141D] border border-[#1E2232] rounded-xl shadow-2xl z-50 space-y-0.5"
            >
              <div className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">
                Workspaces
              </div>
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setTeamMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  !teamId
                    ? 'bg-[#181A26] text-[#F97316] font-semibold'
                    : 'text-[#CBD5E1] hover:bg-[#181A26]'
                }`}
              >
                <div className="w-4.5 h-4.5 rounded bg-[#F97316]/15 text-[#F97316] text-[9px] font-bold flex items-center justify-center">
                  D
                </div>
                <span className="truncate">Main Dashboard</span>
                {!teamId && <Check size={12} className="ml-auto" />}
              </button>

              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    navigate(`/teams/${t.id}`);
                    setTeamMenuOpen(false);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    t.id === teamId
                      ? 'bg-[#181A26] text-[#F97316] font-semibold'
                      : 'text-[#CBD5E1] hover:bg-[#181A26]'
                  }`}
                >
                  <div
                    className="w-4.5 h-4.5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                    style={{ background: t.color }}
                  >
                    {t.name[0].toUpperCase()}
                  </div>
                  <span className="truncate">{t.name}</span>
                  {t.id === teamId && <Check size={12} className="ml-auto" />}
                </button>
              ))}

              <div className="my-1 border-t border-[#181A26]" />
              <button
                onClick={() => {
                  navigate('/teams/create');
                  setTeamMenuOpen(false);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-[#94A3B8] hover:text-white hover:bg-[#181A26] transition-colors cursor-pointer"
              >
                <Plus size={12} />
                <span>Create New Team</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-2 py-2.5 space-y-0.5 overflow-y-auto app-scrollbar">
        <div className="px-2 pb-1 text-[9px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">
          Menu
        </div>

        <NavLink
          to="/dashboard"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              isActive
                ? 'bg-[#181A26] text-[#F8FAFC] font-semibold border-l-2 border-[#F97316]'
                : 'text-[#94A3B8] hover:bg-[#12141D] hover:text-[#F8FAFC]'
            }`
          }
        >
          <LayoutDashboard size={14} />
          <span>Dashboard</span>
        </NavLink>

        {navItems.length > 0 && (
          <div className="pt-2.5">
            <div className="px-2 pb-1 text-[9px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">
              Team Workspace
            </div>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={label === 'Overview'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#181A26] text-[#F8FAFC] font-semibold border-l-2 border-[#F97316]'
                      : 'text-[#94A3B8] hover:bg-[#12141D] hover:text-[#F8FAFC]'
                  }`
                }
              >
                <Icon size={14} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User Footer Profile */}
      <div className="px-2.5 py-2.5 border-t border-[#181A26] relative">
        <div className="flex items-center justify-between">
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 hover:opacity-90 transition-opacity"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-xs overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[#F8FAFC] truncate">{user?.full_name}</p>
              <p className="text-[9px] text-[#64748B] truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="p-1 text-[#64748B] hover:text-[#F8FAFC] rounded-md hover:bg-[#181B28] transition-colors cursor-pointer"
          >
            <ChevronDown size={13} />
          </button>
        </div>

        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute left-2.5 right-2.5 bottom-full mb-2 p-1 bg-[#12141D] border border-[#1E2232] rounded-xl shadow-2xl z-50 space-y-0.5"
            >
              <button
                onClick={() => {
                  navigate('/profile');
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[#CBD5E1] hover:bg-[#181A26] transition-colors cursor-pointer"
              >
                <User size={13} />
                <span>View Profile</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#08090E] text-[#CBD5E1] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">{sidebar}</div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -230 }}
              animate={{ x: 0 }}
              exit={{ x: -230 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content & Top Header Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* SaaS Top Header Bar */}
        <header className="h-12 bg-[#0C0D14]/90 backdrop-blur-md border-b border-[#1E2232] px-4 flex items-center justify-between shrink-0 select-none z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1 text-[#94A3B8] hover:text-white rounded-md hover:bg-[#181A26]"
            >
              <Menu size={16} />
            </button>

            {/* Quick Search */}
            <div className="relative hidden sm:flex items-center w-64 md:w-80">
              <Search size={13} className="absolute left-2.5 text-[#64748B] pointer-events-none" />
              <input
                type="text"
                placeholder="Search meetings, tasks, team..."
                className="w-full bg-[#12141D] border border-[#1E2232] rounded-md pl-8 pr-8 py-1 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#F97316] transition-colors"
              />
              <kbd className="absolute right-2 text-[9px] font-mono text-[#64748B] bg-[#171A26] px-1.5 py-0.2 rounded border border-[#232738]">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* New Meeting CTA */}
            <button
              onClick={() => navigate('/meetings/create')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
            >
              <Plus size={13} />
              <span className="hidden sm:inline">New Meeting</span>
            </button>

            {/* Notifications Popover Toggle */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(v => !v)}
                className="relative p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#171A26] transition-colors cursor-pointer"
              >
                <Bell size={15} />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#F97316]" />
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute right-0 top-full mt-1.5 w-80 bg-[#12141D] border border-[#1E2232] rounded-xl shadow-2xl p-3 z-50 space-y-2"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#181A26]">
                      <span className="text-xs font-bold text-[#F8FAFC]">Notifications</span>
                      <span className="text-[9px] font-mono text-[#F97316] font-semibold cursor-pointer">
                        Mark all read
                      </span>
                    </div>

                    <div className="space-y-1 max-h-60 overflow-y-auto app-scrollbar">
                      {mockNotifications.map(n => (
                        <div
                          key={n.id}
                          className="p-2 rounded-md hover:bg-[#181A26] transition-colors cursor-pointer text-xs"
                        >
                          <p className="font-medium text-[#F8FAFC]">{n.title}</p>
                          <span className="text-[9px] text-[#64748B]">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Dynamic Viewport Container */}
        <main className="flex-1 overflow-y-auto bg-[#08090E] app-scrollbar">{children}</main>
      </div>
    </div>
  );
}


