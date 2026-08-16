const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const env = require('./env');

// Supabase fallback URL if not configured in environment variables
const DEFAULT_SUPABASE_URL = 'postgresql://postgres.wyepnzrypnzopohprerv:Hoaibuyt05%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?schema=music_station_db';
const connectionString = env.DIRECT_URL || env.DATABASE_URL || DEFAULT_SUPABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

// Initialize database schema automatically on startup
async function initDatabase() {
  let client;
  try {
    client = await pool.connect();
    const sqlPath = path.join(__dirname, '..', '..', 'prisma', 'init_supabase.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log('✅ Supabase PostgreSQL tables & rooms verified in schema: music_station_db!');
    }
  } catch (err) {
    console.warn('⚠️ Notice during database schema verification:', err.message);
  } finally {
    if (client) client.release();
  }
}

// Database helper functions mapped to music_station_db schema
const db = {
  query: (text, params) => pool.query(text, params),
  initDatabase,
  pool,

  // --- Users ---
  async findUserById(id) {
    try {
      const res = await pool.query(
        `SELECT id, username, email, avatar, role, level, xp, "totalRequests", "isBanned", "createdAt" 
         FROM music_station_db.users WHERE id = $1`,
        [id]
      );
      return res.rows[0] || null;
    } catch (err) {
      console.error('[DB findUserById error]:', err.message);
      return null;
    }
  },

  async findUserByLogin(login) {
    try {
      const clean = login.trim().toLowerCase();
      const res = await pool.query(
        `SELECT id, username, email, "passwordHash", avatar, role, level, xp, "totalRequests", "isBanned", "createdAt"
         FROM music_station_db.users 
         WHERE LOWER(email) = $1 OR LOWER(username) = $1`,
        [clean]
      );
      return res.rows[0] || null;
    } catch (err) {
      console.error('[DB findUserByLogin error]:', err.message);
      return null;
    }
  },

  async findUserByUsernameOrEmail(username, email) {
    try {
      const res = await pool.query(
        `SELECT id, username, email FROM music_station_db.users 
         WHERE LOWER(username) = $1 OR LOWER(email) = $2`,
        [username.trim().toLowerCase(), email.trim().toLowerCase()]
      );
      return res.rows[0] || null;
    } catch (err) {
      console.error('[DB findUserByUsernameOrEmail error]:', err.message);
      return null;
    }
  },

  async createUser({ username, email, passwordHash, avatar, role = 'USER' }) {
    const res = await pool.query(
      `INSERT INTO music_station_db.users (username, email, "passwordHash", avatar, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, avatar, role, level, xp, "totalRequests", "createdAt"`,
      [username.trim(), email.trim().toLowerCase(), passwordHash, avatar || '🎧', role]
    );
    return res.rows[0];
  },

  async updateUser(id, fields = {}) {
    const updates = [];
    const values = [];
    let idx = 1;

    if (fields.username) {
      updates.push(`username = $${idx++}`);
      values.push(fields.username.trim());
    }
    if (fields.avatar) {
      updates.push(`avatar = $${idx++}`);
      values.push(fields.avatar);
    }
    if (fields.xp !== undefined) {
      updates.push(`xp = xp + $${idx++}`);
      values.push(fields.xp);
    }
    if (fields.totalRequests !== undefined) {
      updates.push(`"totalRequests" = "totalRequests" + $${idx++}`);
      values.push(fields.totalRequests);
    }
    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`);

    values.push(id);
    const sql = `UPDATE music_station_db.users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, email, avatar, role, level, xp, "totalRequests"`;
    const res = await pool.query(sql, values);
    return res.rows[0] || null;
  },

  // --- Admin User Management ---
  async getAllUsersForAdmin() {
    try {
      const res = await pool.query(
        `SELECT id, username, email, avatar, role, level, xp, "totalRequests", "isBanned", "createdAt"
         FROM music_station_db.users
         ORDER BY "createdAt" DESC`
      );
      return res.rows;
    } catch (err) {
      console.error('[DB getAllUsersForAdmin error]:', err.message);
      return [];
    }
  },

  async setUserBanStatus(userId, isBanned) {
    const res = await pool.query(
      `UPDATE music_station_db.users 
       SET "isBanned" = $1, "updatedAt" = CURRENT_TIMESTAMP 
       WHERE id = $2 AND role != 'ADMIN' 
       RETURNING id, username, email, "isBanned", role`,
      [!!isBanned, userId]
    );
    return res.rows[0] || null;
  },

  async deleteUser(userId) {
    const res = await pool.query(
      `DELETE FROM music_station_db.users 
       WHERE id = $1 AND role != 'ADMIN'`,
      [userId]
    );
    return res.rowCount > 0;
  },

  // --- Rooms Management (Multi-Room Architecture) ---
  async getAllRooms() {
    try {
      const res = await pool.query(
        `SELECT id, slug, name, description, genre, "coverUrl", "isPrivate", "passwordHash", "creatorId", "creatorName", "currentTrack", queue, "isDefault", "createdAt"
         FROM music_station_db.rooms
         WHERE "isDefault" = false
         ORDER BY "createdAt" DESC`
      );
      return res.rows;
    } catch (err) {
      console.error('[DB getAllRooms error]:', err.message);
      return [];
    }
  },

  async getRoomBySlug(slug) {
    try {
      const res = await pool.query(
        `SELECT id, slug, name, description, genre, "coverUrl", "isPrivate", "passwordHash", "creatorId", "creatorName", "currentTrack", queue, "isDefault", "createdAt"
         FROM music_station_db.rooms
         WHERE slug = $1`,
        [slug]
      );
      return res.rows[0] || null;
    } catch (err) {
      console.error('[DB getRoomBySlug error]:', err.message);
      return null;
    }
  },

  async createRoom({ slug, name, description, genre, coverUrl, isPrivate = false, passwordHash = null, creatorId = null, creatorName = 'User' }) {
    const res = await pool.query(
      `INSERT INTO music_station_db.rooms (slug, name, description, genre, "coverUrl", "isPrivate", "passwordHash", "creatorId", "creatorName")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, slug, name, description, genre, "coverUrl", "isPrivate", "creatorId", "creatorName", "createdAt"`,
      [
        slug,
        name.trim(),
        description || '',
        genre ? genre.trim() : 'Lofi & Chill',
        coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80',
        !!isPrivate,
        passwordHash,
        creatorId,
        creatorName
      ]
    );
    return res.rows[0];
  },

  async updateRoom(slug, fields = {}) {
    const updates = [];
    const values = [];
    let idx = 1;

    if (fields.name) {
      updates.push(`name = $${idx++}`);
      values.push(fields.name.trim());
    }
    if (fields.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(fields.description);
    }
    if (fields.genre) {
      updates.push(`genre = $${idx++}`);
      values.push(fields.genre.trim());
    }
    if (fields.coverUrl) {
      updates.push(`"coverUrl" = $${idx++}`);
      values.push(fields.coverUrl);
    }
    if (fields.currentTrack !== undefined) {
      updates.push(`"currentTrack" = $${idx++}`);
      values.push(JSON.stringify(fields.currentTrack));
    }
    if (fields.queue !== undefined) {
      updates.push(`queue = $${idx++}`);
      values.push(JSON.stringify(fields.queue));
    }
    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`);

    values.push(slug);
    const sql = `UPDATE music_station_db.rooms SET ${updates.join(', ')} WHERE slug = $${idx} RETURNING *`;
    const res = await pool.query(sql, values);
    return res.rows[0] || null;
  },

  async saveRoomState(slug, currentTrack, queue) {
    try {
      await pool.query(
        `UPDATE music_station_db.rooms 
         SET "currentTrack" = $1, queue = $2, "updatedAt" = CURRENT_TIMESTAMP 
         WHERE slug = $3`,
        [JSON.stringify(currentTrack), JSON.stringify(queue || []), slug]
      );
    } catch (err) {
      console.warn(`[DB saveRoomState error for ${slug}]:`, err.message);
    }
  },

  async deleteRoom(slug, userId, userRole) {
    let sql = `DELETE FROM music_station_db.rooms WHERE slug = $1 AND "isDefault" = false`;
    const values = [slug];

    if (userRole !== 'ADMIN') {
      sql += ` AND "creatorId" = $2`;
      values.push(userId);
    }

    const res = await pool.query(sql, values);
    return res.rowCount > 0;
  },

  // --- Favorites ---
  async getFavorites(userId) {
    try {
      const res = await pool.query(
        `SELECT id, "videoId", title, author, thumbnail, duration, "createdAt"
         FROM music_station_db.favorites
         WHERE "userId" = $1
         ORDER BY "createdAt" DESC`,
        [userId]
      );
      return res.rows;
    } catch (err) {
      console.error('[DB getFavorites error]:', err.message);
      return [];
    }
  },

  async addFavorite(userId, { videoId, title, author, thumbnail, duration }) {
    const res = await pool.query(
      `INSERT INTO music_station_db.favorites ("userId", "videoId", title, author, thumbnail, duration)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT ("userId", "videoId") DO UPDATE SET title = EXCLUDED.title
       RETURNING id, "videoId", title, author, thumbnail, duration, "createdAt"`,
      [userId, videoId, title, author || 'Unknown Artist', thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, duration || 240]
    );
    return res.rows[0];
  },

  async removeFavorite(userId, videoId) {
    await pool.query(
      `DELETE FROM music_station_db.favorites WHERE "userId" = $1 AND "videoId" = $2`,
      [userId, videoId]
    );
    return { success: true };
  },

  // --- Song History (Per Room) ---
  async addSongHistory(roomSlug, track) {
    try {
      const isUUID = track.requestedById && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(track.requestedById);
      const validUserId = isUUID ? track.requestedById : null;

      const res = await pool.query(
        `INSERT INTO music_station_db.song_history ("roomSlug", "videoId", title, author, thumbnail, duration, "requestedById", "requestedByName", "isDefault")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          roomSlug || 'lofi-chill-study',
          track.videoId,
          track.title,
          track.author || 'Unknown Artist',
          track.thumbnail || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`,
          track.duration || 0,
          validUserId,
          track.requestedBy || 'Station Radio',
          !!track.isDefault
        ]
      );

      if (validUserId) {
        await pool.query(
          `UPDATE music_station_db.users 
           SET "totalRequests" = "totalRequests" + 1, xp = xp + 25 
           WHERE id = $1`,
          [validUserId]
        ).catch(() => {});
      }

      return res.rows[0];
    } catch (err) {
      console.warn('[DB addSongHistory error]:', err.message);
      return null;
    }
  },

  async getSongHistory(roomSlug = 'lofi-chill-study', limit = 30) {
    try {
      const res = await pool.query(
        `SELECT id, "roomSlug", "videoId", title, author, thumbnail, duration, "requestedByName", "isDefault", "playedAt"
         FROM music_station_db.song_history
         WHERE "roomSlug" = $1
         ORDER BY "playedAt" DESC
         LIMIT $2`,
        [roomSlug, limit]
      );
      return res.rows;
    } catch (err) {
      console.error('[DB getSongHistory error]:', err.message);
      return [];
    }
  },

  // --- Chat Messages (Per Room) ---
  async addChatMessage(roomSlug, msg) {
    try {
      const isUUID = msg.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(msg.userId);
      const validUserId = isUUID ? msg.userId : null;

      await pool.query(
        `INSERT INTO music_station_db.chat_messages (id, "roomSlug", "userId", username, avatar, role, text, type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [msg.id, roomSlug || 'lofi-chill-study', validUserId, msg.username, msg.avatar || '🎧', msg.role || 'USER', msg.text, msg.type || 'user']
      );

      if (validUserId) {
        await pool.query(
          `UPDATE music_station_db.users SET xp = xp + 2 WHERE id = $1`,
          [validUserId]
        ).catch(() => {});
      }
    } catch (err) {
      console.warn('[DB addChatMessage error]:', err.message);
    }
  },

  async getRecentChat(roomSlug = 'lofi-chill-study', limit = 30) {
    try {
      const res = await pool.query(
        `SELECT id, "roomSlug", "userId", username, avatar, role, text, type, "createdAt"
         FROM music_station_db.chat_messages
         WHERE "roomSlug" = $1
         ORDER BY "createdAt" DESC
         LIMIT $2`,
        [roomSlug, limit]
      );
      return res.rows.reverse();
    } catch (err) {
      console.warn('[DB getRecentChat error]:', err.message);
      return [];
    }
  },

  // --- Leaderboard ---
  async getLeaderboard(limit = 10) {
    try {
      const res = await pool.query(
        `SELECT id, username, avatar, role, level, xp, "totalRequests"
         FROM music_station_db.users
         WHERE role != 'ADMIN' AND "isBanned" = false
         ORDER BY "totalRequests" DESC, xp DESC
         LIMIT $1`,
        [limit]
      );
      return res.rows;
    } catch (err) {
      console.error('[DB getLeaderboard error]:', err.message);
      return [];
    }
  }
};

module.exports = db;
