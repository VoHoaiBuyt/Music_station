const bcrypt = require('bcryptjs');
const db = require('../config/db');
const env = require('../config/env');

// Helper: Extract YouTube ID
function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regex);
  return match ? match[1] : null;
}

// Helper: Fetch YouTube Metadata via oEmbed API
async function fetchYouTubeMetadata(videoId) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;

  try {
    const response = await fetch(oEmbedUrl, { signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || 'YouTube Music Track',
        author: data.author_name || 'YouTube Creator',
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      };
    }
  } catch (err) {
    console.warn(`[oEmbed] Failed metadata for ${videoId}:`, err.message);
  }

  return {
    title: `YouTube Track (${videoId})`,
    author: 'Unknown Artist',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  };
}

// ==========================================
// Independent Room Instance Class (100% User-Driven)
// ==========================================
class RoomInstance {
  constructor(roomData, io) {
    this.io = io;
    this.id = roomData.id;
    this.slug = roomData.slug;
    this.name = roomData.name;
    this.description = roomData.description || '';
    this.genre = roomData.genre || 'Phòng Nhạc Tự Do';
    this.coverUrl = roomData.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80';
    this.isPrivate = !!roomData.isPrivate;
    this.passwordHash = roomData.passwordHash || null;
    this.creatorId = roomData.creatorId;
    this.creatorName = roomData.creatorName || 'Member';
    this.isDefault = !!roomData.isDefault;

    this.currentTrack = null;
    this.queue = Array.isArray(roomData.queue) ? roomData.queue : [];
    this.users = {}; // socketId -> { userId, username, avatar, role, isGuest, socketId }
    this.userCooldowns = {};
    this.chatHistory = [];
    this.activeVote = {
      active: false,
      trackId: null,
      startTime: 0,
      duration: env.VOTE_WINDOW_DURATION_SEC,
      votesSkip: [],
      votesKeep: [],
      timer: null
    };
    this.trackEndTimer = null;

    // Initialize playback from persistent state
    this.initPlayback(roomData.currentTrack);
    this.loadRecentChatFromDB();
  }

  getRoomSocketNamespace() {
    return 'room_' + this.slug;
  }

  async loadRecentChatFromDB() {
    try {
      const messages = await db.getRecentChat(this.slug, 30);
      if (messages && messages.length > 0) {
        this.chatHistory = messages.map(m => ({
          id: m.id,
          userId: m.userId,
          username: m.username,
          avatar: m.avatar,
          role: m.role || 'USER',
          text: m.text,
          type: m.type,
          timestamp: new Date(m.createdAt).getTime()
        }));
      }
    } catch (err) {
      console.warn(`[Room ${this.slug}] Chat load notice:`, err.message);
    }
  }

  // Restore persistent playback or wait for users to add songs
  initPlayback(savedTrack) {
    if (savedTrack && savedTrack.videoId && savedTrack.startTime) {
      const now = Date.now();
      const elapsed = (now - savedTrack.startTime) / 1000;
      const duration = savedTrack.duration || 240;

      // If saved track is still within duration window, continue playing!
      if (elapsed < duration) {
        this.currentTrack = savedTrack;
        const remainingMs = Math.max(1000, (duration - elapsed) * 1000);
        
        console.log(`[Room ${this.slug}] Restored user track: "${savedTrack.title}" (${Math.floor(elapsed)}s / ${duration}s)`);

        this.trackEndTimer = setTimeout(() => {
          this.playNextTrack('restored_timer_end');
        }, remainingMs);
        return;
      }
    }

    // If queue has songs, play next from queue
    if (this.queue.length > 0) {
      this.playNextTrack('init');
    } else {
      // Room is clean and waiting for songs from users
      this.currentTrack = null;
    }
  }

  getOnlineCount() {
    const uniqueUsers = new Set(Object.values(this.users).map(u => u.userId));
    return Math.max(1, uniqueUsers.size);
  }

  broadcastSystemMessage(text, icon = '📢') {
    const msg = {
      id: 'sys_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: 'system',
      text,
      icon,
      timestamp: Date.now()
    };

    this.chatHistory.push(msg);
    if (this.chatHistory.length > 100) this.chatHistory.shift();

    if (this.io) {
      this.io.to(this.getRoomSocketNamespace()).emit('chat_message', msg);
    }
  }

