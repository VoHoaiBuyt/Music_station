const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtube.controller');

// Search videos by keyword or URL
router.get('/search', youtubeController.search);

// Suggest search keywords
router.get('/suggest', youtubeController.suggest);

// Get single video details
router.get('/details/:videoId', youtubeController.details);

module.exports = router;
