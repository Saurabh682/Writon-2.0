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
  throw new Error(`Refusing canvas migration: expected staging project ${EXPECTED_STAGING_PROJECT_REF}.`);
}

const migrationUrl = new URL('../../migrations/20260908_editorial_canvas_state.sql', import.meta.url);
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const client = new pg.Client({
  connectionString,
  ssl: {
    ca: await readFile(certificateUrl, 'utf8'),
    rejectUnauthorized: true,
  },
});

try {
  await client.connect();
  await client.query('begin');
  await client.query(await readFile(migrationUrl, 'utf8'));

  const verification = await client.query(`
    select
      c.relname,
      c.relrowsecurity as rls_enabled,
      has_table_privilege('anon', format('public.%I', c.relname), 'select') as anon_select,
      has_table_privilege('authenticated', format('public.%I', c.relname), 'select') as authenticated_select,
      has_table_privilege('service_role', format('public.%I', c.relname), 'select,insert,update,delete') as service_access
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any($1::text[])
    order by c.relname
  `, [['editorial_canvas_documents', 'editorial_canvas_revisions']]);

  if (verification.rowCount !== 2 || verification.rows.some(row => (
    !row.rls_enabled || row.anon_select || row.authenticated_select || !row.service_access
  ))) {
    throw new Error('Canvas staging verification failed: expected RLS, denied client roles, and service-role access.');
  }

  await client.query('commit');
  console.log(JSON.stringify({
    stagingProject: EXPECTED_STAGING_PROJECT_REF,
    tables: verification.rows,
  }, null, 2));
} catch (error) {
  await client.query('rollback').catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
