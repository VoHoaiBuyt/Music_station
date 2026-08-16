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

  // Header Elements
  headerSearchInput: document.getElementById('headerSearchInput'),
  btnClearHeaderSearch: document.getElementById('btnClearHeaderSearch'),

  // Lobby Elements
  lobbySearchInput: document.getElementById('headerSearchInput'),
  roomsGrid: document.getElementById('roomsGrid'),
  lobbyTotalRoomsBadge: document.getElementById('lobbyTotalRoomsBadge'),
  btnRefreshLobby: document.getElementById('btnRefreshLobby'),

  // Room Header Bar
  roomActiveTitle: document.getElementById('roomActiveTitle'),
  roomActiveHost: document.getElementById('roomActiveHost'),
  listenerCount: document.getElementById('listenerCount'),
  btnShareRoom: document.getElementById('btnShareRoom'),
  btnLeaveRoom: document.getElementById('btnLeaveRoom'),
  btnTransferOwnership: document.getElementById('btnTransferOwnership'),
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

  // Add Song Form & YouTube Search
  cooldownCard: document.getElementById('cooldownCard'),
  cooldownIcon: document.getElementById('cooldownIcon'),
  cooldownTitle: document.getElementById('cooldownTitle'),
  cooldownSubtitle: document.getElementById('cooldownSubtitle'),
  cooldownTimerDisplay: document.getElementById('cooldownTimerDisplay'),
  songSearchInput: document.getElementById('songSearchInput'),
  btnClearSongSearch: document.getElementById('btnClearSongSearch'),
  ytSearchResults: document.getElementById('ytSearchResults'),
  ytSearchLoading: document.getElementById('ytSearchLoading'),

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
  labelPublicRoom: document.getElementById('labelPublicRoom'),
  labelPrivateRoom: document.getElementById('labelPrivateRoom'),
  createRoomPasswordWrap: document.getElementById('createRoomPasswordWrap'),
  newRoomPassword: document.getElementById('newRoomPassword'),

  // Modals: Join Private Room
  joinPrivateRoomModal: document.getElementById('joinPrivateRoomModal'),
  joinPrivateRoomForm: document.getElementById('joinPrivateRoomForm'),
  joinPrivateTargetSlug: document.getElementById('joinPrivateTargetSlug'),
  joinPrivatePasswordInput: document.getElementById('joinPrivatePasswordInput'),
  joinPrivateAlert: document.getElementById('joinPrivateAlert'),
  joinPrivateRoomSub: document.getElementById('joinPrivateRoomSub'),
  btnCloseJoinPrivateModal: document.getElementById('btnCloseJoinPrivateModal'),

  // Modals: Transfer Ownership
  transferOwnershipModal: document.getElementById('transferOwnershipModal'),
  btnCloseTransferModal: document.getElementById('btnCloseTransferModal'),
  transferAlert: document.getElementById('transferAlert'),
  transferListenersList: document.getElementById('transferListenersList'),

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

  // Modals: Admin Control Panel
  btnOpenAdminPanel: document.getElementById('btnOpenAdminPanel'),
  adminModal: document.getElementById('adminModal'),
  btnCloseAdminModal: document.getElementById('btnCloseAdminModal'),
  adminUserSearchInput: document.getElementById('adminUserSearchInput'),
  btnRefreshAdminUsers: document.getElementById('btnRefreshAdminUsers'),
  adminUsersList: document.getElementById('adminUsersList'),

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

    // Show Admin trigger if role is ADMIN
    if (DOM.btnOpenAdminPanel) {
      DOM.btnOpenAdminPanel.style.display = (user.role === 'ADMIN') ? 'flex' : 'none';
    }

    DOM.favGuestNotice.style.display = 'none';
    loadUserFavorites();
  } else {
    DOM.btnOpenAuthModal.style.display = 'flex';
    DOM.profileBtn.style.display = 'none';
    if (DOM.btnOpenAdminPanel) {
      DOM.btnOpenAdminPanel.style.display = 'none';
    }
    DOM.favGuestNotice.style.display = 'flex';
    DOM.favoritesList.innerHTML = '';
    DOM.favTotalCount.textContent = '0 bài';
  }
}

