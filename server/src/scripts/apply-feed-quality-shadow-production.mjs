import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const PRODUCTION_PROJECT_REF = 'rrxaitxeirykmiihgiqj';
const productionRequested = process.argv.includes('--production');
const verifyOnly = process.argv.includes('--verify-only');
const migrationUrls = [
  new URL('../../migrations/20260913_recommendation_content_metadata.sql', import.meta.url),
  new URL('../../migrations/20260913_recommendation_content_metadata_backfill.sql', import.meta.url),
  new URL('../../migrations/20260914_feed_quality_shadow.sql', import.meta.url),
  new URL('../../migrations/20260914_reader_feed_session_profile_fk.sql', import.meta.url),
];
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const connectionString = process.env.DATABASE_URL || execSync(
  'gcloud secrets versions access latest --secret=writon-database-url-production --project=writon-app-2020',
  { encoding: 'utf8', windowsHide: true },
).trim();

if (!productionRequested || !connectionString.includes(PRODUCTION_PROJECT_REF)) {
  throw new Error(`Refusing production migration without --production and ${PRODUCTION_PROJECT_REF}.`);
}

const client = new pg.Client({
  connectionString,
  ssl: {
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

  const verification = await client.query(`
    select
      (select count(*)::int from pg_attribute
        where attrelid = 'public.posts'::regclass and attnum > 0 and not attisdropped
          and attname = any($1::text[])) as metadata_columns,
      (select count(*)::int from pg_constraint
        where conrelid = 'public.posts'::regclass and convalidated
          and conname = any($2::text[])) as metadata_constraints,
      to_regclass('public.feed_shadow_rankings') is not null as shadow_table,
      (select relrowsecurity from pg_class where oid = 'public.feed_shadow_rankings'::regclass) as rls_enabled,
      not has_table_privilege('anon', 'public.feed_shadow_rankings', 'select')
        and not has_table_privilege('authenticated', 'public.feed_shadow_rankings', 'select') as client_select_revoked,
      (select count(*)::int from pg_indexes
        where schemaname = 'public' and tablename = 'feed_shadow_rankings') as shadow_indexes,
      exists (
        select 1 from pg_constraint
        where conrelid = 'public.reader_feed_sessions'::regclass
          and conname = 'reader_feed_sessions_profile_id_fkey'
          and contype = 'f' and convalidated and confdeltype = 'c'
      ) as session_profile_cascade,
      (select count(*)::int
         from public.reader_feed_sessions session
         left join public.profiles profile on profile.id = session.profile_id
        where session.profile_id is not null and profile.id is null) as orphan_sessions,
      (select count(word_count)::int from public.posts) as word_count_coverage,
      (select count(content_form)::int from public.posts) as content_form_coverage
  `, [[
    'content_form', 'content_form_source', 'content_form_confidence',
    'word_count', 'word_count_source', 'script_code', 'script_source',
    'script_confidence', 'recommendation_metadata_updated_at',
  ], [
    'posts_content_form_check', 'posts_content_form_confidence_check',
    'posts_word_count_check', 'posts_script_code_check', 'posts_script_confidence_check',
  ]]);
  const result = verification.rows[0];
  if (result.metadata_columns !== 9 || result.metadata_constraints !== 5
      || result.shadow_table !== true || result.rls_enabled !== true
      || result.client_select_revoked !== true || result.shadow_indexes < 4
      || result.session_profile_cascade !== true || result.orphan_sessions !== 0) {
    throw new Error(`Production R3 schema verification failed: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify({
    productionProject: PRODUCTION_PROJECT_REF,
    mode: verifyOnly ? 'verify-only' : 'apply-and-verify',
    verification: result,
  }, null, 2));
} finally {
  await client.end().catch(() => {});
}
