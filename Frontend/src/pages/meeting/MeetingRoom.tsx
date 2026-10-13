import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
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

function RemoteAudioPlayer({ stream }: { stream?: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const audioTracks = stream ? stream.getAudioTracks().filter(t => t.readyState === 'live') : [];
    if (audioTracks.length > 0) {
      const curTrackId = (el.srcObject as MediaStream)?.getAudioTracks()[0]?.id;
      const newTrackId = audioTracks[0]?.id;
      if (curTrackId !== newTrackId) {
        const audioStream = new MediaStream(audioTracks);
        el.srcObject = audioStream;
        el.muted = false;
        el.volume = 1.0;
        const p = el.play();
        if (p !== undefined) {
          p.catch(() => {
            const resume = () => {
              el.play().catch(() => {});
              window.removeEventListener('click', resume);
              window.removeEventListener('keydown', resume);
              window.removeEventListener('touchstart', resume);
            };
            window.addEventListener('click', resume, { once: true });
            window.addEventListener('keydown', resume, { once: true });
            window.addEventListener('touchstart', resume, { once: true });
          });
        }
      }
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline />;
}

export default function MeetingRoom() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);

  const {
    meeting, participants, chats, transcriptSegments, liveCaption, isMuted, isCameraOff, isScreenSharing,
    screenShareStream,
    activeSpeakerId, sidebarTab, unreadCount,
    setMeeting, setParticipants, setChats,
    toggleMute, toggleCamera, setScreenShare,
    setSidebarTab, resetUnread, reset,
  } = useMeetingStore();

  const { stream, stopMedia, toggleMic, toggleCamera: toggleCam, startScreenShare, stopScreenShare } = useMediaDevices();
  const {
    sendChat, startMeeting, endMeeting, onMeetingEnded, onRedirect, onForceLeave,
    leaveMeeting: leaveSocket, setLocalStream, toggleMic: socketToggleMic,
    toggleCamera: socketToggleCamera, isConnected, sttStatus, sendAudioChunk,
    screenShareStart, screenShareStop, addScreenShareTrack, removeScreenShareTrack,
  } = useMeetingSocket(id);

  // Audio capture: send chunks to server for STT when meeting is active
  const isMeetingActive = meeting?.status === 'active';
  useAudioCapture({
    stream,
    enabled: isMeetingActive && !isMuted,
    onAudioChunk: sendAudioChunk,
    chunkIntervalMs: 250,
  });

  const [isEnding, setIsEnding] = useState(false);
  const [endedData, setEndedData] = useState<EndMeetingData | null>(null);

  const token = localStorage.getItem('access_token') ?? '';
  const payload = parseJwt(token);
  const userId = payload.id ?? payload.sub ?? '';
  const isHost = meeting?.host_id === userId;

  // Any participant shows the ended screen when the host ends the meeting.
  useEffect(() => {
    const cleanup = onMeetingEnded((data) => {
      setEndedData(data);
      if (id) {
        navigate(`/meetings/${id}/summary`, { replace: true });
      }
    });
    return cleanup;
  }, [onMeetingEnded, id, navigate]);

  // Handle redirect emitted by server after meeting ends
  useEffect(() => {
    const cleanup = onRedirect((url) => {
      stopMedia();
      navigate(url);
    });
    return cleanup;
  }, [onRedirect, navigate, stopMedia]);

  // Force leave fallback when host ends meeting
  useEffect(() => {
    const cleanup = onForceLeave(() => {
      stopMedia();
      if (id) {
        navigate(`/meetings/${id}/summary`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    });
    return cleanup;
  }, [onForceLeave, navigate, stopMedia, id]);

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

  // Sync initial camera/mic state to all participants on connect + stream ready
  useEffect(() => {
    if (isConnected && stream) {
      socketToggleCamera(isCameraOff);
      socketToggleMic(isMuted);
    }
  }, [isConnected, stream]);

  // Determine the active screen share stream (local or remote) - must be before the effect below
  const remoteScreenSharer = participants.find(p => p.isScreenSharing && p.user_id !== userId);
  const activeScreenShareStream = isScreenSharing
    ? screenShareStream
    : (remoteScreenSharer?.screenStream ?? null);
  const activeScreenShareUserId = isScreenSharing ? userId : remoteScreenSharer?.user_id ?? null;

  const handleScreenShareVideoRef = useCallback((el: HTMLVideoElement | null) => {
    screenShareVideoRef.current = el;
    if (el && activeScreenShareStream) {
      if (el.srcObject !== activeScreenShareStream) {
        el.srcObject = activeScreenShareStream;
      }
      el.play().catch(() => {});
    }
  }, [activeScreenShareStream]);

  // Bind screen share stream to video element (local or remote)
  useEffect(() => {
    const el = screenShareVideoRef.current;
    if (el && activeScreenShareStream) {
      if (el.srcObject !== activeScreenShareStream) {
        el.srcObject = activeScreenShareStream;
      }
      el.play().catch(() => {});
    }
  }, [activeScreenShareStream]);

  const handleToggleMic = () => {
    const nextMuted = !isMuted;
    toggleMic();
    toggleMute();
    socketToggleMic(nextMuted);
  };
  const handleToggleCam = () => {
    const nextCamOff = !isCameraOff;
    toggleCam();
    toggleCamera();
    socketToggleCamera(nextCamOff);
  };

  const handleScreenShare = async () => {
    console.log('[screen-share] handleScreenShare called, isScreenSharing=', isScreenSharing);
    if (isScreenSharing) {
      console.log('[screen-share] stopping screen share');
      removeScreenShareTrack();
      screenShareStop();
      setScreenShare(false);
      stopScreenShare();
      return;
    }

    const screenStream = await startScreenShare();
    console.log('[screen-share] startScreenShare returned:', screenStream ? `stream id=${screenStream.id?.slice(0, 8)}, tracks=${screenStream.getTracks().length}` : 'null');
    if (!screenStream) return;

    const screenTrack = screenStream.getVideoTracks()[0];
    console.log('[screen-share] screenTrack:', screenTrack ? `id=${screenTrack.id?.slice(0, 8)}, kind=${screenTrack.kind}, enabled=${screenTrack.enabled}, readyState=${screenTrack.readyState}` : 'null');
    if (!screenTrack) return;

    console.log('[screen-share] calling addScreenShareTrack');
    addScreenShareTrack(screenTrack);
    console.log('[screen-share] calling screenShareStart');
    screenShareStart();
    console.log('[screen-share] calling setScreenShare(true)');
    setScreenShare(true, screenStream, userId);

    screenTrack.onended = () => {
      console.log('[screen-share] screenTrack.onended fired');
      removeScreenShareTrack();
      screenShareStop();
      setScreenShare(false);
    };
  };

  const handleStartMeeting = () => startMeeting();

  const handleEndMeeting = () => {
    if (isEnding) return;
    setIsEnding(true);
    endMeeting((data) => {
      setEndedData(data);
      if (id) {
        navigate(`/meetings/${id}/summary`, { replace: true });
      }
    });
  };

  const handleLeave = () => {
    if (isScreenSharing) {
      removeScreenShareTrack();
      screenShareStop();
    }
    stopScreenShare();
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
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
          <div className="bg-[var(--app-surface-card)] border border-[var(--app-border)] rounded-2xl p-8 text-center shadow-xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500 dark:text-emerald-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--app-text-primary)]">Meeting Ended</h2>
              <p className="text-[var(--app-text-muted)] text-xs mt-1">
                Transcript saved. Your processed transcript will be ready in a few minutes.
              </p>
            </div>

            {/* Transcript preview */}
            <div className="text-left">
              <p className="text-xs font-mono font-semibold text-[var(--app-text-muted)] mb-2 uppercase tracking-wider">Meeting Transcript</p>
              <div className="bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-xl p-4 max-h-48 overflow-y-auto">
                <pre className="text-xs text-[var(--app-text-secondary)] whitespace-pre-wrap font-sans leading-relaxed">
                  {endedData.transcript?.content || 'Raw dialogue captured and sent to preprocessing pipeline.'}
                </pre>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(`/meetings/${id}/summary`)}
                className="flex-1 py-3 rounded-xl bg-[var(--app-text-primary)] text-[var(--app-bg)] font-semibold text-xs transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
              >
                View Meeting Summary & Transcript
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="py-3 px-4 rounded-xl bg-[var(--app-surface-hover)] border border-[var(--app-border)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] font-semibold text-xs transition-colors cursor-pointer"
              >
                Dashboard
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main Room ──────────────────────────────────────────────────────────────
  // Deduplicate remote participants by user_id to ensure each peer is only rendered once
  const remoteParticipants = Array.from(
    new Map(
      participants
        .filter((p) => p.user_id && p.user_id !== userId)
        .map((p) => [p.user_id, p])
    ).values()
  );

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
    ...remoteParticipants,
  ];

  const gridCols = allParticipants.length === 1 ? 'grid-cols-1' :
                   allParticipants.length <= 4  ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="h-screen bg-[var(--app-bg)] flex flex-col overflow-hidden text-[var(--app-text-secondary)] transition-colors duration-200">
      {/* Remote audio elements: continuous playback regardless of video element mounting */}
      {remoteParticipants.map((p) => (
        <RemoteAudioPlayer key={`remote-audio-${p.user_id}`} stream={p.stream} />
      ))}
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--app-border)] bg-[var(--app-surface-card)]/90 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h1 className="text-xs md:text-sm font-semibold text-[var(--app-text-primary)] leading-none">
              {meeting?.title ?? 'Meeting Room'}
            </h1>
            {meeting?.sprint_name && (
              <p className="text-[10px] text-[var(--app-text-muted)] font-mono mt-0.5">{meeting.sprint_name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Timer */}
          <MeetingTimer startedAt={meeting?.started_at} />

          {/* AI / STT status indicator */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
            sttStatus === 'active'
              ? 'bg-purple-500/10 border-purple-500/20'
              : sttStatus === 'finalizing'
              ? 'bg-amber-500/10 border-amber-500/20'
              : sttStatus === 'completed'
              ? 'bg-green-500/10 border-green-500/20'
              : sttStatus === 'failed'
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-[var(--app-surface-subtle)] border-[var(--app-border)]'
          }`}>
            <svg
              className={`w-3 h-3 ${
                sttStatus === 'active' ? 'text-purple-500 animate-pulse' :
                sttStatus === 'finalizing' ? 'text-amber-500 animate-pulse' :
                sttStatus === 'completed' ? 'text-green-500' :
                sttStatus === 'failed' ? 'text-red-500' :
                'text-[var(--app-text-muted)]'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className={`text-[10px] font-mono font-semibold uppercase ${
              sttStatus === 'active' ? 'text-purple-600 dark:text-purple-400' :
              sttStatus === 'finalizing' ? 'text-amber-600 dark:text-amber-400' :
              sttStatus === 'completed' ? 'text-green-600 dark:text-green-400' :
              sttStatus === 'failed' ? 'text-red-600 dark:text-red-400' :
              'text-[var(--app-text-secondary)]'
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
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-[var(--app-text-muted)]">Connected</span>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] hover:bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Participant Grid ── */}
        <div className="flex-1 p-4 overflow-y-auto relative">
          {/* ── Screen Share Display ── */}
          {activeScreenShareStream && (
            <div className="mb-3 rounded-xl overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface-card)] relative shadow-md">
              <div className="px-3 py-1.5 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  {activeScreenShareUserId === userId ? 'You are sharing your screen' : `${participants.find(p => p.user_id === activeScreenShareUserId)?.full_name ?? 'Participant'} is sharing their screen`}
                </span>
              </div>
              <video
                ref={handleScreenShareVideoRef}
                autoPlay
                playsInline
                muted={activeScreenShareUserId === userId}
                className="w-full max-h-[50vh] object-contain bg-black"
              />
            </div>
          )}

          {/* Remote audio playback for all remote participants */}
          {remoteParticipants.map((p) => (
            <RemoteAudioPlayer key={`remote-audio-${p.user_id}`} stream={p.stream} />
          ))}

          <div className={`grid ${gridCols} gap-3 h-full`}>
            <AnimatePresence>
              {allParticipants.map((p) => (
                <ParticipantCard
                  key={p.user_id || p.id}
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
                className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[80%] px-4 py-2.5 rounded-xl bg-[var(--app-surface-card)]/95 backdrop-blur-md border border-[var(--app-border)] shadow-xl"
              >
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mr-2">
                  {liveCaption.speakerName}:
                </span>
                <span className="text-sm text-[var(--app-text-primary)] font-medium">
                  {liveCaption.text}
                  <span className="inline-block w-0.5 h-4 bg-purple-500 ml-1 animate-pulse align-middle" />
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
              className="border-l border-[var(--app-border)] bg-[var(--app-surface-card)] flex flex-col overflow-hidden flex-shrink-0"
            >
              {/* Sidebar tabs */}
              <div className="flex border-b border-[var(--app-border)]">
                {(['participants', 'chat', 'transcript'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setSidebarTab(tab);
                      if (tab === 'chat') resetUnread();
                    }}
                    className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors relative cursor-pointer ${
                      sidebarTab === tab
                        ? 'text-[var(--app-text-primary)]'
                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'
                    }`}
                  >
                    {tab}
                    {tab === 'chat' && unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--app-text-primary)] text-[var(--app-bg)] text-[9px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                    {sidebarTab === tab && (
                      <motion.div
                        layoutId="sidebar-tab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--app-text-primary)]"
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
          isEnding={isEnding}
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
