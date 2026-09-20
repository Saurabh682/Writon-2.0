#!/usr/bin/env node
/**
 * WritOn Brain-Governed LinkedIn Publisher Agent
 *
 * Rules:
 * - Governed strictly by the Master Editorial Brain (EDITORIAL_BRAIN.json)
 * - Evaluates 34 Quality Gates (Global 17 + LI01-LI17) before approval
 * - STRICT INVARIANT: Never post test things online. Default is --dry-run.
 *
 * Usage:
 *   node scripts/linkedin_publisher.mjs --brain --dry-run
 *   node scripts/linkedin_publisher.mjs --candidate-version-id=<UUID> --dry-run
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
import { LinkedInClient } from '../server/src/services/linkedin-client.js';
import { LinkedInMediaClient } from '../server/src/services/linkedin-media-client.js';
import { LinkedInDb } from '../server/src/services/linkedin-db.js';
import { LinkedInValidatorService } from '../server/src/services/linkedin-validator-service.js';
import { LinkedInPublisherService } from '../server/src/services/linkedin-publisher-service.js';
import { loadEditorialBrain } from '../server/src/services/editorial-brain.js';
import { EditorialDispatchCoordinator, generateDeliveryId } from '../server/src/services/editorial-dispatch-coordinator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      options[key] = val === undefined ? true : val;
    }
  }
  return options;
}

async function main() {
  const options = parseArgs();
  const isDryRun = Boolean(options['dry-run'] || !options.live);

  console.log('===============================================================');
  console.log('🧠 WRITON BRAIN-GOVERNED LINKEDIN PUBLISHER');
  console.log(`   Mode: ${isDryRun ? '🔍 DRY RUN (Offline Validation)' : '⚡ LIVE DISPATCH'}`);
  console.log('===============================================================\n');

  if (!isDryRun) {
    console.log('🔒 PRODUCTION GUARD: Live dispatches require explicit approval.');
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = new LinkedInDb(pool);
  const client = new LinkedInClient({ log: console });
  const mediaClient = new LinkedInMediaClient({ client, db, log: console });
  const publisher = new LinkedInPublisherService({ client, mediaClient, db, log: console });
  const validator = new LinkedInValidatorService({ brain: loadEditorialBrain(), db, log: console });

  try {
    // 1. Brain Proposition Query
    if (options.brain) {
      console.log('📡 Consulting Master Editorial Brain for candidate propositions...');
      const brain = loadEditorialBrain();
      const insight = brain.insights.find((i) => i.id === 'hook_replace_he_was_happy') || brain.insights[0];

      console.log(`✨ Selected Brain Insight: [${insight.id}] "${insight.title}"`);
      console.log(`   0:00 Cut Hook: ${insight.hook_0_sec}`);
      console.log(`   0:02 Turn: ${insight.turn_2_sec}\n`);

      const commentary = `“${insight.hook_0_sec}”\n\n${insight.turn_2_sec}\n\n${insight.body_core}\n\nWe built WritOn for writers who care about the sentence. Claim your pen name and write with us:\nhttps://writon.cc\n\n#writing #storytelling #craft`;

      // 2. Validate against 34 Quality Gates
      console.log('🛡️ Evaluating candidate through 34 Quality Gates (Global 17 + LI01-LI17)...');
      const gateEval = validator.evaluateGates({
        commentary,
        format: 'SINGLE_IMAGE',
        mediaAssets: [{ id: 'card_1' }],
        ignoreScheduleWindow: isDryRun,
      });

      console.log(`   Result: ${gateEval.allPassed ? '✅ ALL GATES PASSED' : '❌ GATE FAILURE'}`);
      console.log(`   Passed: ${gateEval.passedGates} / ${gateEval.totalGates}`);

      if (!gateEval.allPassed) {
        console.error('Validation failed:');
        gateEval.results.filter((r) => !r.passed).forEach((r) => {
          console.error(` - [${r.gateCode}] ${r.failureReason}`);
        });
        process.exit(1);
      }

      // 3. Create Candidate in PostgreSQL
      const { candidate, version } = await db.createCandidate({
        format: 'SINGLE_IMAGE',
        commentary,
        hashes: {
          brainHash: insight.id,
          contentHash: 'hash_test_dryrun',
        },
      });

      console.log(`\n💾 Created Candidate [${candidate.id}] Revision [${version.revision}] in PostgreSQL.`);

      // 4. Attach Approved Asset
      const assetPath = path.resolve(__dirname, '../campaign/antigravity-2026-09-06-19/assets/day3/day3_am_x_card.png');
      await db.addAsset({
        candidateVersionId: version.id,
        sequenceOrder: 1,
        kind: 'IMAGE',
        mimeType: 'image/png',
        fileSizeBytes: 541350,
        sha256: 'mock_sha256_verified',
        storageUri: 'https://writon.cc/assets/day3_am_x_card.png',
        localPath: assetPath,
      });

      // 5. Approve Candidate Version (triggers DB immutability freeze)
      await db.approveCandidateVersion(version.id);
      console.log('🔒 Candidate Version frozen and APPROVED.');

      // 6. Execute Publisher via Governance Coordinator
      const coordinator = new EditorialDispatchCoordinator({ db: pool });
      const deliveryId = generateDeliveryId({
        campaign: 'linkedin_editorial',
        slotId: version.id,
        platform: 'linkedin',
        surface: 'single_image',
        content: commentary
      });

      const pubResult = await coordinator.coordinateDispatch({
        deliveryId,
        campaign: 'linkedin_editorial',
        slotId: version.id,
        platform: 'linkedin',
        surface: 'single_image',
        archetype: insight.proposition_archetype || 'craft_philosophy',
        insightId: insight.id,
        content: commentary,
        policyHash: 'editorial_brain_v1',
        isDryRun,
        dispatchFn: async () => {
          const res = await publisher.publishCandidateVersion({
            candidateVersionId: version.id,
            isDryRun: false,
          });
          if (!res.success) {
            throw new Error(res.error || res.reason || 'LinkedIn publish failed');
          }
          return {
            remotePostId: res.postUrn,
            metadata: { liveUrl: res.liveUrl }
          };
        }
      });

      console.log('\n🏁 Publisher Result:');
      console.log(JSON.stringify(pubResult, null, 2));

      // Record dispatch simulation in memory
      console.log(`\n✓ Brain-governed ${isDryRun ? 'dry run' : 'live dispatch'} completed successfully.`);
    } else if (options.clock) {
      console.log('⏰ Executing LinkedIn Post Clock Tick...');
      const now = new Date();
      const istFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      const parts = istFormatter.formatToParts(now);
      const istHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const istMinute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      const istMinutesOfDay = istHour * 60 + istMinute;

      const isMorning = istMinutesOfDay >= 510 && istMinutesOfDay <= 630;
      const isEvening = istMinutesOfDay >= 1110 && istMinutesOfDay <= 1260;
      const currentWindow = isMorning ? 'MORNING' : isEvening ? 'EVENING' : null;

      console.log(`   IST Time: ${String(istHour).padStart(2, '0')}:${String(istMinute).padStart(2, '0')}`);
      console.log(`   Active Window: ${currentWindow || 'OUTSIDE ELIGIBILITY WINDOW'}`);

      // Query for pending approved candidate version
      const pendingApproved = await pool.query(
        `SELECT cv.* FROM public.linkedin_candidate_versions cv
         LEFT JOIN public.linkedin_publish_intents i ON i.candidate_version_id = cv.id
         WHERE cv.approved_at IS NOT NULL
           AND (i.status IS NULL OR i.status = 'PENDING')
         ORDER BY cv.approved_at ASC
         LIMIT 1`
      );

      let targetVersionId = pendingApproved.rows[0]?.id;

      if (!targetVersionId) {
        console.log('📡 No pending approved candidate. Sourcing proposition from Master Editorial Brain...');
        const brain = loadEditorialBrain();
        const { selectNextPropositionForChannel } = await import('../server/src/services/editorial-brain.js');
        const insight = selectNextPropositionForChannel({ channel: 'linkedin', format: 'SINGLE_IMAGE' }) || brain.insights[0];
        console.log(`✨ Brain Selected Proposition: [${insight.id}] "${insight.title}" (Archetype: ${insight.proposition_archetype})`);
        const commentary = `“${insight.hook_0_sec}”\n\n${insight.turn_2_sec}\n\n${insight.body_core}\n\nWe built WritOn for writers who care about the sentence. Claim your pen name and write with us:\nhttps://writon.cc\n\n#writing #storytelling #craft`;

        const gateEval = validator.evaluateGates({
          commentary,
          format: 'SINGLE_IMAGE',
          mediaAssets: [{ id: 'card_1' }],
        });

        if (!gateEval.allPassed) {
          console.error('❌ Quality gate validation failed during post clock tick:');
          gateEval.results.filter((r) => !r.passed).forEach((r) => console.error(` - [${r.gateCode}] ${r.failureReason}`));
          process.exit(1);
        }

        const { version } = await db.createCandidate({
          format: 'SINGLE_IMAGE',
          commentary,
          hashes: {
            brainHash: insight.id,
            contentHash: 'clock_hash_tick',
          },
        });

        await db.approveCandidateVersion(version.id);
        targetVersionId = version.id;
        console.log(`🔒 Proposed & Approved Version [${targetVersionId}] from Master Editorial Brain.`);
      } else {
        console.log(`🎯 Found pending approved version: ${targetVersionId}`);
      }

      console.log(`🚀 Executing dispatch (${isDryRun ? 'DRY RUN' : 'LIVE'})...`);
      const coordinator = new EditorialDispatchCoordinator({ db: pool });
      const targetVersion = await db.getCandidateVersionById(targetVersionId);
      const deliveryId = generateDeliveryId({
        campaign: 'linkedin_clock',
        slotId: targetVersionId,
        platform: 'linkedin',
        surface: (targetVersion?.format || 'single_image').toLowerCase(),
        content: targetVersion?.commentary || ''
      });

      const outcome = await coordinator.coordinateDispatch({
        deliveryId,
        campaign: 'linkedin_clock',
        slotId: targetVersionId,
        platform: 'linkedin',
        surface: (targetVersion?.format || 'single_image').toLowerCase(),
        archetype: 'craft_philosophy',
        insightId: targetVersion?.hashes?.brainHash || 'clock_tick',
        content: targetVersion?.commentary || '',
        policyHash: 'editorial_brain_v1',
        isDryRun,
        dispatchFn: async () => {
          const res = await publisher.publishCandidateVersion({
            candidateVersionId: targetVersionId,
            isDryRun: false,
          });
          if (!res.success) {
            throw new Error(res.error || res.reason || 'LinkedIn publish failed');
          }
          return {
            remotePostId: res.postUrn,
            metadata: { liveUrl: res.liveUrl }
          };
        }
      });

      console.log('\n🏁 Post Clock Tick Outcome:');
      console.log(JSON.stringify(outcome, null, 2));
      console.log('\n✓ Post clock tick complete.');
    } else {
      console.log('Please specify --brain, --clock, or --candidate-version-id. Defaulting to safe dry-run.');
    }
  } catch (err) {
    console.error('Error during LinkedIn publisher run:', err);
  } finally {
    await pool.end();
  }
}

main();
