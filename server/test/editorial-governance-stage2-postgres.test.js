import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateStagingDatabaseTarget } from '../src/scripts/staging-database-guard.js';

const { Client } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);

const isStagingAvailable = Boolean(process.env.STAGING_DATABASE_URL);

let isConnected = false;

describe.skipIf(!isStagingAvailable)('Editorial Brain Real PostgreSQL Concurrency Tests', () => {
  let connectionString;
  let client1;
  let client2;

  beforeAll(async () => {
    try {
      connectionString = validateStagingDatabaseTarget({
        stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
        productionDatabaseUrl: process.env.DATABASE_URL,
        allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
        expectedProjectRef: STAGING_PROJECT_REF,
      });

      const databaseHost = new URL(connectionString).hostname;
      const sslConfig = ['localhost', '127.0.0.1', '::1'].includes(databaseHost)
        ? false
        : {
            ca: await readFile(fileURLToPath(certificateUrl), 'utf8'),
            rejectUnauthorized: true,
          };

      client1 = new Client({ connectionString, ssl: sslConfig });
      client2 = new Client({ connectionString, ssl: sslConfig });

      await client1.connect();
      await client2.connect();
      isConnected = true;
    } catch (err) {
      console.warn(`[test] Skipping real PostgreSQL concurrency tests: ${err.message}`);
      if (client1) await client1.end().catch(() => {});
      if (client2) await client2.end().catch(() => {});
      client1 = null;
      client2 = null;
    }
  });

  afterAll(async () => {
    if (client1) await client1.end().catch(() => {});
    if (client2) await client2.end().catch(() => {});
  });

  beforeEach(async () => {
    if (client1) await client1.query('ROLLBACK').catch(() => {});
    if (client2) await client2.query('ROLLBACK').catch(() => {});
  });

  it('Test 1A: Overlapping concurrency contention — Client 1 holds transaction lock, Client 2 blocks, Client 1 COMMITS -> Client 2 receives ARCHETYPE_RESERVATION_ACTIVE', async () => {
    if (!isConnected || !client1 || !client2) return;
    const archetype = `test_arch_commit_${Date.now()}`;
    const deliveryId1 = `test_del_1_${Date.now()}`;
    const deliveryId2 = `test_del_2_${Date.now()}`;
    const insight1 = `insight_alpha_${Date.now()}`;
    const insight2 = `insight_beta_${Date.now()}`;

    const pid1 = (await client1.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const pid2 = (await client2.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;

    let client2Promise = Promise.resolve();

    try {
      // Client 1 begins transaction and acquires lease (holding pg_advisory_xact_lock)
      await client1.query('BEGIN');
      const res1 = await client1.query(`
        SELECT public.acquire_editorial_insight_lease($1, $2, $3, $4, $5, $6) AS result;
      `, [deliveryId1, archetype, insight1, 'instagram', 'worker_1', 900]);
      expect(res1.rows[0].result.success).toBe(true);

      // Client 2 begins transaction and issues acquire query concurrently WITHOUT awaiting it
      await client2.query('BEGIN');
      let client2Resolved = false;
      client2Promise = client2.query(`
        SELECT public.acquire_editorial_insight_lease($1, $2, $3, $4, $5, $6) AS result;
      `, [deliveryId2, archetype, insight2, 'linkedin', 'worker_2', 900]).then(res => {
        client2Resolved = true;
        return res;
      });

      // Bounded check of PostgreSQL's actual lock manager (pg_locks + pg_blocking_pids)
      // to prove Client 2 (pid2) is actively blocked specifically by Client 1 (pid1) on an advisory lock
      let isBlockedInLockTable = false;
      let isBlockedByClient1 = false;
      const deadline1 = Date.now() + 3000;
      while (Date.now() < deadline1) {
        const lockCheck = await client1.query(`
          SELECT
            EXISTS (
              SELECT 1 FROM pg_locks
              WHERE pid = $1 AND locktype = 'advisory' AND NOT granted
            ) AS is_waiting_advisory,
            $2 = ANY(pg_blocking_pids($1)) AS is_blocked_by_client1;
        `, [pid2, pid1]);

        if (lockCheck.rows[0].is_waiting_advisory && lockCheck.rows[0].is_blocked_by_client1) {
          isBlockedInLockTable = true;
          isBlockedByClient1 = true;
          break;
        }
        await new Promise(r => setTimeout(r, 15));
      }

      expect(isBlockedInLockTable).toBe(true);
      expect(isBlockedByClient1).toBe(true);
      expect(client2Resolved).toBe(false);

      // Client 1 commits transaction, releasing lock and persisting active reservation
      await client1.query('COMMIT');

      // Client 2 now unblocks
      const res2 = await client2Promise;
      expect(client2Resolved).toBe(true);
      await client2.query('ROLLBACK');

      expect(res2.rows[0].result.success).toBe(false);
      expect(res2.rows[0].result.reason).toBe('ARCHETYPE_RESERVATION_ACTIVE');
    } finally {
      await client1.query('ROLLBACK').catch(() => {});
      try {
        await Promise.race([client2Promise, new Promise(r => setTimeout(r, 500))]);
      } catch {}
      await client2.query('ROLLBACK').catch(() => {});
    }
  });

  it('Test 1B: Overlapping concurrency contention — Client 1 holds transaction lock, Client 2 blocks, Client 1 ROLLS BACK -> Client 2 successfully acquires lease', async () => {
    if (!isConnected || !client1 || !client2) return;
    const archetype = `test_arch_rollback_${Date.now()}`;
    const deliveryId1 = `test_del_rb_1_${Date.now()}`;
    const deliveryId2 = `test_del_rb_2_${Date.now()}`;
    const insight1 = `insight_rb_alpha_${Date.now()}`;
    const insight2 = `insight_rb_beta_${Date.now()}`;

    const pid1 = (await client1.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const pid2 = (await client2.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;

    let client2Promise = Promise.resolve();

    try {
      // Client 1 begins transaction and acquires lease (holding pg_advisory_xact_lock)
      await client1.query('BEGIN');
      const res1 = await client1.query(`
        SELECT public.acquire_editorial_insight_lease($1, $2, $3, $4, $5, $6) AS result;
      `, [deliveryId1, archetype, insight1, 'instagram', 'worker_1', 900]);
      expect(res1.rows[0].result.success).toBe(true);

      // Client 2 begins transaction and issues acquire query concurrently WITHOUT awaiting it
      await client2.query('BEGIN');
      let client2Resolved = false;
      client2Promise = client2.query(`
        SELECT public.acquire_editorial_insight_lease($1, $2, $3, $4, $5, $6) AS result;
      `, [deliveryId2, archetype, insight2, 'linkedin', 'worker_2', 900]).then(res => {
        client2Resolved = true;
        return res;
      });

      // Bounded check of PostgreSQL's actual lock manager (pg_locks + pg_blocking_pids)
      // to prove Client 2 (pid2) is actively blocked specifically by Client 1 (pid1) on an advisory lock
      let isBlockedInLockTable2 = false;
      let isBlockedByClient1 = false;
      const deadline2 = Date.now() + 3000;
      while (Date.now() < deadline2) {
        const lockCheck = await client1.query(`
          SELECT
            EXISTS (
              SELECT 1 FROM pg_locks
              WHERE pid = $1 AND locktype = 'advisory' AND NOT granted
            ) AS is_waiting_advisory,
            $2 = ANY(pg_blocking_pids($1)) AS is_blocked_by_client1;
        `, [pid2, pid1]);

        if (lockCheck.rows[0].is_waiting_advisory && lockCheck.rows[0].is_blocked_by_client1) {
          isBlockedInLockTable2 = true;
          isBlockedByClient1 = true;
          break;
        }
        await new Promise(r => setTimeout(r, 15));
      }

      expect(isBlockedInLockTable2).toBe(true);
      expect(isBlockedByClient1).toBe(true);
      expect(client2Resolved).toBe(false);

      // Client 1 rolls back transaction, releasing lock without persisting reservation
      await client1.query('ROLLBACK');

      // Client 2 now unblocks and succeeds in acquiring the lease
      const res2 = await client2Promise;
      expect(client2Resolved).toBe(true);
      await client2.query('COMMIT');

      expect(res2.rows[0].result.success).toBe(true);
      expect(res2.rows[0].result.reservation_id).toBeDefined();
      expect(res2.rows[0].result.lease_token).toBeDefined();
    } finally {
      await client1.query('ROLLBACK').catch(() => {});
      try {
        await Promise.race([client2Promise, new Promise(r => setTimeout(r, 500))]);
      } catch {}
      await client2.query('ROLLBACK').catch(() => {});
    }
  });

  it('Test 2: Unresolved in_flight dispatch blocks re-reservation permanently', async () => {
    if (!isConnected || !client1) return;
    const archetype = `test_arch_unresolved_${Date.now()}`;
    const deliveryId = `test_del_unres_${Date.now()}`;
    const insightId = `insight_unres_${Date.now()}`;

    // Insert an in_flight dispatch record directly
    await client1.query(`
      INSERT INTO public.editorial_insight_dispatches (
        delivery_id, channel, insight_id, archetype, status, content_hash, policy_hash
      ) VALUES ($1, 'x', $2, $3, 'in_flight', 'hash1', 'hash2');
    `, [deliveryId, insightId, archetype]);

    // Attempt to acquire lease for that archetype
    const res = await client1.query(`
      SELECT public.acquire_editorial_insight_lease($1, $2, $3, $4, $5, $6) AS result;
    `, [`new_del_${Date.now()}`, archetype, insightId, 'x', 'worker_1', 900]);

    expect(res.rows[0].result.success).toBe(false);
    expect(res.rows[0].result.reason).toBe('ARCHETYPE_UNRESOLVED_DISPATCH_BLOCK');
  });

  it('Test 3: Telemetry permits genuine 0.00 retention distinct from NULL', async () => {
    if (!isConnected || !client1) return;
    const deliveryId = `test_del_telemetry_${Date.now()}`;
    const insightId = `insight_tel_${Date.now()}`;
    const dispRes = await client1.query(`
      INSERT INTO public.editorial_insight_dispatches (
        delivery_id, channel, insight_id, archetype, status, content_hash, policy_hash
      ) VALUES ($1, 'youtube_shorts', $2, 'test_archetype', 'published', 'hash1', 'hash2')
      RETURNING id;
    `, [deliveryId, insightId]);

    const dispatchId = dispRes.rows[0].id;

    // Insert genuine 0.00 retention and NULL impressions (unobserved impressions)
    await client1.query(`
      INSERT INTO public.editorial_insight_observations (
        dispatch_id, "window", retention_pct, impressions
      ) VALUES ($1, '1h', 0.00, NULL);
    `, [dispatchId]);

    const obsRes = await client1.query(`
      SELECT "window", retention_pct, impressions 
      FROM public.editorial_insight_observations 
      WHERE dispatch_id = $1;
    `, [dispatchId]);

    expect(obsRes.rows[0].retention_pct).toBe('0.00');
    expect(obsRes.rows[0].impressions).toBeNull();
  });
});
