import jwt                  from 'jsonwebtoken';
import { env }              from '../config/env.js';
import { meetingService }   from '../services/meeting.service.js';

// room → Set of socket ids
const rooms = new Map();

function getRoomKey(meetingId) { return `meeting:${meetingId}`; }

export function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, env.jwtAccessSecret);
      socket.user = {
        id:         payload.sub,
        email:      payload.email || '',
        full_name:  payload.full_name || '',
        avatar_url: payload.avatar_url || '',
        role:       payload.role || 'participant',
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
        const room = getRoomKey(meetingId);
        socket.join(room);

        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room).add(socket.id);

        const result = await meetingService.joinMeeting(meetingId, user.id);
        const meetingData = result?.meeting || null;
        const dbParticipants = result?.participants || [];

        const joinPayload = {
          id:         dbParticipants.find(p => p.user_id === user.id)?.id || socket.id,
          meeting_id: meetingId,
          user_id:    user.id,
          full_name:  user.full_name,
          avatar_url: user.avatar_url,
          email:      user.email,
          role:       user.role || 'participant',
          joined_at:  new Date().toISOString(),
          socketId:   socket.id,
        };
        socket.to(room).emit('participant:joined', joinPayload);

        const existingParticipants = [];
        const roomSocketsSet = io.sockets.adapter.rooms.get(room);
        if (roomSocketsSet) {
          for (const sid of roomSocketsSet) {
            if (sid !== socket.id) {
              const sock = io.sockets.sockets.get(sid);
              if (sock?.user) {
                const dbp = dbParticipants.find(p => p.user_id === sock.user.id);
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
          }
        }

        socket.emit('meeting:joined', {
          meetingId,
          socketId: socket.id,
          participants: existingParticipants,
          meeting: meetingData,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('meeting:start', async ({ meetingId }) => {
      try {
        const result = await meetingService.startMeeting(meetingId, user.id);
        const room   = getRoomKey(meetingId);
        io.to(room).emit('meeting:started', { meeting: result.meeting });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('meeting:end', async ({ meetingId }) => {
      try {
        const result = await meetingService.endMeeting(meetingId, user.id);
        const room   = getRoomKey(meetingId);
        io.to(room).emit('meeting:ended', {
          meeting:    result.meeting,
          transcript: result.transcript,
          summary:    result.summary,
        });
        setTimeout(() => {
          io.to(room).emit('meeting:redirect', { url: `/meetings/${meetingId}/summary` });
        }, 2000);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('meeting:leave', async ({ meetingId }) => {
      const room = getRoomKey(meetingId);
      await meetingService.leaveMeeting(meetingId, user.id).catch(() => {});
      socket.leave(room);
      rooms.get(room)?.delete(socket.id);
      socket.to(room).emit('participant:left', { userId: user.id, socketId: socket.id });
    });

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

    socket.on('toggle-camera', ({ meetingId, cameraOff }) => {
      const room = getRoomKey(meetingId);
      socket.to(room).emit('camera-state-changed', { userId: user.id, socketId: socket.id, cameraOff });
    });

    socket.on('toggle-mic', ({ meetingId, muted }) => {
      const room = getRoomKey(meetingId);
      socket.to(room).emit('microphone-state-changed', { userId: user.id, socketId: socket.id, muted });
    });

    socket.on('raise-hand', ({ meetingId }) => {
      const room = getRoomKey(meetingId);
      socket.to(room).emit('hand-raised', { userId: user.id, fullName: user.full_name });
    });

    socket.on('screen-share-start', ({ meetingId }) => {
      const room = getRoomKey(meetingId);
      socket.to(room).emit('screen-share-state', { userId: user.id, socketId: socket.id, sharing: true });
    });

    socket.on('screen-share-stop', ({ meetingId }) => {
      const room = getRoomKey(meetingId);
      socket.to(room).emit('screen-share-state', { userId: user.id, socketId: socket.id, sharing: false });
    });

    socket.on('webrtc:offer', ({ meetingId, targetSocketId, offer }) => {
      io.to(targetSocketId).emit('webrtc:offer', { fromSocketId: socket.id, offer });
    });

    socket.on('webrtc:answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc:answer', { fromSocketId: socket.id, answer });
    });

    socket.on('webrtc:candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('webrtc:candidate', { fromSocketId: socket.id, candidate });
    });

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
