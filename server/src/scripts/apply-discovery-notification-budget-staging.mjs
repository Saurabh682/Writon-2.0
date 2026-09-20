import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const EXPECTED_STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const stagingDatabaseUrl = process.env.STAGING_DATABASE_URL || execSync(
  'gcloud secrets versions access latest --secret=writon-database-url-staging --project=writon-app-2020',
  { encoding: 'utf8' },
).trim();
const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl,
  productionDatabaseUrl: process.env.DATABASE_URL,
  allowRemoteStaging: true,
});
if (!connectionString.includes(EXPECTED_STAGING_PROJECT_REF)) {
  throw new Error(`Refusing discovery migration: expected staging project ${EXPECTED_STAGING_PROJECT_REF}.`);
}

const client = new pg.Client({
  connectionString,
  ssl: { ca: await readFile(new URL('../../staging/prod-ca-2021.crt', import.meta.url), 'utf8'), rejectUnauthorized: true },
});
try {
  await client.connect();
  await client.query(await readFile(new URL('../../migrations/20260909_discovery_notification_budget.sql', import.meta.url), 'utf8'));
  const verification = await client.query(`
    select
      table_row.relrowsecurity as rls_enabled,
      not has_table_privilege('anon', 'public.discovery_notification_deliveries', 'select') as anon_denied,
      not has_table_privilege('authenticated', 'public.discovery_notification_deliveries', 'select') as authenticated_denied,
      has_table_privilege('service_role', 'public.discovery_notification_deliveries', 'select,insert,update') as service_access,
      has_function_privilege('service_role', 'public.claim_discovery_notification(text,text,uuid,text,uuid,date,text)', 'execute') as service_execute,
      not has_function_privilege('anon', 'public.claim_discovery_notification(text,text,uuid,text,uuid,date,text)', 'execute') as anon_execute_denied,
      exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'discovery_notification_deliveries_budget_idx') as budget_index
      , (select relrowsecurity from pg_class where oid = 'public.discovery_notification_identities'::regclass) as identity_rls
      , not has_table_privilege('anon', 'public.discovery_notification_identities', 'select') as identity_anon_denied
      , not has_table_privilege('authenticated', 'public.discovery_notification_identities', 'select') as identity_authenticated_denied
      , has_function_privilege('service_role', 'public.link_discovery_notification_identity(uuid,text)', 'execute') as identity_service_execute
      , not has_function_privilege('anon', 'public.link_discovery_notification_identity(uuid,text)', 'execute') as identity_anon_execute_denied
      , not has_function_privilege('authenticated', 'public.link_discovery_notification_identity(uuid,text)', 'execute') as identity_authenticated_execute_denied
    from pg_class table_row join pg_namespace namespace on namespace.oid = table_row.relnamespace
    where namespace.nspname = 'public' and table_row.relname = 'discovery_notification_deliveries'
  `);
  const row = verification.rows[0];
  if (verification.rowCount !== 1 || Object.values(row).some((value) => value !== true)) {
    throw new Error(`Discovery staging migration verification failed: ${JSON.stringify(row)}`);
  }
  console.log(JSON.stringify({ stagingProject: EXPECTED_STAGING_PROJECT_REF, verified: row }, null, 2));
} finally {
  await client.end().catch(() => {});
}
