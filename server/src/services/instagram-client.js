/**
 * Core Meta Graph API v26.0 Client for WritOn
 * Implements:
 * - Native fetch zero-dependency architecture (Ponytail Principle)
 * - Configurable META_GRAPH_API_VERSION (defaults to v26.0)
 * - Pluggable Auth Providers: FacebookLoginProvider & InstagramLoginProvider
 * - Dynamic runtime publishing quota extraction (content_publishing_limit)
 * - Asynchronous container creation & polling with backoff
 * - Views-centric metric extraction with capability matrix (NULL preservation)
 */

export class FacebookLoginProvider {
  constructor({ token, pageId, igBusinessAccountId }) {
    this.token = token;
    this.pageId = pageId;
    this.igBusinessAccountId = igBusinessAccountId;
    this.name = 'FACEBOOK_LOGIN';
  }

  async getAccessToken() {
    return this.token;
  }

  getCapabilities() {
    return {
      feed_publish: true,
      carousel_publish: true,
      reel_publish: true,
      story_publish: true,
      user_tagging: true,
      insights: true,
    };
  }
}

export class InstagramLoginProvider {
  constructor({ token, igUserId }) {
    this.token = token;
    this.igUserId = igUserId;
    this.name = 'INSTAGRAM_LOGIN';
  }

  async getAccessToken() {
    return this.token;
  }

  getCapabilities() {
    return {
      feed_publish: true,
      carousel_publish: true,
      reel_publish: true,
      story_publish: false, // Limited under standard Instagram Login
      user_tagging: false,
      insights: true,
    };
  }
}

export class InstagramClient {
  constructor({
    authProvider = null,
    accessToken = process.env.INSTAGRAM_ACCESS_TOKEN,
    igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.INSTAGRAM_USER_ID,
    apiVersion = process.env.META_GRAPH_API_VERSION || 'v26.0',
    baseUrl = 'https://graph.facebook.com',
    log = console,
  } = {}) {
    this.apiVersion = apiVersion;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.igUserId = igUserId;
    this.log = log;

    if (authProvider) {
      this.authProvider = authProvider;
    } else if (accessToken) {
      this.authProvider = new FacebookLoginProvider({
        token: accessToken,
        igBusinessAccountId: igUserId,
      });
    } else {
      this.authProvider = null;
    }
  }

  isConfigured() {
    return Boolean(this.authProvider && this.igUserId);
  }

  getCapabilities() {
    return this.authProvider ? this.authProvider.getCapabilities() : {};
  }

  async _fetch(endpoint, options = {}) {
    const token = await this.authProvider.getAccessToken();
    const url = new URL(`${this.baseUrl}/${this.apiVersion}/${endpoint.replace(/^\//, '')}`);
    if (options.method === 'GET' || !options.method) {
      url.searchParams.set('access_token', token);
      if (options.params) {
        for (const [k, v] of Object.entries(options.params)) {
          url.searchParams.set(k, v);
        }
      }
    }

    const headers = { ...options.headers };
    let body = options.body;

    if (options.method && options.method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      const bodyObj = typeof body === 'string' ? JSON.parse(body) : (body || {});
      bodyObj.access_token = token;
      body = JSON.stringify(bodyObj);
    }

    const res = await fetch(url.toString(), {
      ...options,
      headers,
      body,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error?.message || `Meta Graph API request failed with HTTP ${res.status}`);
      err.status = res.status;
      err.metaError = data?.error;
      throw err;
    }
    return data;
  }

  /**
   * Reads dynamic content publishing quota at runtime.
   */
  async getPublishingQuota() {
    try {
      const data = await this._fetch(`${this.igUserId}/content_publishing_limit`, {
        params: { fields: 'config,quota_usage' },
      });
      const info = data.data?.[0] || {};
      return {
        quotaUsage: info.quota_usage ?? null,
        quotaTotal: info.config?.quota_total ?? 50,
        quotaDuration: info.config?.quota_duration ?? 86400,
      };
    } catch (err) {
      this.log.warn?.(`Could not fetch Instagram publishing quota: ${err.message}`);
      return { quotaUsage: null, quotaTotal: 50, quotaDuration: 86400, error: err.message };
    }
  }