  broadcastRoomState() {
    if (!this.io) return;
    const elapsed = this.currentTrack ? Math.max(0, (Date.now() - this.currentTrack.startTime) / 1000) : 0;

    this.io.to(this.getRoomSocketNamespace()).emit('station_state_update', {
      slug: this.slug,
      currentTrack: this.currentTrack ? {
        ...this.currentTrack,
        elapsed
      } : null,
      queue: this.queue,
      activeVote: this.activeVote.active ? {
        active: true,
        trackId: this.activeVote.trackId,
        remainingSec: Math.max(0, env.VOTE_WINDOW_DURATION_SEC - (Date.now() - this.activeVote.startTime) / 1000),
        duration: env.VOTE_WINDOW_DURATION_SEC,
        skipCount: this.activeVote.votesSkip.length,
        keepCount: this.activeVote.votesKeep.length,
        totalListeners: this.getOnlineCount()
      } : { active: false },
      onlineCount: this.getOnlineCount()
    });
  }

  startVoteWindow(trackId) {
    if (this.activeVote.timer) {
      clearTimeout(this.activeVote.timer);
      this.activeVote.timer = null;
    }

    this.activeVote = {
      active: true,
      trackId: trackId,
      startTime: Date.now(),
      duration: env.VOTE_WINDOW_DURATION_SEC,
      votesSkip: [],
      votesKeep: [],
      timer: null
    };

    const votePayload = {
      active: true,
      trackId: trackId,
      duration: env.VOTE_WINDOW_DURATION_SEC,
      skipCount: 0,
      keepCount: 0,
      totalListeners: this.getOnlineCount()
    };

    if (this.io) {
      this.io.to(this.getRoomSocketNamespace()).emit('vote_window_opened', votePayload);
    }

    this.activeVote.timer = setTimeout(() => {
      this.endVoteWindow(false);
    }, env.VOTE_WINDOW_DURATION_SEC * 1000);
  }

  endVoteWindow(wasSkipped = false) {
    if (!this.activeVote.active) return;

    if (this.activeVote.timer) {
      clearTimeout(this.activeVote.timer);
      this.activeVote.timer = null;
    }

    const finalSkip = this.activeVote.votesSkip.length;
    const finalKeep = this.activeVote.votesKeep.length;
    const trackId = this.activeVote.trackId;

    this.activeVote.active = false;

    if (this.io) {
      this.io.to(this.getRoomSocketNamespace()).emit('vote_window_closed', {
        trackId,
        wasSkipped,
        skipCount: finalSkip,
        keepCount: finalKeep,
        totalListeners: this.getOnlineCount()
      });
    }
  }

  checkVoteThreshold() {
    if (!this.activeVote.active) return false;

    const totalListeners = this.getOnlineCount();
    const skipVotes = this.activeVote.votesSkip.length;
    const threshold = Math.max(1, Math.floor(totalListeners / 2) + 1);

    if (skipVotes >= threshold) {
      const trackTitle = this.currentTrack ? this.currentTrack.title : 'Bài hát hiện tại';
      this.broadcastSystemMessage(`⏭️ Bài hát "${trackTitle}" đã bị bỏ qua bởi biểu quyết phòng (${skipVotes}/${totalListeners} phiếu)!`, '⏭️');
      this.endVoteWindow(true);
      this.playNextTrack('vote_skip');
      return true;
    }

    return false;
  }

  async playNextTrack(reason = 'normal') {
    if (this.trackEndTimer) {
      clearTimeout(this.trackEndTimer);
      this.trackEndTimer = null;
    }

    if (this.activeVote.active) {
      this.endVoteWindow(false);
    }

    let nextTrack = null;

    if (this.queue.length > 0) {
      nextTrack = this.queue.shift();
      nextTrack.startTime = Date.now();
      this.currentTrack = nextTrack;

      console.log(`[Room ${this.slug}] Playing user track: "${nextTrack.title}" (${nextTrack.duration}s) by ${nextTrack.requestedBy}`);

      // Record to song history
      db.addSongHistory({
        roomSlug: this.slug,
        videoId: nextTrack.videoId,
        title: nextTrack.title,
        author: nextTrack.author,
        thumbnail: nextTrack.thumbnail,
        duration: nextTrack.duration,
        requestedById: nextTrack.requestedById,
        requestedByName: nextTrack.requestedBy,
        isDefault: false
      });

      // Save state
      db.saveRoomState(this.slug, this.currentTrack, this.queue);

      // Notify clients
      if (this.io) {
        this.io.to(this.getRoomSocketNamespace()).emit('track_started', {
          slug: this.slug,
          track: this.currentTrack,
          queue: this.queue,
          voteWindow: {
            active: true,
            trackId: nextTrack.id,
            duration: env.VOTE_WINDOW_DURATION_SEC,
            skipCount: 0,
            keepCount: 0,
            totalListeners: this.getOnlineCount()
          }
        });
      }

      this.startVoteWindow(nextTrack.id);

      // Schedule next track timer
      const trackDurationMs = (nextTrack.duration || 240) * 1000;
      this.trackEndTimer = setTimeout(() => {
        this.playNextTrack('timer_end');
      }, trackDurationMs);

    } else {
      // No more songs in queue -> Enter waiting state
      this.currentTrack = null;
      db.saveRoomState(this.slug, null, []);

      console.log(`[Room ${this.slug}] Queue empty. Waiting for users to add songs.`);

      if (this.io) {
        this.io.to(this.getRoomSocketNamespace()).emit('station_state_update', {
          slug: this.slug,
          currentTrack: null,
          queue: [],
          activeVote: { active: false },
          onlineCount: this.getOnlineCount()
        });
      }
    }
  }

