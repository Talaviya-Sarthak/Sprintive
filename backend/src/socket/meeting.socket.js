import jwt                  from 'jsonwebtoken';
import { env }              from '../config/env.js';
import { meetingService }   from '../services/meeting.service.js';
import { sttService }       from '../services/stt/stt.service.js';
import { transcriptService } from '../services/transcript/transcript.service.js';
import { findUserById }     from '../repositories/auth.repository.js';
import { logger }           from '../utils/logger.js';

// room → Set of socket ids
const rooms = new Map();

// meetingId → Promise (prevents duplicate end-meeting processing)
const endingMeetings = new Map();

function getRoomKey(meetingId) { return `meeting:${meetingId}`; }

export function initSocket(io) {
  // ── STT Events: forward partial/final results to meeting room ──────────────
  sttService.on('partial', ({ meetingId, participantId, speakerName, text, words, start, duration }) => {
    const room = getRoomKey(meetingId);
    io.to(room).emit('stt:partial', { meetingId, participantId, speakerName, text, words, start, duration });
  });

  sttService.on('final', ({ meetingId, participantId, speakerName, text, words, start, end }) => {
    const room = getRoomKey(meetingId);
    io.to(room).emit('stt:final', { meetingId, participantId, speakerName, text, words, start, end });
  });

  // Auth middleware — resolve the real user (JWT carries `sub`, not `id`)
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, env.jwtAccessSecret);
      const user = await findUserById(payload.sub);
      if (!user) return next(new Error('User not found'));
      socket.user = {
        id:         user.id,
        full_name:  user.full_name,
        avatar_url: user.avatar_url,
        email:      user.email,
        role:       user.role || 'participant',
      };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    socket.on('meeting:join', async ({ meetingId }) => {
      try {
        // Enforce authorization first: check meeting existence and team membership
        const result = await meetingService.joinMeeting(meetingId, user.id);
        const meetingData = result?.meeting || null;
        const dbParticipants = result?.participants || [];

        const room = getRoomKey(meetingId);
        socket.join(room);

        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room).add(socket.id);

        // Build the roster + full participant list for everyone already in the room
        const roster = [];
        const existingParticipants = [];
        const roomSocketsSet = io.sockets.adapter.rooms.get(room);
        if (roomSocketsSet) {
          for (const sid of roomSocketsSet) {
            if (sid === socket.id) continue;
            const sock = io.sockets.sockets.get(sid);
            if (!sock?.user) continue;
            const dbp = dbParticipants.find(p => p.user_id === sock.user.id);
            roster.push({
              userId:   sock.user.id,
              name:     sock.user.full_name,
              avatar:   sock.user.avatar_url,
              socketId: sid,
            });
            existingParticipants.push({
              id:           dbp?.id || sid,
              meeting_id:   meetingId,
              user_id:      sock.user.id,
              full_name:    sock.user.full_name,
              avatar_url:   sock.user.avatar_url,
              email:        sock.user.email,
              role:         sock.user.role || 'participant',
              joined_at:    dbp?.joined_at || new Date().toISOString(),
              socketId:     sid,
              isMuted:      dbp?.is_muted ?? false,
              isCameraOff:  dbp?.is_camera_off ?? false,
              isSpeaking:   dbp?.is_speaking ?? false,
            });
          }
        }

        // Notify the rest of the room about the new joiner (superset payload)
        socket.to(room).emit('participant:joined', {
          id:           dbParticipants.find(p => p.user_id === user.id)?.id || socket.id,
          meeting_id:   meetingId,
          user_id:      user.id,
          userId:       user.id,
          full_name:    user.full_name,
          name:         user.full_name,
          avatar_url:   user.avatar_url,
          avatar:       user.avatar_url,
          email:        user.email,
          role:         user.role || 'participant',
          joined_at:    new Date().toISOString(),
          socketId:     socket.id,
        });

        // Send the current roster (including socketIds) to the joiner
        socket.emit('meeting:participants', { meetingId, participants: roster });

        socket.emit('meeting:joined', {
          meetingId,
          socketId: socket.id,
          participants: existingParticipants,
          meeting: meetingData,
        });
      } catch (err) {
        logger.warn(`[socket] Unauthorized meeting:join by user ${user.id} for meeting ${meetingId}: ${err.message}`);
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('meeting:start', async ({ meetingId }) => {
      try {
        const room = getRoomKey(meetingId);
        if (!socket.rooms.has(room)) {
          return socket.emit('error', { message: 'You have not joined this meeting room' });
        }

        const result = await meetingService.startMeeting(meetingId, user.id);

        // Gather all current participants in the room for STT session init
        const participants = [];
        const roomSocketsSet = io.sockets.adapter.rooms.get(room);
        if (roomSocketsSet) {
          for (const sid of roomSocketsSet) {
            const sock = io.sockets.sockets.get(sid);
            if (sock?.user) {
              participants.push({ id: sock.user.id, name: sock.user.full_name });
            }
          }
        }

        // Initialize streaming STT sessions for all participants
        sttService.startSession(meetingId, participants);
        io.to(room).emit('stt:status', { meetingId, status: 'active' });

        io.to(room).emit('meeting:started', { meeting: result.meeting });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('meeting:end', async ({ meetingId }) => {
      const room = getRoomKey(meetingId);
      if (!socket.rooms.has(room)) {
        return socket.emit('error', { message: 'You have not joined this meeting room' });
      }

      // ── Idempotency guard: if this meeting is already ending, skip ──
      if (endingMeetings.has(meetingId)) {
        logger.warn(`[meeting] End already in progress for ${meetingId}, ignoring duplicate`);
        return;
      }
      endingMeetings.set(meetingId, true);

      try {
        logger.info(`[meeting] End requested by ${user.full_name} for meeting ${meetingId}`);

        // 1. End the meeting in DB (verifies host and membership, marks completed)
        const result = await meetingService.endMeeting(meetingId, user.id);

        // 2. Emit STT finalizing status
        io.to(room).emit('stt:status', { meetingId, status: 'finalizing' });

        // 3. Broadcast meeting ended to all participants
        io.to(room).emit('meeting:ended', {
          meeting:    result.meeting,
          summary:    result.summary,
        });

        logger.info(`[meeting] Meeting ${meetingId} ended, now finalizing transcript...`);

        // 4. Finalize STT sessions & upload raw transcript (with timeout)
        const FINALIZATION_TIMEOUT_MS = 15000;
        try {
          const transcriptResult = await Promise.race([
            transcriptService.finalizeTranscript(meetingId),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Transcript finalization timeout')), FINALIZATION_TIMEOUT_MS)
            ),
          ]);

          logger.info(`[meeting] Transcript finalized for ${meetingId}: ${transcriptResult?.storagePath || 'no storage'}`);
          io.to(room).emit('stt:status', { meetingId, status: 'completed' });
        } catch (finalizationErr) {
          logger.error(`[meeting] Transcript finalization failed/timed out for ${meetingId}: ${finalizationErr.message}`);
          io.to(room).emit('stt:status', { meetingId, status: 'failed' });
          sttService.abortSession(meetingId);
        }

        // 5. Force disconnect all participants after finalization
        setTimeout(() => {
          io.to(room).emit('meeting:force-leave', { meetingId });
          setTimeout(() => {
            const roomSockets = io.sockets.adapter.rooms.get(room);
            if (roomSockets) {
              for (const sid of roomSockets) {
                const s = io.sockets.sockets.get(sid);
                if (s) {
                  s.leave(room);
                  s.disconnect(true);
                }
              }
            }
            rooms.delete(room);
            endingMeetings.delete(meetingId);
          }, 500);
        }, 500);

        // 6. Redirect after a short delay
        setTimeout(() => {
          io.to(room).emit('meeting:redirect', { url: `/meetings/${meetingId}/summary` });
        }, 1500);

      } catch (err) {
        logger.error(`[meeting] End meeting failed for ${meetingId}: ${err.message}`);
        socket.emit('error', { message: err.message });
        sttService.abortSession(meetingId);
        endingMeetings.delete(meetingId);
      }
    });

    socket.on('meeting:leave', async ({ meetingId }) => {
      const room = getRoomKey(meetingId);
      // Clean up participant's Deepgram session without closing entire meeting
      sttService.closeParticipantSession(meetingId, user.id).catch((err) => {
        logger.warn(`[socket] Failed to close STT session on leave for user ${user.id} in ${meetingId}: ${err.message}`);
      });
      await meetingService.leaveMeeting(meetingId, user.id).catch(() => {});
      socket.leave(room);
      rooms.get(room)?.delete(socket.id);
      socket.to(room).emit('participant:left', { userId: user.id, socketId: socket.id });
    });

    socket.on('chat:send', async ({ meetingId, message }) => {
      try {
        const room = getRoomKey(meetingId);
        if (!socket.rooms.has(room)) {
          await meetingService.assertMeetingAccess(meetingId, user.id);
          socket.join(room);
          if (!rooms.has(room)) rooms.set(room, new Set());
          rooms.get(room).add(socket.id);
        }

        const chat = await meetingService.saveChat({ meeting_id: meetingId, user_id: user.id, message });
        io.to(room).emit('chat:receive', {
          ...chat,
          full_name:  user.full_name,
          avatar_url: user.avatar_url,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── STT: Receive audio chunk from participant ──────────────────────────────
    socket.on('audio:chunk', async ({ meetingId, audio }) => {
      try {
        const room = getRoomKey(meetingId);
        if (!socket.rooms.has(room)) return;
        if (!sttService.hasSession(meetingId)) return;

        const audioBuffer = Buffer.from(audio, 'base64');
        logger.debug(`[audio:chunk] meeting=${meetingId} participant=${user.full_name} size=${audioBuffer.length}`);
        sttService.processAudio(meetingId, user.id, audioBuffer, user.full_name);
      } catch (err) {
        logger.error(`[stt] audio:chunk error for meeting ${meetingId}: ${err.message}`);
      }
    });

    function resolveRoom(mid) {
      if (mid) {
        const room = getRoomKey(mid);
        if (socket.rooms.has(room)) return room;
      }
      for (const room of socket.rooms) {
        if (room.startsWith('meeting:')) return room;
      }
      return null;
    }

    socket.on('toggle-camera', ({ meetingId, cameraOff }) => {
      const room = resolveRoom(meetingId);
      if (!room) return;
      socket.to(room).emit('camera-state-changed', { userId: user.id, socketId: socket.id, cameraOff });
    });

    socket.on('toggle-mic', ({ meetingId, muted }) => {
      const room = resolveRoom(meetingId);
      if (!room) return;
      socket.to(room).emit('microphone-state-changed', { userId: user.id, socketId: socket.id, muted });
    });

    socket.on('raise-hand', ({ meetingId }) => {
      const room = resolveRoom(meetingId);
      if (!room) return;
      socket.to(room).emit('hand-raised', { userId: user.id, fullName: user.full_name });
    });

    socket.on('screen-share-start', ({ meetingId }) => {
      const room = resolveRoom(meetingId);
      if (!room) return;
      socket.to(room).emit('screen-share-state', { userId: user.id, socketId: socket.id, sharing: true });
    });

    socket.on('screen-share-stop', ({ meetingId }) => {
      const room = resolveRoom(meetingId);
      if (!room) return;
      socket.to(room).emit('screen-share-state', { userId: user.id, socketId: socket.id, sharing: false });
    });

    socket.on('webrtc:offer', ({ meetingId, targetSocketId, offer }) => {
      const room = resolveRoom(meetingId);
      if (!room) return;
      io.to(targetSocketId).emit('webrtc:offer', { fromSocketId: socket.id, userId: user.id, offer });
    });

    socket.on('webrtc:answer', ({ meetingId, targetSocketId, answer }) => {
      const room = resolveRoom(meetingId);
      if (!room) return;
      io.to(targetSocketId).emit('webrtc:answer', { fromSocketId: socket.id, userId: user.id, answer });
    });

    socket.on('webrtc:candidate', ({ meetingId, targetSocketId, candidate }) => {
      const room = resolveRoom(meetingId);
      if (!room) return;
      io.to(targetSocketId).emit('webrtc:candidate', { fromSocketId: socket.id, userId: user.id, candidate });
    });

    socket.on('disconnect', () => {
      rooms.forEach((sockets, room) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          const meetingId = room.replace('meeting:', '');
          // Clean up participant's Deepgram session without closing entire meeting
          sttService.closeParticipantSession(meetingId, user.id).catch((err) => {
            logger.warn(`[socket] Failed to close STT session on disconnect for user ${user.id} in ${meetingId}: ${err.message}`);
          });
          meetingService.leaveMeeting(meetingId, user.id).catch(() => {});
          socket.to(room).emit('participant:left', { userId: user.id, socketId: socket.id });
        }
      });
    });
  });
}
