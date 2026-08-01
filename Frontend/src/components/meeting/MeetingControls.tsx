import { motion } from 'framer-motion';

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: number;
}

function ControlButton({ icon, label, onClick, active, danger, badge }: ControlButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      title={label}
      className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-150 cursor-pointer ${
        danger
          ? 'bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20'
          : active
          ? 'bg-[#1c1c21] text-[#f4f4f5] border border-[#27272a]'
          : 'bg-[#141417] hover:bg-[#18181b] text-[#a1a1aa] hover:text-[#f4f4f5] border border-[#27272a]'
      }`}
    >
      <span className="w-4.5 h-4.5">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#f4f4f5] text-[#09090b] text-[9px] font-bold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </motion.button>
  );
}

interface MeetingControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  unreadCount: number;
  sidebarOpen: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onRaiseHand: () => void;
  onLeave: () => void;
}

export default function MeetingControls({
  isMuted, isCameraOff, isScreenSharing, unreadCount, sidebarOpen,
  onToggleMic, onToggleCamera, onToggleScreenShare,
  onToggleChat, onToggleParticipants, onRaiseHand, onLeave,
}: MeetingControlsProps) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0c0c0e]/95 backdrop-blur-xl border border-[#27272a] shadow-2xl"
    >
      <ControlButton
        icon={
          isMuted
            ? <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v3M8 23h8"/></svg>
            : <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 23h8"/></svg>
        }
        label={isMuted ? 'Unmute' : 'Mute'}
        onClick={onToggleMic}
        active={!isMuted}
      />

      <ControlButton
        icon={
          isCameraOff
            ? <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            : <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3z"/></svg>
        }
        label={isCameraOff ? 'Start Video' : 'Stop Video'}
        onClick={onToggleCamera}
        active={!isCameraOff}
      />

      <ControlButton
        icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
        label={isScreenSharing ? 'Stop Share' : 'Share'}
        onClick={onToggleScreenShare}
        active={isScreenSharing}
      />

      <div className="w-px h-8 bg-white/8 mx-1" />

      <ControlButton
        icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
        label="People"
        onClick={onToggleParticipants}
        active={sidebarOpen}
      />

      <ControlButton
        icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
        label="Chat"
        onClick={onToggleChat}
        active={sidebarOpen}
        badge={unreadCount}
      />

      <ControlButton
        icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"/></svg>}
        label="Raise Hand"
        onClick={onRaiseHand}
      />

      <div className="w-px h-8 bg-white/8 mx-1" />

      <ControlButton
        icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>}
        label="Leave"
        onClick={onLeave}
        danger
      />
    </motion.div>
  );
}