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

      const newRoom = await roomManager.createRoom({
        name,
        description,
        genre,
        coverUrl,
        isPrivate,
        password,
        user
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
