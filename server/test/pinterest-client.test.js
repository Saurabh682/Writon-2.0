import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PinterestClient } from '../src/services/pinterest-client.js';

describe('PinterestClient Unit Tests', () => {
  let client;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new PinterestClient({
      accessToken: 'mock_access_token_direct',
      defaultBoardId: '1234567890',
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
  });

  it('correctly reports configuration status', () => {
    expect(client.isConfigured()).toBe(true);

    const emptyClient = new PinterestClient({ accessToken: null, refreshToken: null });
    expect(emptyClient.isConfigured()).toBe(false);

    const refreshClient = new PinterestClient({
      refreshToken: 'mock_refresh',
      appId: 'mock_app_id',
      appSecret: 'mock_app_secret',
    });
    expect(refreshClient.isConfigured()).toBe(true);
  });

  it('reuses direct access token without invoking OAuth endpoint', async () => {
    globalThis.fetch = vi.fn();
    const token = await client.getAccessToken();
    expect(token).toBe('mock_access_token_direct');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('exchanges refresh token and caches the newly acquired access token', async () => {
    const oauthClient = new PinterestClient({
      refreshToken: 'mock_refresh_token',
      appId: 'mock_app_123',
      appSecret: 'mock_secret_456',
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '999',
        'x-ratelimit-reset': '60',
      }),
      json: async () => ({
        access_token: 'new_exchanged_access_token',
        token_type: 'bearer',
        expires_in: 3600,
        scope: 'boards:read,boards:write,pins:read,pins:write',
      }),
    });

    const token1 = await oauthClient.getAccessToken();
    expect(token1).toBe('new_exchanged_access_token');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Second call should return cached token without invoking fetch again
    const token2 = await oauthClient.getAccessToken();
    expect(token2).toBe('new_exchanged_access_token');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('executes requests with Authorization Bearer header', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({
        username: 'writon_socialapp',
        account_type: 'BUSINESS',
      }),
    });

    const profile = await client.getMe();
    expect(profile.username).toBe('writon_socialapp');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const [callUrl, callOptions] = globalThis.fetch.mock.calls[0];
    expect(callUrl).toBe('https://api.pinterest.com/v5/user_account');
    expect(callOptions.headers.Authorization).toBe('Bearer mock_access_token_direct');
    expect(callOptions.headers['Content-Type']).toBe('application/json');
  });

  it('handles 401 Unauthorized with token refresh and single retry', async () => {
    const oauthClient = new PinterestClient({
      refreshToken: 'mock_refresh_token',
      appId: 'mock_app_123',
      appSecret: 'mock_secret_456',
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    let tokenCallCount = 0;
    let endpointCallCount = 0;

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/oauth/token')) {
        tokenCallCount++;
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: async () => ({
            access_token: `refreshed_token_${tokenCallCount}`,
            expires_in: 3600,
          }),
        });
      }

      endpointCallCount++;
      if (endpointCallCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized token expired',
          headers: new Headers(),
        });
      }

      return Promise.resolve({
        ok: true,
        headers: new Headers(),
        json: async () => ({ id: 'board_999', name: 'WritOn Craft' }),
      });
    });

    const board = await oauthClient.getBoard('board_999');
    expect(board.name).toBe('WritOn Craft');
    expect(tokenCallCount).toBe(2); // 1st initial token, 2nd after 401
    expect(endpointCallCount).toBe(2); // failed once, then succeeded
  });

  it('backs off and retries upon encountering HTTP 429 Too Many Requests', async () => {
    let attempts = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts === 1) {
        return Promise.resolve({
          status: 429,
          headers: new Headers({ 'retry-after': '0' }),
          text: async () => 'Rate limited',
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'x-ratelimit-remaining': '950' }),
        json: async () => ({ id: 'pin_123', title: 'Pacing in Fiction' }),
      });
    });

    const pin = await client.getPin('pin_123');
    expect(pin.title).toBe('Pacing in Fiction');
    expect(attempts).toBe(2);
  });

  it('creates Pin with image_url and enforces length ceilings', async () => {
    let capturedBody = null;

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      capturedBody = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          id: 'pin_created_456',
          title: capturedBody.title,
          link: capturedBody.link,
        }),
      });
    });

    const longTitle = 'A'.repeat(150); // should be capped at 100
    const longDesc = 'B'.repeat(900); // should be capped at 800

    const outcome = await client.createPin({
      boardId: 'board_123',
      title: longTitle,
      description: longDesc,
      imageUrl: 'https://writon.cc/assets/card1.png',
      link: 'https://writon.cc/go/day1',
    });

    expect(outcome.success).toBe(true);
    expect(outcome.id).toBe('pin_created_456');
    expect(outcome.url).toBe('https://www.pinterest.com/pin/pin_created_456/');
    expect(capturedBody.title.length).toBe(100);
    expect(capturedBody.description.length).toBe(800);
    expect(capturedBody.media_source.source_type).toBe('image_url');
    expect(capturedBody.media_source.url).toBe('https://writon.cc/assets/card1.png');
  });

  it('creates Pin with imageBuffer converting to image_base64', async () => {
    let capturedBody = null;

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      capturedBody = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          id: 'pin_base64_789',
          title: capturedBody.title,
        }),
      });
    });

    const dummyBuffer = Buffer.from('fake_image_content');
    const outcome = await client.createPin({
      boardId: 'board_123',
      title: 'Craft Truth: Begin in the Middle',
      imageBuffer: dummyBuffer,
    });

    expect(outcome.success).toBe(true);
    expect(outcome.id).toBe('pin_base64_789');
    expect(capturedBody.media_source.source_type).toBe('image_base64');
    expect(capturedBody.media_source.content_type).toBe('image/png');
    expect(capturedBody.media_source.data).toBe(dummyBuffer.toString('base64'));
  });

  it('categorizes HTTP errors with status and endpoint path', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Board not found',
      headers: new Headers(),
    });

    await expect(client.getBoard('non_existent')).rejects.toMatchObject({
      status: 404,
      path: '/boards/non_existent',
    });
  });

  it('retrieves and parses Pin analytics metrics', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      json: async () => ({
        all: {
          IMPRESSION: 420,
          SAVE: 38,
          PIN_CLICK: 15,
          OUTBOUND_CLICK: 8,
        },
      }),
    });

    const metrics = await client.getPinAnalytics('pin_456');
    expect(metrics.impressions).toBe(420);
    expect(metrics.saves).toBe(38);
    expect(metrics.pinClicks).toBe(15);
    expect(metrics.outboundClicks).toBe(8);
  });
});
