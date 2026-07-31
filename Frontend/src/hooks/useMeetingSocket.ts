import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMeetingStore } from '../store/meetingStore';
import type { Participant, ChatMessage, Recording, Meeting, Transcript } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

export function useMeetingSocket(meetingId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef  = useRef<MediaStream | null>(null);

  const {
    addParticipant, removeParticipant, updateParticipant,
    addChat, setMeeting, setRecording, incrementUnread, sidebarTab,
  } = useMeetingStore();

  const getOrCreatePeer = useCallback((socketId: string, isInitiator: boolean) => {
    if (peerConnections.current.has(socketId)) return peerConnections.current.get(socketId)!;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('webrtc:candidate', { targetSocketId: socketId, candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      updateParticipant(socketId, { stream: e.streams[0] });
    };

    if (isInitiator) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        socketRef.current?.emit('webrtc:offer', { meetingId, targetSocketId: socketId, offer });
      });
    }

    peerConnections.current.set(socketId, pc);
    return pc;
  }, [meetingId, updateParticipant]);

  useEffect(() => {
    if (!meetingId) return;
    const token = localStorage.getItem('access_token');
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('meeting:join', { meetingId });

    socket.on('participant:joined', (p: Participant & { socketId: string }) => {
      addParticipant({ ...p, isMuted: false, isCameraOff: false });
      getOrCreatePeer(p.socketId, true);
    });

    socket.on('participant:left', ({ userId }: { userId: string }) => {
      removeParticipant(userId);
    });

    socket.on('chat:receive', (msg: ChatMessage) => {
      addChat(msg);
      if (sidebarTab !== 'chat') incrementUnread();
    });

    socket.on('meeting:started', ({ meeting }: { meeting: Meeting }) => {
      setMeeting(meeting);
    });

    socket.on('recording:start', ({ recordingId }: { recordingId: string }) => {
      setRecording({ id: recordingId, meeting_id: meetingId, status: 'processing', started_at: new Date().toISOString() });
    });

    socket.on('webrtc:offer', async ({ fromSocketId, offer }: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
      const pc = getOrCreatePeer(fromSocketId, false);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { targetSocketId: fromSocketId, answer });
    });

    socket.on('webrtc:answer', async ({ fromSocketId, answer }: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) await pc.setRemoteDescription(answer);
    });

    socket.on('webrtc:candidate', async ({ fromSocketId, candidate }: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) await pc.addIceCandidate(candidate);
    });

    return () => {
      socket.emit('meeting:leave', { meetingId });
      socket.disconnect();
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
    };
  }, [meetingId]);

  const sendChat = useCallback((message: string) => {
    socketRef.current?.emit('chat:send', { meetingId, message });
  }, [meetingId]);

  const startMeeting = useCallback(() => {
    socketRef.current?.emit('meeting:start', { meetingId });
  }, [meetingId]);

  const endMeeting = useCallback((onEnd: (data: { meeting: Meeting; recording: Recording; transcript: Transcript }) => void) => {
    socketRef.current?.once('meeting:ended', onEnd);
    socketRef.current?.emit('meeting:end', { meetingId });
  }, [meetingId]);

  const setLocalStream = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
  }, []);

  const leaveMeeting = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('meeting:leave', { meetingId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
  }, [meetingId]);

  return { socket: socketRef.current, sendChat, startMeeting, endMeeting, leaveMeeting, setLocalStream };
}
