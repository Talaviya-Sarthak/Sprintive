import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMeetingStore } from '../store/meetingStore';
import type { Participant, ChatMessage, Meeting } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

export function useMeetingSocket(meetingId: string | undefined) {
  const [socketError, setSocketError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef  = useRef<MediaStream | null>(null);
  const endCallbacks = useRef<Map<string, (data: any) => void>>(new Map());
  const redirectCallbacks = useRef<Map<string, (url: string) => void>>(new Map());
  const socketUserMap = useRef<Map<string, string>>(new Map());
  const pendingStreams = useRef<Map<string, MediaStream>>(new Map());
  const joinedRef = useRef(false);

  const {
    addParticipant, removeParticipant, updateParticipant,
    addChat, setMeeting, setRecording, incrementUnread, sidebarTab,
  } = useMeetingStore();

  const getOrCreatePeer = useCallback((socketId: string, isInitiator: boolean) => {
    if (peerConnections.current.has(socketId)) {
      return peerConnections.current.get(socketId)!;
    }

    const hasStream = !!localStreamRef.current;
    console.log(`[DIAG] getOrCreatePeer socket=${socketId} init=${isInitiator} hasStream=${hasStream}`);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    let negotiating = false;

    const localStream = localStreamRef.current;

    if (localStream) {
      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
        console.log(`[DIAG] addTrack kind=${track.kind} id=${track.id}`);
      }
    } else {
      for (const kind of ['video', 'audio'] as const) {
        pc.addTransceiver(kind, { direction: 'sendrecv' });
        console.log(`[DIAG] addTransceiver kind=${kind} (placeholder)`);
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('webrtc:candidate', { targetSocketId: socketId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[DIAG] connectionState ${pc.connectionState} for socket=${socketId}`);
    };

    pc.onnegotiationneeded = async () => {
      if (!isInitiator) return;
      if (negotiating) return;
      negotiating = true;
      try {
        if (pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log(`[DIAG] offer created for socket=${socketId}`);
        socketRef.current?.emit('webrtc:offer', { meetingId, targetSocketId: socketId, offer: pc.localDescription });
      } catch (err) {
        console.error('Negotiation error:', err);
      }
      finally { negotiating = false; }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      const videoTracks = stream?.getVideoTracks().length ?? 0;
      const audioTracks = stream?.getAudioTracks().length ?? 0;
      const uidFromMap = socketUserMap.current.get(socketId);
      console.log(`[DIAG] ontrack socket=${socketId} kind=${e.track?.kind} streamId=${stream?.id} vTracks=${videoTracks} aTracks=${audioTracks} uidFromMap=${uidFromMap}`);
      let uid = uidFromMap;
      if (!uid) {
        const p = useMeetingStore.getState().participants.find(p => p.socketId === socketId);
        if (p) uid = p.user_id;
        console.log(`[DIAG] ontrack — fallback store lookup uid=${uid}`);
      }
      const storeParticipants = useMeetingStore.getState().participants.map(p => ({ uid: p.user_id, name: p.full_name, hasStream: !!p.stream }));
      console.log(`[DIAG] ontrack — store participants:`, JSON.stringify(storeParticipants));
      if (uid) {
        updateParticipant(uid, { stream });
        console.log(`[DIAG] ontrack — updateParticipant called for uid=${uid}`);
      } else {
        pendingStreams.current.set(socketId, stream);
        console.log(`[DIAG] ontrack — queued pending stream for socket=${socketId}`);
      }
    };

    peerConnections.current.set(socketId, pc);

    return pc;
  }, [meetingId, updateParticipant]);

  useEffect(() => {
    if (!meetingId) return;
    const token = localStorage.getItem('access_token');
    setSocketError(null);
    joinedRef.current = false;

    const socket = io(SOCKET_URL, {
      auth: (cb: (auth: { token: string | null }) => void) => cb({ token: localStorage.getItem('access_token') }),
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setSocketError(null);
      socket.emit('meeting:join', { meetingId });
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
      if (err.message === 'Authentication required' || err.message === 'Invalid token') {
        setSocketError('Socket authentication failed. Try refreshing the page.');
      } else {
        setSocketError('Connection error: ' + err.message);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('error', ({ message }: { message: string }) => {
      setSocketError(message);
    });

    socket.on('meeting:joined', (data: { meetingId: string; socketId: string; participants: Participant[]; meeting?: Meeting }) => {
      console.log(`[DIAG] meeting:joined socketId=${data.socketId} participants=${data.participants.length}`);
      if (data.meeting) setMeeting(data.meeting);
      for (const p of data.participants) {
        if (p.socketId) {
          socketUserMap.current.set(p.socketId, p.user_id);
          const ps = pendingStreams.current.get(p.socketId);
          if (ps) {
            updateParticipant(p.user_id, { stream: ps });
            pendingStreams.current.delete(p.socketId);
          }
        }
        addParticipant({ ...p, isMuted: p.isMuted ?? false, isCameraOff: p.isCameraOff ?? false, isSpeaking: p.isSpeaking ?? false });
      }
    });

    socket.on('participant:joined', (p: Participant & { socketId: string }) => {
      console.log(`[DIAG] participant:joined userId=${p.user_id} socketId=${p.socketId}`);
      socketUserMap.current.set(p.socketId, p.user_id);

      const ps = pendingStreams.current.get(p.socketId);
      if (ps) {
        updateParticipant(p.user_id, { stream: ps });
        pendingStreams.current.delete(p.socketId);
      }

      addParticipant({ ...p, isMuted: false, isCameraOff: false, isSpeaking: false });

      if (!peerConnections.current.has(p.socketId)) {
        getOrCreatePeer(p.socketId, true);
      }
    });

    socket.on('participant:left', ({ userId, socketId }: { userId: string; socketId?: string }) => {
      const toRemove: string[] = [];
      if (socketId) toRemove.push(socketId);
      peerConnections.current.forEach((_pc, sid) => {
        const p = useMeetingStore.getState().participants.find(p => p.user_id === userId);
        if (p?.socketId === sid || p?.user_id === userId) toRemove.push(sid);
      });
      toRemove.forEach((sid) => {
        peerConnections.current.get(sid)?.close();
        peerConnections.current.delete(sid);
        socketUserMap.current.delete(sid);
        pendingStreams.current.delete(sid);
      });
      removeParticipant(userId);
    });

    socket.on('chat:receive', (msg: ChatMessage) => {
      addChat(msg);
      if (sidebarTab !== 'chat') incrementUnread();
    });

    socket.on('meeting:started', ({ meeting }: { meeting: Meeting }) => {
      setMeeting(meeting);
    });

    socket.on('meeting:ended', (data) => {
      setMeeting(data.meeting);
      endCallbacks.current.forEach((cb) => cb(data));
    });

    socket.on('meeting:redirect', ({ url }: { url: string }) => {
      redirectCallbacks.current.forEach((cb) => cb(url));
    });

    socket.on('camera-state-changed', ({ userId, cameraOff }: { userId: string; cameraOff: boolean }) => {
      updateParticipant(userId, { isCameraOff: cameraOff });
    });

    socket.on('microphone-state-changed', ({ userId, muted }: { userId: string; muted: boolean }) => {
      updateParticipant(userId, { isMuted: muted });
    });

    socket.on('recording:start', ({ recordingId }: { recordingId: string }) => {
      setRecording({ id: recordingId, meeting_id: meetingId, status: 'processing', started_at: new Date().toISOString() });
    });

    socket.on('webrtc:offer', async ({ fromSocketId, offer }: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
      console.log(`[DIAG] webrtc:offer from ${fromSocketId}`);
      const pc = getOrCreatePeer(fromSocketId, false);

      console.log(`[DIAG] before setRemote sigState=${pc.signalingState} senders=${pc.getSenders().length}`);
      if (pc.signalingState !== 'stable') {
        await pc.setLocalDescription({ type: 'rollback' });
        console.log(`[DIAG] rollback done sigState=${pc.signalingState}`);
      }

      await pc.setRemoteDescription(offer);
      console.log(`[DIAG] setRemote done sigState=${pc.signalingState}`);

      const answer = await pc.createAnswer();
      console.log(`[DIAG] createAnswer done`);

      await pc.setLocalDescription(answer);
      console.log(`[DIAG] setLocal answer done sigState=${pc.signalingState}`);

      socket.emit('webrtc:answer', { targetSocketId: fromSocketId, answer });
    });

    socket.on('webrtc:answer', async ({ fromSocketId, answer }: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      console.log(`[DIAG] webrtc:answer from ${fromSocketId}`);
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) {
        await pc.setRemoteDescription(answer);
        console.log(`[DIAG] setRemote answer done sigState=${pc.signalingState} connState=${pc.connectionState}`);
      }
    });

    socket.on('webrtc:candidate', async ({ fromSocketId, candidate }: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(fromSocketId);
      if (pc) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          if ((err as Error).name !== 'InvalidStateError') {
            console.error('ICE candidate error:', (err as Error).message);
          }
        }
      }
    });

    return () => {
      socket.emit('meeting:leave', { meetingId });
      socket.disconnect();
      peerConnections.current.forEach((pc) => { pc.close(); });
      peerConnections.current.clear();
      pendingStreams.current.clear();
      endCallbacks.current.clear();
      redirectCallbacks.current.clear();
    };
  }, [meetingId]);

  const sendChat = useCallback((message: string) => {
    socketRef.current?.emit('chat:send', { meetingId, message });
  }, [meetingId]);

  const startMeeting = useCallback(() => {
    if (!isConnected) { setSocketError('Not connected to server. Cannot start meeting.'); return; }
    socketRef.current?.emit('meeting:start', { meetingId });
  }, [meetingId, isConnected]);

  const endMeeting = useCallback((onEnd: (data: any) => void) => {
    if (!isConnected) { setSocketError('Not connected to server. Cannot end meeting.'); return; }
    const id = Date.now().toString();
    endCallbacks.current.set(id, onEnd);
    socketRef.current?.emit('meeting:end', { meetingId });
    setTimeout(() => endCallbacks.current.delete(id), 10000);
  }, [meetingId, isConnected]);

  const onRedirect = useCallback((cb: (url: string) => void) => {
    const id = Date.now().toString();
    redirectCallbacks.current.set(id, cb);
    return () => { redirectCallbacks.current.delete(id); };
  }, []);

  const toggleCamera = useCallback((cameraOff: boolean) => {
    socketRef.current?.emit('toggle-camera', { meetingId, cameraOff });
  }, [meetingId]);

  const toggleMic = useCallback((muted: boolean) => {
    socketRef.current?.emit('toggle-mic', { meetingId, muted });
  }, [meetingId]);

  const raiseHand = useCallback(() => {
    socketRef.current?.emit('raise-hand', { meetingId });
  }, [meetingId]);

  const screenShareStart = useCallback(() => {
    socketRef.current?.emit('screen-share-start', { meetingId });
  }, [meetingId]);

  const screenShareStop = useCallback(() => {
    socketRef.current?.emit('screen-share-stop', { meetingId });
  }, [meetingId]);

  const setLocalStream = useCallback((stream: MediaStream) => {
    console.log(`[DIAG] setLocalStream called streamId=${stream.id} pcCount=${peerConnections.current.size}`);
    localStreamRef.current = stream;
    const tracks = stream.getTracks();
    const trackMap = new Map(tracks.map(t => [t.kind, t]));

    peerConnections.current.forEach((pc, socketId) => {
      // replaceTrack on existing senders (no renegotiation needed)
      pc.getSenders().forEach(sender => {
        if (trackMap.has(sender.track?.kind)) {
          console.log(`[DIAG] replaceTrack sender kind=${sender.track?.kind} for socket=${socketId}`);
          sender.replaceTrack(trackMap.get(sender.track!.kind)!);
          trackMap.delete(sender.track!.kind);
        }
      });

      // Activate senders that were created without a track (stream wasn't ready)
      pc.getTransceivers().forEach(t => {
        const kind = t.receiver?.track?.kind;
        if (kind && trackMap.has(kind)) {
          console.log(`[DIAG] replaceTrack transceiver kind=${kind} for socket=${socketId}`);
          t.sender.replaceTrack(trackMap.get(kind)!);
          trackMap.delete(kind);
        }
      });
    });
  }, []);

  return {
    socket: socketRef.current, isConnected, socketError,
    sendChat, startMeeting, endMeeting, onRedirect,
    toggleCamera, toggleMic, raiseHand, screenShareStart, screenShareStop, setLocalStream,
  };
}
