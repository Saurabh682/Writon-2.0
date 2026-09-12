import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedditClient } from '../src/services/reddit-client.js';

describe('RedditClient Unit Tests', () => {
  let client;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new RedditClient({
      clientId: 'mock_client_id',
      clientSecret: 'mock_client_secret',
      username: 'mock_user',
      password: 'mock_pass',
      userAgent: 'web:writon-publisher:v2.0.0 (by /u/mock_user)',
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
  });

  it('correctly reports configuration status', () => {
    expect(client.isConfigured()).toBe(true);

    const emptyClient = new RedditClient({ clientId: null });
    expect(emptyClient.isConfigured()).toBe(false);
  });

  it('obtains and caches access token', async () => {
    const mockToken = 'test_access_token_123';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        'x-ratelimit-used': '1',
        'x-ratelimit-remaining': '599',
        'x-ratelimit-reset': '600',
      }),
      json: async () => ({
        access_token: mockToken,
        token_type: 'bearer',
        expires_in: 3600,
        scope: '*',
      }),
    });

    const token1 = await client.getAccessToken();
    expect(token1).toBe(mockToken);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Second call should return cached token without invoking fetch again
    const token2 = await client.getAccessToken();
    expect(token2).toBe(mockToken);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('appends raw_json=1 and correct User-Agent on requests', async () => {
    client.token = 'cached_bearer_token';
    client.tokenExpiresAt = Date.now() + 100000;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({
        name: 't2_mock_user',
        id: 'mock_id',
      }),
    });

    await client.request('/api/v1/me');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [callUrl, callOptions] = globalThis.fetch.mock.calls[0];

    expect(callUrl).toContain('raw_json=1');
    expect(callUrl).toContain('https://oauth.reddit.com/api/v1/me');
    expect(callOptions.headers['User-Agent']).toBe('web:writon-publisher:v2.0.0 (by /u/mock_user)');
    expect(callOptions.headers.Authorization).toBe('Bearer cached_bearer_token');
  });

  it('submits a post and resolves response metadata', async () => {
    client.token = 'cached_bearer_token';
    client.tokenExpiresAt = Date.now() + 100000;

    vi.spyOn(client, 'getPostRequirements').mockResolvedValue({ is_flair_required: false });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({
        json: {
          errors: [],
          data: {
            id: '15bfi0',
            name: 't3_15bfi0',
            url: 'https://www.reddit.com/r/writon/comments/15bfi0/craft_test/',
          },
        },
      }),
    });

    const outcome = await client.submitPost({
      subreddit: 'writon',
      title: 'Crafting Prose in a Distracted World',
      text: 'Words should breathe.',
    });

    expect(outcome.success).toBe(true);
    expect(outcome.name).toBe('t3_15bfi0');
    expect(outcome.url).toContain('/r/writon/comments/15bfi0/');
  });

  it('retrieves post metrics correctly', async () => {
    client.token = 'cached_bearer_token';
    client.tokenExpiresAt = Date.now() + 100000;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({
        data: {
          children: [
            {
              data: {
                id: '15bfi0',
                name: 't3_15bfi0',
                title: 'Crafting Prose',
                score: 42,
                ups: 42,
                downs: 0,
                upvote_ratio: 0.98,
                num_comments: 7,
                view_count: 1250,
                permalink: '/r/writon/comments/15bfi0/crafting_prose/',
                subreddit: 'writon',
              },
            },
          ],
        },
      }),
    });

    const metrics = await client.getPostMetrics('t3_15bfi0');
    expect(metrics).not.toBeNull();
    expect(metrics.fullname).toBe('t3_15bfi0');
    expect(metrics.score).toBe(42);
    expect(metrics.upvoteRatio).toBe(0.98);
    expect(metrics.numComments).toBe(7);
    expect(metrics.viewCount).toBe(1250);
  });

  it('retries once on 401 with refreshed token', async () => {
    client.token = 'expired_bearer_token';
    client.tokenExpiresAt = Date.now() + 100000;

    let calls = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url) => {
      calls++;
      if (url.toString().includes('access_token')) {
        return {
          ok: true,
          headers: new Headers(),
          json: async () => ({
            access_token: 'fresh_bearer_token',
            expires_in: 3600,
          }),
        };
      }

      if (calls === 1) {
        return {
          status: 401,
          ok: false,
          headers: new Headers(),
          text: async () => 'Unauthorized',
        };
      }

      return {
        status: 200,
        ok: true,
        headers: new Headers(),
        json: async () => ({ result: 'success_with_fresh_token' }),
      };
    });

    const res = await client.request('/api/v1/me');
    expect(res).toEqual({ result: 'success_with_fresh_token' });
    expect(client.token).toBe('fresh_bearer_token');
  });

  it('throws categorized error with status 401 when 401 persists after one retry', async () => {
    client.token = 'expired_bearer_token';
    client.tokenExpiresAt = Date.now() + 100000;

    globalThis.fetch = vi.fn().mockImplementation(async (url) => {
      if (url.toString().includes('access_token')) {
        return {
          ok: true,
          headers: new Headers(),
          json: async () => ({
            access_token: 'new_bearer_token',
            expires_in: 3600,
          }),
        };
      }
      return {
        status: 401,
        ok: false,
        headers: new Headers(),
        text: async () => 'Unauthorized',
      };
    });

    await expect(client.request('/api/v1/me')).rejects.toMatchObject({
      status: 401,
      path: '/api/v1/me',
    });
    const meCalls = globalThis.fetch.mock.calls.filter(([url]) => url.toString().includes('/api/v1/me'));
    expect(meCalls.length).toBe(2);
  });

  it('throws categorized error with status and path on HTTP failure', async () => {
    client.token = 'cached_bearer_token';
    client.tokenExpiresAt = Date.now() + 100000;

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
      headers: new Headers(),
      text: async () => 'Forbidden: Subreddit is private',
    });

    await expect(client.request('/api/v1/private_sub/about')).rejects.toMatchObject({
      status: 403,
      path: '/api/v1/private_sub/about',
    });
  });

  it('strips twitter-style hashtags from post body before submission', async () => {
    client.token = 'cached_bearer_token';
    client.tokenExpiresAt = Date.now() + 100000;

    vi.spyOn(client, 'getPostRequirements').mockResolvedValue({ is_flair_required: false });

    let requestBody = null;
    globalThis.fetch = vi.fn().mockImplementation(async (url, opts) => {
      requestBody = opts.body;
      return {
        ok: true,
        headers: new Headers(),
        json: async () => ({
          json: {
            errors: [],
            data: { id: 'test123', name: 't3_test123', url: 'https://reddit.com/r/writon/test123' },
          },
        }),
      };
    });

    await client.submitPost({
      subreddit: 'writon',
      title: 'Craft Essay',
      text: 'Good writing is rewriting. #writing #creators #amwriting\n\nRead more at writon.',
    });

    const params = new URLSearchParams(requestBody);
    const submittedText = params.get('text');
    expect(submittedText).not.toContain('#writing');
    expect(submittedText).not.toContain('#creators');
    expect(submittedText).not.toContain('#amwriting');
    expect(submittedText).toContain('Good writing is rewriting.');
  });
});
