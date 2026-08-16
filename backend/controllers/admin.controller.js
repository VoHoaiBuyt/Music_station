const db = require('../config/db');

const adminController = {
  // GET /api/admin/users - List all users
  async getAllUsers(req, res, next) {
    try {
      const users = await db.getAllUsersForAdmin();
      return res.json({
        success: true,
        data: users
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/admin/users/:userId/ban - Toggle Ban Status
  async toggleBanUser(req, res, next) {
    try {
      const { userId } = req.params;
      const { isBanned } = req.body;

      if (userId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Không thể tự khóa tài khoản Admin của chính bạn!'
        });
      }

      const target = await db.findUserById(userId);
      if (!target) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại!'
        });
      }

      if (target.role === 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Không thể khóa tài khoản có quyền Quản Trị Viên (Admin)!'
        });
      }

      const updated = await db.setUserBanStatus(userId, isBanned);

      return res.json({
        success: true,
        message: isBanned 
          ? `Đã khóa tài khoản người dùng "${updated.username}" thành công!` 
          : `Đã mở khóa cho người dùng "${updated.username}" thành công!`,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/admin/users/:userId - Permanently Delete User
  async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;

      if (userId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Không thể tự xoá tài khoản Admin của chính bạn!'
        });
      }

      const target = await db.findUserById(userId);
      if (!target) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại!'
        });
      }

      if (target.role === 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Không thể xoá tài khoản có quyền Quản Trị Viên (Admin)!'
        });
      }

      const success = await db.deleteUser(userId);

      return res.json({
        success: true,
        message: `Đã xoá vĩnh viễn tài khoản người dùng "${target.username}" khỏi hệ thống!`
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminController;
