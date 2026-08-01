import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMeetingStore } from '../store/meetingStore';
import { ensureFreshAccessToken } from '../services/api';
import type { Participant, ChatMessage, Meeting } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const log = (...args: any[]) => console.log('[wss]', ...args);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errLog = (...args: any[]) => console.error('[wss]', ...args);

// Normalize a participant payload coming from either signaling shape:
//   HEAD:  { id, meeting_id, user_id, full_name, avatar_url, email, role, joined_at, socketId, isMuted, isCameraOff, isSpeaking }
//   UI/UX: { userId, name, avatar, socketId }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toParticipant(raw: any, meetingId: string | undefined, defaultSocketId?: string): Participant {
  const socketId = raw.socketId ?? defaultSocketId ?? '';
  return {
    id: raw.id ?? raw.userId ?? socketId,
    meeting_id: raw.meeting_id ?? meetingId ?? '',
    user_id: raw.user_id ?? raw.userId ?? '',
    full_name: raw.full_name ?? raw.name ?? 'Participant',
    avatar_url: raw.avatar_url ?? raw.avatar ?? undefined,
    email: raw.email ?? '',
    role: raw.role ?? 'participant',
    joined_at: raw.joined_at ?? new Date().toISOString(),
    socketId,
    isMuted: raw.isMuted ?? false,
    isCameraOff: raw.isCameraOff ?? false,
    isSpeaking: raw.isSpeaking ?? false,
  };
}

