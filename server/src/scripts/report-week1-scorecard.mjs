import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const productionRequested = process.argv.includes('--production');
const daysArgument = process.argv.find((arg) => arg.startsWith('--days='));
const days = Number.parseInt(daysArgument?.split('=')[1] ?? '7', 10);

console.log(`\n======================================================`);
console.log(`  WritOn Week 1 Growth Scorecard (${productionRequested ? 'PRODUCTION' : 'STAGING'}, past ${days} days)`);
console.log(`======================================================\n`);

let connectionString = process.env.DATABASE_URL;
let certificatePath = null;

if (!connectionString) {
  try {
    const secretName = productionRequested ? 'writon-database-url-production' : 'writon-database-url-staging';
    connectionString = execSync(
      `gcloud secrets versions access latest --secret=${secretName} --project=writon-app-2020`,
      { encoding: 'utf8', windowsHide: true }
    ).trim();
    if (productionRequested) {
      certificatePath = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
    }
  } catch (err) {
    console.error(`Failed to fetch database connection secret: ${err.message}`);
    process.exit(1);
  }
}

const databaseHost = new URL(connectionString).hostname;
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(databaseHost);

const clientConfig = {
  connectionString,
  ssl: isLocal
    ? false
    : certificatePath
    ? { ca: await readFile(fileURLToPath(certificatePath), 'utf8'), rejectUnauthorized: true }
    : { rejectUnauthorized: false }
};

const client = new Client(clientConfig);

try {
  await client.connect();

  const intervalParam = `${days} days`;

  // 1. Acquisition: New human profiles and unique readers active
  const acqRes = await client.query(`
    select
      (select count(*)::int from public.profiles where created_at >= now() - $1::interval and account_type = 'human') as new_profiles,
      (select count(distinct user_id)::int from public.reading_history where last_read_at >= now() - $1::interval) as active_readers,
      (select count(*)::int from public.reading_history where last_read_at >= now() - $1::interval) as total_reading_sessions
  `, [intervalParam]);

  const acq = acqRes.rows[0];

  // 2. Activation: Readers who completed at least 1 story (progress >= 0.70)
  const actRes = await client.query(`
    with reader_completions as (
      select user_id, count(distinct post_id)::int as completed_stories
      from public.reading_history
      where progress >= 0.70 and last_read_at >= now() - $1::interval
      group by user_id
    )
    select
      count(*)::int as readers_story_1_completed
    from reader_completions
    where completed_stories >= 1
  `, [intervalParam]);

  const act = actRes.rows[0];

  // 3. Engagement: Readers who completed at least 2 stories (progress >= 0.70)
  const engRes = await client.query(`
    with reader_completions as (
      select user_id, count(distinct post_id)::int as completed_stories, sum(read_seconds)::int as total_dwell
      from public.reading_history
      where progress >= 0.70 and last_read_at >= now() - $1::interval
      group by user_id
    )
    select
      count(*)::int as readers_story_2_completed,
      coalesce(avg(total_dwell), 0)::int as avg_dwell_seconds
    from reader_completions
    where completed_stories >= 2
  `, [intervalParam]);

  const eng = engRes.rows[0];

  // 4. Retention: Readers with reading activity on >= 2 distinct calendar days
  const retRes = await client.query(`
    with reader_active_days as (
      select user_id, count(distinct date_trunc('day', last_read_at))::int as active_days
      from public.reading_history
      where last_read_at >= now() - $1::interval
      group by user_id
    )
    select count(*)::int as returning_readers
    from reader_active_days
    where active_days >= 2
  `, [intervalParam]);

  const ret = retRes.rows[0];

  // 5. Connection: Follows & Bookmarks created
  const connRes = await client.query(`
    select
      (select count(*)::int from public.bookmarks where created_at >= now() - $1::interval) as new_bookmarks,
      (select count(*)::int from public.follows where created_at >= now() - $1::interval) as new_follows
  `, [intervalParam]);

  const conn = connRes.rows[0];

  // Scorecard Ratios
  const activeReaders = acq.active_readers || 0;
  const s1Completed = act.readers_story_1_completed || 0;
  const s2Completed = eng.readers_story_2_completed || 0;
  const returningReaders = ret.returning_readers || 0;

  const activationRate = activeReaders > 0 ? ((s1Completed / activeReaders) * 100).toFixed(1) : '0.0';
  const engagementRate = s1Completed > 0 ? ((s2Completed / s1Completed) * 100).toFixed(1) : '0.0';
  const retentionRate = activeReaders > 0 ? ((returningReaders / activeReaders) * 100).toFixed(1) : '0.0';

  console.log(`--------------------------------------------------------------------------------`);
  console.log(`| Metric Area     | Funnel Event             | Count     | Conversion / Rate   |`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`| 1. Acquisition  | New Profiles (Human)     | ${String(acq.new_profiles).padEnd(9)} | -                   |`);
  console.log(`|                 | Active Readers (7d)      | ${String(acq.active_readers).padEnd(9)} | Baseline Pool       |`);
  console.log(`|                 | Reading Sessions         | ${String(acq.total_reading_sessions).padEnd(9)} | -                   |`);
  console.log(`| 2. Activation   | Story 1 Completed (>=70%)| ${String(s1Completed).padEnd(9)} | ${activationRate.padStart(5)}% of Readers     |`);
  console.log(`| 3. Engagement   | Story 2 Completed (>=70%)| ${String(s2Completed).padEnd(9)} | ${engagementRate.padStart(5)}% of Story 1    |`);
  console.log(`|                 | Avg Dwell (2+ Stories)   | ${String(eng.avg_dwell_seconds + 's').padEnd(9)} | -                   |`);
  console.log(`| 4. Retention    | Multi-Day Return (>=2d)  | ${String(returningReaders).padEnd(9)} | ${retentionRate.padStart(5)}% of Readers     |`);
  console.log(`| 5. Connection   | Bookmarks Saved          | ${String(conn.new_bookmarks).padEnd(9)} | -                   |`);
  console.log(`|                 | Authors Followed         | ${String(conn.new_follows).padEnd(9)} | -                   |`);
  console.log(`--------------------------------------------------------------------------------\n`);

} catch (err) {
  console.error(`Error querying growth scorecard: ${err.message}`);
} finally {
  await client.end();
}
