/**
 * ==========================================================================
 * LOFI & CHILL LOUNGE HUB - MULTI-ROOM CLIENT ENGINE
 * Features: Sảnh Lobby Explorer, Tạo Phòng Tự Do, Phòng Chạy Độc Lập Liên Tục,
 * Đồng Bộ YouTube, Bình Chọn 10s Vote Skip, Chat Live & Xác Thực JWT Supabase.
 * ==========================================================================
 */

// ==========================================
// 1. Application State & Storage Keys
// ==========================================
const STORAGE_KEYS = {
  TOKEN: 'station_jwt_token',
  USER: 'station_user_data',
  GUEST_ID: 'station_guest_id',
  GUEST_NAME: 'station_guest_name',
  GUEST_AVATAR: 'station_guest_avatar',
  VOLUME: 'station_volume'
};

const appState = {
  currentView: 'lobby', // 'lobby' | 'room'
  activeRoomSlug: null,
  activeRoomData: null,
  allRooms: [],
  searchQuery: '',
  currentUser: null,
  guestUser: {
    id: localStorage.getItem(STORAGE_KEYS.GUEST_ID) || `guest_${Math.random().toString(36).substr(2, 6)}`,
    username: localStorage.getItem(STORAGE_KEYS.GUEST_NAME) || `Guest_${Math.floor(1000 + Math.random() * 9000)}`,
    avatar: localStorage.getItem(STORAGE_KEYS.GUEST_AVATAR) || '🎧'
  },
  volume: parseInt(localStorage.getItem(STORAGE_KEYS.VOLUME) || '80', 10),
  isMuted: false,
  roomState: {
    currentTrack: null,
    queue: [],
    cooldown: { canAdd: true, remainingSeconds: 0 },
    voteWindow: { active: false, trackId: null, timerInterval: null },
    onlineCount: 1
  }
};

// Persist Guest IDs
localStorage.setItem(STORAGE_KEYS.GUEST_ID, appState.guestUser.id);
localStorage.setItem(STORAGE_KEYS.GUEST_NAME, appState.guestUser.username);
localStorage.setItem(STORAGE_KEYS.GUEST_AVATAR, appState.guestUser.avatar);

