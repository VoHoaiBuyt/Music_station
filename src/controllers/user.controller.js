const UserService = require('../services/user.service');

class UserController {
  static async getFavorites(req, res, next) {
    try {
      const favorites = await UserService.getFavorites(req.user.id);
      res.status(200).json({
        success: true,
        data: favorites
      });
    } catch (err) {
      next(err);
    }
  }

  static async addFavorite(req, res, next) {
    try {
      const { videoId, title, author, thumbnail, duration } = req.body;
      const fav = await UserService.addFavorite(req.user.id, { videoId, title, author, thumbnail, duration });
      res.status(201).json({
        success: true,
        message: 'Đã thêm bài hát vào danh sách yêu thích!',
        data: fav
      });
    } catch (err) {
      next(err);
    }
  }

  static async removeFavorite(req, res, next) {
    try {
      const { videoId } = req.params;
      await UserService.removeFavorite(req.user.id, videoId);
      res.status(200).json({
        success: true,
        message: 'Đã bỏ bài hát khỏi danh sách yêu thích!'
      });
    } catch (err) {
      next(err);
    }
  }

  static async getHistory(req, res, next) {
    try {
      const history = await UserService.getSongHistory(30);
      res.status(200).json({
        success: true,
        data: history
      });
    } catch (err) {
      next(err);
    }
  }

  static async getLeaderboard(req, res, next) {
    try {
      const topUsers = await UserService.getLeaderboard(10);
      res.status(200).json({
        success: true,
        data: topUsers
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
