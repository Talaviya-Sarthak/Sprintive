import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Users,
  ArrowRight,
  Mail,
  Calendar,
  Activity,
  CheckCircle2,
  Folder,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { AppCard, AppButton, AppBadge } from '../../components/app-ui';
import { meetingService } from '../../services/meeting.service';
import { kanbanService } from '../../services/kanban.service';
import type { Team } from '../../types';

/* ─────────────────────────────────────────────
   KPI Stat Card
   ───────────────────────────────────────────── */
function StatCard({
  label,
  value,
  description,
  icon: Icon,
  colorClass,
  delay = 0,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  colorClass?: { bg: string; text: string };
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="border rounded-xl p-4 transition-colors"
      style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--app-border-focus)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--app-border)'}
    >
      <div className="flex items-center justify-between mb-2" style={{ color: 'var(--app-text-muted)' }}>
        <span className="text-[10px] font-mono uppercase font-medium tracking-wider">{label}</span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: colorClass ? colorClass.bg : 'var(--app-surface-hover)',
            color: colorClass ? colorClass.text : 'var(--app-text-secondary)',
          }}
        >
          <Icon size={14} />
        </div>
      </div>
      <div className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>{value}</div>
      <span className="text-[11px] block mt-1" style={{ color: 'var(--app-text-muted)' }}>{description}</span>
    </motion.div>
  );
}

function getRoleBadgeVariant(role?: string): 'purple' | 'emerald' | 'amber' | 'blue' | 'neutral' {
  switch (role) {
    case 'scrum_master':
      return 'purple';
    case 'developer':
      return 'emerald';
    case 'product_owner':
      return 'amber';
    default:
      return 'blue';
  }
}

/* ─────────────────────────────────────────────
   Team Card
   ───────────────────────────────────────────── */
