import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const verifyOnly = process.argv.includes('--verify-only');
const migrationUrl = new URL('../../migrations/20260919_editorial_brain_runtime_memory.sql', import.meta.url);
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);

const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
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
    const migrationSql = await readFile(fileURLToPath(migrationUrl), 'utf8');
    await client.query(migrationSql);
    console.log('[MIGRATION] Applied 20260919_editorial_brain_runtime_memory.sql to staging target.');
  }

  // Verification queries
  const verification = await client.query(`
    SELECT
      to_regclass('public.editorial_insight_reservations') IS NOT NULL AS reservations_table,
      to_regclass('public.editorial_insight_dispatches') IS NOT NULL AS dispatches_table,
      to_regclass('public.editorial_insight_observations') IS NOT NULL AS observations_table,
      to_regprocedure('public.acquire_editorial_insight_lease(text,text,text,text,text,integer)') IS NOT NULL AS lease_function,
      (SELECT count(*)::int FROM pg_indexes WHERE tablename = 'editorial_insight_reservations' AND indexname = 'idx_active_channel_insight') = 1 AS active_lease_idx,
      (SELECT count(*)::int FROM pg_indexes WHERE tablename = 'editorial_insight_dispatches' AND indexname = 'idx_dispatches_archetype_published') = 1 AS archetype_published_idx,
      (SELECT count(*)::int FROM pg_indexes WHERE tablename = 'editorial_insight_dispatches' AND indexname = 'idx_dispatches_unresolved') = 1 AS unresolved_idx
  `);

  console.log('[VERIFY]', JSON.stringify(verification.rows[0], null, 2));

  const allVerified = Object.values(verification.rows[0]).every(Boolean);
  if (!allVerified) {
    throw new Error('Verification failed: not all expected tables, indexes, or functions are present.');
  }

  console.log('[SUCCESS] Staging editorial brain runtime memory schema verified.');
} catch (error) {
  console.error('[ERROR]', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
