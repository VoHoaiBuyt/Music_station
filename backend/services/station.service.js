const db = require('../config/db');
const env = require('../config/env');

const DEFAULT_PLAYLIST = [
  {
    videoId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio 📚 - beats to relax/study to',
    author: 'Lofi Girl',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    duration: 300,
    requestedBy: 'Station Radio',
    requestedById: null,
    isDefault: true
  },
  {
    videoId: '5qap5aO4i9A',
    title: 'lofi hip hop radio 💤 - beats to sleep/chill to',
    author: 'Lofi Girl',
    thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    duration: 300,
    requestedBy: 'Station Radio',
    requestedById: null,
    isDefault: true
  },
  {
    videoId: 'TURbeWK2wwg',
    title: 'Tokyo Night Drive 🌃 - Lofi Beats to Chill / Relax',
    author: 'ChillHop Station',
    thumbnail: 'https://i.ytimg.com/vi/TURbeWK2wwg/hqdefault.jpg',
    duration: 240,
    requestedBy: 'Station Radio',
    requestedById: null,
    isDefault: true
  },
  {
    videoId: 'DWcJFNfaw90',
    title: 'Coffee Shop Lofi ☕ Chill relaxing beats',
    author: 'Lofi Vibes',
    thumbnail: 'https://i.ytimg.com/vi/DWcJFNfaw90/hqdefault.jpg',
    duration: 260,
    requestedBy: 'Station Radio',
    requestedById: null,
    isDefault: true
  }
];

class StationService {
  constructor() {
    this.io = null;
    this.defaultPlaylistIndex = 0;
    this.state = {
      currentTrack: null,
      queue: [],
      users: {},
      userCooldowns: {},
      chatHistory: [],
      activeVote: {
        active: false,
        trackId: null,
        startTime: 0,
        duration: env.VOTE_WINDOW_DURATION_SEC,
        votesSkip: [],
        votesKeep: [],
        timer: null
      },
      trackEndTimer: null
    };

    this.loadInitialChatFromDB();
  }

  setIO(io) {
    this.io = io;
  }

  async loadInitialChatFromDB() {
    try {
      const messages = await db.getRecentChat(30);
      if (messages && messages.length > 0) {
        this.state.chatHistory = messages.map(m => ({
          id: m.id,
          userId: m.userId,
          username: m.username,
          avatar: m.avatar,
          text: m.text,
          type: m.type,
          timestamp: new Date(m.createdAt).getTime()
        }));
      }
    } catch (err) {
      console.warn('[Station] Notice: Initial chat history from DB:', err.message);
    }
  }

  extractYouTubeId(urlOrId) {
    if (!urlOrId || typeof urlOrId !== 'string') return null;
    const trimmed = urlOrId.trim();

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = trimmed.match(regex);
    return match ? match[1] : null;
  }

