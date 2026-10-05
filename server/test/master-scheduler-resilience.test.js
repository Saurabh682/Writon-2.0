import { describe, it, expect, vi } from 'vitest';
import { executeScheduledSlot, runMasterSchedulerTick } from '../src/bot-engine/master-scheduler.js';
import { buildServer } from '../src/server.js';
import { REVIEW_PERSONAS } from '../src/bot-engine/review-personas.js';

describe('Master Scheduler Autonomous Guarantees & Topic Pivot', () => {
  it('skips slot cleanly without forcing fallback pulse when trend brief fails or is unapproved', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };

    const slot = {
      id: 'dawn_digest',
      time: '07:00',
      type: 'editorial',
      description: 'Morning Longform Essay'
    };

    const mockRunPulse = vi.fn();

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

    expect(result.action).toBe('slot_skipped');
    expect(result.decision).toBe('SKIP');
    expect(result.skipped).toBe(true);
    expect(result.category).toBe('Essays');
    expect(mockRunPulse).not.toHaveBeenCalled();
  });

  it('publishes scheduled reviews after automated checks without human approval', async () => {
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
      queueBrief: vi.fn().mockResolvedValue({ id: 'review-brief-1', status: 'approved' }),
      claimBrief: vi.fn().mockResolvedValue({ id: 'review-brief-1' }),
      holdBrief: vi.fn().mockResolvedValue({}),
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

describe('scheduler delivery outcomes', () => {
  it.each([
    [{ postId: 'post-1' }, 'published'],
    [{ action: 'held_for_review' }, 'held'],
    [{ action: 'review_commission_queued' }, 'queued'],
    [{ error: 'generation failed' }, 'failed']
  ])('classifies %j as %s', async (result, bucket) => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };
    const outcome = await runMasterSchedulerTick(pool, {
      now: new Date('2026-09-14T07:00:00+05:30'),
      executeSlot: vi.fn().mockResolvedValue(result)
    });
    expect(outcome[bucket]).toHaveLength(2);
    if (bucket !== 'published') expect(outcome.published).toEqual([]);
    if (bucket === 'failed') expect(outcome.completed).toEqual([]);
  });
  it('holds automatic review briefs that no longer qualify before generating', async () => {
    const createReview = vi.fn();
    const publishBatch = vi.fn();
    const holdBrief = vi.fn();
    const result = await executeScheduledSlot({}, { type: 'review_gear' }, {
      getApprovedBrief: vi.fn().mockResolvedValue({ id: 'brief-1' }),
      claimBrief: vi.fn().mockResolvedValue({ id: 'brief-1', approval_mode: 'automatic_low_risk', topic: 'Old gear' }),
      holdBrief, createReview, publishBatch
    });
    expect(result.action).toBe('held_for_review');
    expect(holdBrief).toHaveBeenCalledOnce();
    expect(createReview).not.toHaveBeenCalled();
    expect(publishBatch).not.toHaveBeenCalled();
  });
  it('preserves publication of an approved manual review', async () => {
    const brief = { id: 'approved-1', approval_mode: 'human_required', topic: 'Evidence-backed review', suggested_author_pen_name: REVIEW_PERSONAS[0].penName };
    const result = await executeScheduledSlot({}, { type: 'review_gear' }, {
      getApprovedBrief: vi.fn().mockResolvedValue(brief),
      claimBrief: vi.fn().mockResolvedValue(brief),
      createReview: vi.fn().mockResolvedValue({ title: 'Review', summary: 'Summary', content: 'Content' }),
      publishBatch: vi.fn().mockResolvedValue({ stories: [{ id: 'post-approved' }] }),
      selectProductCover: vi.fn().mockReturnValue(null)
    });
    expect(result.postId).toBe('post-approved');
  });
});

describe('Master Scheduler Timezone, Lateness & Crash-Recovery Evidence', () => {
  it('strictly anchors schedule slots to Asia/Kolkata (IST) across UTC boundaries', async () => {
    const { getIstTime, getDueScheduleSlots } = await import('../src/bot-engine/master-scheduler.js');

    // 01:30 UTC corresponds to 07:00 IST (+05:30)
    const utcMorning = new Date('2026-09-20T01:30:00.000Z');
    const istTime = getIstTime(utcMorning);
    expect(istTime.dateStr).toBe('2026-09-20');
    expect(istTime.hours).toBe(7);
    expect(istTime.minutes).toBe(0);

    const dueSlots = getDueScheduleSlots(utcMorning);
    // At 07:00 IST, dawn_digest (07:00) and housekeeping (02:00) are due
    expect(dueSlots.some(s => s.id === 'dawn_digest')).toBe(true);
    expect(dueSlots.some(s => s.id === 'housekeeping')).toBe(true);
    // midday_culture (14:30) is NOT due at 07:00 IST
    expect(dueSlots.some(s => s.id === 'midday_culture')).toBe(false);
  });

  it('respects SCHEDULER_MAX_LATENESS_MINUTES to drop stale backlog slots post-outage', async () => {
    const { getDueScheduleSlots } = await import('../src/bot-engine/master-scheduler.js');
    const prevLateness = process.env.SCHEDULER_MAX_LATENESS_MINUTES;

    try {
      // At 14:00 IST (minute: 840)
      // dawn_digest is at 07:00 IST (minute: 420, lateness = 420 min)
      // lunch_satire is at 13:30 IST (minute: 810, lateness = 30 min)
      const nowAt1400 = new Date('2026-09-20T08:30:00.000Z'); // 14:00 IST

      // Case A: With max lateness = 60 minutes
      process.env.SCHEDULER_MAX_LATENESS_MINUTES = '60';
      const boundedSlots = getDueScheduleSlots(nowAt1400);
      expect(boundedSlots.some(s => s.id === 'lunch_satire')).toBe(true); // 30 min late <= 60
      expect(boundedSlots.some(s => s.id === 'dawn_digest')).toBe(false); // 420 min late > 60 dropped!

      // Case B: Without lateness bounds (default)
      delete process.env.SCHEDULER_MAX_LATENESS_MINUTES;
      const allDue = getDueScheduleSlots(nowAt1400);
      expect(allDue.some(s => s.id === 'dawn_digest')).toBe(true);
      expect(allDue.some(s => s.id === 'lunch_satire')).toBe(true);
    } finally {
      process.env.SCHEDULER_MAX_LATENESS_MINUTES = prevLateness;
    }
  });

  it('ensures crash recovery and restarts do not re-execute or duplicate published slots', async () => {
    const pool = {
      // Mock database claim returning rowCount = 0 (slot already claimed by previous instance)
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };

    const executeSlot = vi.fn();
    const outcome = await runMasterSchedulerTick(pool, {
      now: new Date('2026-09-20T07:00:00+05:30'),
      executeSlot
    });

    // Zero slots executed because claim was refused (already running / completed)
    expect(executeSlot).not.toHaveBeenCalled();
    expect(outcome.completed).toEqual([]);
    expect(outcome.published).toEqual([]);
  });
});
