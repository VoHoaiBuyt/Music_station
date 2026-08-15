/**
 * YouTube Music Station - Production Client Application
 * Synchronized Player, PostgreSQL Auth / JWT, 10s Vote Skip Window, 5-Min Cooldown, Favorites & Live Chat
 */

// ==========================================
// 1. Auth & Local State Management
// ==========================================
let authToken = localStorage.getItem('station_jwt_token') || null;
let currentUser = null;
let userFavorites = [];

function getOrCreateGuestId() {
  let gid = localStorage.getItem('station_guest_id');
  if (!gid) {
    gid = 'guest_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem('station_guest_id', gid);
  }
  return gid;
}

const localUser = {
  guestId: getOrCreateGuestId(),
  volume: parseInt(localStorage.getItem('station_volume') || '80', 10),
  isMuted: false
};

const stationState = {
  currentTrack: null,
  queue: [],
  onlineCount: 1,
  voteWindow: {
    active: false,
    trackId: null,
    duration: 10,
    remainingSec: 0,
    skipCount: 0,
    keepCount: 0,
    totalListeners: 1,
    userVote: null,
    timerInterval: null
  },
  cooldown: {
    canAdd: true,
    hasUsedFirstTimeBonus: false,
    remainingSeconds: 0,
    isFirstBonus: true,
    timerInterval: null
  },
  serverTimeOffset: 0
};

