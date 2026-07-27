import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMeetingMockData } from '../../hooks/useMeetingMockData';
import MeetingSidebar from '../../components/meeting/MeetingSidebar';
import MeetingControls from '../../components/meeting/MeetingControls';
import { MeetingStatusBadge } from '../../components/ui/Badge';
import type { Meeting, MeetingParticipant } from '../../types';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function ParticipantVideoTile({ participant, isLocal }: { participant: MeetingParticipant; isLocal?: boolean }) {
  const initials = getInitials(participant.full_name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative rounded-2xl overflow-hidden bg-[#0d1117] border transition-all duration-300 aspect-video ${
        participant.is_speaking ? 'border-[#3B82F6] shadow-[0_0_0_2px_rgba(59,130,246,0.4)]' : 'border-white/8'
      }`}
    >
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1f2e] to-[#0d1117]">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl bg-gradient-to-br from-[#3B82F6] to-[#06B6D4]">
          {initials}
        </div>
      </div>

      {participant.is_speaking && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-[#3B82F6] pointer-events-none"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <span className="text-white text-xs font-medium truncate max-w-[120px]">
          {participant.full_name}{isLocal ? ' (you)' : ''}
        </span>
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${participant.is_muted ? 'bg-red-500/20' : 'bg-white/10'}`}>
            {participant.is_muted
              ? <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" /></svg>
              : <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /></svg>
            }
          </div>
          {participant.role === 'host' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] font-semibold">Host</span>
          )}
          {participant.is_speaking && (
            <div className="flex items-end gap-0.5 h-4">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-[#3B82F6] rounded-full"
                  animate={{ height: ['4px', '16px', '4px'] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function MeetingRoomPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { getMeeting, getParticipants, getChatMessages } = useMeetingMockData();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'participants' | 'chat'>('participants');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const chatMessages = getChatMessages(meetingId ?? '');

  useEffect(() => {
    if (!meetingId) return;
    const m = getMeeting(meetingId);
    setMeeting(m);
    setParticipants(getParticipants(meetingId));
  }, [meetingId]);

  useEffect(() => {
    if (!meeting?.started_at) return;
    const base = Date.now() - new Date(meeting.started_at).getTime();
    setElapsed(Math.floor(base / 1000));
    const id = setInterval(() => setElapsed(v => v + 1), 1000);
    return () => clearInterval(id);
  }, [meeting?.started_at]);

  const fmtTime = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  const toggleSidebar = (tab: 'participants' | 'chat') => {
    if (sidebarOpen && sidebarTab === tab) {
      setSidebarOpen(false);
    } else {
      setSidebarTab(tab);
      setSidebarOpen(true);
    }
  };

  const gridCols = participants.length <= 1 ? 'grid-cols-1' :
    participants.length <= 2 ? 'grid-cols-2' :
    participants.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  if (!meeting) {
    return (
      <div className="h-screen bg-[#080c14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#080c14] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/6 bg-[#0d1117]/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
          <div>
            <h1 className="text-sm font-semibold text-[#F8FAFC] leading-none">{meeting.title}</h1>
            {meeting.sprint_name && <p className="text-[11px] text-[#475569] mt-0.5">{meeting.sprint_name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MeetingStatusBadge status={meeting.status} />
          <span className="font-mono text-sm text-[#94A3B8] tabular-nums">
            {h > 0 ? `${fmtTime(h)}:` : ''}{fmtTime(m)}:{fmtTime(s)}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-[11px] text-[#475569]">Connected</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className={`grid ${gridCols} gap-3 h-full`}>
            {participants.map((p, i) => (
              <ParticipantVideoTile
                key={p.id}
                participant={p}
                isLocal={i === 0}
              />
            ))}
          </div>
        </div>

        <MeetingSidebar
          open={sidebarOpen}
          tab={sidebarTab}
          onTabChange={setSidebarTab}
          participants={participants}
          chatMessages={chatMessages}
          currentUserId="u1"
        />
      </div>

      <div className="flex justify-center pb-6 pt-3 flex-shrink-0">
        <MeetingControls
          isMuted={muted}
          isCameraOff={cameraOff}
          isScreenSharing={screenSharing}
          unreadCount={0}
          sidebarOpen={sidebarOpen}
          onToggleMic={() => setMuted(v => !v)}
          onToggleCamera={() => setCameraOff(v => !v)}
          onToggleScreenShare={() => setScreenSharing(v => !v)}
          onToggleChat={() => toggleSidebar('chat')}
          onToggleParticipants={() => toggleSidebar('participants')}
          onRaiseHand={() => {}}
          onLeave={() => navigate(meeting.status === 'ended'
            ? `/meetings/${meeting.id}/summary`
            : `/meetings/${meeting.id}`
          )}
        />
      </div>
    </div>
  );
}