function logoutUser(showNotification = true) {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  appState.currentUser = null;
  updateHeaderUserUI(null);
  userFavorites = [];
  renderFavoritesList([]);

  if (showNotification) {
    showToast('👋 Đã đăng xuất thành công!', 'info');
  }
  if (DOM.profileModal) DOM.profileModal.style.display = 'none';
  if (DOM.adminModal) DOM.adminModal.style.display = 'none';
  initSocket();
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

  let filtered = appState.allRooms || [];

  // Filter by search query (room name, slug, or host name)
  if (appState.searchQuery.trim()) {
    const q = appState.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.slug.toLowerCase().includes(q) ||
      (r.creatorName && r.creatorName.toLowerCase().includes(q))
    );
  }

  DOM.lobbyTotalRoomsBadge.textContent = `${filtered.length} phòng`;

  if (filtered.length === 0) {
    if (!appState.allRooms || appState.allRooms.length === 0) {
      container.innerHTML = `
        <div class="lobby-empty-state">
          <div class="lobby-empty-icon">
            <i class="ph-fill ph-broadcast"></i>
          </div>
          <h3>Chưa có phòng nhạc nào</h3>
          <p>Hiện chưa có phòng nhạc nào được tạo. Hãy là người đầu tiên tạo phòng để phát nhạc và mời bạn bè cùng lắng nghe!</p>
          <button class="btn-empty-create" id="btnCreateFirstRoom">
            <i class="ph-bold ph-plus-circle"></i>
            <span>+ Tạo Phòng Nhạc Đầu Tiên</span>
          </button>
        </div>
      `;
      const btn = document.getElementById('btnCreateFirstRoom');
      if (btn) {
        btn.addEventListener('click', () => {
          if (!appState.currentUser) {
            DOM.authModal.style.display = 'flex';
            showToast('🔑 Vui lòng đăng nhập để tạo phòng nhạc!', 'info');
          } else {
            DOM.createRoomModal.style.display = 'flex';
          }
        });
      }
    } else {
      container.innerHTML = `
        <div class="lobby-empty-state">
          <div class="lobby-empty-icon" style="background: rgba(255,255,255,0.05); color: var(--text-muted);">
            <i class="ph ph-magnifying-glass"></i>
          </div>
          <h3>Không tìm thấy phòng phù hợp</h3>
          <p>Không có phòng nào khớp với từ khoá "<strong>${escapeHtml(appState.searchQuery)}</strong>". Hãy thử tìm kiếm tên khác hoặc tạo phòng mới!</p>
        </div>
      `;
    }
    return;
  }

  filtered.forEach(room => {
    const card = document.createElement('div');
    card.className = 'room-card';

    const npTrack = room.currentTrack;
    const npTitle = npTrack ? npTrack.title : 'Đang chờ bài hát từ người nghe...';
    const npThumb = (npTrack && npTrack.thumbnail) ? npTrack.thumbnail : room.coverUrl;

    const privacyBadge = room.isPrivate 
      ? `<span class="room-badge-pill room-badge-private"><i class="ph-fill ph-lock-key"></i> Riêng tư</span>`
      : `<span class="room-badge-pill room-badge-public"><i class="ph-fill ph-globe"></i> Công khai</span>`;

    card.innerHTML = `
      <div class="room-card-cover">
        <img src="${escapeHtml(room.coverUrl)}" alt="${escapeHtml(room.name)}" loading="lazy">
        <div class="room-card-cover-overlay"></div>
        <div class="room-card-badges">
          <span class="room-live-badge"><span class="live-pulse"></span> LIVE</span>
          ${privacyBadge}
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
      // Check if private password required
      if (room.isPrivate && room.hasPassword && (!appState.currentUser || (appState.currentUser.id !== room.creatorId && appState.currentUser.role !== 'ADMIN'))) {
        openJoinPrivateRoomModal(room.slug, room.name);
      } else {
        switchView('room', room.slug);
      }
    });

    container.appendChild(card);
  });
}

function openJoinPrivateRoomModal(slug, name) {
  DOM.joinPrivateTargetSlug.value = slug;
  DOM.joinPrivateRoomSub.textContent = `Phòng "${name || slug}" yêu cầu mật khẩu để tham gia`;
  DOM.joinPrivatePasswordInput.value = '';
  DOM.joinPrivateAlert.style.display = 'none';
  DOM.joinPrivateRoomModal.style.display = 'flex';
  DOM.joinPrivatePasswordInput.focus();
}

// ==========================================
// 6. View Routing & Navigation
// ==========================================
function switchView(viewName, slug = null, password = null) {
  appState.currentView = viewName;

  if (viewName === 'lobby') {
    // Notify server to leave the active room namespace
    if (socket && appState.activeRoomSlug) {
      socket.emit('leave_room');
    }

    // Stop music playback when returning to lobby
    if (ytPlayer && ytReady) {
      try {
        ytPlayer.stopVideo();
      } catch (e) {}
    }

    appState.activeRoomSlug = null;
    appState.activeRoomData = null;
    DOM.chatMessages.innerHTML = '';
    DOM.queueList.innerHTML = '';
    hideVoteBanner();

    DOM.lobbyView.style.display = 'flex';
    DOM.roomView.style.display = 'none';
    if (DOM.navBtnLobby) DOM.navBtnLobby.classList.add('active');
    if (DOM.navBtnLeaderboard) DOM.navBtnLeaderboard.classList.remove('active');
    
    // Dynamic SEO title for Lobby
    document.title = 'Music Room Hub - Sảnh Nghe Nhạc Trực Tuyến Đa Phòng Đồng Bộ';

    // Update URL to clean state
    history.replaceState(null, '', window.location.pathname);
    loadLobbyRooms();
  } else if (viewName === 'room' && slug) {
    DOM.lobbyView.style.display = 'none';
    DOM.roomView.style.display = 'grid';
    if (DOM.navBtnLobby) DOM.navBtnLobby.classList.remove('active');
    appState.activeRoomSlug = slug;
    
    // Clean old room state before receiving snapshot from server
    appState.roomState.currentTrack = null;
    appState.roomState.queue = [];
    DOM.chatMessages.innerHTML = '';
    DOM.queueList.innerHTML = '';
    updateTrackUI(null);
    hideVoteBanner();

    // Update URL query parameter to ?room=slug
    history.replaceState(null, '', `?room=${encodeURIComponent(slug)}`);

    // Join Socket Room
    if (socket) {
      socket.emit('join_room', { slug, password });
    }
  }
}

// ==========================================
// 7. Socket.IO Realtime Integration
// ==========================================
let socket = null;

function initSocket() {
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (e) {}
    socket = null;
  }

  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const currentU = appState.currentUser;
  
  socket = io({
    auth: {
      token: token || null,
      guestId: currentU ? currentU.id : appState.guestUser.id,
      guestName: currentU ? currentU.username : appState.guestUser.username,
      guestAvatar: currentU ? currentU.avatar : appState.guestUser.avatar
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

    // Update Room Header & Title
    DOM.roomActiveTitle.textContent = data.room.name;
    DOM.roomActiveHost.textContent = data.room.creatorName || 'Station Master';
    DOM.listenerCount.textContent = data.onlineCount || 1;
    document.title = `${data.room.name} 🎵 • Music Room Hub`;

    // Show / Hide Controls (Owner & Admin)
    updateRoomControlsVisibility(data.room);

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
      appState.roomState.currentTrack = data.currentTrack;
      updateTrackUI(data.currentTrack);
      playCurrentStationTrack();
    } else {
      appState.roomState.currentTrack = null;
      updateTrackUI(null);
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
    } else {
      appState.roomState.currentTrack = null;
      updateTrackUI(null);
      hideVoteBanner();
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
    if (DOM.songSearchInput) {
      DOM.songSearchInput.value = '';
      if (DOM.btnClearSongSearch) DOM.btnClearSongSearch.style.display = 'none';
      if (DOM.ytSearchResults) DOM.ytSearchResults.innerHTML = '';
    }
    updateCooldownUI(data.cooldown);
    switchTab('queue');
  });

  socket.on('queue_error', (data) => {
    showToast(`⚠️ ${data.message}`, 'error');
    if (data.cooldown) updateCooldownUI(data.cooldown);
  });

  // Private room password required
  socket.on('room_password_required', (data) => {
    openJoinPrivateRoomModal(data.slug, data.name);
  });

  // Ownership transferred real-time
  socket.on('ownership_transferred', (data) => {
    if (data.slug !== appState.activeRoomSlug) return;
    DOM.roomActiveHost.textContent = data.newCreatorName;
    if (appState.activeRoomData) {
      appState.activeRoomData.creatorId = data.newCreatorId;
      appState.activeRoomData.creatorName = data.newCreatorName;
    }
    updateRoomControlsVisibility(appState.activeRoomData || data.room);

    if (appState.currentUser && appState.currentUser.id === data.newCreatorId) {
      showToast('👑 Bạn đã được trao quyền Chủ phòng của phòng nhạc này!', 'success');
    }
  });

  // Room deleted / disbanded
  socket.on('room_deleted', (data) => {
    if (data.slug === appState.activeRoomSlug) {
      showToast(`📢 ${data.message || 'Phòng nhạc đã bị giải tán/xoá.'}`, 'warning');
      switchView('lobby');
    }
  });

  socket.on('room_error', (data) => {
    showToast(`⚠️ ${data.message}`, 'error');
    switchView('lobby');
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
  if (!track) {
    DOM.currentTitle.textContent = '🎵 Phòng đang chờ bài hát tiếp theo...';
    DOM.currentTitle.title = 'Phòng đang chờ bài hát tiếp theo';
    DOM.currentAuthor.textContent = 'Tìm hoặc dán link bài hát ở tab Thêm Bài để phát nhạc!';
    DOM.requesterName.textContent = 'Trống';
    const fallbackCover = appState.activeRoomData?.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80';
    DOM.currentThumb.src = fallbackCover;
    DOM.vinylArtwork.src = fallbackCover;
    DOM.timeElapsed.textContent = '00:00';
    DOM.timeDuration.textContent = '00:00';
    DOM.progressBarFill.style.width = '0%';
    DOM.vinylDisc.classList.remove('is-spinning');
    DOM.tonearm.classList.remove('is-playing');
    if (ytReady && ytPlayer) {
      try {
        if (ytPlayer.stopVideo) ytPlayer.stopVideo();
        else if (ytPlayer.pauseVideo) ytPlayer.pauseVideo();
      } catch (e) {}
    }
    if (playbackSyncInterval) {
      clearInterval(playbackSyncInterval);
      playbackSyncInterval = null;
    }
    return;
  }

  DOM.currentTitle.textContent = track.title;
  DOM.currentTitle.title = track.title;
  DOM.currentAuthor.textContent = track.author || 'Unknown Artist';
  DOM.requesterName.textContent = track.requestedBy || 'Member';
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
    appState.roomState.cooldown.timerInterval = null;
  }

  appState.roomState.cooldown = { ...appState.roomState.cooldown, ...cooldown };

  if (cooldown.isAdmin) {
    if (DOM.tabCooldownPill) DOM.tabCooldownPill.textContent = 'Admin Bypass';
    if (DOM.cooldownCard) DOM.cooldownCard.className = 'cooldown-card ready';
    if (DOM.cooldownIcon) DOM.cooldownIcon.className = 'ph-fill ph-lightning';
    if (DOM.cooldownTitle) DOM.cooldownTitle.textContent = 'Đặc Quyền Quản Trị / Chủ Phòng';
    if (DOM.cooldownSubtitle) DOM.cooldownSubtitle.textContent = 'Bạn có thể thêm bài liên tục không giới hạn thời gian chờ.';
    if (DOM.cooldownTimerDisplay) DOM.cooldownTimerDisplay.style.display = 'none';
    return;
  }

  if (cooldown.isFirstBonus) {
    if (DOM.tabCooldownPill) DOM.tabCooldownPill.textContent = 'Ưu đãi Lần 1';
    if (DOM.cooldownCard) DOM.cooldownCard.className = 'cooldown-card ready';
    if (DOM.cooldownIcon) DOM.cooldownIcon.className = 'ph-fill ph-sparkle';
    if (DOM.cooldownTitle) DOM.cooldownTitle.textContent = 'Ưu Đãi Lần Đầu Gia Nhập!';
    if (DOM.cooldownSubtitle) DOM.cooldownSubtitle.textContent = 'Bạn được thêm ngay 1 bài hát mà không cần chờ.';
    if (DOM.cooldownTimerDisplay) DOM.cooldownTimerDisplay.style.display = 'none';
    return;
  }

  if (cooldown.canAdd) {
    if (DOM.tabCooldownPill) DOM.tabCooldownPill.textContent = 'Sẵn sàng';
    if (DOM.cooldownCard) DOM.cooldownCard.className = 'cooldown-card ready';
    if (DOM.cooldownIcon) DOM.cooldownIcon.className = 'ph-fill ph-check-circle';
    if (DOM.cooldownTitle) DOM.cooldownTitle.textContent = 'Thời Gian Chờ Đã Kết Thúc!';
    if (DOM.cooldownSubtitle) DOM.cooldownSubtitle.textContent = 'Bạn có thể yêu cầu bài hát tiếp theo ngay bây giờ.';
    if (DOM.cooldownTimerDisplay) DOM.cooldownTimerDisplay.style.display = 'none';
  } else {
    if (DOM.cooldownCard) DOM.cooldownCard.className = 'cooldown-card waiting';
    if (DOM.cooldownIcon) DOM.cooldownIcon.className = 'ph-fill ph-timer';
    if (DOM.cooldownTitle) DOM.cooldownTitle.textContent = 'Đang Trong Thời Gian Chờ';
    if (DOM.cooldownSubtitle) DOM.cooldownSubtitle.textContent = 'Vui lòng chờ hết thời gian để tiếp tục thêm bài mới.';
    if (DOM.cooldownTimerDisplay) DOM.cooldownTimerDisplay.style.display = 'block';

    let remaining = Math.max(0, cooldown.remainingSeconds || 0);

    const tick = () => {
      if (remaining <= 0) {
        if (appState.roomState.cooldown.timerInterval) {
          clearInterval(appState.roomState.cooldown.timerInterval);
          appState.roomState.cooldown.timerInterval = null;
        }
        updateCooldownUI({ canAdd: true, remainingSeconds: 0 });
        return;
      }
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      if (DOM.cooldownTimerDisplay) DOM.cooldownTimerDisplay.textContent = formatted;
      if (DOM.tabCooldownPill) DOM.tabCooldownPill.textContent = formatted;
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
  if (DOM.navBtnLobby) DOM.navBtnLobby.addEventListener('click', () => switchView('lobby'));
  if (DOM.btnLogoHome) DOM.btnLogoHome.addEventListener('click', () => switchView('lobby'));
  if (DOM.btnBackToLobby) DOM.btnBackToLobby.addEventListener('click', () => switchView('lobby'));

  if (DOM.navBtnLeaderboard) {
    DOM.navBtnLeaderboard.addEventListener('click', async () => {
      DOM.profileModal.style.display = 'flex';
      loadLeaderboard();
    });
  }

  // Header Global Search Input
  initHeaderSearch();

  // YouTube Song Search in Add tab
  initSongSearch();

  DOM.btnRefreshLobby.addEventListener('click', () => {
    loadLobbyRooms();
    showToast('🔄 Đã làm mới danh sách phòng nhạc!', 'success');
  });

  // Share Room Link (?room=slug)
  DOM.btnShareRoom.addEventListener('click', async () => {
    if (!appState.activeRoomSlug) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(appState.activeRoomSlug)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('🔗 Đã sao chép liên kết phòng vào bộ nhớ tạm!', 'success');
    } catch (e) {
      prompt('Sao chép liên kết phòng:', shareUrl);
    }
  });

  // Leave Room Button (For listeners/non-hosts)
  if (DOM.btnLeaveRoom) {
    DOM.btnLeaveRoom.addEventListener('click', () => {
      showToast('👋 Đã rời khỏi phòng nhạc!', 'info');
      switchView('lobby');
    });
  }

  // Transfer Ownership Button
  if (DOM.btnTransferOwnership) {
    DOM.btnTransferOwnership.addEventListener('click', () => {
      openTransferModal();
    });
  }

  if (DOM.btnCloseTransferModal) {
    DOM.btnCloseTransferModal.addEventListener('click', () => {
      DOM.transferOwnershipModal.style.display = 'none';
    });
  }

  // Delete Room (Owner / Admin)
  DOM.btnDeleteRoom.addEventListener('click', async () => {
    if (!appState.activeRoomSlug) return;
    const isOwner = appState.currentUser && appState.currentUser.id === appState.activeRoomData?.creatorId;
    const isAdmin = appState.currentUser && appState.currentUser.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      showToast('⚠️ Bạn không có quyền xoá phòng này!', 'error');
      return;
    }

    // If host (non-admin), check if there are other listeners
    if (!isAdmin && isOwner) {
      try {
        const res = await apiRequest(`/api/rooms/${appState.activeRoomSlug}/listeners`);
        const listeners = (res.data || []).filter(u => u.userId !== appState.currentUser.id);
        if (listeners.length > 0) {
          if (confirm(`Phòng đang có ${listeners.length} người nghe khác!\n\nBạn có muốn chuyển quyền chủ phòng cho người khác để rời phòng và tạo phòng mới không?`)) {
            openTransferModal();
          }
          return;
        }
      } catch (e) {
        console.warn('Check listeners notice:', e.message);
      }
    }

    if (!confirm('Bạn có chắc chắn muốn xoá phòng nhạc này vĩnh viễn không?')) return;

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

  // Privacy Toggle in Create Room
  if (DOM.labelPublicRoom && DOM.labelPrivateRoom) {
    const radios = document.querySelectorAll('input[name="createRoomPrivacy"]');
    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'private') {
          DOM.labelPrivateRoom.classList.add('active');
          DOM.labelPublicRoom.classList.remove('active');
          if (DOM.createRoomPasswordWrap) DOM.createRoomPasswordWrap.style.display = 'flex';
          if (DOM.newRoomPassword) DOM.newRoomPassword.focus();
        } else {
          DOM.labelPublicRoom.classList.add('active');
          DOM.labelPrivateRoom.classList.remove('active');
          if (DOM.createRoomPasswordWrap) DOM.createRoomPasswordWrap.style.display = 'none';
        }
      });
    });
  }

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
    const privacyVal = document.querySelector('input[name="createRoomPrivacy"]:checked')?.value || 'public';
    const isPrivate = privacyVal === 'private';
    const password = isPrivate ? (DOM.newRoomPassword ? DOM.newRoomPassword.value.trim() : null) : null;

    if (!name) return;

    if (isPrivate && (!password || password.length < 4)) {
      DOM.createRoomAlert.textContent = 'Vui lòng đặt mật khẩu ít nhất 4 ký tự cho phòng riêng tư!';
      DOM.createRoomAlert.className = 'modal-alert error';
      DOM.createRoomAlert.style.display = 'block';
      return;
    }

    try {
      const res = await apiRequest('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ name, description, coverUrl, isPrivate, password })
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
  // Modal: Join Private Room Handlers
  // ==========================================
  if (DOM.joinPrivateRoomForm) {
    DOM.joinPrivateRoomForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const slug = DOM.joinPrivateTargetSlug.value;
      const password = DOM.joinPrivatePasswordInput.value.trim();
      if (!slug || !password) return;

      try {
        const res = await fetch(`/api/rooms/${slug}/verify-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          DOM.joinPrivateAlert.textContent = data.message || 'Mật khẩu phòng không chính xác!';
          DOM.joinPrivateAlert.className = 'modal-alert error';
          DOM.joinPrivateAlert.style.display = 'block';
          return;
        }

        DOM.joinPrivateRoomModal.style.display = 'none';
        switchView('room', slug, password);
      } catch (err) {
        DOM.joinPrivateAlert.textContent = 'Lỗi kết nối máy chủ!';
        DOM.joinPrivateAlert.className = 'modal-alert error';
        DOM.joinPrivateAlert.style.display = 'block';
      }
    });
  }

  if (DOM.btnCloseJoinPrivateModal) {
    DOM.btnCloseJoinPrivateModal.addEventListener('click', () => {
      DOM.joinPrivateRoomModal.style.display = 'none';
    });
  }

  // ==========================================
  // Modal: Auth Handlers
  // ==========================================
  function openAuthModal(defaultTab = 'login') {
    DOM.authAlert.style.display = 'none';
    if (defaultTab === 'login') {
      DOM.authTabLogin.classList.add('active');
      DOM.authTabRegister.classList.remove('active');
      DOM.loginForm.style.display = 'flex';
      DOM.registerForm.style.display = 'none';
    } else {
      DOM.authTabRegister.classList.add('active');
      DOM.authTabLogin.classList.remove('active');
      DOM.registerForm.style.display = 'flex';
      DOM.loginForm.style.display = 'none';
    }
    DOM.authModal.style.display = 'flex';
  }

  DOM.btnOpenAuthModal.addEventListener('click', () => openAuthModal('login'));
  DOM.btnLoginFromFav.addEventListener('click', () => openAuthModal('login'));

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
          socket.emit('authenticate', { token: res.data.token });
        }
        initSocket();
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
          socket.emit('authenticate', { token: res.data.token });
        }
        initSocket();
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

  // ==========================================
  // Modal: Admin Control Panel Handlers
  // ==========================================
  if (DOM.btnOpenAdminPanel) {
    DOM.btnOpenAdminPanel.addEventListener('click', () => {
      DOM.adminModal.style.display = 'flex';
      loadAdminUsers();
    });
  }

  if (DOM.btnCloseAdminModal) {
    DOM.btnCloseAdminModal.addEventListener('click', () => {
      DOM.adminModal.style.display = 'none';
    });
  }

  if (DOM.btnRefreshAdminUsers) {
    DOM.btnRefreshAdminUsers.addEventListener('click', () => {
      loadAdminUsers();
      showToast('🔄 Đã làm mới danh sách thành viên!', 'info');
    });
  }

  if (DOM.adminUserSearchInput) {
    DOM.adminUserSearchInput.addEventListener('input', () => {
      renderAdminUsers();
    });
  }
}

