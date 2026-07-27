import jwt                  from 'jsonwebtoken';
import { env }              from '../config/env.js';
import { meetingService }   from '../services/meeting.service.js';

// room → Set of socket ids
const rooms = new Map();

function getRoomKey(meetingId) { return `meeting:${meetingId}`; }

export function initSocket(io) {
  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, env.jwtAccessSecret);
      socket.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    // ── meeting:join ──────────────────────────────────────────────────────────
    socket.on('meeting:join', async ({ meetingId }) => {
      try {
        const room = getRoomKey(meetingId);
        socket.join(room);

        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room).add(socket.id);

        await meetingService.joinMeeting(meetingId, user.id);

        socket.to(room).emit('participant:joined', {
          userId:   user.id,
          name:     user.full_name,
          avatar:   user.avatar_url,
          socketId: socket.id,
        });

        socket.emit('meeting:joined', { meetingId, socketId: socket.id });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── meeting:start ─────────────────────────────────────────────────────────
    socket.on('meeting:start', async ({ meetingId }) => {
      try {
        const result = await meetingService.startMeeting(meetingId, user.id);
        const room   = getRoomKey(meetingId);
        io.to(room).emit('meeting:started', { meeting: result.meeting });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── meeting:end ───────────────────────────────────────────────────────────
    socket.on('meeting:end', async ({ meetingId }) => {
      try {
        const result = await meetingService.endMeeting(meetingId, user.id);
        const room   = getRoomKey(meetingId);
        io.to(room).emit('meeting:ended', {
          meeting:    result.meeting,
          transcript: result.transcript,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── meeting:leave ─────────────────────────────────────────────────────────
    socket.on('meeting:leave', async ({ meetingId }) => {
      const room = getRoomKey(meetingId);
      await meetingService.leaveMeeting(meetingId, user.id).catch(() => {});
      socket.leave(room);
      rooms.get(room)?.delete(socket.id);
      socket.to(room).emit('participant:left', { userId: user.id, socketId: socket.id });
    });

    // ── chat:send ─────────────────────────────────────────────────────────────
    socket.on('chat:send', async ({ meetingId, message }) => {
      try {
        const chat = await meetingService.saveChat({ meeting_id: meetingId, user_id: user.id, message });
        const room = getRoomKey(meetingId);
        io.to(room).emit('chat:receive', {
          ...chat,
          full_name:  user.full_name,
          avatar_url: user.avatar_url,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── WebRTC signaling ──────────────────────────────────────────────────────
    socket.on('webrtc:offer', ({ meetingId, targetSocketId, offer }) => {
      io.to(targetSocketId).emit('webrtc:offer', { fromSocketId: socket.id, offer });
    });

    socket.on('webrtc:answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc:answer', { fromSocketId: socket.id, answer });
    });

    socket.on('webrtc:candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('webrtc:candidate', { fromSocketId: socket.id, candidate });
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      rooms.forEach((sockets, room) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          const meetingId = room.replace('meeting:', '');
          meetingService.leaveMeeting(meetingId, user.id).catch(() => {});
          socket.to(room).emit('participant:left', { userId: user.id, socketId: socket.id });
        }
      });
    });
  });
}
