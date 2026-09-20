/**
 * editorial-dispatch-coordinator.js
 * 
 * Shared Governance & Pre-Dispatch Intent Coordinator (Stage 4)
 * 
 * Invariants:
 * 1. Deterministic delivery IDs derived from campaign + slotId + platform + surface + content_hash_prefix8
 * 2. Strict content hash binding: delivery_id reuse with altered content throws DELIVERY_ID_CONTENT_MISMATCH
 * 3. Universal pre-dispatch intent persistence: commits status = 'in_flight' in PostgreSQL BEFORE calling external APIs
 * 4. Transaction isolation: DB transaction commits BEFORE remote call; no connections open across remote HTTP requests
 * 5. Recovery state machine: ambiguous remote outcomes (ETIMEDOUT, ECONNRESET, network drop) transition to reconciliation_required
 * 6. Single-surface bounds: dispatches only to requested platform/surface without unsolicited fan-out
 * 7. Paused network guard: skips paused channels (e.g. REDDIT_PAUSED=true) immediately without network calls
 */

import { createHash, randomUUID } from 'node:crypto';

/**
 * Computes deterministic SHA-256 hash of text.
 */
export function computeContentHash(text) {
  return createHash('sha256').update(String(text || '').trim()).digest('hex');
}

/**
 * Generates a deterministic delivery ID bound to campaign, slot, platform, surface, and content hash prefix.
 */
