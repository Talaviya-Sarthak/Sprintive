import React, { useState } from 'react';
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
    <div className="flex flex-col h-full border-r w-[265px] select-none" style={{ backgroundColor: 'var(--app-surface-subtle)', borderColor: 'var(--app-border-subtle)' }}>
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
        <div
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-xs" style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)' }}>
            <Brain size={15} style={{ color: 'var(--app-text-primary)' }} strokeWidth={2.2} />
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
            Sprintive
          </span>
        </div>

        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border" style={{ color: 'var(--app-text-secondary)', backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)' }}>
          PRO
        </span>
      </div>

      {/* Team Switcher Dropdown */}
      <div className="px-3 py-3 border-b relative" style={{ borderColor: 'var(--app-border-subtle)' }}>
        <button
          onClick={() => setTeamMenuOpen(v => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left cursor-pointer"
          style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--app-surface-card)'}
        >
          <div
            className="w-5.5 h-5.5 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ backgroundColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}
          >
            {currentTeam?.name?.[0]?.toUpperCase() ?? 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--app-text-primary)' }}>
              {currentTeam?.name ?? 'Personal Workspace'}
            </p>
          </div>
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${teamMenuOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--app-text-muted)' }}
          />
        </button>

        <AnimatePresence>
          {teamMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-3 right-3 top-full mt-1.5 p-1.5 border rounded-xl shadow-xl z-50 space-y-1"
              style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
            >
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--app-text-muted)' }}>
                Workspaces
              </div>
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setTeamMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer"
                style={{
                  backgroundColor: !teamId ? 'var(--app-surface-hover)' : 'transparent',
                  color: !teamId ? 'var(--app-text-primary)' : 'var(--app-text-secondary)',
                  fontWeight: !teamId ? 500 : 400
                }}
              >
                <div className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}>
                  D
                </div>
                <span className="truncate">Main Dashboard</span>
                {!teamId && <Check size={13} className="ml-auto" style={{ color: 'var(--app-text-primary)' }} />}
              </button>

              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    navigate(`/teams/${t.id}`);
                    setTeamMenuOpen(false);
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer"
                  style={{
                    backgroundColor: t.id === teamId ? 'var(--app-surface-hover)' : 'transparent',
                    color: t.id === teamId ? 'var(--app-text-primary)' : 'var(--app-text-secondary)',
                    fontWeight: t.id === teamId ? 500 : 400
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}
                  >
                    {t.name[0].toUpperCase()}
                  </div>
                  <span className="truncate">{t.name}</span>
                  {t.id === teamId && <Check size={13} className="ml-auto" style={{ color: 'var(--app-text-primary)' }} />}
                </button>
              ))}

              <div className="my-1 border-t" style={{ borderColor: 'var(--app-border-subtle)' }} />
              <button
                onClick={() => {
                  navigate('/teams/create');
                  setTeamMenuOpen(false);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer"
                style={{ color: 'var(--app-text-secondary)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                  e.currentTarget.style.color = 'var(--app-text-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--app-text-secondary)';
                }}
              >
                <Plus size={13} />
                <span>Create New Team</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto app-scrollbar">
        <div className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--app-text-muted)' }}>
          Menu
        </div>

        <NavLink
          to="/dashboard"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
          style={({ isActive }: { isActive: boolean }) => ({
            backgroundColor: isActive ? 'var(--app-surface-hover)' : 'transparent',
            color: isActive ? 'var(--app-text-primary)' : 'var(--app-text-secondary)'
          })}
          onMouseEnter={e => {
            if (!e.currentTarget.classList.contains('active')) {
              e.currentTarget.style.backgroundColor = 'var(--app-surface-card)';
              e.currentTarget.style.color = 'var(--app-text-primary)';
            }
          }}
          onMouseLeave={e => {
            if (!e.currentTarget.classList.contains('active')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--app-text-secondary)';
            }
          }}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>

        {navItems.length > 0 && (
          <div className="pt-3 space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--app-text-muted)' }}>
              Team Workspace
            </div>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={label === 'Overview'}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
                style={({ isActive }: { isActive: boolean }) => ({
                  backgroundColor: isActive ? 'var(--app-surface-hover)' : 'transparent',
                  color: isActive ? 'var(--app-text-primary)' : 'var(--app-text-secondary)'
                })}
                onMouseEnter={e => {
                  if (!e.currentTarget.classList.contains('active')) {
                    e.currentTarget.style.backgroundColor = 'var(--app-surface-card)';
                    e.currentTarget.style.color = 'var(--app-text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!e.currentTarget.classList.contains('active')) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--app-text-secondary)';
                  }
                }}
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
        <div className="px-3 pb-2 pt-1 text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--app-text-muted)' }}>
          Quick Access
        </div>
        <button
          onClick={() => {
            navigate(teamId ? `/teams/${teamId}/meetings` : '/dashboard');
            setSidebarOpen(false);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer"
          style={{ color: 'var(--app-text-secondary)' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'var(--app-surface-card)';
            e.currentTarget.style.color = 'var(--app-text-primary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--app-text-secondary)';
          }}
        >
          <Folder size={16} />
          <span>All Meetings</span>
        </button>
      </div>

      {/* User Footer Profile */}
      <div className="px-3 py-3 border-t relative" style={{ borderColor: 'var(--app-border-subtle)' }}>
        <div className="flex items-center justify-between">
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 hover:opacity-90 transition-opacity"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden" style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--app-text-primary)' }}>{user?.full_name}</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--app-text-muted)' }}>{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => setUserMenuOpen(v => !v)}
            className="p-1 rounded-md transition-colors cursor-pointer"
            style={{ color: 'var(--app-text-muted)' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--app-text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--app-text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute left-3 right-3 bottom-full mb-2 p-1.5 border rounded-xl shadow-xl z-50 space-y-1"
              style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
            >
              <button
                onClick={() => {
                  navigate('/profile');
                  setUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer"
                style={{ color: 'var(--app-text-secondary)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                  e.currentTarget.style.color = 'var(--app-text-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--app-text-secondary)';
                }}
              >
                <User size={14} />
                <span>View Profile</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer"
                style={{ color: '#EF4444' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text-secondary)' }}>
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
              className="fixed inset-0 z-40 md:hidden"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
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
                  className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--app-surface-hover)', color: 'var(--app-text-secondary)', borderColor: 'var(--app-border)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--app-text-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--app-surface-active)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--app-text-secondary)';
                    e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                  }}
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
        <header className="h-12 backdrop-blur-md border-b px-4 flex items-center justify-between shrink-0 select-none z-30" style={{ backgroundColor: 'var(--app-surface-subtle)', borderColor: 'var(--app-border-subtle)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1 rounded-md"
              style={{ color: 'var(--app-text-muted)' }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--app-text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--app-text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Menu size={18} />
            </button>

            {/* Quick Search */}
            <div className="relative hidden sm:flex items-center w-64 md:w-80">
              <Search size={13} className="absolute left-2.5 pointer-events-none" style={{ color: 'var(--app-text-muted)' }} />
              <input
                type="text"
                placeholder="Search meetings, tasks, team..."
                className="w-full border rounded-lg pl-8 pr-8 py-1.5 text-xs outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--app-surface-card)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text-primary)'
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--app-border-focus)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--app-border)'}
              />
              <kbd className="absolute right-2 text-[9px] font-mono px-1.5 py-0.5 rounded border" style={{ color: 'var(--app-text-muted)', backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)' }}>
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* New Meeting CTA */}
            <button
              onClick={() => navigate(teamId ? `/meetings/create?team_id=${teamId}` : '/meetings/create')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-xs cursor-pointer"
              style={{ backgroundColor: 'var(--app-text-primary)', color: 'var(--app-bg)' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline">New Meeting</span>
            </button>

            {/* Notifications Popover Toggle */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(v => !v)}
                className="relative p-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ color: 'var(--app-text-muted)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--app-text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--app-text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Bell size={15} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--app-text-primary)' }} />
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute right-0 top-full mt-1.5 w-80 border rounded-xl shadow-xl p-3 z-50 space-y-2"
                    style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
                  >
                    <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
                      <span className="text-xs font-semibold" style={{ color: 'var(--app-text-primary)' }}>Notifications</span>
                      <span className="text-[10px] font-mono cursor-pointer" style={{ color: 'var(--app-text-secondary)' }}>
                        Mark all read
                      </span>
                    </div>

                    <div className="space-y-1 mt-2 max-h-60 overflow-y-auto app-scrollbar">
                      {mockNotifications.map(n => (
                        <div
                          key={n.id}
                          className="p-2 rounded-lg transition-colors cursor-pointer text-xs"
                          style={{ color: 'var(--app-text-primary)' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <p className="font-medium">{n.title}</p>
                          <span className="text-[9px]" style={{ color: 'var(--app-text-muted)' }}>{n.time}</span>
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
        <main className="flex-1 overflow-y-auto app-scrollbar" style={{ backgroundColor: 'var(--app-bg)' }}>{children}</main>
      </div>
    </div>
  );
}
