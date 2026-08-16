// YouTube Search & Metadata Service
// Zero-dependency, high-speed YouTube video search and auto-complete suggestions

class YouTubeService {
  /**
   * Search YouTube videos by keyword
   * @param {string} query Search keyword
   * @param {number} limit Maximum results to return (default 10)
   * @returns {Promise<Array>} List of video items
   */
  static async searchVideos(query, limit = 10) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [];
    }

    const trimmed = query.trim();

    // If query is directly a YouTube URL or 11-char ID, fetch its metadata directly
    const videoIdMatch = this.extractVideoId(trimmed);
    if (videoIdMatch) {
      const meta = await this.getVideoDetails(videoIdMatch);
      return meta ? [meta] : [];
    }

    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`YouTube responded with status ${response.status}`);
      }

      const html = await response.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
      if (!match) {
        return [];
      }

      const data = JSON.parse(match[1]);
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const results = [];

      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item.videoRenderer;
          if (v && v.videoId && v.title) {
            const title = v.title.runs?.map(r => r.text).join('') || v.title.simpleText || 'YouTube Video';
            const author = v.ownerText?.runs?.map(r => r.text).join('') || 'YouTube Artist';
            const durationText = v.lengthText?.simpleText || '3:30';
            const durationSec = this.parseDuration(durationText);
            
            // Pick best thumbnail
            const thumbUrl = v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
              v.thumbnail?.thumbnails?.[0]?.url ||
              `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

            results.push({
              videoId: v.videoId,
              title,
              author,
              thumbnail: thumbUrl,
              duration: durationSec,
              durationFormatted: durationText,
              url: `https://www.youtube.com/watch?v=${v.videoId}`
            });

            if (results.length >= limit) break;
          }
        }
        if (results.length >= limit) break;
      }

      return results;
    } catch (err) {
      console.warn('[YouTubeService] searchVideos error:', err.message);
      return [];
    }
  }

  /**
   * Get search keyword autocomplete suggestions
   * @param {string} query 
   * @returns {Promise<Array<string>>}
   */
  static async getSuggestions(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [];
    }

    try {
      const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query.trim())}`;
      const response = await fetch(suggestUrl, {
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && Array.isArray(data[1])) {
          return data[1].slice(0, 8);
        }
      }
    } catch (err) {
      console.warn('[YouTubeService] getSuggestions error:', err.message);
    }
    return [];
  }

  /**
   * Fetch single video details by videoId
   */
  static async getVideoDetails(videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;

    try {
      const response = await fetch(oEmbedUrl, { signal: AbortSignal.timeout(4000) });
      if (response.ok) {
        const data = await response.json();
        return {
          videoId,
          title: data.title || 'YouTube Music Track',
          author: data.author_name || 'YouTube Creator',
          thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration: 240,
          durationFormatted: '4:00',
          url: videoUrl
        };
      }
    } catch (err) {
      console.warn(`[YouTubeService] getVideoDetails failed for ${videoId}:`, err.message);
    }

    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      author: 'Unknown Artist',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: 240,
      durationFormatted: '4:00',
      url: videoUrl
    };
  }

  /**
   * Extract video ID from URL or return if 11 chars
   */
  static extractVideoId(urlOrId) {
    if (!urlOrId || typeof urlOrId !== 'string') return null;
    const trimmed = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = trimmed.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Parse "MM:SS" or "HH:MM:SS" into seconds
   */
  static parseDuration(text) {
    if (!text || typeof text !== 'string') return 240;
    const parts = text.split(':').map(Number);
    if (parts.some(isNaN)) return 240;

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 240;
  }
}

module.exports = YouTubeService;
