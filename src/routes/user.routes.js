const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Public routes
router.get('/history', UserController.getHistory);
router.get('/leaderboard', UserController.getLeaderboard);

// Authenticated user routes
router.get('/favorites', authenticateToken, UserController.getFavorites);
router.post('/favorites', authenticateToken, UserController.addFavorite);
router.delete('/favorites/:videoId', authenticateToken, UserController.removeFavorite);

module.exports = router;
