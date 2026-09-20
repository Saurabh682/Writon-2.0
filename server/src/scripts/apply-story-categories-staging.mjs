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
  throw new Error(`Refusing story category migration: expected staging project ${EXPECTED_STAGING_PROJECT_REF}.`);
}

const migrationUrl = new URL('../../migrations/20260903_story_category_catalog.sql', import.meta.url);
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const client = new pg.Client({
  connectionString,
  ssl: { ca: await readFile(certificateUrl, 'utf8'), rejectUnauthorized: true },
});

try {
  await client.connect();
  await client.query(await readFile(migrationUrl, 'utf8'));
  const result = await client.query(`
    select count(*)::int as category_count,
           bool_and(is_active) as all_active
      from public.story_categories
  `);
  const security = await client.query(`
    select c.relrowsecurity as rls_enabled,
           has_table_privilege('anon', 'public.story_categories', 'select') as anon_select,
           has_table_privilege('authenticated', 'public.story_categories', 'select') as authenticated_select,
           has_table_privilege('service_role', 'public.story_categories', 'select') as service_select
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'story_categories'
  `);
  const table = security.rows[0];
  if (result.rows[0]?.category_count !== 18 || !result.rows[0]?.all_active ||
      !table?.rls_enabled || table.anon_select || table.authenticated_select || !table.service_select) {
    throw new Error('Story category staging verification failed.');
  }
  console.log(JSON.stringify({ stagingProject: EXPECTED_STAGING_PROJECT_REF, catalog: result.rows[0], table }, null, 2));
} finally {
  await client.end().catch(() => {});
}
