const AuthService = require('../services/auth.service');

class AuthController {
  static async register(req, res, next) {
    try {
      const { username, email, password, avatar } = req.body;
      const result = await AuthService.register({ username, email, password, avatar });
      res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công! Chào mừng bạn đến với Lofi & Chill Lounge.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { login, password } = req.body;
      const result = await AuthService.login({ login, password });
      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công!',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const { avatar, username } = req.body;
      const updatedUser = await AuthService.updateProfile(req.user.id, { avatar, username });
      res.status(200).json({
        success: true,
        message: 'Cập nhật hồ sơ thành công!',
        data: {
          user: updatedUser
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