// ==========================================
// Admin Control Panel Logic (Ban / Delete)
// ==========================================
let adminUsersData = [];

async function loadAdminUsers() {
  if (!appState.currentUser || appState.currentUser.role !== 'ADMIN') return;
  try {
    const res = await apiRequest('/api/admin/users');
    if (res.success && Array.isArray(res.data)) {
      adminUsersData = res.data;
      renderAdminUsers();
    }
  } catch (err) {
    showToast(`⚠️ ${err.message}`, 'error');
  }
}

function renderAdminUsers() {
  if (!DOM.adminUsersList) return;
  const list = DOM.adminUsersList;
  list.innerHTML = '';

  let filtered = adminUsersData;
  const q = (DOM.adminUserSearchInput && DOM.adminUserSearchInput.value || '').trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(u => 
      (u.username && u.username.toLowerCase().includes(q)) || 
      (u.email && u.email.toLowerCase().includes(q)) || 
      (u.role && u.role.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i class="ph ph-user-circle" style="font-size: 36px; margin-bottom: 8px; display: block;"></i>
        <p>Không tìm thấy người dùng nào phù hợp</p>
      </div>
    `;
    return;
  }

  filtered.forEach(u => {
    const row = document.createElement('div');
    row.className = `admin-user-row ${u.isBanned ? 'banned' : ''}`;
    
    const isSelf = (appState.currentUser && appState.currentUser.id === u.id);
    const isSuperAdmin = (u.role === 'ADMIN');

    row.innerHTML = `
      <div class="admin-user-main-info">
        <div class="admin-user-avatar">${escapeHtml(u.avatar || '🎧')}</div>
        <div class="admin-user-meta">
          <div class="admin-user-name-line">
            <span class="admin-user-name">${escapeHtml(u.username)}</span>
            <span class="role-badge ${escapeHtml(u.role || 'USER')}">${escapeHtml(u.role || 'USER')}</span>
            <span class="level-tag">Lv. ${u.level || 1}</span>
          </div>
          <div class="admin-user-email">${escapeHtml(u.email)}</div>
          <div class="admin-user-stats-pill">🎵 ${u.totalRequests || 0} bài đã yêu cầu • ⚡ ${u.xp || 0} XP</div>
        </div>
      </div>

      <div class="admin-user-status-col">
        <span class="admin-status-badge ${u.isBanned ? 'banned' : 'active'}">
          ${u.isBanned ? '⛔ ĐÃ BỊ KHOÁ' : '🟢 Hoạt động'}
        </span>
        <div class="admin-user-actions">
          ${(!isSuperAdmin && !isSelf) ? `
            <button class="${u.isBanned ? 'btn-admin-unban' : 'btn-admin-ban'}" data-uid="${escapeHtml(u.id)}" data-banned="${u.isBanned ? 'true' : 'false'}">
              <i class="ph-bold ${u.isBanned ? 'ph-lock-key-open' : 'ph-prohibit'}"></i>
              <span>${u.isBanned ? 'Mở Khóa' : 'Khóa Nick'}</span>
            </button>
            <button class="btn-admin-delete" data-uid="${escapeHtml(u.id)}" data-name="${escapeHtml(u.username)}" title="Xoá vĩnh viễn tài khoản">
              <i class="ph-bold ph-trash"></i>
            </button>
          ` : '<span style="font-size: 11px; color: var(--text-muted); font-style: italic;">Quản trị viên</span>'}
        </div>
      </div>
    `;

    // Ban / Unban Button Click
    const banBtn = row.querySelector('.btn-admin-ban, .btn-admin-unban');
    if (banBtn) {
      banBtn.addEventListener('click', async () => {
        const uid = banBtn.dataset.uid;
        const currentBanned = banBtn.dataset.banned === 'true';
        const newBanState = !currentBanned;
        const confirmMsg = newBanState 
          ? `Bạn có chắc chắn muốn KHOÁ TÀI KHOẢN người dùng "${u.username}" không?`
          : `Bạn có muốn MỞ KHÓA cho tài khoản "${u.username}" không?`;

        if (!confirm(confirmMsg)) return;

        try {
          const res = await apiRequest(`/api/admin/users/${uid}/ban`, {
            method: 'PUT',
            body: JSON.stringify({ isBanned: newBanState })
          });
          if (res.success) {
            showToast(res.message, newBanState ? 'warning' : 'success');
            u.isBanned = newBanState;
            renderAdminUsers();
          }
        } catch (err) {
          showToast(`⚠️ ${err.message}`, 'error');
        }
      });
    }

    // Delete Button Click
    const delBtn = row.querySelector('.btn-admin-delete');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        const uid = delBtn.dataset.uid;
        const uname = delBtn.dataset.name;
        if (!confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XOÁ VĨNH VIỄN tài khoản "${uname}" khỏi cơ sở dữ liệu không?\nHành động này không thể hoàn tác!`)) return;

        try {
          const res = await apiRequest(`/api/admin/users/${uid}`, {
            method: 'DELETE'
          });
          if (res.success) {
            showToast(res.message, 'success');
            adminUsersData = adminUsersData.filter(userItem => userItem.id !== uid);
            renderAdminUsers();
          }
        } catch (err) {
          showToast(`⚠️ ${err.message}`, 'error');
        }
      });
    }

    list.appendChild(row);
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
  DOM.modalCooldownBonus.textContent = (u.role === 'VIP' || u.role === 'DJ') ? '1 phút' : (u.role === 'ADMIN' ? '0 giây' : '3 phút');

  loadLeaderboard();
  DOM.profileModal.style.display = 'flex';
}

