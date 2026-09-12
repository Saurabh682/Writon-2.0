import { describe, it, expect, vi } from 'vitest';
import { executeScheduledSlot } from '../src/bot-engine/master-scheduler.js';
import { buildServer } from '../src/server.js';

describe('Master Scheduler Autonomous Guarantees & Topic Pivot', () => {
  it('pivots topic and rewrites a new story in target category when trend brief fails or is unapproved', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };

    const slot = {
      id: 'dawn_digest',
      time: '07:00',
      type: 'editorial',
      description: 'Morning Longform Essay'
    };

    const mockRunPulse = vi.fn().mockResolvedValue({
      postId: 'test-story-pivot-123',
      title: 'The Resonance of Quiet Streets',
      category: 'Essays'
    });

    const result = await executeScheduledSlot(mockPool, slot, {
      getApprovedBrief: vi.fn().mockResolvedValue(null),
      discoverTrends: vi.fn().mockResolvedValue({
        curatedStoryAngles: [
          {
            authorPenName: 'aarav_tech',
            editorialAngle: 'Test angle',
            researchBrief: {
              topic: 'Unapproved trend',
              trend_score: 40
            }
          }
        ]
      }),
      queueBrief: vi.fn().mockResolvedValue({
        id: 'brief-unapproved-1',
        status: 'pending_review' // not approved
      }),
      runPulse: mockRunPulse
    });

    expect(result.action).toBe('published_story');
    expect(result.fallback).toBe(true);
    expect(result.topicPivoted).toBe(true);
    expect(result.category).toBe('Essays');
    expect(result.postId).toBe('test-story-pivot-123');
    expect(mockRunPulse).toHaveBeenCalledWith(mockPool, expect.objectContaining({
      category: 'Essays',
      forcePublication: true,
      automaticPublication: true
    }));
  });

  it('generates and publishes structured review in review slots when autoPublishReviews is true', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };

    const slot = {
      id: 'morning_tech',
      time: '10:30',
      type: 'review_mobility',
      description: 'Tech & Mobility Review'
    };

    const result = await executeScheduledSlot(mockPool, slot, {
      getApprovedBrief: vi.fn().mockResolvedValue(null),
      researchTopic: vi.fn().mockResolvedValue(null),
      queueBrief: vi.fn().mockResolvedValue({ id: 'review-brief-1', status: 'pending_review' }),
      markBriefPublished: vi.fn().mockResolvedValue({}),
      createReview: vi.fn().mockReturnValue({
        title: 'Benchmark Assessment',
        summary: 'A benchmark summary',
        content: 'Review content'
      }),
      publishBatch: vi.fn().mockResolvedValue({
        stories: [{ id: 'published-review-post-999' }]
      }),
      autoPublishReviews: true
    });

    expect(result.action).toBe('published_review');
    expect(result.postId).toBe('published-review-post-999');
    expect(result.reviewer).toBeTruthy();
  });

  it('exposes POST /api/v1/spark/scheduler/tick with bot secret authentication', async () => {
    const originalBotSecret = process.env.BOT_INGEST_SECRET;
    process.env.BOT_INGEST_SECRET = 'test-bot-secret-xyz';

    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };

    const app = await buildServer({
      runtimeConfig: {
        databaseUrl: 'postgres://localhost/test',
        port: 0,
        corsOrigins: [],
        sparkAutomationEnabled: false,
        timersDisabled: true,
        dailyDigestEnabled: false,
        pushDeliveryEnabled: false,
        reviewPromptEnabled: false,
        feedBehaviorRolloutPercent: 0,
        followedWriterNotificationsEnabled: false
      },
      pool: mockPool
    });

    try {
      // 1. Unauthorized request should return 401
      const unauthRes = await app.inject({
        method: 'POST',
        url: '/api/v1/spark/scheduler/tick'
      });
      expect(unauthRes.statusCode).toBe(401);

      // 2. Request with valid X-Bot-Secret should return 200
      const authRes = await app.inject({
        method: 'POST',
        url: '/api/v1/spark/scheduler/tick',
        headers: {
          'x-bot-secret': 'test-bot-secret-xyz'
        }
      });
      expect(authRes.statusCode).toBe(200);
      const json = authRes.json();
      expect(json.success).toBe(true);
      expect(json.outcome).toBeDefined();
    } finally {
      await app.close();
      if (originalBotSecret === undefined) {
        delete process.env.BOT_INGEST_SECRET;
      } else {
        process.env.BOT_INGEST_SECRET = originalBotSecret;
      }
    }
  });
});
