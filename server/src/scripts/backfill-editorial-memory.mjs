import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const applyMode = process.argv.includes('--apply');
const brainFileUrl = new URL('../../../campaign/EDITORIAL_BRAIN.json', import.meta.url);
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);

async function main() {
  console.log('[BACKFILL] Loading canonical editorial brain from campaign/EDITORIAL_BRAIN.json...');
  const brainRaw = await readFile(fileURLToPath(brainFileUrl), 'utf8');
  const brain = JSON.parse(brainRaw);

  const insights = Array.isArray(brain.insights) ? brain.insights : [];
  console.log(`[BACKFILL] Found ${insights.length} total insight candidates in campaign/EDITORIAL_BRAIN.json.`);

  // Filter for insights that actually have dispatch history
  const dispatchedInsights = insights.filter(i => (i.times_dispatched > 0 || i.last_dispatched_at));
  console.log(`[BACKFILL] Found ${dispatchedInsights.length} insights with recorded historical dispatches.`);

  const backfillRecords = [];

  for (const insight of dispatchedInsights) {
    const archetype = insight.proposition_archetype || 'craft_philosophy';
    const insightId = insight.id;
    const dispatchedAt = insight.last_dispatched_at || new Date().toISOString();
    
    // Create deterministic hash of timestamp for unique delivery key
    const tsHex = crypto.createHash('sha256').update(dispatchedAt).digest('hex').slice(0, 12);
    const deliveryId = `legacy_brain_${insightId}_${tsHex}`;

    // Map channels
    const channels = insight.provenance?.cross_platform_formats || ['youtube_shorts'];
    const primaryChannel = channels[0] || 'youtube_shorts';

    const externalPostId = insight.video_id || null;

    backfillRecords.push({
      delivery_id: deliveryId,
      archetype,
      insight_id: insightId,
      channel: primaryChannel,
      status: 'published',
      external_post_id: externalPostId,
      content_hash: 'LEGACY_UNHASHED',
      policy_hash: 'LEGACY_PRE_GOVERNANCE',
      dispatched_at: dispatchedAt,
      metadata: {
        legacy_backfill: true,
        source: 'campaign/EDITORIAL_BRAIN.json',
        title: insight.title || null,
        hook_0_sec: insight.hook_0_sec || null,
        url: insight.url || insight.unlisted_shorts_url || null,
        times_dispatched: insight.times_dispatched || 1
      }
    });
  }

  console.log(`[BACKFILL] Prepared ${backfillRecords.length} legacy dispatch records for idempotent insertion.`);

  if (!applyMode) {
    console.log('\n--- DRY RUN SAMPLE (First 2 Records) ---');
    console.log(JSON.stringify(backfillRecords.slice(0, 2), null, 2));
    console.log('\n[INFO] Run with --apply to insert records into staging target.');
    return;
  }

  // Connect to staging DB and insert
  const connectionString = validateStagingDatabaseTarget({
    stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
    productionDatabaseUrl: process.env.DATABASE_URL,
    allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
    expectedProjectRef: STAGING_PROJECT_REF,
  });

  const databaseHost = new URL(connectionString).hostname;
  const client = new Client({
    connectionString,
    ssl: ['localhost', '127.0.0.1', '::1'].includes(databaseHost)
      ? false
      : {
          ca: await readFile(fileURLToPath(certificateUrl), 'utf8'),
          rejectUnauthorized: true,
        },
  });

  try {
    await client.connect();
    let insertedCount = 0;

    for (const record of backfillRecords) {
      const res = await client.query(`
        INSERT INTO public.editorial_insight_dispatches (
          delivery_id,
          channel,
          insight_id,
          archetype,
          status,
          external_post_id,
          content_hash,
          policy_hash,
          dispatched_at,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (delivery_id) DO NOTHING
        RETURNING id;
      `, [
        record.delivery_id,
        record.channel,
        record.insight_id,
        record.archetype,
        record.status,
        record.external_post_id,
        record.content_hash,
        record.policy_hash,
        record.dispatched_at,
        JSON.stringify(record.metadata)
      ]);

      if (res.rowCount > 0) insertedCount++;
    }

    console.log(`[APPLY] Inserted ${insertedCount} new legacy records (${backfillRecords.length - insertedCount} skipped as already present).`);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
