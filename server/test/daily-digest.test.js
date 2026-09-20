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
    const result = await runDailyDigest(pool, messaging, { error: vi.fn() }, { slot: 'evening' });
    expect(result).toEqual({ skipped: true, reason: 'No eligible story available', slot: 'evening' });
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it.each([true, false])('records topic acceptance separately without tokens or content: %s', async (accepted) => {
    const pool = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'story', title: 'Private log sentinel', authorName: 'Author' }] })
      .mockResolvedValueOnce({ rows: [{ dispatchKey: 'daily_digest:2026-09-05:evening' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] }) };
    const messaging = { send: accepted ? vi.fn().mockResolvedValue('message-id') : vi.fn().mockRejectedValue(new Error('unavailable')) };
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const result = await runDailyDigest(pool, messaging, log, { slot: 'evening' });
    expect(result.sent).toBe(0);
    expect(result.slot).toBe('evening');
    expect(log.info).toHaveBeenCalledWith({
      event: 'daily_digest_dispatch_summary', slot: 'evening', eligibleDirectRecipients: 0,
      directAttempted: 0, directAccepted: 0, directSkippedOrFailed: 0,
      topicAttempted: 1, topicAccepted: accepted ? 1 : 0,
    }, 'Daily digest FCM acceptance summary');
    expect(JSON.stringify(log.info.mock.calls)).not.toContain('Private log sentinel');
  });
  it('queries only verified-human inventory and ranks by deep-reading evidence for evening slot', async () => {
    const queries = [];
    const mockPool = {
      query: vi.fn().mockImplementation(async (sql) => {
        queries.push(sql);
        if (queries.length === 1) return { rows: [{ total: 0, by_category: null }] };
        return { rows: [] };
      }),
    };

    await runDailyDigest(mockPool, { send: vi.fn() }, { warn: vi.fn(), error: vi.fn() }, { slot: 'evening' });

    expect(queries[0]).toContain("p.provenance = 'human_verified'");
    expect(queries[0]).toContain("author.account_type = 'human'");
    expect(queries[0]).toContain('sum(cnt)');

    mockPool.query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'story-1', title: 'A', authorName: 'Human' }] })
      .mockResolvedValueOnce({ rows: [{ dispatchKey: 'daily_digest:2026-09-05:evening' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await runDailyDigest(mockPool, { send: vi.fn() }, { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, { slot: 'evening' });
    const rankingSql = mockPool.query.mock.calls[1][0];
    expect(rankingSql).toContain('reading_history');
    expect(rankingSql).toContain('bookmarks');
    expect(rankingSql.indexOf('deep_read_score')).toBeLessThan(rankingSql.indexOf('p.likes_count'));
  });

  it('queries trending inventory and prioritizes engagement velocity for morning slot', async () => {
    const queries = [];
    const mockPool = {
      query: vi.fn().mockImplementation(async (sql) => {
        queries.push(sql);
        if (queries.length === 1) return { rows: [{ total: 0, by_category: null }] };
        return { rows: [] };
      }),
    };

    await runDailyDigest(mockPool, { send: vi.fn() }, { warn: vi.fn(), error: vi.fn() }, { slot: 'morning' });

    expect(queries[0]).toContain("author.account_type in ('human', 'editorial_bot')");
    expect(queries[0]).toContain("p.provenance in ('human_verified', 'synthetic')");

    mockPool.query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'story-trend-1', title: 'Trending Breakthrough', authorName: 'Aarav Tech' }] })
      .mockResolvedValueOnce({ rows: [{ dispatchKey: 'daily_digest:2026-09-05:morning' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await runDailyDigest(mockPool, { send: vi.fn() }, { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, { slot: 'morning' });
    const rankingSql = mockPool.query.mock.calls[1][0];
    expect(rankingSql).toContain('p.likes_count desc, deep_read_score desc');
  });

  it('returns early when there are 0 published stories even in fallback inventory', async () => {
    const mockPool = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ total: 0, by_category: null }] }) // count query
        .mockResolvedValueOnce({ rows: [] }) // 24h top story
        .mockResolvedValueOnce({ rows: [] }) // fallback human story
        .mockResolvedValueOnce({ rows: [] }), // fallback any story
    };
    const mockFirebaseMessaging = {
      send: vi.fn(),
    };
    const mockLog = {
      warn: vi.fn(),
      error: vi.fn(),
    };

    const outcome = await runDailyDigest(mockPool, mockFirebaseMessaging, mockLog, { slot: 'evening' });

    expect(outcome).toEqual({ skipped: true, reason: 'No eligible story available', slot: 'evening' });
    expect(mockFirebaseMessaging.send).not.toHaveBeenCalled();
  });

  it('falls back to historical published story when no stories were published in last 24h', async () => {
    const mockPool = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ total: 0, by_category: null }] }) // 24h count is 0
        .mockResolvedValueOnce({ rows: [] }) // 24h top story is empty
        .mockResolvedValueOnce({ rows: [{ id: 'historical-1', title: 'Evergreen Classic', authorName: 'Classic Author' }] }) // fallback human
        .mockResolvedValueOnce({ rows: [{ dispatchKey: 'daily_digest:2026-09-05:evening' }] }) // ledger
        .mockResolvedValueOnce({ rows: [] }) // per-language
        .mockResolvedValueOnce({ rows: [{ profileId: 'u1', token: 'fcm-1', preferredLanguage: 'en' }] }) // recipients
        .mockResolvedValueOnce({ rows: [] }), // ledger completion
    };
    const mockFirebaseMessaging = {
      send: vi.fn().mockResolvedValue('msg-fallback-ok'),
    };
    const mockLog = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const outcome = await runDailyDigest(mockPool, mockFirebaseMessaging, mockLog, { slot: 'evening' });

    expect(outcome.sent).toBe(1);
    expect(outcome.topStory).toBe('Evergreen Classic');
    expect(mockFirebaseMessaging.send).toHaveBeenCalled();
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

    const outcome = await runDailyDigest(mockPool, mockFirebaseMessaging, mockLog, { slot: 'evening' });

    expect(mockPool.query.mock.calls[4][0]).toContain(
      'coalesce(np.daily_digest_enabled, np.editorial_enabled, true) = true',
    );

    expect(outcome.sent).toBe(4);
    expect(outcome.skipped).toBe(0);
    expect(outcome.totalStories).toBe(3);
    expect(outcome.topStory).toBe('The Silent Monsoon');

    // English recipient
    const enMsg = sentPayloads.find((p) => p.token === 'fcm-token-en');
    expect(enMsg.notification.title).toBe('Tonight’s quiet read');
    expect(enMsg.notification.body).toBe('“The Silent Monsoon” — Kavya Nair • 2 more today');
    expect(enMsg.data.kind).toBe('daily_digest');
    expect(enMsg.data.edition).toBe('evening');
    expect(enMsg.data.storyId).toBe('story-overall-1');
    expect(enMsg.data.dailyCount).toBe('3');
    expect(enMsg.data.storyTitle).toBe('The Silent Monsoon');
    expect(enMsg.data.storySummary).toBe('Rain washes over the quiet balconies of Mumbai.');
    expect(enMsg.data.authorName).toBe('Kavya Nair');
    expect(enMsg.fcmOptions.analyticsLabel).toBe('daily_digest_evening_en');
    expect(enMsg.android.fcmOptions.analyticsLabel).toBe('daily_digest_evening_en');
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
    expect(topicMsg.fcmOptions.analyticsLabel).toBe('daily_digest_evening_topic');
    expect(topicMsg.android.fcmOptions.analyticsLabel).toBe('daily_digest_evening_topic');
  });

  it('sends morning trending localized notifications with differentiated copy', async () => {
    const mockPool = {
      query: vi.fn()
        .mockResolvedValueOnce({
          rows: [{ total: 2, by_category: { Tech: 1, Trending: 1 } }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'story-trend-overall',
            title: 'Neural Synthesizers in 2026',
            summary: 'How neural synthesis is reshaping music production.',
            category: 'Tech',
            language_code: 'en',
            authorName: 'Aarav Tech',
            authorPenName: 'aarav_tech',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ dispatchKey: 'daily_digest:2026-09-05:morning' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'story-trend-hi',
              title: 'तकनीक का नया युग',
              summary: 'नयी खोज और भारतीय उद्योग।',
              category: 'Tech',
              language_code: 'hi',
              authorName: 'रोहन कपूर',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { profileId: 'user-en', token: 'fcm-token-en', preferredLanguage: 'en' },
            { profileId: 'user-hi', token: 'fcm-token-hi', preferredLanguage: 'hi' },
          ],
        }),
    };

    const sentPayloads = [];
    const mockFirebaseMessaging = {
      send: vi.fn().mockImplementation(async (payload) => {
        sentPayloads.push(payload);
        return { messageId: 'msg-morning' };
      }),
    };
    const mockLog = { warn: vi.fn(), error: vi.fn() };

    const outcome = await runDailyDigest(mockPool, mockFirebaseMessaging, mockLog, { slot: 'morning' });
    expect(outcome.sent).toBe(2);
    expect(outcome.slot).toBe('morning');

    const enMsg = sentPayloads.find((p) => p.token === 'fcm-token-en');
    expect(enMsg.notification.title).toBe('Morning Trending Read');
    expect(enMsg.notification.body).toBe('“Neural Synthesizers in 2026” — Aarav Tech • Trending on WritOn');
    expect(enMsg.data.edition).toBe('morning');
    expect(enMsg.fcmOptions.analyticsLabel).toBe('daily_digest_morning_en');

    const hiMsg = sentPayloads.find((p) => p.token === 'fcm-token-hi');
    expect(hiMsg.notification.title).toBe('आज सुबह का चर्चित पाठ');
    expect(hiMsg.notification.body).toBe('“तकनीक का नया युग” — रोहन कपूर • राइटऑन पर ट्रेंडिंग');
    expect(hiMsg.fcmOptions.analyticsLabel).toBe('daily_digest_morning_hi');
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

  it('does not send when another invocation already claimed today\'s digest slot', async () => {
    const pool = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'story', title: 'One story', authorName: 'Human' }] })
      .mockResolvedValueOnce({ rows: [] }) };
    const messaging = { send: vi.fn() };

    const result = await runDailyDigest(pool, messaging, { error: vi.fn() }, { slot: 'morning' });

    expect(result).toEqual({ skipped: true, reason: 'Daily digest already claimed', slot: 'morning' });
    expect(messaging.send).not.toHaveBeenCalled();
    expect(pool.query.mock.calls[2][0]).toContain('on conflict (dispatch_key) do nothing');
    expect(pool.query.mock.calls[2][1][0]).toContain('morning');
  });

  it('allows only one FCM broadcast across concurrent invocations for the same slot', async () => {
    let claimed = false;
    const pool = {
      query: vi.fn(async (sql, params) => {
        if (sql.includes('json_object_agg')) return { rows: [{ total: 1 }] };
        if (sql.includes('from public.device_push_tokens')) return { rows: [] };
        if (sql.includes('distinct on (p.language_code)')) return { rows: [] };
        if (sql.includes('order by') && sql.includes('limit 1')) {
          return { rows: [{ id: 'story-1', title: 'One story', authorName: 'Human' }] };
        }
        if (sql.includes('insert into public.notification_dispatch_ledger')) {
          if (claimed) return { rows: [] };
          claimed = true;
          return { rows: [{ dispatchKey: params?.[0] || 'daily_digest:2026-09-05:evening' }] };
        }
        if (sql.includes('update public.notification_dispatch_ledger')) return { rows: [] };
        throw new Error(`Unexpected query: ${sql}`);
      }),
    };
    const messaging = { send: vi.fn().mockResolvedValue('message-id') };
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const outcomes = await Promise.all([
      runDailyDigest(pool, messaging, log, { slot: 'evening' }),
      runDailyDigest(pool, messaging, log, { slot: 'evening' }),
    ]);

    expect(messaging.send).toHaveBeenCalledTimes(1);
    expect(outcomes).toContainEqual({ skipped: true, reason: 'Daily digest already claimed', slot: 'evening' });
    expect(outcomes).toContainEqual({ sent: 0, skipped: 0, totalStories: 1, topStory: 'One story', slot: 'evening' });
  });

  it('allows morning and evening dispatches to run independently on the same day', async () => {
    const claimedKeys = new Set();
    const pool = {
      query: vi.fn(async (sql, params) => {
        if (sql.includes('json_object_agg')) return { rows: [{ total: 1 }] };
        if (sql.includes('from public.device_push_tokens')) return { rows: [] };
        if (sql.includes('distinct on (p.language_code)')) return { rows: [] };
        if (sql.includes('order by') && sql.includes('limit 1')) {
          return { rows: [{ id: 'story-1', title: 'Story for slot', authorName: 'WritOn Author' }] };
        }
        if (sql.includes('insert into public.notification_dispatch_ledger')) {
          const key = params?.[0];
          if (claimedKeys.has(key)) return { rows: [] };
          claimedKeys.add(key);
          return { rows: [{ dispatchKey: key }] };
        }
        if (sql.includes('update public.notification_dispatch_ledger')) return { rows: [] };
        throw new Error(`Unexpected query: ${sql}`);
      }),
    };
    const messaging = { send: vi.fn().mockResolvedValue('msg-ok') };
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const morningOutcome = await runDailyDigest(pool, messaging, log, { slot: 'morning' });
    const eveningOutcome = await runDailyDigest(pool, messaging, log, { slot: 'evening' });

    expect(morningOutcome.slot).toBe('morning');
    expect(eveningOutcome.slot).toBe('evening');
    expect(messaging.send).toHaveBeenCalledTimes(2);
    expect(claimedKeys.size).toBe(2);
  });

  it('includes 30-day notification dispatch ledger cooldown in story ranking and records topStoryId', async () => {
    const executedQueries = [];
    let recordedResultJson = null;
    const pool = {
      query: vi.fn(async (sql, params) => {
        executedQueries.push({ sql, params });
        if (sql.includes('sum(cnt)')) return { rows: [{ total: 1 }] };
        if (sql.includes('distinct on (p.language_code)')) return { rows: [] };
        if (sql.includes('from public.device_push_tokens')) return { rows: [] };
        if (sql.includes('order by') && sql.includes('limit 1')) {
          return { rows: [{ id: 'story-unpushed-99', title: 'The Solitary Path', authorName: 'WritOn Author' }] };
        }
        if (sql.includes('insert into public.notification_dispatch_ledger')) {
          return { rows: [{ dispatchKey: 'daily_digest:2026-09-05:evening' }] };
        }
        if (sql.includes('update public.notification_dispatch_ledger')) {
          recordedResultJson = JSON.parse(params?.[1] || '{}');
          return { rows: [] };
        }
        throw new Error(`Unexpected query: ${sql}`);
      }),
    };
    const messaging = { send: vi.fn().mockResolvedValue('msg-cooldown-ok') };
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const outcome = await runDailyDigest(pool, messaging, log, { slot: 'evening' });

    expect(outcome.topStory).toBe('The Solitary Path');
    const rankingQuery = executedQueries.find(q => q.sql.includes('order by') && q.sql.includes('limit 1'));
    expect(rankingQuery.sql).toContain("from public.notification_dispatch_ledger ndl");
    expect(rankingQuery.sql).toContain("ndl.dispatch_kind = 'daily_digest'");
    expect(rankingQuery.sql).toContain("ndl.completed_at >= now() - interval '30 days'");
    expect(rankingQuery.sql).toContain("ndl.result->>'topStoryId' = p.id::text");

    expect(recordedResultJson).toMatchObject({
      topStoryId: 'story-unpushed-99',
      topStoryTitle: 'The Solitary Path',
      slot: 'evening',
    });
  });
});

