/**
 * WritOn Admin LinkedIn Subsystem Routes
 *
 * Dedicated REST API backing the LinkedIn Studio interface:
 * - GET  /api/v1/admin/linkedin/connection       (Connection, token status, capability scopes, 24h quotas)
 * - GET  /api/v1/admin/linkedin/candidates       (Brain candidates, versions, frozen approval states)
 * - POST /api/v1/admin/linkedin/candidates       (Create candidate from Editorial Brain insight)
 * - POST /api/v1/admin/linkedin/validate         (Evaluate 34 quality gates with repetition telemetry)
 * - POST /api/v1/admin/linkedin/approve          (Freeze candidate version & approve)
 * - POST /api/v1/admin/linkedin/publish          (Idempotent publish intent execution - dryRun supported)
 * - GET  /api/v1/admin/linkedin/publications     (Confirmed publications & live URLs)
 * - GET  /api/v1/admin/linkedin/quarantine       (Quarantined intents requiring operator decision)
 * - POST /api/v1/admin/linkedin/quarantine/resolve (Resolve quarantine with manual operator confirmation)
 * - GET  /api/v1/admin/linkedin/metrics          (Harvested multi-surface metrics & snapshots)
 */

import { z } from 'zod';
import { LinkedInDb } from '../services/linkedin-db.js';
import { LinkedInClient } from '../services/linkedin-client.js';
import { LinkedInMediaClient } from '../services/linkedin-media-client.js';
import { LinkedInValidatorService } from '../services/linkedin-validator-service.js';
import { LinkedInPublisherService } from '../services/linkedin-publisher-service.js';
import { loadEditorialBrain } from '../services/editorial-brain.js';
import { EditorialDispatchCoordinator, generateDeliveryId } from '../services/editorial-dispatch-coordinator.js';

