import { create } from 'zustand';
import type { Meeting, Participant, ChatMessage, Recording } from '../types';

interface MeetingState {
  meeting: Meeting | null;
  participants: Participant[];
  chats: ChatMessage[];
  recording: Recording | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  activeSpeakerId: string | null;
  sidebarTab: 'participants' | 'chat' | 'notes' | null;
  unreadCount: number;

  setMeeting: (m: Meeting) => void;
  setParticipants: (p: Participant[]) => void;
  addParticipant: (p: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, patch: Partial<Participant>) => void;
  addChat: (c: ChatMessage) => void;
  setChats: (c: ChatMessage[]) => void;
  setRecording: (r: Recording) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  setActiveSpeaker: (id: string | null) => void;
  setSidebarTab: (tab: MeetingState['sidebarTab']) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
  reset: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  meeting: null,
  participants: [],
  chats: [],
  recording: null,
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  activeSpeakerId: null,
  sidebarTab: null,
  unreadCount: 0,

  setMeeting:        (meeting)    => set({ meeting }),
  setParticipants:   (participants) => set((s) => ({
    participants: participants.map(p => {
      const existing = s.participants.find(x => x.user_id === p.user_id);
      return existing ? { ...existing, ...p, stream: p.stream ?? existing.stream } : p;
    }),
  })),
  addParticipant:    (p)          => set((s) => {
    const existing = s.participants.find(x => x.user_id === p.user_id);
    if (existing) {
      return { participants: s.participants.map(x => x.user_id === p.user_id ? { ...existing, ...p, stream: p.stream ?? existing.stream } : x) };
    }
    return { participants: [...s.participants, p] };
  }),
  removeParticipant: (userId)     => set((s) => ({ participants: s.participants.filter(p => p.user_id !== userId) })),
  updateParticipant: (userId, patch) => set((s) => ({
    participants: s.participants.map(p => p.user_id === userId ? { ...p, ...patch } : p),
  })),
  addChat:           (c)          => set((s) => ({ chats: [...s.chats, c] })),
  setChats:          (chats)      => set({ chats }),
  setRecording:      (recording)  => set({ recording }),
  toggleMute:        ()           => set((s) => ({ isMuted: !s.isMuted })),
  toggleCamera:      ()           => set((s) => ({ isCameraOff: !s.isCameraOff })),
  toggleScreenShare: ()           => set((s) => ({ isScreenSharing: !s.isScreenSharing })),
  setActiveSpeaker:  (id)         => set({ activeSpeakerId: id }),
  setSidebarTab:     (tab)        => set({ sidebarTab: tab }),
  incrementUnread:   ()           => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  resetUnread:       ()           => set({ unreadCount: 0 }),
  reset:             ()           => set({
    meeting: null, participants: [], chats: [], recording: null,
    isMuted: false, isCameraOff: false, isScreenSharing: false,
    activeSpeakerId: null, sidebarTab: null, unreadCount: 0,
  }),
}));
