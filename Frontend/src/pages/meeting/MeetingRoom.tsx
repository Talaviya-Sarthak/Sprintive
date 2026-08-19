import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingSocket } from '../../hooks/useMeetingSocket';
import { useMediaDevices }  from '../../hooks/useMediaDevices';
import { useAudioCapture }  from '../../hooks/useAudioCapture';
import { useMeetingStore }  from '../../store/meetingStore';
import { meetingService }   from '../../services/meeting.service';
import ParticipantCard      from '../../components/meeting/ParticipantCard';
import MeetingChat          from '../../components/meeting/MeetingChat';
import ParticipantsList     from '../../components/meeting/ParticipantsList';
import MeetingToolbar       from '../../components/meeting/MeetingToolbar';
import MeetingTimer         from '../../components/meeting/MeetingTimer';
import TranscriptPanel      from '../../components/meeting/TranscriptPanel';
import type { EndMeetingData } from '../../types';

// Decode JWT payload (no verify — just for display)
function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return {}; }
}

export default function MeetingRoom() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const {
    meeting, participants, chats, transcriptSegments, liveCaption, isMuted, isCameraOff, isScreenSharing,
    activeSpeakerId, sidebarTab, unreadCount,
    setMeeting, setParticipants, setChats,
    toggleMute, toggleCamera, toggleScreenShare,
    setSidebarTab, resetUnread, reset,
  } = useMeetingStore();

  const { stream, stopMedia, toggleMic, toggleCamera: toggleCam, startScreenShare } = useMediaDevices();
  const { sendChat, startMeeting, endMeeting, onMeetingEnded, onForceLeave, leaveMeeting: leaveSocket, setLocalStream, sttStatus, sendAudioChunk } = useMeetingSocket(id);

  // Audio capture: send chunks to server for STT when meeting is active
  const isMeetingActive = meeting?.status === 'active';
  useAudioCapture({
    stream,
    enabled: isMeetingActive && !isMuted,
    onAudioChunk: sendAudioChunk,
    chunkIntervalMs: 250,
  });

  const [endedData, setEndedData] = useState<EndMeetingData | null>(null);

  const token = localStorage.getItem('access_token') ?? '';
  const payload = parseJwt(token);
  const userId = payload.id ?? payload.sub ?? '';
  const isHost = meeting?.host_id === userId;

  // Any participant shows the ended screen when the host ends the meeting.
  useEffect(() => {
    const cleanup = onMeetingEnded((data) => setEndedData(data));
    return cleanup;
  }, [onMeetingEnded]);

  // Force leave when host ends meeting — disconnect immediately
  useEffect(() => {
    const cleanup = onForceLeave(() => {
      stopMedia();
      navigate('/dashboard');
    });
    return cleanup;
  }, [onForceLeave, navigate, stopMedia]);

  useEffect(() => {
    if (!id) return;
    meetingService.joinMeeting(id).then((res) => {
      setMeeting(res.meeting);
      setParticipants(res.participants ?? []);
    }).catch(() => {
      meetingService.getMeeting(id).then(setMeeting).catch(() => {});
    });
    meetingService.getChats(id).then(setChats).catch(() => {});
    return () => reset();
  }, [id]);

  useEffect(() => {
    if (stream) {
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleToggleMic = () => { toggleMic(); toggleMute(); };
  const handleToggleCam = () => { toggleCam(); toggleCamera(); };

  const handleScreenShare = async () => {
    const screenStream = await startScreenShare();
    if (screenStream) toggleScreenShare();
  };

  const handleStartMeeting = () => startMeeting();

  const handleEndMeeting = () => {
    endMeeting((data) => setEndedData(data));
  };

  const handleLeave = () => {
    stopMedia();
    leaveSocket();
    if (id) meetingService.leaveMeeting?.(id).catch(() => {});
    navigate('/dashboard');
  };

  const handleToggleSidebar = (tab: 'participants' | 'chat' | 'transcript') => {
    setSidebarTab(sidebarTab === tab ? null : tab);
    if (tab === 'chat') resetUnread();
  };

  // ── Meeting Ended Modal ────────────────────────────────────────────────────
  if (endedData) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
          <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-8 text-center shadow-xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#f4f4f5]">Meeting Ended</h2>
              <p className="text-[#a1a1aa] text-xs mt-1">Transcript saved to Supabase</p>
            </div>

            {/* Transcript preview */}
            <div className="text-left">
              <p className="text-xs font-mono font-semibold text-[#71717a] mb-2 uppercase tracking-wider">Meeting Transcript</p>
              <div className="bg-[#1c1c21] border border-[#27272a] rounded-xl p-4 max-h-48 overflow-y-auto">
                <pre className="text-xs text-[#a1a1aa] whitespace-pre-wrap font-sans leading-relaxed">
                  {endedData.transcript?.content}
                </pre>
              </div>
            </div>

            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 rounded-xl bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#09090b] font-semibold text-xs transition-colors cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main Room ──────────────────────────────────────────────────────────────
  const allParticipants = [
    // Local user as first participant
    {
      id: 'local',
      meeting_id: id ?? '',
      user_id: userId,
      full_name: payload.full_name ?? 'You',
      avatar_url: payload.avatar_url,
      email: payload.email ?? '',
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
                   allParticipants.length <= 4  ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="h-screen bg-[#09090b] flex flex-col overflow-hidden text-[#a1a1aa]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#27272a] bg-[#0c0c0e]/95 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#f4f4f5] animate-pulse" />
          <div>
            <h1 className="text-xs md:text-sm font-semibold text-[#f4f4f5] leading-none">
              {meeting?.title ?? 'Meeting Room'}
            </h1>
            {meeting?.sprint_name && (
              <p className="text-[10px] text-[#71717a] font-mono mt-0.5">{meeting.sprint_name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <MeetingTimer startedAt={meeting?.started_at} />

          {/* AI / STT status indicator */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
            sttStatus === 'active'
              ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/20'
              : sttStatus === 'finalizing'
              ? 'bg-amber-500/10 border-amber-500/20'
              : sttStatus === 'completed'
              ? 'bg-green-500/10 border-green-500/20'
              : sttStatus === 'failed'
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-[#1c1c21] border-[#27272a]'
          }`}>
            <svg
              className={`w-3 h-3 ${
                sttStatus === 'active' ? 'text-[#8B5CF6] animate-pulse' :
                sttStatus === 'finalizing' ? 'text-amber-400 animate-pulse' :
                sttStatus === 'completed' ? 'text-green-400' :
                sttStatus === 'failed' ? 'text-red-400' :
                'text-[#f4f4f5]'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className={`text-[10px] font-mono font-semibold uppercase ${
              sttStatus === 'active' ? 'text-[#8B5CF6]' :
              sttStatus === 'finalizing' ? 'text-amber-400' :
              sttStatus === 'completed' ? 'text-green-400' :
              sttStatus === 'failed' ? 'text-red-400' :
              'text-[#f4f4f5]'
            }`}>
              {sttStatus === 'active' && 'STT Active'}
              {sttStatus === 'finalizing' && 'Finalizing...'}
              {sttStatus === 'completed' && 'Transcript Ready'}
              {sttStatus === 'failed' && 'STT Failed'}
              {sttStatus === 'not_started' && 'AI Active'}
            </span>
          </div>

          {/* Connection status */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-[#71717a]">Connected</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Participant Grid ── */}
        <div className="flex-1 p-4 overflow-y-auto relative">
          <div className={`grid ${gridCols} gap-3 h-full`}>
            <AnimatePresence>
              {allParticipants.map((p) => (
                <ParticipantCard
                  key={p.id}
                  participant={p}
                  isActive={activeSpeakerId === p.user_id}
                  videoRef={p.user_id === userId ? localVideoRef : undefined}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* ── Live Caption Overlay ── */}
          <AnimatePresence>
            {liveCaption && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[80%] px-4 py-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 shadow-xl"
              >
                <span className="text-[10px] font-bold text-[#8B5CF6] mr-2">
                  {liveCaption.speakerName}:
                </span>
                <span className="text-sm text-white/90 font-medium">
                  {liveCaption.text}
                  <span className="inline-block w-0.5 h-4 bg-[#8B5CF6] ml-1 animate-pulse align-middle" />
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Sidebar ── */}
        <AnimatePresence>
          {sidebarTab && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="border-l border-[#27272a] bg-[#0c0c0e] flex flex-col overflow-hidden flex-shrink-0"
            >
              {/* Sidebar tabs */}
              <div className="flex border-b border-[#27272a]">
                {(['participants', 'chat', 'transcript'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setSidebarTab(tab);
                      if (tab === 'chat') resetUnread();
                    }}
                    className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors relative cursor-pointer ${
                      sidebarTab === tab
                        ? 'text-[#f4f4f5]'
                        : 'text-[#71717a] hover:text-[#a1a1aa]'
                    }`}
                  >
                    {tab}
                    {tab === 'chat' && unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#f4f4f5] text-[#09090b] text-[9px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                    {sidebarTab === tab && (
                      <motion.div
                        layoutId="sidebar-tab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f4f4f5]"
                      />
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
                {sidebarTab === 'transcript' && (
                  <TranscriptPanel sttStatus={sttStatus} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex justify-center pb-5 pt-2 flex-shrink-0">
        <MeetingToolbar
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
          isHost={isHost}
          meetingStatus={meeting?.status ?? 'scheduled'}
          unreadCount={unreadCount}
          sidebarTab={sidebarTab}
          isConnected={true}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCam}
          onToggleScreen={handleScreenShare}
          onToggleParticipants={() => handleToggleSidebar('participants')}
          onToggleChat={() => handleToggleSidebar('chat')}
          onToggleTranscript={() => handleToggleSidebar('transcript')}
          onStartMeeting={handleStartMeeting}
          onEndMeeting={handleEndMeeting}
          onLeave={handleLeave}
        />
      </div>
    </div>
  );
}