function updateRoomControlsVisibility(roomData) {
  if (!roomData) return;
  const isOwner = appState.currentUser && appState.currentUser.id === roomData.creatorId;
  const isAdmin = appState.currentUser && appState.currentUser.role === 'ADMIN';

  // Admin Instant Skip is strictly for ADMIN accounts only
  if (DOM.btnAdminInstantSkip) {
    DOM.btnAdminInstantSkip.style.display = isAdmin ? 'flex' : 'none';
  }

  if (DOM.btnTransferOwnership) {
    DOM.btnTransferOwnership.style.display = (isOwner && !roomData.isDefault) ? 'flex' : 'none';
  }

  if (DOM.btnDeleteRoom) {
    DOM.btnDeleteRoom.style.display = ((isOwner || isAdmin) && !roomData.isDefault) ? 'flex' : 'none';
  }

  if (DOM.btnLeaveRoom) {
    DOM.btnLeaveRoom.style.display = isOwner ? 'none' : 'flex';
  }
}

function openTransferModal() {
  if (!DOM.transferOwnershipModal) return;
  DOM.transferAlert.style.display = 'none';
  DOM.transferListenersList.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">Đang tải danh sách thành viên trong phòng...</div>';
  DOM.transferOwnershipModal.style.display = 'flex';
  loadTransferListeners();
}

