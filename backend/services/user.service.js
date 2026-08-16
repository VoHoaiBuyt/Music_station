const db = require('../config/db');

class UserService {
  static async addFavorite(userId, { videoId, title, author, thumbnail, duration }) {
    if (!videoId || !title) {
      throw { statusCode: 400, message: 'Thiếu thông tin bài hát!' };
    }

    return await db.addFavorite(userId, { videoId, title, author, thumbnail, duration });
  }

  static async removeFavorite(userId, videoId) {
    if (!videoId) {
      throw { statusCode: 400, message: 'Thiếu videoId!' };
    }

    return await db.removeFavorite(userId, videoId);
  }

  static async getFavorites(userId) {
    return await db.getFavorites(userId);
  }

  static async getSongHistory(limit = 30) {
    return await db.getSongHistory(limit);
  }

  static async getLeaderboard(limit = 10) {
    return await db.getLeaderboard(limit);
  }
}

module.exports = UserService;
