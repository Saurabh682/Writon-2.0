/**
 * Modern LinkedIn Client (Posts API & Media API)
 *
 * Adheres to:
 * - Linkedin-Version: 202609 (September 2026 Marketing API)
 * - X-Restli-Protocol-Version: 2.0.0
 * - Endpoint: POST https://api.linkedin.com/rest/posts
 * - Captures x-restli-id header for publication verification
 * - Resilient error handling (401 refresh verification, 429 adaptive backoff)
 */

export class LinkedInClient {
  constructor({
    accessToken = process.env.LINKEDIN_ACCESS_TOKEN,
    refreshToken = process.env.LINKEDIN_REFRESH_TOKEN,
    clientId = process.env.LINKEDIN_CLIENT_ID,
    clientSecret = process.env.LINKEDIN_CLIENT_SECRET,
    personUrn = process.env.LINKEDIN_PERSON_URN,
    apiVersion = process.env.LINKEDIN_API_VERSION || '202609',
    restliProtocolVersion = '2.0.0',
    log = console,
  } = {}) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.personUrn = personUrn;
    this.apiVersion = apiVersion;
    this.restliProtocolVersion = restliProtocolVersion;
    this.log = log;
    this.hasRefreshGrant = Boolean(refreshToken && clientId && clientSecret);
  }

  isConfigured() {
    return Boolean(this.accessToken && this.personUrn);
  }

  getHeaders({ extraHeaders = {} } = {}) {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Linkedin-Version': this.apiVersion,
      'X-Restli-Protocol-Version': this.restliProtocolVersion,
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
  }

  async request(url, options = {}, attempt = 1) {
    const response = await fetch(url, {
      ...options,
      headers: this.getHeaders({ extraHeaders: options.headers || {} }),
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      if (this.hasRefreshGrant && attempt === 1) {
        this.log.warn?.('⚠️ LinkedIn token expired (401). Attempting token refresh...');
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.request(url, options, attempt + 1);
        }
      }
      const err = new Error('LinkedIn authentication failed (401). Requires re-authorization.');
      err.status = 401;
      err.code = 'AUTH_REQUIRES_REAUTH';
      throw err;
    }

    // Handle 429 Rate Limit Backoff
    if (response.status === 429 && attempt <= 3) {
      const retryAfterSec = parseInt(response.headers.get('retry-after') || '5', 10);
      this.log.warn?.(`⚠️ LinkedIn 429 Too Many Requests. Backing off for ${retryAfterSec}s (attempt ${attempt})...`);
      await new Promise((resolve) => setTimeout(resolve, (retryAfterSec + 1) * 1000));
      return this.request(url, options, attempt + 1);
    }

    return response;
  }

  async refreshAccessToken() {
    if (!this.hasRefreshGrant) return false;
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!res.ok) return false;
      const data = await res.json();
      if (data.access_token) {
        this.accessToken = data.access_token;
        if (data.refresh_token) this.refreshToken = data.refresh_token;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Publishes post using LinkedIn Posts API (POST /rest/posts)
   */
  async createPost({
    authorUrn = this.personUrn,
    commentary,
    mediaAssetUrns = [],
    format = 'TEXT_ONLY',
    articleUrl = null,
    articleTitle = null,
  }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'skipped',
        reason: 'Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN',
      };
    }

    const payload = {
      author: authorUrn,
      commentary,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    // Format Media Payload according to Posts API specs
    if (format === 'SINGLE_IMAGE' && mediaAssetUrns.length > 0) {
      payload.content = {
        media: {
          id: mediaAssetUrns[0],
          altText: articleTitle || 'WritOn Craft Thought',
        },
      };
    } else if (format === 'MULTI_IMAGE' && mediaAssetUrns.length >= 2) {
      payload.content = {
        multiImage: {
          images: mediaAssetUrns.slice(0, 20).map((urn) => ({
            id: urn,
            altText: articleTitle || 'WritOn Slide',
          })),
        },
      };
    } else if (format === 'DOCUMENT' && mediaAssetUrns.length > 0) {
      payload.content = {
        media: {
          id: mediaAssetUrns[0],
          title: articleTitle || 'WritOn Literary Reading Deck',
        },
      };
    } else if (format === 'VIDEO' && mediaAssetUrns.length > 0) {
      payload.content = {
        media: {
          id: mediaAssetUrns[0],
          title: articleTitle || 'WritOn Video',
        },
      };
    } else if (articleUrl) {
      payload.content = {
        article: {
          source: articleUrl,
          title: articleTitle || 'WritOn',
        },
      };
    }

    try {
      this.log.info?.('🚀 Dispatching to LinkedIn Posts API (POST /rest/posts)...');
      const response = await this.request('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const rawXRestliId = response.headers.get('x-restli-id') || response.headers.get('X-RestLi-Id');

      if (response.status === 201) {
        if (!rawXRestliId) {
          this.log.warn?.('⚠️ Received HTTP 201 Created but x-restli-id header was missing! Classifying as UNKNOWN.');
          return {
            success: false,
            outcome: 'UNKNOWN',
            httpStatus: 201,
            error: 'Missing x-restli-id response header on 201 Created',
          };
        }

        const postUrn = rawXRestliId.startsWith('urn:li:') ? rawXRestliId : `urn:li:share:${rawXRestliId}`;
        const liveUrl = `https://www.linkedin.com/feed/update/${postUrn}`;
        this.log.info?.(`✅ Successfully published to LinkedIn: ${postUrn}`);

        return {
          success: true,
          outcome: 'SUCCESS',
          httpStatus: 201,
          postUrn,
          rawXRestliId,
          liveUrl,
        };
      }

      // Explicit failure handling
      const errText = await response.text();
      let errJson = null;
      try { errJson = JSON.parse(errText); } catch {}

      return {
        success: false,
        outcome: 'EXPLICIT_FAIL',
        httpStatus: response.status,
        error: errJson?.message || `LinkedIn Posts API returned HTTP ${response.status}: ${errText}`,
        details: errJson || errText,
      };
    } catch (err) {
      this.log.error?.(`❌ Network or Protocol Error in LinkedInClient.createPost: ${err.message}`);
      return {
        success: false,
        outcome: err.code === 'AUTH_REQUIRES_REAUTH' ? 'EXPLICIT_FAIL' : 'UNKNOWN',
        error: err.message,
      };
    }
  }

  /**
   * Deletes a post using LinkedIn Posts API (DELETE /rest/posts/{encodedPostUrn})
   */
  async deletePost(postUrn) {
    if (!this.isConfigured()) {
      return { success: false, status: 'skipped', reason: 'Missing LinkedIn credentials' };
    }
    const cleanUrn = postUrn.trim();
    const encodedUrn = encodeURIComponent(cleanUrn);
    const url = `https://api.linkedin.com/rest/posts/${encodedUrn}`;

    try {
      this.log.info?.(`🗑️ Deleting post on LinkedIn: ${cleanUrn}`);
      const response = await this.request(url, { method: 'DELETE' });

      if (response.status === 204 || response.status === 200) {
        this.log.info?.(`✅ Successfully deleted post: ${cleanUrn}`);
        return { success: true, postUrn: cleanUrn, httpStatus: response.status };
      }

      const errText = await response.text();
      this.log.warn?.(`⚠️ Failed to delete post ${cleanUrn} (HTTP ${response.status}): ${errText}`);
      return { success: false, httpStatus: response.status, error: errText };
    } catch (err) {
      this.log.error?.(`❌ Error deleting post ${cleanUrn}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