// ==========================================
// 2. DOM Elements Cache
// ==========================================
const DOM = {
  // Header & Auth
  syncStatusPill: document.getElementById('syncStatusPill'),
  syncStatusText: document.getElementById('syncStatusText'),
  listenerCount: document.getElementById('listenerCount'),
  btnOpenAuthModal: document.getElementById('btnOpenAuthModal'),
  profileBtn: document.getElementById('profileBtn'),
  headerAvatar: document.getElementById('headerAvatar'),
  headerUsername: document.getElementById('headerUsername'),
  headerRoleBadge: document.getElementById('headerRoleBadge'),
  headerLevelTag: document.getElementById('headerLevelTag'),

  // Stage & Player
  voteBanner: document.getElementById('voteBanner'),
  voteCountdownTimer: document.getElementById('voteCountdownTimer'),
  voteProgressBar: document.getElementById('voteProgressBar'),
  voteThresholdNote: document.getElementById('voteThresholdNote'),
  btnVoteKeep: document.getElementById('btnVoteKeep'),
  btnVoteSkip: document.getElementById('btnVoteSkip'),
  keepCountBadge: document.getElementById('keepCountBadge'),
  skipCountBadge: document.getElementById('skipCountBadge'),

  unmuteNotice: document.getElementById('unmuteNotice'),
  btnUnmute: document.getElementById('btnUnmute'),

  viewVinylBtn: document.getElementById('viewVinylBtn'),
  viewVideoBtn: document.getElementById('viewVideoBtn'),
  btnAdminInstantSkip: document.getElementById('btnAdminInstantSkip'),
  turntableWrapper: document.getElementById('turntableWrapper'),
  videoContainer: document.getElementById('videoContainer'),
  vinylDisc: document.getElementById('vinylDisc'),
  tonearm: document.getElementById('tonearm'),
  vinylArtwork: document.getElementById('vinylArtwork'),

  nowPlayingThumb: document.getElementById('nowPlayingThumb'),
  sourceBadge: document.getElementById('sourceBadge'),
  requestedByBadge: document.getElementById('requestedByBadge'),
  btnToggleFavorite: document.getElementById('btnToggleFavorite'),
  favIcon: document.getElementById('favIcon'),
  nowPlayingTitle: document.getElementById('nowPlayingTitle'),
  nowPlayingAuthor: document.getElementById('nowPlayingAuthor'),
  timeElapsed: document.getElementById('timeElapsed'),
  timeDuration: document.getElementById('timeDuration'),
  progressBarFill: document.getElementById('progressBarFill'),
  progressBarBg: document.getElementById('progressBarBg'),

  volumeMuteBtn: document.getElementById('volumeMuteBtn'),
  volumeIcon: document.getElementById('volumeIcon'),
  volumeSlider: document.getElementById('volumeSlider'),
  volumeValue: document.getElementById('volumeValue'),
  btnResync: document.getElementById('btnResync'),
  btnOpenAddModal: document.getElementById('btnOpenAddModal'),

  // Tabs & Sidepanel
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  queueCountBadge: document.getElementById('queueCountBadge'),
  tabCooldownPill: document.getElementById('tabCooldownPill'),
  favCountBadge: document.getElementById('favCountBadge'),

  // Chat
  chatMessages: document.getElementById('chatMessages'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('chatInput'),
  reactionBtns: document.querySelectorAll('.react-emoji-btn'),
  reactionContainer: document.getElementById('reactionContainer'),

  // Queue
  queueList: document.getElementById('queueList'),
  btnOpenAddFromQueue: document.getElementById('btnOpenAddFromQueue'),

  // Add Song
  cooldownCard: document.getElementById('cooldownCard'),
  cooldownIcon: document.getElementById('cooldownIcon'),
  cooldownTitle: document.getElementById('cooldownTitle'),
  cooldownSubtitle: document.getElementById('cooldownSubtitle'),
  cooldownTimerDisplay: document.getElementById('cooldownTimerDisplay'),
  addSongForm: document.getElementById('addSongForm'),
  songUrlInput: document.getElementById('songUrlInput'),
  btnSubmitAdd: document.getElementById('btnSubmitAdd'),
  btnSubmitAddText: document.getElementById('btnSubmitAddText'),
  pickChips: document.querySelectorAll('.pick-chip'),

  // Favorites Tab
  favoritesList: document.getElementById('favoritesList'),
  favEmptyState: document.getElementById('favEmptyState'),

  // Auth Modal
  authModal: document.getElementById('authModal'),
  closeAuthModal: document.getElementById('closeAuthModal'),
  authTabLogin: document.getElementById('authTabLogin'),
  authTabRegister: document.getElementById('authTabRegister'),
  authAlert: document.getElementById('authAlert'),
  loginForm: document.getElementById('loginForm'),
  loginInput: document.getElementById('loginInput'),
  loginPasswordInput: document.getElementById('loginPasswordInput'),
  btnLoginSubmit: document.getElementById('btnLoginSubmit'),
  registerForm: document.getElementById('registerForm'),
  regUsernameInput: document.getElementById('regUsernameInput'),
  regEmailInput: document.getElementById('regEmailInput'),
  regPasswordInput: document.getElementById('regPasswordInput'),
  regAvatarOptions: document.getElementById('regAvatarOptions'),
  btnRegisterSubmit: document.getElementById('btnRegisterSubmit'),

  // Profile Modal
  profileModal: document.getElementById('profileModal'),
  closeProfileModal: document.getElementById('closeProfileModal'),
  modalProfileAvatar: document.getElementById('modalProfileAvatar'),
  modalProfileUsername: document.getElementById('modalProfileUsername'),
  modalProfileRoleBadge: document.getElementById('modalProfileRoleBadge'),
  modalProfileEmail: document.getElementById('modalProfileEmail'),
  modalProfileLevel: document.getElementById('modalProfileLevel'),
  modalProfileXp: document.getElementById('modalProfileXp'),
  modalProfileXpFill: document.getElementById('modalProfileXpFill'),
  modalTotalRequests: document.getElementById('modalTotalRequests'),
  modalTotalFavorites: document.getElementById('modalTotalFavorites'),
  modalCooldownBonus: document.getElementById('modalCooldownBonus'),
  avatarOptions: document.getElementById('avatarOptions'),
  profileUsernameInput: document.getElementById('profileUsernameInput'),
  btnSaveProfile: document.getElementById('btnSaveProfile'),
  btnLogout: document.getElementById('btnLogout'),

  // Toast
  toastContainer: document.getElementById('toastContainer')
};

let selectedRegAvatar = '🎧';
let selectedProfileAvatar = '🎧';

// ==========================================
// 3. YouTube Player Management
// ==========================================
let ytPlayer = null;
let ytReady = false;
let playbackSyncInterval = null;

window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new YT.Player('youtubePlayer', {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      playsinline: 1,
      enablejsapi: 1,
      origin: window.location.origin
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
};

function onPlayerReady(event) {
  ytReady = true;
  event.target.setVolume(localUser.volume || 80);
  if (localUser.isMuted) {
    event.target.mute();
  } else {
    event.target.unMute();
  }

  if (stationState.currentTrack) {
    playCurrentStationTrack();
  }
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    DOM.unmuteNotice.classList.remove('active');
    DOM.vinylDisc.classList.add('is-spinning');
    DOM.tonearm.classList.add('is-playing');
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    if (event.data === YT.PlayerState.PAUSED) {
      // Browser may have paused due to autoplay policy
      DOM.unmuteNotice.classList.add('active');
    }
    if (event.data === YT.PlayerState.ENDED) {
      DOM.vinylDisc.classList.remove('is-spinning');
      DOM.tonearm.classList.remove('is-playing');
      if (socket && stationState.currentTrack) {
        socket.emit('client_track_ended', {
          trackId: stationState.currentTrack.id,
          videoId: stationState.currentTrack.videoId
        });
      }
    }
  }
}

function onPlayerError(event) {
  console.warn('[YouTube Player] Error:', event.data);
  showToast('⚠️ Video không cho phép phát nhúng hoặc bị lỗi, đang chuyển tiếp...', 'error');
  if (socket && stationState.currentTrack) {
    socket.emit('client_track_ended', {
      trackId: stationState.currentTrack.id,
      videoId: stationState.currentTrack.videoId,
      error: event.data
    });
  }
}

function playCurrentStationTrack() {
  if (!ytReady || !ytPlayer || !stationState.currentTrack) return;

  const track = stationState.currentTrack;
  const elapsed = Math.max(0, (Date.now() - track.startTime) / 1000);

  const currentLoadedUrl = ytPlayer.getVideoUrl ? ytPlayer.getVideoUrl() : '';
  const isSameVideo = currentLoadedUrl.includes(track.videoId);

  if (!isSameVideo) {
    ytPlayer.loadVideoById({
      videoId: track.videoId,
      startSeconds: Math.floor(elapsed)
    });
  } else {
    const currentSec = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
    if (Math.abs(currentSec - elapsed) > 3) {
      ytPlayer.seekTo(elapsed, true);
    }
    if (ytPlayer.getPlayerState && ytPlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
      ytPlayer.playVideo();
    }
  }

  // Attempt to play and unmute
  try {
    if (!localUser.isMuted) {
      ytPlayer.unMute();
      ytPlayer.setVolume(localUser.volume || 80);
    }
    ytPlayer.playVideo();
  } catch (e) {}

  // Autoplay check: If browser blocked sound/play, show banner
  setTimeout(() => {
    if (ytPlayer) {
      const isMuted = ytPlayer.isMuted && ytPlayer.isMuted();
      const isPaused = ytPlayer.getPlayerState && ytPlayer.getPlayerState() !== YT.PlayerState.PLAYING;
      if (isMuted || isPaused) {
        DOM.unmuteNotice.classList.add('active');
      } else {
        DOM.unmuteNotice.classList.remove('active');
      }
    }
  }, 1200);

  startLocalPlaybackTracker();
}

function startLocalPlaybackTracker() {
  if (playbackSyncInterval) clearInterval(playbackSyncInterval);

  playbackSyncInterval = setInterval(() => {
    if (!stationState.currentTrack) return;

    const track = stationState.currentTrack;
    const duration = track.duration || 240;
    const elapsed = Math.max(0, Math.min(duration, (Date.now() - track.startTime) / 1000));
    const percent = Math.min(100, (elapsed / duration) * 100);

    DOM.timeElapsed.textContent = formatTime(elapsed);
    DOM.timeDuration.textContent = formatTime(duration);
    DOM.progressBarFill.style.width = `${percent}%`;

    // Drift correction
    if (ytReady && ytPlayer && ytPlayer.getCurrentTime) {
      const ytSec = ytPlayer.getCurrentTime();
      if (Math.abs(ytSec - elapsed) > 4) {
        ytPlayer.seekTo(elapsed, true);
      }
    }
  }, 500);
}

// ==========================================
// 4. REST API & Authentication Services
// ==========================================
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    ...options.headers
  };

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Đã có lỗi xảy ra!');
    }
    return data;
  } catch (err) {
    throw err;
  }
}

