import { randomUUID } from 'node:crypto';
import { recordStoryMemory, recordFeedbackMemory } from './learning-service.js';
import { recordLedgerEntry } from './editorial-ledger-service.js';
import { triggerSparkReaction } from './spark-runner.js';
import { seedDailyTrendsToBacklog } from './trend-scout-service.js';
import { syndicatePublishedStory } from '../services/story-syndication-service.js';

/**
 * Enqueues an event into the transactional outbox.
 * Can be executed on an active transaction client (for atomic publication)
 * or directly on the pool.
 *
 * @param {object} clientOrPool Database client or pool
 * @param {object} params
 * @param {'reaction_wave'|'record_memory'|'ledger_entry'|'trend_refresh'} params.eventType
 * @param {object} params.payload
 * @param {Date|string} [params.scheduledAt]
 * @param {number} [params.maxAttempts=5]
 */
export async function enqueueOutboxEvent(clientOrPool, { eventType, payload = {}, scheduledAt = new Date(), maxAttempts = 5 }) {
  try {
    const res = await clientOrPool.query(
      `insert into public.bot_event_outbox
       (event_type, payload, scheduled_at, max_attempts, status)
       values ($1, $2, $3, $4, 'pending')
       returning id, event_type, status, scheduled_at`,
      [eventType, JSON.stringify(payload), scheduledAt, maxAttempts]
    );
    return res.rows[0];
  } catch (err) {
    console.warn('[Outbox Service] Enqueue warning:', err.message);
    if (clientOrPool && typeof clientOrPool.release === 'function') {
      throw err;
    }
    return null;
  }
}

/**
 * Atomically claims a batch of pending/failed outbox events using FOR UPDATE SKIP LOCKED.
 *
 * @param {object} pool
 * @param {object} [options]
 * @param {string} [options.workerId]
 * @param {number} [options.batchSize=10]
 * @param {number} [options.leaseDurationMs=60000]
 */
export async function claimOutboxBatch(pool, { workerId = randomUUID(), batchSize = 10, leaseDurationMs = 60000 } = {}) {
  try {
    const res = await pool.query(
      `with claimed as (
         select id from public.bot_event_outbox
         where (
           status in ('pending', 'failed')
           or (status = 'processing' and leased_until < now())
         )
           and scheduled_at <= now()
           and attempts < max_attempts
           and (leased_until is null or leased_until < now())
         order by scheduled_at asc
         limit $1
         for update skip locked
       )
       update public.bot_event_outbox o
       set status = 'processing',
           locked_by = $2,
           leased_until = now() + ($3 || ' milliseconds')::interval,
           attempts = attempts + 1,
           updated_at = now()
       from claimed
       where o.id = claimed.id
       returning o.id, o.event_type as "eventType", o.payload, o.attempts, o.max_attempts as "maxAttempts"`,
      [batchSize, workerId, leaseDurationMs]
    );
    return res.rows;
  } catch (err) {
    console.warn('[Outbox Service] Claim warning:', err.message);
    return [];
  }
}

/**
 * Marks an outbox event as successfully completed.
 */
export async function completeOutboxEvent(pool, eventId) {
  try {
    await pool.query(
      `update public.bot_event_outbox
       set status = 'completed',
           leased_until = null,
           locked_by = null,
           updated_at = now()
       where id = $1`,
      [eventId]
    );
    return true;
  } catch (err) {
    console.warn('[Outbox Service] Complete warning:', err.message);
    return false;
  }
}

/**
 * Marks an outbox event as failed (or dead_letter if attempts exceeded).
 */
export async function failOutboxEvent(pool, eventId, errorMessage) {
  try {
    await pool.query(
      `update public.bot_event_outbox
       set status = case when attempts >= max_attempts then 'dead_letter' else 'failed' end,
           last_error = $2,
           leased_until = null,
           locked_by = null,
           updated_at = now()
       where id = $1`,
      [eventId, String(errorMessage).slice(0, 1000)]
    );
    return true;
  } catch (err) {
    console.warn('[Outbox Service] Fail warning:', err.message);
    return false;
  }
}

/**
 * Processes claimed outbox events with exponential backoff and dispatch.
 */
export async function processOutboxEvents(pool, options = {}) {
  const events = await claimOutboxBatch(pool, options);
  if (!events || events.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const event of events) {
    try {
      const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

      if (event.eventType === 'reaction_wave') {
        await triggerSparkReaction(pool, payload);
      } else if (event.eventType === 'record_memory') {
        if (payload.memoryKind === 'feedback') {
          await recordFeedbackMemory(pool, payload);
        } else {
          await recordStoryMemory(pool, payload);
        }
      } else if (event.eventType === 'ledger_entry') {
        await recordLedgerEntry(pool, payload);
      } else if (event.eventType === 'trend_refresh') {
        await seedDailyTrendsToBacklog(pool);
      } else if (event.eventType === 'social_syndicate') {
        await syndicatePublishedStory(pool, payload);
      } else {
        throw new Error(`Unknown outbox event type: ${event.eventType}`);
      }

      await completeOutboxEvent(pool, event.id);
      succeeded++;
    } catch (err) {
      console.error(`[Outbox Service] Failed to process event ${event.id} (${event.eventType}):`, err.message);
      await failOutboxEvent(pool, event.id, err.message);
      failed++;
    }
  }

  return { processed: events.length, succeeded, failed };
}

/**
 * Helper: Enqueues an autonomous social syndication event for a published story.
 *
 * @param {object} clientOrPool Active transaction client or pool
 * @param {object} post Published post row
 * @param {object} [author] Author details
 */
export async function enqueueStorySyndication(clientOrPool, post, author = {}) {
  return enqueueOutboxEvent(clientOrPool, {
    eventType: 'social_syndicate',
    payload: {
      postId: post.id,
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      content: post.content,
      category: post.category,
      readingTimeMin: post.reading_time_min || post.readingTimeMin || 3,
      authorFullName: author.fullName || author.full_name || 'WritOn Author',
      authorPenName: author.penName || author.pen_name || 'author',
    },
  });
}
