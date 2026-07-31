import { motion } from 'framer-motion';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  badge?: number;
}

function ToolbarButton({ icon, label, onClick, active, danger, disabled, badge }: ToolbarButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? `${label} (Unsupported in current environment)` : label}
      className={`relative flex flex-col items-center gap-1 px-3.5 py-2 rounded-xl transition-all duration-150 ${
        disabled
          ? 'bg-[#141722]/50 text-[#475569] border border-[#232636]/50 cursor-not-allowed opacity-50'
          : danger
          ? 'bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white cursor-pointer'
          : active
          ? 'bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30 cursor-pointer'
          : 'bg-[#141722] hover:bg-[#1C1F2E] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#232636] cursor-pointer'
      }`}
    >
      <span className="w-4.5 h-4.5">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F97316] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </motion.button>
  );
}

interface Props {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  meetingStatus: string;
  unreadCount: number;
  sidebarTab: string | null;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreen: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onStartMeeting: () => void;
  onEndMeeting: () => void;
  onLeave: () => void;
}

export default function MeetingToolbar({
  isMuted,
  isCameraOff,
  isScreenSharing,
  isHost,
  meetingStatus,
  unreadCount,
  sidebarTab,
  onToggleMic,
  onToggleCamera,
  onToggleScreen,
  onToggleParticipants,
  onToggleChat,
  onStartMeeting,
  onEndMeeting,
  onLeave,
}: Props) {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#090A0F]/95 backdrop-blur-xl border border-[#1E202C] shadow-2xl"
    >
      <ToolbarButton
        icon={
          isMuted ? (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
              <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v3M8 23h8" />
            </svg>
          ) : (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 23h8" />
            </svg>
          )
        }
        label={isMuted ? 'Unmute' : 'Mute'}
        onClick={onToggleMic}
        active={!isMuted}
      />

      <ToolbarButton
        icon={
          isCameraOff ? (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3z" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 00-2 2v4a2 2 0 002 2h9a2 2 0 002-2v-4a2 2 0 00-2-2H3z" />
            </svg>
          )
        }
        label={isCameraOff ? 'Start Video' : 'Stop Video'}
        onClick={onToggleCamera}
        active={!isCameraOff}
      />

      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        }
        label={isScreenSharing ? 'Stop Share' : 'Share'}
        onClick={onToggleScreen}
        active={isScreenSharing}
      />

      <div className="w-px h-6 bg-[#1E202C] mx-1" />

      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        }
        label="People"
        onClick={onToggleParticipants}
        active={sidebarTab === 'participants'}
      />

      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        }
        label="Chat"
        onClick={onToggleChat}
        active={sidebarTab === 'chat'}
        badge={unreadCount}
      />

      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="6" fill="currentColor" />
          </svg>
        }
        label="Record"
        onClick={() => {}}
        disabled
      />

      <div className="w-px h-6 bg-[#1E202C] mx-1" />

      {isHost && meetingStatus === 'scheduled' && (
        <ToolbarButton
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          }
          label="Start"
          onClick={onStartMeeting}
          active
        />
      )}

      {isHost && meetingStatus === 'active' && (
        <ToolbarButton
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          }
          label="End"
          onClick={onEndMeeting}
          danger
        />
      )}

      <ToolbarButton
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        }
        label="Leave"
        onClick={onLeave}
        danger
      />
    </motion.div>
  );
}

