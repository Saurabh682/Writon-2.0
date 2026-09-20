import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const PRODUCTION_PROJECT_REF = 'rrxaitxeirykmiihgiqj';
const productionRequested = process.argv.includes('--production');
const verifyOnly = process.argv.includes('--verify-only');
const migrationUrl = new URL('../../migrations/20260919_founding_writer_entitlements.sql', import.meta.url);
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);

const secretName = productionRequested
  ? 'writon-database-url-production'
  : 'writon-database-url-staging';
const suppliedUrl = productionRequested
  ? process.env.DATABASE_URL
  : process.env.STAGING_DATABASE_URL;
const retrievedUrl = suppliedUrl || execSync(
  `gcloud secrets versions access latest --secret=${secretName} --project=writon-app-2020`,
  { encoding: 'utf8', windowsHide: true },
).trim();

const connectionString = productionRequested
  ? retrievedUrl
  : validateStagingDatabaseTarget({
      stagingDatabaseUrl: retrievedUrl,
      productionDatabaseUrl: process.env.DATABASE_URL,
      allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
      expectedProjectRef: STAGING_PROJECT_REF,
    });

if (productionRequested && !connectionString.includes(PRODUCTION_PROJECT_REF)) {
  throw new Error(`Refusing production migration: expected ${PRODUCTION_PROJECT_REF}.`);
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
  if (!verifyOnly) {
    await client.query('begin');
    try {
      await client.query("set local lock_timeout = '5s'");
      await client.query(await readFile(fileURLToPath(migrationUrl), 'utf8'));
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }

  const result = await client.query(`
    select
      count(*) filter (where attname = 'founding_writer_number')::int as founding_number_columns,
      count(*) filter (where attname = 'email_verified' and attnotnull)::int as verified_not_null_columns,
      exists (
        select 1 from pg_constraint
        where conrelid = 'public.profiles'::regclass
          and conname = 'profiles_founding_writer_number_range'
          and contype = 'c' and convalidated
      ) as range_constraint,
      exists (
        select 1 from pg_indexes
        where schemaname = 'public' and tablename = 'profiles'
          and indexname = 'profiles_founding_writer_number_unique'
          and indexdef ilike '%unique%'
          and indexdef ilike '%where (founding_writer_number is not null)%'
      ) as unique_partial_index
    from pg_attribute
    where attrelid = 'public.profiles'::regclass
      and attnum > 0 and not attisdropped
      and attname = any(array['founding_writer_number', 'email_verified'])
  `);
  const verification = result.rows[0];
  const fieldsExist = verification.founding_number_columns === 1
    && verification.verified_not_null_columns === 1;
  const dataVerification = fieldsExist
    ? (await client.query(`
        select
          count(*) filter (where founding_writer_number is not null)::int as assigned_founders,
          count(*) filter (where email_verified is null)::int as null_verification_flags
        from public.profiles
      `)).rows[0]
    : { assigned_founders: null, null_verification_flags: null };
  Object.assign(verification, dataVerification);
  if (verification.founding_number_columns !== 1
      || verification.verified_not_null_columns !== 1
      || verification.range_constraint !== true
      || verification.unique_partial_index !== true
      || verification.null_verification_flags !== 0) {
    throw new Error(`Founding Writer entitlement verification failed: ${JSON.stringify(verification)}`);
  }

  console.log(JSON.stringify({
    environment: productionRequested ? 'production' : 'staging',
    projectRef: productionRequested ? PRODUCTION_PROJECT_REF : STAGING_PROJECT_REF,
    mode: verifyOnly ? 'verify-only' : 'apply-and-verify',
    verification,
  }, null, 2));
} finally {
  await client.end().catch(() => {});
}
