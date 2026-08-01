import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMeetingStore } from '../store/meetingStore';
import { ensureFreshAccessToken } from '../services/api';
import type { Participant, ChatMessage, Recording, Meeting, Transcript } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const log = (...args: any[]) => console.log('[wss]', ...args);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errLog = (...args: any[]) => console.error('[wss]', ...args);

export function useMeetingSocket(meetingId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef  = useRef<MediaStream | null>(null);
  const socketToUser    = useRef<Map<string, string>>(new Map());

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
      const userId = socketToUser.current.get(socketId);
      log(`ontrack from ${socketId.slice(-5)}: tracks=${e.track.kind}, streams=${e.streams.length}`);
      if (!userId) { errLog(`ontrack: no userId mapping for ${socketId.slice(-5)}`); return; }
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      updateParticipant(userId, { stream });
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
    let disposed = false;

    const connect = async () => {
      let token = localStorage.getItem('access_token') ?? '';
      try {
        token = (await ensureFreshAccessToken()) ?? token;
      } catch { /* keep existing token */ }

      if (disposed) return;

      log(`connecting to ${SOCKET_URL} (meeting=${meetingId?.slice(0, 8)})`);
      const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        log(`socket connected id=${socket.id} -> emitting meeting:join`);
        socket.emit('meeting:join', { meetingId });
      });

      socket.on('disconnect', (reason) => {
        log(`socket disconnected: ${reason}`);
      });

      socket.on('connect_error', async (e) => {
        errLog('connect_error', e?.message ?? e);
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

      socket.on('participant:joined', (p: { userId: string; name: string; avatar?: string; socketId: string }) => {
        log(`participant:joined ${p.name} socket=${p.socketId.slice(-5)} -> create peer (initiator)`);
        socketToUser.current.set(p.socketId, p.userId);
        const participant: Participant = {
          id: p.userId,
          meeting_id: meetingId,
          user_id: p.userId,
          full_name: p.name ?? 'Participant',
          avatar_url: p.avatar ?? undefined,
          email: '',
          role: 'participant',
          joined_at: new Date().toISOString(),
          socketId: p.socketId,
          isMuted: false,
          isCameraOff: false,
        };
        addParticipant(participant);
        getOrCreatePeer(p.socketId, true);
      });

      socket.on('meeting:participants', ({ participants }: { participants: Array<{ userId: string; name: string; avatar?: string; socketId: string }> }) => {
        log(`meeting:participants received: ${participants.length} (self=${socket.id?.slice(-5)})`);
        participants.forEach((p) => {
          if (p.socketId === socket.id) return;
          log(`  roster: ${p.name} socket=${p.socketId.slice(-5)} -> create peer (non-initiator)`);
          socketToUser.current.set(p.socketId, p.userId);
          const participant: Participant = {
            id: p.userId,
            meeting_id: meetingId,
            user_id: p.userId,
            full_name: p.name ?? 'Participant',
            avatar_url: p.avatar ?? undefined,
            email: '',
            role: 'participant',
            joined_at: new Date().toISOString(),
            socketId: p.socketId,
            isMuted: false,
            isCameraOff: false,
          };
          addParticipant(participant);
          getOrCreatePeer(p.socketId, false);
        });
      });

      socket.on('participant:left', ({ userId, socketId }: { userId: string; socketId?: string }) => {
        log(`participant:left userId=${userId.slice(0, 8)} socket=${socketId?.slice(-5)}`);
        if (socketId) {
          socketToUser.current.delete(socketId);
          peerConnections.current.get(socketId)?.close();
          peerConnections.current.delete(socketId);
          negotiationFlags.current.delete(socketId);
          pendingCandidates.current.delete(socketId);
        }
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

      socket.on('meeting:ended', ({ meeting }: { meeting: Meeting }) => {
        log('meeting:ended');
        setMeeting(meeting);
      });

      socket.on('recording:start', ({ recordingId }: { recordingId: string }) => {
        setRecording({ id: recordingId, meeting_id: meetingId, status: 'processing', started_at: new Date().toISOString() });
      });

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
    };
  }, [meetingId, addParticipant, removeParticipant, updateParticipant, addChat, setMeeting, setRecording, incrementUnread, getOrCreatePeer, flushPendingCandidates]);

  const sendChat = useCallback((message: string) => {
    log('chat:send', message);
    socketRef.current?.emit('chat:send', { meetingId, message });
  }, [meetingId]);

  const startMeeting = useCallback(() => {
    log('meeting:start');
    socketRef.current?.emit('meeting:start', { meetingId });
  }, [meetingId]);

  const endMeeting = useCallback((onEnd: (data: { meeting: Meeting; recording: Recording; transcript: Transcript }) => void) => {
    socketRef.current?.once('meeting:ended', onEnd);
    socketRef.current?.emit('meeting:end', { meetingId });
  }, [meetingId]);

  const setLocalStream = useCallback((stream: MediaStream) => {
    log(`setLocalStream: ${stream.getTracks().length} tracks, ${peerConnections.current.size} peers`);
    localStreamRef.current = stream;
    peerConnections.current.forEach((pc) => addTracksToPeer(pc));
  }, [addTracksToPeer]);

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

  return { socket: socketRef.current, sendChat, startMeeting, endMeeting, leaveMeeting, setLocalStream };
}
