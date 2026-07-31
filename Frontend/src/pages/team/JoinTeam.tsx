import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ShieldCheck } from 'lucide-react';
import { teamService } from '../../services/team.service';
import { useAuth } from '../../context/AuthContext';
import { AppButton } from '../../components/app-ui';
import type { Invitation } from '../../types';

export default function JoinTeam() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, teams, refreshUser } = useAuth();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const isLoggedIn = !!user;
  const alreadyMember = isLoggedIn && invitation && teams.some(t => t.id === invitation.team_id);

  useEffect(() => {
    if (!token) return;
    teamService
      .getInvitePreview(token)
      .then(setInvitation)
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) setError('Invitation link was not found.');
        else if (status === 400) setError('This invitation has expired or has already been accepted.');
        else setError('This invitation link is invalid or expired.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    if (!isLoggedIn) {
      sessionStorage.setItem('pending_invite', token!);
      navigate(`/login?redirect=/join/${token}`);
      return;
    }

    if (alreadyMember) {
      navigate(`/teams/${invitation!.team_id}`);
      return;
    }

    setJoining(true);
    try {
      const team = await teamService.acceptInvitation(token!);
      await refreshUser();
      navigate(`/teams/${team.id}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
      const message = axiosError?.response?.data?.message;
      setError(message ?? 'Failed to join team workspace');
    } finally {
      setJoining(false);
    }
  };

  const handleDecline = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
        <div className="w-7 h-7 border-2 border-[#27272a] border-t-[#f4f4f5] rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3 text-red-400">
            <XCircle size={24} />
          </div>
          <h2 className="text-lg font-semibold text-[#f4f4f5] mb-1">Invitation Link Error</h2>
          <p className="text-[#a1a1aa] text-xs mb-5">{error}</p>
          <AppButton variant="mono" size="sm" onClick={() => navigate('/')}>
            Return to Homepage
          </AppButton>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-6 shadow-sm space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1c1c21] border border-[#27272a] flex items-center justify-center mx-auto text-[#f4f4f5] font-bold text-xl">
            {invitation?.team_name?.[0]?.toUpperCase() ?? 'T'}
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#1c1c21] border border-[#27272a] text-[10px] text-[#a1a1aa] font-mono mb-2">
              <ShieldCheck size={12} className="text-emerald-400" /> TEAM INVITATION
            </div>
            <h1 className="text-xl font-semibold text-[#f4f4f5]">Join {invitation?.team_name}</h1>
            <p className="text-[#a1a1aa] text-xs mt-1 leading-normal">
              You have been invited to join this Scrum workspace and participate in meetings.
            </p>
          </div>

          {alreadyMember ? (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              You are already a member of this workspace.
            </div>
          ) : null}

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

          <div className="flex gap-3 pt-2">
            <AppButton variant="mono-outline" size="sm" className="flex-1 justify-center" onClick={handleDecline}>
              Decline
            </AppButton>
            <AppButton variant="mono" size="sm" className="flex-1 justify-center" loading={joining} onClick={handleJoin}>
              {alreadyMember ? 'Open Workspace' : 'Accept & Join'}
            </AppButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
