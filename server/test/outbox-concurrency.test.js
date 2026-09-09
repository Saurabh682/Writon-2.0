import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  claimOutboxBatch,
  completeOutboxEvent,
  enqueueOutboxEvent,
  failOutboxEvent
} from '../src/bot-engine/outbox-service.js';
import {
  checkIdempotency,
  computePayloadHash,
  saveIdempotencyRecord
} from '../src/bot-engine/idempotency-service.js';

describe('Transactional Outbox & Concurrency Contracts (Gap 5)', () => {
  describe('Outbox Queue Claim Concurrency (FOR UPDATE SKIP LOCKED)', () => {
    function createConcurrentOutboxPool(initialEvents = []) {
      const store = new Map(initialEvents.map(e => [e.id, { ...e }]));
      const locks = new Set();

      return {
        store,
        query: async (sql, params = []) => {
          const s = String(sql);

          if (s.includes('insert into public.bot_event_outbox')) {
            const id = randomUUID();
            const record = {
              id,
              event_type: params[0],
              payload: typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1],
              scheduled_at: new Date(params[2] || Date.now()),
              max_attempts: params[3] || 5,
              attempts: 0,
              status: 'pending',
              leased_until: null,
              locked_by: null,
              created_at: new Date(),
              updated_at: new Date()
            };
            store.set(id, record);
            return { rowCount: 1, rows: [{ id, event_type: record.event_type, status: record.status, scheduled_at: record.scheduled_at }] };
          }

          if (s.includes('for update skip locked')) {
            const batchSize = params[0] || 10;
            const workerId = params[1] || 'worker';
            const leaseDurationMs = params[2] || 60000;
            const now = Date.now();

            const candidates = Array.from(store.values()).filter(e => {
              const isEligibleStatus = e.status === 'pending' || e.status === 'failed' || (e.status === 'processing' && e.leased_until && new Date(e.leased_until).getTime() < now);
              const isScheduled = new Date(e.scheduled_at).getTime() <= now;
              const hasAttemptsLeft = e.attempts < e.max_attempts;
              const isUnleased = !e.leased_until || new Date(e.leased_until).getTime() < now;
              const isNotLocked = !locks.has(e.id);
              return isEligibleStatus && isScheduled && hasAttemptsLeft && isUnleased && isNotLocked;
            }).slice(0, batchSize);

            // Lock candidates atomically
            const claimed = [];
            for (const cand of candidates) {
              locks.add(cand.id);
              cand.status = 'processing';
              cand.locked_by = workerId;
              cand.leased_until = new Date(now + leaseDurationMs);
              cand.attempts += 1;
              cand.updated_at = new Date();
              claimed.push({
                id: cand.id,
                eventType: cand.event_type,
                payload: cand.payload,
                attempts: cand.attempts,
                maxAttempts: cand.max_attempts
              });
            }
            return { rowCount: claimed.length, rows: claimed };
          }

          if (s.includes("status = 'completed'")) {
            const id = params[0];
            const event = store.get(id);
            if (event) {
              event.status = 'completed';
              event.leased_until = null;
              event.locked_by = null;
              locks.delete(id);
              return { rowCount: 1, rows: [] };
            }
            return { rowCount: 0, rows: [] };
          }

          if (s.includes("status = case when attempts >= max_attempts then 'dead_letter' else 'failed' end")) {
            const id = params[0];
            const lastError = params[1];
            const event = store.get(id);
            if (event) {
              event.status = event.attempts >= event.max_attempts ? 'dead_letter' : 'failed';
              event.last_error = lastError;
              event.leased_until = null;
              event.locked_by = null;
              locks.delete(id);
              return { rowCount: 1, rows: [] };
            }
            return { rowCount: 0, rows: [] };
          }

          return { rowCount: 0, rows: [] };
        }
      };
    }

    it('distributes events across concurrent workers without double claiming', async () => {
      const initialEvents = Array.from({ length: 10 }, (_, i) => ({
        id: `event-${i + 1}`,
        event_type: 'reaction_wave',
        payload: { postId: `post-${i + 1}` },
        scheduled_at: new Date(Date.now() - 1000),
        max_attempts: 5,
        attempts: 0,
        status: 'pending',
        leased_until: null,
        locked_by: null
      }));

      const pool = createConcurrentOutboxPool(initialEvents);

      // 3 workers claim batches of size 4 simultaneously
      const [batch1, batch2, batch3] = await Promise.all([
        claimOutboxBatch(pool, { workerId: 'worker-1', batchSize: 4 }),
        claimOutboxBatch(pool, { workerId: 'worker-2', batchSize: 4 }),
        claimOutboxBatch(pool, { workerId: 'worker-3', batchSize: 4 })
      ]);

      const ids1 = batch1.map(e => e.id);
      const ids2 = batch2.map(e => e.id);
      const ids3 = batch3.map(e => e.id);

      // Verify no overlap between any workers
      const allClaimedIds = [...ids1, ...ids2, ...ids3];
      const uniqueIds = new Set(allClaimedIds);
      expect(uniqueIds.size).toBe(allClaimedIds.length);
      expect(allClaimedIds.length).toBe(10);
      expect(ids1.length).toBe(4);
      expect(ids2.length).toBe(4);
      expect(ids3.length).toBe(2);

      // A 4th worker should receive nothing since queue is exhausted
      const emptyBatch = await claimOutboxBatch(pool, { workerId: 'worker-4', batchSize: 4 });
      expect(emptyBatch).toEqual([]);
    });

    it('recovers abandoned leases when leased_until expires', async () => {
      const now = Date.now();
      const expiredEvent = {
        id: 'abandoned-event-1',
        event_type: 'record_memory',
        payload: { botId: 'bot-1' },
        scheduled_at: new Date(now - 60000),
        max_attempts: 5,
        attempts: 1,
        status: 'processing',
        leased_until: new Date(now - 1000), // Lease expired 1 second ago
        locked_by: 'dead-worker'
      };

      const pool = createConcurrentOutboxPool([expiredEvent]);

      // Worker 2 should successfully re-claim the abandoned event
      const recovered = await claimOutboxBatch(pool, { workerId: 'worker-2', batchSize: 1 });
      expect(recovered.length).toBe(1);
      expect(recovered[0].id).toBe('abandoned-event-1');
      expect(recovered[0].attempts).toBe(2);
    });

    it('transitions event to dead_letter after exceeding max_attempts', async () => {
      const initialEvent = {
        id: 'failing-event-1',
        event_type: 'trend_refresh',
        payload: {},
        scheduled_at: new Date(Date.now() - 1000),
        max_attempts: 2,
        attempts: 1,
        status: 'processing',
        leased_until: new Date(Date.now() + 60000),
        locked_by: 'worker-1'
      };

      const pool = createConcurrentOutboxPool([initialEvent]);
      await failOutboxEvent(pool, 'failing-event-1', 'Simulated downstream timeout');

      const saved = pool.store.get('failing-event-1');
      expect(saved.status).toBe('failed');

      // Second failure exceeds max_attempts (2)
      saved.attempts = 2;
      await failOutboxEvent(pool, 'failing-event-1', 'Permanent error');
      expect(saved.status).toBe('dead_letter');
      expect(saved.last_error).toBe('Permanent error');
    });
  });

  describe('Database Idempotency Service (Gap 1)', () => {
    function createIdempotencyMockPool() {
      const records = new Map();
      return {
        records,
        query: async (sql, params = []) => {
          const s = String(sql);
          if (s.includes('select scoped_key, request_hash')) {
            const scopedKey = params[0];
            const record = records.get(scopedKey);
            if (record && record.expiresAt > Date.now()) {
              return {
                rowCount: 1,
                rows: [{
                  scoped_key: record.scopedKey,
                  request_hash: record.requestHash,
                  route: record.route,
                  response_status: record.responseStatus,
                  response_body: record.responseBody,
                  expires_at: new Date(record.expiresAt).toISOString()
                }]
              };
            }
            return { rowCount: 0, rows: [] };
          }

          if (s.includes('insert into public.bot_idempotency_records')) {
            const scopedKey = params[0];
            const requestHash = params[1];
            const route = params[2];
            const responseStatus = params[3];
            const responseBody = params[4];
            records.set(scopedKey, {
              scopedKey,
              requestHash,
              route,
              responseStatus,
              responseBody,
              createdAt: Date.now(),
              expiresAt: Date.now() + 86400000
            });
            return { rowCount: 1, rows: [] };
          }

          return { rowCount: 0, rows: [] };
        }
      };
    }

    it('computes deterministic SHA-256 payload hashes', () => {
      const payloadA = { title: 'Essay One', category: 'Tech' };
      const payloadB = { category: 'Tech', title: 'Essay One' }; // different key ordering
      expect(computePayloadHash(payloadA)).toBe(computePayloadHash(payloadB));
      expect(computePayloadHash('')).toBe(computePayloadHash(null));
    });

    it('allows first execution, and replays cached response on identical key', async () => {
      const pool = createIdempotencyMockPool();
      const payload = { title: 'First Post', content: 'Essay text' };

      // First check: not seen, should track
      const firstCheck = await checkIdempotency(pool, {
        key: 'idem-key-100',
        route: '/api/v1/spark/publish',
        payload
      });
      expect(firstCheck.shouldTrack).toBe(true);
      expect(firstCheck.isReplay).toBeFalsy();

      // Save the executed response
      await saveIdempotencyRecord(pool, {
        scopedKey: firstCheck.scopedKey,
        hash: firstCheck.hash,
        route: firstCheck.route,
        statusCode: 201,
        body: { id: 'post-uuid-1', title: 'First Post' }
      });

      // Second check with same key & identical payload: should replay
      const secondCheck = await checkIdempotency(pool, {
        key: 'idem-key-100',
        route: '/api/v1/spark/publish',
        payload
      });
      expect(secondCheck.isReplay).toBe(true);
      expect(secondCheck.statusCode).toBe(201);
      expect(secondCheck.body).toEqual({ id: 'post-uuid-1', title: 'First Post' });
    });

    it('detects payload mismatch and returns error when key is reused with different body', async () => {
      const pool = createIdempotencyMockPool();

      // Original request
      const firstCheck = await checkIdempotency(pool, {
        key: 'idem-key-200',
        route: '/api/v1/spark/publish',
        payload: { title: 'Original Title' }
      });
      await saveIdempotencyRecord(pool, {
        scopedKey: firstCheck.scopedKey,
        hash: firstCheck.hash,
        route: firstCheck.route,
        statusCode: 201,
        body: { ok: true }
      });

      // Malicious or accidental replay with completely different payload
      const mismatchCheck = await checkIdempotency(pool, {
        key: 'idem-key-200',
        route: '/api/v1/spark/publish',
        payload: { title: 'Completely Different Title' }
      });

      expect(mismatchCheck.isMismatch).toBe(true);
      expect(mismatchCheck.error).toContain('previously used with a different request payload');
    });
  });

  describe('Master Scheduler Slot Claim Atomic Concurrency', () => {
    it('ensures only one replica executes a scheduled slot under concurrent contention', async () => {
      const runs = new Set();

      const pool = {
        query: async (sql, params = []) => {
          const s = String(sql);
          if (s.includes('insert into public.bot_schedule_runs')) {
            const date = params[0];
            const slotId = params[1];
            const key = `${date}:${slotId}`;
            if (runs.has(key)) {
              return { rowCount: 0, rows: [] }; // Unique constraint collision
            }
            runs.add(key);
            return { rowCount: 1, rows: [{ slot_id: slotId }] };
          }
          return { rowCount: 0, rows: [] };
        }
      };

      // 5 concurrent scheduler ticks for the exact same slot and date
      const slot = { scheduleDate: '2026-09-05', id: 'dawn_digest', name: 'Dawn Digest', scheduledFor: '2026-09-05T07:00:00+05:30' };
      const attempts = await Promise.all([1, 2, 3, 4, 5].map(async (replicaId) => {
        const res = await pool.query(`
          insert into public.bot_schedule_runs (schedule_date, slot_id, slot_name, scheduled_for, status)
          values ($1, $2, $3, $4, 'running')
          on conflict (schedule_date, slot_id) do nothing
          returning slot_id
        `, [slot.scheduleDate, slot.id, slot.name, slot.scheduledFor]);
        return { replicaId, claimed: res.rowCount > 0 };
      }));

      const successfulClaims = attempts.filter(a => a.claimed);
      expect(successfulClaims.length).toBe(1);
      expect(attempts.filter(a => !a.claimed).length).toBe(4);
    });
  });
});