async function loadTransferListeners() {
  try {
    const res = await apiRequest(`/api/rooms/${appState.activeRoomSlug}/listeners`);
    if (!res.success || !res.data) {
      DOM.transferListenersList.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted);">Không thể tải danh sách người nghe.</div>';
      return;
    }

    const others = res.data.filter(u => u.userId !== appState.currentUser?.id);
    if (others.length === 0) {
      DOM.transferListenersList.innerHTML = `
        <div style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13px;">
          <div style="font-size: 28px; margin-bottom: 8px;">🎧</div>
          Hiện không có người nghe nào khác trong phòng.<br>Bạn có thể xoá phòng trực tiếp vì phòng đang trống!
        </div>
      `;
      return;
    }

    DOM.transferListenersList.innerHTML = '';
    others.forEach(userItem => {
      const card = document.createElement('div');
      card.className = 'transfer-listener-card';
      card.innerHTML = `
        <div class="transfer-listener-left">
          <div class="transfer-listener-avatar">${escapeHtml(userItem.avatar || '🎧')}</div>
          <div class="transfer-listener-meta">
            <span class="transfer-listener-name">${escapeHtml(userItem.username)}</span>
            <span class="role-badge ${escapeHtml(userItem.role || 'USER')}" style="align-self: flex-start; font-size: 9px; padding: 1px 6px;">${escapeHtml(userItem.role || 'USER')}</span>
          </div>
        </div>
        <button class="btn-select-transfer" data-uid="${escapeHtml(userItem.userId)}" data-uname="${escapeHtml(userItem.username)}">
          <i class="ph-fill ph-crown"></i>
          <span>Chọn Làm Chủ Phòng</span>
        </button>
      `;

      card.querySelector('.btn-select-transfer').addEventListener('click', async () => {
        if (!confirm(`Bạn có chắc chắn muốn trao quyền chủ phòng cho "${userItem.username}" không?\nSau khi chuyển quyền, bạn có thể rời phòng và tạo phòng mới tuỳ ý.`)) return;

        try {
          const result = await apiRequest(`/api/rooms/${appState.activeRoomSlug}/transfer-ownership`, {
            method: 'POST',
            body: JSON.stringify({
              targetUserId: userItem.userId,
              targetUsername: userItem.username
            })
          });

          if (result.success) {
            showToast(`👑 Đã chuyển quyền chủ phòng cho ${userItem.username} thành công!`, 'success');
            DOM.transferOwnershipModal.style.display = 'none';

            if (appState.activeRoomData) {
              appState.activeRoomData.creatorId = userItem.userId;
              appState.activeRoomData.creatorName = userItem.username;
            }
            DOM.roomActiveHost.textContent = userItem.username;
            updateRoomControlsVisibility(appState.activeRoomData);
          }
        } catch (err) {
          DOM.transferAlert.textContent = err.message;
          DOM.transferAlert.className = 'modal-alert error';
          DOM.transferAlert.style.display = 'block';
        }
      });

      DOM.transferListenersList.appendChild(card);
    });
  } catch (err) {
    DOM.transferListenersList.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--accent-rose); font-size: 13px;">⚠️ ${err.message}</div>`;
  }
}

