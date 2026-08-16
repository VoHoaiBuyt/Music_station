const { roomManager } = require('../services/room.manager');

const roomController = {
  // GET /api/rooms
  getAllRooms(req, res, next) {
    try {
      const rooms = roomManager.getAllRoomsSummary();
      return res.json({
        success: true,
        data: rooms
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/rooms/:slug
  getRoomBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const room = roomManager.getRoom(slug);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Phòng nhạc không tồn tại!'
        });
      }

      return res.json({
        success: true,
        data: room.getSummary()
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/rooms
  async createRoom(req, res, next) {
    try {
      const { name, description, genre, coverUrl, isPrivate, password } = req.body;
      const user = req.user; // Authenticated user

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập tên phòng nhạc!'
        });
      }

      const newRoom = await roomManager.createRoom({
        name: name.trim(),
        description: description ? description.trim() : '',
        genre: genre ? genre.trim() : 'Lofi & Chill',
        coverUrl: coverUrl ? coverUrl.trim() : undefined,
        isPrivate: !!isPrivate,
        password: password ? String(password) : null,
        creatorId: user.id,
        creatorName: user.username
      });

      return res.status(201).json({
        success: true,
        message: 'Tạo phòng nhạc thành công!',
        data: newRoom
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/rooms/:slug/verify-password
  async verifyPassword(req, res, next) {
    try {
      const { slug } = req.params;
      const { password } = req.body;
      const room = roomManager.getRoom(slug);

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Phòng nhạc không tồn tại!'
        });
      }

      const isValid = await room.verifyPassword(password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu phòng không chính xác!'
        });
      }

      return res.json({
        success: true,
        message: 'Mật khẩu chính xác!'
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/rooms/:slug
  async deleteRoom(req, res, next) {
    try {
      const { slug } = req.params;
      const user = req.user;

      await roomManager.deleteRoom(slug, user.id, user.role);

      return res.json({
        success: true,
        message: 'Xoá phòng nhạc thành công!'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = roomController;