// ==========================================
// 2. DOM Elements Cache
// ==========================================
const DOM = {
  // Views
  lobbyView: document.getElementById('lobbyView'),
  roomView: document.getElementById('roomView'),
  navBtnLobby: document.getElementById('navBtnLobby'),
  navBtnLeaderboard: document.getElementById('navBtnLeaderboard'),
  btnLogoHome: document.getElementById('btnLogoHome'),
  btnBackToLobby: document.getElementById('btnBackToLobby'),

  // Lobby Elements
  lobbySearchInput: document.getElementById('lobbySearchInput'),
  roomsGrid: document.getElementById('roomsGrid'),
  lobbyTotalRoomsBadge: document.getElementById('lobbyTotalRoomsBadge'),
  btnRefreshLobby: document.getElementById('btnRefreshLobby'),

  // Room Header Bar
  roomActiveTitle: document.getElementById('roomActiveTitle'),
  roomActiveHost: document.getElementById('roomActiveHost'),
  listenerCount: document.getElementById('listenerCount'),
  btnShareRoom: document.getElementById('btnShareRoom'),
  btnAdminInstantSkip: document.getElementById('btnAdminInstantSkip'),
  btnDeleteRoom: document.getElementById('btnDeleteRoom'),

  // Player Stage
  viewVinylBtn: document.getElementById('viewVinylBtn'),
  viewVideoBtn: document.getElementById('viewVideoBtn'),
  turntableWrapper: document.getElementById('turntableWrapper'),
  videoContainer: document.getElementById('videoContainer'),
  vinylDisc: document.getElementById('vinylDisc'),
  vinylArtwork: document.getElementById('vinylArtwork'),
  tonearm: document.getElementById('tonearm'),
  unmuteNotice: document.getElementById('unmuteNotice'),
  btnUnmute: document.getElementById('btnUnmute'),

  // Track Meta & Progress
  currentThumb: document.getElementById('currentThumb'),
  currentTitle: document.getElementById('currentTitle'),
  currentAuthor: document.getElementById('currentAuthor'),
  requesterName: document.getElementById('requesterName'),
  btnToggleFavorite: document.getElementById('btnToggleFavorite'),
  favHeartIcon: document.getElementById('favHeartIcon'),
  timeElapsed: document.getElementById('timeElapsed'),
  timeDuration: document.getElementById('timeDuration'),
  progressBarFill: document.getElementById('progressBarFill'),

  // Stage Controls
  volumeSlider: document.getElementById('volumeSlider'),
  volumeValue: document.getElementById('volumeValue'),
  volumeMuteBtn: document.getElementById('volumeMuteBtn'),
  volumeIcon: document.getElementById('volumeIcon'),
  btnResync: document.getElementById('btnResync'),
  btnOpenAddModal: document.getElementById('btnOpenAddModal'),

  // 10s Vote Banner
  voteBanner: document.getElementById('voteBanner'),
  voteCountdownTimer: document.getElementById('voteCountdownTimer'),
  voteProgressBar: document.getElementById('voteProgressBar'),
  voteThresholdNote: document.getElementById('voteThresholdNote'),
  btnVoteKeep: document.getElementById('btnVoteKeep'),
  btnVoteSkip: document.getElementById('btnVoteSkip'),
  keepCountBadge: document.getElementById('keepCountBadge'),
  skipCountBadge: document.getElementById('skipCountBadge'),

  // Sidebar Tabs & Panes
  sidebarTabBtns: document.querySelectorAll('.sidebar-tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  queueCountBadge: document.getElementById('queueCountBadge'),
  tabCooldownPill: document.getElementById('tabCooldownPill'),
  queueList: document.getElementById('queueList'),
  btnOpenAddFromQueue: document.getElementById('btnOpenAddFromQueue'),

  // Add Song Form
  cooldownCard: document.getElementById('cooldownCard'),
  cooldownIcon: document.getElementById('cooldownIcon'),
  cooldownTitle: document.getElementById('cooldownTitle'),
  cooldownSubtitle: document.getElementById('cooldownSubtitle'),
  cooldownTimerDisplay: document.getElementById('cooldownTimerDisplay'),
  addSongForm: document.getElementById('addSongForm'),
  songUrlInput: document.getElementById('songUrlInput'),
  btnSubmitAdd: document.getElementById('btnSubmitAdd'),
  btnSubmitAddText: document.getElementById('btnSubmitAddText'),

  // Favorites Tab
  favTotalCount: document.getElementById('favTotalCount'),
  favGuestNotice: document.getElementById('favGuestNotice'),
  btnLoginFromFav: document.getElementById('btnLoginFromFav'),
  favoritesList: document.getElementById('favoritesList'),
  favEmptyState: document.getElementById('favEmptyState'),

  // Live Chat
  chatMessages: document.getElementById('chatMessages'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('chatInput'),
  reactionBtns: document.querySelectorAll('.reaction-btn'),
  reactionContainer: document.getElementById('reactionContainer'),

  // Modals: Create Room
  btnOpenCreateRoomModal: document.getElementById('btnOpenCreateRoomModal'),
  createRoomModal: document.getElementById('createRoomModal'),
  btnCloseCreateRoomModal: document.getElementById('btnCloseCreateRoomModal'),
  createRoomForm: document.getElementById('createRoomForm'),
  createRoomAlert: document.getElementById('createRoomAlert'),
  newRoomName: document.getElementById('newRoomName'),
  newRoomDesc: document.getElementById('newRoomDesc'),
  newRoomCoverUrl: document.getElementById('newRoomCoverUrl'),
  coverPresets: document.querySelectorAll('.cover-preset'),

  // Modals: Auth
  btnOpenAuthModal: document.getElementById('btnOpenAuthModal'),
  authModal: document.getElementById('authModal'),
  closeAuthModal: document.getElementById('closeAuthModal'),
  authTabLogin: document.getElementById('authTabLogin'),
  authTabRegister: document.getElementById('authTabRegister'),
  authAlert: document.getElementById('authAlert'),
  loginForm: document.getElementById('loginForm'),
  loginInput: document.getElementById('loginInput'),
  loginPasswordInput: document.getElementById('loginPasswordInput'),
  registerForm: document.getElementById('registerForm'),
  regUsernameInput: document.getElementById('regUsernameInput'),
  regEmailInput: document.getElementById('regEmailInput'),
  regPasswordInput: document.getElementById('regPasswordInput'),
  regAvatarOptions: document.querySelectorAll('#regAvatarOptions .avatar-opt'),

  // Modals: Profile
  profileBtn: document.getElementById('profileBtn'),
  profileModal: document.getElementById('profileModal'),
  closeProfileModal: document.getElementById('closeProfileModal'),
  headerAvatar: document.getElementById('headerAvatar'),
  headerUsername: document.getElementById('headerUsername'),
  headerRoleBadge: document.getElementById('headerRoleBadge'),
  headerLevelTag: document.getElementById('headerLevelTag'),
  modalProfileAvatar: document.getElementById('modalProfileAvatar'),
  modalProfileUsername: document.getElementById('modalProfileUsername'),
  modalProfileRoleBadge: document.getElementById('modalProfileRoleBadge'),
  modalProfileEmail: document.getElementById('modalProfileEmail'),
  modalProfileLevel: document.getElementById('modalProfileLevel'),
  modalProfileXp: document.getElementById('modalProfileXp'),
  modalProfileXpFill: document.getElementById('modalProfileXpFill'),
  modalXpRemaining: document.getElementById('modalXpRemaining'),
  modalTotalRequests: document.getElementById('modalTotalRequests'),
  modalTotalFavorites: document.getElementById('modalTotalFavorites'),
  modalCooldownBonus: document.getElementById('modalCooldownBonus'),
  modalLeaderboardList: document.getElementById('modalLeaderboardList'),
  btnLogout: document.getElementById('btnLogout'),

  // Toast
  toastContainer: document.getElementById('toastContainer')
};

let selectedRegAvatar = '🎧';
let selectedCoverUrl = 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80';

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
  event.target.setVolume(appState.volume);
  if (appState.isMuted) {
    event.target.mute();
  } else {
    event.target.unMute();
  }

  if (appState.roomState.currentTrack) {
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
      DOM.unmuteNotice.classList.add('active');
    }
    if (event.data === YT.PlayerState.ENDED) {
      DOM.vinylDisc.classList.remove('is-spinning');
      DOM.tonearm.classList.remove('is-playing');
      if (socket && appState.roomState.currentTrack) {
        socket.emit('client_track_ended', {
          trackId: appState.roomState.currentTrack.id,
          videoId: appState.roomState.currentTrack.videoId
        });
      }
    }
  }
}

