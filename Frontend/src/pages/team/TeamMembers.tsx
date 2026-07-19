import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserMinus, Mail, Clock, Check, X, RefreshCw } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import type { TeamMember, Invitation } from '../../types';

const ROLE_COLORS: Record<string, string> = {
  scrum_master:  'text-[#3B82F6] bg-[#3B82F6]/10',
  developer:     'text-[#10B981] bg-[#10B981]/10',
  product_owner: 'text-[#8B5CF6] bg-[#8B5CF6]/10',
  observer:      'text-[#94A3B8] bg-white/5',
};

const STATUS_COLORS: Record<string, string> = {
  pending:  'text-[#F59E0B] bg-[#F59E0B]/10',
  accepted: 'text-[#10B981] bg-[#10B981]/10',
  rejected: 'text-red-400 bg-red-500/10',
  expired:  'text-[#475569] bg-white/5',
};

export default function TeamMembers() {
  const { id }  = useParams<{ id: string }>();
  const { user } = useAuth();

  const [members, setMembers]         = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<'members' | 'invitations'>('members');
  const [removingId, setRemovingId]   = useState<string | null>(null);
  const [error, setError]             = useState('');

  // Invite
  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviting, setInviting]           = useState(false);
  const [inviteMsg, setInviteMsg]         = useState('');
  const [inviteErr, setInviteErr]         = useState('');

  const [isOwner, setIsOwner] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        teamService.getMembers(id),
        teamService.getTeam(id),
      ]);
      setMembers(m);
      setIsOwner(t.created_by === user?.id);
      if (t.created_by === user?.id) {
        const inv = await teamService.getInvitations(id);
        setInvitations(inv);
      }
    } catch { setError('Failed to load members.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleRemove = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      await teamService.removeMember(id!, memberId);
      setMembers(prev => prev.filter(m => m.user_id !== memberId));
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to remove member');
    } finally { setRemovingId(null); }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInviteErr('Enter a valid email'); return; }
    setInviting(true); setInviteErr(''); setInviteMsg('');
    try {
      await teamService.inviteMembers(id!, [email]);
      setInviteMsg(`Invitation sent to ${email}`);
      setInviteEmail('');
      const inv = await teamService.getInvitations(id!);
      setInvitations(inv);
    } catch (e: unknown) {
      setInviteErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to send invitation');
    } finally { setInviting(false); }
  };

  if (loading) return (
    <AppLayout teamId={id}>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout teamId={id}>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#F8FAFC]">Team Members</h1>
          <button onClick={load} className="text-[#475569] hover:text-[#94A3B8] transition-colors"><RefreshCw size={16} /></button>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Tabs */}
        {isOwner && (
          <div className="flex gap-1 bg-[#0d1117] rounded-xl p-1 w-fit">
            {(['members', 'invitations'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-[#111827] text-[#F8FAFC]' : 'text-[#475569] hover:text-[#94A3B8]'}`}>
                {t} {t === 'invitations' && `(${invitations.filter(i => i.status === 'pending').length})`}
              </button>
            ))}
          </div>
        )}

        {/* Members tab */}
        {tab === 'members' && (
          <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
            {members.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-5 py-4 border-b border-white/5 last:border-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                  {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : m.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F8FAFC] truncate">
                    {m.full_name} {m.user_id === user?.id && <span className="text-[#475569] font-normal text-xs">(you)</span>}
                  </p>
                  <p className="text-xs text-[#475569] truncate">{m.email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize shrink-0 ${ROLE_COLORS[m.role] ?? 'text-[#94A3B8] bg-white/5'}`}>
                  {m.role.replace('_', ' ')}
                </span>
                {isOwner && m.user_id !== user?.id && (
                  <button onClick={() => handleRemove(m.user_id)} disabled={removingId === m.user_id}
                    className="ml-2 p-1.5 rounded-lg text-[#475569] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                    {removingId === m.user_id
                      ? <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin block" />
                      : <UserMinus size={15} />}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Invitations tab */}
        {tab === 'invitations' && isOwner && (
          <div className="space-y-4">
            {/* Send invite */}
            <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2"><Mail size={14} /> Send Invitation</h3>
              <div className="flex gap-2">
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="colleague@company.com"
                  className="flex-1 bg-[#0d1117] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#F8FAFC] placeholder-[#475569] outline-none focus:border-[#3B82F6] transition-colors" />
                <button onClick={handleInvite} disabled={inviting}
                  className="px-4 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-60 text-white text-sm font-semibold transition-colors">
                  {inviting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" /> : 'Send'}
                </button>
              </div>
              {inviteErr && <p className="text-red-400 text-xs mt-2">{inviteErr}</p>}
              {inviteMsg && <p className="text-green-400 text-xs mt-2 flex items-center gap-1"><Check size={12} /> {inviteMsg}</p>}
            </div>

            {/* Invitation list */}
            <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
              {invitations.length === 0
                ? <p className="text-[#475569] text-sm text-center py-8">No invitations sent yet.</p>
                : invitations.map((inv, i) => (
                  <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 px-5 py-4 border-b border-white/5 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      <Mail size={14} className="text-[#475569]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F8FAFC] truncate">{inv.email ?? 'Link invitation'}</p>
                      <p className="text-xs text-[#475569] flex items-center gap-1 mt-0.5">
                        <Clock size={10} /> Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize shrink-0 ${STATUS_COLORS[inv.status] ?? 'text-[#94A3B8] bg-white/5'}`}>
                      {inv.status}
                    </span>
                  </motion.div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
