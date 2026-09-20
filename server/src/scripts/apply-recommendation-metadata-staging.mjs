import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const verifyOnly = process.argv.includes('--verify-only');
const editorialSample = process.argv.includes('--editorial-sample');
const schemaOnly = process.argv.includes('--schema-only');
const schemaMigrationUrl = new URL('../../migrations/20260913_recommendation_content_metadata.sql', import.meta.url);
const backfillMigrationUrl = new URL('../../migrations/20260913_recommendation_content_metadata_backfill.sql', import.meta.url);
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
  if (!verifyOnly && !editorialSample) {
    await client.query(await readFile(fileURLToPath(schemaMigrationUrl), 'utf8'));
    if (!schemaOnly) {
      await client.query(await readFile(fileURLToPath(backfillMigrationUrl), 'utf8'));
    }
  }

  const schema = await client.query(`
    select
      count(*)::int as expected_columns,
      bool_and(not attnotnull) as all_nullable
    from pg_attribute
    where attrelid = 'public.posts'::regclass
      and attnum > 0
      and not attisdropped
      and attname = any($1::text[])
  `, [[
    'content_form', 'content_form_source', 'content_form_confidence',
    'word_count', 'word_count_source', 'script_code', 'script_source',
    'script_confidence', 'recommendation_metadata_updated_at',
  ]]);
  const constraints = await client.query(`
    select count(*)::int as expected_constraints, bool_and(convalidated) as all_validated
    from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = any($1::text[])
  `, [[
    'posts_content_form_check', 'posts_content_form_confidence_check',
    'posts_word_count_check', 'posts_script_code_check', 'posts_script_confidence_check',
  ]]);
  const coverage = await client.query(`
    select
      count(*)::int as total_posts,
      count(content_form)::int as content_form_count,
      count(word_count)::int as word_count_count,
      count(script_code)::int as script_count,
      count(*) filter (where content_form is null)::int as content_form_review_count,
      count(*) filter (where script_code is null)::int as script_review_count
    from public.posts
  `);
  const coverageGroups = await client.query(`
    select 'content_form' as dimension, coalesce(content_form, '(review)') as value, count(*)::int as post_count
    from public.posts
    group by coalesce(content_form, '(review)')
    union all
    select 'language', coalesce(nullif(language_code, ''), '(unknown)'), count(*)::int
    from public.posts
    group by coalesce(nullif(language_code, ''), '(unknown)')
    union all
    select 'script', coalesce(script_code, '(review)'), count(*)::int
    from public.posts
    group by coalesce(script_code, '(review)')
    order by dimension, value
  `);
  const sample = editorialSample
    ? await client.query(`
        select
          id,
          title,
          category,
          language_code,
          content_form,
          content_form_source,
          word_count,
          word_count_source,
          script_code,
          script_source,
          left(regexp_replace(coalesce(content, ''), '\\s+', ' ', 'g'), 280) as content_excerpt
        from public.posts
        order by created_at, id
      `)
    : null;

  const schemaResult = schema.rows[0];
  const constraintResult = constraints.rows[0];
  if (schemaResult?.expected_columns !== 9 || schemaResult?.all_nullable !== true
      || constraintResult?.expected_constraints !== 5 || constraintResult?.all_validated !== true) {
    throw new Error(`Recommendation metadata staging verification failed: ${JSON.stringify({ schemaResult, constraintResult })}`);
  }

  console.log(JSON.stringify({
    stagingProject: STAGING_PROJECT_REF,
    mode: editorialSample ? 'editorial-sample' : (verifyOnly ? 'verify-only' : (schemaOnly ? 'schema-only' : 'schema-and-backfill')),
    schema: schemaResult,
    constraints: constraintResult,
    coverage: coverage.rows[0],
    coverageGroups: coverageGroups.rows,
    ...(sample ? { sample: sample.rows } : {}),
  }, null, 2));
} finally {
  await client.end().catch(() => {});
}
