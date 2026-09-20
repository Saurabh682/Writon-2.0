import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const migrationUrls = [
  new URL('../../migrations/20260827_profile_interests_and_comment_threads.sql', import.meta.url),
  new URL('../../migrations/20260905_profile_engagement_preferences.sql', import.meta.url),
];
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);

const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
  productionDatabaseUrl: process.env.DATABASE_URL,
  allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
});

if (!connectionString.includes(STAGING_PROJECT_REF)) {
  throw new Error(`Refusing engagement migration: expected staging project ${STAGING_PROJECT_REF}.`);
}

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
  for (const migrationUrl of migrationUrls) {
    await client.query(await readFile(fileURLToPath(migrationUrl), 'utf8'));
  }

  const verification = await client.query(`
    select
      c.relrowsecurity as rls_enabled,
      count(a.attname)::int as expected_columns,
      to_regclass('public.profile_interests') is not null as interests_table,
      (select relrowsecurity from pg_class where oid = 'public.profile_interests'::regclass) as interests_rls,
      to_regclass('public.profile_interests_profile_created_idx') is not null as interests_index
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
      and a.attnum > 0
      and not a.attisdropped
      and a.attname = any($1::text[])
    where n.nspname = 'public'
      and c.relname = 'profile_engagement_preferences'
    group by c.relrowsecurity
  `, [[
    'profile_id', 'primary_intent', 'onboarding_version', 'onboarding_completed_at',
    'preference_card_state', 'preference_card_updated_at', 'created_at', 'updated_at',
  ]]);

  const result = verification.rows[0];
  if (!result || result.rls_enabled !== true || result.expected_columns !== 8
      || !result.interests_table || !result.interests_rls || !result.interests_index) {
    throw new Error('Migration verification failed: expected engagement preferences and secured profile interests.');
  }

  console.log('Staging migration verified: engagement preferences and profile interests exist with RLS enabled.');
} finally {
  await client.end().catch(() => {});
}
