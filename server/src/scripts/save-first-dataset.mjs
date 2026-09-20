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
  console.log('Ingesting report.json into production PostgreSQL database...');
  const result = await ingestTrendReport(pool, payload);
  console.log('Ingest Result:\n', JSON.stringify(result, null, 2));

  if (result.reportId) {
    const backlogCheck = await pool.query(
      `select id, target_author_pen_name, proposed_title, genre, status, trend_score, created_at
       from public.editorial_ideas_backlog
       where source_trend_report_id = $1
       order by trend_score desc`,
      [result.reportId]
    );

    console.log('\n--- Seeded Editorial Ideas Backlog Rows ---');
    console.table(backlogCheck.rows);

    const signalsCheck = await pool.query(
      `select id, canonical_topic, latest_score, peak_score, computed_status, momentum
       from public.trend_signals
       where id in (select source_trend_signal_id from public.editorial_ideas_backlog where source_trend_report_id = $1)`,
      [result.reportId]
    );

    console.log('\n--- Associated Trend Signals ---');
    console.table(signalsCheck.rows);
  }

  await pool.end();
}

main().catch(err => {
  console.error('Error during ingest:', err);
  process.exit(1);
});