function onPlayerError(event) {
  console.warn('[YouTube Player] Error:', event.data);
  showToast('⚠️ Video YouTube bị hạn chế phát, đang chuyển tiếp...', 'error');
  if (socket && appState.roomState.currentTrack) {
    socket.emit('client_track_ended', {
      trackId: appState.roomState.currentTrack.id,
      videoId: appState.roomState.currentTrack.videoId,
      error: event.data
    });
  }
}

function playCurrentStationTrack() {
  if (!ytReady || !ytPlayer || !appState.roomState.currentTrack) return;

  const track = appState.roomState.currentTrack;
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
    if (!appState.isMuted) {
      ytPlayer.unMute();
      ytPlayer.setVolume(appState.volume);
    }
    ytPlayer.playVideo();
  } catch (e) {}

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
    if (!appState.roomState.currentTrack) return;

    const track = appState.roomState.currentTrack;
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
// 4. REST API & Auth Services
// ==========================================
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(endpoint, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Có lỗi xảy ra trong quá trình xử lý!');
    }
    return data;
  } catch (err) {
    throw err;
  }
}

async function checkAuthSession() {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (!token) {
    updateHeaderUserUI(null);
    return;
  }

  try {
    const res = await apiRequest('/api/auth/me');
    if (res.success && res.data.user) {
      appState.currentUser = res.data.user;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data.user));
      updateHeaderUserUI(res.data.user);
    }
  } catch (err) {
    console.warn('[Auth Check] Session expired or invalid');
    logoutUser(false);
  }
}

function updateHeaderUserUI(user) {
  if (user) {
    DOM.btnOpenAuthModal.style.display = 'none';
    DOM.profileBtn.style.display = 'flex';
    DOM.headerAvatar.textContent = user.avatar || '🎧';
    DOM.headerUsername.textContent = user.username;
    DOM.headerRoleBadge.textContent = user.role || 'USER';
    DOM.headerRoleBadge.className = `role-badge ${user.role || 'USER'}`;
    DOM.headerLevelTag.textContent = `Lv. ${user.level || 1}`;

    DOM.favGuestNotice.style.display = 'none';
    loadUserFavorites();
  } else {
    DOM.btnOpenAuthModal.style.display = 'flex';
    DOM.profileBtn.style.display = 'none';
    DOM.favGuestNotice.style.display = 'flex';
    DOM.favoritesList.innerHTML = '';
    DOM.favTotalCount.textContent = '0 bài';
  }
}

function logoutUser(notify = true) {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  appState.currentUser = null;
  updateHeaderUserUI(null);
  DOM.profileModal.style.display = 'none';

  if (socket) {
    socket.disconnect();
    initSocket();
  }

  if (notify) showToast('👋 Đã đăng xuất khỏi tài khoản.', 'success');
}

// ==========================================
// 5. Lobby Explorer & Room Management
// ==========================================
async function loadLobbyRooms() {
  try {
    const res = await apiRequest('/api/rooms');
    if (res.success && Array.isArray(res.data)) {
      appState.allRooms = res.data;
      renderLobbyRooms();
    }
  } catch (err) {
    console.error('[Load Rooms Error]:', err.message);
  }
}

