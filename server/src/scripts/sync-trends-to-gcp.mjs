/**
 * Backfill & Ad-Hoc Replication CLI for Postgres -> GCP Trend Intelligence
 *
 * Usage:
 *   node server/src/scripts/sync-trends-to-gcp.mjs --all
 *   node server/src/scripts/sync-trends-to-gcp.mjs --report=<report-id>
 *   node server/src/scripts/sync-trends-to-gcp.mjs --since=2026-09-01
 *   node server/src/scripts/sync-trends-to-gcp.mjs --failed
 *   node server/src/scripts/sync-trends-to-gcp.mjs --dry-run
 */

import { pool } from '../db/pool.js';
import { runSyncTick, TABLES } from '../services/trend-cloud-sync.js';

const args = process.argv.slice(2);
const isAll = args.includes('--all');
const isFailed = args.includes('--failed');
const isDryRun = args.includes('--dry-run');
const reportArg = args.find(a => a.startsWith('--report='));
const reportId = reportArg ? reportArg.split('=')[1] : null;
const sinceArg = args.find(a => a.startsWith('--since='));
const sinceDate = sinceArg ? sinceArg.split('=')[1] : null;

async function enqueueBackfill() {
  let query = `
    SELECT r.id, r.report_date, r.processing_status
    FROM public.trend_reports r
    WHERE 1=1
  `;
  const params = [];

  if (reportId) {
    params.push(reportId);
    query += ` AND r.id = $${params.length}`;
  } else if (sinceDate) {
    params.push(sinceDate);
    query += ` AND r.report_date >= $${params.length}`;
  }

  if (isFailed) {
    query += ` AND EXISTS (SELECT 1 FROM public.trend_cloud_sync_outbox o WHERE o.report_id = r.id AND o.status = 'failed')`;
  }

  query += ` ORDER BY r.report_date ASC, r.created_at ASC`;

  const { rows: targets } = await pool.query(query, params);
  console.log(`[Backfill] Found ${targets.length} reports matching criteria.`);

  if (targets.length === 0) {
    return { enqueued: 0 };
  }

  if (isDryRun) {
    console.log('[Backfill] DRY RUN — would enqueue:');
    targets.forEach(t => console.log(`  - ${t.id} (${t.report_date?.toISOString?.()?.slice(0, 10) || t.report_date}) status: ${t.processing_status}`));
    return { enqueued: 0, dryRun: true };
  }

  // Enqueue / reset outbox rows
  let enqueued = 0;
  for (const t of targets) {
    await pool.query(`
      INSERT INTO public.trend_cloud_sync_outbox (
        report_id,
        status,
        gcs_status,
        bigquery_status,
        dirty_tables,
        sync_revision,
        attempt_count,
        next_attempt_at,
        locked_at,
        locked_by,
        last_error
      ) VALUES (
        $1,
        'pending',
        'pending',
        'pending',
        $2::text[],
        1,
        0,
        NOW(),
        NULL,
        NULL,
        NULL
      )
      ON CONFLICT (report_id) DO UPDATE SET
        status = 'pending',
        dirty_tables = CASE WHEN trend_cloud_sync_outbox.status = 'synced' THEN $2::text[] ELSE trend_cloud_sync_outbox.dirty_tables END,
        sync_revision = trend_cloud_sync_outbox.sync_revision + 1,
        attempt_count = 0,
        next_attempt_at = NOW(),
        locked_at = NULL,
        locked_by = NULL
    `, [t.id, TABLES]);
    enqueued++;
  }

  console.log(`[Backfill] Enqueued ${enqueued} reports for cloud replication.`);
  return { enqueued };
}

async function main() {
  if (!isAll && !reportId && !sinceDate && !isFailed) {
    console.log(`
Usage:
  node server/src/scripts/sync-trends-to-gcp.mjs --all
  node server/src/scripts/sync-trends-to-gcp.mjs --report=<report-id>
  node server/src/scripts/sync-trends-to-gcp.mjs --since=YYYY-MM-DD
  node server/src/scripts/sync-trends-to-gcp.mjs --failed
  node server/src/scripts/sync-trends-to-gcp.mjs --dry-run
    `);
    process.exit(0);
  }

  try {
    const { enqueued, dryRun } = await enqueueBackfill();
    if (dryRun || enqueued === 0) return;

    console.log('[Backfill] Processing replication queue now...');
    let totalProcessed = 0;
    while (true) {
      const result = await runSyncTick({ limit: 25 });
      totalProcessed += result.processed;
      if (result.processed === 0) break;
      console.log(`[Backfill] Batch complete: processed ${result.processed} reports (Total: ${totalProcessed}).`);
    }

    console.log(`[Backfill] All replication batches processed. Total reports: ${totalProcessed}.`);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('[Backfill] Error:', err);
  process.exit(1);
});
