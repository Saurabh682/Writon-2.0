import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const migrationUrl = new URL('../../migrations/20260905_profile_engagement_preferences.sql', import.meta.url);

const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
  productionDatabaseUrl: process.env.DATABASE_URL,
  allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
});

const databaseHost = new URL(connectionString).hostname;
const client = new Client({
  connectionString,
  ssl: ['localhost', '127.0.0.1', '::1'].includes(databaseHost)
    ? false
    : { rejectUnauthorized: true },
});

try {
  const migration = await readFile(fileURLToPath(migrationUrl), 'utf8');
  await client.connect();
  await client.query('begin');
  await client.query(migration);

  const verification = await client.query(`
    select
      c.relrowsecurity as rls_enabled,
      count(a.attname)::int as expected_columns
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
  if (!result || result.rls_enabled !== true || result.expected_columns !== 8) {
    throw new Error('Migration verification failed: expected eight columns and RLS enabled.');
  }

  await client.query('commit');
  console.log('Staging migration verified: profile_engagement_preferences exists with RLS enabled.');
} catch (error) {
  await client.query('rollback').catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
