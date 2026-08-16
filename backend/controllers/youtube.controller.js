const YouTubeService = require('../services/youtube.service');

const youtubeController = {
  // GET /api/youtube/search?q=...
  async search(req, res, next) {
    try {
      const { q } = req.query;
      if (!q || !q.trim()) {
        return res.json({ success: true, data: [] });
      }

      const results = await YouTubeService.searchVideos(q.trim(), 10);
      return res.json({
        success: true,
        data: results
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/youtube/suggest?q=...
  async suggest(req, res, next) {
    try {
      const { q } = req.query;
      if (!q || !q.trim()) {
        return res.json({ success: true, data: [] });
      }

      const suggestions = await YouTubeService.getSuggestions(q.trim());
      return res.json({
        success: true,
        data: suggestions
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/youtube/details/:videoId
  async details(req, res, next) {
    try {
      const { videoId } = req.params;
      const details = await YouTubeService.getVideoDetails(videoId);
      return res.json({
        success: true,
        data: details
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = youtubeController;