  /**
   * Creates a single image or video container.
   */
  async createContainer({ imageUrl, videoUrl, caption = '', isCarouselItem = false, mediaType = 'IMAGE' }) {
    const payload = {};
    if (isCarouselItem) {
      payload.is_carousel_item = true;
      payload.image_url = imageUrl;
    } else if (mediaType === 'REELS') {
      payload.media_type = 'REELS';
      payload.video_url = videoUrl;
      payload.caption = caption;
    } else if (mediaType === 'STORIES') {
      payload.media_type = 'STORIES';
      if (imageUrl) payload.image_url = imageUrl;
      if (videoUrl) payload.video_url = videoUrl;
    } else {
      payload.image_url = imageUrl;
      payload.caption = caption;
    }

    const data = await this._fetch(`${this.igUserId}/media`, {
      method: 'POST',
      body: payload,
    });

    if (!data.id) {
      throw new Error(`Failed to create container: ${JSON.stringify(data)}`);
    }
    return data.id;
  }

  /**
   * Creates parent carousel container.
   */
  async createCarouselContainer({ childContainerIds = [], caption = '' }) {
    if (childContainerIds.length < 2 || childContainerIds.length > 10) {
      throw new Error(`Instagram Carousel requires between 2 and 10 items. Provided: ${childContainerIds.length}`);
    }

    const data = await this._fetch(`${this.igUserId}/media`, {
      method: 'POST',
      body: {
        media_type: 'CAROUSEL',
        children: childContainerIds,
        caption,
      },
    });

    if (!data.id) {
      throw new Error(`Failed to create carousel parent container: ${JSON.stringify(data)}`);
    }
    return data.id;
  }

  /**
   * Polls container status until FINISHED, ERROR, or EXPIRED with backoff.
   */
  async pollContainerStatus(containerId, { maxAttempts = 15, intervalMs = 4000 } = {}) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const data = await this._fetch(containerId, {
        params: { fields: 'status_code,status' },
      });

      const statusCode = data.status_code || 'IN_PROGRESS';
      if (statusCode === 'FINISHED') {
        return { status: 'FINISHED', containerId };
      }
      if (statusCode === 'ERROR') {
        return { status: 'ERROR', containerId, error: data };
      }
      if (statusCode === 'EXPIRED') {
        return { status: 'EXPIRED', containerId, error: data };
      }

      await new Promise(r => setTimeout(r, intervalMs));
    }
    return { status: 'IN_PROGRESS', containerId, timedOut: true };
  }

  /**
   * Publishes a finished media container.
   */
  async publishContainer(containerId) {
    const data = await this._fetch(`${this.igUserId}/media_publish`, {
      method: 'POST',
      body: {
        creation_id: containerId,
      },
    });

    if (!data.id) {
      throw new Error(`Failed to publish container: ${JSON.stringify(data)}`);
    }

    let permalink = `https://www.instagram.com/p/${data.id}/`;
    let shortcode = null;
    try {
      const mediaData = await this._fetch(data.id, {
        params: { fields: 'permalink,shortcode' },
      });
      if (mediaData.permalink) permalink = mediaData.permalink;
      if (mediaData.shortcode) shortcode = mediaData.shortcode;
    } catch {
      // Fallback
    }

    return {
      success: true,
      igMediaId: data.id,
      shortcode,
      permalink,
    };
  }

  /**
   * Harvests views-centric metrics with NULL-preservation.
   */
  async fetchPublicationMetrics(igMediaId) {
    try {
      const data = await this._fetch(igMediaId, {
        params: { fields: 'like_count,comments_count,views,reach,saved,shares,total_interactions' },
      });

      return {
        views: data.views ?? null,
        reach: data.reach ?? null,
        likes: data.like_count ?? null,
        comments: data.comments_count ?? null,
        saved: data.saved ?? null,
        shares: data.shares ?? null,
        totalInteractions: data.total_interactions ?? null,
        rawPayload: data,
      };
    } catch (err) {
      this.log.warn?.(`Failed to fetch metrics for media ${igMediaId}: ${err.message}`);
      return { views: null, reach: null, likes: null, comments: null, saved: null, shares: null, totalInteractions: null, error: err.message };
    }
  }
}
