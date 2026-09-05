import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runDailyDigest } from '../src/jobs/daily-digest.js';

describe('Daily Digest Push Notification Job', () => {
  it('ships an internal, client-inaccessible dispatch ledger migration', () => {
    const migration = readFileSync(
      new URL('../migrations/20260905_daily_digest_dispatch_ledger.sql', import.meta.url),
      'utf8',
    );
    expect(migration).toContain('dispatch_key text primary key');
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('revoke all on table public.notification_dispatch_ledger from anon, authenticated');
    expect(migration).toContain('grant select, insert, update on table public.notification_dispatch_ledger to service_role');
  });

  it('does not send or crash when counted content disappears before selection', async () => {
    const pool = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [] }) };
    const messaging = { send: vi.fn() };
    const result = await runDailyDigest(pool, messaging, { error: vi.fn() });
    expect(result).toEqual({ skipped: true, reason: 'No eligible story available' });
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it.each([true, false])('records topic acceptance separately without tokens or content: %s', async (accepted) => {
    const pool = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'story', title: 'Private log sentinel', authorName: 'Author' }] })
      .mockResolvedValueOnce({ rows: [{ dispatchKey: 'daily_digest:2026-09-05' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] }) };
    const messaging = { send: accepted ? vi.fn().mockResolvedValue('message-id') : vi.fn().mockRejectedValue(new Error('unavailable')) };
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const result = await runDailyDigest(pool, messaging, log);
    expect(result.sent).toBe(0);
    expect(log.info).toHaveBeenCalledWith({
      event: 'daily_digest_dispatch_summary', eligibleDirectRecipients: 0,
      directAttempted: 0, directAccepted: 0, directSkippedOrFailed: 0,
      topicAttempted: 1, topicAccepted: accepted ? 1 : 0,
    }, 'Daily digest FCM acceptance summary');
    expect(JSON.stringify(log.info.mock.calls)).not.toContain('Private log sentinel');
  });
  it('queries only verified-human inventory and ranks by deep-reading evidence', async () => {
    const queries = [];
    const mockPool = {
      query: vi.fn().mockImplementation(async (sql) => {
        queries.push(sql);
        if (queries.length === 1) return { rows: [{ total: 0, by_category: null }] };
        return { rows: [] };
      }),
    };

    await runDailyDigest(mockPool, { send: vi.fn() }, { warn: vi.fn(), error: vi.fn() });

    expect(queries[0]).toContain("p.provenance = 'human_verified'");
    expect(queries[0]).toContain("author.account_type = 'human'");
    expect(queries[0]).toContain('sum(cnt)');

    mockPool.query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'story-1', title: 'A', authorName: 'Human' }] })
      .mockResolvedValueOnce({ rows: [{ dispatchKey: 'daily_digest:2026-09-05' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await runDailyDigest(mockPool, { send: vi.fn() }, { info: vi.fn(), warn: vi.fn(), error: vi.fn() });
    const rankingSql = mockPool.query.mock.calls[1][0];
    expect(rankingSql).toContain('reading_history');
    expect(rankingSql).toContain('bookmarks');
    expect(rankingSql.indexOf('deep_read_score')).toBeLessThan(rankingSql.indexOf('p.likes_count'));
  });

  it('returns early when there are 0 published stories in the last 24 hours', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValueOnce({
        rows: [{ total: 0, by_category: null }],
      }),
    };
    const mockFirebaseMessaging = {
      send: vi.fn(),
    };
    const mockLog = {
      warn: vi.fn(),
      error: vi.fn(),
    };

    const outcome = await runDailyDigest(mockPool, mockFirebaseMessaging, mockLog);
    expect(outcome).toEqual({ skipped: true, reason: 'No new stories today' });
    expect(mockFirebaseMessaging.send).not.toHaveBeenCalled();
  });

  it('sends personalized localized notifications for eligible recipients', async () => {
    const mockPool = {
      query: vi.fn()
        // 1. count query
        .mockResolvedValueOnce({
          rows: [{ total: 3, by_category: { Poetry: 2, Essays: 1 } }],
        })
        // 2. overall top story
        .mockResolvedValueOnce({
          rows: [{
            id: 'story-overall-1',
            title: 'The Silent Monsoon',
            summary: 'Rain washes over the quiet balconies of Mumbai.',
            category: 'Poetry',
            language_code: 'en',
            authorName: 'Kavya Nair',
            authorPenName: 'kavya_nair',
          }],
        })
        // 3. durable dispatch claim
        .mockResolvedValueOnce({
          rows: [{ dispatchKey: 'daily_digest:2026-09-05' }],
        })
        // 4. per-language top stories
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'story-hi-1',
              title: 'चाँद और खामोशी',
              summary: 'रात के सन्नाटे में एक नया सफर।',
              category: 'Shayari',
              language_code: 'hi',
              authorName: 'रोहन कपूर',
            },
            {
              id: 'story-bn-1',
              title: 'মেঘের চিঠি',
              summary: 'একটি বৃষ্টিভেজা সন্ধ্যার স্মৃতি।',
              category: 'Poetry',
              language_code: 'bn',
              authorName: 'অনন্যা দেশমুখ',
            },
          ],
        })
        // 5. eligible recipients
        .mockResolvedValueOnce({
          rows: [
            { profileId: 'user-en', token: 'fcm-token-en', preferredLanguage: 'en' },
            { profileId: 'user-hi', token: 'fcm-token-hi', preferredLanguage: 'hi' },
            { profileId: 'user-bn', token: 'fcm-token-bn', preferredLanguage: 'bn' },
            { profileId: 'user-mr', token: 'fcm-token-mr', preferredLanguage: 'mr' },
          ],
        }),
    };

    const sentPayloads = [];
    const mockFirebaseMessaging = {
      send: vi.fn().mockImplementation(async (payload) => {
        sentPayloads.push(payload);
        return { messageId: 'msg-123' };
      }),
    };
    const mockLog = {
      warn: vi.fn(),
      error: vi.fn(),
    };

    const outcome = await runDailyDigest(mockPool, mockFirebaseMessaging, mockLog);

    expect(outcome.sent).toBe(4);
    expect(outcome.skipped).toBe(0);
    expect(outcome.totalStories).toBe(3);
    expect(outcome.topStory).toBe('The Silent Monsoon');

    // English recipient
    const enMsg = sentPayloads.find((p) => p.token === 'fcm-token-en');
    expect(enMsg.notification.title).toBe('Tonight’s quiet read');
    expect(enMsg.notification.body).toBe('“The Silent Monsoon” — Kavya Nair • 2 more today');
    expect(enMsg.data.kind).toBe('daily_digest');
    expect(enMsg.data.storyId).toBe('story-overall-1');
    expect(enMsg.data.dailyCount).toBe('3');
    expect(enMsg.data.storyTitle).toBe('The Silent Monsoon');
    expect(enMsg.data.storySummary).toBe('Rain washes over the quiet balconies of Mumbai.');
    expect(enMsg.data.authorName).toBe('Kavya Nair');
    expect(enMsg.fcmOptions.analyticsLabel).toBe('daily_digest_en');
    expect(enMsg.android.fcmOptions.analyticsLabel).toBe('daily_digest_en');
    expect(enMsg.android.notification).toMatchObject({
      channelId: 'writon_editorial_channel',
      icon: 'ic_stat_writon',
      color: '#E75A2A',
    });

    // Hindi recipient (matched to Hindi top story)
    const hiMsg = sentPayloads.find((p) => p.token === 'fcm-token-hi');
    expect(hiMsg.notification.title).toBe('आज का चुनिंदा पाठ');
    expect(hiMsg.notification.body).toBe('“चाँद और खामोशी” — रोहन कपूर • आज 2 और रचनाएँ');
    expect(hiMsg.data.storyId).toBe('story-hi-1');

    // Bengali recipient (matched to Bengali top story)
    const bnMsg = sentPayloads.find((p) => p.token === 'fcm-token-bn');
    expect(bnMsg.notification.title).toBe('আজকের বাছাই করা পাঠ');
    expect(bnMsg.notification.body).toBe('“মেঘের চিঠি” — অনন্যা দেশমুখ • আজ আরও 2টি লেখা');
    expect(bnMsg.data.storyId).toBe('story-bn-1');

    // Marathi recipient (no Marathi story in lang list, falls back to overall top story)
    const mrMsg = sentPayloads.find((p) => p.token === 'fcm-token-mr');
    expect(mrMsg.notification.title).toBe('आजचे निवडक वाचन');
    expect(mrMsg.notification.body).toBe('“The Silent Monsoon” — Kavya Nair • आज आणखी 2 लेखन');
    expect(mrMsg.data.storyId).toBe('story-overall-1');

    const topicMsg = sentPayloads.find((p) => p.topic === 'daily_digest');
    expect(topicMsg.fcmOptions.analyticsLabel).toBe('daily_digest_topic');
    expect(topicMsg.android.fcmOptions.analyticsLabel).toBe('daily_digest_topic');
  });

  it('handles token send errors gracefully without aborting the batch', async () => {
    const mockPool = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'story-1',
            title: 'Single Story',
            authorName: 'Author One',
          }],
        })
        .mockResolvedValueOnce({ rows: [{ dispatchKey: 'daily_digest:2026-09-05' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { profileId: 'u1', tokenId: 'token-good-id', token: 'fcm-good', preferredLanguage: 'en' },
            { profileId: 'u2', tokenId: 'token-bad-id', token: 'fcm-bad', preferredLanguage: 'en' },
          ],
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }),
    };

    const mockFirebaseMessaging = {
      send: vi.fn().mockImplementation(async (payload) => {
        if (payload.token === 'fcm-bad') {
          throw new Error('messaging/registration-token-not-registered');
        }
        return { messageId: 'msg-good' };
      }),
    };
    const mockLog = {
      warn: vi.fn(),
      error: vi.fn(),
    };

    const outcome = await runDailyDigest(mockPool, mockFirebaseMessaging, mockLog);
    expect(outcome.sent).toBe(1);
    expect(outcome.skipped).toBe(1);
    expect(mockLog.warn).toHaveBeenCalledTimes(1);
    expect(mockLog.warn.mock.calls[0][0]).not.toHaveProperty('token');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('update public.device_push_tokens'),
      ['token-bad-id'],
    );
  });

  it('does not send when another invocation already claimed today\'s digest', async () => {
    const pool = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'story', title: 'One story', authorName: 'Human' }] })
      .mockResolvedValueOnce({ rows: [] }) };
    const messaging = { send: vi.fn() };

    const result = await runDailyDigest(pool, messaging, { error: vi.fn() });

    expect(result).toEqual({ skipped: true, reason: 'Daily digest already claimed' });
    expect(messaging.send).not.toHaveBeenCalled();
    expect(pool.query.mock.calls[2][0]).toContain('on conflict (dispatch_key) do nothing');
    expect(pool.query.mock.calls[2][0]).toContain("at time zone 'Asia/Kolkata'");
  });

  it('allows only one FCM broadcast across concurrent invocations', async () => {
    let claimed = false;
    const pool = {
      query: vi.fn(async (sql) => {
        if (sql.includes('json_object_agg')) return { rows: [{ total: 1 }] };
        if (sql.includes('order by deep_read_score') && sql.includes('limit 1')) {
          return { rows: [{ id: 'story-1', title: 'One story', authorName: 'Human' }] };
        }
        if (sql.includes('insert into public.notification_dispatch_ledger')) {
          if (claimed) return { rows: [] };
          claimed = true;
          return { rows: [{ dispatchKey: 'daily_digest:2026-09-05' }] };
        }
        if (sql.includes('distinct on (p.language_code)')) return { rows: [] };
        if (sql.includes('from public.device_push_tokens')) return { rows: [] };
        if (sql.includes('update public.notification_dispatch_ledger')) return { rows: [] };
        throw new Error(`Unexpected query: ${sql}`);
      }),
    };
    const messaging = { send: vi.fn().mockResolvedValue('message-id') };
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const outcomes = await Promise.all([
      runDailyDigest(pool, messaging, log),
      runDailyDigest(pool, messaging, log),
    ]);

    expect(messaging.send).toHaveBeenCalledTimes(1);
    expect(outcomes).toContainEqual({ skipped: true, reason: 'Daily digest already claimed' });
    expect(outcomes).toContainEqual({ sent: 0, skipped: 0, totalStories: 1, topStory: 'One story' });
  });
});
