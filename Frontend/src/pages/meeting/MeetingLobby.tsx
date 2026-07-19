import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { meetingService } from '../../services/meeting.service';
import { useMediaDevices } from '../../hooks/useMediaDevices';
import type { Meeting } from '../../types';

export default function MeetingLobby() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [meeting, setMeeting]   = useState<Meeting | null>(null);
  const [loading, setLoading]   = useState(true);
  const [joining, setJoining]   = useState(false);
  const [error, setError]       = useState('');

  const { stream, isMuted, isCameraOff, toggleMic, toggleCamera } = useMediaDevices();

  useEffect(() => {
    if (!id) return;
    meetingService.getMeeting(id)
      .then(setMeeting)
      .catch(() => setError('Meeting not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    try {
      await meetingService.joinMeeting(id);
      navigate(`/meetings/${id}/room`);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(ellipse, #3B82F6, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Preview */}
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-[#0d1117] border border-white/8 aspect-video">
            {!isCameraOff && stream ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-2xl font-bold">
                  You
                </div>
              </div>
            )}
            {/* Controls overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
              <button
                onClick={toggleMic}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}
              >
                {isMuted
                  ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/></svg>
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>}
              </button>
              <button
                onClick={toggleCamera}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3z"/>
                  {isCameraOff && <line x1="1" y1="1" x2="23" y2="23"/>}
                </svg>
              </button>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-xs text-[#475569]">
            <span className={`flex items-center gap-1.5 ${isMuted ? 'text-red-400' : 'text-green-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isMuted ? 'bg-red-400' : 'bg-green-400'}`} />
              {isMuted ? 'Mic off' : 'Mic on'}
            </span>
            <span className={`flex items-center gap-1.5 ${isCameraOff ? 'text-red-400' : 'text-green-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isCameraOff ? 'bg-red-400' : 'bg-green-400'}`} />
              {isCameraOff ? 'Camera off' : 'Camera on'}
            </span>
          </div>
        </div>

        {/* Info & Join */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <p className="text-[#94A3B8] text-sm mb-1">{meeting?.team_name}</p>
            <h1 className="text-3xl font-bold text-[#F8FAFC] leading-tight">{meeting?.title}</h1>
            {meeting?.sprint_name && (
              <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6] text-xs font-medium">
                {meeting.sprint_name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#111827] border border-white/6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center text-white text-sm font-bold">
              {meeting?.host_name?.[0] ?? 'H'}
            </div>
            <div>
              <p className="text-sm font-medium text-[#F8FAFC]">{meeting?.host_name}</p>
              <p className="text-xs text-[#475569]">Meeting Host</p>
            </div>
            <div className="ml-auto">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                meeting?.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-[#F59E0B]/15 text-[#F59E0B]'
              }`}>
                {meeting?.status === 'active' ? '● Live' : 'Scheduled'}
              </span>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleJoin}
            disabled={joining || meeting?.status === 'ended'}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-white font-bold text-base disabled:opacity-50 transition-all shadow-lg shadow-[#3B82F6]/20 flex items-center justify-center gap-2"
          >
            {joining
              ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Joining...</>
              : meeting?.status === 'ended' ? 'Meeting Ended' : 'Join Meeting'}
          </motion.button>

          <button onClick={() => navigate(-1)} className="text-[#475569] text-sm hover:text-[#94A3B8] transition-colors text-center">
            ← Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
