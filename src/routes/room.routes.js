const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Public routes
router.get('/', roomController.getAllRooms);
router.get('/:slug', roomController.getRoomBySlug);
router.post('/:slug/verify-password', roomController.verifyPassword);

// Protected routes (Require Login)
router.post('/', authenticateToken, roomController.createRoom);
router.delete('/:slug', authenticateToken, roomController.deleteRoom);

module.exports = router;
