import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  X,
  Folder,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  teamId?: string;
}

export default function AppLayout({ children, teamId }: AppLayoutProps) {
  const { user, teams, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => {
      setTeamMenuOpen(false);
      setUserMenuOpen(false);
      setNotificationsOpen(false);
    };
    if (teamMenuOpen || userMenuOpen || notificationsOpen) {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [teamMenuOpen, userMenuOpen, notificationsOpen]);

  const sidebar = (
    <div className="flex flex-col h-full bg-[#0c0c0e] border-r border-[#1a1a1e] w-[260px] select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1e]">
        <div
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center shadow-md shadow-[#F97316]/20">
            <Brain size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold text-[#f4f4f5] tracking-tight">
            Sprintive
          </span>
        </div>

        <span className="text-[9px] font-mono font-semibold text-[#F97316] bg-[#F97316]/10 px-2 py-0.5 rounded-md border border-[#F97316]/20">
          PRO
        </span>
      </div>

      {/* Team Switcher Dropdown */}
      <div className="px-3 pt-4 pb-3 relative">
        <button
          onClick={(e) => { e.stopPropagation(); setTeamMenuOpen(v => !v); }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#141417] hover:bg-[#1a1a1e] border border-[#27272a] transition-all duration-150 text-left cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[#f4f4f5] text-[11px] font-bold shrink-0 bg-[#27272a] group-hover:bg-[#3f3f46] transition-colors">
            {currentTeam?.name?.[0]?.toUpperCase() ?? 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#f4f4f5] truncate">
              {currentTeam?.name ?? 'Personal Workspace'}
            </p>
          </div>
          <ChevronDown
            size={14}
            className={`text-[#71717a] transition-transform duration-200 ${
              teamMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {teamMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute left-3 right-3 top-full mt-1.5 p-1.5 bg-[#141417] border border-[#27272a] rounded-xl shadow-2xl z-50 space-y-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#52525b] font-semibold">
                Workspaces
              </div>
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setTeamMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] transition-colors cursor-pointer ${
                  !teamId
                    ? 'bg-[#F97316]/10 text-[#F97316] font-medium'
                    : 'text-[#a1a1aa] hover:bg-[#1c1c21] hover:text-[#f4f4f5]'
                }`}
              >
                <div className="w-5 h-5 rounded-md bg-[#27272a] text-[#f4f4f5] text-[10px] font-bold flex items-center justify-center">
                  D
                </div>
                <span className="truncate">Main Dashboard</span>
                {!teamId && <Check size={13} className="ml-auto text-[#F97316]" />}
              </button>

              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    navigate(`/teams/${t.id}`);
                    setTeamMenuOpen(false);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] transition-colors cursor-pointer ${
                    t.id === teamId
                      ? 'bg-[#F97316]/10 text-[#F97316] font-medium'
                      : 'text-[#a1a1aa] hover:bg-[#1c1c21] hover:text-[#f4f4f5]'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[#f4f4f5] text-[10px] font-bold shrink-0 bg-[#27272a]"
                  >
                    {t.name[0].toUpperCase()}
                  </div>
                  <span className="truncate">{t.name}</span>
                  {t.id === teamId && <Check size={13} className="ml-auto text-[#F97316]" />}
                </button>
              ))}

              <div className="my-1 border-t border-[#1a1a1e]" />
              <button
                onClick={() => {
                  navigate('/teams/create');
                  setTeamMenuOpen(false);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13px] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1c1c21] transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Create New Team</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto app-scrollbar">
        <div className="px-3 pb-2 pt-1 text-[10px] font-mono uppercase tracking-wider text-[#52525b] font-semibold">
          Menu
        </div>

        <NavLink
          to="/dashboard"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
              isActive
                ? 'bg-[#F97316]/10 text-[#F97316]'
                : 'text-[#a1a1aa] hover:bg-[#141417] hover:text-[#f4f4f5]'
            }`
          }
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>

        {navItems.length > 0 && (
          <div className="pt-4 space-y-0.5">
            <div className="px-3 pb-2 pt-1 text-[10px] font-mono uppercase tracking-wider text-[#52525b] font-semibold">
              Team Workspace
            </div>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={label === 'Overview'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#F97316]/10 text-[#F97316]'
                      : 'text-[#a1a1aa] hover:bg-[#141417] hover:text-[#f4f4f5]'
                  }`
                }
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Quick Links */}
      <div className="px-3 pb-2">
        <div className="px-3 pb-2 pt-1 text-[10px] font-mono uppercase tracking-wider text-[#52525b] font-semibold">
          Quick Access
        </div>
        <button
          onClick={() => {
            navigate(teamId ? `/teams/${teamId}/meetings` : '/dashboard');
            setSidebarOpen(false);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#a1a1aa] hover:bg-[#141417] hover:text-[#f4f4f5] transition-all duration-150 cursor-pointer"
        >
          <Folder size={16} />
          <span>All Meetings</span>
        </button>
      </div>

      {/* User Footer Profile */}
      <div className="px-3 py-3 border-t border-[#1a1a1e] relative">
        <div className="flex items-center justify-between">
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-[#1c1c21] border border-[#27272a] flex items-center justify-center text-[#f4f4f5] text-xs font-semibold shrink-0 overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[#f4f4f5] truncate">{user?.full_name}</p>
              <p className="text-[11px] text-[#71717a] truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setUserMenuOpen(v => !v); }}
            className="p-1.5 text-[#71717a] hover:text-[#f4f4f5] rounded-md hover:bg-[#1c1c21] transition-colors cursor-pointer"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute left-3 right-3 bottom-full mb-2 p-1.5 bg-[#141417] border border-[#27272a] rounded-xl shadow-2xl z-50 space-y-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  navigate('/profile');
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-[#a1a1aa] hover:bg-[#1c1c21] hover:text-[#f4f4f5] transition-colors cursor-pointer"
              >
                <User size={14} />
                <span>View Profile</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#09090b] text-[#a1a1aa] overflow-hidden">
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
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              <div className="relative h-full">
                {sidebar}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#1c1c21] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content & Top Header Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* SaaS Top Header Bar */}
        <header className="h-14 bg-[#0c0c0e]/80 backdrop-blur-xl border-b border-[#1a1a1e] px-4 md:px-6 flex items-center justify-between shrink-0 select-none z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 text-[#71717a] hover:text-[#f4f4f5] rounded-lg hover:bg-[#1c1c21] transition-colors"
            >
              <Menu size={18} />
            </button>

            {/* Quick Search */}
            <div className="relative hidden sm:flex items-center w-64 md:w-80">
              <Search size={14} className="absolute left-3 text-[#52525b] pointer-events-none" />
              <input
                type="text"
                placeholder="Search meetings, tasks, team..."
                className="w-full bg-[#141417] border border-[#27272a] rounded-lg pl-9 pr-10 py-2 text-[13px] text-[#f4f4f5] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] focus:ring-1 focus:ring-[#3f3f46]/50 transition-all duration-150"
              />
              <kbd className="absolute right-2.5 text-[9px] font-mono text-[#52525b] bg-[#1c1c21] px-1.5 py-0.5 rounded border border-[#27272a]">
                /
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* New Meeting CTA */}
            <button
              onClick={() => navigate(teamId ? `/meetings/create?team_id=${teamId}` : '/meetings/create')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-[13px] transition-all duration-150 shadow-sm shadow-[#F97316]/20 hover:shadow-md hover:shadow-[#F97316]/25 active:scale-[0.98] cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline">New Meeting</span>
            </button>

            {/* Notifications Popover Toggle */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setNotificationsOpen(v => !v); }}
                className="relative p-2 rounded-lg text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#1c1c21] transition-colors duration-150 cursor-pointer"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F97316] ring-2 ring-[#0c0c0e]" />
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-[#141417] border border-[#27272a] rounded-xl shadow-2xl p-3 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-[#1a1a1e]">
                      <span className="text-[13px] font-semibold text-[#f4f4f5]">Notifications</span>
                      <span className="text-[11px] text-[#71717a] hover:text-[#f4f4f5] cursor-pointer transition-colors">
                        Mark all read
                      </span>
                    </div>

                    <div className="space-y-1 mt-2 max-h-60 overflow-y-auto app-scrollbar">
                      {mockNotifications.map(n => (
                        <div
                          key={n.id}
                          className="p-2.5 rounded-lg hover:bg-[#1c1c21] transition-colors cursor-pointer text-[13px]"
                        >
                          <div className="flex items-start gap-2">
                            {n.unread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] mt-1.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium ${n.unread ? 'text-[#f4f4f5]' : 'text-[#a1a1aa]'}`}>{n.title}</p>
                              <span className="text-[11px] text-[#52525b]">{n.time}</span>
                            </div>
                          </div>
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
        <main className="flex-1 overflow-y-auto bg-[#09090b] app-scrollbar">{children}</main>
      </div>
    </div>
  );
}
