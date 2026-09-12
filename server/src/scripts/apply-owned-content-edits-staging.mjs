import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const migrationUrl = new URL('../../migrations/20260911_owned_content_edits.sql', import.meta.url);
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
  productionDatabaseUrl: process.env.DATABASE_URL,
  allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
});

if (!connectionString.includes(STAGING_PROJECT_REF)) {
  throw new Error(`Refusing owned-content migration: expected staging project ${STAGING_PROJECT_REF}.`);
}

const databaseHost = new URL(connectionString).hostname;
const client = new pg.Client({
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
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'posts'
          and column_name = 'content_updated_at' and data_type = 'timestamp with time zone'
      ) as post_update_timestamp,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'comments'
          and column_name = 'updated_at' and data_type = 'timestamp with time zone'
      ) as comment_update_timestamp
  `);
  const result = verification.rows[0];
  if (!result?.post_update_timestamp || !result?.comment_update_timestamp) {
    throw new Error(`Owned-content staging migration verification failed: ${JSON.stringify(result)}`);
  }

  console.log('Staging migration verified: story and comment update timestamps are available.');
} finally {
  await client.end().catch(() => {});
}