// ==========================================
// 10.1 Search Helpers (Header & YouTube)
// ==========================================
function initHeaderSearch() {
  if (!DOM.headerSearchInput) return;

  DOM.headerSearchInput.addEventListener('input', (e) => {
    const rawVal = e.target.value;
    const trimmed = rawVal.trim();
    if (DOM.btnClearHeaderSearch) {
      DOM.btnClearHeaderSearch.style.display = trimmed ? 'flex' : 'none';
    }

    // Check if user pasted a room link (e.g. ?room=my-room or http://.../?room=my-room)
    const roomParamMatch = trimmed.match(/[?&]room=([a-zA-Z0-9_-]+)/);
    if (roomParamMatch) {
      const targetSlug = roomParamMatch[1];
      appState.searchQuery = '';
      DOM.headerSearchInput.value = '';
      if (DOM.btnClearHeaderSearch) DOM.btnClearHeaderSearch.style.display = 'none';

      const foundRoom = (appState.allRooms || []).find(r => r.slug === targetSlug);
      if (foundRoom && foundRoom.isPrivate && foundRoom.hasPassword && (!appState.currentUser || (appState.currentUser.id !== foundRoom.creatorId && appState.currentUser.role !== 'ADMIN'))) {
        openJoinPrivateRoomModal(foundRoom.slug, foundRoom.name);
      } else {
        switchView('room', targetSlug);
      }
      return;
    }

    appState.searchQuery = trimmed;
    if (appState.currentView !== 'lobby') {
      switchView('lobby');
    } else {
      renderLobbyRooms();
    }
  });

  DOM.headerSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rawVal = DOM.headerSearchInput.value.trim();
      if (!rawVal) return;

      const roomParamMatch = rawVal.match(/[?&]room=([a-zA-Z0-9_-]+)/);
      const slugToFind = roomParamMatch ? roomParamMatch[1] : rawVal;

      const exactRoom = (appState.allRooms || []).find(r => r.slug.toLowerCase() === slugToFind.toLowerCase());
      if (exactRoom) {
        if (exactRoom.isPrivate && exactRoom.hasPassword && (!appState.currentUser || (appState.currentUser.id !== exactRoom.creatorId && appState.currentUser.role !== 'ADMIN'))) {
          openJoinPrivateRoomModal(exactRoom.slug, exactRoom.name);
        } else {
          switchView('room', exactRoom.slug);
        }
      }
    }
  });

  if (DOM.btnClearHeaderSearch) {
    DOM.btnClearHeaderSearch.addEventListener('click', () => {
      DOM.headerSearchInput.value = '';
      DOM.btnClearHeaderSearch.style.display = 'none';
      appState.searchQuery = '';
      renderLobbyRooms();
      DOM.headerSearchInput.focus();
    });
  }
}

