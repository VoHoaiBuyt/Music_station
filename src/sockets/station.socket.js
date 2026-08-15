const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');
const station = require('../services/station.service');

function setupStationSockets(io) {
  station.setIO(io);

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const user = await db.findUserById(decoded.userId);

        if (user && !user.isBanned) {
          socket.user = user;
          return next();
        }
      } catch (err) {
        // invalid token, fallback to guest
      }
    }

    socket.user = null;
    next();
  });

  io.on('connection', (socket) => {
    let clientUserId = socket.user ? socket.user.id : null;

    // 1. Join Station
    socket.on('join_station', (userData) => {
      let userId = socket.user ? socket.user.id : (userData.userId || ('guest_' + socket.id));
      let username = socket.user ? socket.user.username : (userData.username || ('Guest ' + Math.floor(100 + Math.random() * 900))).trim().slice(0, 25);
      let avatar = socket.user ? socket.user.avatar : (userData.avatar || '🎧');
      let role = socket.user ? socket.user.role : 'USER';
      let isGuest = !socket.user;

      clientUserId = userId;

      station.state.users[socket.id] = {
        userId,
        username,
        avatar,
        role,
        isGuest,
        socketId: socket.id
      };

      const cooldownInfo = station.getUserCooldownInfo(userId, role);
      const elapsed = station.state.currentTrack ? Math.max(0, (Date.now() - station.state.currentTrack.startTime) / 1000) : 0;

      socket.emit('init_sync', {
        currentTrack: station.state.currentTrack ? {
          ...station.state.currentTrack,
          elapsed
        } : null,
        queue: station.state.queue,
        chatHistory: station.state.chatHistory,
        cooldown: cooldownInfo,
        activeVote: station.state.activeVote.active ? {
          active: true,
          trackId: station.state.activeVote.trackId,
          remainingSec: Math.max(0, env.VOTE_WINDOW_DURATION_SEC - (Date.now() - station.state.activeVote.startTime) / 1000),
          duration: env.VOTE_WINDOW_DURATION_SEC,
          skipCount: station.state.activeVote.votesSkip.length,
          keepCount: station.state.activeVote.votesKeep.length,
          totalListeners: station.getOnlineUserCount(),
          userVoted: station.state.activeVote.votesSkip.includes(userId) ? 'skip' : (station.state.activeVote.votesKeep.includes(userId) ? 'keep' : null)
        } : { active: false },
        onlineCount: station.getOnlineUserCount(),
        serverTime: Date.now(),
        user: socket.user || { id: userId, username, avatar, role, isGuest: true }
      });

      const roleBadge = role !== 'USER' ? `[${role}] ` : '';
      station.broadcastSystemMessage(`👋 ${roleBadge}${username} đã tham gia phòng nghe nhạc!`, '✨');
      io.emit('user_count_update', { count: station.getOnlineUserCount() });
    });

    // 2. Add Song to Queue
    socket.on('add_to_queue', async (data) => {
      const activeUser = station.state.users[socket.id] || { username: 'Khách', avatar: '🎵', userId: clientUserId, role: 'USER' };
      const rawInput = data.url || data.query || '';

      const videoId = station.extractYouTubeId(rawInput);
      if (!videoId) {
        return socket.emit('add_error', { message: 'Link hoặc Video ID YouTube không hợp lệ!' });
      }

      const cooldownInfo = station.getUserCooldownInfo(activeUser.userId, activeUser.role);
      if (!cooldownInfo.canAdd) {
        return socket.emit('add_error', {
          message: `Bạn đang trong thời gian chờ! Vui lòng đợi ${Math.floor(cooldownInfo.remainingSeconds / 60)}:${(cooldownInfo.remainingSeconds % 60).toString().padStart(2, '0')}.`,
          remainingSeconds: cooldownInfo.remainingSeconds
        });
      }

      const metadata = await station.fetchYouTubeMetadata(videoId);

      const newTrack = {
        id: 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        videoId,
        title: metadata.title,
        author: metadata.author,
        thumbnail: metadata.thumbnail,
        duration: data.duration || 240,
        requestedBy: activeUser.username,
        requestedById: activeUser.userId,
        isDefault: false,
        addedAt: Date.now()
      };

      station.applyUserCooldown(activeUser.userId, activeUser.role);

      if (station.state.currentTrack && station.state.currentTrack.isDefault) {
        station.state.queue.unshift(newTrack);
        station.playNextTrack('user_requested_priority');
      } else {
        station.state.queue.push(newTrack);
        station.broadcastStationState();
      }

      const updatedCooldown = station.getUserCooldownInfo(activeUser.userId, activeUser.role);
      socket.emit('add_success', {
        track: newTrack,
        cooldown: updatedCooldown
      });

      station.broadcastSystemMessage(`🎶 ${activeUser.username} đã thêm bài: "${newTrack.title}" vào hàng chờ!`, '➕');
    });

    // 3. Remove Song from Queue
    socket.on('remove_from_queue', (data) => {
      const { trackId } = data;
      const activeUser = station.state.users[socket.id];
      if (!activeUser) return;

      const index = station.state.queue.findIndex(t => t.id === trackId);
      if (index !== -1) {
        const track = station.state.queue[index];
        if (track.requestedById === activeUser.userId || activeUser.role === 'ADMIN' || activeUser.role === 'MODERATOR' || track.requestedById === 'system') {
          station.state.queue.splice(index, 1);
          station.broadcastStationState();
          station.broadcastSystemMessage(`🗑️ Bài "${track.title}" đã được gỡ khỏi hàng chờ.`, 'ℹ️');
        }
      }
    });

    // 4. Instant Skip (Admin / Moderator privilege)
    socket.on('admin_instant_skip', () => {
      const activeUser = station.state.users[socket.id];
      if (activeUser && (activeUser.role === 'ADMIN' || activeUser.role === 'MODERATOR')) {
        station.broadcastSystemMessage(`⚡ [${activeUser.role}] ${activeUser.username} đã skip bài hát ngay lập tức!`, '⚡');
        station.playNextTrack('admin_instant_skip');
      }
    });

    // 5. Submit Vote Skip / Keep (10s Window)
    socket.on('submit_vote', (data) => {
      const { voteType } = data;
      if (!station.state.activeVote.active) {
        return socket.emit('vote_error', { message: 'Thời gian bình chọn đã kết thúc!' });
      }

      const currentUserId = clientUserId;
      if (!currentUserId) return;

      station.state.activeVote.votesSkip = station.state.activeVote.votesSkip.filter(id => id !== currentUserId);
      station.state.activeVote.votesKeep = station.state.activeVote.votesKeep.filter(id => id !== currentUserId);

      if (voteType === 'skip') {
        station.state.activeVote.votesSkip.push(currentUserId);
      } else if (voteType === 'keep') {
        station.state.activeVote.votesKeep.push(currentUserId);
      }

      const votePayload = {
        trackId: station.state.activeVote.trackId,
        skipCount: station.state.activeVote.votesSkip.length,
        keepCount: station.state.activeVote.votesKeep.length,
        totalListeners: station.getOnlineUserCount()
      };

      io.emit('vote_updated', votePayload);
      station.checkVoteThreshold();
    });

    // 6. Send Chat Message
    socket.on('send_chat', (data) => {
      const activeUser = station.state.users[socket.id] || { username: 'Khách', avatar: '💬', userId: clientUserId, role: 'USER' };
      const text = (data.text || '').trim();
      if (!text || text.length > 300) return;

      const message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        type: 'user',
        userId: activeUser.userId,
        username: activeUser.username,
        avatar: activeUser.avatar,
        role: activeUser.role,
        text,
        timestamp: Date.now()
      };

      station.state.chatHistory.push(message);
      if (station.state.chatHistory.length > 100) station.state.chatHistory.shift();

      // Record to Supabase
      db.addChatMessage(message).catch(err => console.warn('[DB] Chat record error:', err.message));

      io.emit('chat_message', message);
    });

    // 7. Emoji Reaction Burst
    socket.on('send_reaction', (data) => {
      const activeUser = station.state.users[socket.id] || { username: 'Khách' };
      const emoji = data.emoji || '❤️';
      io.emit('reaction_burst', {
        emoji,
        username: activeUser.username
      });
    });

    // 8. Track Ended
    socket.on('client_track_ended', (data) => {
      if (station.state.currentTrack && (data.trackId === station.state.currentTrack.id || data.videoId === station.state.currentTrack.videoId)) {
        const elapsed = (Date.now() - station.state.currentTrack.startTime) / 1000;
        if (elapsed > 10) {
          station.playNextTrack('client_reported_end');
        }
      }
    });

    // 9. Disconnect
    socket.on('disconnect', () => {
      delete station.state.users[socket.id];
      io.emit('user_count_update', { count: station.getOnlineUserCount() });

      if (station.state.activeVote.active) {
        station.checkVoteThreshold();
      }
    });
  });
}

module.exports = setupStationSockets;
