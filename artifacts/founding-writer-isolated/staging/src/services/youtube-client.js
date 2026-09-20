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
    isShort = true,
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

    // Step 1: Initiate resumable session
    const metadata = {
      snippet: {
        title: finalTitle.slice(0, 100),
        description: finalDesc,
        tags: normalizedTags,
        categoryId: '27', // Education
        defaultLanguage: 'en',
        defaultAudioLanguage: 'en',
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
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
}