async function checkAuthSession() {
  if (!authToken) {
    renderUserLoggedOut();
    return;
  }

  try {
    const res = await apiRequest('/api/auth/me');
    if (res.success && res.data.user) {
      currentUser = res.data.user;
      renderUserLoggedIn(currentUser);
      loadUserFavorites();
    } else {
      logout();
    }
  } catch (err) {
    console.warn('Auth session check failed:', err.message);
    logout();
  }
}

function renderUserLoggedIn(user) {
  DOM.btnOpenAuthModal.style.display = 'none';
  DOM.profileBtn.style.display = 'flex';

  DOM.headerAvatar.textContent = user.avatar || '🎧';
  DOM.headerUsername.textContent = user.username;
  DOM.headerRoleBadge.textContent = user.role || 'USER';
  DOM.headerRoleBadge.className = `role-badge ${user.role || 'USER'}`;
  DOM.headerLevelTag.textContent = `Lv. ${user.level || 1}`;

  // Admin privileges
  if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
    DOM.btnAdminInstantSkip.style.display = 'flex';
  } else {
    DOM.btnAdminInstantSkip.style.display = 'none';
  }
}

function renderUserLoggedOut() {
  currentUser = null;
  authToken = null;
  localStorage.removeItem('station_jwt_token');

  DOM.btnOpenAuthModal.style.display = 'flex';
  DOM.profileBtn.style.display = 'none';
  DOM.btnAdminInstantSkip.style.display = 'none';
}

function logout() {
  renderUserLoggedOut();
  showToast('Đã đăng xuất tài khoản.', 'info');
  closeModals();
  // Reconnect socket as Guest
  initSocketConnection();
}

// ==========================================
// 5. Favorites Management
// ==========================================
async function loadUserFavorites() {
  if (!authToken) {
    renderFavoritesUI([]);
    return;
  }

  try {
    const res = await apiRequest('/api/user/favorites');
    if (res.success && Array.isArray(res.data)) {
      userFavorites = res.data;
      renderFavoritesUI(userFavorites);
      updateNowPlayingFavoriteButton();
    }
  } catch (err) {
    console.warn('Failed to load favorites:', err.message);
  }
}

function renderFavoritesUI(favs) {
  DOM.favCountBadge.textContent = favs.length;

  if (!favs || favs.length === 0) {
    DOM.favEmptyState.style.display = 'flex';
    DOM.favoritesList.innerHTML = '';
    DOM.favoritesList.appendChild(DOM.favEmptyState);
    return;
  }

  DOM.favEmptyState.style.display = 'none';
  DOM.favoritesList.innerHTML = '';

  favs.forEach(fav => {
    const item = document.createElement('div');
    item.className = 'fav-item';
    item.innerHTML = `
      <img src="${escapeHtml(fav.thumbnail || 'https://i.ytimg.com/vi/' + fav.videoId + '/hqdefault.jpg')}" alt="${escapeHtml(fav.title)}" class="fav-thumb">
      <div class="fav-details">
        <div class="fav-title" title="${escapeHtml(fav.title)}">${escapeHtml(fav.title)}</div>
        <div class="fav-author">${escapeHtml(fav.author || 'Unknown Artist')} • ${formatTime(fav.duration || 240)}</div>
      </div>
      <div class="fav-actions">
        <button class="fav-add-queue-btn" data-videoid="${escapeHtml(fav.videoId)}" data-title="${escapeHtml(fav.title)}" data-author="${escapeHtml(fav.author || '')}" data-thumb="${escapeHtml(fav.thumbnail || '')}" data-duration="${fav.duration || 240}">
          <i class="ph-bold ph-plus"></i> Hàng chờ
        </button>
        <button class="fav-delete-btn" data-videoid="${escapeHtml(fav.videoId)}" title="Xoá khỏi yêu thích">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    `;

    // Add to queue event
    item.querySelector('.fav-add-queue-btn').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      addSongToQueue(`https://www.youtube.com/watch?v=${btn.dataset.videoid}`);
    });

    // Delete favorite event
    item.querySelector('.fav-delete-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const vid = btn.dataset.videoid;
      await removeFavoriteTrack(vid);
    });

    DOM.favoritesList.appendChild(item);
  });
}

