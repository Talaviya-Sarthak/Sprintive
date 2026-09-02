import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Clock, Calendar, Mail, Trash2, Video, Settings, UserPlus } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { AppButton, AppBadge, AppInput, MemberInviteModal } from '../../components/app-ui';
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
  const [showInviteModal, setShowInviteModal] = useState(false);

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
      .catch(() => setError('Team workspace not found or access denied.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Enter a valid email address');
      return;
    }
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      await teamService.inviteMembers(id!, [email]);
      setInviteSuccess(`Invitation dispatched to ${email}`);
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

  if (loading) {
    return (
      <AppLayout teamId={id}>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--app-border)', borderTopColor: 'var(--app-text-primary)' }} />
        </div>
      </AppLayout>
    );
  }

  if (error || !team) {
    return (
      <AppLayout teamId={id}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-xs text-red-400 font-medium">{error || 'Team not found'}</p>
          <AppButton variant="mono-outline" size="sm" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </AppButton>
        </div>
      </AppLayout>
    );
  }

  const workingDayNames = ((team.working_days as number[]) || [1, 2, 3, 4, 5])
    .map(d => DAYS[d])
    .join(', ');

  return (
    <AppLayout teamId={id}>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold border shrink-0"
              style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}
            >
              {team.avatar_url ? (
                <img src={team.avatar_url} className="w-full h-full object-cover rounded-2xl" alt={team.name} />
              ) : (
                team.name[0].toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>{team.name}</h1>
                <AppBadge variant="mono" size="xs">
                  {isOwner ? 'Owner' : 'Member'}
                </AppBadge>
              </div>
              <p className="text-xs mt-1 max-w-xl" style={{ color: 'var(--app-text-secondary)' }}>
                {team.description || 'Agile Scrum workspace & meeting intelligence environment'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <AppButton variant="mono" size="sm" onClick={() => navigate(`/meetings/create?team_id=${team.id}`)}>
              <Video size={13} className="mr-1.5" /> New Meeting
            </AppButton>
            <AppButton variant="mono-outline" size="sm" onClick={() => navigate(`/teams/${team.id}/meetings`)}>
              <Calendar size={13} className="mr-1.5" /> Meeting Logs
            </AppButton>
            {isOwner && (
              <AppButton variant="mono-ghost" size="sm" onClick={() => navigate(`/teams/${team.id}/settings`)}>
                <Settings size={14} />
              </AppButton>
            )}
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Stats & Members */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="border rounded-xl p-4 transition-colors" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--app-border-focus)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--app-border)'}
              >
                <div className="flex items-center justify-between mb-2" style={{ color: 'var(--app-text-muted)' }}>
                  <span className="text-[10px] font-mono uppercase font-medium tracking-wider">Teammates</span>
                  <Users size={14} style={{ color: 'var(--app-text-secondary)' }} />
                </div>
                <div className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>{members.length}</div>
                <span className="text-[11px] block mt-1" style={{ color: 'var(--app-text-muted)' }}>Active Engineers</span>
              </div>

              <div className="border rounded-xl p-4 transition-colors" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--app-border-focus)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--app-border)'}
              >
                <div className="flex items-center justify-between mb-2" style={{ color: 'var(--app-text-muted)' }}>
                  <span className="text-[10px] font-mono uppercase font-medium tracking-wider">Daily Scrum</span>
                  <Clock size={14} style={{ color: 'var(--app-text-secondary)' }} />
                </div>
                <div className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--app-text-primary)' }}>{team.daily_scrum_time || '09:00'}</div>
                <span className="text-[11px] block mt-1" style={{ color: 'var(--app-text-muted)' }}>{team.timezone || 'UTC'}</span>
              </div>

              <div className="border rounded-xl p-4 transition-colors col-span-2 sm:col-span-1" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--app-border-focus)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--app-border)'}
              >
                <div className="flex items-center justify-between mb-2" style={{ color: 'var(--app-text-muted)' }}>
                  <span className="text-[10px] font-mono uppercase font-medium tracking-wider">Sprint Days</span>
                  <Calendar size={14} style={{ color: 'var(--app-text-secondary)' }} />
                </div>
                <div className="text-xs font-semibold truncate mt-1" style={{ color: 'var(--app-text-primary)' }}>{workingDayNames}</div>
                <span className="text-[11px] block mt-1" style={{ color: 'var(--app-text-secondary)' }}>Active Cadence</span>
              </div>
            </div>

            {/* Team Members List */}
            <div className="border rounded-xl p-6 space-y-4" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}>
              <div className="flex items-center justify-between pb-3.5 border-b" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                  Team Members ({members.length})
                </h2>
                <AppButton variant="mono-ghost" size="xs" onClick={() => navigate(`/teams/${team.id}/members`)}>
                  Manage Members
                </AppButton>
              </div>

              <div className="space-y-3">
                {members.map(m => (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between p-3.5 rounded-xl border"
                    style={{ backgroundColor: 'var(--app-surface-hover)', borderColor: 'var(--app-border)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)', color: 'var(--app-text-primary)' }}>
                        {m.full_name?.[0] ?? 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'var(--app-text-primary)' }}>{m.full_name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--app-text-muted)' }}>{m.email}</p>
                      </div>
                    </div>
                    <AppBadge variant="mono" size="xs">
                      {m.role}
                    </AppBadge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Invite & Workspace Actions */}
          <div className="space-y-6">
            {/* Invite Teammates Card */}
            {isOwner && (
              <div className="border rounded-xl p-6 space-y-4" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'var(--app-border)' }}>
                <div>
                  <h2 className="text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: 'var(--app-text-muted)' }}>
                    Invite Teammates
                  </h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--app-text-secondary)' }}>Send immediate email invitations to join workspace.</p>
                </div>

                <div className="space-y-3">
                  <AppInput
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    
                    onChange={e => setInviteEmail(e.target.value)}
                  />
                  {inviteError && <p className="text-[10px] text-red-400">{inviteError}</p>}
                  {inviteSuccess && <p className="text-[10px] text-emerald-400">{inviteSuccess}</p>}
                  <AppButton variant="mono" size="xs" className="w-full justify-center" loading={inviting} onClick={handleInvite}>
                    <Mail size={13} className="mr-1.5" /> Send Invitation
                  </AppButton>

                  <div className="flex items-center gap-2 py-1">
                    <div className="h-px flex-1 bg-[#1f1f23]" />
                    <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider">or</span>
                    <div className="h-px flex-1 bg-[#1f1f23]" />
                  </div>

                  <AppButton variant="mono-outline" size="xs" className="w-full justify-center" onClick={() => setShowInviteModal(true)}>
                    <UserPlus size={13} className="mr-1.5" /> Invite Members
                  </AppButton>
                </div>
              </div>
            )}

            {/* Owner Workspace Danger Zone */}
            {isOwner && (
              <div className="border rounded-xl p-6 space-y-3" style={{ backgroundColor: 'var(--app-surface-card)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <h2 className="text-xs font-mono font-semibold text-red-400 uppercase tracking-wider">
                  Danger Zone
                </h2>
                <p className="text-[11px] leading-normal" style={{ color: 'var(--app-text-muted)' }}>
                  Permanently delete this team workspace, meeting records, and sprint task histories.
                </p>
                <AppButton
                  variant="danger"
                  size="xs"
                  className="w-full justify-center"
                  loading={deleting}
                  onClick={handleDelete}
                >
                  <Trash2 size={13} className="mr-1.5" />
                  {confirmDelete ? 'Confirm Permanent Delete' : 'Delete Workspace'}
                </AppButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {isOwner && (
        <MemberInviteModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          teamId={team.id}
          onSent={() => {
            if (id) teamService.getMembers(id).then(setMembers).catch(() => undefined);
          }}
        />
      )}
    </AppLayout>
  );
}
