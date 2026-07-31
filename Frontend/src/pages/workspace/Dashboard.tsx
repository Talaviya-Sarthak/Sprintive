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
      hoverable
      title={team.name}
      subtitle={team.description || 'Agile Scrum workspace & meeting intelligence'}
      action={
        <AppBadge variant="neutral" size="xs">
          {(team.my_role ?? 'member').replace('_', ' ')}
        </AppBadge>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="flex items-center gap-1.5 text-xs text-[#94A3B8] font-medium">
            <Users size={12} className="text-[#F97316]" /> {memberCount} member
            {memberCount !== 1 ? 's' : ''}
          </span>
          <AppButton variant="ghost" size="xs" onClick={onOpen}>
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
      <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#181A26]">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#F8FAFC] tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-[#94A3B8] text-xs mt-0.5">
              Overview of active teams, meeting intelligence, and sprint status.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canCreate && (
              <AppButton variant="primary" size="sm" onClick={() => navigate('/teams/create')}>
                <Plus size={13} className="mr-1" /> Create Team
              </AppButton>
            )}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#11131C] border border-[#1E2232] rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[#64748B] mb-1">
              <span className="text-[10px] font-mono uppercase font-semibold">Active Teams</span>
              <Users size={14} className="text-[#F97316]" />
            </div>
            <div className="text-xl font-bold text-[#F8FAFC]">{teams.length}</div>
            <span className="text-[10px] text-[#64748B] block mt-0.5">Workspaces</span>
          </div>

          <div className="bg-[#11131C] border border-[#1E2232] rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[#64748B] mb-1">
              <span className="text-[10px] font-mono uppercase font-semibold">AI Meetings</span>
              <Calendar size={14} className="text-[#F97316]" />
            </div>
            <div className="text-xl font-bold text-[#F8FAFC]">14</div>
            <span className="text-[10px] text-emerald-400 block mt-0.5">Recorded & Synced</span>
          </div>

          <div className="bg-[#11131C] border border-[#1E2232] rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[#64748B] mb-1">
              <span className="text-[10px] font-mono uppercase font-semibold">Sprint Tasks</span>
              <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-[#F8FAFC]">38</div>
            <span className="text-[10px] text-[#64748B] block mt-0.5">85% Sprint Progress</span>
          </div>

          <div className="bg-[#11131C] border border-[#1E2232] rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[#64748B] mb-1">
              <span className="text-[10px] font-mono uppercase font-semibold">AI Saved Time</span>
              <Activity size={14} className="text-amber-400" />
            </div>
            <div className="text-xl font-bold text-[#F8FAFC]">12.5h</div>
            <span className="text-[10px] text-emerald-400 block mt-0.5">This Month</span>
          </div>
        </div>

        {/* Empty State */}
        {teams.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#11131C] border border-[#1E2232] rounded-xl p-8 text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-[#F97316]/10 border border-[#F97316]/20 flex items-center justify-center mx-auto mb-3 text-[#F97316]">
              <Users size={20} />
            </div>
            <h2 className="text-sm font-semibold text-[#F8FAFC] mb-1">No teams configured yet</h2>
            <p className="text-[#94A3B8] text-xs mb-5 max-w-sm mx-auto">
              Create your Scrum team workspace to start recording meetings and generating AI tasks.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <AppButton variant="primary" size="sm" onClick={() => navigate('/teams/create')}>
                <Plus size={14} className="mr-1" /> Create First Team
              </AppButton>
              <AppButton variant="secondary" size="sm" disabled>
                <Mail size={14} className="mr-1" /> Waiting for invitation
              </AppButton>
            </div>
          </motion.div>
        )}

        {/* Owned Teams */}
        {ownedTeams.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-mono font-semibold text-[#64748B] uppercase tracking-wider">
                Owned Workspaces ({ownedTeams.length})
              </h2>
              {canCreate ? (
                <button
                  onClick={() => navigate('/teams/create')}
                  className="flex items-center gap-1 text-xs text-[#F97316] font-semibold hover:underline cursor-pointer"
                >
                  <Plus size={12} /> New Team
                </button>
              ) : (
                <AppBadge variant="amber" size="xs">
                  Free plan limit reached
                </AppBadge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {ownedTeams.map(t => (
                <TeamCard key={t.id} team={t} onOpen={() => navigate(`/teams/${t.id}`)} />
              ))}

              {canCreate && (
                <button
                  onClick={() => navigate('/teams/create')}
                  className="bg-[#11131C] border border-dashed border-[#1E2232] rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-[#F97316]/40 hover:bg-[#F97316]/5 transition-all min-h-[140px] cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-md bg-[#171A26] border border-[#232738] flex items-center justify-center text-[#64748B] group-hover:text-[#F97316] transition-colors">
                    <Plus size={16} />
                  </div>
                  <span className="text-xs text-[#94A3B8] font-medium group-hover:text-[#F8FAFC] transition-colors">
                    Create New Team
                  </span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* Joined Teams */}
        {joinedTeams.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-[10px] font-mono font-semibold text-[#64748B] uppercase tracking-wider">
              Joined Workspaces ({joinedTeams.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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


