import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Clock, Globe, Calendar, Plus, Mail, Copy, Check, Trash2 } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import type { Team, TeamMember } from '../../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TeamOverview() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { user, refreshUser } = useAuth();

  const [team, setTeam]       = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Invite section
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviting, setInviting]         = useState(false);
  const [inviteError, setInviteError]   = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Delete
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = team?.created_by === user?.id;

  useEffect(() => {
    if (!id) return;
    Promise.all([teamService.getTeam(id), teamService.getMembers(id)])
      .then(([t, m]) => { setTeam(t); setMembers(m); })
      .catch(() => setError('Team not found or access denied.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInviteError('Enter a valid email'); return; }
    setInviting(true); setInviteError(''); setInviteSuccess('');
    try {
      await teamService.inviteMembers(id!, [email]);
      setInviteSuccess(`Invitation sent to ${email}`);
      setInviteEmail('');
    } catch (e: unknown) {
      setInviteError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to send invitation');
    } finally { setInviting(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await teamService.deleteTeam(id!);
      await refreshUser();
      navigate('/dashboard');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete team');
      setDeleting(false); setConfirmDelete(false);
    }
  };

  if (loading) return (
    <AppLayout teamId={id}>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  if (error || !team) return (
    <AppLayout teamId={id}>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400">{error || 'Team not found'}</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-sm font-semibold">Back to Dashboard</button>
      </div>
    </AppLayout>
  );

  const workingDays = (team.working_days as number[]).map(d => DAYS[d]).join(', ');

  return (
    <AppLayout teamId={id}>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        {/* Team header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${team.color}, #06B6D4)` }} />
          <div className="p-6 flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0 overflow-hidden"
              style={{ background: team.avatar_url ? 'transparent' : team.color }}>
              {team.avatar_url ? <img src={team.avatar_url} className="w-full h-full object-cover" alt="" /> : team.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[#F8FAFC]">{team.name}</h1>
              {team.description && <p className="text-[#94A3B8] text-sm mt-1">{team.description}</p>}
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-[#475569]">
                <span className="flex items-center gap-1.5"><Users size={12} /> {Number(team.member_count ?? 1)} members</span>
                <span className="flex items-center gap-1.5"><Globe size={12} /> {team.timezone}</span>
                <span className="flex items-center gap-1.5"><Clock size={12} /> Daily scrum {team.daily_scrum_time}</span>
                <span className="flex items-center gap-1.5"><Calendar size={12} /> {workingDays}</span>
              </div>
            </div>
            {isOwner && (
              <button onClick={() => navigate(`/teams/${id}/settings`)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] text-xs font-medium transition-colors">
                Settings
              </button>
            )}
          </div>
        </motion.div>

        {/* Members preview */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-[#111827] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Members ({members.length})</h2>
            <button onClick={() => navigate(`/teams/${id}/members`)}
              className="text-xs text-[#3B82F6] font-semibold hover:text-[#60A5FA] transition-colors">
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {members.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                  {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : m.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#F8FAFC] font-medium truncate">{m.full_name} {m.user_id === user?.id && <span className="text-[#475569] font-normal">(you)</span>}</p>
                  <p className="text-xs text-[#475569]">{m.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[#94A3B8] capitalize shrink-0">{m.role.replace('_', ' ')}</span>
              </div>
            ))}
            {members.length > 5 && (
              <p className="text-xs text-[#475569] pt-1">+{members.length - 5} more members</p>
            )}
          </div>
        </motion.div>

        {/* Invite section — owner only */}
        {isOwner && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-[#111827] border border-white/8 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2"><Mail size={15} /> Invite Members</h2>
            <div className="flex gap-2">
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="colleague@company.com"
                className="flex-1 bg-[#0d1117] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#F8FAFC] placeholder-[#475569] outline-none focus:border-[#3B82F6] transition-colors"
              />
              <button onClick={handleInvite} disabled={inviting}
                className="px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center gap-2">
                {inviting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={15} />}
                Invite
              </button>
            </div>
            {inviteError   && <p className="text-red-400 text-xs mt-2">{inviteError}</p>}
            {inviteSuccess && <p className="text-green-400 text-xs mt-2 flex items-center gap-1"><Check size={12} /> {inviteSuccess}</p>}
          </motion.div>
        )}

        {/* Danger zone — owner only */}
        {isOwner && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-[#111827] border border-red-500/20 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h2>
            <p className="text-xs text-[#475569] mb-4">Deleting this team is permanent and cannot be undone.</p>
            <button onClick={handleDelete} disabled={deleting}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${confirmDelete ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}>
              <Trash2 size={14} />
              {deleting ? 'Deleting…' : confirmDelete ? 'Confirm Delete' : 'Delete Team'}
            </button>
            {confirmDelete && !deleting && (
              <button onClick={() => setConfirmDelete(false)} className="ml-3 text-xs text-[#475569] hover:text-[#94A3B8] transition-colors">Cancel</button>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
