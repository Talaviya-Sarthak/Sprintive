import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMeetingStore, type TranscriptSegment, type LiveCaption } from '../store/meetingStore';
import { ensureFreshAccessToken } from '../services/api';
import type { Participant, ChatMessage, Meeting } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

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
  const [sttStatus, setSttStatus] = useState<'not_started' | 'active' | 'finalizing' | 'completed' | 'failed'>('not_started');

  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef  = useRef<MediaStream | null>(null);
  const screenShareTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteVideoTrackCount = useRef<Map<string, number>>(new Map());
  const peerOfferFns = useRef<Map<string, () => void>>(new Map());

  const endCallbacks = useRef<Map<string, (data: any) => void>>(new Map());
  const redirectCallbacks = useRef<Map<string, (url: string) => void>>(new Map());
  const forceLeaveCallbacks = useRef<Map<string, () => void>>(new Map());
  const socketToUser = useRef<Map<string, string>>(new Map());
  const pendingStreams = useRef<Map<string, MediaStream>>(new Map());

  const {
    addParticipant, removeParticipant, updateParticipant,
    addChat, setMeeting, incrementUnread, addTranscriptSegments, setLiveCaption,
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
    // Also add the screen share track if one is currently active
    const ssTrack = screenShareTrackRef.current;
    if (ssTrack && ssTrack.readyState === 'live' && !pc.getSenders().some((s) => s.track === ssTrack)) {
      pc.addTrack(ssTrack, new MediaStream([ssTrack]));
      added++;
    }
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

    if (pc.getTransceivers().length === 0) {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch (err) {
        log(`transceiver creation error: ${err}`);
      }
    }

    addTracksToPeer(pc);

    const makeOffer = async () => {
      log(`makeOffer CALLED for ${socketId.slice(-5)}: state=${pc.signalingState}, making=${flags.makingOffer}, settingAns=${flags.settingAnswer}, isInit=${flags.isInitiator}, negotiated=${flags.negotiated}, senders=${pc.getSenders().length}`);
      if (flags.makingOffer || flags.settingAnswer) { log(`makeOffer SKIPPED (making=${flags.makingOffer} settingAns=${flags.settingAnswer}) ${socketId.slice(-5)}`); return; }
      if (pc.signalingState !== 'stable') { log(`makeOffer SKIPPED (state=${pc.signalingState}) ${socketId.slice(-5)}`); return; }
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
        socketRef.current?.emit('webrtc:candidate', { meetingId, targetSocketId: socketId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const incomingTrack = e.track;
      const isVideo = incomingTrack?.kind === 'video';
      const currentCount = remoteVideoTrackCount.current.get(socketId) ?? 0;
      const newCount = isVideo ? currentCount + 1 : currentCount;
      if (isVideo) remoteVideoTrackCount.current.set(socketId, newCount);

      let uid = socketToUser.current.get(socketId);
      if (!uid) {
        const p = useMeetingStore.getState().participants.find(x => x.socketId === socketId);
        if (p) {
          uid = p.user_id;
          socketToUser.current.set(socketId, uid);
          log(`ontrack: resolved uid from participants store: ${uid?.slice(0, 8)}`);
        }
      } else {
        log(`ontrack: resolved uid from socketToUser: ${uid?.slice(0, 8)}`);
      }

      if (!uid) {
        // Fallback: If there is only one remote participant, map them
        const remotes = useMeetingStore.getState().participants.filter(x => x.socketId && x.socketId !== socketRef.current?.id);
        if (remotes.length === 1) {
          uid = remotes[0].user_id;
          socketToUser.current.set(socketId, uid);
          log(`ontrack: resolved uid as single remote participant: ${uid?.slice(0, 8)}`);
        }
      }

      const participant = uid ? useMeetingStore.getState().participants.find(x => x.user_id === uid) : undefined;
      const isSharer = participant?.isScreenSharing === true;

      const trackLabel = (incomingTrack?.label || '').toLowerCase();
      const hasScreenKeyword = trackLabel.includes('screen') || trackLabel.includes('window');

      // A track is ONLY a screen share track if the remote participant is actively confirmed
      // to be sharing screen via the socket event ('screen-share-state', isSharer === true).
      // NEVER classify any track as screen sharing if the participant is not confirmed sharing.
      const isScreenShareTrack = isVideo && isSharer && (
        hasScreenKeyword ||
        (participant?.stream && participant.stream.id !== e.streams[0]?.id) ||
        (participant?.stream?.getVideoTracks().length ?? 0) > 0
      );

      log(`ontrack from ${socketId.slice(-5)}: kind=${incomingTrack.kind}, label="${incomingTrack.label}", videoCount=${newCount}, isScreen=${isScreenShareTrack}, readyState=${incomingTrack.readyState}`);

      if (uid) {
        if (isScreenShareTrack) {
          const screenStream = e.streams[0] ?? new MediaStream([incomingTrack]);
          log(`ontrack: updating participant ${uid?.slice(0, 8)} with screenStream (stream id=${screenStream.id?.slice(0, 8)}, tracks=${screenStream.getTracks().length})`);
          updateParticipant(uid, { screenStream, isScreenSharing: true });
          incomingTrack.onended = () => {
            log(`remote screen share track ended from ${socketId.slice(-5)}`);
            updateParticipant(uid!, { screenStream: undefined, isScreenSharing: false });
          };
        } else {
          incomingTrack.enabled = true;
          let regularStream = participant?.stream ?? e.streams[0] ?? new MediaStream();
          const existingOfKind = regularStream.getTracks().find(t => t.kind === incomingTrack.kind && t.id !== incomingTrack.id);
          if (existingOfKind) {
            regularStream.removeTrack(existingOfKind);
          }
          if (!regularStream.getTracks().some(t => t.id === incomingTrack.id)) {
            regularStream.addTrack(incomingTrack);
          }
          log(`ontrack: updating participant ${uid?.slice(0, 8)} with regular stream (tracks=${regularStream.getTracks().length}, audio=${regularStream.getAudioTracks().length}, video=${regularStream.getVideoTracks().length})`);
          updateParticipant(uid, { stream: regularStream });
          incomingTrack.onunmute = () => {
            log(`ontrack: incoming ${incomingTrack.kind} track UNMUTED for ${uid?.slice(0, 8)}`);
            updateParticipant(uid, { stream: regularStream });
          };
        }
      } else {
        const existing = pendingStreams.current.get(socketId);
        let pending = existing ?? (e.streams[0] ? new MediaStream(e.streams[0].getTracks()) : new MediaStream());
        const existingOfKind = pending.getTracks().find(t => t.kind === incomingTrack.kind && t.id !== incomingTrack.id);
        if (existingOfKind) {
          pending.removeTrack(existingOfKind);
        }
        if (!pending.getTracks().some(t => t.id === incomingTrack.id)) {
          pending.addTrack(incomingTrack);
        }
        const accumulated = new MediaStream(pending.getTracks());
        log(`ontrack: NO uid found for ${socketId.slice(-5)} — queuing in pendingStreams (tracks=${accumulated.getTracks().length}, audio=${accumulated.getAudioTracks().length}, video=${accumulated.getVideoTracks().length})`);
        pendingStreams.current.set(socketId, accumulated);
      }
    };

    pc.onnegotiationneeded = () => { log(`negotiationneeded for ${socketId.slice(-5)} (state=${pc.signalingState})`); makeOffer(); };

    pc.onsignalingstatechange = () => { log(`signalingstatechange ${socketId.slice(-5)}: ${pc.signalingState}`); };

    pc.oniceconnectionstatechange = () => { log(`ICE state ${socketId.slice(-5)}: ${pc.iceConnectionState}`); };

    pc.onconnectionstatechange = () => { log(`connection state ${socketId.slice(-5)}: ${pc.connectionState}`); };

    if (isInitiator) makeOffer();

    peerConnections.current.set(socketId, pc);
    peerOfferFns.current.set(socketId, makeOffer);

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
          const ps = pendingStreams.current.get(p.socketId);
          if (ps) {
            updateParticipant(p.userId, { stream: ps });
            pendingStreams.current.delete(p.socketId);
          }
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
          remoteVideoTrackCount.current.delete(sid);
          peerOfferFns.current.delete(sid);
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

      socket.on('stt:status', ({ meetingId: mid, status }: { meetingId: string; status: string }) => {
        if (mid === meetingId) {
          log('stt:status', status);
          setSttStatus(status as typeof sttStatus);
        }
      });

      socket.on('stt:segments', ({ meetingId: mid, segments }: { meetingId: string; segments: TranscriptSegment[] }) => {
        if (mid === meetingId && segments?.length) {
          log(`stt:segments received: ${segments.length} segment(s)`);
          addTranscriptSegments(segments);
        }
      });

      socket.on('stt:partial', ({ meetingId: mid, participantId, speakerName, text, start, duration }: {
        meetingId: string; participantId: string; speakerName: string; text: string; start: number; duration: number;
      }) => {
        if (mid === meetingId) {
          setLiveCaption({ participantId, speakerName, text, start });
        }
      });

      socket.on('stt:final', ({ meetingId: mid, participantId, speakerName, text, words, start, end }: {
        meetingId: string; participantId: string; speakerName: string; text: string;
        words?: Array<{ word: string; start: number; end: number; confidence: number }>;
        start: number; end: number;
      }) => {
        if (mid === meetingId) {
          // Clear live caption if it's from the same speaker
          const current = useMeetingStore.getState().liveCaption;
          if (current?.participantId === participantId) {
            setLiveCaption(null);
          }
          // Add finalized segment
          addTranscriptSegments([{
            speakerId: participantId,
            speakerName,
            text,
            start,
            end,
            words,
          }]);
        }
      });

      socket.on('meeting:ended', (data) => {
        log('meeting:ended');
        if (data?.meeting) setMeeting(data.meeting);
        endCallbacks.current.forEach((cb) => cb(data));
      });

      socket.on('meeting:force-leave', () => {
        log('meeting:force-leave — server disconnected room');
        forceLeaveCallbacks.current.forEach((cb) => cb());
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

      socket.on('screen-share-state', ({ userId, sharing }: { userId: string; socketId: string; sharing: boolean }) => {
        log(`screen-share-state: userId=${userId.slice(0, 8)} sharing=${sharing}`);
        updateParticipant(userId, { isScreenSharing: sharing });
        if (!sharing) {
          updateParticipant(userId, { screenStream: undefined });
          const p = useMeetingStore.getState().participants.find(x => x.user_id === userId);
          if (p?.socketId) {
            remoteVideoTrackCount.current.delete(p.socketId);
          }
        }
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
          socket.emit('webrtc:answer', { meetingId, targetSocketId: fromSocketId, answer });
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
      screenShareTrackRef.current?.stop();
      screenShareTrackRef.current = null;
      remoteVideoTrackCount.current.clear();
      peerOfferFns.current.clear();
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
      forceLeaveCallbacks.current.clear();
    };
  }, [meetingId, addParticipant, removeParticipant, updateParticipant, addChat, setMeeting, incrementUnread, addTranscriptSegments, setLiveCaption, getOrCreatePeer, flushPendingCandidates]);

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
    // Register a callback fired on 'meeting:ended' WITHOUT emitting — used to
    // show the ended state in browsers that did not trigger the end themselves.
    const id = Date.now().toString();
    endCallbacks.current.set(id, cb);
    return () => { endCallbacks.current.delete(id); };
  }, []);

  const onRedirect = useCallback((cb: (url: string) => void) => {
    const id = Date.now().toString();
    redirectCallbacks.current.set(id, cb);
    return () => { redirectCallbacks.current.delete(id); };
  }, []);

  const onForceLeave = useCallback((cb: () => void) => {
    const id = Date.now().toString();
    forceLeaveCallbacks.current.set(id, cb);
    return () => { forceLeaveCallbacks.current.delete(id); };
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

  const sendAudioChunk = useCallback(async (blob: Blob) => {
    if (!socketRef.current?.connected || !meetingId) return;
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      log(`audio:chunk sending: meeting=${meetingId?.slice(0, 8)} size=${blob.size} type=${blob.type}`);
      socketRef.current.emit('audio:chunk', {
        meetingId,
        audio: base64,
      });
    } catch (err) {
      errLog('sendAudioChunk failed', err);
    }
  }, [meetingId]);

  const setLocalStream = useCallback((stream: MediaStream) => {
    log(`setLocalStream: ${stream.getTracks().length} tracks, ${peerConnections.current.size} peers`);
    localStreamRef.current = stream;
    const tracks = stream.getTracks();

    peerConnections.current.forEach((pc, sid) => {
      let added = 0;
      // Add any missing tracks (e.g. peer was created before the stream was ready)
      tracks.forEach((t) => {
        if (!pc.getSenders().some((s) => s.track === t)) {
          pc.addTrack(t, stream);
          added++;
        }
      });
      // replaceTrack on existing senders (no renegotiation needed)
      const trackMap = new Map(tracks.map((t) => [t.kind, t]));
      pc.getSenders().forEach(sender => {
        const kind = sender.track?.kind;
        if (kind && trackMap.has(kind) && sender.track !== screenShareTrackRef.current) {
          sender.replaceTrack(trackMap.get(kind)!);
        }
      });

      pc.getTransceivers().forEach(t => {
        const kind = t.receiver?.track?.kind || t.sender?.track?.kind;
        if (kind && trackMap.has(kind) && t.sender.track !== screenShareTrackRef.current) {
          t.direction = 'sendrecv';
          t.sender.replaceTrack(trackMap.get(kind)!);
        }
      });

      // Always trigger renegotiation so the newly assigned tracks are sent over SDP
      const requestOffer = peerOfferFns.current.get(sid);
      if (requestOffer) {
        setTimeout(() => { requestOffer(); }, 50);
      }
    });
  }, []);

  const addScreenShareTrack = useCallback((track: MediaStreamTrack) => {
    log(`addScreenShareTrack: adding screen track (${track.kind}, id=${track.id.slice(0, 8)}, ready=${track.readyState}) to ${peerConnections.current.size} peers`);
    screenShareTrackRef.current = track;
    peerConnections.current.forEach((pc, sid) => {
      const flags = negotiationFlags.current.get(sid);
      log(`  peer ${sid.slice(-5)}: signalingState=${pc.signalingState}, isInitiator=${flags?.isInitiator}, negotiated=${flags?.negotiated}, makingOffer=${flags?.makingOffer}`);
      const stream = new MediaStream([track]);
      pc.addTrack(track, stream);
      log(`  peer ${sid.slice(-5)}: addTrack done, senders=${pc.getSenders().length}`);
    });
    // Explicitly trigger renegotiation for each peer to ensure the screen track is sent.
    // onnegotiationneeded may not fire reliably in all cases.
    peerConnections.current.forEach((pc, sid) => {
      const requestOffer = peerOfferFns.current.get(sid);
      const flags = negotiationFlags.current.get(sid);
      if (requestOffer) {
        log(`  scheduling renegotiation for ${sid.slice(-5)} in 100ms (state=${pc.signalingState}, isInit=${flags?.isInitiator}, negotiated=${flags?.negotiated})`);
        // Small delay to let the track addition settle
        setTimeout(() => {
          log(`  executing renegotiation for ${sid.slice(-5)} (state=${pc.signalingState}, isInit=${flags?.isInitiator}, negotiated=${flags?.negotiated})`);
          requestOffer();
        }, 100);
      } else {
        log(`  NO requestOffer fn for ${sid.slice(-5)} — renegotiation will not happen!`);
      }
    });
  }, []);

  const removeScreenShareTrack = useCallback(() => {
    const track = screenShareTrackRef.current;
    if (!track) return;
    log('removeScreenShareTrack: removing screen track from all peers');
    track.stop();
    screenShareTrackRef.current = null;
    peerConnections.current.forEach((pc, sid) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track === track) {
          try { pc.removeTrack(sender); } catch { /* may already be removed */ }
        }
      });
      const requestOffer = peerOfferFns.current.get(sid);
      if (requestOffer) {
        setTimeout(() => requestOffer(), 100);
      }
    });
  }, []);

  const leaveMeeting = useCallback(() => {
    log('leaveMeeting');
    removeScreenShareTrack();
    if (socketRef.current) {
      socketRef.current.emit('meeting:leave', { meetingId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    socketToUser.current.clear();
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    peerOfferFns.current.clear();
  }, [meetingId, removeScreenShareTrack]);

  return {
    isConnected, socketError, sttStatus,
    sendChat, startMeeting, endMeeting, onMeetingEnded, onRedirect, onForceLeave, leaveMeeting,
    toggleCamera, toggleMic, raiseHand, screenShareStart, screenShareStop, setLocalStream,
    addScreenShareTrack, removeScreenShareTrack,
    sendAudioChunk,
  };
}
