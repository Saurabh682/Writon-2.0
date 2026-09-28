/**
 * Core YouTube Data API v3 Client & Automation Service for WritOn
 * Implements:
 * - Native fetch zero-dependency architecture (Ponytail Principle)
 * - Google OAuth2 token management with in-memory caching & auto-refresh
 * - Google Resumable Media Upload protocol for YouTube Shorts & Videos
 * - Video analytics & performance metrics harvesting
 * - Public trend scouting & search
 * - HTTP 401 automatic retry & exponential backoff on rate limits
 */

import fs from 'node:fs/promises';
import path from 'node:path';

export class YouTubeClient {
  constructor({
    clientId = process.env.YOUTUBE_CLIENT_ID,
    clientSecret = process.env.YOUTUBE_CLIENT_SECRET,
    refreshToken = process.env.YOUTUBE_REFRESH_TOKEN,
    accessToken = process.env.YOUTUBE_ACCESS_TOKEN,
    apiKey = process.env.YOUTUBE_API_KEY,
    channelId = process.env.YOUTUBE_CHANNEL_ID,
    log = console,
  } = {}) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.apiKey = apiKey;
    this.channelId = channelId;
    this.log = log;

    this.token = accessToken || null;
    this.tokenExpiresAt = accessToken ? Date.now() + 3600000 : 0;
  }

  /**
   * Checks if credentials are present for write operations (OAuth) or read operations (API Key / OAuth).
   */
  isConfigured() {
    return Boolean(this.token || (this.refreshToken && this.clientId && this.clientSecret) || this.apiKey);
  }

  /**
   * Checks if upload/write operations are supported (requires OAuth).
   */
  canUpload() {
    return Boolean(this.token || (this.refreshToken && this.clientId && this.clientSecret));
  }

  /**
   * Acquires or reuses an active Google OAuth2 Bearer token.
   */
  async getAccessToken() {
    if (!this.canUpload()) {
      throw new Error('YouTubeClient: Missing OAuth credentials (YOUTUBE_REFRESH_TOKEN, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET)');
    }

    // Reuse cached token if valid (with 60s buffer)
    if (this.token && Date.now() < this.tokenExpiresAt - 60000) {
      return this.token;
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`YouTube OAuth token refresh failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    this.log?.info?.('[YouTubeClient] Successfully acquired/refreshed OAuth access token');
    return this.token;
  }

  /**
   * Helper to perform authenticated API calls with 401 retry & backoff.
   */
  async request(endpoint, options = {}, { isUpload = false, retry = true } = {}) {
    const isFullUrl = endpoint.startsWith('http');
    const baseUrl = isUpload
      ? 'https://www.googleapis.com/upload/youtube/v3'
      : 'https://www.googleapis.com/youtube/v3';
    
    let url = isFullUrl ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = { ...options.headers };

    // Attach OAuth token or fallback to API Key for read
    if (this.canUpload()) {
      const token = await this.getAccessToken();
      headers['Authorization'] = `Bearer ${token}`;
    } else if (this.apiKey) {
      const delimiter = url.includes('?') ? '&' : '?';
      url = `${url}${delimiter}key=${encodeURIComponent(this.apiKey)}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized token expiry retry
    if (response.status === 401 && retry && this.refreshToken) {
      this.log?.warn?.('[YouTubeClient] Received 401 Unauthorized, refreshing token and retrying...');
      this.token = null;
      this.tokenExpiresAt = 0;
      return this.request(endpoint, options, { isUpload, retry: false });
    }

    // Handle 429 rate limit
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '2', 10);
      this.log?.warn?.({ retryAfter }, '[YouTubeClient] Rate limited (429), waiting...');
      await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
      return this.request(endpoint, options, { isUpload, retry: false });
    }

    return response;
  }

  /**
   * Normalizes any hashtags inside text to strictly lowercase (e.g. #Shorts -> #shorts).
   */
  _normalizeHashtags(text) {
    if (!text) return '';
    return text.replace(/#([A-Za-z0-9_]+)/g, (_match, tag) => `#${tag.toLowerCase()}`);
  }

  /**
   * Uploads a video file or Short using Google Resumable Media Upload protocol.
   * @param {Object} params
   * @param {string} params.videoPath - Local absolute path to MP4 video file
   * @param {string} params.title - Video title (English only)
   * @param {string} [params.description] - Video description (English only)
   * @param {string[]} [params.tags] - Array of tags (lowercase only)
   * @param {string} [params.privacyStatus='public'] - 'public', 'unlisted', or 'private'
   * @param {boolean} [params.isShort=true] - Appends #shorts if not present
   */
  async uploadVideo({
    videoPath,
    title,
    description = '',
    tags = ['writing', 'craft', 'poetry', 'books', 'writon'],
    privacyStatus = 'public',
    publishAt = null,
    isShort = true,
    defaultLanguage = 'en',
  }) {
    if (!videoPath) {
      throw new Error('videoPath is required for YouTube upload');
    }

    const fileStats = await fs.stat(videoPath);
    const fileSize = fileStats.size;

    let finalTitle = this._normalizeHashtags(title);
    if (isShort && !finalTitle.toLowerCase().includes('#shorts')) {
      finalTitle = `${finalTitle.trim()} #shorts`;
    }

    let finalDesc = this._normalizeHashtags(description);
    if (isShort && !finalDesc.toLowerCase().includes('#shorts')) {
      finalDesc = `${finalDesc.trim()}\n\n#shorts #writingcommunity #writon`;
    }

    // Always enforce lowercase tags
    const normalizedTags = Array.from(
      new Set(
        [...tags, isShort ? 'shorts' : null]
          .filter(Boolean)
          .map((t) => t.toLowerCase().replace(/^#/, ''))
      )
    ).slice(0, 30);

    const statusObj = {
      privacyStatus,
      selfDeclaredMadeForKids: false,
    };
    if (publishAt && privacyStatus === 'private') {
      statusObj.publishAt = publishAt;
    }

    const metadata = {
      snippet: {
        title: finalTitle.slice(0, 100),
        description: finalDesc,
        tags: normalizedTags,
        categoryId: '27', // Education
        defaultLanguage,
        defaultAudioLanguage: defaultLanguage,
      },
      status: statusObj,
    };

    const initRes = await this.request(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'video/mp4',
          'X-Upload-Content-Length': String(fileSize),
        },
        body: JSON.stringify(metadata),
      },
      { isUpload: true }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`Failed to initiate YouTube video upload (${initRes.status}): ${errText}`);
    }

    const uploadUrl = initRes.headers.get('location');
    if (!uploadUrl) {
      throw new Error('YouTube API did not return Location header for resumable upload');
    }

    // Step 2: Upload the binary payload
    const fileBuffer = await fs.readFile(videoPath);
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(fileSize),
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`YouTube video upload failed (${uploadRes.status}): ${errText}`);
    }

    const data = await uploadRes.json();
    const videoId = data.id;
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const shortsUrl = `https://www.youtube.com/shorts/${videoId}`;

    return {
      success: true,
      videoId,
      url: isShort ? shortsUrl : watchUrl,
      watchUrl,
      shortsUrl,
      title: data.snippet?.title || finalTitle,
      status: data.status?.uploadStatus || 'uploaded',
    };
  }

  /**
   * Fetches public metrics (views, likes, comments) for a specific video.
   */
  async getVideoMetrics(videoId) {
    const cleanId = videoId.replace(/^.*[=/]/, '');
    const res = await this.request(`/videos?part=snippet,statistics&id=${encodeURIComponent(cleanId)}`);

    if (!res.ok) {
      return { views: 0, likes: 0, comments: 0 };
    }

    const data = await res.json();
    const item = data?.items?.[0];
    if (!item) {
      return { views: 0, likes: 0, comments: 0 };
    }

    const stats = item.statistics || {};
    return {
      views: parseInt(stats.viewCount || '0', 10),
      likes: parseInt(stats.likeCount || '0', 10),
      comments: parseInt(stats.commentCount || '0', 10),
      title: item.snippet?.title,
    };
  }

  /**
   * Searches for trending videos or topics around a query.
   */
  async searchVideos({ query, maxResults = 5 } = {}) {
    const res = await this.request(
      `/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&order=relevance`
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`YouTube search failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return (data.items || []).map((item) => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      channelTitle: item.snippet?.channelTitle,
      publishedAt: item.snippet?.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
    }));
  }

  /**
   * Updates metadata (title, description, tags) for an existing video.
   * Useful for Plateau Buster / SEO rescue of stalled videos.
   * @param {Object} params
   * @param {string} params.videoId - YouTube video ID
   * @param {string} [params.title] - New title
   * @param {string} [params.description] - New description
   * @param {string[]} [params.tags] - New tags array
   * @param {string} [params.categoryId] - Optional category ID override
   */
  async updateVideoSEO({ videoId, title, description, tags, categoryId } = {}) {
    if (!videoId) throw new Error('videoId is required for updateVideoSEO');
    const cleanId = videoId.replace(/^.*[=/]/, '');

    // Step 1: Fetch existing snippet to preserve unmodified fields
    const getRes = await this.request(`/videos?part=snippet&id=${encodeURIComponent(cleanId)}`);
    if (!getRes.ok) {
      const err = await getRes.text();
      throw new Error(`Failed to fetch video snippet for SEO update (${getRes.status}): ${err}`);
    }

    const getData = await getRes.json();
    const existingSnippet = getData.items?.[0]?.snippet;
    if (!existingSnippet) {
      throw new Error(`Video not found: ${cleanId}`);
    }

    const updatedSnippet = {
      ...existingSnippet,
      title: title ? this._normalizeHashtags(title).slice(0, 100) : existingSnippet.title,
      description: description !== undefined ? this._normalizeHashtags(description) : existingSnippet.description,
      tags: tags ? Array.from(new Set(tags.map((t) => t.toLowerCase().replace(/^#/, '')))).slice(0, 30) : existingSnippet.tags,
      categoryId: categoryId || existingSnippet.categoryId || '27',
    };

    // Step 2: PUT updated snippet
    const putRes = await this.request('/videos?part=snippet', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: cleanId,
        snippet: updatedSnippet,
      }),
    });

    if (!putRes.ok) {
      const err = await putRes.text();
      throw new Error(`Failed to update video SEO (${putRes.status}): ${err}`);
    }

    const updatedData = await putRes.json();
    return {
      success: true,
      videoId: cleanId,
      title: updatedData.snippet?.title,
      description: updatedData.snippet?.description,
      tags: updatedData.snippet?.tags,
    };
  }

  /**
   * Fetches traffic sources (Search, Shorts feed, Suggested, External) via YouTube Analytics API v2.
   * @param {Object} [params]
   * @param {number} [params.days=30]
   */
  async getTrafficSources({ days = 30 } = {}) {
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    const token = await this.getAccessToken();

    const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
    url.searchParams.set('ids', 'channel==MINE');
    url.searchParams.set('startDate', startDate);
    url.searchParams.set('endDate', endDate);
    url.searchParams.set('metrics', 'views,estimatedMinutesWatched');
    url.searchParams.set('dimensions', 'insightTrafficSourceType');
    url.searchParams.set('sort', '-views');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `Analytics API unavailable (${res.status}): ${err}`, rows: [] };
    }

    const data = await res.json();
    return {
      period: `Last ${days} days`,
      sources: (data.rows || []).map(([sourceType, views, mins]) => ({
        sourceType,
        views,
        estimatedMinutesWatched: mins,
      })),
    };
  }

  /**
   * Fetches deep retention and watch-time analytics for a specific video via YouTube Analytics API v2.
   * @param {Object} params
   * @param {string} params.videoId
   * @param {number} [params.days=30]
   */
  async getVideoRetentionAnalytics({ videoId, days = 30 } = {}) {
    if (!videoId) throw new Error('videoId is required for getVideoRetentionAnalytics');
    const cleanId = videoId.replace(/^.*[=/]/, '');
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    const token = await this.getAccessToken();

    const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
    url.searchParams.set('ids', 'channel==MINE');
    url.searchParams.set('startDate', startDate);
    url.searchParams.set('endDate', endDate);
    url.searchParams.set('metrics', 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage');
    url.searchParams.set('filters', `video==${cleanId}`);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `Analytics API unavailable (${res.status}): ${err}`, videoId: cleanId };
    }

    const data = await res.json();
    const row = data.rows?.[0] || [];
    return {
      videoId: cleanId,
      views: row[0] || 0,
      estimatedMinutesWatched: row[1] || 0,
      averageViewDurationSec: row[2] || 0,
      averageViewPercentage: row[3] || 0,
    };
  }

  /**
   * Adds a top-level comment to a video.
   * @param {Object} params
   * @param {string} params.videoId
   * @param {string} params.text
   */
  async addComment({ videoId, text }) {
    if (!videoId || !text) throw new Error('videoId and text are required for addComment');
    const cleanId = videoId.replace(/^.*[=/]/, '');

    const res = await this.request('/commentThreads?part=snippet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          videoId: cleanId,
          topLevelComment: {
            snippet: {
              textOriginal: text,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.log?.warn?.(`[YouTubeClient] Failed to post comment (${res.status}): ${err}`);
      return { success: false, error: err };
    }

    const data = await res.json();
    return {
      success: true,
      commentId: data.id,
      text: data.snippet?.topLevelComment?.snippet?.textOriginal,
    };
  }
}


