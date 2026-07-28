import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserMinus, Mail, Clock, Check, RefreshCw, Plus } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { AppTable, AppButton, AppInput, AppBadge, AppTabs } from '../../components/app-ui';
import type { TeamMember, Invitation } from '../../types';

export default function TeamMembers() {
  const { id } = useParams<{ id: string }>();
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
      setError('Failed to load members.');
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
      setInviteErr('Enter a valid email');
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

  if (loading)
    return (
      <AppLayout teamId={id}>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-[#F97316]/30 border-t-[#F97316] rounded-full animate-spin" />
        </div>
      </AppLayout>
    );

  const memberColumns = [
    {
      key: 'user',
      header: 'Member',
      render: (m: TeamMember) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white text-[10px] font-bold shrink-0 overflow-hidden shadow-xs">
            {m.avatar_url ? (
              <img src={m.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              m.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#F8FAFC]">
              {m.full_name} {m.user_id === user?.id && <span className="text-[#64748B] font-normal text-[10px]">(you)</span>}
            </p>
            <p className="text-[10px] text-[#64748B]">{m.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (m: TeamMember) => (
        <AppBadge
          variant={
            m.role === 'scrum_master'
              ? 'orange'
              : m.role === 'developer'
              ? 'emerald'
              : m.role === 'product_owner'
              ? 'amber'
              : 'neutral'
          }
          size="xs"
        >
          {m.role.replace('_', ' ')}
        </AppBadge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (m: TeamMember) =>
        isOwner && m.user_id !== user?.id ? (
          <AppButton
            variant="danger"
            size="xs"
            onClick={() => handleRemove(m.user_id)}
            disabled={removingId === m.user_id}
          >
            <UserMinus size={12} />
          </AppButton>
        ) : null,
    },
  ];

  const invitationColumns = [
    {
      key: 'email',
      header: 'Invited Email',
      render: (inv: Invitation) => (
        <div className="flex items-center gap-2">
          <Mail size={12} className="text-[#64748B]" />
          <span className="text-xs font-semibold text-[#F8FAFC]">{inv.email ?? 'Link invitation'}</span>
        </div>
      ),
    },
    {
      key: 'expires',
      header: 'Expires',
      render: (inv: Invitation) => (
        <span className="text-[11px] text-[#64748B]">
          {new Date(inv.expires_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv: Invitation) => (
        <AppBadge
          variant={
            inv.status === 'accepted' ? 'emerald' : inv.status === 'pending' ? 'amber' : 'neutral'
          }
          size="xs"
        >
          {inv.status}
        </AppBadge>
      ),
    },
  ];

  return (
    <AppLayout teamId={id}>
      <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-[#181A26]">
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Team Members</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">Manage workspace access, roles, and invitations</p>
          </div>
          <AppButton variant="icon" size="sm" onClick={load}>
            <RefreshCw size={13} />
          </AppButton>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {isOwner && (
          <AppTabs
            items={[
              { id: 'members', label: 'Members', count: members.length },
              {
                id: 'invitations',
                label: 'Invitations',
                count: invitations.filter(i => i.status === 'pending').length,
              },
            ]}
            activeId={tab}
            onChange={id => setTab(id as any)}
          />
        )}

        {tab === 'members' && (
          <AppTable
            columns={memberColumns}
            data={members}
            keyExtractor={m => m.id}
            emptyMessage="No team members found."
          />
        )}

        {tab === 'invitations' && isOwner && (
          <div className="space-y-4">
            <div className="bg-[#11131C] border border-[#1E2232] rounded-xl p-4 space-y-2.5">
              <h3 className="text-xs font-mono font-semibold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                <Mail size={13} className="text-[#F97316]" /> Send Invitation
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <AppInput
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="colleague@company.com"
                />
                <AppButton variant="primary" size="sm" onClick={handleInvite} loading={inviting}>
                  <Plus size={13} className="mr-1" /> Send
                </AppButton>
              </div>
              {inviteErr && <p className="text-red-400 text-xs">{inviteErr}</p>}
              {inviteMsg && (
                <p className="text-emerald-400 text-xs flex items-center gap-1">
                  <Check size={12} /> {inviteMsg}
                </p>
              )}
            </div>

            <AppTable
              columns={invitationColumns}
              data={invitations}
              keyExtractor={i => i.id}
              emptyMessage="No pending invitations."
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}


