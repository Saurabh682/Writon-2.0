/**
 * Core Pinterest API v5 Client & Automation Service for WritOn
 * Implements:
 * - Native fetch zero-dependency architecture (Ponytail Principle)
 * - OAuth2 Bearer token management with in-memory caching & auto-refresh
 * - X-RateLimit-* header tracking & adaptive backoff on HTTP 429
 * - Automatic 401 token retry with fresh token invalidation
 * - Pin creation with image_url and local image_base64 encoding
 * - Metric harvesting (/v5/pins/{pin_id}/analytics)
 */

import fs from 'node:fs/promises';
import path from 'node:path';

export class PinterestClient {
  constructor({
    accessToken = process.env.PINTEREST_ACCESS_TOKEN,
    refreshToken = process.env.PINTEREST_REFRESH_TOKEN,
    appId = process.env.PINTEREST_APP_ID || process.env.PINTEREST_CLIENT_ID,
    appSecret = process.env.PINTEREST_APP_SECRET || process.env.PINTEREST_CLIENT_SECRET,
    defaultBoardId = process.env.PINTEREST_DEFAULT_BOARD_ID,
    baseUrl = process.env.PINTEREST_BASE_URL || (process.env.PINTEREST_SANDBOX === 'true' ? 'https://api-sandbox.pinterest.com/v5' : 'https://api.pinterest.com/v5'),
    log = console,
  } = {}) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.appId = appId;
    this.appSecret = appSecret;
    this.defaultBoardId = defaultBoardId;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.log = log;

