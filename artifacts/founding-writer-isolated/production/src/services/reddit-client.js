/**
 * Core Reddit API Client & Automation Service for WritOn
 * Implements:
 * - OAuth2 password-grant token authentication with auto-refresh caching
 * - Strict User-Agent header compliance
 * - X-Ratelimit-* header tracking & exponential backoff on HTTP 429
 * - Pre-flight subreddit requirements & flair checking
 * - Submission posting (POST /api/submit)
 * - Metric tracking (GET /api/info?id=t3_...)
 */

export class RedditClient {
  constructor({
    clientId = process.env.REDDIT_CLIENT_ID,
    clientSecret = process.env.REDDIT_CLIENT_SECRET,
    username = process.env.REDDIT_USERNAME,
    password = process.env.REDDIT_PASSWORD,
    userAgent = process.env.REDDIT_USER_AGENT,
    log = console,
  } = {}) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.username = username;
    this.password = password;
    this.userAgent = userAgent || `web:writon-publisher:v2.0.0 (by /u/${username || 'writon_official'})`;
    this.log = log;

    this.token = null;
    this.tokenExpiresAt = 0;
    this.rateLimit = {
      used: 0,
      remaining: 600,
      resetSeconds: 600,
      lastUpdated: 0,
    };
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret && this.username && this.password);
  }

  /**
   * Updates internal rate limit tracking from Reddit response headers.
   */
  _updateRateLimits(headers) {
    const used = headers.get('x-ratelimit-used');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');

    if (remaining !== null) {
      this.rateLimit.used = parseFloat(used) || 0;
      this.rateLimit.remaining = parseFloat(remaining) || 0;
      this.rateLimit.resetSeconds = parseInt(reset, 10) || 60;
      this.rateLimit.lastUpdated = Date.now();
    }
  }

  /**
   * Acquires or reuses an active OAuth2 Bearer token.
   */
  async getAccessToken() {
    if (!this.isConfigured()) {
      throw new Error('RedditClient is missing required credentials (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD)');
    }

    const now = Date.now();
    if (this.token && now < this.tokenExpiresAt - 60000) {
      return this.token;
    }

    const authHeader = `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`;
    const body = new URLSearchParams({
      grant_type: 'password',
      username: this.username,
      password: this.password,
    });

    this.log.info?.('🔑 Acquiring Reddit OAuth2 token...');
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    this._updateRateLimits(res.headers);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to acquire Reddit access token (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(`Reddit auth error: ${data.error} - ${data.message || ''}`);
    }

    this.token = data.access_token;
    this.tokenExpiresAt = now + ((data.expires_in || 3600) * 1000);
    return this.token;
  }

  /**
   * Executes an authorized request to https://oauth.reddit.com with automatic backoff.
   */
  async request(path, options = {}) {
    const token = await this.getAccessToken();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`https://oauth.reddit.com${cleanPath}`);

    // Ensure raw_json=1 is always appended to avoid HTML entity encoding
    if (!url.searchParams.has('raw_json')) {
      url.searchParams.set('raw_json', '1');
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'User-Agent': this.userAgent,
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

      if (res.status === 429) {
        const retryAfterSec = parseInt(res.headers.get('retry-after') || this.rateLimit.resetSeconds || 5, 10);
        this.log.warn?.(`⚠️ Reddit 429 Rate Limit hit. Backing off for ${retryAfterSec}s (attempt ${attempts}/${maxAttempts})...`);
        await new Promise((r) => setTimeout(r, (retryAfterSec + 1) * 1000));
        continue;
      }

      if (res.status === 401 && !retried401) {
        retried401 = true;
        this.token = null;
        this.tokenExpiresAt = 0;
        headers.Authorization = `Bearer ${await this.getAccessToken()}`;
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        const err = new Error(`Reddit API error ${res.status} on ${cleanPath}: ${errText}`);
        err.status = res.status;
        err.path = cleanPath;
        throw err;
      }

      return res.json();
    }

    throw new Error(`Reddit API request failed after ${maxAttempts} attempts due to rate limiting.`);
  }

  /**
   * Fetches user profile identity (/api/v1/me).
   */
  async getMe() {
    return this.request('/api/v1/me');
  }

  /**
   * Retrieves subreddit post requirements (flair requirements, title length, blacklists).
   */
  async getPostRequirements(subreddit) {
    try {
      return await this.request(`/api/v1/${subreddit}/post_requirements`);
    } catch (err) {
      this.log.warn?.(`Could not fetch post requirements for r/${subreddit}: ${err.message}`);
      return null;
    }
  }

  /**
   * Retrieves available link flairs for a subreddit.
   */
  async getLinkFlairs(subreddit) {
    try {
      return await this.request(`/r/${subreddit}/api/link_flair_v2`);
    } catch (err) {
      this.log.warn?.(`Could not fetch link flairs for r/${subreddit}: ${err.message}`);
      return [];
    }
  }

  /**
   * Submits a link or self-post to a subreddit.
   */
  async submitPost({
    subreddit,
    title,
    text = '',
    url = null,
    kind = 'self', // 'self' | 'link'
    flairId = null,
    flairText = null,
    nsfw = false,
    spoiler = false,
    sendreplies = true,
  }) {
    if (!subreddit) throw new Error('Subreddit name is required');
    if (!title) throw new Error('Post title is required');

    const cleanSr = subreddit.replace(/^r\//, '');

    // Pre-flight check: if flairs required and none given, auto-resolve default
    let resolvedFlairId = flairId;
    let resolvedFlairText = flairText;

    const requirements = await this.getPostRequirements(cleanSr);
    if (requirements?.is_flair_required && !resolvedFlairId) {
      const flairs = await this.getLinkFlairs(cleanSr);
      if (flairs && flairs.length > 0) {
        resolvedFlairId = flairs[0].id;
        resolvedFlairText = flairs[0].text;
        this.log.info?.(`🏷️ Auto-assigned mandatory flair: "${resolvedFlairText}" (${resolvedFlairId})`);
      }
    }

    const formParams = new URLSearchParams({
      api_type: 'json',
      sr: cleanSr,
      title: title.slice(0, 300),
      kind,
      resubmit: 'true',
      sendreplies: String(sendreplies),
      nsfw: String(nsfw),
      spoiler: String(spoiler),
    });

    if (kind === 'link' && url) {
      formParams.set('url', url);
    } else if (text) {
      // Strip Twitter-style hashtags — Reddit doesn't use them
      const cleanText = text.replace(/#\w+/g, '').replace(/\s{2,}/g, ' ').trim();
      formParams.set('text', cleanText);
    }

    if (resolvedFlairId) formParams.set('flair_id', resolvedFlairId);
    if (resolvedFlairText) formParams.set('flair_text', resolvedFlairText);

    this.log.info?.(`🚀 Submitting post to r/${cleanSr}: "${title.slice(0, 60)}..."`);
    const data = await this.request('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
    });

    const json = data?.json || {};
    if (json.errors && json.errors.length > 0) {
      const formattedErrors = json.errors.map(([type, msg, field]) => `${type}: ${msg} (${field || 'general'})`).join('; ');
      throw new Error(`Reddit submission error: ${formattedErrors}`);
    }

    const postData = json.data || {};
    return {
      success: true,
      id: postData.id,
      name: postData.name, // e.g. t3_15bfi0
      url: postData.url,
      data: postData,
    };
  }

  /**
   * Retrieves live metrics (score, upvote_ratio, num_comments) for one or more posts.
   * @param {string|string[]} fullnames e.g. 't3_1abcde' or ['t3_1abcde', 't3_2bcdef']
   */
  async getPostMetrics(fullnames) {
    const ids = Array.isArray(fullnames) ? fullnames.join(',') : fullnames;
    const data = await this.request(`/api/info?id=${encodeURIComponent(ids)}`);
    const children = data?.data?.children || [];

    const metricsMap = {};
    for (const item of children) {
      const post = item.data;
      if (!post) continue;
      metricsMap[post.name] = {
        fullname: post.name,
        id: post.id,
        title: post.title,
        score: post.score || 0,
        ups: post.ups || 0,
        downs: post.downs || 0,
        upvoteRatio: post.upvote_ratio || 1.0,
        numComments: post.num_comments || 0,
        viewCount: post.view_count || null,
        permalink: `https://www.reddit.com${post.permalink}`,
        subreddit: post.subreddit,
        createdUtc: post.created_utc,
      };
    }

    return Array.isArray(fullnames) ? metricsMap : (metricsMap[ids] || null);
  }

  /**
   * Scans a subreddit for top hot or rising community topics.
   */
  async getSubredditFeed(subreddit, { sort = 'hot', limit = 25 } = {}) {
    const cleanSr = subreddit.replace(/^r\//, '');
    const data = await this.request(`/r/${cleanSr}/${sort}?limit=${limit}`);
    const items = data?.data?.children || [];
    return items.map((child) => ({
      id: child.data.id,
      fullname: child.data.name,
      title: child.data.title,
      selftext: child.data.selftext,
      score: child.data.score,
      numComments: child.data.num_comments,
      author: child.data.author,
      url: child.data.url,
      permalink: `https://www.reddit.com${child.data.permalink}`,
      createdUtc: child.data.created_utc,
    }));
  }
}
