const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

// All Admin routes require authentication and ADMIN role
router.use(authenticateToken, requireRole(['ADMIN']));

// GET /api/admin/users - Get all users
router.get('/users', adminController.getAllUsers);

// PUT /api/admin/users/:userId/ban - Ban or unban user
router.put('/users/:userId/ban', adminController.toggleBanUser);

// DELETE /api/admin/users/:userId - Delete user permanently
router.delete('/users/:userId', adminController.deleteUser);

module.exports = router;
