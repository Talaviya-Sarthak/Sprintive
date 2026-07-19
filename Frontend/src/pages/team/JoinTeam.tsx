import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { teamService } from '../../services/team.service';
import type { Invitation } from '../../types';

export default function JoinTeam() {
  const { token }  = useParams<{ token: string }>();
  const navigate   = useNavigate();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading]       = useState(true);
  const [joining, setJoining]       = useState(false);
  const [error, setError]           = useState('');

  const isLoggedIn = !!localStorage.getItem('access_token');

  useEffect(() => {
    if (!token) return;
    teamService.getInvitePreview(token)
      .then(setInvitation)
      .catch(() => setError('This invitation link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    if (!isLoggedIn) {
      sessionStorage.setItem('pending_invite', token!);
      navigate(`/login?redirect=/join/${token}`);
      return;
    }
    setJoining(true);
    try {
      const team = await teamService.acceptInvitation(token!);
      navigate(`/teams/${team.id}`);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to join team');
    } finally {
      setJoining(false);
    }
  };

  const handleDecline = async () => {
    try {
      await teamService.rejectInvitation(token!);
      navigate('/');
    } catch {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
          </div>
          <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">Invalid Invitation</h2>
          <p className="text-[#94A3B8] text-sm mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="px-6 py-2.5 rounded-xl bg-[#3B82F6] text-white text-sm font-semibold hover:bg-[#2563EB] transition-colors">
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  const initials = invitation?.team_name?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${invitation?.team_color ?? '#3B82F6'}, transparent 70%)` }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-[#111827] border border-white/8 rounded-3xl overflow-hidden shadow-2xl">
          {/* Top accent */}
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${invitation?.team_color ?? '#3B82F6'}, #06B6D4)` }} />

          <div className="p-8">
            {/* Team avatar */}
            <div className="flex justify-center mb-6">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                style={{ background: invitation?.team_avatar ? 'transparent' : `linear-gradient(135deg, ${invitation?.team_color ?? '#3B82F6'}, #06B6D4)` }}
              >
                {invitation?.team_avatar
                  ? <img src={invitation.team_avatar} className="w-full h-full rounded-2xl object-cover" alt="" />
                  : initials}
              </div>
            </div>

            {/* Info */}
            <div className="text-center mb-8">
              <p className="text-[#94A3B8] text-sm mb-1">You've been invited to join</p>
              <h1 className="text-2xl font-bold text-[#F8FAFC] mb-1">{invitation?.team_name}</h1>
              <p className="text-[#475569] text-xs">Invited by {invitation?.inviter_name}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-[#0d1117] rounded-xl p-4 text-center border border-white/6">
                <p className="text-2xl font-bold text-[#F8FAFC]">{invitation?.member_count ?? 0}</p>
                <p className="text-xs text-[#475569] mt-0.5">Members</p>
              </div>
              <div className="bg-[#0d1117] rounded-xl p-4 text-center border border-white/6">
                <p className="text-sm font-semibold text-[#F8FAFC] truncate">{invitation?.inviter_name?.split(' ')[0]}</p>
                <p className="text-xs text-[#475569] mt-0.5">Scrum Master</p>
              </div>
            </div>

            {!isLoggedIn && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-xs text-center">
                You'll be redirected to login, then automatically joined.
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${invitation?.team_color ?? '#3B82F6'}, #06B6D4)` }}
              >
                {joining
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Joining...</>
                  : isLoggedIn ? 'Join Team' : 'Login & Join'}
              </motion.button>

              <button
                onClick={handleDecline}
                className="w-full py-3 rounded-xl bg-white/4 hover:bg-white/8 text-[#94A3B8] text-sm font-medium transition-colors"
              >
                Decline Invitation
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
