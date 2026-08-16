const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');
const { roomManager } = require('../services/room.manager');
const YouTubeService = require('../services/youtube.service');

function formatDuration(sec) {
  const m = Math.floor((sec || 0) / 60);
  const s = Math.floor((sec || 0) % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function setupStationSockets(io) {
  // Socket Handshake Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, env.JWT_SECRET);
          const user = await db.findUserById(decoded.id);
          if (user && !user.isBanned) {
            socket.user = {
              id: user.id,
              username: user.username,
              avatar: user.avatar,
              role: user.role,
              level: user.level,
              isGuest: false
            };
            return next();
          }
        } catch (jwtErr) {
          console.warn('[Socket Auth] Token invalid, falling back to guest');
        }
      }

      // Guest fallback
      const guestName = socket.handshake.auth?.guestName || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
      const guestAvatar = socket.handshake.auth?.guestAvatar || '🎧';
      const guestId = socket.handshake.auth?.guestId || `guest_${socket.id}`;

      socket.user = {
        id: guestId,
        username: guestName,
        avatar: guestAvatar,
        role: 'USER',
        level: 1,
        isGuest: true
      };

      return next();
    } catch (err) {
      return next();
    }
  });

  io.on('connection', (socket) => {
    let currentRoomSlug = null;

    console.log(`🔌 [Socket Connected] ${socket.user.username} (${socket.user.role}) - ID: ${socket.id}`);

    // Re-authenticate socket session in real-time
    socket.on('authenticate', async (data) => {
      const token = data?.token || socket.handshake.auth?.token;
      if (token) {
        try {
          const decoded = jwt.verify(token, env.JWT_SECRET);
          const dbUser = await db.findUserById(decoded.id);
          if (dbUser && !dbUser.isBanned) {
            socket.user = {
              id: dbUser.id,
              username: dbUser.username,
              avatar: dbUser.avatar,
              role: dbUser.role,
              level: dbUser.level,
              isGuest: false
            };

            if (currentRoomSlug) {
              const room = roomManager.getRoom(currentRoomSlug);
              if (room && room.users[socket.id]) {
                room.users[socket.id] = {
                  userId: dbUser.id,
                  username: dbUser.username,
                  avatar: dbUser.avatar,
                  role: dbUser.role,
                  isGuest: false,
                  socketId: socket.id
                };
                room.broadcastRoomState();
              }
            }

            console.log(`🔑 [Socket Authenticated] ${dbUser.username} (${dbUser.role}) - ID: ${socket.id}`);
            socket.emit('authenticated', { user: socket.user });
          }
        } catch (jwtErr) {
          console.warn('[Socket Authenticate] Token invalid:', jwtErr.message);
        }
      }
    });

    // Join Specific Room
    socket.on('join_room', async (data) => {
      const user = socket.user;
      const targetSlug = data?.slug || 'lofi-chill-study';
      const room = roomManager.getRoom(targetSlug);

      if (!room) {
        socket.emit('room_error', { message: `Phòng "${targetSlug}" không tồn tại!` });
        return;
      }

      // Check password if private and has password (bypass for creator or ADMIN)
      if (room.isPrivate && room.passwordHash && user.role !== 'ADMIN' && user.id !== room.creatorId) {
        const providedPassword = data?.password;
        const isMatch = await room.verifyPassword(providedPassword);
        if (!isMatch) {
          socket.emit('room_password_required', {
            slug: targetSlug,
            name: room.name,
            message: 'Phòng này yêu cầu mật khẩu để tham gia!'
          });
          return;
        }
      }

      // Leave previous room if any
      if (currentRoomSlug && currentRoomSlug !== targetSlug) {
        const prevRoom = roomManager.getRoom(currentRoomSlug);
        if (prevRoom) {
          delete prevRoom.users[socket.id];
          socket.leave('room_' + currentRoomSlug);
          prevRoom.broadcastRoomState();
        }
      }

      currentRoomSlug = targetSlug;
      socket.join('room_' + targetSlug);

      // Register user in room
      room.users[socket.id] = {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        isGuest: user.isGuest,
        socketId: socket.id
      };

      const elapsed = room.currentTrack ? Math.max(0, (Date.now() - room.currentTrack.startTime) / 1000) : 0;
      const cooldownInfo = room.getUserCooldownInfo(user.id, user.role);

      // Send initial room snapshot to joining user
      socket.emit('room_joined_success', {
        room: room.getSummary(),
        currentTrack: room.currentTrack ? {
          ...room.currentTrack,
          elapsed
        } : null,
        queue: room.queue,
        cooldown: cooldownInfo,
        chatHistory: room.chatHistory.slice(-30),
        activeVote: room.activeVote.active ? {
          active: true,
          trackId: room.activeVote.trackId,
          remainingSec: Math.max(0, env.VOTE_WINDOW_DURATION_SEC - (Date.now() - room.activeVote.startTime) / 1000),
          duration: env.VOTE_WINDOW_DURATION_SEC,
          skipCount: room.activeVote.votesSkip.length,
          keepCount: room.activeVote.votesKeep.length,
          totalListeners: room.getOnlineCount()
        } : { active: false },
        onlineCount: room.getOnlineCount()
      });

      // Notify others in room
      room.broadcastRoomState();
      roomManager.broadcastLobbyUpdate();
    });

    // Add Track to Queue
    socket.on('add_to_queue', async (data) => {
      const user = socket.user;
      const room = roomManager.getRoom(currentRoomSlug);
      if (!room) {
        socket.emit('queue_error', { message: 'Bạn chưa tham gia phòng nhạc nào!' });
        return;
      }

      const cooldown = room.getUserCooldownInfo(user.id, user.role);
      if (!cooldown.canAdd) {
        socket.emit('queue_error', {
          message: `Vui lòng chờ thêm ${cooldown.remainingSeconds}s nữa trước khi thêm bài mới!`,
          cooldown
        });
        return;
      }

      const input = data?.urlOrId || '';
      const videoId = YouTubeService.extractVideoId(input);

      if (!videoId) {
        socket.emit('queue_error', { message: 'Đường dẫn hoặc YouTube ID không hợp lệ!' });
        return;
      }

      if (room.queue.some(t => t.videoId === videoId) || (room.currentTrack && room.currentTrack.videoId === videoId)) {
        socket.emit('queue_error', { message: 'Bài hát này đang phát hoặc đã có trong hàng chờ!' });
        return;
      }

      if (room.queue.length >= 30) {
        socket.emit('queue_error', { message: 'Hàng chờ đã đầy (tối đa 30 bài). Vui lòng chờ bài phát xong!' });
        return;
      }

      try {
        const meta = await YouTubeService.getVideoDetails(videoId);
        let duration = parseInt(data?.duration, 10) || 240;

        // Role-based duration limits (Standard: 10m, VIP: 15m, Admin: 60m)
        let maxAllowedDuration = env.MAX_SONG_DURATION_SEC;
        if (user.role === 'ADMIN') {
          maxAllowedDuration = env.ADMIN_MAX_SONG_DURATION_SEC;
        } else if (user.role === 'VIP' || user.role === 'DJ') {
          maxAllowedDuration = env.VIP_MAX_SONG_DURATION_SEC;
        }

        if (duration > maxAllowedDuration) {
          const maxMins = Math.floor(maxAllowedDuration / 60);
          socket.emit('queue_error', {
            message: `Thời lượng bài hát vượt quá giới hạn cho phép (tối đa ${maxMins} phút)!`
          });
          return;
        }

        const newTrack = {
          id: 'trk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          videoId,
          title: meta.title,
          author: meta.author,
          thumbnail: meta.thumbnail,
          duration: Math.min(maxAllowedDuration, Math.max(30, duration)),
          requestedBy: user.username,
          requestedById: user.isGuest ? null : user.id,
          requestedByRole: user.role,
          addedAt: Date.now()
        };

        await room.addTrack(newTrack, user);
        room.applyUserCooldown(user.id, user.role);

        room.broadcastSystemMessage(`✨ ${user.username} đã thêm bài "${newTrack.title}" (${formatDuration(newTrack.duration)})`, '🎵');
        roomManager.broadcastLobbyUpdate();

        socket.emit('queue_success', {
          track: newTrack,
          cooldown: room.getUserCooldownInfo(user.id, user.role)
        });
      } catch (err) {
        console.error('[Add to Queue Error]:', err.message);
        socket.emit('queue_error', { message: 'Không thể thêm bài hát vào hàng chờ!' });
      }
    });

    // 10s Vote Skip Submission
    socket.on('submit_vote', (data) => {
      const user = socket.user;
      const room = roomManager.getRoom(currentRoomSlug);
      if (!room || !room.activeVote.active) return;

      const voteType = data?.voteType; // 'skip' | 'keep'
      const voterId = user.id;

      room.activeVote.votesSkip = room.activeVote.votesSkip.filter(id => id !== voterId);
      room.activeVote.votesKeep = room.activeVote.votesKeep.filter(id => id !== voterId);

      if (voteType === 'skip') {
        room.activeVote.votesSkip.push(voterId);
      } else if (voteType === 'keep') {
        room.activeVote.votesKeep.push(voterId);
      }

      io.to(room.getRoomSocketNamespace()).emit('vote_counts_updated', {
        trackId: room.activeVote.trackId,
        skipCount: room.activeVote.votesSkip.length,
        keepCount: room.activeVote.votesKeep.length,
        totalListeners: room.getOnlineCount()
      });

      room.checkVoteThreshold();
    });

    // Admin Instant Skip (Strictly for ADMIN accounts only)
    socket.on('admin_instant_skip', () => {
      const user = socket.user;
      const room = roomManager.getRoom(currentRoomSlug);
      if (!room) return;

      if (user.role !== 'ADMIN') {
        socket.emit('action_error', { message: 'Chỉ tài khoản Quản trị viên (ADMIN) mới có quyền dùng Admin Skip!' });
        return;
      }

      const trackTitle = room.currentTrack ? room.currentTrack.title : 'Bài hát hiện tại';
      room.broadcastSystemMessage(`⚡ Quản trị viên ${user.username} đã chuyển bài hát tức thì!`, '⚡');
      room.playNextTrack('admin_skip');
    });

    // Client track ended (fallback notification)
    socket.on('client_track_ended', (data) => {
      const room = roomManager.getRoom(currentRoomSlug);
      if (!room || !room.currentTrack) return;

      if (data?.trackId === room.currentTrack.id) {
        const elapsed = (Date.now() - room.currentTrack.startTime) / 1000;
        if (elapsed >= (room.currentTrack.duration - 5)) {
          room.playNextTrack('client_ended');
        }
      }
    });

    // Send Chat Message
    socket.on('send_chat', (data) => {
      const user = socket.user;
      const room = roomManager.getRoom(currentRoomSlug);
      if (!room) return;

      const rawText = data?.text || '';
      const text = rawText.trim().substring(0, 300);
      if (!text) return;

      const msg = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        text,
        type: 'user',
        timestamp: Date.now()
      };

      room.chatHistory.push(msg);
      if (room.chatHistory.length > 100) room.chatHistory.shift();

      // PERSISTENCE: Save to Supabase PostgreSQL
      if (!user.isGuest) {
        db.addChatMessage(room.slug, msg).catch(() => {});
      }

      io.to(room.getRoomSocketNamespace()).emit('chat_message', msg);
    });

    // Emoji Reactions
    socket.on('send_reaction', (data) => {
      const user = socket.user;
      const room = roomManager.getRoom(currentRoomSlug);
      if (!room) return;

      const emoji = data?.emoji;
      if (!emoji) return;

      io.to(room.getRoomSocketNamespace()).emit('reaction_burst', {
        emoji,
        username: user.username,
        id: 'rx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
      });
    });

    // Leave Room
    socket.on('leave_room', () => {
      if (currentRoomSlug) {
        const room = roomManager.getRoom(currentRoomSlug);
        if (room) {
          delete room.users[socket.id];
          socket.leave('room_' + currentRoomSlug);
          room.broadcastRoomState();
          roomManager.broadcastLobbyUpdate();
        }
        currentRoomSlug = null;
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 [Socket Disconnected] ${socket.user.username} - ID: ${socket.id}`);
      if (currentRoomSlug) {
        const room = roomManager.getRoom(currentRoomSlug);
        if (room) {
          delete room.users[socket.id];
          room.broadcastRoomState();
          roomManager.broadcastLobbyUpdate();
        }
      }
    });
  });
}

module.exports = setupStationSockets;
