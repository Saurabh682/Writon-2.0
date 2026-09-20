import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const verifyOnly = process.argv.includes('--verify-only');
const migrationUrls = [
  new URL('../../migrations/20260914_feed_quality_shadow.sql', import.meta.url),
  new URL('../../migrations/20260914_reader_feed_session_profile_fk.sql', import.meta.url),
];
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const stagingDatabaseUrl = process.env.STAGING_DATABASE_URL || execSync(
  'gcloud secrets versions access latest --secret=writon-database-url-staging --project=writon-app-2020',
  { encoding: 'utf8', windowsHide: true },
).trim();

const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl,
  productionDatabaseUrl: process.env.DATABASE_URL,
  allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
  expectedProjectRef: STAGING_PROJECT_REF,
});
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
  if (!verifyOnly) {
    for (const migrationUrl of migrationUrls) {
      await client.query(await readFile(fileURLToPath(migrationUrl), 'utf8'));
    }
  }

  const result = await client.query(`
    select
      to_regclass('public.feed_shadow_rankings') is not null as table_exists,
      (
        select count(*)::int from pg_attribute
        where attrelid = 'public.feed_shadow_rankings'::regclass
          and attnum > 0 and not attisdropped
          and attname = any(array[
            'feed_session_id', 'profile_id', 'story_id', 'shadow_rank_position',
            'visible_rank_position', 'form_cohort', 'normalized_quality',
            'model_version', 'ranked_at'
          ])
      ) as expected_columns,
      (
        select count(*)::int from pg_constraint
        where conrelid = 'public.feed_shadow_rankings'::regclass
          and contype in ('p', 'f', 'u', 'c') and convalidated
      ) as validated_constraints,
      (
        select relrowsecurity from pg_class
        where oid = 'public.feed_shadow_rankings'::regclass
      ) as rls_enabled,
      not has_table_privilege('anon', 'public.feed_shadow_rankings', 'select')
        and not has_table_privilege('authenticated', 'public.feed_shadow_rankings', 'select')
        as client_select_revoked,
      (
        select count(*)::int from pg_indexes
        where schemaname = 'public' and tablename = 'feed_shadow_rankings'
          and indexname = any(array[
            'feed_shadow_rankings_pkey',
            'feed_shadow_rankings_feed_session_id_shadow_rank_position_key',
            'feed_shadow_rankings_profile_ranked_idx',
            'feed_shadow_rankings_story_idx'
          ])
      ) as expected_indexes,
      exists (
        select 1 from pg_constraint
        where conrelid = 'public.reader_feed_sessions'::regclass
          and conname = 'reader_feed_sessions_profile_id_fkey'
          and contype = 'f' and convalidated and confdeltype = 'c'
      ) as session_profile_cascade,
      (select count(*)::int
         from public.reader_feed_sessions session
         left join public.profiles profile on profile.id = session.profile_id
        where session.profile_id is not null and profile.id is null) as orphan_sessions
  `);
  const verification = result.rows[0];
  if (verification?.table_exists !== true
      || verification?.expected_columns !== 9
      || verification?.validated_constraints !== 8
      || verification?.rls_enabled !== true
      || verification?.client_select_revoked !== true
      || verification?.expected_indexes !== 4
      || verification?.session_profile_cascade !== true
      || verification?.orphan_sessions !== 0) {
    throw new Error(`Feed-quality shadow staging verification failed: ${JSON.stringify(verification)}`);
  }

  console.log(JSON.stringify({
    stagingProject: STAGING_PROJECT_REF,
    mode: verifyOnly ? 'verify-only' : 'apply-and-verify',
    verification,
  }, null, 2));
} finally {
  await client.end().catch(() => {});
}