function renderLobbyRooms() {
  const container = DOM.roomsGrid;
  container.innerHTML = '';

  let filtered = appState.allRooms;

  // Filter by search query
  if (appState.searchQuery.trim()) {
    const q = appState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(r => 
      r.name.toLowerCase().includes(q) || 
      (r.creatorName && r.creatorName.toLowerCase().includes(q))
    );
  }

  DOM.lobbyTotalRoomsBadge.textContent = `${filtered.length} phòng`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-muted);">
        <i class="ph ph-magnifying-glass" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
        <p style="font-size: 16px; font-weight: 600; color: var(--text-primary);">Không tìm thấy phòng nhạc nào phù hợp</p>
        <span style="font-size: 13px;">Hãy thử tìm từ khoá khác hoặc tự tạo phòng nhạc mới của riêng bạn!</span>
      </div>
    `;
    return;
  }

  filtered.forEach(room => {
    const card = document.createElement('div');
    card.className = 'room-card';

    const npTrack = room.currentTrack;
    const npTitle = npTrack ? npTrack.title : 'Đang chuẩn bị danh sách phát...';
    const npThumb = (npTrack && npTrack.thumbnail) ? npTrack.thumbnail : room.coverUrl;

    card.innerHTML = `
      <div class="room-card-cover">
        <img src="${escapeHtml(room.coverUrl)}" alt="${escapeHtml(room.name)}" loading="lazy">
        <div class="room-card-cover-overlay"></div>
        <div class="room-card-badges">
          <span class="room-live-badge"><span class="live-pulse"></span> LIVE</span>
        </div>
        <div class="room-card-listeners">
          <i class="ph-fill ph-users"></i>
          <span>${room.onlineCount || 1}</span>
        </div>
      </div>
      <div class="room-card-body">
        <h3 class="room-card-title">${escapeHtml(room.name)}</h3>
        <p class="room-card-host">Chủ phòng: <strong>${escapeHtml(room.creatorName || 'Station Master')}</strong></p>
        
        <div class="room-card-now-playing">
          <img src="${escapeHtml(npThumb)}" alt="Now Playing" class="room-np-thumb">
          <div class="room-np-info">
            <span class="room-np-label">Đang phát</span>
            <div class="room-np-title" title="${escapeHtml(npTitle)}">${escapeHtml(npTitle)}</div>
          </div>
        </div>

        <button class="btn-enter-room" data-slug="${escapeHtml(room.slug)}">
          <i class="ph-fill ph-headphones"></i>
          <span>Vào Phòng Nghe Nhạc</span>
        </button>
      </div>
    `;

    card.querySelector('.btn-enter-room').addEventListener('click', () => {
      switchView('room', room.slug);
    });

    container.appendChild(card);
  });
}

// ==========================================
// 6. View Routing & Navigation
// ==========================================
function switchView(viewName, slug = null) {
  appState.currentView = viewName;

  if (viewName === 'lobby') {
    DOM.lobbyView.style.display = 'flex';
    DOM.roomView.style.display = 'none';
    DOM.navBtnLobby.classList.add('active');
    DOM.navBtnLeaderboard.classList.remove('active');
    window.location.hash = '';

    loadLobbyRooms();
  } else if (viewName === 'room' && slug) {
    DOM.lobbyView.style.display = 'none';
    DOM.roomView.style.display = 'grid';
    DOM.navBtnLobby.classList.remove('active');
    appState.activeRoomSlug = slug;
    window.location.hash = `room-${slug}`;

    // Join Socket Room
    if (socket) {
      socket.emit('join_room', { slug });
    }
  }
}

// ==========================================
// 7. Socket.IO Realtime Integration
// ==========================================
let socket = null;

function initSocket() {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  
  socket = io({
    auth: {
      token: token || null,
      guestId: appState.guestUser.id,
      guestName: appState.guestUser.username,
      guestAvatar: appState.guestUser.avatar
    }
  });

  socket.on('connect', () => {
    console.log('⚡ Connected to Station Realtime Server!');
    if (appState.currentView === 'room' && appState.activeRoomSlug) {
      socket.emit('join_room', { slug: appState.activeRoomSlug });
    }
  });

  // Successful room join
  socket.on('room_joined_success', (data) => {
    appState.activeRoomData = data.room;
    appState.roomState.currentTrack = data.currentTrack;
    appState.roomState.queue = data.queue || [];
    appState.roomState.onlineCount = data.onlineCount || 1;

    // Update Room Header
    DOM.roomActiveTitle.textContent = data.room.name;
    DOM.roomActiveHost.textContent = data.room.creatorName || 'Station Master';
    DOM.listenerCount.textContent = data.onlineCount || 1;

    // Show / Hide Delete & Admin Skip buttons
    const isOwnerOrAdmin = (appState.currentUser && (appState.currentUser.role === 'ADMIN' || appState.currentUser.id === data.room.creatorId));
    DOM.btnAdminInstantSkip.style.display = isOwnerOrAdmin ? 'flex' : 'none';
    DOM.btnDeleteRoom.style.display = (isOwnerOrAdmin && !data.room.isDefault) ? 'flex' : 'none';

    // Render Chat History
    DOM.chatMessages.innerHTML = '';
    if (data.chatHistory && data.chatHistory.length > 0) {
      data.chatHistory.forEach(msg => appendChatMessage(msg));
    }

    // Render Queue & Cooldown
    renderQueue(data.queue || []);
    updateCooldownUI(data.cooldown);

    // Update Track Visuals
    if (data.currentTrack) {
      updateTrackUI(data.currentTrack);
      playCurrentStationTrack();
    }

    if (data.activeVote && data.activeVote.active) {
      showVoteBanner(data.activeVote);
    } else {
      hideVoteBanner();
    }
  });

  // Station State Update
  socket.on('station_state_update', (data) => {
    if (data.slug !== appState.activeRoomSlug) return;

    appState.roomState.onlineCount = data.onlineCount;
    DOM.listenerCount.textContent = data.onlineCount;

    if (data.currentTrack) {
      const isNew = !appState.roomState.currentTrack || appState.roomState.currentTrack.videoId !== data.currentTrack.videoId;
      appState.roomState.currentTrack = data.currentTrack;
      updateTrackUI(data.currentTrack);
      if (isNew) playCurrentStationTrack();
    }

    renderQueue(data.queue || []);
  });

  // Track Started
  socket.on('track_started', (data) => {
    if (data.slug !== appState.activeRoomSlug) return;

    appState.roomState.currentTrack = data.track;
    updateTrackUI(data.track);
    renderQueue(data.queue || []);
    playCurrentStationTrack();

    if (data.voteWindow && data.voteWindow.active) {
      showVoteBanner(data.voteWindow);
    }
  });

  // Queue Updated
  socket.on('queue_updated', (data) => {
    appState.roomState.queue = data.queue || [];
    renderQueue(data.queue || []);
  });

  socket.on('queue_success', (data) => {
    showToast(`✅ Đã thêm bài "${data.track.title}" vào hàng chờ!`, 'success');
    DOM.songUrlInput.value = '';
    updateCooldownUI(data.cooldown);
    switchTab('queue');
  });

  socket.on('queue_error', (data) => {
    showToast(`⚠️ ${data.message}`, 'error');
    if (data.cooldown) updateCooldownUI(data.cooldown);
  });

  // Vote Events
  socket.on('vote_window_opened', (voteData) => {
    showVoteBanner(voteData);
  });

  socket.on('vote_counts_updated', (voteData) => {
    updateVoteCounts(voteData);
  });

  socket.on('vote_window_closed', () => {
    hideVoteBanner();
  });

  // Chat & Reactions
  socket.on('chat_message', (msg) => {
    appendChatMessage(msg);
  });

  socket.on('reaction_burst', (data) => {
    createFloatingEmoji(data.emoji);
  });

  // Lobby update from server
  socket.on('lobby_rooms_update', (rooms) => {
    appState.allRooms = rooms;
    if (appState.currentView === 'lobby') {
      renderLobbyRooms();
    }
  });
}

// ==========================================
// 8. Track UI & Queue Helpers
// ==========================================
function updateTrackUI(track) {
  if (!track) return;
  DOM.currentTitle.textContent = track.title;
  DOM.currentTitle.title = track.title;
  DOM.currentAuthor.textContent = track.author || 'Unknown Artist';
  DOM.requesterName.textContent = track.isDefault ? 'Station Radio' : track.requestedBy;
  DOM.currentThumb.src = track.thumbnail || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
  DOM.vinylArtwork.src = track.thumbnail || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;

  checkFavoriteStatus(track.videoId);
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
      <img src="${escapeHtml(track.thumbnail)}" alt="${escapeHtml(track.title)}" class="queue-thumb" loading="lazy">
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
  const isMe = (appState.currentUser && msg.userId === appState.currentUser.id) || (!appState.currentUser && msg.userId === appState.guestUser.id);
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
  appState.roomState.voteWindow = {
    ...appState.roomState.voteWindow,
    ...voteData,
    active: true,
    startTime: Date.now()
  };

  DOM.voteBanner.classList.add('active');
  DOM.btnVoteKeep.classList.remove('voted');
  DOM.btnVoteSkip.classList.remove('voted');

  updateVoteCounts(voteData);

  if (appState.roomState.voteWindow.timerInterval) {
    clearInterval(appState.roomState.voteWindow.timerInterval);
  }

  const duration = voteData.duration || 10;
  const start = Date.now();

  appState.roomState.voteWindow.timerInterval = setInterval(() => {
    const elapsed = (Date.now() - start) / 1000;
    const remaining = Math.max(0, duration - elapsed);
    const percent = (remaining / duration) * 100;

    DOM.voteCountdownTimer.textContent = `${remaining.toFixed(1)}s`;
    DOM.voteProgressBar.style.width = `${percent}%`;

    if (remaining <= 0) {
      clearInterval(appState.roomState.voteWindow.timerInterval);
      appState.roomState.voteWindow.timerInterval = null;
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
  if (appState.roomState.voteWindow.timerInterval) {
    clearInterval(appState.roomState.voteWindow.timerInterval);
    appState.roomState.voteWindow.timerInterval = null;
  }
}

// Cooldown Management
function updateCooldownUI(cooldown) {
  if (!cooldown) return;

  if (appState.roomState.cooldown.timerInterval) {
    clearInterval(appState.roomState.cooldown.timerInterval);
  }

  appState.roomState.cooldown = { ...appState.roomState.cooldown, ...cooldown };

  if (cooldown.isAdmin) {
    DOM.tabCooldownPill.textContent = 'Admin Bypass';
    DOM.cooldownCard.className = 'cooldown-card ready';
    DOM.cooldownIcon.className = 'ph-fill ph-lightning';
    DOM.cooldownTitle.textContent = 'Đặc Quyền Quản Trị / Chủ Phòng';
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
        clearInterval(appState.roomState.cooldown.timerInterval);
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
    appState.roomState.cooldown.timerInterval = setInterval(tick, 1000);
  }
}

// ==========================================
// 9. User Favorites Feature
// ==========================================
let userFavorites = [];

async function loadUserFavorites() {
  if (!appState.currentUser) return;
  try {
    const res = await apiRequest('/api/user/favorites');
    if (res.success && Array.isArray(res.data)) {
      userFavorites = res.data;
      DOM.favTotalCount.textContent = `${userFavorites.length} bài`;
      renderFavorites();

      if (appState.roomState.currentTrack) {
        checkFavoriteStatus(appState.roomState.currentTrack.videoId);
      }
    }
  } catch (err) {
    console.warn('[Favorites load error]:', err.message);
  }
}

function renderFavorites() {
  if (!appState.currentUser) return;

  if (userFavorites.length === 0) {
    DOM.favoritesList.innerHTML = '';
    DOM.favEmptyState.style.display = 'flex';
    return;
  }

  DOM.favEmptyState.style.display = 'none';
  DOM.favoritesList.innerHTML = '';

  userFavorites.forEach(item => {
    const el = document.createElement('div');
    el.className = 'favorite-item';
    el.innerHTML = `
      <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="fav-thumb" loading="lazy">
      <div class="fav-details">
        <div class="fav-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="fav-author">${escapeHtml(item.author || 'Unknown')}</div>
      </div>
      <div class="fav-actions">
        <button class="btn-fav-add" data-vid="${escapeHtml(item.videoId)}" title="Phát bài này vào hàng chờ">
          <i class="ph-bold ph-plus"></i> Phát
        </button>
        <button class="btn-fav-del" data-vid="${escapeHtml(item.videoId)}" title="Xoá khỏi yêu thích">
          <i class="ph-bold ph-trash"></i>
        </button>
      </div>
    `;

    el.querySelector('.btn-fav-add').addEventListener('click', () => {
      if (socket) {
        socket.emit('add_to_queue', { urlOrId: item.videoId });
      }
    });

    el.querySelector('.btn-fav-del').addEventListener('click', async () => {
      await removeFavorite(item.videoId);
    });

    DOM.favoritesList.appendChild(el);
  });
}

function checkFavoriteStatus(videoId) {
  if (!appState.currentUser || !videoId) {
    DOM.favHeartIcon.className = 'ph-bold ph-heart';
    DOM.btnToggleFavorite.classList.remove('active');
    return;
  }

  const isFav = userFavorites.some(f => f.videoId === videoId);
  if (isFav) {
    DOM.favHeartIcon.className = 'ph-fill ph-heart';
    DOM.btnToggleFavorite.classList.add('active');
  } else {
    DOM.favHeartIcon.className = 'ph-bold ph-heart';
    DOM.btnToggleFavorite.classList.remove('active');
  }
}

async function toggleCurrentTrackFavorite() {
  if (!appState.currentUser) {
    DOM.authModal.style.display = 'flex';
    showToast('🔑 Vui lòng đăng nhập để lưu bài hát yêu thích!', 'info');
    return;
  }

  const track = appState.roomState.currentTrack;
  if (!track || !track.videoId) return;

  const isFav = userFavorites.some(f => f.videoId === track.videoId);

  if (isFav) {
    await removeFavorite(track.videoId);
  } else {
    await addFavorite(track);
  }
}

async function addFavorite(track) {
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
      userFavorites.unshift(res.data);
      DOM.favTotalCount.textContent = `${userFavorites.length} bài`;
      checkFavoriteStatus(track.videoId);
      renderFavorites();
      showToast('❤️ Đã lưu bài hát vào danh sách Yêu Thích!', 'success');
    }
  } catch (err) {
    showToast(`⚠️ ${err.message}`, 'error');
  }
}

async function removeFavorite(videoId) {
  try {
    const res = await apiRequest(`/api/user/favorites/${videoId}`, {
      method: 'DELETE'
    });

    if (res.success) {
      userFavorites = userFavorites.filter(f => f.videoId !== videoId);
      DOM.favTotalCount.textContent = `${userFavorites.length} bài`;
      if (appState.roomState.currentTrack) checkFavoriteStatus(appState.roomState.currentTrack.videoId);
      renderFavorites();
      showToast('💔 Đã bỏ khỏi danh sách yêu thích.', 'info');
    }
  } catch (err) {
    showToast(`⚠️ ${err.message}`, 'error');
  }
}

// ==========================================
// 10. Event Listeners & Interaction Handlers
// ==========================================
function setupEventListeners() {
  // Navigation Bar Switcher
  DOM.navBtnLobby.addEventListener('click', () => switchView('lobby'));
  DOM.btnLogoHome.addEventListener('click', () => switchView('lobby'));
  DOM.btnBackToLobby.addEventListener('click', () => switchView('lobby'));

  DOM.navBtnLeaderboard.addEventListener('click', async () => {
    DOM.profileModal.style.display = 'flex';
    loadLeaderboard();
  });

  // Lobby Search Input
  DOM.lobbySearchInput.addEventListener('input', (e) => {
    appState.searchQuery = e.target.value;
    renderLobbyRooms();
  });

  DOM.btnRefreshLobby.addEventListener('click', () => {
    loadLobbyRooms();
    showToast('🔄 Đã làm mới danh sách phòng nhạc!', 'success');
  });

  // Share Room Link
  DOM.btnShareRoom.addEventListener('click', () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showToast('🔗 Đã sao chép link phòng vào bộ nhớ tạm!', 'success');
    }).catch(() => {
      showToast(url, 'info');
    });
  });

  // Delete Room (Owner / Admin)
  DOM.btnDeleteRoom.addEventListener('click', async () => {
    if (!confirm('Bạn có chắc chắn muốn xoá phòng nhạc này không?')) return;
    try {
      const res = await apiRequest(`/api/rooms/${appState.activeRoomSlug}`, { method: 'DELETE' });
      if (res.success) {
        showToast('🗑️ Đã xoá phòng nhạc thành công!', 'success');
        switchView('lobby');
      }
    } catch (err) {
      showToast(`⚠️ ${err.message}`, 'error');
    }
  });

  // Sidebar Tabs Switching
  DOM.sidebarTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // View Switcher (Vinyl vs Video) without killing background iframe audio
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

  // Turntable Click-to-Play
  DOM.turntableWrapper.addEventListener('click', () => {
    if (ytReady && ytPlayer) {
      try {
        ytPlayer.unMute();
        ytPlayer.setVolume(appState.volume);
        ytPlayer.playVideo();
        DOM.unmuteNotice.classList.remove('active');
      } catch (e) {}
    }
  });

  // Unmute notice button
  DOM.btnUnmute.addEventListener('click', () => {
    if (ytPlayer && ytPlayer.unMute) {
      ytPlayer.unMute();
      ytPlayer.setVolume(appState.volume);
      DOM.unmuteNotice.classList.remove('active');
    }
  });

  // Global one-time audio unlock gesture
  const unlockAudio = () => {
    if (ytReady && ytPlayer) {
      try {
        if (ytPlayer.isMuted && ytPlayer.isMuted()) {
          ytPlayer.unMute();
          ytPlayer.setVolume(appState.volume);
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
    if (socket) socket.emit('admin_instant_skip');
  });

  // Toggle Favorite
  DOM.btnToggleFavorite.addEventListener('click', () => {
    toggleCurrentTrackFavorite();
  });

  // Volume Slider
  DOM.volumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    appState.volume = val;
    localStorage.setItem(STORAGE_KEYS.VOLUME, val);
    DOM.volumeValue.textContent = `${val}%`;

    if (ytReady && ytPlayer && ytPlayer.setVolume) {
      ytPlayer.setVolume(val);
      if (val > 0 && ytPlayer.isMuted()) ytPlayer.unMute();
    }
  });

  DOM.volumeMuteBtn.addEventListener('click', () => {
    appState.isMuted = !appState.isMuted;
    if (ytReady && ytPlayer) {
      if (appState.isMuted) {
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
    if (appState.roomState.currentTrack) {
      playCurrentStationTrack();
      showToast('🔄 Đã đồng bộ lại với phòng nhạc!', 'success');
    }
  });

  DOM.btnOpenAddModal.addEventListener('click', () => switchTab('add'));
  DOM.btnOpenAddFromQueue.addEventListener('click', () => switchTab('add'));

  // Add Song Form Submit
  DOM.addSongForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const urlOrId = DOM.songUrlInput.value.trim();
    if (!urlOrId || !socket) return;

    socket.emit('add_to_queue', { urlOrId });
  });

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
      if (socket) socket.emit('send_reaction', { emoji });
    });
  });

  // 10s Vote Buttons
  DOM.btnVoteKeep.addEventListener('click', () => {
    if (!socket || !appState.roomState.voteWindow.active) return;
    DOM.btnVoteKeep.classList.add('voted');
    DOM.btnVoteSkip.classList.remove('voted');
    socket.emit('submit_vote', { voteType: 'keep' });
  });

  DOM.btnVoteSkip.addEventListener('click', () => {
    if (!socket || !appState.roomState.voteWindow.active) return;
    DOM.btnVoteSkip.classList.add('voted');
    DOM.btnVoteKeep.classList.remove('voted');
    socket.emit('submit_vote', { voteType: 'skip' });
  });

  // ==========================================
  // Modal: Create Room Handlers
  // ==========================================
  DOM.btnOpenCreateRoomModal.addEventListener('click', () => {
    if (!appState.currentUser) {
      DOM.authModal.style.display = 'flex';
      showToast('🔑 Vui lòng đăng nhập để tạo phòng nhạc của riêng bạn!', 'info');
      return;
    }
    DOM.createRoomAlert.style.display = 'none';
    DOM.createRoomModal.style.display = 'flex';
  });

  DOM.btnCloseCreateRoomModal.addEventListener('click', () => {
    DOM.createRoomModal.style.display = 'none';
  });

  // Cover Presets Click
  DOM.coverPresets.forEach(preset => {
    preset.addEventListener('click', () => {
      DOM.coverPresets.forEach(p => p.classList.remove('selected'));
      preset.classList.add('selected');
      selectedCoverUrl = preset.dataset.url;
      if (DOM.newRoomCoverUrl) DOM.newRoomCoverUrl.value = '';
    });
  });

  // Create Room Submit
  DOM.createRoomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = DOM.newRoomName.value.trim();
    const description = DOM.newRoomDesc ? DOM.newRoomDesc.value.trim() : '';
    const customCover = DOM.newRoomCoverUrl ? DOM.newRoomCoverUrl.value.trim() : '';
    const coverUrl = customCover || selectedCoverUrl;

    if (!name) return;

    try {
      const res = await apiRequest('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ name, description, coverUrl })
      });

      if (res.success && res.data) {
        showToast('🎉 Tạo phòng nhạc thành công! Đang chuyển đến phòng...', 'success');
        DOM.createRoomModal.style.display = 'none';
        DOM.createRoomForm.reset();
        switchView('room', res.data.slug);
      }
    } catch (err) {
      DOM.createRoomAlert.textContent = err.message;
      DOM.createRoomAlert.className = 'modal-alert error';
      DOM.createRoomAlert.style.display = 'block';
    }
  });

  // ==========================================
  // Modal: Auth Handlers
  // ==========================================
  DOM.btnOpenAuthModal.addEventListener('click', () => {
    DOM.authAlert.style.display = 'none';
    DOM.authModal.style.display = 'flex';
  });

  DOM.btnLoginFromFav.addEventListener('click', () => {
    DOM.authAlert.style.display = 'none';
    DOM.authModal.style.display = 'flex';
  });

  DOM.closeAuthModal.addEventListener('click', () => {
    DOM.authModal.style.display = 'none';
  });

  DOM.authTabLogin.addEventListener('click', () => {
    DOM.authTabLogin.classList.add('active');
    DOM.authTabRegister.classList.remove('active');
    DOM.loginForm.style.display = 'flex';
    DOM.registerForm.style.display = 'none';
    DOM.authAlert.style.display = 'none';
  });

  DOM.authTabRegister.addEventListener('click', () => {
    DOM.authTabRegister.classList.add('active');
    DOM.authTabLogin.classList.remove('active');
    DOM.registerForm.style.display = 'flex';
    DOM.loginForm.style.display = 'none';
    DOM.authAlert.style.display = 'none';
  });

  DOM.regAvatarOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      DOM.regAvatarOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedRegAvatar = opt.dataset.avatar;
    });
  });

  // Login Submit
  DOM.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const login = DOM.loginInput.value.trim();
    const password = DOM.loginPasswordInput.value;

    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password })
      });

      if (res.success && res.data) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, res.data.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data.user));
        appState.currentUser = res.data.user;
        updateHeaderUserUI(res.data.user);
        DOM.authModal.style.display = 'none';
        DOM.loginForm.reset();

        showToast(`🎉 Chào mừng ${res.data.user.username} quay trở lại!`, 'success');

        if (socket) {
          socket.disconnect();
          initSocket();
        }
      }
    } catch (err) {
      DOM.authAlert.textContent = err.message;
      DOM.authAlert.className = 'modal-alert error';
      DOM.authAlert.style.display = 'block';
    }
  });

  // Register Submit
  DOM.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = DOM.regUsernameInput.value.trim();
    const email = DOM.regEmailInput.value.trim();
    const password = DOM.regPasswordInput.value;

    try {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, avatar: selectedRegAvatar })
      });

      if (res.success && res.data) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, res.data.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.data.user));
        appState.currentUser = res.data.user;
        updateHeaderUserUI(res.data.user);
        DOM.authModal.style.display = 'none';
        DOM.registerForm.reset();

        showToast(`🎉 Tạo tài khoản thành công! Chào mừng ${res.data.user.username}!`, 'success');

        if (socket) {
          socket.disconnect();
          initSocket();
        }
      }
    } catch (err) {
      DOM.authAlert.textContent = err.message;
      DOM.authAlert.className = 'modal-alert error';
      DOM.authAlert.style.display = 'block';
    }
  });

  // ==========================================
  // Modal: Profile & Leaderboard Handlers
  // ==========================================
  DOM.profileBtn.addEventListener('click', () => {
    openProfileModal();
  });

  DOM.closeProfileModal.addEventListener('click', () => {
    DOM.profileModal.style.display = 'none';
  });

  DOM.btnLogout.addEventListener('click', () => {
    logoutUser(true);
  });
}

function switchTab(tabName) {
  DOM.sidebarTabBtns.forEach(b => {
    if (b.dataset.tab === tabName) b.classList.add('active');
    else b.classList.remove('active');
  });

  DOM.tabPanes.forEach(pane => {
    if (pane.id === `tabPane${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

function openProfileModal() {
  if (!appState.currentUser) return;
  const u = appState.currentUser;

  DOM.modalProfileAvatar.textContent = u.avatar || '🎧';
  DOM.modalProfileUsername.textContent = u.username;
  DOM.modalProfileRoleBadge.textContent = u.role || 'USER';
  DOM.modalProfileRoleBadge.className = `role-badge ${u.role || 'USER'}`;
  DOM.modalProfileEmail.textContent = u.email;
  DOM.modalProfileLevel.textContent = `Cấp độ ${u.level || 1}`;
  DOM.modalProfileXp.textContent = `${u.xp || 0} XP`;

  const nextLevelXp = (u.level || 1) * 100;
  const currentLevelProgress = (u.xp || 0) % 100;
  DOM.modalProfileXpFill.style.width = `${Math.min(100, currentLevelProgress)}%`;
  DOM.modalXpRemaining.textContent = `Cần ${100 - currentLevelProgress} XP để lên Lv. ${(u.level || 1) + 1}`;

  DOM.modalTotalRequests.textContent = u.totalRequests || 0;
  DOM.modalTotalFavorites.textContent = userFavorites.length;
  DOM.modalCooldownBonus.textContent = (u.role === 'VIP' || u.role === 'DJ') ? '2 phút' : (u.role === 'ADMIN' ? '0 giây' : '5 phút');

  loadLeaderboard();
  DOM.profileModal.style.display = 'flex';
}

async function loadLeaderboard() {
  try {
    const res = await apiRequest('/api/user/leaderboard');
    if (res.success && Array.isArray(res.data)) {
      DOM.modalLeaderboardList.innerHTML = '';
      res.data.forEach((l, idx) => {
        const item = document.createElement('div');
        item.className = 'leader-item';
        item.innerHTML = `
          <strong style="width: 20px; font-family: var(--font-mono); color: ${idx === 0 ? 'var(--accent-amber)' : 'var(--text-muted)'};">#${idx + 1}</strong>
          <span style="font-size: 16px;">${escapeHtml(l.avatar || '🎧')}</span>
          <span style="font-weight: 700; flex: 1;">${escapeHtml(l.username)}</span>
          <span class="role-badge ${escapeHtml(l.role || 'USER')}">${escapeHtml(l.role || 'USER')}</span>
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-cyan);">${l.totalRequests || 0} bài</span>
        `;
        DOM.modalLeaderboardList.appendChild(item);
      });
    }
  } catch (err) {
    console.warn('[Leaderboard error]:', err.message);
  }
}

// ==========================================
// 11. Utilities (Toast, Emoji, Formatting)
// ==========================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function createFloatingEmoji(emoji) {
  const el = document.createElement('div');
  el.className = 'floating-emoji';
  el.textContent = emoji;
  el.style.left = `${Math.floor(20 + Math.random() * 60)}%`;
  DOM.reactionContainer.appendChild(el);

  setTimeout(() => el.remove(), 3000);
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatChatTime(timestamp) {
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// ==========================================
// 12. App Initialization
// ==========================================
async function initApp() {
  console.log('🎧 Initializing Lofi Lounge Hub Client (v2.0.0)...');

  setupEventListeners();
  checkAuthSession();
  initSocket();

  // Route handling based on URL hash (e.g. #room-lofi-chill-study)
  const hash = window.location.hash;
  if (hash && hash.startsWith('#room-')) {
    const slug = hash.replace('#room-', '');
    switchView('room', slug);
  } else {
    // DEFAULT VIEW: Sảnh các phòng nhạc
    switchView('lobby');
  }
}

document.addEventListener('DOMContentLoaded', initApp);