export function useMeetingSocket(meetingId: string | undefined) {
  const [socketError, setSocketError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef  = useRef<MediaStream | null>(null);

  const endCallbacks = useRef<Map<string, (data: any) => void>>(new Map());
  const redirectCallbacks = useRef<Map<string, (url: string) => void>>(new Map());
  const socketToUser = useRef<Map<string, string>>(new Map());
  const pendingStreams = useRef<Map<string, MediaStream>>(new Map());

  const {
    addParticipant, removeParticipant, updateParticipant,
    addChat, setMeeting, setRecording, incrementUnread,
  } = useMeetingStore();

  const negotiationFlags = useRef<Map<string, { isInitiator: boolean; makingOffer: boolean; settingAnswer: boolean; negotiated: boolean }>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const flushPendingCandidates = useCallback(async (socketId: string, pc: RTCPeerConnection) => {
    const pending = pendingCandidates.current.get(socketId);
    if (!pending?.length) return;
    pendingCandidates.current.set(socketId, []);
    log(`flush candidates: ${pending.length} to ${socketId.slice(-5)} (state=${pc.signalingState})`);
    for (const candidate of pending) {
      try { await pc.addIceCandidate(candidate); } catch (e) { errLog('flush candidate add failed', e); }
    }
  }, []);

  const addTracksToPeer = useCallback((pc: RTCPeerConnection) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getTracks();
    let added = 0;
    tracks.forEach((t) => {
      if (!pc.getSenders().some((s) => s.track === t)) { pc.addTrack(t, stream); added++; }
    });
    log(`addTracksToPeer: stream has ${tracks.length} tracks, added ${added} (senders=${pc.getSenders().length})`);
  }, []);

  const getOrCreatePeer = useCallback((socketId: string, isInitiator: boolean) => {
    if (peerConnections.current.has(socketId)) {
      log(`getOrCreatePeer: reuse existing peer for ${socketId.slice(-5)}`);
      return peerConnections.current.get(socketId)!;
    }

    log(`getOrCreatePeer: NEW peer for ${socketId.slice(-5)} initiator=${isInitiator}`);
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    const flags = { isInitiator, makingOffer: false, settingAnswer: false, negotiated: isInitiator };
    negotiationFlags.current.set(socketId, flags);

    addTracksToPeer(pc);

    const makeOffer = async () => {
      if (flags.makingOffer || flags.settingAnswer) { log(`makeOffer skipped (making=${flags.makingOffer} settingAns=${flags.settingAnswer}) ${socketId.slice(-5)}`); return; }
      if (pc.signalingState !== 'stable') { log(`makeOffer skipped (state=${pc.signalingState}) ${socketId.slice(-5)}`); return; }
      // Non-initiator must NOT offer until its first offer/answer exchange completes —
      // otherwise addTrack's negotiationneeded races with the peer's initial offer.
      if (!flags.isInitiator && !flags.negotiated) {
        log(`makeOffer SKIPPED (non-initiator, not yet negotiated) ${socketId.slice(-5)}`);
        return;
      }
      flags.makingOffer = true;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        log(`makeOffer SENT offer for ${socketId.slice(-5)} (state=${pc.signalingState}) tracks=${pc.getSenders().length}`);
        socketRef.current?.emit('webrtc:offer', { meetingId, targetSocketId: socketId, offer });
      } catch (e) { errLog('makeOffer failed', e); } finally {
        flags.makingOffer = false;
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        log(`local ICE candidate sent to ${socketId.slice(-5)}: ${e.candidate.type} ${e.candidate.candidate?.slice(0, 30)}`);
        socketRef.current?.emit('webrtc:candidate', { targetSocketId: socketId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      log(`ontrack from ${socketId.slice(-5)}: tracks=${e.track.kind}, streams=${e.streams.length}`);
      let uid = socketToUser.current.get(socketId);
      if (!uid) {
        const p = useMeetingStore.getState().participants.find(x => x.socketId === socketId);
        if (p) uid = p.user_id;
      }
      if (uid) {
        updateParticipant(uid, { stream });
      } else {
        pendingStreams.current.set(socketId, stream);
      }
    };

    pc.onnegotiationneeded = () => { log(`negotiationneeded for ${socketId.slice(-5)} (state=${pc.signalingState})`); makeOffer(); };

    pc.onsignalingstatechange = () => { log(`signalingstatechange ${socketId.slice(-5)}: ${pc.signalingState}`); };

    pc.oniceconnectionstatechange = () => { log(`ICE state ${socketId.slice(-5)}: ${pc.iceConnectionState}`); };

    pc.onconnectionstatechange = () => { log(`connection state ${socketId.slice(-5)}: ${pc.connectionState}`); };

    if (isInitiator) makeOffer();

    peerConnections.current.set(socketId, pc);

    return pc;
  }, [meetingId, updateParticipant, addTracksToPeer]);

  useEffect(() => {
    if (!meetingId) return;
    setSocketError(null);
    let disposed = false;

    const connect = async () => {
      let token = localStorage.getItem('access_token') ?? '';
      try {
        token = (await ensureFreshAccessToken()) ?? token;
      } catch { /* keep existing token */ }

      if (disposed) return;

      log(`connecting to ${SOCKET_URL} (meeting=${meetingId?.slice(0, 8)})`);
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        setSocketError(null);
        log(`socket connected id=${socket.id} -> emitting meeting:join`);
        socket.emit('meeting:join', { meetingId });
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('connect_error', async (e) => {
        setIsConnected(false);
        errLog('connect_error', e?.message ?? e);
        if (e.message === 'Authentication required' || e.message === 'Invalid token') {
          setSocketError('Socket authentication failed. Try refreshing the page.');
        } else {
          setSocketError('Connection error: ' + e.message);
        }
        try {
          const fresh = await ensureFreshAccessToken();
          if (fresh) {
            log('reconnecting with fresh token');
            socket.auth = { token: fresh };
            socket.disconnect();
            socket.connect();
          }
        } catch { /* no refresh token available */ }
      });

      socket.on('error', ({ message }: { message: string }) => {
        setSocketError(message);
      });

      // ── HEAD shape: meeting:joined (full participant payloads) ──
      socket.on('meeting:joined', (data: { meetingId: string; socketId: string; participants: Participant[]; meeting?: Meeting }) => {
        if (data.meeting) setMeeting(data.meeting);
        for (const raw of data.participants) {
          const p = toParticipant(raw, meetingId, raw.socketId);
          if (p.socketId) {
            socketToUser.current.set(p.socketId, p.user_id);
            const ps = pendingStreams.current.get(p.socketId);
            if (ps) {
              updateParticipant(p.user_id, { stream: ps });
              pendingStreams.current.delete(p.socketId);
            }
          }
          addParticipant(p);
          if (p.socketId && p.socketId !== socket.id && !peerConnections.current.has(p.socketId)) {
            getOrCreatePeer(p.socketId, false);
          }
        }
      });

      // ── UI/UX shape: meeting:participants (roster for WebRTC signaling) ──
      socket.on('meeting:participants', ({ participants }: { participants: Array<{ userId: string; name: string; avatar?: string; socketId: string }> }) => {
        log(`meeting:participants received: ${participants.length} (self=${socket.id?.slice(-5)})`);
        participants.forEach((p) => {
          if (p.socketId === socket.id) return;
          log(`  roster: ${p.name} socket=${p.socketId.slice(-5)} -> create peer (non-initiator)`);
          socketToUser.current.set(p.socketId, p.userId);
          addParticipant(toParticipant(p, meetingId, p.socketId));
          getOrCreatePeer(p.socketId, false);
        });
      });

      // ── participant:joined (both shapes) ──
      socket.on('participant:joined', (p: any) => {
        const participant = toParticipant(p, meetingId, p?.socketId);
        log(`participant:joined ${participant.full_name} socket=${participant.socketId?.slice(-5)} -> create peer (initiator)`);
        if (participant.socketId) {
          socketToUser.current.set(participant.socketId, participant.user_id);
          const ps = pendingStreams.current.get(participant.socketId);
          if (ps) {
            updateParticipant(participant.user_id, { stream: ps });
            pendingStreams.current.delete(participant.socketId);
          }
        }

        addParticipant(participant);

        if (participant.socketId && participant.socketId !== socket.id) {
          getOrCreatePeer(participant.socketId, true);
        }
      });

      socket.on('participant:left', ({ userId, socketId }: { userId: string; socketId?: string }) => {
        log(`participant:left userId=${userId.slice(0, 8)} socket=${socketId?.slice(-5)}`);
        const toRemove: string[] = [];
        if (socketId) toRemove.push(socketId);
        peerConnections.current.forEach((_pc, sid) => {
          const p = useMeetingStore.getState().participants.find(x => x.user_id === userId);
          if (p?.socketId === sid || p?.user_id === userId) toRemove.push(sid);
        });
        toRemove.forEach((sid) => {
          peerConnections.current.get(sid)?.close();
          peerConnections.current.delete(sid);
          socketToUser.current.delete(sid);
          pendingStreams.current.delete(sid);
          negotiationFlags.current.delete(sid);
          pendingCandidates.current.delete(sid);
        });
        removeParticipant(userId);
      });

      socket.on('chat:receive', (msg: ChatMessage) => {
        addChat(msg);
        if (useMeetingStore.getState().sidebarTab !== 'chat') incrementUnread();
      });

      socket.on('meeting:started', ({ meeting }: { meeting: Meeting }) => {
        log('meeting:started');
        setMeeting(meeting);
      });

      socket.on('meeting:ended', (data) => {
        log('meeting:ended');
        if (data?.meeting) setMeeting(data.meeting);
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

      // ── WebRTC signaling (perfect negotiation) ──
      socket.on('webrtc:offer', async ({ fromSocketId, offer }: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
        const pc = getOrCreatePeer(fromSocketId, false);
        const flags = negotiationFlags.current.get(fromSocketId);
        const polite = !flags?.isInitiator; // non-initiator rolls back on collision

        const offerCollision = pc.signalingState !== 'stable';
        if (offerCollision && !polite) {
          log(`OFFER COLLISION from ${fromSocketId.slice(-5)} — impolite side IGNORING (state=${pc.signalingState})`);
          return;
        }

        log(`webrtc:offer from ${fromSocketId.slice(-5)} collision=${offerCollision} polite=${polite} state=${pc.signalingState}`);
        try {
          if (offerCollision) {
            log(`  rolling back own offer (state=${pc.signalingState})`);
            await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
          }
          if (flags) flags.settingAnswer = true;
          await pc.setRemoteDescription(offer);
          if (flags) flags.settingAnswer = false;
          log(`  remote offer set (state=${pc.signalingState})`);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          log(`  SENT answer to ${fromSocketId.slice(-5)} (state=${pc.signalingState})`);
          if (flags) flags.negotiated = true;
          socket.emit('webrtc:answer', { targetSocketId: fromSocketId, answer });
          await flushPendingCandidates(fromSocketId, pc);
        } catch (e) {
          if (flags) flags.settingAnswer = false;
          errLog('webrtc:offer handling failed', e);
        }
      });

      socket.on('webrtc:answer', async ({ fromSocketId, answer }: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
        const pc = peerConnections.current.get(fromSocketId);
        if (!pc) return;
        const flags = negotiationFlags.current.get(fromSocketId);
        if (flags?.settingAnswer) { log(`webrtc:answer from ${fromSocketId.slice(-5)} SKIPPED (mid answer-processing)`); return; }
        // Only apply an answer that matches an outstanding offer; a stale answer
        // (e.g. after a colliding rollback or newer offer) must be ignored.
        if (pc.signalingState !== 'have-local-offer') {
          log(`webrtc:answer from ${fromSocketId.slice(-5)} STALE/DROPPED (state=${pc.signalingState}, expected have-local-offer)`);
          return;
        }
        try {
          await pc.setRemoteDescription(answer);
          log(`webrtc:answer from ${fromSocketId.slice(-5)} applied as remote (state=${pc.signalingState})`);
          if (flags) flags.negotiated = true;
          await flushPendingCandidates(fromSocketId, pc);
        } catch (e) {
          errLog('webrtc:answer handling failed', e);
        }
      });

      socket.on('webrtc:candidate', async ({ fromSocketId, candidate }: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
        const pc = peerConnections.current.get(fromSocketId);
        if (!pc) return;
        if (!pc.remoteDescription) {
          // remote description not set yet (offer still processing) — buffer it
          const pending = pendingCandidates.current.get(fromSocketId) ?? [];
          pending.push(candidate);
          pendingCandidates.current.set(fromSocketId, pending);
          log(`candidate from ${fromSocketId.slice(-5)} BUFFERED (no remote desc yet, total=${pending.length})`);
          return;
        }
        try {
          await pc.addIceCandidate(candidate);
          log(`candidate from ${fromSocketId.slice(-5)} added: ${candidate.candidate?.slice(0, 30)}`);
        } catch (e) { errLog('addIceCandidate failed', e); }
      });
    };

    connect();

    return () => {
      log(`hook cleanup for meeting ${meetingId?.slice(0, 8)}`);
      disposed = true;
      socketRef.current?.emit('meeting:leave', { meetingId });
      socketRef.current?.disconnect();
      socketRef.current = null;
      socketToUser.current.clear();
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      pendingStreams.current.clear();
      pendingCandidates.current.clear();
      negotiationFlags.current.clear();
      endCallbacks.current.clear();
      redirectCallbacks.current.clear();
    };
  }, [meetingId, addParticipant, removeParticipant, updateParticipant, addChat, setMeeting, setRecording, incrementUnread, getOrCreatePeer, flushPendingCandidates]);

  const sendChat = useCallback((message: string) => {
    log('chat:send', message);
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

  const onMeetingEnded = useCallback((cb: (data: any) => void) => {
    // Register a callback fired on 'meeting:ended' WITHOUT emitting — used by
    // non-hosts to upload their recording after the host ends the meeting.
    const id = Date.now().toString();
    endCallbacks.current.set(id, cb);
    return () => { endCallbacks.current.delete(id); };
  }, []);

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
    log(`setLocalStream: ${stream.getTracks().length} tracks, ${peerConnections.current.size} peers`);
    localStreamRef.current = stream;
    const tracks = stream.getTracks();
    const trackMap = new Map(tracks.map((t) => [t.kind, t]));

    peerConnections.current.forEach((pc) => {
      // Add any missing tracks (e.g. peer was created before the stream was ready)
      tracks.forEach((t) => {
        if (!pc.getSenders().some((s) => s.track === t)) pc.addTrack(t, stream);
      });
      // replaceTrack on existing senders (no renegotiation needed)
      pc.getSenders().forEach(sender => {
        const kind = sender.track?.kind;
        if (kind && trackMap.has(kind)) {
          sender.replaceTrack(trackMap.get(kind)!);
          trackMap.delete(kind);
        }
      });

      pc.getTransceivers().forEach(t => {
        const kind = t.receiver?.track?.kind;
        if (kind && trackMap.has(kind)) {
          t.sender.replaceTrack(trackMap.get(kind)!);
          trackMap.delete(kind);
        }
      });
    });
  }, []);

  const leaveMeeting = useCallback(() => {
    log('leaveMeeting');
    if (socketRef.current) {
      socketRef.current.emit('meeting:leave', { meetingId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    socketToUser.current.clear();
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
  }, [meetingId]);

  return {
    isConnected, socketError,
    sendChat, startMeeting, endMeeting, onMeetingEnded, onRedirect, leaveMeeting,
    toggleCamera, toggleMic, raiseHand, screenShareStart, screenShareStop, setLocalStream,
  };
}