async function toggleCurrentTrackFavorite() {
  if (!authToken) {
    showToast('🔑 Vui lòng đăng nhập để lưu bài hát yêu thích!', 'info');
    openAuthModal('login');
    return;
  }

  if (!stationState.currentTrack) return;

  const track = stationState.currentTrack;
  const isFav = userFavorites.some(f => f.videoId === track.videoId);

  if (isFav) {
    await removeFavoriteTrack(track.videoId);
  } else {
    try {
      const res = await apiRequest('/api/user/favorites', {
        method: 'POST',
        body: JSON.stringify({
          videoId: track.videoId,
          title: track.title,
          author: track.author,
          thumbnail: track.thumbnail,
          duration: track.duration
        })
      });
      if (res.success) {
        showToast(`❤️ Đã lưu "${track.title}" vào mục Yêu Thích!`, 'success');
        await loadUserFavorites();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

async function removeFavoriteTrack(videoId) {
  try {
    const res = await apiRequest(`/api/user/favorites/${videoId}`, {
      method: 'DELETE'
    });
    if (res.success) {
      showToast('Đã bỏ khỏi danh sách yêu thích.', 'info');
      await loadUserFavorites();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function updateNowPlayingFavoriteButton() {
  if (!stationState.currentTrack) return;
  const isFav = userFavorites.some(f => f.videoId === stationState.currentTrack.videoId);
  if (isFav) {
    DOM.btnToggleFavorite.classList.add('favorited');
    DOM.favIcon.className = 'ph-fill ph-heart';
  } else {
    DOM.btnToggleFavorite.classList.remove('favorited');
    DOM.favIcon.className = 'ph ph-heart';
  }
}

// ==========================================
// 6. Socket.IO Connection & Events
// ==========================================
let socket = null;

function initSocketConnection() {
  if (socket) {
    socket.disconnect();
  }

  socket = io({
    auth: {
      token: authToken
    }
  });

  socket.on('connect', () => {
    DOM.syncStatusPill.classList.remove('offline');
    DOM.syncStatusText.textContent = 'Đồng bộ phòng';

    socket.emit('join_station', {
      userId: currentUser ? currentUser.id : localUser.guestId,
      username: currentUser ? currentUser.username : ('Guest ' + localUser.guestId.slice(-4)),
      avatar: currentUser ? currentUser.avatar : '🎧'
    });
  });

  socket.on('disconnect', () => {
    DOM.syncStatusPill.classList.add('offline');
    DOM.syncStatusText.textContent = 'Mất kết nối...';
  });

  // Initial Room State Sync
  socket.on('init_sync', (data) => {
    stationState.currentTrack = data.currentTrack;
    stationState.queue = data.queue || [];
    stationState.onlineCount = data.onlineCount || 1;

    DOM.listenerCount.textContent = stationState.onlineCount;

    if (data.chatHistory) {
      DOM.chatMessages.innerHTML = '';
      data.chatHistory.forEach(msg => appendChatMessage(msg));
    }

    renderQueue(stationState.queue);
    updateNowPlayingUI(stationState.currentTrack);
    updateCooldownUI(data.cooldown);

    if (data.activeVote && data.activeVote.active) {
      showVoteBanner(data.activeVote);
    } else {
      hideVoteBanner();
    }

    if (stationState.currentTrack) {
      playCurrentStationTrack();
    }
  });

  // Station State Update
  socket.on('station_state_update', (data) => {
    stationState.onlineCount = data.onlineCount || 1;
    DOM.listenerCount.textContent = stationState.onlineCount;

    if (data.queue) {
      stationState.queue = data.queue;
      renderQueue(stationState.queue);
    }

    if (data.activeVote && data.activeVote.active) {
      updateVoteCounts(data.activeVote);
    } else {
      hideVoteBanner();
    }
  });

  // New Track Started
  socket.on('track_started', (data) => {
    stationState.currentTrack = data.track;
    stationState.queue = data.queue || [];

    updateNowPlayingUI(stationState.currentTrack);
    renderQueue(stationState.queue);
    playCurrentStationTrack();

    if (data.voteWindow && data.voteWindow.active) {
      showVoteBanner(data.voteWindow);
    }
  });

  // 10s Vote Skip Events
  socket.on('vote_window_opened', (voteData) => {
    showVoteBanner(voteData);
  });

  socket.on('vote_updated', (voteData) => {
    updateVoteCounts(voteData);
  });

  socket.on('vote_window_closed', (voteData) => {
    hideVoteBanner();
    if (voteData.wasSkipped) {
      showToast('⏭️ Bài hát đã bị bỏ qua bởi biểu quyết phòng!', 'info');
    }
  });

  // Chat Message
  socket.on('chat_message', (msg) => {
    appendChatMessage(msg);
  });

  // Emoji Reactions
  socket.on('reaction_burst', (data) => {
    spawnFloatingReaction(data.emoji);
  });

  // Cooldown Status Updates
  socket.on('cooldown_update', (cooldownInfo) => {
    updateCooldownUI(cooldownInfo);
  });

  // Add Song Success / Error
  socket.on('add_success', (data) => {
    showToast(`🎶 Đã thêm "${data.track.title}" vào hàng chờ!`, 'success');
    DOM.songUrlInput.value = '';
    updateCooldownUI(data.cooldown);
    switchTab('queue');
  });

  socket.on('add_error', (err) => {
    showToast(err.message || 'Lỗi thêm bài hát!', 'error');
  });

  // Online count
  socket.on('user_count_update', (data) => {
    stationState.onlineCount = data.count;
    DOM.listenerCount.textContent = data.count;
  });
}

// ==========================================
// 7. UI Rendering Functions
// ==========================================
function updateNowPlayingUI(track) {
  if (!track) {
    DOM.nowPlayingTitle.textContent = 'Đang đợi bài hát tiếp theo...';
    DOM.nowPlayingAuthor.textContent = 'Lofi & Chill Lounge';
    DOM.nowPlayingThumb.src = 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80';
    DOM.vinylArtwork.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80';
    DOM.sourceBadge.textContent = '📻 Station Radio';
    DOM.requestedByBadge.textContent = '';
    return;
  }

  DOM.nowPlayingTitle.textContent = track.title;
  DOM.nowPlayingAuthor.textContent = track.author || 'Unknown Artist';
  DOM.nowPlayingThumb.src = track.thumbnail || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
  DOM.vinylArtwork.src = track.thumbnail || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;

  if (track.isDefault) {
    DOM.sourceBadge.textContent = '📻 Station Radio';
    DOM.requestedByBadge.textContent = '';
  } else {
    DOM.sourceBadge.textContent = '✨ Yêu cầu phòng';
    DOM.requestedByBadge.textContent = `bởi ${track.requestedBy}`;
  }

  updateNowPlayingFavoriteButton();
}

function renderQueue(queue) {
  DOM.queueCountBadge.textContent = queue.length;

  if (!queue || queue.length === 0) {
    DOM.queueList.innerHTML = `
      <div class="queue-empty-state">
        <i class="ph ph-music-notes-simple"></i>
        <p>Hàng chờ đang trống</p>
        <span>Hãy chọn 1 bài hát yêu thích để phát tiếp theo!</span>
      </div>
    `;
    return;
  }

  DOM.queueList.innerHTML = '';
  queue.forEach((track, index) => {
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.innerHTML = `
      <span class="queue-num">#${index + 1}</span>
      <img src="${escapeHtml(track.thumbnail)}" alt="${escapeHtml(track.title)}" class="queue-thumb">
      <div class="queue-details">
        <div class="queue-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</div>
        <div class="queue-author">${escapeHtml(track.author)} • Yêu cầu bởi <strong>${escapeHtml(track.requestedBy)}</strong></div>
      </div>
      <div class="queue-time">${formatTime(track.duration || 240)}</div>
    `;
    DOM.queueList.appendChild(item);
  });
}

function appendChatMessage(msg) {
  const isMe = (currentUser && msg.userId === currentUser.id) || (!currentUser && msg.userId === localUser.guestId);
  const msgEl = document.createElement('div');

  if (msg.type === 'system') {
    msgEl.className = 'system-message';
    msgEl.innerHTML = `
      <span class="sys-icon">${escapeHtml(msg.icon || '📢')}</span>
      <span class="sys-text">${escapeHtml(msg.text)}</span>
    `;
  } else {
    msgEl.className = `chat-bubble ${isMe ? 'my-message' : ''}`;
    const roleTag = (msg.role && msg.role !== 'USER') ? `<span class="role-badge ${escapeHtml(msg.role)}">${escapeHtml(msg.role)}</span>` : '';
    msgEl.innerHTML = `
      <div class="bubble-avatar">${escapeHtml(msg.avatar || '🎧')}</div>
      <div class="bubble-content">
        <div class="bubble-user-row">
          <span class="bubble-username">${escapeHtml(msg.username)}</span>
          ${roleTag}
          <span class="bubble-time">${formatChatTime(msg.timestamp || Date.now())}</span>
        </div>
        <p class="bubble-text">${escapeHtml(msg.text)}</p>
      </div>
    `;
  }

  DOM.chatMessages.appendChild(msgEl);
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

// 10s Vote Skip Banner Control
function showVoteBanner(voteData) {
  stationState.voteWindow = {
    ...stationState.voteWindow,
    ...voteData,
    active: true,
    startTime: Date.now()
  };

  DOM.voteBanner.classList.add('active');
  DOM.btnVoteKeep.classList.remove('voted');
  DOM.btnVoteSkip.classList.remove('voted');

  updateVoteCounts(voteData);

  if (stationState.voteWindow.timerInterval) {
    clearInterval(stationState.voteWindow.timerInterval);
  }

  const duration = voteData.duration || 10;
  const start = Date.now();

  stationState.voteWindow.timerInterval = setInterval(() => {
    const elapsed = (Date.now() - start) / 1000;
    const remaining = Math.max(0, duration - elapsed);
    const percent = (remaining / duration) * 100;

    DOM.voteCountdownTimer.textContent = `${remaining.toFixed(1)}s`;
    DOM.voteProgressBar.style.width = `${percent}%`;

    if (remaining <= 0) {
      clearInterval(stationState.voteWindow.timerInterval);
      stationState.voteWindow.timerInterval = null;
    }
  }, 100);
}

function updateVoteCounts(voteData) {
  DOM.skipCountBadge.textContent = voteData.skipCount || 0;
  DOM.keepCountBadge.textContent = voteData.keepCount || 0;

  const total = voteData.totalListeners || 1;
  const threshold = Math.max(1, Math.floor(total / 2) + 1);
  DOM.voteThresholdNote.textContent = `Cần ${threshold} phiếu Skip để bỏ qua (${voteData.skipCount || 0}/${threshold})`;
}

function hideVoteBanner() {
  DOM.voteBanner.classList.remove('active');
  if (stationState.voteWindow.timerInterval) {
    clearInterval(stationState.voteWindow.timerInterval);
    stationState.voteWindow.timerInterval = null;
  }
}

// Cooldown Management
function updateCooldownUI(cooldown) {
  if (!cooldown) return;

  if (stationState.cooldown.timerInterval) {
    clearInterval(stationState.cooldown.timerInterval);
  }

  stationState.cooldown = { ...stationState.cooldown, ...cooldown };

  if (cooldown.isAdmin) {
    DOM.tabCooldownPill.textContent = 'Admin Bypass';
    DOM.cooldownCard.className = 'cooldown-card ready';
    DOM.cooldownIcon.className = 'ph-fill ph-lightning';
    DOM.cooldownTitle.textContent = 'Đặc Quyền Quản Trị Viên';
    DOM.cooldownSubtitle.textContent = 'Bạn có thể thêm bài liên tục không giới hạn thời gian chờ.';
    DOM.cooldownTimerDisplay.style.display = 'none';
    DOM.btnSubmitAdd.disabled = false;
    DOM.btnSubmitAddText.textContent = 'Thêm Vào Hàng Chờ';
    return;
  }

  if (cooldown.isFirstBonus) {
    DOM.tabCooldownPill.textContent = 'Ưu đãi Lần 1';
    DOM.cooldownCard.className = 'cooldown-card ready';
    DOM.cooldownIcon.className = 'ph-fill ph-sparkle';
    DOM.cooldownTitle.textContent = 'Ưu Đãi Lần Đầu Gia Nhập!';
    DOM.cooldownSubtitle.textContent = 'Bạn được thêm ngay 1 bài hát mà không cần chờ.';
    DOM.cooldownTimerDisplay.style.display = 'none';
    DOM.btnSubmitAdd.disabled = false;
    DOM.btnSubmitAddText.textContent = 'Thêm Vào Hàng Chờ';
    return;
  }

  if (cooldown.canAdd) {
    DOM.tabCooldownPill.textContent = 'Sẵn sàng';
    DOM.cooldownCard.className = 'cooldown-card ready';
    DOM.cooldownIcon.className = 'ph-fill ph-check-circle';
    DOM.cooldownTitle.textContent = 'Thời Gian Chờ Đã Kết Thúc!';
    DOM.cooldownSubtitle.textContent = 'Bạn có thể yêu cầu bài hát tiếp theo ngay bây giờ.';
    DOM.cooldownTimerDisplay.style.display = 'none';
    DOM.btnSubmitAdd.disabled = false;
    DOM.btnSubmitAddText.textContent = 'Thêm Vào Hàng Chờ';
  } else {
    DOM.cooldownCard.className = 'cooldown-card waiting';
    DOM.cooldownIcon.className = 'ph-fill ph-timer';
    DOM.cooldownTitle.textContent = 'Đang Trong Thời Gian Chờ';
    DOM.cooldownSubtitle.textContent = 'Vui lòng chờ hết thời gian để tiếp tục thêm bài mới.';
    DOM.cooldownTimerDisplay.style.display = 'block';
    DOM.btnSubmitAdd.disabled = true;

    let remaining = cooldown.remainingSeconds;

    const tick = () => {
      if (remaining <= 0) {
        clearInterval(stationState.cooldown.timerInterval);
        updateCooldownUI({ canAdd: true, remainingSeconds: 0 });
        return;
      }
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      DOM.cooldownTimerDisplay.textContent = formatted;
      DOM.tabCooldownPill.textContent = formatted;
      DOM.btnSubmitAddText.textContent = `Chờ ${formatted}`;
      remaining--;
    };

    tick();
    stationState.cooldown.timerInterval = setInterval(tick, 1000);
  }
}

// ==========================================
// 8. Event Listeners & Interaction Handlers
// ==========================================
function setupEventListeners() {
  // Tabs switching
  DOM.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // View switch (Vinyl vs Video) without destroying iframe audio rendering
  DOM.viewVinylBtn.addEventListener('click', () => {
    DOM.viewVinylBtn.classList.add('active');
    DOM.viewVideoBtn.classList.remove('active');
    DOM.turntableWrapper.style.opacity = '1';
    DOM.turntableWrapper.style.pointerEvents = 'auto';
    DOM.turntableWrapper.style.zIndex = '5';
    DOM.videoContainer.classList.remove('active');
  });

  DOM.viewVideoBtn.addEventListener('click', () => {
    DOM.viewVideoBtn.classList.add('active');
    DOM.viewVinylBtn.classList.remove('active');
    DOM.turntableWrapper.style.opacity = '0';
    DOM.turntableWrapper.style.pointerEvents = 'none';
    DOM.turntableWrapper.style.zIndex = '1';
    DOM.videoContainer.classList.add('active');
  });

  // Click on turntable or stage to unmute / play
  DOM.turntableWrapper.addEventListener('click', () => {
    if (ytReady && ytPlayer) {
      try {
        ytPlayer.unMute();
        ytPlayer.setVolume(localUser.volume || 80);
        ytPlayer.playVideo();
        DOM.unmuteNotice.classList.remove('active');
      } catch (e) {}
    }
  });

  // Global one-time interaction listener to unblock browser autoplay policy
  const unlockAudio = () => {
    if (ytReady && ytPlayer) {
      try {
        if (ytPlayer.isMuted && ytPlayer.isMuted()) {
          ytPlayer.unMute();
          ytPlayer.setVolume(localUser.volume || 80);
        }
        if (ytPlayer.getPlayerState && ytPlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
          ytPlayer.playVideo();
        }
        DOM.unmuteNotice.classList.remove('active');
      } catch (e) {}
    }
  };
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });


  // Admin Instant Skip
  DOM.btnAdminInstantSkip.addEventListener('click', () => {
    if (socket) {
      socket.emit('admin_instant_skip');
    }
  });

  // Unmute notice
  DOM.btnUnmute.addEventListener('click', () => {
    if (ytPlayer && ytPlayer.unMute) {
      ytPlayer.unMute();
      ytPlayer.setVolume(localUser.volume);
      DOM.unmuteNotice.classList.remove('active');
    }
  });

  // Toggle Favorite
  DOM.btnToggleFavorite.addEventListener('click', () => {
    toggleCurrentTrackFavorite();
  });

  // Volume controls
  DOM.volumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    localUser.volume = val;
    localStorage.setItem('station_volume', val);
    DOM.volumeValue.textContent = `${val}%`;

    if (ytReady && ytPlayer && ytPlayer.setVolume) {
      ytPlayer.setVolume(val);
      if (val > 0 && ytPlayer.isMuted()) ytPlayer.unMute();
    }
  });

  DOM.volumeMuteBtn.addEventListener('click', () => {
    localUser.isMuted = !localUser.isMuted;
    if (ytReady && ytPlayer) {
      if (localUser.isMuted) {
        ytPlayer.mute();
        DOM.volumeIcon.className = 'ph-fill ph-speaker-slash';
      } else {
        ytPlayer.unMute();
        DOM.volumeIcon.className = 'ph-fill ph-speaker-high';
      }
    }
  });

  // Resync Button
  DOM.btnResync.addEventListener('click', () => {
    if (stationState.currentTrack) {
      playCurrentStationTrack();
      showToast('🔄 Đã đồng bộ lại với phòng nhạc!', 'success');
    }
  });

  DOM.btnOpenAddModal.addEventListener('click', () => switchTab('add'));
  DOM.btnOpenAddFromQueue.addEventListener('click', () => switchTab('add'));

  // Chat Submission
  DOM.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = DOM.chatInput.value.trim();
    if (!text || !socket) return;

    socket.emit('send_chat', { text });
    DOM.chatInput.value = '';
  });

  // Emoji Reactions
  DOM.reactionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      if (socket) {
        socket.emit('send_reaction', { emoji });
      }
    });
  });

  // 10s Vote Buttons
  DOM.btnVoteKeep.addEventListener('click', () => {
    if (!socket || !stationState.voteWindow.active) return;
    DOM.btnVoteKeep.classList.add('voted');
    DOM.btnVoteSkip.classList.remove('voted');
    socket.emit('submit_vote', { voteType: 'keep' });
  });

  DOM.btnVoteSkip.addEventListener('click', () => {
    if (!socket || !stationState.voteWindow.active) return;
    DOM.btnVoteSkip.classList.add('voted');
    DOM.btnVoteKeep.classList.remove('voted');
    socket.emit('submit_vote', { voteType: 'skip' });
  });

  // Add Song Form Submission
  DOM.addSongForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = DOM.songUrlInput.value.trim();
    if (!url) return;
    addSongToQueue(url);
  });

  // Quick Pick Chips
  DOM.pickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const url = chip.dataset.url;
      DOM.songUrlInput.value = url;
      addSongToQueue(url);
    });
  });

  // Auth Modal Triggers
  DOM.btnOpenAuthModal.addEventListener('click', () => openAuthModal('login'));
  DOM.closeAuthModal.addEventListener('click', closeModals);

  DOM.authTabLogin.addEventListener('click', () => switchAuthTab('login'));
  DOM.authTabRegister.addEventListener('click', () => switchAuthTab('register'));

  // Auth Forms
  DOM.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthAlert();
    const login = DOM.loginInput.value.trim();
    const password = DOM.loginPasswordInput.value;

    try {
      DOM.btnLoginSubmit.disabled = true;
      DOM.btnLoginSubmit.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Đang đăng nhập...`;

      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password })
      });

      if (res.success && res.data.token) {
        authToken = res.data.token;
        localStorage.setItem('station_jwt_token', authToken);
        currentUser = res.data.user;

        renderUserLoggedIn(currentUser);
        await loadUserFavorites();
        closeModals();
        showToast(`🎉 Chào mừng trở lại, ${currentUser.username}!`, 'success');

        // Reconnect socket with authenticated token
        initSocketConnection();
      }
    } catch (err) {
      showAuthAlert(err.message, 'error');
    } finally {
      DOM.btnLoginSubmit.disabled = false;
      DOM.btnLoginSubmit.innerHTML = `<i class="ph-bold ph-sign-in"></i> Đăng Nhập`;
    }
  });

  DOM.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthAlert();
    const username = DOM.regUsernameInput.value.trim();
    const email = DOM.regEmailInput.value.trim();
    const password = DOM.regPasswordInput.value;

    try {
      DOM.btnRegisterSubmit.disabled = true;
      DOM.btnRegisterSubmit.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Đang khởi tạo tài khoản...`;

      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email,
          password,
          avatar: selectedRegAvatar
        })
      });

      if (res.success && res.data.token) {
        authToken = res.data.token;
        localStorage.setItem('station_jwt_token', authToken);
        currentUser = res.data.user;

        renderUserLoggedIn(currentUser);
        await loadUserFavorites();
        closeModals();
        showToast(`✨ Chúc mừng ${currentUser.username} đã tạo tài khoản thành công!`, 'success');

        initSocketConnection();
      }
    } catch (err) {
      showAuthAlert(err.message, 'error');
    } finally {
      DOM.btnRegisterSubmit.disabled = false;
      DOM.btnRegisterSubmit.innerHTML = `<i class="ph-bold ph-user-plus"></i> Tạo Tài Khoản Ngay`;
    }
  });

  // Avatar Selection in Register Form
  DOM.regAvatarOptions.querySelectorAll('.avatar-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      DOM.regAvatarOptions.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedRegAvatar = opt.dataset.avatar;
    });
  });

  // Profile Modal Trigger
  DOM.profileBtn.addEventListener('click', () => openProfileModal());
  DOM.closeProfileModal.addEventListener('click', closeModals);
  DOM.btnLogout.addEventListener('click', logout);

  // Avatar selection in Profile Modal
  DOM.avatarOptions.querySelectorAll('.avatar-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      DOM.avatarOptions.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedProfileAvatar = opt.dataset.avatar;
      DOM.modalProfileAvatar.textContent = selectedProfileAvatar;
    });
  });

  // Save Profile
  DOM.btnSaveProfile.addEventListener('click', async () => {
    const newUsername = DOM.profileUsernameInput.value.trim();
    if (!newUsername) return showToast('Vui lòng nhập tên hiển thị!', 'error');

    try {
      DOM.btnSaveProfile.disabled = true;
      const res = await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          username: newUsername,
          avatar: selectedProfileAvatar
        })
      });

      if (res.success) {
        currentUser = res.data.user;
        renderUserLoggedIn(currentUser);
        closeModals();
        showToast('✅ Đã cập nhật hồ sơ thành công!', 'success');
        initSocketConnection();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      DOM.btnSaveProfile.disabled = false;
    }
  });
}

