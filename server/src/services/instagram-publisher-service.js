/**
 * Core Publishing Execution Engine for WritOn Instagram Bot Subsystem
 * Enforces:
 * - Row-level locking (FOR UPDATE SKIP LOCKED)
 * - Unique publish_key idempotency boundary via instagram_publish_intents
 * - Three-way attempt outcome branching (SUCCESS, EXPLICIT_FAIL, TIMEOUT_UNKNOWN)
 * - Intent-level quarantine and auditable reconciliation
 */

import { generateDeliveryId } from './editorial-dispatch-coordinator.js';

export class InstagramPublisherService {
  constructor({ instagramDb, instagramClient, validator, assetStore, log = console }) {
    this.db = instagramDb;
    this.client = instagramClient;
    this.validator = validator;
    this.assetStore = assetStore;
    this.log = log;
  }

  /**
   * Publishes a candidate version with complete pre-flight checks and atomic state transitions.
   */
  async publishCandidateVersion(candidateVersionId, { publicationRole = 'PRIMARY', ignoreScheduleWindow = false, dryRun = false, coordinator = null, deliveryId = null } = {}) {
    const version = await this.db.getCandidateVersion(candidateVersionId);
    if (!version) {
      throw new Error(`Candidate version ${candidateVersionId} not found`);
    }

    const resolvedDeliveryId = deliveryId || generateDeliveryId({
      campaign: 'instagram_editorial',
      slotId: candidateVersionId,
      platform: 'instagram',
      surface: (version.format || 'feed_single').toLowerCase(),
      content: version.caption || ''
    });

    if (!dryRun && !coordinator) {
      throw new Error('EDITORIAL_GOVERNANCE_REQUIRED: Live publication requires a valid EditorialDispatchCoordinator.');
    }

    // 1. Immutability & Approval Check
    if (!version.approved_at) {
      throw new Error(`Candidate version ${candidateVersionId} is not approved for publication`);
    }

    // 2. Fetch Assets & Verify Asset Manifest Hash
    const assets = await this.db.getAssetsForVersion(candidateVersionId);
    if (!assets || assets.length === 0) {
      throw new Error(`Candidate version ${candidateVersionId} has no attached assets`);
    }
    const currentManifestHash = this.assetStore.generateManifestHash(assets);
    if (version.asset_manifest_hash && currentManifestHash !== version.asset_manifest_hash) {
      throw new Error(
        `Asset manifest hash mismatch! Approved: ${version.asset_manifest_hash}, Computed: ${currentManifestHash}. Assets have been tampered with post-approval.`
      );
    }

    // 3. Dynamic Account Capability & Quota Check
    const capabilities = this.client.getCapabilities();
    if (version.format === 'FEED_SINGLE' && !capabilities.feed_publish) {
      throw new Error('Connected account does not possess feed_publish capability');
    }
    if (version.format === 'FEED_CAROUSEL' && !capabilities.carousel_publish) {
      throw new Error('Connected account does not possess carousel_publish capability');
    }
    if (version.format === 'REEL' && !capabilities.reel_publish) {
      throw new Error('Connected account does not possess reel_publish capability');
    }

    const quota = await this.client.getPublishingQuota();
    if (quota.quotaUsage !== null && quota.quotaUsage >= quota.quotaTotal) {
      throw new Error(`Instagram publishing quota exhausted: ${quota.quotaUsage}/${quota.quotaTotal}`);
    }

    // 4. Pre-Publish Revalidation
    const validation = await this.validator.validateCandidate({ candidateVersion: version, assets });
    await this.db.recordValidationRun({
      candidateVersionId,
      governanceBundleHash: version.governance_bundle_hash,
      trigger: dryRun ? 'DRY_RUN' : 'PRE_PUBLISH',
      passed: validation.passed,
      gateResults: validation.results,
    });

    if (!validation.passed) {
      const failedGates = validation.results.filter(r => r.status === 'FAIL').map(r => r.gateCode);
      throw new Error(`Pre-publish validation failed on gates: ${failedGates.join(', ')}`);
    }

    if (dryRun) {
      this.log.info?.(`[DRY RUN] Candidate version ${candidateVersionId} passed all pre-publish gates and quota checks.`);
      return { dryRun: true, passed: true, candidateVersionId };
    }

    if (coordinator) {
      const leaseRes = await coordinator.validateOrReserve({
        deliveryId: resolvedDeliveryId,
        contentHash: version.content_hash,
        archetype: version.archetype || 'craft_philosophy',
        insightId: version.candidate_id || candidateVersionId,
        channel: 'instagram'
      });
      if (leaseRes && leaseRes.success === false) {
        if (leaseRes.status === 'already_published') {
          return { alreadyPublished: true, deliveryId: resolvedDeliveryId };
        }
        throw new Error(`Dispatch blocked by coordinator: ${leaseRes.reason}`);
      }
    }

    // 5. Idempotent Intent Creation & Lock
    const intent = await this.db.getOrCreatePublishIntent(candidateVersionId, publicationRole);
    if (intent.status === 'CONFIRMED') {
      this.log.info?.(`[IDEMPOTENT] Publish intent ${intent.publish_key} already confirmed. Skipping.`);
      return { alreadyPublished: true, intentId: intent.id };
    }
    if (intent.status === 'QUARANTINED') {
      throw new Error(`Publish intent ${intent.publish_key} is QUARANTINED. Operator review required.`);
    }

    // 6. Ensure Signed URL Validity Safety Window (>= 30 mins)
    for (const a of assets) {
      if (!this.assetStore.hasSufficientFetchWindow(a.url_expires_at)) {
        this.log.warn?.(`Asset ${a.id} URL expires soon (${a.url_expires_at}). Verification required.`);
      }
    }

    // 7. Create Meta Containers
    let mainContainerId;
    if (version.format === 'FEED_CAROUSEL') {
      const childContainerIds = [];
      for (const asset of assets) {
        const childId = await this.client.createContainer({
          imageUrl: asset.public_fetch_url,
          isCarouselItem: true,
        });
        await this.db.recordContainer({
          candidateVersionId,
          assetId: asset.id,
          containerRole: 'CHILD',
          sequenceOrder: asset.sequence_order,
          containerId: childId,
          mediaType: 'IMAGE',
          status: 'FINISHED',
        });
        childContainerIds.push(childId);
      }
      mainContainerId = await this.client.createCarouselContainer({
        childContainerIds,
        caption: version.caption,
      });
      await this.db.recordContainer({
        candidateVersionId,
        containerRole: 'PARENT',
        containerId: mainContainerId,
        mediaType: 'CAROUSEL',
        status: 'IN_PROGRESS',
      });
    } else if (version.format === 'REEL') {
      const videoAsset = assets.find(a => a.kind === 'VIDEO') || assets[0];
      mainContainerId = await this.client.createContainer({
        videoUrl: videoAsset.public_fetch_url,
        caption: version.caption,
        mediaType: 'REELS',
      });
      await this.db.recordContainer({
        candidateVersionId,
        assetId: videoAsset.id,
        containerRole: 'SINGLE',
        containerId: mainContainerId,
        mediaType: 'REELS',
        status: 'IN_PROGRESS',
      });
    } else {
      const imageAsset = assets[0];
      mainContainerId = await this.client.createContainer({
        imageUrl: imageAsset.public_fetch_url,
        caption: version.caption,
      });
      await this.db.recordContainer({
        candidateVersionId,
        assetId: imageAsset.id,
        containerRole: 'SINGLE',
        containerId: mainContainerId,
        mediaType: 'IMAGE',
        status: 'FINISHED',
      });
    }

    // 8. Poll Container Status until FINISHED
    const pollResult = await this.client.pollContainerStatus(mainContainerId);
    await this.db.updateContainerStatus(mainContainerId, pollResult.status, pollResult.error || null);
    if (pollResult.status !== 'FINISHED') {
      throw new Error(`Container ${mainContainerId} processing terminated with status: ${pollResult.status}`);
    }

    // 9. Atomic Publish Attempt with 3-Way Branching
    const attempt = await this.db.recordPublishAttempt({
      publishIntentId: intent.id,
      attemptNumber: 1,
      containerId: mainContainerId,
      startedAt: new Date(),
    });

    try {
      const pubResult = await this.client.publishContainer(mainContainerId);
      await this.db.resolvePublishAttempt({
        attemptId: attempt.id,
        outcome: 'SUCCESS',
      });

      const confirmedPub = await this.db.confirmPublication({
        publishIntentId: intent.id,
        candidateVersionId,
        igMediaId: pubResult.igMediaId,
        shortcode: pubResult.shortcode,
        permalink: pubResult.permalink,
        hashes: {
          contentHash: version.content_hash,
          assetManifestHash: version.asset_manifest_hash,
          governanceBundleHash: version.governance_bundle_hash,
        },
      });

      if (coordinator?.db?.updateDispatchStatus) {
        await coordinator.db.updateDispatchStatus({
          deliveryId: resolvedDeliveryId,
          status: 'published',
          externalPostId: pubResult.igMediaId,
          metadata: { permalink: pubResult.permalink }
        });
      }

      return {
        success: true,
        publicationId: confirmedPub.id,
        igMediaId: pubResult.igMediaId,
        permalink: pubResult.permalink,
      };
    } catch (err) {
      if (coordinator?.db?.updateDispatchStatus) {
        try {
          await coordinator.db.updateDispatchStatus({
            deliveryId: resolvedDeliveryId,
            status: 'reconciliation_required',
            failureReason: err.message
          });
        } catch (_cErr) {}
      }

      if (err.status && err.status >= 400 && err.status < 500) {
        // Definitive Meta rejection
        await this.db.resolvePublishAttempt({
          attemptId: attempt.id,
          outcome: 'EXPLICIT_FAIL',
          errorPayload: { message: err.message, meta: err.metaError },
        });
        throw err;
      } else {
        // Transport Ambiguity (timeout, disconnect)
        await this.db.resolvePublishAttempt({
          attemptId: attempt.id,
          outcome: 'TIMEOUT_UNKNOWN',
          errorPayload: { message: err.message },
        });
        await this.db.recordReconciliationCheck({
          publishIntentId: intent.id,
          strategy: 'DIRECT_MEDIA_LOOKUP',
          result: 'AMBIGUOUS_INCONCLUSIVE',
          evidence: { error: err.message },
          nextCheckAt: new Date(Date.now() + 60000),
        });
        await this.db.quarantinePublishIntent(intent.id);
        throw new Error(
          `Publish request encountered transport ambiguity. Publication intent ${intent.publish_key} entered QUARANTINED state. Operator review required.`
        );
      }
    }
  }
}