let songSearchTimer = null;

function initSongSearch() {
  if (!DOM.songSearchInput) return;

  DOM.songSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (DOM.btnClearSongSearch) {
      DOM.btnClearSongSearch.style.display = q ? 'flex' : 'none';
    }

    if (songSearchTimer) clearTimeout(songSearchTimer);

    if (!q) {
      if (DOM.ytSearchResults) DOM.ytSearchResults.innerHTML = '';
      if (DOM.ytSearchLoading) DOM.ytSearchLoading.style.display = 'none';
      return;
    }

    songSearchTimer = setTimeout(() => {
      performYouTubeSearch(q);
    }, 350);
  });

  DOM.songSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = DOM.songSearchInput.value.trim();
      if (q) {
        if (songSearchTimer) clearTimeout(songSearchTimer);
        performYouTubeSearch(q);
      }
    }
  });

  if (DOM.btnClearSongSearch) {
    DOM.btnClearSongSearch.addEventListener('click', () => {
      DOM.songSearchInput.value = '';
      DOM.btnClearSongSearch.style.display = 'none';
      if (DOM.ytSearchResults) DOM.ytSearchResults.innerHTML = '';
      if (DOM.ytSearchLoading) DOM.ytSearchLoading.style.display = 'none';
      DOM.songSearchInput.focus();
    });
  }
}

