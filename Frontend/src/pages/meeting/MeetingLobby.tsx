import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video as VideoIcon, VideoOff, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';
import { meetingService } from '../../services/meeting.service';
import { useMediaDevices } from '../../hooks/useMediaDevices';
import { AppButton, AppCard } from '../../components/app-ui';
import { MeetingStatusBadge } from '../../components/ui/Badge';
import type { Meeting } from '../../types';

function isMeetingJoinable(meeting: { status: string; date?: string; start_time?: string }): boolean {
  if (meeting.status === 'active') return true;
  if (meeting.status !== 'scheduled') return false;
  if (!meeting.date || !meeting.start_time) return false;
  const [y, m, d] = meeting.date.split('-').map(Number);
  const [h, min] = meeting.start_time.split(':').map(Number);
  if ([y, m, d, h, min].some(Number.isNaN)) return false;
  const scheduledStart = new Date(y, m - 1, d, h, min);
  return Date.now() >= scheduledStart.getTime();
}

function formatTime12h(time?: string) {
  if (!time) return 'TBD';
  const [h, m = 0] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 'TBD';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function MeetingLobby() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  const bindVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && stream) {
      node.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCameraOff]);

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
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#27272a] border-t-[#f4f4f5] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
      >
        {/* Camera Preview */}
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-[#141417] border border-[#27272a] aspect-video flex items-center justify-center shadow-lg">
            {!isCameraOff && stream ? (
              <video
                ref={bindVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#141417]">
                <div className="w-16 h-16 rounded-full bg-[#1c1c21] border border-[#27272a] flex items-center justify-center text-[#f4f4f5] text-lg font-semibold">
                  You
                </div>
              </div>
            )}

            {/* Device Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button
                type="button"
                onClick={toggleMic}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-[#1c1c21]/90 text-[#f4f4f5] border border-[#27272a] hover:bg-[#27272a]'
                }`}
              >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isCameraOff
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-[#1c1c21]/90 text-[#f4f4f5] border border-[#27272a] hover:bg-[#27272a]'
                }`}
              >
                {isCameraOff ? <VideoOff size={16} /> : <VideoIcon size={16} />}
              </button>
            </div>
          </div>

          <div className="flex justify-center gap-6 text-xs text-[#71717a] font-mono">
            <span className={`flex items-center gap-1.5 ${isMuted ? 'text-red-400' : 'text-emerald-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isMuted ? 'bg-red-400' : 'bg-emerald-400'}`} />
              {isMuted ? 'Mic Off' : 'Mic On'}
            </span>
            <span className={`flex items-center gap-1.5 ${isCameraOff ? 'text-red-400' : 'text-emerald-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isCameraOff ? 'bg-red-400' : 'bg-emerald-400'}`} />
              {isCameraOff ? 'Camera Off' : 'Camera On'}
            </span>
          </div>
        </div>

        {/* Info & Join Action */}
        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c1c21] border border-[#27272a] text-[10px] text-[#a1a1aa] font-mono mb-3">
              <ShieldCheck size={12} className="text-emerald-400" /> READY TO JOIN
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#f4f4f5] tracking-tight leading-snug">
              {meeting?.title ?? 'Scrum Session'}
            </h1>
            {meeting?.team_name && (
              <p className="text-xs text-[#a1a1aa] mt-1">{meeting.team_name}</p>
            )}
            {meeting?.sprint_name && (
              <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-md bg-[#1c1c21] border border-[#27272a] text-[#a1a1aa] text-xs font-mono">
                {meeting.sprint_name}
              </span>
            )}
          </div>

          <AppCard variant="dashboard">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1c1c21] border border-[#27272a] flex items-center justify-center text-[#f4f4f5] text-sm font-semibold">
                  {meeting?.host_name?.[0]?.toUpperCase() ?? 'H'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#f4f4f5]">{meeting?.host_name ?? 'Host'}</p>
                  <p className="text-[10px] text-[#71717a]">Meeting Host</p>
                </div>
              </div>
              <MeetingStatusBadge status={meeting?.status ?? 'scheduled'} />
            </div>
          </AppCard>

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

          <div className="space-y-3 pt-2">
            <AppButton
              variant="mono"
              size="md"
              className="w-full justify-center py-3.5 text-sm font-semibold"
              loading={joining}
              disabled={meeting?.status === 'ended' || meeting?.status === 'completed' || (meeting?.status === 'scheduled' && !isMeetingJoinable(meeting))}
              onClick={handleJoin}
            >
              {meeting?.status === 'ended' || meeting?.status === 'completed'
                ? 'Meeting Ended'
                : meeting?.status === 'scheduled' && !isMeetingJoinable(meeting)
                  ? `Starts at ${formatTime12h(meeting?.start_time)}`
                  : 'Join Meeting'}
            </AppButton>

            {meeting?.status === 'scheduled' && !isMeetingJoinable(meeting) && (
              <div className="flex items-center justify-center gap-2 text-xs text-[#a1a1aa] font-mono">
                <Clock size={12} />
                <span>Meeting starts at {formatTime12h(meeting?.start_time)}</span>
              </div>
            )}

            <button
              onClick={() => navigate(-1)}
              className="w-full text-center text-xs text-[#71717a] hover:text-[#f4f4f5] transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <ArrowLeft size={12} /> Go Back to Details
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
