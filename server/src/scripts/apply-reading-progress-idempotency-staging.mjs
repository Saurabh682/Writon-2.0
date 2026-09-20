import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const verifyOnly = process.argv.includes('--verify-only');
const migrationUrl = new URL('../../migrations/20260913_reading_progress_idempotency.sql', import.meta.url);
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
    await client.query(await readFile(fileURLToPath(migrationUrl), 'utf8'));
  }

  const result = await client.query(`
    select
      to_regclass('public.reading_progress_mutations') is not null as table_exists,
      (
        select count(*)::int
        from pg_attribute
        where attrelid = 'public.reading_progress_mutations'::regclass
          and attnum > 0
          and not attisdropped
          and attname = any(array[
            'user_id', 'post_id', 'client_mutation_id', 'received_at', 'expires_at'
          ])
      ) as expected_columns,
      (
        select count(*)::int
        from pg_constraint
        where conrelid = 'public.reading_progress_mutations'::regclass
          and contype in ('p', 'f')
          and convalidated
      ) as validated_key_constraints,
      (
        select relrowsecurity
        from pg_class
        where oid = 'public.reading_progress_mutations'::regclass
      ) as rls_enabled,
      not has_table_privilege('anon', 'public.reading_progress_mutations', 'select')
        and not has_table_privilege('authenticated', 'public.reading_progress_mutations', 'select')
        as client_select_revoked,
      (
        select count(*)::int
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'reading_progress_mutations'
          and indexname = any(array[
            'reading_progress_mutations_pkey',
            'reading_progress_mutations_post_idx',
            'reading_progress_mutations_expiry_idx'
          ])
      ) as expected_indexes
  `);
  const verification = result.rows[0];
  if (verification?.table_exists !== true
      || verification?.expected_columns !== 5
      || verification?.validated_key_constraints !== 3
      || verification?.rls_enabled !== true
      || verification?.client_select_revoked !== true
      || verification?.expected_indexes !== 3) {
    throw new Error(`Reading-progress idempotency staging verification failed: ${JSON.stringify(verification)}`);
  }

  console.log(JSON.stringify({
    stagingProject: STAGING_PROJECT_REF,
    mode: verifyOnly ? 'verify-only' : 'apply-and-verify',
    verification,
  }, null, 2));
} finally {
  await client.end().catch(() => {});
}