  async fetchYouTubeMetadata(videoId) {
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

  getOnlineUserCount() {
    const uniqueUsers = new Set(Object.values(this.state.users).map(u => u.userId));
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

    this.state.chatHistory.push(msg);
    if (this.state.chatHistory.length > 100) this.state.chatHistory.shift();

    if (this.io) {
      this.io.emit('chat_message', msg);
    }
  }

  broadcastStationState() {
    if (!this.io) return;
    const elapsed = this.state.currentTrack ? Math.max(0, (Date.now() - this.state.currentTrack.startTime) / 1000) : 0;

    this.io.emit('station_state_update', {
      currentTrack: this.state.currentTrack ? {
        ...this.state.currentTrack,
        elapsed
      } : null,
      queue: this.state.queue,
      activeVote: this.state.activeVote.active ? {
        active: true,
        trackId: this.state.activeVote.trackId,
        remainingSec: Math.max(0, env.VOTE_WINDOW_DURATION_SEC - (Date.now() - this.state.activeVote.startTime) / 1000),
        duration: env.VOTE_WINDOW_DURATION_SEC,
        skipCount: this.state.activeVote.votesSkip.length,
        keepCount: this.state.activeVote.votesKeep.length,
        totalListeners: this.getOnlineUserCount()
      } : { active: false },
      onlineCount: this.getOnlineUserCount()
    });
  }

  startVoteWindow(trackId) {
    if (this.state.activeVote.timer) {
      clearTimeout(this.state.activeVote.timer);
      this.state.activeVote.timer = null;
    }

    this.state.activeVote = {
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
      totalListeners: this.getOnlineUserCount()
    };

    if (this.io) {
      this.io.emit('vote_window_opened', votePayload);
    }

    this.state.activeVote.timer = setTimeout(() => {
      this.endVoteWindow(false);
    }, env.VOTE_WINDOW_DURATION_SEC * 1000);
  }

  endVoteWindow(wasSkipped = false) {
    if (!this.state.activeVote.active) return;

    if (this.state.activeVote.timer) {
      clearTimeout(this.state.activeVote.timer);
      this.state.activeVote.timer = null;
    }

    const finalSkip = this.state.activeVote.votesSkip.length;
    const finalKeep = this.state.activeVote.votesKeep.length;
    const trackId = this.state.activeVote.trackId;

    this.state.activeVote.active = false;

    if (this.io) {
      this.io.emit('vote_window_closed', {
        trackId,
        wasSkipped,
        skipCount: finalSkip,
        keepCount: finalKeep,
        totalListeners: this.getOnlineUserCount()
      });
    }
  }

  checkVoteThreshold() {
    if (!this.state.activeVote.active) return false;

    const totalListeners = this.getOnlineUserCount();
    const skipVotes = this.state.activeVote.votesSkip.length;
    const threshold = Math.max(1, Math.floor(totalListeners / 2) + 1);

    if (skipVotes >= threshold) {
      const trackTitle = this.state.currentTrack ? this.state.currentTrack.title : 'Current Track';
      this.broadcastSystemMessage(`⏭️ Bài hát "${trackTitle}" đã bị bỏ qua bởi biểu quyết (${skipVotes}/${totalListeners} phiếu)!`, '⏭️');
      this.endVoteWindow(true);
      this.playNextTrack('vote_skip');
      return true;
    }

    return false;
  }

  async playNextTrack(reason = 'normal') {
    if (this.state.trackEndTimer) {
      clearTimeout(this.state.trackEndTimer);
      this.state.trackEndTimer = null;
    }

    if (this.state.activeVote.active) {
      this.endVoteWindow(false);
    }

    let nextTrack = null;

    if (this.state.queue.length > 0) {
      nextTrack = this.state.queue.shift();
    } else {
      const def = DEFAULT_PLAYLIST[this.defaultPlaylistIndex % DEFAULT_PLAYLIST.length];
      this.defaultPlaylistIndex++;
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

    this.state.currentTrack = nextTrack;

    this.broadcastSystemMessage(`🎵 Đang phát: "${nextTrack.title}" (${nextTrack.isDefault ? 'Station Radio' : 'yêu cầu bởi ' + nextTrack.requestedBy})`, '📻');

    // Save to PostgreSQL Supabase Database asynchronously
    db.addSongHistory(nextTrack).catch(err => console.warn('[DB] Song history error:', err.message));

    // Start 10s vote window for the new track
    this.startVoteWindow(nextTrack.id);

    if (this.io) {
      this.io.emit('track_started', {
        track: {
          ...nextTrack,
          elapsed: 0
        },
        queue: this.state.queue,
        voteWindow: {
          active: true,
          trackId: nextTrack.id,
          duration: env.VOTE_WINDOW_DURATION_SEC,
          totalListeners: this.getOnlineUserCount()
        }
      });
    }

    this.state.trackEndTimer = setTimeout(() => {
      if (this.state.currentTrack && this.state.currentTrack.id === nextTrack.id) {
        this.playNextTrack('timer_ended');
      }
    }, (nextTrack.duration + 5) * 1000);
  }

  getUserCooldownInfo(userId, role = 'USER') {
    if (!userId) return { hasUsedFirstTimeBonus: false, remainingSeconds: 0, canAdd: true };

    if (!this.state.userCooldowns[userId]) {
      this.state.userCooldowns[userId] = {
        hasUsedFirstTimeBonus: false,
        nextAvailableTime: 0
      };
    }

    const userCooldown = this.state.userCooldowns[userId];
    const now = Date.now();

    if (role === 'ADMIN') {
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

    this.state.userCooldowns[userId] = {
      hasUsedFirstTimeBonus: true,
      nextAvailableTime: Date.now() + cooldownDuration
    };
  }

  initStation() {
    if (!this.state.currentTrack) {
      this.playNextTrack('init');
    }
  }
}

const stationService = new StationService();

module.exports = stationService;