    this.token = accessToken || null;
    this.tokenExpiresAt = accessToken ? Date.now() + 86400000 : 0; // default 24h for static token
    this.rateLimit = {
      limit: 1000,
      remaining: 1000,
      resetSeconds: 60,
      lastUpdated: 0,
    };
  }

  /**
   * Checks if required credentials are present (either direct access token or refresh credentials).
   */
  isConfigured() {
    return Boolean(this.token || (this.refreshToken && this.appId && this.appSecret));
  }

  /**
   * Updates internal rate limit tracking from Pinterest response headers.
   */
  _updateRateLimits(headers) {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');

    if (remaining !== null) {
      this.rateLimit.limit = parseInt(limit, 10) || 1000;
      this.rateLimit.remaining = parseInt(remaining, 10) || 0;
      this.rateLimit.resetSeconds = parseInt(reset, 10) || 60;
      this.rateLimit.lastUpdated = Date.now();
    }
  }

  /**
   * Acquires or reuses an active OAuth2 Bearer token.
   */
  async getAccessToken() {
    if (!this.isConfigured()) {
      throw new Error('PinterestClient is missing required credentials (PINTEREST_ACCESS_TOKEN or PINTEREST_REFRESH_TOKEN + PINTEREST_APP_ID + PINTEREST_APP_SECRET)');
    }

    const now = Date.now();
    if (this.token && now < this.tokenExpiresAt - 60000) {
      return this.token;
    }

    // If only static access token was supplied, return it
    if (this.accessToken && (!this.refreshToken || !this.appId || !this.appSecret)) {
      this.token = this.accessToken;
      this.tokenExpiresAt = now + 86400000;
      return this.token;
    }

    // Perform refresh token exchange
    const authHeader = `Basic ${Buffer.from(`${this.appId}:${this.appSecret}`).toString('base64')}`;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    });

    this.log.info?.('🔑 Refreshing Pinterest OAuth2 access token...');
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    this._updateRateLimits(res.headers);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to refresh Pinterest token (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (!data.access_token) {
      throw new Error(`Pinterest token response missing access_token: ${JSON.stringify(data)}`);
    }

    this.token = data.access_token;
    this.tokenExpiresAt = now + ((data.expires_in || 3600) * 1000);
    return this.token;
  }

  /**
   * Executes an authorized request to Pinterest API v5 with automatic rate limiting and retry.
   */
  async request(endpoint, options = {}) {
    const token = await this.getAccessToken();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.baseUrl}${cleanEndpoint}`);

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let attempts = 0;
    const maxAttempts = 3;
    let retried401 = false;

    while (attempts < maxAttempts) {
      attempts++;
      const res = await fetch(url.toString(), {
        ...options,
        headers,
      });

      this._updateRateLimits(res.headers);

      // Handle HTTP 429 Too Many Requests
      if (res.status === 429) {
        const retryAfterSec = parseInt(res.headers.get('retry-after') || this.rateLimit.resetSeconds || 5, 10);
        this.log.warn?.(`⚠️ Pinterest 429 Rate Limit hit. Backing off for ${retryAfterSec}s (attempt ${attempts}/${maxAttempts})...`);
        await new Promise((r) => setTimeout(r, (retryAfterSec + 1) * 1000));
        continue;
      }

      // Handle HTTP 401 Unauthorized (token invalidation & refresh)
      if (res.status === 401 && !retried401 && this.refreshToken && this.appId) {
        retried401 = true;
        this.token = null;
        this.tokenExpiresAt = 0;
        headers.Authorization = `Bearer ${await this.getAccessToken()}`;
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        const err = new Error(`Pinterest API error ${res.status} on ${cleanEndpoint}: ${errText}`);
        err.status = res.status;
        err.path = cleanEndpoint;
        throw err;
      }

      // Handle 204 No Content
      if (res.status === 204) {
        return { success: true };
      }

      return res.json();
    }

    throw new Error(`Pinterest API request failed after ${maxAttempts} attempts due to rate limiting.`);
  }

  /**
   * Retrieves profile details of the authenticated Pinterest user.
   */
  async getMe() {
    return this.request('/user_account');
  }

  /**
   * Fetches user's Pinterest boards.
   */
  async getBoards({ pageSize = 25, bookmark = null } = {}) {
    let path = `/boards?page_size=${pageSize}`;
    if (bookmark) path += `&bookmark=${encodeURIComponent(bookmark)}`;
    return this.request(path);
  }

  /**
   * Retrieves single board details by board ID.
   */
  async getBoard(boardId) {
    if (!boardId) throw new Error('boardId is required');
    return this.request(`/boards/${boardId}`);
  }

  /**
   * Creates a new board on Pinterest.
   */
  async createBoard({ name, description = '', privacy = 'PUBLIC' }) {
    if (!name) throw new Error('Board name is required');
    return this.request('/boards', {
      method: 'POST',
      body: JSON.stringify({
        name: name.slice(0, 50),
        description: description.slice(0, 500),
        privacy,
      }),
    });
  }

  /**
   * Creates and publishes a Pin on Pinterest.
   * Supports public imageUrl or local file/buffer via image_base64.
   */
  async createPin({
    boardId = this.defaultBoardId,
    title,
    description = '',
    link = 'https://writon.cc',
    altText = '',
    imageUrl = null,
    imagePath = null,
    imageBuffer = null,
  }) {
    const resolvedBoardId = boardId || this.defaultBoardId;
    if (!resolvedBoardId) {
      throw new Error('boardId is required to create a Pin (or set PINTEREST_DEFAULT_BOARD_ID)');
    }
    if (!title) {
      throw new Error('Pin title is required');
    }

    let mediaSource = null;

    if (imageUrl) {
      mediaSource = {
        source_type: 'image_url',
        url: imageUrl,
      };
    } else if (imageBuffer) {
      mediaSource = {
        source_type: 'image_base64',
        content_type: 'image/png',
        data: Buffer.isBuffer(imageBuffer) ? imageBuffer.toString('base64') : String(imageBuffer),
      };
    } else if (imagePath) {
      const fileBuf = await fs.readFile(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      mediaSource = {
        source_type: 'image_base64',
        content_type: contentType,
        data: fileBuf.toString('base64'),
      };
    } else {
      throw new Error('Pin creation requires either imageUrl, imagePath, or imageBuffer');
    }

    // Enforce Pinterest field ceilings
    const payload = {
      board_id: resolvedBoardId,
      title: title.slice(0, 100),
      description: description.slice(0, 800),
      link: link || 'https://writon.cc',
      alt_text: (altText || title).slice(0, 500),
      media_source: mediaSource,
    };

    this.log.info?.(`📌 Creating Pin on board ${resolvedBoardId}: "${payload.title.slice(0, 50)}..."`);
    const data = await this.request('/pins', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      id: data.id,
      title: data.title,
      link: data.link,
      url: `https://www.pinterest.com/pin/${data.id}/`,
      data,
    };
  }

  /**
   * Retrieves Pin details by ID.
   */
  async getPin(pinId) {
    if (!pinId) throw new Error('pinId is required');
    return this.request(`/pins/${pinId}`);
  }

  /**
   * Fetches analytics metrics for a Pin.
   * Standard metric types: IMPRESSION, SAVE, PIN_CLICK, OUTBOUND_CLICK.
   */
  async getPinAnalytics(pinId, {
    startDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    endDate = new Date().toISOString().split('T')[0],
    metricTypes = 'IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK',
  } = {}) {
    if (!pinId) throw new Error('pinId is required');
    const path = `/pins/${pinId}/analytics?start_date=${startDate}&end_date=${endDate}&metric_types=${metricTypes}`;
    try {
      const data = await this.request(path);
      const metrics = data?.all || data || {};
      return {
        impressions: metrics.IMPRESSION || metrics.impression || 0,
        saves: metrics.SAVE || metrics.save || 0,
        pinClicks: metrics.PIN_CLICK || metrics.pin_click || 0,
        outboundClicks: metrics.OUTBOUND_CLICK || metrics.outbound_click || 0,
        raw: data,
      };
    } catch (err) {
      this.log.warn?.(`Could not fetch Pin analytics for ${pinId}: ${err.message}`);
      return { impressions: 0, saves: 0, pinClicks: 0, outboundClicks: 0, error: err.message };
    }
  }
}
