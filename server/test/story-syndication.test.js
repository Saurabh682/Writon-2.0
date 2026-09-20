import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as socialPoster from '../src/services/social-poster.js';
import * as cardGen from '../src/services/social-card-generator.js';
import { syndicatePublishedStory } from '../src/services/story-syndication-service.js';

describe('Story Syndication Pipeline (including Pinterest Integration)', () => {
  let mockPool;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockPool = {
      query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    };

    vi.spyOn(cardGen, 'renderStorySocialCard').mockResolvedValue({
      filePath: '/tmp/cards/test_card.png',
      width: 1080,
      height: 1350,
    });

    vi.spyOn(socialPoster, 'postToTelegram').mockResolvedValue({ success: true, status: 'skipped' });
    vi.spyOn(socialPoster, 'dispatchToWebhook').mockResolvedValue({ success: true, status: 'skipped' });
    vi.spyOn(socialPoster, 'postToX').mockResolvedValue({ success: true, status: 'skipped' });
    vi.spyOn(socialPoster, 'postToThreads').mockResolvedValue({ success: true, status: 'skipped' });
  });

  it('skips Pinterest dispatch by default because stories are handled by the RSS feed', async () => {
    const postToPinterestSpy = vi.spyOn(socialPoster, 'postToPinterest');

    const story = {
      id: 'story-123',
      title: 'A Memory of Monsoon Rain',
      summary: 'An old teapot on the balcony and distant thunder.',
      content: 'Sample story body content.',
      slug: 'a-memory-of-monsoon-rain',
      category: 'Essays',
      readingTimeMin: 4,
      authorFullName: 'Aarav Sharma',
      authorPenName: 'aarav_writes',
    };

    const result = await syndicatePublishedStory(mockPool, story, {
      config: {
        PINTEREST_ACCESS_TOKEN: 'mock_pin_token',
        PINTEREST_DEFAULT_BOARD_ID: 'board_12345',
      },
    });

    expect(result.success).toBe(true);
    expect(postToPinterestSpy).not.toHaveBeenCalled();
    expect(result.outcomes.pinterest.status).toBe('skipped');
    expect(result.outcomes.pinterest.reason).toContain('RSS feed');
  });

  it('safely skips Pinterest dispatch when credentials are not configured even if forced', async () => {
    const postToPinterestSpy = vi.spyOn(socialPoster, 'postToPinterest');

    const story = {
      id: 'story-456',
      title: 'The Silent Clock',
      summary: 'Time ticking in the empty corridor.',
      content: 'Sample story body content.',
      slug: 'the-silent-clock',
      category: 'Poetry',
      readingTimeMin: 2,
      authorFullName: 'Meera Rao',
      authorPenName: 'meera',
    };

    const originalToken = process.env.PINTEREST_ACCESS_TOKEN;
    delete process.env.PINTEREST_ACCESS_TOKEN;

    try {
      const result = await syndicatePublishedStory(mockPool, story, { forcePinterest: true, config: {} });
      expect(result.success).toBe(true);
      expect(postToPinterestSpy).not.toHaveBeenCalled();
      expect(result.outcomes.pinterest.status).toBe('skipped');
    } finally {
      if (originalToken) process.env.PINTEREST_ACCESS_TOKEN = originalToken;
    }
  });

  it('throttles Pinterest dispatch if a pin was published under 15 minutes ago (when forcePinterest is not set or pacing checked)', async () => {
    const postToPinterestSpy = vi.spyOn(socialPoster, 'postToPinterest');

    mockPool.query = vi.fn().mockImplementation((sql) => {
      if (sql.includes('public.social_syndication_logs') && sql.includes("platform = 'pinterest'")) {
        return Promise.resolve({
          rowCount: 1,
          rows: [{ updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() }],
        });
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });

    const story = {
      id: 'story-789',
      title: 'Second Story in Five Minutes',
      summary: 'Testing anti-spam pacing guard.',
      content: 'Sample story body content.',
      slug: 'second-story-in-five-minutes',
      category: 'Short Stories',
      readingTimeMin: 3,
      authorFullName: 'Rohan Sen',
      authorPenName: 'rohan',
    };

    const result = await syndicatePublishedStory(mockPool, story, {
      config: {
        PINTEREST_ACCESS_TOKEN: 'mock_pin_token',
        PINTEREST_DEFAULT_BOARD_ID: 'board_12345',
      },
    });

    expect(result.success).toBe(true);
    expect(postToPinterestSpy).not.toHaveBeenCalled();
    expect(result.outcomes.pinterest.status).toBe('skipped');
  });

  it('dispatches to Pinterest when forcePinterest option is specified and credentials exist', async () => {
    const postToPinterestSpy = vi.spyOn(socialPoster, 'postToPinterest').mockResolvedValue({
      success: true,
      status: 'published',
      postId: 'pin_forced_123',
    });

    mockPool.query = vi.fn().mockImplementation((sql) => {
      if (sql.includes('public.social_syndication_logs') && sql.includes("platform = 'pinterest'")) {
        return Promise.resolve({
          rowCount: 1,
          rows: [{ updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() }],
        });
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });

    const story = {
      id: 'story-forced',
      title: 'Priority Urgent Story',
      summary: 'Testing forcePinterest bypass.',
      content: 'Sample story body content.',
      slug: 'priority-urgent-story',
      category: 'Essays',
      readingTimeMin: 5,
      authorFullName: 'Admin',
      authorPenName: 'admin',
    };

    const result = await syndicatePublishedStory(mockPool, story, {
      forcePinterest: true,
      config: {
        PINTEREST_ACCESS_TOKEN: 'mock_pin_token',
        PINTEREST_DEFAULT_BOARD_ID: 'board_12345',
      },
    });

    expect(result.success).toBe(true);
    expect(postToPinterestSpy).toHaveBeenCalledTimes(1);
    expect(result.outcomes.pinterest.status).toBe('published');
  });

  it('tags trending keywords from Editorial Brain as lowercase hashtags in social syndication copy', async () => {
    const story = {
      id: 'story-seo-tags-1',
      title: 'NVMe Queue Depth and WAL Flushes',
      summary: 'Observing write stalls on high-throughput PostgreSQL workloads.',
      content: 'Sample story body on disk queues.',
      slug: 'nvme-queue-depth-and-wal-flushes',
      category: 'Tech',
      keywords: ['NVMe Storage', 'PostgreSQL WAL', 'Database Benchmarks'],
      readingTimeMin: 4,
      authorFullName: 'Aarav Mehta',
      authorPenName: 'aarav_tech',
    };

    const result = await syndicatePublishedStory(mockPool, story, {
      config: {
        PINTEREST_ACCESS_TOKEN: 'mock_pin_token',
        PINTEREST_DEFAULT_BOARD_ID: 'board_12345',
      },
      forcePinterest: true,
    });

    expect(result.success).toBe(true);
    // Ensure all keywords are tagged as lowercase hashtags in the social copy
    expect(result.copy.allHashtags).toContain('#nvmestorage');
    expect(result.copy.allHashtags).toContain('#postgresqlwal');
    expect(result.copy.allHashtags).toContain('#databasebenchmarks');
    expect(result.copy.plainText).toContain('#nvmestorage');
    expect(result.copy.htmlCaption).toContain('#nvmestorage');
  });
});

