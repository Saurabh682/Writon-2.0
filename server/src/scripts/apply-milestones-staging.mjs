import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const migrationUrl = new URL('../../migrations/20260830_user_milestones.sql', import.meta.url);
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
  allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
});

if (!connectionString.includes(STAGING_PROJECT_REF)) {
  throw new Error(`Refusing milestone migration: expected staging project ${STAGING_PROJECT_REF}.`);
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
  await client.query(await readFile(fileURLToPath(migrationUrl), 'utf8'));
  const verification = await client.query(`
    select
      c.relrowsecurity as rls_enabled,
      count(a.attname)::int as expected_columns,
      to_regclass('public.user_milestones_profile_earned_idx') is not null as expected_index
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relname = 'user_milestones'
      and a.attnum > 0
      and not a.attisdropped
      and a.attname = any($1::text[])
    group by c.relrowsecurity
  `, [['profile_id', 'milestone_key', 'earned_at', 'created_at']]);

  const result = verification.rows[0];
  if (!result || !result.rls_enabled || result.expected_columns !== 4 || !result.expected_index) {
    throw new Error('Milestone migration verification failed: expected four columns, RLS, and lookup index.');
  }
  console.log('Staging migration verified: user_milestones exists with RLS and its lookup index enabled.');
} finally {
  await client.end().catch(() => {});
}