  // Add song to room
  async addTrack(trackData, user) {
    const isRoomEmpty = !this.currentTrack;

    if (isRoomEmpty) {
      trackData.startTime = Date.now();
      this.currentTrack = trackData;

      console.log(`[Room ${this.slug}] First track added! Playing: "${trackData.title}"`);

      // Record to history
      db.addSongHistory({
        roomSlug: this.slug,
        videoId: trackData.videoId,
        title: trackData.title,
        author: trackData.author,
        thumbnail: trackData.thumbnail,
        duration: trackData.duration,
        requestedById: trackData.requestedById,
        requestedByName: trackData.requestedBy,
        isDefault: false
      });

      db.saveRoomState(this.slug, this.currentTrack, this.queue);

      if (this.io) {
        this.io.to(this.getRoomSocketNamespace()).emit('track_started', {
          slug: this.slug,
          track: this.currentTrack,
          queue: this.queue,
          voteWindow: {
            active: true,
            trackId: trackData.id,
            duration: env.VOTE_WINDOW_DURATION_SEC,
            skipCount: 0,
            keepCount: 0,
            totalListeners: this.getOnlineCount()
          }
        });
      }

      this.startVoteWindow(trackData.id);

      const trackDurationMs = (trackData.duration || 240) * 1000;
      this.trackEndTimer = setTimeout(() => {
        this.playNextTrack('timer_end');
      }, trackDurationMs);

    } else {
      this.queue.push(trackData);
      db.saveRoomState(this.slug, this.currentTrack, this.queue);

      if (this.io) {
        this.io.to(this.getRoomSocketNamespace()).emit('queue_updated', {
          slug: this.slug,
          queue: this.queue
        });
      }
    }
  }

  getUserCooldownInfo(userId, role) {
    if (role === 'ADMIN') {
      return { canAdd: true, remainingSeconds: 0, isAdmin: true };
    }

    const lastAdd = this.userCooldowns[userId];
    if (!lastAdd) {
      return { canAdd: true, remainingSeconds: 0, isFirstBonus: true };
    }

    const durationMs = (role === 'VIP' || role === 'DJ') 
      ? env.VIP_COOLDOWN_DURATION_MS 
      : env.COOLDOWN_DURATION_MS;

    const elapsed = Date.now() - lastAdd;
    if (elapsed >= durationMs) {
      return { canAdd: true, remainingSeconds: 0 };
    }

    const remainingSec = Math.ceil((durationMs - elapsed) / 1000);
    return { canAdd: false, remainingSeconds: remainingSec };
  }

  applyUserCooldown(userId, role) {
    if (role === 'ADMIN') return;
    this.userCooldowns[userId] = Date.now();
  }

  registerVote(userId, voteType) {
    if (!this.activeVote.active) return false;

    // Remove user previous votes
    this.activeVote.votesSkip = this.activeVote.votesSkip.filter(id => id !== userId);
    this.activeVote.votesKeep = this.activeVote.votesKeep.filter(id => id !== userId);

    if (voteType === 'skip') {
      this.activeVote.votesSkip.push(userId);
    } else if (voteType === 'keep') {
      this.activeVote.votesKeep.push(userId);
    }

    // Check if threshold reached
    if (this.checkVoteThreshold()) {
      return true;
    }

    // Broadcast updated vote counts
    if (this.io) {
      this.io.to(this.getRoomSocketNamespace()).emit('vote_counts_updated', {
        trackId: this.activeVote.trackId,
        skipCount: this.activeVote.votesSkip.length,
        keepCount: this.activeVote.votesKeep.length,
        totalListeners: this.getOnlineCount()
      });
    }

    return true;
  }

  adminInstantSkip() {
    this.broadcastSystemMessage('⚡ Quản trị viên / Chủ phòng đã chuyển sang bài hát tiếp theo!', '⚡');
    this.endVoteWindow(true);
    this.playNextTrack('admin_skip');
  }

