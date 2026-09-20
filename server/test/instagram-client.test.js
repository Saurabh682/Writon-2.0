import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InstagramClient,
  FacebookLoginProvider,
  InstagramLoginProvider,
} from '../src/services/instagram-client.js';

describe('InstagramClient Unit Tests (Meta Graph API v26.0)', () => {
  let client;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new InstagramClient({
      accessToken: 'mock_token_123',
      igUserId: '17841400000000001',
      apiVersion: 'v26.0',
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
  });

  it('correctly reports configuration status and reflects FacebookLoginProvider capabilities', () => {
    expect(client.isConfigured()).toBe(true);
    expect(client.apiVersion).toBe('v26.0');
    const caps = client.getCapabilities();
    expect(caps.feed_publish).toBe(true);
    expect(caps.carousel_publish).toBe(true);
    expect(caps.reel_publish).toBe(true);
    expect(caps.story_publish).toBe(true);
  });

  it('distinguishes InstagramLoginProvider capabilities (story disabled, no tagging)', () => {
    const igProvider = new InstagramLoginProvider({
      token: 'mock_ig_login_token',
      igUserId: '17841400000000002',
    });
    const igClient = new InstagramClient({
      authProvider: igProvider,
      igUserId: '17841400000000002',
    });
    expect(igClient.isConfigured()).toBe(true);
    const caps = igClient.getCapabilities();
    expect(caps.feed_publish).toBe(true);
    expect(caps.story_publish).toBe(false);
    expect(caps.user_tagging).toBe(false);
  });

  it('reads dynamic content publishing quota from Meta v26.0 endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            quota_usage: 12,
            config: {
              quota_total: 50,
              quota_duration: 86400,
            },
          },
        ],
      }),
    });

    const quota = await client.getPublishingQuota();
    expect(quota.quotaUsage).toBe(12);
    expect(quota.quotaTotal).toBe(50);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v26.0/17841400000000001/content_publishing_limit?access_token=mock_token_123&fields=config%2Cquota_usage'),
      expect.anything()
    );
  });

  it('creates single image container and polls until FINISHED', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'container_image_123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status_code: 'IN_PROGRESS' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status_code: 'FINISHED' }),
      });

    const containerId = await client.createContainer({
      imageUrl: 'https://writon.cc/assets/test.jpg',
      caption: 'Test Craft Truth',
    });
    expect(containerId).toBe('container_image_123');

    const pollResult = await client.pollContainerStatus(containerId, { maxAttempts: 3, intervalMs: 10 });
    expect(pollResult.status).toBe('FINISHED');
    expect(pollResult.containerId).toBe('container_image_123');
  });

  it('publishes container and returns igMediaId and permalink', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'media_987654321' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ permalink: 'https://www.instagram.com/p/C_12345/', shortcode: 'C_12345' }),
      });

    const result = await client.publishContainer('container_image_123');
    expect(result.success).toBe(true);
    expect(result.igMediaId).toBe('media_987654321');
    expect(result.permalink).toBe('https://www.instagram.com/p/C_12345/');
  });

  it('preserves NULL for unsupported fields in views-centric metric extraction', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        like_count: 85,
        views: 1200,
        // reach, saved, shares omitted by Meta for this format
      }),
    });

    const metrics = await client.fetchPublicationMetrics('media_987654321');
    expect(metrics.views).toBe(1200);
    expect(metrics.likes).toBe(85);
    expect(metrics.reach).toBeNull();
    expect(metrics.saved).toBeNull();
    expect(metrics.shares).toBeNull();
  });
});
