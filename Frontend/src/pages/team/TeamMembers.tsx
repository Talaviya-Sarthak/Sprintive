import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserMinus, Plus, ArrowLeft } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { AppTable, AppButton, AppInput, AppBadge, AppTabs } from '../../components/app-ui';
import type { TeamMember, Invitation } from '../../types';

export default function TeamMembers() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'members' | 'invitations'>('members');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteErr, setInviteErr] = useState('');

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
    } catch {
      setError('Failed to load team members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleRemove = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      await teamService.removeMember(id!, memberId);
      setMembers(prev => prev.filter(m => m.user_id !== memberId));
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to remove member'
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteErr('Enter a valid email address');
      return;
    }
    setInviting(true);
    setInviteErr('');
    setInviteMsg('');
    try {
      await teamService.inviteMembers(id!, [email]);
      setInviteMsg(`Invitation sent to ${email}`);
      setInviteEmail('');
      const inv = await teamService.getInvitations(id!);
      setInvitations(inv);
    } catch (e: unknown) {
      setInviteErr(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to send invitation'
      );
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout teamId={id}>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-[#27272a] border-t-[#f4f4f5] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout teamId={id}>
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
        <button
          onClick={() => navigate(`/teams/${id}`)}
          className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Team
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1f1f23]">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[#f4f4f5] tracking-tight">
              Team Members & Invites
            </h1>
            <p className="text-[#a1a1aa] text-xs mt-1">
              Manage workspace access, permissions, and pending invitations.
            </p>
          </div>

          {isOwner && (
            <div className="flex items-center gap-2.5">
              <AppInput
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
              <AppButton variant="mono" size="xs" loading={inviting} onClick={handleInvite}>
                <Plus size={13} className="mr-1.5" /> Invite
              </AppButton>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        {inviteErr && <p className="text-xs text-red-400 font-medium">{inviteErr}</p>}
        {inviteMsg && <p className="text-xs text-emerald-400 font-medium">{inviteMsg}</p>}

        <AppTabs
          items={[
            { id: 'members', label: 'Active Members', count: members.length },
            { id: 'invitations', label: 'Pending Invites', count: invitations.length },
          ]}
          activeId={tab}
          onChange={t => setTab(t as any)}
        />

        {tab === 'members' ? (
          <AppTable
            variant="dashboard"
            columns={[
              {
                key: 'member',
                header: 'Member',
                render: (m: TeamMember) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1c1c21] border border-[#27272a] flex items-center justify-center text-[#f4f4f5] font-semibold text-xs">
                      {m.full_name?.[0] ?? 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#f4f4f5]">{m.full_name}</p>
                      <p className="text-[10px] text-[#71717a]">{m.email}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Role',
                render: (m: TeamMember) => (
                  <AppBadge variant="mono" size="xs">
                    {m.role}
                  </AppBadge>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                render: (m: TeamMember) =>
                  isOwner && m.user_id !== user?.id ? (
                    <AppButton
                      variant="mono-ghost"
                      size="xs"
                      disabled={removingId === m.user_id}
                      onClick={() => handleRemove(m.user_id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <UserMinus size={14} />
                    </AppButton>
                  ) : null,
              },
            ]}
            data={members}
            keyExtractor={m => m.user_id}
          />
        ) : (
          <AppTable
            variant="dashboard"
            columns={[
              { key: 'email', header: 'Invited Email', render: (i: Invitation) => <span className="font-mono text-xs text-[#f4f4f5]">{i.email}</span> },
              { key: 'status', header: 'Status', render: (i: Invitation) => <AppBadge variant="mono" size="xs">{i.status}</AppBadge> },
              { key: 'expires_at', header: 'Expires', render: (i: Invitation) => <span className="text-xs text-[#71717a]">{new Date(i.expires_at).toLocaleDateString()}</span> },
            ]}
            data={invitations}
            keyExtractor={i => i.id}
          />
        )}
      </div>
    </AppLayout>
  );
}