export async function adminLinkedInRoutes(fastify, { pool }) {
  const db = new LinkedInDb(pool);
  const client = new LinkedInClient({ log: fastify.log });
  const mediaClient = new LinkedInMediaClient({ client, db, log: fastify.log });
  const publisher = new LinkedInPublisherService({ client, mediaClient, db, log: fastify.log });
  const validator = new LinkedInValidatorService({ brain: loadEditorialBrain(), db, log: fastify.log });

  // Auth Guard: Admin Key or Bot Secret or Dev Local
  const requireAdminAuth = async (request, reply) => {
    if (process.env.NODE_ENV === 'development' && !request.headers.authorization && !request.headers['x-admin-key']) {
      return;
    }
    const adminSecret = process.env.ADMIN_SECRET_KEY;
    const botSecret = process.env.BOT_INGEST_SECRET;
    const headerKey = request.headers['x-admin-key'];
    const headerBotSecret = request.headers['x-bot-secret'];
    const bearer = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.substring(7)
      : null;

    if (adminSecret && (headerKey === adminSecret || bearer === adminSecret)) {
      return;
    }
    if (botSecret && (headerBotSecret === botSecret || bearer === botSecret)) {
      return;
    }
    return reply.code(401).send({ error: 'Admin or bot authentication required.' });
  };

  // 1. Connection & Quota Status
  fastify.get('/api/v1/admin/linkedin/connection', { preHandler: requireAdminAuth }, async (request, reply) => {
    try {
      const connection = await db.getActiveConnection();
      if (!connection) {
        return reply.code(404).send({ error: 'No active LinkedIn connection found.' });
      }

      // Compute estimated 24h usage counters
      const usageRes = await pool.query(
        `SELECT COUNT(*) AS total_attempts_24h
         FROM public.linkedin_publish_attempts
         WHERE started_at >= NOW() - INTERVAL '24 hours'`
      );

      const attempts24h = parseInt(usageRes.rows[0]?.total_attempts_24h || '0', 10);

      return {
        authorUrn: connection.author_urn,
        isOrg: connection.is_org,
        rateTier: connection.rate_tier,
        canPublishMember: connection.can_publish_member,
        canPublishOrg: connection.can_publish_org,
        hasMemberAnalytics: connection.has_member_analytics,
        hasOrgAnalytics: connection.has_org_analytics,
        hasRefreshGrant: connection.has_refresh_grant,
        configuredAppLimit: connection.configured_app_limit,
        configuredMemberLimit: connection.configured_member_limit,
        estimatedAppUsage24h: attempts24h,
        estimatedMemberUsage24h: attempts24h,
        appLimitCeiling: 500,
        memberLimitCeiling: 100,
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to retrieve connection info.' });
    }
  });

  // 2. Candidate Ingestion from Brain or Manual Draft
  fastify.get('/api/v1/admin/linkedin/candidates', { preHandler: requireAdminAuth }, async (request, reply) => {
    try {
      const candidatesRes = await pool.query(
        `SELECT c.id, c.created_at, cv.id as version_id, cv.revision, cv.format, cv.commentary,
                cv.approved_at, cv.created_at as version_created_at,
                (SELECT COUNT(*) FROM public.linkedin_assets WHERE candidate_version_id = cv.id) as asset_count,
                (SELECT all_passed FROM public.linkedin_validation_runs WHERE candidate_version_id = cv.id ORDER BY executed_at DESC LIMIT 1) as last_validation_passed
         FROM public.linkedin_candidates c
         JOIN public.linkedin_candidate_versions cv ON cv.candidate_id = c.id
         ORDER BY c.created_at DESC
         LIMIT 50`
      );
      return { candidates: candidatesRes.rows };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to retrieve candidates.' });
    }
  });

  // 3. Create Candidate
  const candidateCreateSchema = z.object({
    format: z.enum(['TEXT_ONLY', 'SINGLE_IMAGE', 'MULTI_IMAGE', 'DOCUMENT', 'VIDEO']).default('SINGLE_IMAGE'),
    commentary: z.string().min(10),
    brainHash: z.string().optional(),
    contentHash: z.string().optional(),
    assets: z.array(z.object({
      kind: z.enum(['IMAGE', 'DOCUMENT', 'VIDEO']),
      mimeType: z.string(),
      fileSizeBytes: z.number().int().positive(),
      sha256: z.string(),
      storageUri: z.string().url(),
      localPath: z.string().optional(),
    })).optional().default([]),
  });

  fastify.post('/api/v1/admin/linkedin/candidates', { preHandler: requireAdminAuth }, async (request, reply) => {
    const parse = candidateCreateSchema.safeParse(request.body);
    if (!parse.success) return reply.code(400).send({ error: 'Invalid candidate schema', details: parse.error.issues });

    const { format, commentary, brainHash, contentHash, assets } = parse.data;

    try {
      const { candidate, version } = await db.createCandidate({
        format,
        commentary,
        hashes: {
          brainHash: brainHash || 'custom_draft',
          contentHash: contentHash || 'content_hash',
        },
      });

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        await db.addAsset({
          candidateVersionId: version.id,
          sequenceOrder: i + 1,
          kind: asset.kind,
          mimeType: asset.mimeType,
          fileSizeBytes: asset.fileSizeBytes,
          sha256: asset.sha256,
          storageUri: asset.storageUri,
          localPath: asset.localPath,
        });
      }

      return { candidateId: candidate.id, versionId: version.id };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to create candidate.' });
    }
  });

  // 4. Validate Candidate Version against 34 Quality Gates
  fastify.post('/api/v1/admin/linkedin/validate', { preHandler: requireAdminAuth }, async (request, reply) => {
    const versionId = request.body?.versionId;
    if (!versionId) return reply.code(400).send({ error: 'versionId is required' });

    try {
      const versionRes = await pool.query(
        `SELECT cv.*, c.created_at as candidate_created_at
         FROM public.linkedin_candidate_versions cv
         JOIN public.linkedin_candidates c ON cv.candidate_id = c.id
         WHERE cv.id = $1`,
        [versionId]
      );
      if (versionRes.rowCount === 0) return reply.code(404).send({ error: 'Version not found' });
      const version = versionRes.rows[0];

      const assetsRes = await pool.query(
        `SELECT * FROM public.linkedin_assets WHERE candidate_version_id = $1 ORDER BY sequence_order ASC`,
        [versionId]
      );

      const recentPubs = await db.getRecentPublications(30);

      const evalResult = validator.evaluateGates({
        commentary: version.commentary,
        format: version.format,
        mediaAssets: assetsRes.rows,
        recentPublications: recentPubs,
      });

      // Record in public.linkedin_validation_runs and results
      const runRes = await pool.query(
        `INSERT INTO public.linkedin_validation_runs (
           candidate_version_id, triggered_by, all_passed, total_gates, passed_gates, failed_gates
         ) VALUES ($1, 'ADMIN_STUDIO', $2, $3, $4, $5)
         RETURNING id`,
        [versionId, evalResult.allPassed, evalResult.totalGates, evalResult.passedGates, evalResult.failedGates]
      );
      const runId = runRes.rows[0].id;

      for (const res of evalResult.results) {
        await pool.query(
          `INSERT INTO public.linkedin_validation_results (
             run_id, gate_code, passed, failure_reason, metadata
           ) VALUES ($1, $2, $3, $4, $5)`,
          [runId, res.gateCode, res.passed, res.failureReason, JSON.stringify(res.metadata || {})]
        );
      }

      return {
        runId,
        allPassed: evalResult.allPassed,
        totalGates: evalResult.totalGates,
        passedGates: evalResult.passedGates,
        failedGates: evalResult.failedGates,
        results: evalResult.results,
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Gate evaluation failed.' });
    }
  });

  // 5. Freeze & Approve Candidate Version
  fastify.post('/api/v1/admin/linkedin/approve', { preHandler: requireAdminAuth }, async (request, reply) => {
    const versionId = request.body?.versionId;
    if (!versionId) return reply.code(400).send({ error: 'versionId is required' });

    try {
      const updated = await db.approveCandidateVersion(versionId);
      return { success: true, approvedAt: updated.approved_at };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to approve candidate version.' });
    }
  });

  // 6. Execute Idempotent Publish Intent (Dry-Run by Default)
  fastify.post('/api/v1/admin/linkedin/publish', { preHandler: requireAdminAuth }, async (request, reply) => {
    const versionId = request.body?.versionId;
    const isLive = Boolean(request.body?.live);
    if (!versionId) return reply.code(400).send({ error: 'versionId is required' });

    try {
      const candidateVersion = await db.getCandidateVersionById(versionId);
      if (!candidateVersion) {
        return reply.code(404).send({ error: `Candidate version ${versionId} not found.` });
      }

      const coordinator = new EditorialDispatchCoordinator({ db: pool, log: fastify.log });
      const deliveryId = generateDeliveryId({
        campaign: 'linkedin_studio',
        slotId: versionId,
        platform: 'linkedin',
        surface: (candidateVersion.format || 'single_image').toLowerCase(),
        content: candidateVersion.commentary
      });

      const outcome = await coordinator.coordinateDispatch({
        deliveryId,
        campaign: 'linkedin_studio',
        slotId: versionId,
        platform: 'linkedin',
        surface: (candidateVersion.format || 'single_image').toLowerCase(),
        archetype: 'craft_philosophy',
        insightId: candidateVersion.brain_hash || 'manual_draft',
        content: candidateVersion.commentary,
        policyHash: 'editorial_brain_v1',
        isDryRun: !isLive,
        dispatchFn: async () => {
          const pubResult = await publisher.publishCandidateVersion({
            candidateVersionId: versionId,
            isDryRun: false,
          });
          if (!pubResult.success) {
            throw new Error(pubResult.error || pubResult.reason || 'Publish execution failed');
          }
          return {
            remotePostId: pubResult.postUrn,
            metadata: { liveUrl: pubResult.liveUrl }
          };
        }
      });

      return outcome;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Publish execution failed.', details: err.message });
    }
  });

  // 7. Confirmed Publications
  fastify.get('/api/v1/admin/linkedin/publications', { preHandler: requireAdminAuth }, async (request, reply) => {
    try {
      const pubs = await pool.query(
        `SELECT p.*, cv.format, cv.commentary
         FROM public.linkedin_publications p
         JOIN public.linkedin_candidate_versions cv ON p.candidate_version_id = cv.id
         ORDER BY p.published_at DESC
         LIMIT 50`
      );
      return { publications: pubs.rows };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to retrieve publications.' });
    }
  });

  // 7b. Delete Post by URN
  fastify.delete('/api/v1/admin/linkedin/posts', { preHandler: requireAdminAuth }, async (request, reply) => {
    const postUrn = request.body?.postUrn || request.query?.postUrn;
    if (!postUrn) return reply.code(400).send({ error: 'postUrn is required' });

    try {
      const outcome = await client.deletePost(postUrn);
      if (outcome.success) {
        // Remove from linkedin_publications if present
        await pool.query(`DELETE FROM public.linkedin_publications WHERE linkedin_post_urn = $1`, [postUrn]);
      }
      return outcome;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete LinkedIn post.', details: err.message });
    }
  });

  // 8. Quarantine Inspection
  fastify.get('/api/v1/admin/linkedin/quarantine', { preHandler: requireAdminAuth }, async (request, reply) => {
    try {
      const quarantined = await pool.query(
        `SELECT r.*, i.candidate_version_id, p.post_urn, cv.commentary
         FROM public.linkedin_reconciliation_checks r
         JOIN public.linkedin_publish_intents i ON r.publish_intent_id = i.id
         JOIN public.linkedin_candidate_versions cv ON i.candidate_version_id = cv.id
         LEFT JOIN public.linkedin_publications p ON p.publish_intent_id = i.id
         WHERE r.result = 'QUARANTINED'
         ORDER BY r.checked_at DESC`
      );
      return { items: quarantined.rows };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to retrieve quarantined checks.' });
    }
  });

  // 9. Quarantine Resolution
  fastify.post('/api/v1/admin/linkedin/quarantine/resolve', { preHandler: requireAdminAuth }, async (request, reply) => {
    const checkId = request.body?.checkId;
    const action = request.body?.action; // 'CONFIRM_PUBLISHED' or 'MARK_FAILED'
    const postUrn = request.body?.postUrn;

    if (!checkId || !action) return reply.code(400).send({ error: 'checkId and action required' });

    try {
      const checkRes = await pool.query(`SELECT * FROM public.linkedin_reconciliation_checks WHERE id = $1`, [checkId]);
      if (checkRes.rowCount === 0) return reply.code(404).send({ error: 'Reconciliation check not found' });
      const check = checkRes.rows[0];

      if (action === 'CONFIRM_PUBLISHED') {
        if (!postUrn) return reply.code(400).send({ error: 'postUrn is required for manual confirmation' });
        await pool.query(
          `UPDATE public.linkedin_publish_intents SET status = 'CONFIRMED', updated_at = now() WHERE id = $1`,
          [check.publish_intent_id]
        );
        await pool.query(
          `UPDATE public.linkedin_reconciliation_checks SET result = 'MATCHED_CONFIRMED' WHERE id = $1`,
          [checkId]
        );
        return { success: true, status: 'CONFIRMED' };
      } else {
        await pool.query(
          `UPDATE public.linkedin_publish_intents SET status = 'FAILED', updated_at = now() WHERE id = $1`,
          [check.publish_intent_id]
        );
        await pool.query(
          `UPDATE public.linkedin_reconciliation_checks SET result = 'EXPLICITLY_NOT_PUBLISHED' WHERE id = $1`,
          [checkId]
        );
        return { success: true, status: 'FAILED' };
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to resolve quarantine.' });
    }
  });

  // 11. LinkedIn Post Clock Tick (Scheduled Execution Window Evaluator)
  fastify.post('/api/v1/admin/linkedin/clock/tick', { preHandler: requireAdminAuth }, async (request, reply) => {
    const isLive = Boolean(request.body?.live);
    const windowOverride = request.body?.window; // 'MORNING', 'EVENING', or auto

    try {
      const now = new Date();
      // Calculate IST time (UTC + 5:30)
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const istHour = istTime.getUTCHours();
      const istMinute = istTime.getUTCMinutes();
      const istMinutesOfDay = (istHour * 60) + istMinute;

      // Eligibility Windows:
      // Morning: 08:30 - 10:30 IST (510 - 630 min)
      // Evening: 18:30 - 21:00 IST (1110 - 1260 min)
      const isMorning = istMinutesOfDay >= 510 && istMinutesOfDay <= 630;
      const isEvening = istMinutesOfDay >= 1110 && istMinutesOfDay <= 1260;
      const currentWindow = windowOverride || (isMorning ? 'MORNING' : isEvening ? 'EVENING' : null);

      fastify.log.info({ istHour, istMinute, currentWindow, isLive }, 'LinkedIn post clock tick received');

      // 1. Check for pending approved candidate version
      const pendingApproved = await pool.query(
        `SELECT cv.*, c.created_at as candidate_created_at
         FROM public.linkedin_candidate_versions cv
         JOIN public.linkedin_candidates c ON cv.candidate_id = c.id
         LEFT JOIN public.linkedin_publish_intents i ON i.candidate_version_id = cv.id
         WHERE cv.approved_at IS NOT NULL
           AND (i.status IS NULL OR i.status = 'PENDING')
         ORDER BY cv.approved_at ASC
         LIMIT 1`
      );

      let targetVersionId = pendingApproved.rows[0]?.id;

      // 2. If no approved candidate exists, propose dynamically from Master Editorial Brain
      if (!targetVersionId) {
        const brain = loadEditorialBrain();
        const recentPubs = await db.getRecentPublications(20);
        const { selectNextPropositionForChannel } = await import('../services/editorial-brain.js');
        const insight = selectNextPropositionForChannel({ channel: 'linkedin', format: 'SINGLE_IMAGE' }) || brain.insights[0];

        const commentary = `“${insight.hook_0_sec}”\n\n${insight.turn_2_sec}\n\n${insight.body_core}\n\nWe built WritOn for writers who care about the sentence. Claim your pen name and write with us:\nhttps://writon.cc\n\n#writing #storytelling #craft`;

        const gateEval = validator.evaluateGates({
          commentary,
          format: 'SINGLE_IMAGE',
          mediaAssets: [{ id: 'card_1' }],
          recentPublications: recentPubs,
        });

        if (!gateEval.allPassed) {
          return {
            status: 'blocked',
            reason: 'Quality gate failure during clock evaluation',
            failedGates: gateEval.results.filter(r => !r.passed).map(r => r.gateCode),
          };
        }

        const { version } = await db.createCandidate({
          format: 'SINGLE_IMAGE',
          commentary,
          hashes: {
            brainHash: insight.id,
            contentHash: 'clock_hash_tick',
          },
        });

        // Approve and freeze
        await db.approveCandidateVersion(version.id);
        targetVersionId = version.id;
      }

      // 3. Execute Publish Intent (strictly dry-run unless live=true explicitly specified)
      const dispatchOutcome = await publisher.publishCandidateVersion({
        candidateVersionId: targetVersionId,
        isDryRun: !isLive,
      });

      return {
        success: true,
        clockTimeIst: `${String(istHour).padStart(2, '0')}:${String(istMinute).padStart(2, '0')}`,
        window: currentWindow || 'OUTSIDE_WINDOW_PROCESSED',
        mode: isLive ? 'LIVE' : 'DRY_RUN',
        candidateVersionId: targetVersionId,
        outcome: dispatchOutcome,
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Post clock tick failed.', message: err.message });
    }
  });
}

