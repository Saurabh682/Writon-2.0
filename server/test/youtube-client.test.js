import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YouTubeClient } from '../src/services/youtube-client.js';

describe('YouTubeClient Unit Tests', () => {
  let client;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new YouTubeClient({
      accessToken: 'mock_youtube_access_token',
      clientId: 'mock_client_id',
      clientSecret: 'mock_client_secret',
      refreshToken: 'mock_refresh_token',
      channelId: 'UC1234567890',
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
  });

  it('correctly reports configuration and upload readiness', () => {
    expect(client.isConfigured()).toBe(true);
    expect(client.canUpload()).toBe(true);

    const emptyClient = new YouTubeClient({ accessToken: null, refreshToken: null, apiKey: null });
    expect(emptyClient.isConfigured()).toBe(false);
    expect(emptyClient.canUpload()).toBe(false);

    const readOnlyClient = new YouTubeClient({ apiKey: 'AIzaSyMockKey' });
    expect(readOnlyClient.isConfigured()).toBe(true);
    expect(readOnlyClient.canUpload()).toBe(false);
  });

  it('reuses existing access token when valid', async () => {
    globalThis.fetch = vi.fn();
    const token = await client.getAccessToken();
    expect(token).toBe('mock_youtube_access_token');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('refreshes token via Google OAuth token endpoint when expired', async () => {
    const refreshClient = new YouTubeClient({
      clientId: 'my_client_id',
      clientSecret: 'my_client_secret',
      refreshToken: 'my_refresh_token',
      log: { info: vi.fn(), warn: vi.fn() },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'newly_refreshed_youtube_token',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    });

    const token = await refreshClient.getAccessToken();
    expect(token).toBe('newly_refreshed_youtube_token');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('retries request on 401 Unauthorized after invalidating cached token', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('oauth2.googleapis.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ access_token: 'fresh_token_after_401', expires_in: 3600 }),
        });
      }
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          status: 401,
          ok: false,
          text: async () => 'Unauthorized',
          headers: new Headers(),
        });
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        json: async () => ({ items: [{ id: 'vid_123', statistics: { viewCount: '500' } }] }),
        headers: new Headers(),
      });
    });

    const metrics = await client.getVideoMetrics('vid_123');
    expect(metrics.views).toBe(500);
    expect(callCount).toBe(2);
  });

  it('handles 429 Too Many Requests by backing off and retrying', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          status: 429,
          ok: false,
          headers: new Headers({ 'retry-after': '0' }),
          text: async () => 'Rate limited',
        });
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        json: async () => ({ items: [{ id: 'vid_429', statistics: { viewCount: '10' } }] }),
        headers: new Headers(),
      });
    });

    const metrics = await client.getVideoMetrics('vid_429');
    expect(metrics.views).toBe(10);
    expect(callCount).toBe(2);
  });

  it('fetches video statistics and parses views, likes, and comments', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'abc123xyz',
            snippet: { title: 'Writing Prompt: The Carpenter' },
            statistics: {
              viewCount: '1420',
              likeCount: '98',
              commentCount: '14',
            },
          },
        ],
      }),
      headers: new Headers(),
    });

    const stats = await client.getVideoMetrics('abc123xyz');
    expect(stats.views).toBe(1420);
    expect(stats.likes).toBe(98);
    expect(stats.comments).toBe(14);
    expect(stats.title).toBe('Writing Prompt: The Carpenter');
  });

  it('searches videos for topic trend scouting', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        items: [
          {
            id: { videoId: 'search_vid_1' },
            snippet: {
              title: 'Top 5 Writing Prompts for Fiction',
              description: 'Explore literary beginnings...',
              channelTitle: 'Craft Writers',
              publishedAt: '2026-09-10T12:00:00Z',
            },
          },
        ],
      }),
      headers: new Headers(),
    });

    const results = await client.searchVideos({ query: 'creative writing', maxResults: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].videoId).toBe('search_vid_1');
    expect(results[0].title).toBe('Top 5 Writing Prompts for Fiction');
    expect(results[0].url).toBe('https://www.youtube.com/watch?v=search_vid_1');
  });

  it('normalizes uppercase and mixed-case hashtags to lowercase', () => {
    const input = 'Check out this #Shorts video for the #WritingCommunity and #WritOn!';
    const normalized = client._normalizeHashtags(input);
    expect(normalized).toBe('Check out this #shorts video for the #writingcommunity and #writon!');
  });

  it('updates video SEO metadata via GET then PUT snippet', async () => {
    let callIndex = 0;
    globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
      callIndex++;
      if (callIndex === 1) {
        // GET snippet
        expect(url).toContain('/videos?part=snippet&id=abc123xyz');
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => ({
            items: [
              {
                snippet: {
                  title: 'Old Title #shorts',
                  description: 'Old description',
                  tags: ['oldtag'],
                  categoryId: '27',
                },
              },
            ],
          }),
          headers: new Headers(),
        });
      } else {
        // PUT snippet
        expect(url).toContain('/videos?part=snippet');
        expect(opts.method).toBe('PUT');
        const body = JSON.parse(opts.body);
        expect(body.id).toBe('abc123xyz');
        expect(body.snippet.title).toBe('New High-CTR Title #shorts');
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => ({
            snippet: {
              title: body.snippet.title,
              description: body.snippet.description,
              tags: body.snippet.tags,
            },
          }),
          headers: new Headers(),
        });
      }
    });

    const res = await client.updateVideoSEO({
      videoId: 'abc123xyz',
      title: 'New High-CTR Title #shorts',
      description: 'Updated SEO description #writing',
      tags: ['shorts', 'writingtips'],
    });

    expect(res.success).toBe(true);
    expect(res.title).toBe('New High-CTR Title #shorts');
  });

  it('fetches traffic sources via YouTube Analytics reports', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        rows: [
          ['SHORTS', 420, 35.5],
          ['YT_SEARCH', 85, 12.0],
        ],
      }),
      headers: new Headers(),
    });

    const report = await client.getTrafficSources({ days: 14 });
    expect(report.sources).toHaveLength(2);
    expect(report.sources[0].sourceType).toBe('SHORTS');
    expect(report.sources[0].views).toBe(420);
  });

  it('fetches video retention analytics via YouTube Analytics reports', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        rows: [[510, 42.5, 13.8, 98.6]],
      }),
      headers: new Headers(),
    });

    const retention = await client.getVideoRetentionAnalytics({ videoId: 'abc123xyz' });
    expect(retention.videoId).toBe('abc123xyz');
    expect(retention.views).toBe(510);
    expect(retention.averageViewDurationSec).toBe(13.8);
    expect(retention.averageViewPercentage).toBe(98.6);
  });
});


