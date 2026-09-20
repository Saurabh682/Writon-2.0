import { BigQuery } from '@google-cloud/bigquery';

const bq = new BigQuery({ projectId: 'writon-app-2020' });

const ddl = `
CREATE TABLE IF NOT EXISTS \`writon-app-2020.trend_intelligence.trend_reports\` (
  report_id STRING NOT NULL,
  external_run_id STRING,
  observed_at TIMESTAMP,
  report_date DATE,
  region STRING,
  source STRING,
  run_type STRING,
  schema_version STRING,
  payload_hash STRING,
  total_trends INT64,
  processing_status STRING,
  gcs_uri STRING,
  processed_at TIMESTAMP,
  created_at TIMESTAMP
)
PARTITION BY report_date
CLUSTER BY region, source;

CREATE TABLE IF NOT EXISTS \`writon-app-2020.trend_intelligence.trend_signals\` (
  signal_id STRING NOT NULL,
  slug STRING,
  canonical_topic STRING,
  category STRING,
  aliases ARRAY<STRING>,
  normalized_keywords ARRAY<STRING>,
  platforms ARRAY<STRING>,
  source_status STRING,
  computed_status STRING,
  momentum STRING,
  latest_score INT64,
  peak_score INT64,
  score_delta INT64,
  velocity_per_day FLOAT64,
  writon_relevance INT64,
  novelty_score INT64,
  source_confidence FLOAT64,
  computed_evidence_confidence FLOAT64,
  sensitivity_class STRING,
  detection_count INT64,
  first_detected_at TIMESTAMP,
  last_detected_at TIMESTAMP
)
CLUSTER BY slug, computed_status;

CREATE TABLE IF NOT EXISTS \`writon-app-2020.trend_intelligence.trend_signal_snapshots\` (
  snapshot_id STRING NOT NULL,
  signal_id STRING NOT NULL,
  report_id STRING NOT NULL,
  snapshot_date DATE,
  observed_at TIMESTAMP,
  rank INT64,
  score INT64,
  source_status STRING,
  computed_status STRING,
  momentum STRING,
  score_delta INT64,
  elapsed_hours FLOAT64,
  velocity_per_day FLOAT64,
  source_confidence FLOAT64,
  computed_evidence_confidence FLOAT64,
  why_trending STRING,
  content_opportunity STRING,
  recommended_angles STRING,
  keywords ARRAY<STRING>,
  sources STRING,
  urgency STRING,
  created_at TIMESTAMP
)
PARTITION BY snapshot_date
CLUSTER BY signal_id, report_id;

CREATE TABLE IF NOT EXISTS \`writon-app-2020.trend_intelligence.trend_opportunities\` (
  opportunity_id STRING NOT NULL,
  signal_id STRING NOT NULL,
  report_id STRING,
  opportunity_score INT64,
  priority_score INT64,
  writon_relevance INT64,
  novelty_score INT64,
  source_confidence FLOAT64,
  computed_evidence_confidence FLOAT64,
  sensitivity_class STRING,
  qualification_status STRING,
  rejection_reason STRING,
  candidate_personas STRING,
  recommended_angles STRING,
  sources STRING,
  evaluated_at TIMESTAMP,
  created_at TIMESTAMP
)
CLUSTER BY qualification_status, signal_id;
`;

async function main() {
  console.log('Running BigQuery DDL for destination tables...');
  const [job] = await bq.createQueryJob({ query: ddl, location: 'asia-south1' });
  console.log('Query job ID:', job.id);
  await job.getQueryResults();
  console.log('BigQuery DDL completed successfully!');
  const [tables] = await bq.dataset('trend_intelligence', { location: 'asia-south1' }).getTables();
  console.log('Tables in trend_intelligence:', tables.map(t => t.id));
}

main().catch(err => {
  console.error('Error creating BigQuery tables:', err);
  process.exit(1);
});