function addSongToQueue(url) {
  if (!socket) return;
  socket.emit('add_to_queue', { url });
}

function switchTab(tabId) {
  DOM.tabBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  DOM.tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab${capitalize(tabId)}`);
  });

  if (tabId === 'favorites') {
    loadUserFavorites();
  }
}

function openAuthModal(tab = 'login') {
  DOM.authModal.classList.add('active');
  switchAuthTab(tab);
}

function switchAuthTab(tab) {
  hideAuthAlert();
  if (tab === 'login') {
    DOM.authTabLogin.classList.add('active');
    DOM.authTabRegister.classList.remove('active');
    DOM.loginForm.style.display = 'block';
    DOM.registerForm.style.display = 'none';
  } else {
    DOM.authTabLogin.classList.remove('active');
    DOM.authTabRegister.classList.add('active');
    DOM.loginForm.style.display = 'none';
    DOM.registerForm.style.display = 'block';
  }
}

function showAuthAlert(msg, type = 'error') {
  DOM.authAlert.textContent = msg;
  DOM.authAlert.className = `auth-alert ${type}`;
  DOM.authAlert.style.display = 'block';
}

function hideAuthAlert() {
  DOM.authAlert.style.display = 'none';
}

function openProfileModal() {
  if (!currentUser) return;

  DOM.modalProfileAvatar.textContent = currentUser.avatar || '🎧';
  DOM.modalProfileUsername.textContent = currentUser.username;
  DOM.modalProfileRoleBadge.textContent = currentUser.role || 'USER';
  DOM.modalProfileRoleBadge.className = `role-badge ${currentUser.role || 'USER'}`;
  DOM.modalProfileEmail.textContent = currentUser.email;

  const level = currentUser.level || 1;
  const xp = currentUser.xp || 0;
  const nextLevelXp = level * 100;
  const percent = Math.min(100, Math.round((xp / nextLevelXp) * 100));

  DOM.modalProfileLevel.textContent = `Level ${level}`;
  DOM.modalProfileXp.textContent = `${xp} / ${nextLevelXp} XP`;
  DOM.modalProfileXpFill.style.width = `${percent}%`;

  DOM.modalTotalRequests.textContent = currentUser.totalRequests || 0;
  DOM.modalTotalFavorites.textContent = userFavorites.length || 0;
  DOM.modalCooldownBonus.textContent = (currentUser.role === 'VIP' || currentUser.role === 'DJ') ? '2m (VIP)' : (currentUser.role === 'ADMIN' ? '0s (Admin)' : '5m');

  DOM.profileUsernameInput.value = currentUser.username;
  selectedProfileAvatar = currentUser.avatar || '🎧';

  DOM.avatarOptions.querySelectorAll('.avatar-opt').forEach(o => {
    o.classList.toggle('selected', o.dataset.avatar === selectedProfileAvatar);
  });

  DOM.profileModal.classList.add('active');
}

function closeModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Floating Reaction Burst
function spawnFloatingReaction(emoji) {
  const el = document.createElement('div');
  el.className = 'floating-emoji';
  el.textContent = emoji;
  el.style.left = `${Math.floor(20 + Math.random() * 60)}%`;
  DOM.reactionContainer.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 3000);
}

// Helpers
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatChatTime(ts) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

// ==========================================
// 9. App Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkAuthSession();
  initSocketConnection();
});
