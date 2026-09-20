import { pool } from '../db/pool.js';
import { fetchRowsForTable } from '../services/trend-cloud-sync.js';

async function main() {
  const { rows: reports } = await pool.query('SELECT id FROM public.trend_reports LIMIT 1');
  const id = reports[0].id;
  console.log('Testing fetchRowsForTable with report ID:', id);

  for (const table of ['trend_reports', 'trend_signals', 'trend_signal_snapshots', 'trend_opportunities']) {
    const rows = await fetchRowsForTable(table, [id]);
    console.log(table, 'row count:', rows.length);
    if (rows[0]) {
      console.log(table, 'keys:', Object.keys(rows[0]));
      console.log(table, 'sample first row:', JSON.stringify(rows[0], null, 2));
    }
  }
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
