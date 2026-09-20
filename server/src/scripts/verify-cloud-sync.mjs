import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';

const bq = new BigQuery({ projectId: 'writon-app-2020' });
const storage = new Storage({ projectId: 'writon-app-2020' });

async function main() {
  console.log('--- 1. BigQuery Table Counts ---');
  for (const t of ['trend_reports', 'trend_signals', 'trend_signal_snapshots', 'trend_opportunities']) {
    const [rows] = await bq.query({
      query: `SELECT count(*) as cnt FROM \`writon-app-2020.trend_intelligence.${t}\``,
      location: 'asia-south1'
    });
    console.log(`Table ${t}: ${rows[0].cnt} rows`);
  }

  console.log('\n--- 2. BigQuery Sample Data ---');
  const [reportRows] = await bq.query({
    query: `SELECT report_id, report_date, region, total_trends, gcs_uri FROM \`writon-app-2020.trend_intelligence.trend_reports\` LIMIT 1`,
    location: 'asia-south1'
  });
  console.log('Sample report:', reportRows[0]);

  const [signalRows] = await bq.query({
    query: `SELECT signal_id, slug, canonical_topic, category, latest_score, computed_status FROM \`writon-app-2020.trend_intelligence.trend_signals\` LIMIT 3`,
    location: 'asia-south1'
  });
  console.log('Sample signals:', signalRows);

  console.log('\n--- 3. GCS Archive Verification ---');
  const [files] = await storage.bucket('writon-app-2020-media-staging').getFiles({
    prefix: 'spark-trends/2026/09/16/563bc9b8'
  });
  console.log('GCS Archive file found:', files.map(f => f.name));

  const [batches] = await storage.bucket('writon-app-2020-media-staging').getFiles({
    prefix: 'spark-trends/_bq_batches/'
  });
  console.log('Staging NDJSON files remaining (should be 0):', batches.length);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
