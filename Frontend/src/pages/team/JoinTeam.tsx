import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRight, 
  LogOut, 
  UserCheck, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AppButton } from '../../components/app-ui';
import type { Invitation } from '../../types';

type InvitationViewStatus = 
  | 'loading'
  | 'pending'
  | 'accepted'
  | 'already_member'
  | 'declined'
  | 'expired'
  | 'email_mismatch'
  | 'not_found'
  | 'error';

function formatRole(role?: string): string {
  if (!role) return 'Developer';
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function JoinTeam() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, teams, refreshUser, logout } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [statusState, setStatusState] = useState<InvitationViewStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [joining, setJoining] = useState(false);
  const [declining, setDeclining] = useState(false);

  const isLoggedIn = !!user;

  // Design Tokens mirroring Sprintive theme
  const pageBg = isLight ? 'bg-[#f8fafc]' : 'bg-[#09090b]';
  const cardBg = isLight ? 'bg-white' : 'bg-[#111113]';
  const cardBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#27272a]';
  const headingColor = isLight ? 'text-[#0f172a]' : 'text-[#f4f4f5]';
  const subtextColor = isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]';
  const metaBoxBg = isLight ? 'bg-[#f1f5f9]' : 'bg-[#18181b]';
  const metaBoxBorder = isLight ? 'border-[#e2e8f0]' : 'border-[#27272a]';
  const shadowClass = isLight ? 'shadow-[0_20px_40px_rgba(0,0,0,0.06)]' : 'shadow-[0_20px_50px_rgba(0,0,0,0.5)]';

  useEffect(() => {
    if (!token) {
      setStatusState('not_found');
      setErrorMessage('No invitation token provided in the URL.');
      return;
    }

    let isMounted = true;
    setStatusState('loading');
    setErrorMessage('');
    setActionError('');

    teamService
      .getInvitePreview(token)
      .then(data => {
        if (!isMounted) return;
        setInvitation(data);

        // Check if user is already a member
        if (user && teams.some(t => t.id === data.team_id)) {
          setStatusState('already_member');
          return;
        }

        // Check if user email mismatches invitation recipient email
        if (user && data.email && user.email.toLowerCase() !== data.email.toLowerCase()) {
          setStatusState('email_mismatch');
          return;
        }

        // Check invitation status
        if (data.status === 'accepted') {
          setStatusState('accepted');
        } else if (data.status === 'rejected') {
          setStatusState('declined');
        } else if (data.status === 'expired' || new Date(data.expires_at) < new Date()) {
          setStatusState('expired');
        } else {
          setStatusState('pending');
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const axiosError = err as { response?: { status?: number; data?: { message?: string; invitation?: Invitation } } };
        const status = axiosError?.response?.status;
        const message = axiosError?.response?.data?.message;
        const inviteData = axiosError?.response?.data?.invitation;

        if (inviteData) {
          setInvitation(inviteData);
        }

        if (status === 404) {
          setStatusState('not_found');
          setErrorMessage(message || 'Invitation link was not found or has been revoked.');
        } else if (status === 410) {
          setStatusState('expired');
          setErrorMessage(message || 'This invitation has expired.');
        } else if (status === 409) {
          setStatusState('accepted');
        } else if (status === 400 && message?.toLowerCase().includes('declined')) {
          setStatusState('declined');
        } else {
          setStatusState('error');
          setErrorMessage(message || 'Unable to load invitation. Please verify the link or try again.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, user, teams]);

  const handleAccept = async () => {
    if (!token) return;
    const currentPath = `/invitations/${token}`;

    if (!isLoggedIn) {
      localStorage.setItem('auth_redirect', currentPath);
      sessionStorage.setItem('auth_redirect', currentPath);
      sessionStorage.setItem('pending_invite', token);
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (statusState === 'already_member' && invitation?.team_id) {
      navigate(`/teams/${invitation.team_id}`);
      return;
    }

    setJoining(true);
    setActionError('');

    try {
      const team = await teamService.acceptInvitation(token);
      await refreshUser();
      navigate(`/teams/${team.id}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
      const status = axiosError?.response?.status;
      const message = axiosError?.response?.data?.message;

      if (status === 409) {
        setStatusState('accepted');
      } else if (status === 410) {
        setStatusState('expired');
      } else if (status === 403) {
        setStatusState('email_mismatch');
      } else {
        setActionError(message || 'Failed to accept invitation. Please try again.');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setDeclining(true);
    setActionError('');

    try {
      await teamService.rejectInvitation(token);
      setStatusState('declined');
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
      const status = axiosError?.response?.status;
      const message = axiosError?.response?.data?.message;

      if (status === 410) {
        setStatusState('expired');
      } else if (status === 409) {
        setStatusState('accepted');
      } else {
        // Even if network or token error, confirm to user
        setStatusState('declined');
      }
      if (message && status !== 410 && status !== 409) {
        setActionError(message);
      }
    } finally {
      setDeclining(false);
    }
  };

  const handleSwitchAccount = async () => {
    const currentPath = `/invitations/${token}`;
    localStorage.setItem('auth_redirect', currentPath);
    sessionStorage.setItem('auth_redirect', currentPath);
    await logout();
    navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
  };

  if (statusState === 'loading') {
    return (
      <div className={`min-h-screen ${pageBg} flex items-center justify-center p-4`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <span className={`text-xs font-mono ${subtextColor} uppercase tracking-wider`}>Loading invitation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${pageBg} flex items-center justify-center p-4 selection:bg-[#F97316]/20`}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className={`${cardBg} border ${cardBorder} rounded-2xl p-6 sm:p-8 ${shadowClass} relative overflow-hidden`}>
          
          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neutral-500 via-neutral-900 to-neutral-500 dark:from-neutral-700 dark:via-neutral-200 dark:to-neutral-700" />

          {/* STATE: NOT FOUND / ERROR */}
          {(statusState === 'not_found' || statusState === 'error') && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
                <XCircle size={28} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${headingColor} tracking-tight`}>
                  {statusState === 'not_found' ? 'Invalid or Expired Link' : 'Invitation Error'}
                </h1>
                <p className={`text-xs ${subtextColor} mt-1.5 leading-relaxed`}>
                  {errorMessage || 'This invitation link is invalid or no longer exists. Please ask the team owner to send a new invitation.'}
                </p>
              </div>
              <div className="pt-2">
                <AppButton
                  variant="mono"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => navigate('/')}
                >
                  Return to Homepage
                </AppButton>
              </div>
            </div>
          )}

          {/* STATE: EXPIRED */}
          {statusState === 'expired' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                <Clock size={28} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${headingColor} tracking-tight`}>
                  Invitation Expired
                </h1>
                <p className={`text-xs ${subtextColor} mt-1.5 leading-relaxed`}>
                  This invitation has expired. Ask the team administrator to send a new invitation.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <AppButton
                  variant="mono-outline"
                  size="sm"
                  className="flex-1 justify-center"
                  onClick={() => navigate('/')}
                >
                  Homepage
                </AppButton>
                {isLoggedIn && (
                  <AppButton
                    variant="mono"
                    size="sm"
                    className="flex-1 justify-center"
                    onClick={() => navigate('/dashboard')}
                  >
                    Go to Dashboard
                  </AppButton>
                )}
              </div>
            </div>
          )}

          {/* STATE: DECLINED */}
          {statusState === 'declined' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-neutral-500/10 border border-neutral-500/20 flex items-center justify-center mx-auto text-neutral-400">
                <XCircle size={28} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${headingColor} tracking-tight`}>
                  Invitation Declined
                </h1>
                <p className={`text-xs ${subtextColor} mt-1.5 leading-relaxed`}>
                  You have declined the invitation to join <span className="font-semibold text-neutral-200">{invitation?.team_name || 'this team'}</span>.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <AppButton
                  variant="mono-outline"
                  size="sm"
                  className="flex-1 justify-center"
                  onClick={() => navigate('/')}
                >
                  Homepage
                </AppButton>
                {isLoggedIn && (
                  <AppButton
                    variant="mono"
                    size="sm"
                    className="flex-1 justify-center"
                    onClick={() => navigate('/dashboard')}
                  >
                    Dashboard
                  </AppButton>
                )}
              </div>
            </div>
          )}

          {/* STATE: ACCEPTED */}
          {statusState === 'accepted' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${headingColor} tracking-tight`}>
                  Already Accepted
                </h1>
                <p className={`text-xs ${subtextColor} mt-1.5 leading-relaxed`}>
                  You've already accepted this invitation.
                </p>
              </div>
              <div className="pt-2">
                <AppButton
                  variant="mono"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => {
                    if (invitation?.team_id) {
                      navigate(`/teams/${invitation.team_id}`);
                    } else {
                      navigate('/dashboard');
                    }
                  }}
                >
                  Open Workspace <ChevronRight size={14} className="ml-1" />
                </AppButton>
              </div>
            </div>
          )}

          {/* STATE: ALREADY MEMBER */}
          {statusState === 'already_member' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <UserCheck size={28} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${headingColor} tracking-tight`}>
                  Already a Member
                </h1>
                <p className={`text-xs ${subtextColor} mt-1.5 leading-relaxed`}>
                  You're already a member of <span className="font-semibold text-neutral-200">{invitation?.team_name}</span>.
                </p>
              </div>
              <div className="pt-2">
                <AppButton
                  variant="mono"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => navigate(`/teams/${invitation?.team_id}`)}
                >
                  Open Team Workspace <ChevronRight size={14} className="ml-1" />
                </AppButton>
              </div>
            </div>
          )}

          {/* STATE: EMAIL MISMATCH */}
          {statusState === 'email_mismatch' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                <AlertCircle size={28} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${headingColor} tracking-tight`}>
                  Recipient Mismatch
                </h1>
                <p className={`text-xs ${subtextColor} mt-2 leading-relaxed`}>
                  This invitation was sent to <strong className="text-neutral-200 font-mono">{invitation?.email}</strong>.
                  <br />
                  You are currently signed in as <strong className="text-neutral-200 font-mono">{user?.email}</strong>.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] text-left">
                To accept this invitation, please switch to the invited account.
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <AppButton
                  variant="mono-outline"
                  size="sm"
                  className="flex-1 justify-center gap-1.5"
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </AppButton>
                <AppButton
                  variant="mono"
                  size="sm"
                  className="flex-1 justify-center gap-1.5"
                  onClick={handleSwitchAccount}
                >
                  <LogOut size={13} /> Switch Account
                </AppButton>
              </div>
            </div>
          )}

          {/* STATE: PENDING (PRIMARY INVITATION FLOW) */}
          {statusState === 'pending' && (
            <div className="space-y-6">
              {/* Header Label */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-200">
                    <Users size={14} />
                  </div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                    Invitation
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                  <ShieldCheck size={11} className="text-emerald-400" /> Verified
                </div>
              </div>

              {/* Main Subject */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-700 flex items-center justify-center mx-auto text-2xl font-black text-white shadow-inner">
                  {invitation?.team_name?.charAt(0)?.toUpperCase() ?? 'T'}
                </div>

                <div className="pt-1">
                  <p className={`text-xs font-mono ${subtextColor} uppercase tracking-wider`}>
                    You've been invited to join
                  </p>
                  <h1 className={`text-2xl font-black ${headingColor} tracking-tight mt-0.5`}>
                    {invitation?.team_name}
                  </h1>
                </div>
              </div>

              {/* Meta details card */}
              <div className={`p-3.5 rounded-xl ${metaBoxBg} border ${metaBoxBorder} space-y-2 text-xs`}>
                <div className="flex justify-between items-center">
                  <span className={`${subtextColor} font-mono text-[11px]`}>Invited by</span>
                  <span className={`font-semibold ${headingColor}`}>
                    {invitation?.inviter_name || 'Team Administrator'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`${subtextColor} font-mono text-[11px]`}>Role</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-white font-mono text-[11px] font-bold">
                    {formatRole(invitation?.role)}
                  </span>
                </div>
                {invitation?.email && (
                  <div className="flex justify-between items-center">
                    <span className={`${subtextColor} font-mono text-[11px]`}>Recipient</span>
                    <span className={`font-mono text-[11px] ${subtextColor}`}>
                      {invitation.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Error Banner */}
              <AnimatePresence>
                {actionError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2"
                  >
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{actionError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login required hint if user not signed in */}
              {!isLoggedIn && (
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 flex items-center gap-2">
                  <Sparkles size={13} className="text-orange-400 shrink-0" />
                  <span>You'll be asked to sign in or create an account to join this team.</span>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex gap-3 pt-1">
                <AppButton
                  variant="mono-outline"
                  size="sm"
                  disabled={joining || declining}
                  loading={declining}
                  className="flex-1 justify-center py-2.5"
                  onClick={handleDecline}
                >
                  Decline
                </AppButton>
                <AppButton
                  variant="mono"
                  size="sm"
                  disabled={joining || declining}
                  loading={joining}
                  className="flex-1 justify-center py-2.5 gap-1.5 font-bold"
                  onClick={handleAccept}
                >
                  <span>Accept invitation</span>
                  <ArrowRight size={14} />
                </AppButton>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