async function performYouTubeSearch(query) {
  if (!DOM.ytSearchResults) return;
  if (DOM.ytSearchLoading) DOM.ytSearchLoading.style.display = 'flex';
  DOM.ytSearchResults.innerHTML = '';

  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (DOM.ytSearchLoading) DOM.ytSearchLoading.style.display = 'none';

    if (!data.success || !data.data || data.data.length === 0) {
      DOM.ytSearchResults.innerHTML = `
        <div style="text-align: center; padding: 24px 16px; color: var(--text-muted); font-size: 13px;">
          Không tìm thấy bài hát nào trên YouTube với từ khoá này.
        </div>
      `;
      return;
    }

    renderYouTubeSearchResults(data.data);
  } catch (err) {
    if (DOM.ytSearchLoading) DOM.ytSearchLoading.style.display = 'none';
    DOM.ytSearchResults.innerHTML = `
      <div style="text-align: center; padding: 24px 16px; color: var(--accent-rose); font-size: 13px;">
        ⚠️ Không thể tìm kiếm video. Vui lòng kiểm tra lại kết nối mạng!
      </div>
    `;
  }
}

function renderYouTubeSearchResults(videos) {
  if (!DOM.ytSearchResults) return;
  DOM.ytSearchResults.innerHTML = '';

  videos.forEach(v => {
    const item = document.createElement('div');
    item.className = 'yt-result-card';
    item.innerHTML = `
      <div class="yt-thumb-wrap">
        <img src="${escapeHtml(v.thumbnail)}" alt="${escapeHtml(v.title)}" loading="lazy">
        <span class="yt-duration-badge">${escapeHtml(v.durationFormatted || '4:00')}</span>
      </div>
      <div class="yt-meta-stack">
        <strong class="yt-song-title" title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</strong>
        <span class="yt-artist-name">${escapeHtml(v.author || 'YouTube Artist')}</span>
      </div>
      <button class="btn-add-yt-track" title="Thêm bài hát vào hàng chờ">
        <i class="ph-bold ph-plus"></i>
        <span>Thêm</span>
      </button>
    `;

    item.querySelector('.btn-add-yt-track').addEventListener('click', () => {
      if (!socket) {
        showToast('⚠️ Chưa kết nối phòng nhạc!', 'error');
        return;
      }

      const isOwner = appState.currentUser && appState.currentUser.id === appState.activeRoomData?.creatorId;
      const isAdmin = appState.currentUser && appState.currentUser.role === 'ADMIN';

      if (!isAdmin && !isOwner && appState.roomState.cooldown && !appState.roomState.cooldown.canAdd) {
        const remainingText = DOM.cooldownTimerDisplay ? DOM.cooldownTimerDisplay.textContent : 'thời gian';
        showToast(`⏳ Vui lòng chờ hết thời gian (${remainingText}) trước khi yêu cầu thêm bài!`, 'warning');
        return;
      }

      socket.emit('add_to_queue', {
        urlOrId: v.videoId,
        duration: v.duration
      });
    });

    DOM.ytSearchResults.appendChild(item);
  });
}

async function loadLeaderboard() {
  try {
    const res = await apiRequest('/api/user/leaderboard');
    if (res.success && Array.isArray(res.data)) {
      DOM.modalLeaderboardList.innerHTML = '';
      
      // Filter out ADMIN accounts from the leaderboard
      const filtered = res.data.filter(u => u.role !== 'ADMIN');

      if (filtered.length === 0) {
        DOM.modalLeaderboardList.innerHTML = `
          <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
            Chưa có bài hát nào được yêu cầu bởi thành viên. Hãy là người đầu tiên!
          </div>
        `;
        return;
      }

      filtered.forEach((l, idx) => {
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
  console.log('🎧 Initializing Music Room Hub Client...');

  setupEventListeners();
  await checkAuthSession();
  initSocket();

  // Route handling based on URL query (?room=slug) or hash (#room-slug)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  const hash = window.location.hash;

  if (roomParam) {
    switchView('room', roomParam);
  } else if (hash && hash.startsWith('#room-')) {
    const slug = hash.replace('#room-', '');
    switchView('room', slug);
  } else {
    // DEFAULT VIEW: Sảnh các phòng nhạc
    switchView('lobby');
  }
}

document.addEventListener('DOMContentLoaded', initApp);