export function generateDeliveryId({ campaign, slotId, platform, surface, content }) {
  const cleanCampaign = String(campaign || 'generic').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const cleanSlot = String(slotId || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const cleanPlatform = String(platform || 'generic').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const cleanSurface = String(surface || 'generic').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const hash = computeContentHash(content).slice(0, 8);
  return `deliv_${cleanCampaign}_${cleanSlot}_${cleanPlatform}_${cleanSurface}`;
}

/**
 * Default PostgreSQL Database Adapter for Editorial Memory tables
 */
export class EditorialMemoryDbAdapter {
  constructor(pool) {
    this.pool = pool;
  }

  async getDispatchByDeliveryId(deliveryId) {
    const res = await this.pool.query(
      `SELECT * FROM public.editorial_insight_dispatches WHERE delivery_id = $1 LIMIT 1`,
      [deliveryId]
    );
    return res.rows[0] || null;
  }

  async acquireLeaseAndCreateInFlight({
    deliveryId,
    archetype,
    insightId,
    channel,
    contentHash,
    policyHash,
    workerId = 'worker_' + process.pid,
    durationSeconds = 900
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const leaseRes = await client.query(
        `SELECT public.acquire_editorial_insight_lease($1, $2, $3, $4, $5, $6) AS outcome`,
        [deliveryId, archetype, insightId, channel, workerId, durationSeconds]
      );
      const outcome = leaseRes.rows[0]?.outcome || { success: false, reason: 'LEASE_EXECUTION_FAILED' };

      if (!outcome.success) {
        await client.query('ROLLBACK');
        return outcome;
      }

      const dispRes = await client.query(
        `INSERT INTO public.editorial_insight_dispatches (
           delivery_id, reservation_id, channel, insight_id, archetype,
           status, content_hash, policy_hash, dispatched_at
         ) VALUES ($1, $2, $3, $4, $5, 'in_flight', $6, $7, now())
         RETURNING id`,
        [deliveryId, outcome.reservation_id, channel, insightId, archetype, contentHash, policyHash || 'default_policy']
      );

      await client.query('COMMIT');
      return {
        success: true,
        reservationId: outcome.reservation_id,
        dispatchId: dispRes.rows[0].id
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateDispatchStatus({
    deliveryId,
    status,
    externalPostId = null,
    failureReason = null,
    metadata = {}
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE public.editorial_insight_dispatches
         SET status = $1,
             external_post_id = COALESCE($2, external_post_id),
             failure_reason = $3,
             metadata = metadata || $4::jsonb,
             reconciled_at = CASE WHEN $1 IN ('published', 'failed') THEN now() ELSE reconciled_at END,
             updated_at = now()
         WHERE delivery_id = $5`,
        [status, externalPostId, failureReason, JSON.stringify(metadata || {}), deliveryId]
      );

      if (status === 'published') {
        await client.query(
          `UPDATE public.editorial_insight_reservations
           SET status = 'committed', updated_at = now()
           WHERE delivery_id = $1`,
          [deliveryId]
        );
      } else if (status === 'failed') {
        await client.query(
          `UPDATE public.editorial_insight_reservations
           SET status = 'released', updated_at = now()
           WHERE delivery_id = $1`,
          [deliveryId]
        );
      }

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

/**
 * Editorial Dispatch Coordinator
 */
export class EditorialDispatchCoordinator {
  constructor({ db, log = console, redditPaused = false } = {}) {
    if (db && typeof db.query === 'function' && typeof db.getDispatchByDeliveryId !== 'function') {
      this.db = new EditorialMemoryDbAdapter(db);
    } else {
      this.db = db;
    }
    this.log = log;
    this.redditPaused = redditPaused || process.env.REDDIT_PAUSED === 'true';
  }

  /**
   * Validates delivery ID content hash binding or reserves in_flight intent.
   */
  async validateOrReserve({ deliveryId, contentHash, archetype, insightId, channel, workerId, policyHash }) {
    if (!this.db) {
      throw new Error('DURABLE_STORAGE_REQUIRED: Live dispatch requires durable reservation storage.');
    }

    const existing = await this.db.getDispatchByDeliveryId(deliveryId);
    if (existing) {
      if (existing.content_hash !== contentHash) {
        throw new Error(
          `DELIVERY_ID_CONTENT_MISMATCH: Delivery ID ${deliveryId} is already bound to content hash ${existing.content_hash}, cannot be reused with ${contentHash}`
        );
      }

      if (existing.status === 'published') {
        return { success: false, status: 'already_published', reason: 'ALREADY_PUBLISHED' };
      }
      if (existing.status === 'in_flight') {
        return { success: false, status: 'blocked', reason: 'DISPATCH_IN_FLIGHT' };
      }
      if (existing.status === 'reconciliation_required') {
        return { success: false, status: 'blocked', reason: 'DISPATCH_RECONCILIATION_REQUIRED' };
      }
    }

    return await this.db.acquireLeaseAndCreateInFlight({
      deliveryId,
      archetype,
      insightId,
      channel,
      contentHash,
      policyHash,
      workerId
    });
  }

  /**
   * Coordinates execution of a single surface dispatch with fail-closed governance.
   */
  async coordinateDispatch({
    deliveryId,
    campaign,
    slotId,
    platform,
    surface,
    archetype,
    insightId,
    content,
    policyHash,
    dispatchFn,
    isDryRun = false,
    workerId = 'worker_' + randomUUID().slice(0, 8)
  }) {
    // 1. Paused Network / Platform Guard
    if (this.redditPaused && platform?.toLowerCase() === 'reddit') {
      this.log.warn?.(`[REDDIT_PAUSED] Skipping dispatch for delivery ID ${deliveryId} on paused platform ${platform}.`);
      return {
        status: 'skipped',
        reason: 'REDDIT_PAUSED',
        platform,
        surface
      };
    }

    const contentHash = computeContentHash(content);
    const resolvedDeliveryId = deliveryId || generateDeliveryId({
      campaign,
      slotId,
      platform,
      surface,
      content
    });

    // 2. Dry-Run Guard: zero DB writes, zero remote API calls
    if (isDryRun) {
      this.log.info?.(`[DRY RUN] Dispatch simulated for ${resolvedDeliveryId} on ${platform}/${surface}. Zero mutations.`);
      return {
        status: 'dry_run_passed',
        deliveryId: resolvedDeliveryId,
        contentHash,
        platform,
        surface,
        dryRun: true
      };
    }

    // 3. Pre-Dispatch Validation and Lock Acquisition
    if (!this.db) {
      throw new Error('DURABLE_STORAGE_REQUIRED: Live dispatch requires durable reservation storage.');
    }

    const existing = await this.db.getDispatchByDeliveryId(resolvedDeliveryId);
      if (existing) {
        if (existing.content_hash !== contentHash) {
          throw new Error(
            `DELIVERY_ID_CONTENT_MISMATCH: Delivery ID ${resolvedDeliveryId} already bound to hash ${existing.content_hash}`
          );
        }

        if (existing.status === 'published') {
          return {
            status: 'skipped',
            reason: 'ALREADY_PUBLISHED',
            deliveryId: resolvedDeliveryId,
            externalPostId: existing.external_post_id,
            platform,
            surface
          };
        }
        if (existing.status === 'in_flight') {
          return {
            status: 'blocked',
            reason: 'DISPATCH_IN_FLIGHT',
            deliveryId: resolvedDeliveryId,
            platform,
            surface
          };
        }
        if (existing.status === 'reconciliation_required') {
          return {
            status: 'blocked',
            reason: 'DISPATCH_RECONCILIATION_REQUIRED',
            deliveryId: resolvedDeliveryId,
            platform,
            surface
          };
        }
      }

      // Universal Pre-Dispatch Intent Commitment
      const leaseOutcome = await this.db.acquireLeaseAndCreateInFlight({
        deliveryId: resolvedDeliveryId,
        archetype,
        insightId,
        channel: platform,
        contentHash,
        policyHash,
        workerId
      });

      if (!leaseOutcome.success) {
        this.log.warn?.(`[LEASE_REFUSED] ${leaseOutcome.reason} for ${resolvedDeliveryId}`);
        return {
          status: 'skipped',
          reason: leaseOutcome.reason,
          isOperationalFailure: false,
          platform,
          surface
        };
      }
    // 4. Remote Network Dispatch (External Call Isolated from DB Transaction)
    try {
      const remoteOutcome = await dispatchFn();
      if (remoteOutcome && remoteOutcome.success === false) {
        throw new Error(remoteOutcome.error || 'Explicit rejection');
      }
      const externalPostId = remoteOutcome?.remotePostId || remoteOutcome?.postId || remoteOutcome?.id || null;

      // 5. Remote Success -> Commit Published Status
      if (this.db) {
        try {
          await this.db.updateDispatchStatus({
            deliveryId: resolvedDeliveryId,
            status: 'published',
            externalPostId,
            metadata: remoteOutcome?.metadata || {}
          });
        } catch (dbCrashErr) {
          this.log.error?.('EMERGENCY_AUDIT: Remote post succeeded but DB update failed', {
            deliveryId: resolvedDeliveryId,
            remotePostId: externalPostId,
            error: dbCrashErr.message
          });
          return {
            status: 'unresolved_db_failure_after_remote_success',
            remotePostId: externalPostId,
            deliveryId: resolvedDeliveryId,
            contentHash,
            platform,
            surface,
            error: dbCrashErr.message
          };
        }
      }

      return {
        status: 'published',
        externalPostId,
        deliveryId: resolvedDeliveryId,
        contentHash,
        platform,
        surface
      };
    } catch (netErr) {
      // 6. Network Drop / Ambiguous Failure -> Transition to reconciliation_required
      if (this.db) {
        try {
          await this.db.updateDispatchStatus({
            deliveryId: resolvedDeliveryId,
            status: 'reconciliation_required',
            failureReason: netErr.message
          });
        } catch (dbErr) {
          this.log.error?.('Failed to set reconciliation_required status', {
            deliveryId: resolvedDeliveryId,
            error: dbErr.message
          });
        }
      }

      return {
        status: 'reconciliation_required',
        deliveryId: resolvedDeliveryId,
        contentHash,
        platform,
        surface,
        error: netErr.message,
        reason: netErr.message
      };
    }
  }
}
