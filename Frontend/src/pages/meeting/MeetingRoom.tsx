import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingSocket } from '../../hooks/useMeetingSocket';
import { useMediaDevices }  from '../../hooks/useMediaDevices';
import { useMeetingStore }  from '../../store/meetingStore';
import { meetingService }   from '../../services/meeting.service';
import ParticipantCard      from '../../components/meeting/ParticipantCard';
import MeetingChat          from '../../components/meeting/MeetingChat';
import ParticipantsList     from '../../components/meeting/ParticipantsList';
import MeetingToolbar       from '../../components/meeting/MeetingToolbar';
import MeetingTimer         from '../../components/meeting/MeetingTimer';
import type { Meeting, Recording, Transcript } from '../../types';

// Decode JWT payload (no verify — just for display)
function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return {}; }
}

export default function MeetingRoom() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const {
    meeting, participants, chats, recording, isMuted, isCameraOff, isScreenSharing,
    activeSpeakerId, sidebarTab, unreadCount,
    setMeeting, setParticipants, setChats,
    toggleMute, toggleCamera, toggleScreenShare,
    setSidebarTab, resetUnread, reset,
  } = useMeetingStore();

  const { stream, toggleMic, toggleCamera: toggleCam, startScreenShare } = useMediaDevices();
  const { sendChat, startMeeting, endMeeting, setLocalStream } = useMeetingSocket(id);

  const [endedData, setEndedData] = useState<{ meeting: Meeting; recording: Recording; transcript: Transcript } | null>(null);

  const token   = localStorage.getItem('access_token') ?? '';
  const payload = parseJwt(token);
  const userId  = payload.id ?? payload.sub ?? '';
  const isHost  = meeting?.host_id === userId;

  useEffect(() => {
    if (!id) return;
    meetingService.getMeeting(id).then(setMeeting);
    meetingService.getChats(id).then(setChats);
    meetingService.getParticipants?.(id)?.then(setParticipants).catch(() => {});
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

  const handleLeave = async () => {
    if (id) await meetingService.leaveMeeting?.(id).catch(() => {});
    navigate(-1);
  };

  const handleToggleSidebar = (tab: 'participants' | 'chat') => {
    setSidebarTab(sidebarTab === tab ? null : tab);
    if (tab === 'chat') resetUnread();
  };

  // ── Meeting Ended Modal ────────────────────────────────────────────────────
  if (endedData) {
    const dur = endedData.recording?.duration;
    const fmt = dur ? `${Math.floor(dur / 60)}m ${dur % 60}s` : 'N/A';
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
          <div className="bg-[#111827] border border-white/8 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <h2 className="text-xl font-bold text-[#F8FAFC] mb-1">Meeting Ended</h2>
            <p className="text-[#94A3B8] text-sm mb-6">Recording saved successfully</p>

            <div className="space-y-3 mb-6 text-left">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0d1117] border border-white/6">
                <span className="text-xs text-[#475569]">Duration</span>
                <span className="text-sm font-medium text-[#F8FAFC]">{fmt}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0d1117] border border-white/6">
                <span className="text-xs text-[#475569]">Status</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-400 font-semibold">Saved to R2</span>
              </div>
              {endedData.recording?.recording_url && (
                <div className="p-3 rounded-xl bg-[#0d1117] border border-white/6">
                  <p className="text-xs text-[#475569] mb-1">Recording URL</p>
                  <p className="text-xs text-[#3B82F6] break-all">{endedData.recording.recording_url}</p>
                </div>
              )}
            </div>

            {/* Transcript preview */}
            <div className="text-left mb-6">
              <p className="text-xs font-semibold text-[#94A3B8] mb-2 uppercase tracking-wider">Meeting Transcript</p>
              <div className="bg-[#0d1117] border border-white/6 rounded-xl p-4 max-h-48 overflow-y-auto">
                <pre className="text-xs text-[#CBD5E1] whitespace-pre-wrap font-sans leading-relaxed">
                  {endedData.transcript?.content}
                </pre>
              </div>
            </div>

            <button onClick={() => navigate(-1)} className="w-full py-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm transition-colors">
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
    },
    ...participants.filter((p) => p.user_id !== userId),
  ];

  const gridCols = allParticipants.length === 1 ? 'grid-cols-1' :
                   allParticipants.length <= 4  ? 'grid-cols-2' : 'grid-cols-3';

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

          {/* Timer */}
          <MeetingTimer startedAt={meeting?.started_at} />

          {/* AI placeholder */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
            <svg className="w-3 h-3 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            <span className="text-[11px] text-[#8B5CF6] font-medium">AI Notes</span>
          </div>

          {/* Connection */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[11px] text-[#475569]">Connected</span>
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
              {/* Sidebar tabs */}
              <div className="flex border-b border-white/6">
                {(['participants', 'chat', 'notes'] as const).map((tab) => (
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
                {sidebarTab === 'notes' && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                    </div>
                    <p className="text-sm font-semibold text-[#F8FAFC]">AI Live Notes</p>
                    <p className="text-xs text-[#475569]">AI-generated notes will appear here during the meeting.</p>
                    <span className="px-3 py-1 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-xs">Coming Soon</span>
                  </div>
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
