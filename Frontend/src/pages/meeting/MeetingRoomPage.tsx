import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaDevices } from '../../hooks/useMediaDevices';
import { useMeetingSocket } from '../../hooks/useMeetingSocket';
import { useMeetingStore } from '../../store/meetingStore';
import { meetingService } from '../../services/meeting.service';
import { useAuth } from '../../context/AuthContext';
import ParticipantCard from '../../components/meeting/ParticipantCard';
import MeetingChat from '../../components/meeting/MeetingChat';
import ParticipantsList from '../../components/meeting/ParticipantsList';
import MeetingToolbar from '../../components/meeting/MeetingToolbar';
import MeetingTimer from '../../components/meeting/MeetingTimer';
import { MeetingStatusBadge } from '../../components/ui/Badge';
import type { Meeting, Transcript } from '../../types';

export default function MeetingRoomPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const {
    meeting, participants, chats, recording, isMuted, isCameraOff, isScreenSharing,
    activeSpeakerId, sidebarTab, unreadCount,
    setMeeting, setParticipants, setChats,
    toggleScreenShare,
    setSidebarTab, resetUnread, reset,
  } = useMeetingStore();

  const { stream, toggleMic, toggleCamera: toggleCam, startScreenShare, error: mediaError } = useMediaDevices();
  const { sendChat, startMeeting, endMeeting, onRedirect, setLocalStream, toggleCamera: socketToggleCamera, toggleMic: socketToggleMic, isConnected, socketError } = useMeetingSocket(meetingId);

  const [loading, setLoading] = useState(true);
  const [endedData, setEndedData] = useState<{ meeting: Meeting; transcript: Transcript } | null>(null);

  const userId = user?.id ?? '';
  const isHost = meeting?.host_id === userId;

  // Fetch initial data on mount
  useEffect(() => {
    if (!meetingId) return;
    Promise.all([
      meetingService.getMeeting(meetingId),
      meetingService.getChats(meetingId),
      meetingService.getParticipants(meetingId),
    ])
      .then(([m, c, p]) => {
        setMeeting(m);
        setChats(c);
        const existing = useMeetingStore.getState().participants;
        setParticipants((p || []).map((rp: any) => {
          const ep = existing.find(x => x.user_id === rp.user_id);
          return {
            id: rp.id,
            meeting_id: rp.meeting_id,
            user_id: rp.user_id,
            full_name: rp.full_name,
            avatar_url: rp.avatar_url,
            email: rp.email,
            role: rp.role,
            joined_at: rp.joined_at,
            isMuted: rp.is_muted ?? ep?.isMuted ?? false,
            isCameraOff: rp.is_camera_off ?? ep?.isCameraOff ?? false,
            isSpeaking: rp.is_speaking ?? ep?.isSpeaking ?? false,
            stream: ep?.stream ?? undefined,
            socketId: ep?.socketId ?? rp.socketId,
          };
        }));
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
    return () => {
      reset();
    };
  }, [meetingId]);

  // Set local stream on video and socket
  useEffect(() => {
    if (stream) {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  // Sync initial camera/mic state to all participants on connect + stream ready
  useEffect(() => {
    if (isConnected && stream) {
      socketToggleCamera(isCameraOff);
      socketToggleMic(isMuted);
    }
  }, [isConnected, stream]);

  // Listen for meeting end redirect
  useEffect(() => {
    const cleanup = onRedirect((url) => navigate(url));
    return cleanup;
  }, [onRedirect, navigate]);

  // Handlers
  const handleToggleMic = () => {
    const newMuted = !isMuted;
    toggleMic();
    socketToggleMic(newMuted);
  };

  const handleToggleCam = () => {
    const newCameraOff = !isCameraOff;
    toggleCam();
    socketToggleCamera(newCameraOff);
  };

  const handleScreenShare = async () => {
    const screenStream = await startScreenShare();
    if (screenStream) {
      toggleScreenShare();
    }
  };

  const handleStartMeeting = () => startMeeting();

  const handleEndMeeting = () => {
    endMeeting((data) => setEndedData(data));
  };

  const handleLeave = async () => {
    if (meetingId) await meetingService.leaveMeeting(meetingId).catch(() => {});
    navigate(-1);
  };

  const handleToggleSidebar = (tab: 'participants' | 'chat') => {
    setSidebarTab(sidebarTab === tab ? null : tab);
    if (tab === 'chat') resetUnread();
  };

  // Combine local + remote participants for display
  const allParticipants = [
    {
      id: 'local',
      meeting_id: meetingId ?? '',
      user_id: userId,
      full_name: user?.full_name ?? 'You',
      avatar_url: user?.avatar_url ?? '',
      email: user?.email ?? '',
      role: isHost ? 'host' as const : 'participant' as const,
      joined_at: new Date().toISOString(),
      isMuted,
      isCameraOff,
      isSpeaking: activeSpeakerId === userId,
      stream: stream ?? undefined,
    },
    ...participants.filter((p) => p.user_id !== userId),
  ];

  const gridCols = allParticipants.length === 1 ? 'grid-cols-1' :
    allParticipants.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  // ── Meeting Ended Screen ──
  if (endedData) {
    const content = endedData.transcript?.content;
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
          <div className="bg-[#111827] border border-white/8 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#F8FAFC] mb-1">Meeting Ended</h2>
            <p className="text-[#94A3B8] text-sm mb-6">Summary is being generated...</p>

            {content && (
              <div className="text-left mb-6">
                <p className="text-xs font-semibold text-[#94A3B8] mb-2 uppercase tracking-wider">Transcript</p>
                <div className="bg-[#0d1117] border border-white/6 rounded-xl p-4 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-[#CBD5E1] whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate(`/meetings/${meetingId}/summary`)}
              className="w-full py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm transition-colors"
            >
              View Summary
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Loading ──
  if (loading && !meeting) {
    return (
      <div className="h-screen bg-[#080c14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  // ── Main Room ──
  return (
    <div className="h-screen bg-[#080c14] flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/6 bg-[#0d1117]/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
          <div>
            <h1 className="text-sm font-semibold text-[#F8FAFC] leading-none">{meeting?.title ?? 'Meeting'}</h1>
            {meeting?.sprint_name && <p className="text-[11px] text-[#475569] mt-0.5">{meeting.sprint_name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Recording indicator */}
          {recording && recording.status === 'processing' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <motion.div className="w-1.5 h-1.5 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
              <span className="text-[11px] text-red-400 font-medium">REC</span>
            </div>
          )}

          {meeting?.status && <MeetingStatusBadge status={meeting.status} />}

          {/* Timer */}
          <MeetingTimer startedAt={meeting?.started_at} />

          {/* AI placeholder */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
            <svg className="w-3 h-3 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="text-[11px] text-[#8B5CF6] font-medium">AI Notes</span>
          </div>

          {mediaError && (
            <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="text-[11px] text-amber-400">{mediaError}</span>
            </div>
          )}

          {socketError && (
            <div className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="text-[11px] text-red-400">{socketError}</span>
            </div>
          )}

          {/* Connection */}
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-500'}`} />
            <span className="text-[11px] text-[#475569]">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Participant Grid ── */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className={`grid ${gridCols} gap-3 h-full`}>
            <AnimatePresence>
              {allParticipants.map((p) => (
                <ParticipantCard
                  key={p.user_id}
                  participant={p}
                  isActive={activeSpeakerId === p.user_id}
                  videoRef={p.user_id === userId ? localVideoRef : undefined}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <AnimatePresence>
          {sidebarTab && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="border-l border-white/6 bg-[#0d1117] flex flex-col overflow-hidden flex-shrink-0"
            >
              <div className="flex border-b border-white/6">
                {(['participants', 'chat'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setSidebarTab(tab); if (tab === 'chat') resetUnread(); }}
                    className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors relative ${
                      sidebarTab === tab ? 'text-[#3B82F6]' : 'text-[#475569] hover:text-[#94A3B8]'
                    }`}
                  >
                    {tab}
                    {tab === 'chat' && unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#3B82F6] text-white text-[9px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                    {sidebarTab === tab && (
                      <motion.div layoutId="sidebar-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3B82F6]" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-hidden">
                {sidebarTab === 'participants' && (
                  <ParticipantsList participants={allParticipants} currentUserId={userId} />
                )}
                {sidebarTab === 'chat' && (
                  <MeetingChat
                    messages={chats}
                    currentUserId={userId}
                    onSend={sendChat}
                    onOpen={resetUnread}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex justify-center pb-6 pt-3 flex-shrink-0">
        <MeetingToolbar
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
          isHost={isHost}
          meetingStatus={meeting?.status ?? 'scheduled'}
          unreadCount={unreadCount}
          sidebarTab={sidebarTab}
          isConnected={isConnected}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCam}
          onToggleScreen={handleScreenShare}
          onToggleParticipants={() => handleToggleSidebar('participants')}
          onToggleChat={() => handleToggleSidebar('chat')}
          onStartMeeting={handleStartMeeting}
          onEndMeeting={handleEndMeeting}
          onLeave={handleLeave}
        />
      </div>
    </div>
  );
}
