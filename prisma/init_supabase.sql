-- =========================================================
-- SUPABASE POSTGRESQL INITIALIZATION SCRIPT FOR LOFI LOUNGE
-- Schema: music_station_db (Multi-Room Architecture)
-- =========================================================

-- 1. Create Schema if not exists
CREATE SCHEMA IF NOT EXISTS music_station_db;

-- Set default search path
SET search_path TO music_station_db, public;

-- 2. Create Enum for Roles
DO $$ BEGIN
    CREATE TYPE music_station_db."Role" AS ENUM ('USER', 'VIP', 'DJ', 'MODERATOR', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create Users Table
CREATE TABLE IF NOT EXISTS music_station_db.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    avatar VARCHAR(50) DEFAULT '🎧',
    role music_station_db."Role" DEFAULT 'USER'::music_station_db."Role",
    level INT DEFAULT 1,
    xp INT DEFAULT 0,
    "totalRequests" INT DEFAULT 0,
    "isBanned" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Rooms Table (Independent User-Created Music Lounges)
CREATE TABLE IF NOT EXISTS music_station_db.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(120) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    genre VARCHAR(80) DEFAULT 'Lofi & Chill',
    "coverUrl" VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80',
    "isPrivate" BOOLEAN DEFAULT false,
    "passwordHash" VARCHAR(255),
    "creatorId" UUID REFERENCES music_station_db.users(id) ON DELETE SET NULL,
    "creatorName" VARCHAR(100) DEFAULT 'Station Master',
    "currentTrack" JSONB,
    queue JSONB DEFAULT '[]'::jsonb,
    "isDefault" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Favorites Table
CREATE TABLE IF NOT EXISTS music_station_db.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES music_station_db.users(id) ON DELETE CASCADE,
    "videoId" VARCHAR(50) NOT NULL,
    title VARCHAR(300) NOT NULL,
    author VARCHAR(150),
    thumbnail VARCHAR(500),
    duration INT DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_video UNIQUE ("userId", "videoId")
);

-- 6. Create Song History Table
CREATE TABLE IF NOT EXISTS music_station_db.song_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomSlug" VARCHAR(120) DEFAULT 'lofi-chill-study',
    "videoId" VARCHAR(50) NOT NULL,
    title VARCHAR(300) NOT NULL,
    author VARCHAR(150),
    thumbnail VARCHAR(500),
    duration INT DEFAULT 0,
    "requestedById" UUID REFERENCES music_station_db.users(id) ON DELETE SET NULL,
    "requestedByName" VARCHAR(100) DEFAULT 'Station Radio',
    "isDefault" BOOLEAN DEFAULT false,
    "voteSkips" INT DEFAULT 0,
    "playedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add roomSlug column if table existed previously
ALTER TABLE music_station_db.song_history ADD COLUMN IF NOT EXISTS "roomSlug" VARCHAR(120) DEFAULT 'lofi-chill-study';

-- 7. Create Chat Messages Table
CREATE TABLE IF NOT EXISTS music_station_db.chat_messages (
    id VARCHAR(100) PRIMARY KEY,
    "roomSlug" VARCHAR(120) DEFAULT 'lofi-chill-study',
    "userId" UUID REFERENCES music_station_db.users(id) ON DELETE SET NULL,
    username VARCHAR(50) NOT NULL,
    avatar VARCHAR(50) DEFAULT '🎧',
    role VARCHAR(30) DEFAULT 'USER',
    text TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'user',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add roomSlug and role columns if table existed previously
ALTER TABLE music_station_db.chat_messages ADD COLUMN IF NOT EXISTS "roomSlug" VARCHAR(120) DEFAULT 'lofi-chill-study';
ALTER TABLE music_station_db.chat_messages ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'USER';

-- 8. Seed Default Featured Rooms if empty
INSERT INTO music_station_db.rooms (slug, name, description, genre, "coverUrl", "creatorName", "isDefault")
VALUES 
  ('lofi-chill-study', '📚 Lofi Study & Relax Beats', 'Không gian giai điệu êm dịu, nhẹ nhàng cho học tập và thư giãn.', 'Lofi & Chill', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80', 'Station Master', true),
  ('tokyo-night-drive', '🌃 Tokyo Night Citypop & Synth', 'Chuyến xe đêm qua lòng thành phố với giai điệu Future Funk và Synthwave.', 'Cyberpunk & Synth', 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&q=80', 'Station Master', true),
  ('coffee-shop-vibes', '☕ Coffee Shop Acoustic & Jazz', 'Cà phê chiều mưa cùng những bản acoustic mộc mạc và jazz êm dịu.', 'Coffee & Acoustic', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80', 'Station Master', true),
  ('anime-ghibli-memories', '🌸 Studio Ghibli & Anime Piano', 'Hồi ức tuổi thơ qua những khúc dương cầm anime kinh điển.', 'Anime & Piano', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80', 'Station Master', true)
ON CONFLICT (slug) DO NOTHING;

-- 9. Seed Super Admin User
INSERT INTO music_station_db.users (username, email, "passwordHash", avatar, role, level, xp)
VALUES ('admin', 'admin@lofilounge.com', '$2a$10$WjE1r9w.m.V4fK7L2kF2u.z9Y9A8B7C6D5E4F3G2H1I0J9K8L7M6N', '👑', 'ADMIN', 99, 9999)
ON CONFLICT (email) DO UPDATE SET role = 'ADMIN', avatar = '👑', level = 99;

-- 10. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_slug ON music_station_db.rooms(slug);
CREATE INDEX IF NOT EXISTS idx_rooms_genre ON music_station_db.rooms(genre);
CREATE INDEX IF NOT EXISTS idx_users_username ON music_station_db.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON music_station_db.users(email);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON music_station_db.favorites("userId");
CREATE INDEX IF NOT EXISTS idx_song_history_room ON music_station_db.song_history("roomSlug", "playedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON music_station_db.chat_messages("roomSlug", "createdAt" DESC);
