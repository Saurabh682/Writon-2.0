/**
 * Standalone Worker Tick Runner for Postgres -> GCP Trend Replication
 *
 * Usage:
 *   node server/src/scripts/process-trend-cloud-sync.mjs [--limit=25] [--loop] [--interval=60000]
 */

import { runSyncTick } from '../services/trend-cloud-sync.js';
import { pool } from '../db/pool.js';

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 25;
const isLoop = args.includes('--loop');
const intervalArg = args.find(a => a.startsWith('--interval='));
const intervalMs = intervalArg ? parseInt(intervalArg.split('=')[1], 10) : 60000;

async function runOnce() {
  console.log(`[TrendCloudSync] Starting sync tick (limit=${limit})...`);
  const result = await runSyncTick({ limit });
  console.log(`[TrendCloudSync] Processed: ${result.processed} reports.`);
  if (result.tableErrors && Object.keys(result.tableErrors).length > 0) {
    console.error(`[TrendCloudSync] BigQuery Table Errors:`, result.tableErrors);
  }
  return result;
}

async function main() {
  if (!isLoop) {
    try {
      await runOnce();
    } finally {
      await pool.end();
    }
    return;
  }

  console.log(`[TrendCloudSync] Running in polling daemon mode (interval: ${intervalMs}ms)...`);
  const tick = async () => {
    try {
      await runOnce();
    } catch (err) {
      console.error('[TrendCloudSync] Tick error:', err);
    }
  };

  await tick();
  setInterval(tick, intervalMs);
}

main().catch(err => {
  console.error('[TrendCloudSync] Fatal error:', err);
  process.exit(1);
});
