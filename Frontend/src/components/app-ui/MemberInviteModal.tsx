import * as React from 'react';
import { Search, UserPlus, Check, X, Users, Send } from 'lucide-react';
import { AppModal } from './AppModal';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { AppBadge } from './AppBadge';
import { teamService } from '../../services/team.service';
import type { UserSearchResult, InviteUsersResult } from '../../types';

export interface MemberInviteModalProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
  onSent?: (results: InviteUsersResult[]) => void;
}

const STATUS_META: Record<string, { label: string; tone: 'emerald' | 'red' | 'mono' }> = {
  sent:            { label: 'Invitation sent', tone: 'emerald' },
  already_member:  { label: 'Already a member', tone: 'mono' },
  already_invited: { label: 'Already invited', tone: 'mono' },
  owner:           { label: 'Team owner', tone: 'mono' },
  duplicate:       { label: 'Duplicate', tone: 'mono' },
  not_found:       { label: 'Not found', tone: 'red' },
  invalid:         { label: 'Invalid', tone: 'red' },
  failed:          { label: 'Failed', tone: 'red' },
};

function UserAvatar({ name, avatar, size = 'md' }: { name?: string; avatar?: string | null; size?: 'sm' | 'md' }) {
  const wrap = size === 'sm' ? 'w-5 h-5 text-[9px] rounded-full' : 'w-8 h-8 text-xs rounded-lg';
  const imgWrap = size === 'sm' ? 'rounded-full' : 'rounded-lg';
  return (
    <div
      className={`${wrap} bg-[#1c1c21] border border-[#27272a] flex items-center justify-center text-[#f4f4f5] font-semibold shrink-0 overflow-hidden`}
    >
      {avatar ? (
        <img src={avatar} className={`w-full h-full object-cover ${imgWrap}`} alt={name ?? 'User'} />
      ) : (
        name?.[0]?.toUpperCase() ?? 'U'
      )}
    </div>
  );
}

function InviteFlow({ teamId, onSent }: { teamId: string; onSent?: (results: InviteUsersResult[]) => void }) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<UserSearchResult[]>([]);
  const [selected, setSelected] = React.useState<UserSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [sentResults, setSentResults] = React.useState<InviteUsersResult[] | null>(null);
  const [error, setError] = React.useState('');

  const trimmed = query.trim();

  React.useEffect(() => {
    if (trimmed.length < 1) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await teamService.searchUsers(trimmed, teamId);
        if (!cancelled) setResults(users);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, teamId]);

  const selectedIds = React.useMemo(() => new Set(selected.map(s => s.id)), [selected]);
  const visibleResults = results.filter(u => !selectedIds.has(u.id));

  const handleAdd = (user: UserSearchResult) => {
    setSelected(prev => (prev.some(s => s.id === user.id) ? prev : [...prev, user]));
    setQuery('');
    setResults([]);
  };

  const handleRemove = (id: string) => {
    setSelected(prev => prev.filter(s => s.id !== id));
  };

  const handleSend = async () => {
    if (selected.length === 0 || sending) return;
    setSending(true);
    setError('');
    setSentResults(null);
    try {
      const res = await teamService.inviteUsers(teamId, selected.map(s => s.id));
      setSentResults(res);
      onSent?.(res);
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to send invitations'
      );
    } finally {
      setSending(false);
    }
  };

  const sentUserById = React.useMemo(() => {
    const map = new Map<string, InviteUsersResult>();
    sentResults?.forEach(r => {
      if (r.userId) map.set(r.userId, r);
    });
    return map;
  }, [sentResults]);

  return (
    <div className="space-y-4">
      <AppInput
        icon={<Search size={14} />}
        placeholder="Search by name or email…"
        value={query}
        autoFocus
        onChange={e => setQuery(e.target.value)}
      />

      <div className="max-h-52 overflow-y-auto rounded-lg border border-[#27272a] bg-[#121215] divide-y divide-[#1f1f23]">
        {searching ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#27272a] border-t-[#f4f4f5] rounded-full animate-spin" />
          </div>
        ) : trimmed.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#71717a]">Start typing to search Sprintive users.</p>
          </div>
        ) : visibleResults.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#71717a]">No matching users found.</p>
          </div>
        ) : (
          visibleResults.map(u => {
            const status = sentUserById.get(u.id)?.status;
            const resolved = status === 'sent';
            const alreadyMember = u.already_member;
            const alreadyInvited = u.already_invited;
            const isDisabled = alreadyMember || alreadyInvited;
            return (
              <div key={u.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={u.name} avatar={u.avatar} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#f4f4f5] truncate">{u.name}</p>
                    <p className="text-[10px] text-[#71717a] truncate">{u.email}</p>
                  </div>
                </div>

                {resolved ? (
                  <AppBadge variant="emerald" size="xs">
                    <Check size={10} className="mr-1" /> Sent
                  </AppBadge>
                ) : isDisabled ? (
                  <AppBadge variant="mono" size="xs">
                    {alreadyMember ? 'Member' : 'Invited'}
                  </AppBadge>
                ) : (
                  <AppButton variant="mono-ghost" size="xs" onClick={() => handleAdd(u)}>
                    <UserPlus size={13} className="mr-1" /> Add
                  </AppButton>
                )}
              </div>
            );
          })
        )}
      </div>

      {selected.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-mono font-medium text-[#71717a] uppercase tracking-wider">
            Selected Members ({selected.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selected.map(u => {
              const status = sentUserById.get(u.id)?.status;
              const disabled = !!status && status !== 'failed';
              return (
                <span
                  key={u.id}
                  className={`inline-flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-full border text-[11px] font-medium transition-colors ${
                    disabled
                      ? 'bg-[#18181b] border-[#27272a] text-[#71717a]'
                      : 'bg-[#1c1c21] border-[#27272a] text-[#f4f4f5]'
                  }`}
                >
                  <UserAvatar size="sm" name={u.name} avatar={u.avatar} />
                  <span className="max-w-36 truncate">{u.name}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(u.id)}
                      className="p-0.5 text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#27272a] rounded-full transition-colors cursor-pointer"
                      aria-label={`Remove ${u.name}`}
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {sentResults && sentResults.length > 0 && (
        <div className="rounded-lg border border-[#27272a] bg-[#121215] divide-y divide-[#1f1f23]">
          {selected.map(u => {
            const r = sentUserById.get(u.id);
            if (!r) return null;
            const meta = STATUS_META[r.status] ?? { label: r.status, tone: 'mono' };
            return (
              <div key={u.id} className="flex items-center justify-between gap-3 px-3.5 py-2">
                <span className="text-xs text-[#f4f4f5] truncate">{u.name}</span>
                <AppBadge variant={meta.tone} size="xs">
                  {meta.label}
                </AppBadge>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}

      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
          <Users size={13} />
          {selected.length} selected
        </div>
        <AppButton
          variant="mono"
          size="sm"
          loading={sending}
          disabled={selected.length === 0}
          onClick={handleSend}
        >
          <Send size={13} className="mr-1.5" /> Send Invitations
        </AppButton>
      </div>
    </div>
  );
}

export function MemberInviteModal({ open, onClose, teamId, onSent }: MemberInviteModalProps) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Invite Members"
      description="Search Sprintive users, select teammates, then send invitations."
      maxWidth="lg"
    >
      {open && <InviteFlow key={teamId} teamId={teamId} onSent={onSent} />}
    </AppModal>
  );
}