function TeamCard({ team, onOpen, delay = 0 }: { team: Team; onOpen: () => void; delay?: number }) {
  const memberCount = Number(team.member_count ?? 1);
  const roleLabel = (team.my_role ?? 'member').replace('_', ' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <AppCard
        variant="dashboard"
        hoverable
        title={team.name}
        subtitle={team.description || 'Agile Scrum workspace & meeting intelligence'}
        action={
          <AppBadge variant={getRoleBadgeVariant(team.my_role)} size="xs">
            {roleLabel}
          </AppBadge>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--app-text-secondary)' }}>
              <Users size={13} style={{ color: 'var(--app-text-muted)' }} /> {memberCount} member
              {memberCount !== 1 ? 's' : ''}
            </span>
            <AppButton variant="mono-ghost" size="xs" onClick={onOpen}>
              <span>Open</span>
              <ArrowRight size={12} className="ml-1" />
            </AppButton>
          </div>
        }
      />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ═══════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, teams } = useAuth();

  const [stats, setStats] = useState({
    meetingCount: 0,
    taskCount: 0,
    doneTaskCount: 0,
    savedHours: '0h',
    loading: true,
  });

  const ownedTeams = teams.filter(t => t.created_by === user?.id);
  const joinedTeams = teams.filter(t => t.created_by !== user?.id);
  const canCreate = ownedTeams.length < 2;

  useEffect(() => {
    if (teams.length === 0) {
      setStats({
        meetingCount: 0,
        taskCount: 0,
        doneTaskCount: 0,
        savedHours: '0h',
        loading: false,
      });
      return;
    }

    let isMounted = true;
    const fetchRealData = async () => {
      try {
        let totalMeetings = 0;
        let totalTasks = 0;
        let doneTasks = 0;
        let totalMinutes = 0;

        await Promise.all(
          teams.map(async (t) => {
            try {
              const [meetings, kanbanData] = await Promise.all([
                meetingService.getMeetings(t.id).catch(() => []),
                kanbanService.getKanbanTasks(t.id).catch(() => ({ columns: [], tasks: [] })),
              ]);

              if (Array.isArray(meetings)) {
                totalMeetings += meetings.length;
                meetings.forEach((m) => {
                  if (m.status === 'completed' || m.status === 'ended') {
                    totalMinutes += Number(m.duration_minutes || 30);
                  }
                });
              }

              if (kanbanData && Array.isArray(kanbanData.tasks)) {
                totalTasks += kanbanData.tasks.length;
                doneTasks += kanbanData.tasks.filter((task) => task.status === 'done').length;
              }
            } catch {
              // ignore individual team failure
            }
          })
        );

        if (!isMounted) return;

        const calculatedHours = totalMinutes > 0
          ? `${(totalMinutes / 60).toFixed(1)}h`
          : (totalMeetings > 0 ? `${(totalMeetings * 0.5).toFixed(1)}h` : '0h');

        setStats({
          meetingCount: totalMeetings,
          taskCount: totalTasks,
          doneTaskCount: doneTasks,
          savedHours: calculatedHours,
          loading: false,
        });
      } catch {
        if (isMounted) setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchRealData();
    return () => {
      isMounted = false;
    };
  }, [teams]);

  const sprintProgressDescription = stats.taskCount > 0
    ? `${Math.round((stats.doneTaskCount / stats.taskCount) * 100)}% Sprint Progress`
    : 'No active sprint tasks';

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
              Welcome back, {user?.full_name?.split(' ')[0]}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--app-text-secondary)' }}>
              Overview of active teams, meeting intelligence, and sprint status.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {canCreate && (
              <AppButton variant="mono" size="sm" onClick={() => navigate('/teams/create')}>
                <Plus size={14} className="mr-1.5" /> Create Team
              </AppButton>
            )}
          </div>
        </div>

        {/* Real KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Teams"
            value={teams.length}
            description={teams.length === 1 ? '1 Workspace' : `${teams.length} Workspaces`}
            icon={Users}
            colorClass={{ bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA' }}
            delay={0}
          />
          <StatCard
            label="AI Meetings"
            value={stats.loading ? '—' : stats.meetingCount}
            description={stats.meetingCount === 1 ? '1 Synced Session' : `${stats.meetingCount} Synced Sessions`}
            icon={Calendar}
            colorClass={{ bg: 'rgba(14, 165, 233, 0.12)', text: '#38BDF8' }}
            delay={0.05}
          />
          <StatCard
            label="Sprint Tasks"
            value={stats.loading ? '—' : stats.taskCount}
            description={sprintProgressDescription}
            icon={CheckCircle2}
            colorClass={{ bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399' }}
            delay={0.1}
          />
          <StatCard
            label="AI Saved Time"
            value={stats.loading ? '—' : stats.savedHours}
            description="Intelligence Cadence"
            icon={Activity}
            colorClass={{ bg: 'rgba(139, 92, 246, 0.12)', text: '#A78BFA' }}
            delay={0.15}
          />
        </div>

        {/* Empty State */}
        {teams.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-xl p-10 text-center"
            style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)', color: 'var(--app-text-secondary)' }}>
              <Folder size={20} />
            </div>
            <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--app-text-primary)' }}>No teams configured yet</h2>
            <p className="text-xs mb-6 max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--app-text-secondary)' }}>
              Create your Scrum team workspace to start recording meetings and generating AI tasks.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <AppButton variant="mono" size="sm" onClick={() => navigate('/teams/create')}>
                <Plus size={14} className="mr-1.5" /> Create First Team
              </AppButton>
              <AppButton variant="mono-outline" size="sm" disabled>
                <Mail size={14} className="mr-1.5" /> Waiting for invitation
              </AppButton>
            </div>
          </motion.div>
        )}

        {/* Owned Teams */}
        {ownedTeams.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                Owned Workspaces ({ownedTeams.length})
              </h2>
              {canCreate ? (
                <button
                  onClick={() => navigate('/teams/create')}
                  className="flex items-center gap-1 text-xs font-medium hover:underline cursor-pointer transition-colors"
                  style={{ color: 'var(--app-text-primary)' }}
                >
                  <Plus size={13} /> New Team
                </button>
              ) : (
                <AppBadge variant="mono" size="xs">
                  Free plan limit reached
                </AppBadge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedTeams.map((t, i) => (
                <TeamCard
                  key={t.id}
                  team={t}
                  delay={0.25 + i * 0.05}
                  onOpen={() => navigate(`/teams/${t.id}`)}
                />
              ))}

              {canCreate && (
                <motion.button
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.3 + ownedTeams.length * 0.05 }}
                  onClick={() => navigate('/teams/create')}
                  className="border border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2.5 transition-all min-h-[140px] cursor-pointer group"
                  style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--app-border-focus)';
                    e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--app-border)';
                    e.currentTarget.style.backgroundColor = 'var(--app-surface-card)';
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }}>
                    <Plus size={16} />
                  </div>
                  <span className="text-xs font-medium transition-colors" style={{ color: 'var(--app-text-secondary)' }}>
                    Create New Team
                  </span>
                </motion.button>
              )}
            </div>
          </motion.section>
        )}

        {/* Joined Teams */}
        {joinedTeams.length > 0 && (
          <section className="space-y-4 pt-2">
            <h2 className="text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
              Joined Workspaces ({joinedTeams.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {joinedTeams.map((t, i) => (
                <TeamCard
                  key={t.id}
                  team={t}
                  delay={0.4 + i * 0.05}
                  onOpen={() => navigate(`/teams/${t.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
