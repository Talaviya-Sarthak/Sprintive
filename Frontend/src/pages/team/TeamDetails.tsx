import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Clock, Globe, Calendar, Plus, Mail, Check, Trash2, ArrowRight } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import type { Team, TeamMember } from '../../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TeamOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Invite section
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Delete
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = team?.created_by === user?.id;

  useEffect(() => {
    if (!id) return;
    Promise.all([teamService.getTeam(id), teamService.getMembers(id)])
      .then(([t, m]) => {
        setTeam(t);
        setMembers(m);
      })
      .catch(() => setError('Team not found or access denied.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Enter a valid email');
      return;
    }
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      await teamService.inviteMembers(id!, [email]);
      setInviteSuccess(`Invitation sent to ${email}`);
      setInviteEmail('');
    } catch (e: unknown) {
      setInviteError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to send invitation'
      );
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await teamService.deleteTeam(id!);
      await refreshUser();
      navigate('/dashboard');
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to delete team'
      );
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading)
    return (
      <AppLayout teamId={id}>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-[#F97316]/30 border-t-[#F97316] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );

  if (error || !team)
    return (
      <AppLayout teamId={id}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-400 text-sm">{error || 'Team not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-[#F97316] text-white text-xs font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </AppLayout>
    );

  const workingDays = (team.working_days as number[]).map(d => DAYS[d]).join(', ');

  return (
    <AppLayout teamId={id}>
      <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-6">
        {/* Team Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#12141D] border border-[#232636] rounded-xl overflow-hidden shadow-sm"
        >
          <div className="p-6 flex flex-col sm:flex-row items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden shadow-sm"
                style={{ background: team.avatar_url ? 'transparent' : team.color }}
              >
                {team.avatar_url ? (
                  <img src={team.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  team.name[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[#F8FAFC]">{team.name}</h1>
                  <span className="px-2 py-0.5 rounded-full bg-[#181B28] border border-[#232636] text-[10px] font-mono font-semibold text-[#F97316]">
                    SCRUM WORKSPACE
                  </span>
                </div>
                {team.description && (
                  <p className="text-[#94A3B8] text-xs mt-1 leading-relaxed">{team.description}</p>
                )}

                <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-[#1C1F2E] text-xs text-[#64748B]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users size={13} className="text-[#F97316]" /> {Number(team.member_count ?? 1)}{' '}
                    members
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Globe size={13} /> {team.timezone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} /> Daily scrum {team.daily_scrum_time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} /> {workingDays}
                  </span>
                </div>
              </div>
            </div>

            {isOwner && (
              <button
                onClick={() => navigate(`/teams/${id}/settings`)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#181B28] hover:bg-[#1E2232] border border-[#232636] text-[#CBD5E1] text-xs font-semibold transition-colors cursor-pointer"
              >
                Settings
              </button>
            )}
          </div>
        </motion.div>

        {/* Members Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#12141D] border border-[#232636] rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1C1F2E]">
            <h2 className="text-xs font-mono font-semibold text-[#F8FAFC] uppercase tracking-wider">
              Members ({members.length})
            </h2>
            <button
              onClick={() => navigate(`/teams/${id}/members`)}
              className="text-xs text-[#F97316] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-1">
            {members.slice(0, 5).map(m => (
              <div
                key={m.id}
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#181B28] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white text-[10px] font-bold shrink-0 overflow-hidden">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      m.full_name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#F8FAFC] truncate">
                      {m.full_name}{' '}
                      {m.user_id === user?.id && (
                        <span className="text-[#64748B] font-normal">(you)</span>
                      )}
                    </p>
                    <p className="text-[10px] text-[#64748B] truncate">{m.email}</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#181B28] border border-[#232636] text-[#94A3B8] font-medium capitalize shrink-0">
                  {m.role.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Invite Section (Owner only) */}
        {isOwner && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#12141D] border border-[#232636] rounded-xl p-5"
          >
            <h2 className="text-xs font-mono font-semibold text-[#F8FAFC] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Mail size={14} className="text-[#F97316]" /> Invite Team Members
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="colleague@company.com"
                className="flex-1 bg-[#090A0F] border border-[#232636] rounded-lg px-3.5 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#F97316] transition-colors"
              />
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white text-xs font-semibold transition-all shadow-sm shadow-[#F97316]/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {inviting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                <span>Send Invite</span>
              </button>
            </div>
            {inviteError && <p className="text-red-400 text-xs mt-2">{inviteError}</p>}
            {inviteSuccess && (
              <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                <Check size={12} /> {inviteSuccess}
              </p>
            )}
          </motion.div>
        )}

        {/* Danger Zone (Owner only) */}
        {isOwner && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#12141D] border border-red-500/20 rounded-xl p-5"
          >
            <h2 className="text-xs font-mono font-semibold text-red-400 uppercase tracking-wider mb-1">
              Danger Zone
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Deleting this workspace will permanently destroy all meeting records, transcripts, and sprint tasks.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  confirmDelete
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500 hover:text-white'
                }`}
              >
                <Trash2 size={13} />
                <span>
                  {deleting ? 'Deleting…' : confirmDelete ? 'Confirm Delete Workspace' : 'Delete Team Workspace'}
                </span>
              </button>
              {confirmDelete && !deleting && (
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-[#64748B] hover:text-[#CBD5E1] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

