const bcrypt = require('bcryptjs');
const db = require('../config/db');
const env = require('../config/env');

// Genre-specific curated playlists for continuous background streaming
const GENRE_PLAYLISTS = {
  'Lofi & Chill': [
    { videoId: 'jfKfPfyJRdk', title: 'lofi hip hop radio 📚 - beats to relax/study to', author: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg', duration: 300 },
    { videoId: '5qap5aO4i9A', title: 'lofi hip hop radio 💤 - beats to sleep/chill to', author: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg', duration: 300 },
    { videoId: 'DWcJFNfaw90', title: 'Coffee Shop Lofi ☕ Chill relaxing beats', author: 'Lofi Vibes', thumbnail: 'https://i.ytimg.com/vi/DWcJFNfaw90/hqdefault.jpg', duration: 260 },
    { videoId: 'rUxyKA_-grg', title: 'Japanese Garden Lofi 🌸 Peaceful Beats', author: 'Chill Garden', thumbnail: 'https://i.ytimg.com/vi/rUxyKA_-grg/hqdefault.jpg', duration: 270 }
  ],
  'Cyberpunk & Synth': [
    { videoId: 'TURbeWK2wwg', title: 'Tokyo Night Drive 🌃 - Synth & Lofi Chill', author: 'ChillHop Station', thumbnail: 'https://i.ytimg.com/vi/TURbeWK2wwg/hqdefault.jpg', duration: 240 },
    { videoId: '4xDzrJKXOOY', title: 'synthwave radio 🌌 - chill synth / retro beats', author: 'Lofi Girl Synth', thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg', duration: 300 },
    { videoId: 'wOmw_dYcQhM', title: 'Cyberpunk Night City Chill ⚡ Neon Ambience', author: 'Cyber Sound', thumbnail: 'https://i.ytimg.com/vi/wOmw_dYcQhM/hqdefault.jpg', duration: 280 }
  ],
  'Coffee & Acoustic': [
    { videoId: 'DWcJFNfaw90', title: 'Coffee Shop Lofi ☕ Chill relaxing beats', author: 'Lofi Vibes', thumbnail: 'https://i.ytimg.com/vi/DWcJFNfaw90/hqdefault.jpg', duration: 260 },
    { videoId: 'kgx4WGK0oNU', title: 'Jazz & Bossa Nova Cafe Music ☕ Relaxing Vibes', author: 'Cafe Music BGM', thumbnail: 'https://i.ytimg.com/vi/kgx4WGK0oNU/hqdefault.jpg', duration: 320 },
    { videoId: 'lP26UCnoHgo', title: 'Acoustic Guitar Morning Chill 🎸', author: 'Acoustic Morning', thumbnail: 'https://i.ytimg.com/vi/lP26UCnoHgo/hqdefault.jpg', duration: 260 }
  ],
  'Anime & Piano': [
    { videoId: 'M_fSg-zJ1eA', title: 'Studio Ghibli Piano Collection 🌸 Peaceful Piano', author: 'Ghibli Relax', thumbnail: 'https://i.ytimg.com/vi/M_fSg-zJ1eA/hqdefault.jpg', duration: 300 },
    { videoId: 'W3q8Od5qJio', title: 'Relaxing Anime Piano Solos 🎹 Nostalgic Melodies', author: 'Animenz Piano', thumbnail: 'https://i.ytimg.com/vi/W3q8Od5qJio/hqdefault.jpg', duration: 280 },
    { videoId: 'dx41hZ1JqT8', title: 'Your Name (Kimi no Na wa) Piano Medley ✨', author: 'Theishter', thumbnail: 'https://i.ytimg.com/vi/dx41hZ1JqT8/hqdefault.jpg', duration: 310 }
  ]
};

const DEFAULT_FALLBACK_TRACKS = GENRE_PLAYLISTS['Lofi & Chill'];

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
// Independent Room Instance Class
// ==========================================
class RoomInstance {
  constructor(roomData, io) {
    this.io = io;
    this.id = roomData.id;
    this.slug = roomData.slug;
    this.name = roomData.name;
    this.description = roomData.description || '';
    this.genre = roomData.genre || 'Lofi & Chill';
    this.coverUrl = roomData.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80';
    this.isPrivate = !!roomData.isPrivate;
    this.passwordHash = roomData.passwordHash || null;
    this.creatorId = roomData.creatorId;
    this.creatorName = roomData.creatorName || 'Station Master';
    this.isDefault = !!roomData.isDefault;

    this.defaultIndex = 0;
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

  getPlaylistForGenre() {
    return GENRE_PLAYLISTS[this.genre] || DEFAULT_FALLBACK_TRACKS;
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

  // Restore or start initial playback
  initPlayback(savedTrack) {
    if (savedTrack && savedTrack.videoId && savedTrack.startTime) {
      const now = Date.now();
      const elapsed = (now - savedTrack.startTime) / 1000;
      const duration = savedTrack.duration || 240;

      // If saved track is still within duration window, continue playing!
      if (elapsed < duration) {
        this.currentTrack = savedTrack;
        const remainingMs = Math.max(1000, (duration - elapsed) * 1000);
        
        console.log(`[Room ${this.slug}] Restored playing track: "${savedTrack.title}" (${Math.floor(elapsed)}s / ${duration}s)`);

        this.trackEndTimer = setTimeout(() => {
          this.playNextTrack('restored_timer_end');
        }, remainingMs);
        return;
      }
    }

    // Otherwise, immediately launch next track from queue or default genre playlist
    this.playNextTrack('init');
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
    } else {
      const playlist = this.getPlaylistForGenre();
      const def = playlist[this.defaultIndex % playlist.length];
      this.defaultIndex++;
      nextTrack = {
        ...def,
        id: 'def_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        requestedBy: 'Station Radio',
        requestedById: null,
        isDefault: true
      };
    }

    nextTrack.startTime = Date.now();
    if (!nextTrack.duration || nextTrack.duration <= 0) {
      nextTrack.duration = 240;
    }

    this.currentTrack = nextTrack;

    // PERSISTENCE: Save room state to PostgreSQL Supabase
    db.saveRoomState(this.slug, this.currentTrack, this.queue);
    db.addSongHistory(this.slug, nextTrack).catch(() => {});

    this.broadcastSystemMessage(`🎵 Đang phát: "${nextTrack.title}" (${nextTrack.isDefault ? 'Station Radio' : 'yêu cầu bởi ' + nextTrack.requestedBy})`, '📻');

    this.startVoteWindow(nextTrack.id);

    if (this.io) {
      this.io.to(this.getRoomSocketNamespace()).emit('track_started', {
        slug: this.slug,
        track: {
          ...nextTrack,
          elapsed: 0
        },
        queue: this.queue,
        voteWindow: {
          active: true,
          trackId: nextTrack.id,
          duration: env.VOTE_WINDOW_DURATION_SEC,
          totalListeners: this.getOnlineCount()
        }
      });
    }

    this.trackEndTimer = setTimeout(() => {
      if (this.currentTrack && this.currentTrack.id === nextTrack.id) {
        this.playNextTrack('timer_ended');
      }
    }, (nextTrack.duration + 5) * 1000);
  }

  getUserCooldownInfo(userId, role = 'USER') {
    if (!userId) return { hasUsedFirstTimeBonus: false, remainingSeconds: 0, canAdd: true };

    if (!this.userCooldowns[userId]) {
      this.userCooldowns[userId] = {
        hasUsedFirstTimeBonus: false,
        nextAvailableTime: 0
      };
    }

    const userCooldown = this.userCooldowns[userId];
    const now = Date.now();

    if (role === 'ADMIN' || userId === this.creatorId) {
      return {
        hasUsedFirstTimeBonus: true,
        remainingSeconds: 0,
        canAdd: true,
        isFirstBonus: false,
        isAdmin: true
      };
    }

    if (!userCooldown.hasUsedFirstTimeBonus) {
      return {
        hasUsedFirstTimeBonus: false,
        remainingSeconds: 0,
        canAdd: true,
        isFirstBonus: true
      };
    }

    const remainingMs = Math.max(0, userCooldown.nextAvailableTime - now);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    return {
      hasUsedFirstTimeBonus: true,
      remainingSeconds,
      canAdd: remainingSeconds <= 0,
      nextAvailableTime: userCooldown.nextAvailableTime,
      isFirstBonus: false
    };
  }

  applyUserCooldown(userId, role = 'USER') {
    if (!userId) return;
    const cooldownDuration = (role === 'VIP' || role === 'DJ') 
      ? env.VIP_COOLDOWN_DURATION_MS 
      : env.COOLDOWN_DURATION_MS;

    this.userCooldowns[userId] = {
      hasUsedFirstTimeBonus: true,
      nextAvailableTime: Date.now() + cooldownDuration
    };
  }

  // Get Room Summary for Lobby Explorer
  getSummary() {
    const elapsed = this.currentTrack ? Math.max(0, (Date.now() - this.currentTrack.startTime) / 1000) : 0;
    return {
      id: this.id,
      slug: this.slug,
      name: this.name,
      description: this.description,
      genre: this.genre,
      coverUrl: this.coverUrl,
      isPrivate: this.isPrivate,
      creatorName: this.creatorName,
      creatorId: this.creatorId,
      isDefault: this.isDefault,
      onlineCount: this.getOnlineCount(),
      queueLength: this.queue.length,
      currentTrack: this.currentTrack ? {
        title: this.currentTrack.title,
        author: this.currentTrack.author,
        thumbnail: this.currentTrack.thumbnail,
        duration: this.currentTrack.duration,
        elapsed
      } : null
    };
  }
}

// ==========================================
// Central Multi-Room Manager Class
// ==========================================
class RoomManager {
  constructor() {
    this.io = null;
    this.rooms = new Map(); // slug -> RoomInstance
  }

  async initAllRooms(io) {
    this.io = io;
    console.log('⚡ Initializing Multi-Room Engine from Supabase PostgreSQL...');

    const dbRooms = await db.getAllRooms();
    this.rooms.clear();

    for (const r of dbRooms) {
      const instance = new RoomInstance(r, this.io);
      this.rooms.set(r.slug, instance);
    }

    console.log(`✅ Loaded ${this.rooms.size} active music rooms running independently!`);
  }

  getRoom(slug) {
    return this.rooms.get(slug) || null;
  }

  getAllRoomsSummary() {
    const list = [];
    for (const r of this.rooms.values()) {
      list.push(r.getSummary());
    }
    return list;
  }

  async createRoom({ name, description, genre, coverUrl, isPrivate, password, user }) {
    if (!name || name.trim().length < 3) {
      throw { statusCode: 400, message: 'Tên phòng phải có ít nhất 3 ký tự!' };
    }

    const cleanName = name.trim();
    // Generate clean unique slug
    let baseSlug = cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (!baseSlug) baseSlug = 'room';
    let slug = baseSlug;
    let counter = 1;

    while (this.rooms.has(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    let passwordHash = null;
    if (isPrivate && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const newRoomRecord = await db.createRoom({
      slug,
      name: cleanName,
      description: description || '',
      genre: genre ? genre.trim() : 'Lofi & Chill',
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80',
      isPrivate: !!isPrivate,
      passwordHash,
      creatorId: user ? user.id : null,
      creatorName: user ? user.username : 'User'
    });

    const instance = new RoomInstance(newRoomRecord, this.io);
    this.rooms.set(slug, instance);

    // Notify Lobby
    this.broadcastLobbyUpdate();

    return instance.getSummary();
  }

  async deleteRoom(slug, userId, userRole) {
    const room = this.rooms.get(slug);
    if (!room) {
      throw { statusCode: 404, message: 'Phòng không tồn tại!' };
    }

    if (room.isDefault) {
      throw { statusCode: 403, message: 'Không thể xoá các phòng mặc định của hệ thống!' };
    }

    if (userRole !== 'ADMIN' && room.creatorId !== userId) {
      throw { statusCode: 403, message: 'Chỉ chủ phòng hoặc Quản trị viên mới có quyền xoá phòng!' };
    }

    // Stop timers
    if (room.trackEndTimer) clearTimeout(room.trackEndTimer);
    if (room.activeVote.timer) clearTimeout(room.activeVote.timer);

    await db.deleteRoom(slug, userId, userRole);
    this.rooms.delete(slug);

    this.broadcastLobbyUpdate();
    return { success: true };
  }

  broadcastLobbyUpdate() {
    if (this.io) {
      this.io.emit('lobby_rooms_update', this.getAllRoomsSummary());
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
