import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const EXPECTED_STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
  productionDatabaseUrl: process.env.DATABASE_URL,
  allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
});

if (!connectionString.includes(EXPECTED_STAGING_PROJECT_REF)) {
  throw new Error(`Refusing guest push migration: expected staging project ${EXPECTED_STAGING_PROJECT_REF}.`);
}

const migrationUrl = new URL('../../migrations/20260908_guest_push_registrations.sql', import.meta.url);
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const client = new pg.Client({
  connectionString,
  ssl: { ca: await readFile(certificateUrl, 'utf8'), rejectUnauthorized: true },
});

try {
  await client.connect();
  await client.query(await readFile(migrationUrl, 'utf8'));
  const verification = await client.query(`
    select
      c.relrowsecurity as rls_enabled,
      has_table_privilege('anon', 'public.guest_device_push_tokens', 'select') as anon_select,
      has_table_privilege('authenticated', 'public.guest_device_push_tokens', 'select') as authenticated_select,
      has_table_privilege('service_role', 'public.guest_device_push_tokens', 'select,insert,update,delete') as service_access,
      exists (
        select 1 from pg_indexes
         where schemaname = 'public'
           and tablename = 'guest_device_push_tokens'
           and indexname = 'guest_device_push_tokens_active_seen_idx'
      ) as active_index
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'guest_device_push_tokens'
  `);
  const row = verification.rows[0];
  if (verification.rowCount !== 1 || !row.rls_enabled || row.anon_select || row.authenticated_select || !row.service_access || !row.active_index) {
    throw new Error('Guest push staging verification failed.');
  }
  const registrations = await client.query(`
    select count(*)::int as active_count,
           max(app_version_code)::int as latest_app_version,
           max(last_seen_at) as latest_seen_at
      from public.guest_device_push_tokens
     where revoked_at is null
  `);
  console.log(JSON.stringify({
    stagingProject: EXPECTED_STAGING_PROJECT_REF,
    table: row,
    registrations: registrations.rows[0],
  }, null, 2));
} finally {
  await client.end().catch(() => {});
}
