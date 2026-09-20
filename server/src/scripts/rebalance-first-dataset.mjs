import pg from 'pg';
import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import { ingestTrendReport } from '../services/trend-intelligence-service.js';

dotenv.config({ path: 'server/.env' });

async function main() {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const payload = JSON.parse(await readFile('report.json', 'utf8'));
  const reportId = 'db033b94-a5d8-4a59-93f4-1e00d09f0dc9';

  console.log('Clearing initial run db033b94 from database for clean re-balance...');
  await pool.query(`delete from public.editorial_ideas_backlog where source_trend_report_id = $1`, [reportId]);
  await pool.query(`delete from public.trend_signal_snapshots where report_id = $1`, [reportId]);
  await pool.query(`delete from public.trend_opportunities where report_id = $1`, [reportId]);
  await pool.query(`delete from public.trend_reports where id = $1`, [reportId]);

  console.log('Re-ingesting report.json with improved category-anchored persona distribution...');
  const result = await ingestTrendReport(pool, payload);
  console.log('Ingest Result:\n', JSON.stringify(result, null, 2));

  const backlogCheck = await pool.query(
    `select id, target_author_pen_name, proposed_title, genre, status, trend_score, created_at
     from public.editorial_ideas_backlog
     where source_trend_report_id = $1
     order by trend_score desc`,
    [result.reportId]
  );

  console.log('\n--- Re-balanced Editorial Ideas Backlog Rows ---');
  console.table(backlogCheck.rows);

  const signalsCheck = await pool.query(
    `select id, canonical_topic, latest_score, peak_score, computed_status, momentum
     from public.trend_signals
     where id in (select source_trend_signal_id from public.editorial_ideas_backlog where source_trend_report_id = $1)`,
    [result.reportId]
  );

  console.log('\n--- Associated Trend Signals ---');
  console.table(signalsCheck.rows);

  await pool.end();
}

main().catch(err => {
  console.error('Error during rebalance:', err);
  process.exit(1);
});
