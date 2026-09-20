import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const migrationUrl = new URL('../../migrations/20260916_email_engagement.sql', import.meta.url);
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
  allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
});

if (!connectionString.includes(STAGING_PROJECT_REF)) {
  throw new Error(`Refusing email engagement migration: expected staging project ${STAGING_PROJECT_REF}.`);
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
  const verifyOnly = process.argv.includes('--verify-only');
  if (!verifyOnly) {
    await client.query(await readFile(fileURLToPath(migrationUrl), 'utf8'));
  }

  const verification = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any($1::text[])
  `, [[
    'user_email_preferences',
    'email_jobs',
    'email_delivery_events',
    'email_suppressions',
    'email_daily_capacity',
    'email_preference_audit',
    'writer_engagement_events',
  ]]);

  const foundTables = new Set(verification.rows.map(r => r.table_name));
  const expectedTables = [
    'user_email_preferences',
    'email_jobs',
    'email_delivery_events',
    'email_suppressions',
    'email_daily_capacity',
    'email_preference_audit',
    'writer_engagement_events',
  ];

  for (const table of expectedTables) {
    if (!foundTables.has(table)) {
      throw new Error(`Email engagement migration verification failed: missing table ${table}`);
    }
  }

  console.log('Staging migration verified: all 7 email engagement tables exist.');
} finally {
  await client.end().catch(() => {});
}
