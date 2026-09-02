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
  Sparkles,
  BarChart3,
  Folder,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { AppCard, AppButton, AppBadge } from '../../components/app-ui';
import type { Team } from '../../types';

/* ─────────────────────────────────────────────
   KPI Stat Card
   ───────────────────────────────────────────── */
function StatCard({
  label,
  value,
  description,
  icon: Icon,
  color = 'default',
  delay = 0,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  color?: 'default' | 'orange' | 'green' | 'blue' | 'amber';
  delay?: number;
}) {
  const colorMap = {
    default: 'text-[#71717a]',
    orange: 'text-[#F97316]',
    green: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-[#141417] border border-[#27272a] rounded-xl p-5 hover:border-[#3f3f46] transition-all duration-200 group cursor-default"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono uppercase font-semibold tracking-wider text-[#52525b]">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-lg bg-[#1c1c21] border border-[#27272a] flex items-center justify-center group-hover:border-[#3f3f46] transition-colors ${colorMap[color]}`}>
          <Icon size={15} />
        </div>
      </div>
      <div className="text-2xl font-bold text-[#f4f4f5] tracking-tight">{value}</div>
      <span className="text-[12px] text-[#71717a] block mt-1.5">{description}</span>
    </motion.div>
  );
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
          <AppBadge variant="mono" size="xs">
            {roleLabel}
          </AppBadge>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5 text-[12px] text-[#71717a] font-medium">
              <Users size={13} className="text-[#52525b]" /> {memberCount} member
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

/* ─────────────────────────────────────────────
   Empty State
   ───────────────────────────────────────────── */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-[#141417] border border-[#27272a] rounded-xl p-12 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#1c1c21] border border-[#27272a] flex items-center justify-center mx-auto mb-5">
        <Folder size={24} className="text-[#52525b]" />
      </div>
      <h2 className="text-[15px] font-semibold text-[#f4f4f5] mb-1.5">No teams configured yet</h2>
      <p className="text-[#71717a] text-[13px] mb-7 max-w-sm mx-auto leading-relaxed">
        Create your Scrum team workspace to start recording meetings and generating AI-powered tasks.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <AppButton variant="mono" size="sm" onClick={onCreate}>
          <Plus size={14} className="mr-1.5" /> Create First Team
        </AppButton>
        <AppButton variant="mono-outline" size="sm" disabled>
          <Mail size={14} className="mr-1.5" /> Waiting for invitation
        </AppButton>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Get time-based greeting
   ───────────────────────────────────────────── */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ═══════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, teams } = useAuth();

  const ownedTeams = teams.filter(t => t.created_by === user?.id);
  const joinedTeams = teams.filter(t => t.created_by !== user?.id);
  const canCreate = ownedTeams.length < 2;

  return (
    <AppLayout>
      <div className="p-5 md:p-8 lg:p-10 max-w-6xl mx-auto space-y-8">
        {/* ─── Welcome Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#1a1a1e]"
        >
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#f4f4f5] tracking-tight">
              {getGreeting()}, {user?.full_name?.split(' ')[0]}
            </h1>
            <p className="text-[#71717a] text-[13px] mt-1.5">
              Here's an overview of your teams, meetings, and project activity.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {canCreate && (
              <AppButton variant="mono" size="sm" onClick={() => navigate('/teams/create')}>
                <Plus size={14} className="mr-1.5" /> Create Team
              </AppButton>
            )}
          </div>
        </motion.div>

        {/* ─── KPI Summary Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Teams"
            value={teams.length}
            description="Workspaces"
            icon={Users}
            color="blue"
            delay={0}
          />
          <StatCard
            label="AI Meetings"
            value={14}
            description="Recorded & Synced"
            icon={Calendar}
            color="green"
            delay={0.05}
          />
          <StatCard
            label="Sprint Tasks"
            value={38}
            description="85% Sprint Progress"
            icon={CheckCircle2}
            color="orange"
            delay={0.1}
          />
          <StatCard
            label="AI Saved Time"
            value="12.5h"
            description="This Month"
            icon={Activity}
            color="amber"
            delay={0.15}
          />
        </div>

        {/* ─── Quick Actions Bar ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="flex flex-wrap items-center gap-3"
        >
          <button
            onClick={() => navigate(teamId('/teams', ownedTeams[0]?.id ?? joinedTeams[0]?.id))}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#141417] border border-[#27272a] rounded-lg text-[13px] font-medium text-[#a1a1aa] hover:text-[#f4f4f5] hover:border-[#3f3f46] hover:bg-[#1c1c21] transition-all duration-150 cursor-pointer"
          >
            <BarChart3 size={15} className="text-[#F97316]" />
            <span>View Analytics</span>
          </button>
          <button
            onClick={() => navigate(ownedTeams.length > 0 ? `/teams/${ownedTeams[0].id}/meetings` : '/meetings/create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#141417] border border-[#27272a] rounded-lg text-[13px] font-medium text-[#a1a1aa] hover:text-[#f4f4f5] hover:border-[#3f3f46] hover:bg-[#1c1c21] transition-all duration-150 cursor-pointer"
          >
            <Calendar size={15} className="text-emerald-400" />
            <span>Upcoming Meetings</span>
          </button>
          <button
            onClick={() => navigate(ownedTeams.length > 0 ? `/teams/${ownedTeams[0].id}/members` : '/dashboard')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#141417] border border-[#27272a] rounded-lg text-[13px] font-medium text-[#a1a1aa] hover:text-[#f4f4f5] hover:border-[#3f3f46] hover:bg-[#1c1c21] transition-all duration-150 cursor-pointer"
          >
            <Sparkles size={15} className="text-purple-400" />
            <span>Team Members</span>
          </button>
        </motion.div>

        {/* ─── Empty State ─── */}
        {teams.length === 0 && (
          <EmptyState onCreate={() => navigate('/teams/create')} />
        )}

        {/* ─── Owned Teams ─── */}
        {ownedTeams.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-mono font-semibold text-[#52525b] uppercase tracking-wider">
                Owned Workspaces
                <span className="ml-2 text-[#3f3f46]">({ownedTeams.length})</span>
              </h2>
              {canCreate ? (
                <button
                  onClick={() => navigate('/teams/create')}
                  className="flex items-center gap-1 text-[13px] text-[#a1a1aa] font-medium hover:text-[#f4f4f5] cursor-pointer transition-colors duration-150"
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
                  className="bg-[#141417] border border-dashed border-[#27272a] rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#F97316]/40 hover:bg-[#F97316]/5 transition-all duration-200 min-h-[160px] cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1c1c21] border border-[#27272a] flex items-center justify-center text-[#52525b] group-hover:text-[#F97316] group-hover:border-[#F97316]/30 transition-all duration-200">
                    <Plus size={18} />
                  </div>
                  <span className="text-[13px] text-[#71717a] font-medium group-hover:text-[#f4f4f5] transition-colors duration-200">
                    Create New Team
                  </span>
                </motion.button>
              )}
            </div>
          </motion.section>
        )}

        {/* ─── Joined Teams ─── */}
        {joinedTeams.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="space-y-4 pt-2"
          >
            <h2 className="text-[11px] font-mono font-semibold text-[#52525b] uppercase tracking-wider">
              Joined Workspaces
              <span className="ml-2 text-[#3f3f46]">({joinedTeams.length})</span>
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
          </motion.section>
        )}
      </div>
    </AppLayout>
  );
}

/* Helper to build a team URL */
function teamId(prefix: string, id?: string): string {
  return id ? `${prefix}/${id}` : prefix;
}
