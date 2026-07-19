import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, ArrowRight, Mail, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import type { Team } from '../../types';

function TeamCard({ team, onOpen }: { team: Team; onOpen: () => void }) {
  const memberCount = Number(team.member_count ?? 1);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all"
    >
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${team.color}, #06B6D4)` }} />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0 overflow-hidden"
            style={{ background: team.avatar_url ? 'transparent' : team.color }}
          >
            {team.avatar_url
              ? <img src={team.avatar_url} className="w-full h-full object-cover" alt="" />
              : team.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[#F8FAFC] font-semibold text-sm truncate">{team.name}</h3>
            {team.description && <p className="text-[#475569] text-xs mt-0.5 line-clamp-2">{team.description}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-[#475569] mb-4">
          <span className="flex items-center gap-1.5"><Users size={12} /> {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/5 capitalize">{(team.my_role ?? 'member').replace('_', ' ')}</span>
        </div>
        <button
          onClick={onOpen}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#3B82F6] text-sm font-semibold transition-colors"
        >
          Open Workspace <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, teams } = useAuth();

  const ownedTeams  = teams.filter(t => t.created_by === user?.id);
  const joinedTeams = teams.filter(t => t.created_by !== user?.id);
  const canCreate   = ownedTeams.length < 2;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">Here's your workspace overview.</p>
        </div>

        {teams.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#111827] border border-white/8 rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-[#3B82F6]" />
            </div>
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">No teams yet</h2>
            <p className="text-[#94A3B8] text-sm mb-6 max-w-sm mx-auto">
              Create your first team or wait for an invitation from a team owner.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate('/teams/create')}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm transition-colors">
                <Plus size={16} /> Create Team
              </button>
              <div className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[#94A3B8] text-sm">
                <Mail size={16} /> Waiting for invitation
              </div>
            </div>
          </motion.div>
        )}

        {ownedTeams.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider">Your Teams</h2>
              {canCreate
                ? <button onClick={() => navigate('/teams/create')} className="flex items-center gap-1.5 text-xs text-[#3B82F6] font-semibold hover:text-[#60A5FA] transition-colors"><Plus size={13} /> New Team</button>
                : <span className="flex items-center gap-1.5 text-xs text-[#F59E0B] font-medium px-2.5 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20"><Zap size={11} /> Free plan limit reached</span>
              }
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedTeams.map(t => <TeamCard key={t.id} team={t} onOpen={() => navigate(`/teams/${t.id}`)} />)}
              {canCreate && (
                <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate('/teams/create')}
                  className="bg-[#111827] border border-dashed border-white/15 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/5 transition-all min-h-[160px]">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><Plus size={20} className="text-[#475569]" /></div>
                  <span className="text-sm text-[#475569] font-medium">Create New Team</span>
                </motion.button>
              )}
            </div>
            {!canCreate && (
              <div className="mt-4 p-4 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/15 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#F8FAFC]">Upgrade to Pro</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Create unlimited teams and unlock advanced features.</p>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F59E0B] text-[#0B1220] text-sm font-bold hover:bg-[#D97706] transition-colors">
                  <Zap size={13} /> Upgrade
                </button>
              </div>
            )}
          </section>
        )}

        {joinedTeams.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">Teams You've Joined</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {joinedTeams.map(t => <TeamCard key={t.id} team={t} onOpen={() => navigate(`/teams/${t.id}`)} />)}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
