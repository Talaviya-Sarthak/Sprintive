import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, ArrowRight, Mail, Calendar, Activity, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { AppCard, AppButton, AppBadge } from '../../components/app-ui';
import type { Team } from '../../types';

function TeamCard({ team, onOpen }: { team: Team; onOpen: () => void }) {
  const memberCount = Number(team.member_count ?? 1);
  return (
    <AppCard
      variant="dashboard"
      hoverable
      title={team.name}
      subtitle={team.description || 'Agile Scrum workspace & meeting intelligence'}
      action={
        <AppBadge variant="mono" size="xs">
          {(team.my_role ?? 'member').replace('_', ' ')}
        </AppBadge>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="flex items-center gap-1.5 text-xs text-[#a1a1aa] font-medium">
            <Users size={13} className="text-[#71717a]" /> {memberCount} member
            {memberCount !== 1 ? 's' : ''}
          </span>
          <AppButton variant="mono-ghost" size="xs" onClick={onOpen}>
            <span>Open Workspace</span>
            <ArrowRight size={12} className="ml-1" />
          </AppButton>
        </div>
      }
    />
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, teams } = useAuth();

  const ownedTeams = teams.filter(t => t.created_by === user?.id);
  const joinedTeams = teams.filter(t => t.created_by !== user?.id);
  const canCreate = ownedTeams.length < 2;

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1f1f23]">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[#f4f4f5] tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-[#a1a1aa] text-xs mt-1">
              Overview of active teams, meeting intelligence, and sprint status.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canCreate && (
              <AppButton variant="mono" size="sm" onClick={() => navigate('/teams/create')}>
                <Plus size={13} className="mr-1.5" /> Create Team
              </AppButton>
            )}
          </div>
        </div>

        {/* Stat Cards - Pure Monochromatic Modern SaaS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#141417] border border-[#27272a] hover:border-[#3f3f46] transition-colors rounded-xl p-4">
            <div className="flex items-center justify-between text-[#71717a] mb-2">
              <span className="text-[10px] font-mono uppercase font-medium tracking-wider">Active Teams</span>
              <Users size={14} className="text-[#a1a1aa]" />
            </div>
            <div className="text-2xl font-semibold text-[#f4f4f5] tracking-tight">{teams.length}</div>
            <span className="text-[11px] text-[#71717a] block mt-1">Workspaces</span>
          </div>

          <div className="bg-[#141417] border border-[#27272a] hover:border-[#3f3f46] transition-colors rounded-xl p-4">
            <div className="flex items-center justify-between text-[#71717a] mb-2">
              <span className="text-[10px] font-mono uppercase font-medium tracking-wider">AI Meetings</span>
              <Calendar size={14} className="text-[#a1a1aa]" />
            </div>
            <div className="text-2xl font-semibold text-[#f4f4f5] tracking-tight">14</div>
            <span className="text-[11px] text-[#a1a1aa] block mt-1">Recorded & Synced</span>
          </div>

          <div className="bg-[#141417] border border-[#27272a] hover:border-[#3f3f46] transition-colors rounded-xl p-4">
            <div className="flex items-center justify-between text-[#71717a] mb-2">
              <span className="text-[10px] font-mono uppercase font-medium tracking-wider">Sprint Tasks</span>
              <CheckCircle2 size={14} className="text-[#a1a1aa]" />
            </div>
            <div className="text-2xl font-semibold text-[#f4f4f5] tracking-tight">38</div>
            <span className="text-[11px] text-[#71717a] block mt-1">85% Sprint Progress</span>
          </div>

          <div className="bg-[#141417] border border-[#27272a] hover:border-[#3f3f46] transition-colors rounded-xl p-4">
            <div className="flex items-center justify-between text-[#71717a] mb-2">
              <span className="text-[10px] font-mono uppercase font-medium tracking-wider">AI Saved Time</span>
              <Activity size={14} className="text-[#a1a1aa]" />
            </div>
            <div className="text-2xl font-semibold text-[#f4f4f5] tracking-tight">12.5h</div>
            <span className="text-[11px] text-[#a1a1aa] block mt-1">This Month</span>
          </div>
        </div>

        {/* Empty State */}
        {teams.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#141417] border border-[#27272a] rounded-xl p-10 text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-[#1c1c21] border border-[#27272a] flex items-center justify-center mx-auto mb-4 text-[#a1a1aa]">
              <Users size={20} />
            </div>
            <h2 className="text-sm font-semibold text-[#f4f4f5] mb-1">No teams configured yet</h2>
            <p className="text-[#a1a1aa] text-xs mb-6 max-w-sm mx-auto leading-relaxed">
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
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-mono font-semibold text-[#71717a] uppercase tracking-wider">
                Owned Workspaces ({ownedTeams.length})
              </h2>
              {canCreate ? (
                <button
                  onClick={() => navigate('/teams/create')}
                  className="flex items-center gap-1 text-xs text-[#f4f4f5] font-medium hover:underline cursor-pointer transition-colors"
                >
                  <Plus size={12} /> New Team
                </button>
              ) : (
                <AppBadge variant="mono" size="xs">
                  Free plan limit reached
                </AppBadge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedTeams.map(t => (
                <TeamCard key={t.id} team={t} onOpen={() => navigate(`/teams/${t.id}`)} />
              ))}

              {canCreate && (
                <button
                  onClick={() => navigate('/teams/create')}
                  className="bg-[#141417] border border-dashed border-[#27272a] rounded-xl p-5 flex flex-col items-center justify-center gap-2.5 hover:border-[#3f3f46] hover:bg-[#18181b] transition-all min-h-[140px] cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1c1c21] border border-[#27272a] flex items-center justify-center text-[#71717a] group-hover:text-[#f4f4f5] transition-colors">
                    <Plus size={16} />
                  </div>
                  <span className="text-xs text-[#a1a1aa] font-medium group-hover:text-[#f4f4f5] transition-colors">
                    Create New Team
                  </span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* Joined Teams */}
        {joinedTeams.length > 0 && (
          <section className="space-y-4 pt-2">
            <h2 className="text-[10px] font-mono font-semibold text-[#71717a] uppercase tracking-wider">
              Joined Workspaces ({joinedTeams.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {joinedTeams.map(t => (
                <TeamCard key={t.id} team={t} onOpen={() => navigate(`/teams/${t.id}`)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}


