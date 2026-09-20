import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const PRODUCTION_PROJECT_REF = 'rrxaitxeirykmiihgiqj';
const productionRequested = process.argv.includes('--production');
const verifyOnly = process.argv.includes('--verify-only');

const migrationUrl = new URL('../../migrations/20260916_email_engagement.sql', import.meta.url);
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to apply email engagement migration.');
}

if (!productionRequested || !connectionString.includes(PRODUCTION_PROJECT_REF)) {
  throw new Error(`Refusing production migration without --production and matching project ref ${PRODUCTION_PROJECT_REF}.`);
}

const client = new pg.Client({
  connectionString,
  ssl: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
    ? { rejectUnauthorized: true }
    : false,
});

try {
  await client.connect();
  console.log(`Connected to production database (${PRODUCTION_PROJECT_REF}).`);

  if (!verifyOnly) {
    console.log('Applying 20260916_email_engagement.sql migration...');
    const sql = await readFile(fileURLToPath(migrationUrl), 'utf8');
    await client.query(sql);
    console.log('Migration SQL executed successfully.');

    // Seed existing human profiles into user_email_preferences with default opt-outs
    console.log('Initializing user_email_preferences for existing human profiles...');
    const seedResult = await client.query(`
      insert into public.user_email_preferences (
        profile_id, reading_enabled, activity_enabled, lifecycle_enabled, writer_tips_enabled,
        locale, timezone, email_version, created_at, updated_at
      )
      select
        p.id, false, false, false, false,
        'en', 'Asia/Kolkata', 1, now(), now()
      from public.profiles p
      where p.account_type = 'human'
        and not exists (select 1 from public.bot_configs b where b.id = p.id)
      on conflict (profile_id) do nothing
    `);
    console.log(`Seeded email preferences for existing users (affected rows: ${seedResult.rowCount}).`);
  }

  // Verify all 7 tables exist
  const verification = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any($1::text[])
  `, [[
    'user_email_preferences',
    'email_jobs',
    'email_delivery_events',
    'email_suppressions',
    'email_daily_capacity',
    'email_preference_audit',
    'writer_engagement_events',
  ]]);

  const foundTables = new Set(verification.rows.map(r => r.table_name));
  const expectedTables = [
    'user_email_preferences',
    'email_jobs',
    'email_delivery_events',
    'email_suppressions',
    'email_daily_capacity',
    'email_preference_audit',
    'writer_engagement_events',
  ];

  for (const table of expectedTables) {
    if (!foundTables.has(table)) {
      throw new Error(`Email engagement migration verification failed: missing table ${table}`);
    }
  }

  const counts = await client.query(`
    select
      (select count(*)::int from public.user_email_preferences) as preferences_count,
      (select count(*)::int from public.email_jobs) as jobs_count,
      (select count(*)::int from public.email_suppressions) as suppressions_count,
      (select count(*)::int from public.profiles where account_type = 'human') as human_profiles_count
  `);

  console.log('\n======================================================');
  console.log('✅ Production Email Engagement Migration Verified');
  console.log('======================================================');
  console.log(`Database Ref          : ${PRODUCTION_PROJECT_REF}`);
  console.log(`All 7 Tables Present  : true`);
  console.log(`Preferences Rows      : ${counts.rows[0].preferences_count}`);
  console.log(`Human Profiles        : ${counts.rows[0].human_profiles_count}`);
  console.log(`Email Jobs Count      : ${counts.rows[0].jobs_count}`);
  console.log('======================================================\n');
} finally {
  await client.end().catch(() => {});
}