  addUser(socket, user) {
    this.users[socket.id] = {
      socketId: socket.id,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      isGuest: user.isGuest
    };
    socket.join(this.getRoomSocketNamespace());
    this.broadcastRoomState();
  }

  removeUser(socketId) {
    if (this.users[socketId]) {
      delete this.users[socketId];
      this.broadcastRoomState();
    }
  }

  async verifyPassword(password) {
    if (!this.isPrivate || !this.passwordHash) return true;
    if (!password) return false;
    return await bcrypt.compare(String(password), this.passwordHash);
  }

  getSummary() {
    return {
      id: this.id,
      slug: this.slug,
      name: this.name,
      description: this.description,
      genre: this.genre,
      coverUrl: this.coverUrl,
      creatorId: this.creatorId,
      creatorName: this.creatorName,
      isPrivate: this.isPrivate,
      hasPassword: !!this.passwordHash,
      isDefault: this.isDefault,
      onlineCount: this.getOnlineCount(),
      currentTrack: this.currentTrack,
      queue: this.queue
    };
  }

  destroy() {
    if (this.trackEndTimer) clearTimeout(this.trackEndTimer);
    if (this.activeVote.timer) clearTimeout(this.activeVote.timer);
  }
}

// ==========================================
// Master Room Manager Class
// ==========================================
class RoomManager {
  constructor() {
    this.rooms = new Map(); // slug -> RoomInstance
    this.io = null;
  }

  async initAllRooms(io) {
    this.io = io;
    console.log('⚡ Initializing Multi-Room Hub from Supabase PostgreSQL...');

    try {
      const dbRooms = await db.getAllRooms();
      dbRooms.forEach(r => {
        const instance = new RoomInstance(r, this.io);
        this.rooms.set(r.slug, instance);
      });
      console.log(`✅ Loaded ${this.rooms.size} active user room(s)!`);
    } catch (err) {
      console.error('❌ Failed to load rooms from DB:', err.message);
    }
  }

  getRoom(slug) {
    return this.rooms.get(slug) || null;
  }

  getAllRoomsSummary() {
    return this.getAllRoomsList();
  }

  getAllRoomsList() {
    const list = [];
    for (const [slug, room] of this.rooms.entries()) {
      list.push({
        id: room.id,
        slug: room.slug,
        name: room.name,
        description: room.description,
        genre: room.genre,
        coverUrl: room.coverUrl,
        creatorId: room.creatorId,
        creatorName: room.creatorName,
        isPrivate: room.isPrivate,
        hasPassword: !!room.passwordHash,
        isDefault: room.isDefault,
        onlineCount: room.getOnlineCount(),
        currentTrack: room.currentTrack ? {
          title: room.currentTrack.title,
          author: room.currentTrack.author,
          thumbnail: room.currentTrack.thumbnail,
          duration: room.currentTrack.duration
        } : null
      });
    }
    return list;
  }

  async createRoom({ name, description, genre, coverUrl, isPrivate, password, creatorId, creatorName }) {
    // Generate clean unique slug
    let baseSlug = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (!baseSlug) baseSlug = 'music-room-' + Math.floor(1000 + Math.random() * 9000);
    let slug = baseSlug;
    let count = 1;

    while (this.rooms.has(slug)) {
      slug = `${baseSlug}-${count++}`;
    }

    let passwordHash = null;
    if (isPrivate && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const created = await db.createRoom({
      slug,
      name,
      description: description || '',
      genre: genre || 'Phòng Nhạc Tự Do',
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80',
      isPrivate: !!isPrivate,
      passwordHash,
      creatorId,
      creatorName: creatorName || 'Member',
      isDefault: false
    });

    const instance = new RoomInstance(created, this.io);
    this.rooms.set(slug, instance);

    this.broadcastLobbyUpdate();
    return created;
  }

  async deleteRoom(slug, requesterUser) {
    const room = this.rooms.get(slug);
    if (!room) throw new Error('Phòng nhạc không tồn tại!');

    const isOwner = (requesterUser && (requesterUser.id === room.creatorId || requesterUser.role === 'ADMIN'));
    if (!isOwner) {
      throw new Error('Bạn không có quyền xoá phòng nhạc này!');
    }

    room.destroy();
    this.rooms.delete(slug);
    await db.deleteRoom(slug);

    this.broadcastLobbyUpdate();
    return true;
  }

  broadcastLobbyUpdate() {
    if (this.io) {
      this.io.emit('lobby_rooms_update', this.getAllRoomsList());
    }
  }
}

const roomManager = new RoomManager();

module.exports = {
  roomManager,
  RoomInstance,
  extractYouTubeId,
  fetchYouTubeMetadata
};
