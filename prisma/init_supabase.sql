-- =========================================================
-- SUPABASE POSTGRESQL INITIALIZATION SCRIPT FOR LOFI LOUNGE
-- Schema: music_station_db
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

-- 4. Create Favorites Table
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

-- 5. Create Song History Table
CREATE TABLE IF NOT EXISTS music_station_db.song_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 6. Create Chat Messages Table
CREATE TABLE IF NOT EXISTS music_station_db.chat_messages (
    id VARCHAR(100) PRIMARY KEY,
    "userId" UUID REFERENCES music_station_db.users(id) ON DELETE SET NULL,
    username VARCHAR(50) NOT NULL,
    avatar VARCHAR(50) DEFAULT '🎧',
    text TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'user',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON music_station_db.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON music_station_db.users(email);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON music_station_db.favorites("userId");
CREATE INDEX IF NOT EXISTS idx_song_history_played ON music_station_db.song_history("playedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON music_station_db.chat_messages("createdAt" DESC);
