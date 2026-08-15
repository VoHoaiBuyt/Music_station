require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'supa_station_secret_2026_jwt_token',
  JWT_EXPIRES_IN: '7d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  COOLDOWN_DURATION_MS: 5 * 60 * 1000, // 5 minutes standard cooldown
  VIP_COOLDOWN_DURATION_MS: 2 * 60 * 1000, // 2 minutes for VIP / DJ
  VOTE_WINDOW_DURATION_SEC: 10 // 10 seconds vote skip window
};
