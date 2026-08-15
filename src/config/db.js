const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const env = require('./env');

const connectionString = env.DIRECT_URL || env.DATABASE_URL;

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
  const client = await pool.connect();
  try {
    console.log('⚡ Checking Supabase PostgreSQL schema (music_station_db)...');
    const sqlPath = path.join(__dirname, '..', '..', 'prisma', 'init_supabase.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log('✅ Supabase PostgreSQL tables verified & ready in schema: music_station_db!');
    }
  } catch (err) {
    console.warn('⚠️ Notice during database schema verification:', err.message);
  } finally {
    client.release();
  }
}

// Database helper functions mapped to music_station_db schema
const db = {
  query: (text, params) => pool.query(text, params),
  initDatabase,
  pool,

  // --- Users ---
  async findUserById(id) {
    const res = await pool.query(
      `SELECT id, username, email, avatar, role, level, xp, "totalRequests", "isBanned", "createdAt" 
       FROM music_station_db.users WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async findUserByLogin(login) {
    const clean = login.trim().toLowerCase();
    const res = await pool.query(
      `SELECT id, username, email, "passwordHash", avatar, role, level, xp, "totalRequests", "isBanned", "createdAt"
       FROM music_station_db.users 
       WHERE LOWER(email) = $1 OR LOWER(username) = $1`,
      [clean]
    );
    return res.rows[0] || null;
  },

  async findUserByUsernameOrEmail(username, email) {
    const res = await pool.query(
      `SELECT id, username, email FROM music_station_db.users 
       WHERE LOWER(username) = $1 OR LOWER(email) = $2`,
      [username.trim().toLowerCase(), email.trim().toLowerCase()]
    );
    return res.rows[0] || null;
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

  // --- Favorites ---
  async getFavorites(userId) {
    const res = await pool.query(
      `SELECT id, "videoId", title, author, thumbnail, duration, "createdAt"
       FROM music_station_db.favorites
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC`,
      [userId]
    );
    return res.rows;
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

  // --- Song History ---
  async addSongHistory(track) {
    const isUUID = track.requestedById && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(track.requestedById);
    const validUserId = isUUID ? track.requestedById : null;

    const res = await pool.query(
      `INSERT INTO music_station_db.song_history ("videoId", title, author, thumbnail, duration, "requestedById", "requestedByName", "isDefault")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
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
  },

  async getSongHistory(limit = 30) {
    const res = await pool.query(
      `SELECT id, "videoId", title, author, thumbnail, duration, "requestedByName", "isDefault", "playedAt"
       FROM music_station_db.song_history
       ORDER BY "playedAt" DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  },

  // --- Chat Messages ---
  async addChatMessage(msg) {
    const isUUID = msg.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(msg.userId);
    const validUserId = isUUID ? msg.userId : null;

    await pool.query(
      `INSERT INTO music_station_db.chat_messages (id, "userId", username, avatar, text, type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [msg.id, validUserId, msg.username, msg.avatar || '🎧', msg.text, msg.type || 'user']
    );

    if (validUserId) {
      await pool.query(
        `UPDATE music_station_db.users SET xp = xp + 2 WHERE id = $1`,
        [validUserId]
      ).catch(() => {});
    }
  },

  async getRecentChat(limit = 30) {
    const res = await pool.query(
      `SELECT id, "userId", username, avatar, text, type, "createdAt"
       FROM music_station_db.chat_messages
       ORDER BY "createdAt" DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows.reverse();
  },

  // --- Leaderboard ---
  async getLeaderboard(limit = 10) {
    const res = await pool.query(
      `SELECT id, username, avatar, role, level, xp, "totalRequests"
       FROM music_station_db.users
       ORDER BY "totalRequests" DESC, xp DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
};

module.exports = db;
