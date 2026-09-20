import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateDeliveryId,
  EditorialDispatchCoordinator
} from '../src/services/editorial-dispatch-coordinator.js';

describe('Editorial Governance Stage 4 Caller Contract Suite', () => {

  describe('1. Deterministic Delivery ID & Content Binding Invariants', () => {
    it('generates identical delivery_id across retries for the same campaign, slot, platform, surface, and content', () => {
      const id1 = generateDeliveryId({
        campaign: 'fomo',
        slotId: 'day3_am',
        platform: 'instagram',
        surface: 'carousel',
        content: '“A sentence left in the dark overnight gathers weight.”'
      });

      const id2 = generateDeliveryId({
        campaign: 'fomo',
        slotId: 'day3_am',
        platform: 'instagram',
        surface: 'carousel',
        content: '“A sentence left in the dark overnight gathers weight.”'
      });

      expect(id1).toBe(id2);
      expect(id1).toMatch(/^deliv_fomo_day3_am_instagram_carousel$/);
    });

    it('isolates different campaigns sharing the same slot and platform', () => {
      const idFomo = generateDeliveryId({
        campaign: 'fomo',
        slotId: 'day1',
        platform: 'x',
        surface: 'tweet',
        content: 'Opening sentence.'
      });

      const idSprint = generateDeliveryId({
        campaign: 'sprint1',
        slotId: 'day1',
        platform: 'x',
        surface: 'tweet',
        content: 'Opening sentence.'
      });

      expect(idFomo).not.toBe(idSprint);
      expect(idFomo).toContain('fomo');
      expect(idSprint).toContain('sprint1');
    });

    it('rejects delivery_id reuse when content has been altered (DELIVERY_ID_CONTENT_MISMATCH)', async () => {
      const mockDb = {
        getDispatchByDeliveryId: vi.fn().mockResolvedValue({
          delivery_id: 'deliv_fomo_day1_x_tweet_12345678',
          content_hash: 'original_hash_aaa',
          status: 'in_flight'
        })
      };

      const coordinator = new EditorialDispatchCoordinator({ db: mockDb });

      await expect(coordinator.validateOrReserve({
        deliveryId: 'deliv_fomo_day1_x_tweet_12345678',
        contentHash: 'altered_hash_bbb',
        archetype: 'craft_philosophy',
        insightId: 'ins_1',
        channel: 'x'
      })).rejects.toThrow('DELIVERY_ID_CONTENT_MISMATCH');
    });
  });

  describe('2. Universal Pre-Dispatch Intent & Transaction Isolation', () => {
    it('commits in_flight intent in DB strictly BEFORE external network function is invoked', async () => {
      const callSequence = [];

      const mockDb = {
        getDispatchByDeliveryId: vi.fn().mockResolvedValue(null),
        acquireLeaseAndCreateInFlight: vi.fn().mockImplementation(async () => {
          callSequence.push('DB_COMMIT_IN_FLIGHT');
          return { success: true, reservationId: 'res_1', dispatchId: 'disp_1' };
        }),
        updateDispatchStatus: vi.fn().mockImplementation(async () => {
          callSequence.push('DB_COMMIT_PUBLISHED');
          return { success: true };
        })
      };

      const mockExternalApi = vi.fn().mockImplementation(async () => {
        callSequence.push('REMOTE_NETWORK_CALL');
        return { remotePostId: 'remote_li_123' };
      });

      const coordinator = new EditorialDispatchCoordinator({ db: mockDb });

      const result = await coordinator.coordinateDispatch({
        deliveryId: 'deliv_test_slot_linkedin_post_8f3a1b2c',
        campaign: 'test',
        platform: 'linkedin',
        surface: 'post',
        archetype: 'craft_philosophy',
        insightId: 'ins_craft_1',
        content: 'Valid craft content.',
        policyHash: 'policy_hash_test',
        dispatchFn: mockExternalApi
      });

      expect(result.status).toBe('published');
      expect(result.externalPostId).toBe('remote_li_123');
      expect(callSequence).toEqual([
        'DB_COMMIT_IN_FLIGHT',
        'REMOTE_NETWORK_CALL',
        'DB_COMMIT_PUBLISHED'
      ]);
    });

    it('fails closed when database is absent on a live run', async () => {
      const coordinator = new EditorialDispatchCoordinator({ db: null });
      await expect(coordinator.coordinateDispatch({
        deliveryId: 'deliv_no_db_123',
        campaign: 'test',
        platform: 'linkedin',
        surface: 'post',
        content: 'Valid content',
        dispatchFn: vi.fn(),
        isDryRun: false
      })).rejects.toThrow('DURABLE_STORAGE_REQUIRED');
    });
  });

  describe('3. Recovery State Machine & Ambiguous Outcomes', () => {
    it('network timeout / drop without remote ID transitions to reconciliation_required and prevents blind retry', async () => {
      let recordedStatus = null;
      let recordedFailureReason = null;

      const mockDb = {
        getDispatchByDeliveryId: vi.fn().mockResolvedValue(null),
        acquireLeaseAndCreateInFlight: vi.fn().mockResolvedValue({
          success: true, reservationId: 'res_1', dispatchId: 'disp_1'
        }),
        updateDispatchStatus: vi.fn().mockImplementation(async ({ status, failureReason }) => {
          recordedStatus = status;
          recordedFailureReason = failureReason;
          return { success: true };
        })
      };

      const mockTimeoutApi = vi.fn().mockRejectedValue(new Error('ETIMEDOUT: network disconnected'));

      const coordinator = new EditorialDispatchCoordinator({ db: mockDb });

      const result = await coordinator.coordinateDispatch({
        deliveryId: 'deliv_timeout_test_12345678',
        campaign: 'test',
        platform: 'x',
        surface: 'tweet',
        archetype: 'craft_philosophy',
        insightId: 'ins_craft_1',
        content: 'Valid text.',
        policyHash: 'policy_hash_test',
        dispatchFn: mockTimeoutApi
      });

      expect(result.status).toBe('reconciliation_required');
      expect(recordedStatus).toBe('reconciliation_required');
      expect(recordedFailureReason).toContain('ETIMEDOUT');

      // Now verify retry is blocked
      mockDb.getDispatchByDeliveryId.mockResolvedValue({
        delivery_id: 'deliv_timeout_test_12345678',
        content_hash: result.contentHash,
        status: 'reconciliation_required'
      });

      const retryResult = await coordinator.coordinateDispatch({
        deliveryId: 'deliv_timeout_test_12345678',
        campaign: 'test',
        platform: 'x',
        surface: 'tweet',
        archetype: 'craft_philosophy',
        insightId: 'ins_craft_1',
        content: 'Valid text.',
        policyHash: 'policy_hash_test',
        dispatchFn: mockTimeoutApi
      });

      expect(retryResult.status).toBe('blocked');
      expect(retryResult.reason).toBe('DISPATCH_RECONCILIATION_REQUIRED');
      expect(mockTimeoutApi).toHaveBeenCalledTimes(1); // Did NOT call remote API second time!
    });

    it('remote success with subsequent DB write failure captures emergency audit payload', async () => {
      let auditLogCaptured = null;

      const mockDb = {
        getDispatchByDeliveryId: vi.fn().mockResolvedValue(null),
        acquireLeaseAndCreateInFlight: vi.fn().mockResolvedValue({
          success: true, reservationId: 'res_1', dispatchId: 'disp_1'
        }),
        updateDispatchStatus: vi.fn().mockRejectedValue(new Error('DB_CONN_CRASH_POST_SUCCESS'))
      };

      const mockApi = vi.fn().mockResolvedValue({ remotePostId: 'remote_meta_ig_9999' });

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn().mockImplementation((msg, data) => {
          auditLogCaptured = { msg, data };
        })
      };

      const coordinator = new EditorialDispatchCoordinator({ db: mockDb, log: mockLogger });

      const result = await coordinator.coordinateDispatch({
        deliveryId: 'deliv_db_crash_test_12345678',
        campaign: 'test',
        platform: 'instagram',
        surface: 'reel',
        archetype: 'craft_philosophy',
        insightId: 'ins_craft_1',
        content: 'Valid video.',
        policyHash: 'policy_hash_test',
        dispatchFn: mockApi
      });

      expect(result.status).toBe('unresolved_db_failure_after_remote_success');
      expect(result.remotePostId).toBe('remote_meta_ig_9999');
      expect(auditLogCaptured).not.toBeNull();
      expect(auditLogCaptured.data.remotePostId).toBe('remote_meta_ig_9999');
      expect(auditLogCaptured.data.deliveryId).toBe('deliv_db_crash_test_12345678');
    });

    it('traps explicit remote rejections instead of marking them published', async () => {
      let recordedStatus = null;
      let recordedFailureReason = null;

      const mockDb = {
        getDispatchByDeliveryId: vi.fn().mockResolvedValue(null),
        acquireLeaseAndCreateInFlight: vi.fn().mockResolvedValue({
          success: true, reservationId: 'res_1', dispatchId: 'disp_1'
        }),
        updateDispatchStatus: vi.fn().mockImplementation(async ({ status, failureReason }) => {
          recordedStatus = status;
          recordedFailureReason = failureReason;
          return { success: true };
        })
      };

      const mockRejectedApi = vi.fn().mockResolvedValue({ success: false, error: 'rejected' });
      const coordinator = new EditorialDispatchCoordinator({ db: mockDb });

      const result = await coordinator.coordinateDispatch({
        deliveryId: 'deliv_explicit_reject',
        campaign: 'test',
        platform: 'x',
        surface: 'tweet',
        content: 'Valid text.',
        dispatchFn: mockRejectedApi
      });

      expect(result.status).toBe('reconciliation_required');
      expect(recordedStatus).toBe('reconciliation_required');
      expect(recordedFailureReason).toBe('rejected');
    });
  });

  describe('4. Dry-Run & Cooldown Skip Protections', () => {
    it('dry-run performs zero database writes and zero external network calls', async () => {
      const mockDb = {
        acquireLeaseAndCreateInFlight: vi.fn(),
        updateDispatchStatus: vi.fn(),
        getDispatchByDeliveryId: vi.fn()
      };
      const mockRemote = vi.fn();

      const coordinator = new EditorialDispatchCoordinator({ db: mockDb });

      const result = await coordinator.coordinateDispatch({
        deliveryId: 'deliv_dry_run_test_12345678',
        campaign: 'test',
        platform: 'linkedin',
        surface: 'single_image',
        archetype: 'craft_philosophy',
        insightId: 'ins_craft_1',
        content: 'Dry run commentary.',
        policyHash: 'policy_hash_test',
        dispatchFn: mockRemote,
        isDryRun: true
      });

      expect(result.status).toBe('dry_run_passed');
      expect(mockDb.acquireLeaseAndCreateInFlight).not.toHaveBeenCalled();
      expect(mockDb.updateDispatchStatus).not.toHaveBeenCalled();
      expect(mockRemote).not.toHaveBeenCalled();
    });

    it('distinguishes cooldown skips from operational failures', async () => {
      const mockDb = {
        getDispatchByDeliveryId: vi.fn().mockResolvedValue(null),
        acquireLeaseAndCreateInFlight: vi.fn().mockResolvedValue({
          success: false,
          reason: 'ARCHETYPE_COOLDOWN_ACTIVE'
        })
      };
      const mockRemote = vi.fn();

      const coordinator = new EditorialDispatchCoordinator({ db: mockDb });

      const result = await coordinator.coordinateDispatch({
        deliveryId: 'deliv_cooldown_test_12345678',
        campaign: 'test',
        platform: 'x',
        surface: 'tweet',
        archetype: 'craft_philosophy',
        insightId: 'ins_craft_1',
        content: 'Cooldown text.',
        policyHash: 'policy_hash_test',
        dispatchFn: mockRemote
      });

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('ARCHETYPE_COOLDOWN_ACTIVE');
      expect(result.isOperationalFailure).toBe(false);
      expect(mockRemote).not.toHaveBeenCalled();
    });
  });

  describe('5. Platform Scope & Single-Surface Invariant', () => {
    it('enforces single intended platform and surface without fan-out', async () => {
      const mockRemote = vi.fn().mockResolvedValue({ remotePostId: 'remote_x_456' });
      const mockDb = {
        getDispatchByDeliveryId: vi.fn().mockResolvedValue(null),
        acquireLeaseAndCreateInFlight: vi.fn().mockResolvedValue({
          success: true, reservationId: 'res_1', dispatchId: 'disp_1'
        }),
        updateDispatchStatus: vi.fn().mockResolvedValue({ success: true })
      };

      const coordinator = new EditorialDispatchCoordinator({ db: mockDb });

      const result = await coordinator.coordinateDispatch({
        deliveryId: 'deliv_single_surface_x_12345678',
        campaign: 'test',
        platform: 'x',
        surface: 'tweet',
        archetype: 'craft_philosophy',
        insightId: 'ins_craft_1',
        content: 'Single surface only.',
        policyHash: 'policy_hash_test',
        dispatchFn: mockRemote
      });

      expect(result.platform).toBe('x');
      expect(result.surface).toBe('tweet');
      expect(mockRemote).toHaveBeenCalledTimes(1);
    });

    it('respects REDDIT_PAUSED guard even if requested', async () => {
      const mockRemote = vi.fn();
      const mockDb = {};

      const coordinator = new EditorialDispatchCoordinator({ db: mockDb, redditPaused: true });

      const result = await coordinator.coordinateDispatch({
        deliveryId: 'deliv_reddit_paused_12345678',
        campaign: 'test',
        platform: 'reddit',
        surface: 'post',
        archetype: 'craft_philosophy',
        insightId: 'ins_craft_1',
        content: 'Reddit text.',
        policyHash: 'policy_hash_test',
        dispatchFn: mockRemote
      });

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('REDDIT_PAUSED');
      expect(mockRemote).not.toHaveBeenCalled();
    });
  });
});
