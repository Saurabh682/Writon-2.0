import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const STAGING_REF = 'xrfnebvkazewqramkpri';
const PRODUCTION_REF = 'rrxaitxeirykmiihgiqj';
const production = process.argv.includes('--production');
const verifyOnly = process.argv.includes('--verify-only');
const expectedRef = production ? PRODUCTION_REF : STAGING_REF;
const secretName = production ? 'writon-database-url-production' : 'writon-database-url-staging';
const connectionString = (production ? process.env.DATABASE_URL : process.env.STAGING_DATABASE_URL) || execSync(
  `gcloud secrets versions access latest --secret=${secretName} --project=writon-app-2020`,
  { encoding: 'utf8', windowsHide: true },
).trim();

if (!connectionString.includes(expectedRef)) {
  throw new Error(`Refusing Founding Writer assignment migration outside ${expectedRef}.`);
}

const certificate = await readFile(fileURLToPath(new URL('../../staging/prod-ca-2021.crt', import.meta.url)), 'utf8');
const client = new pg.Client({ connectionString, ssl: { ca: certificate, rejectUnauthorized: true } });

try {
  await client.connect();
  if (!verifyOnly) {
    const migration = await readFile(fileURLToPath(new URL('../../migrations/20260920_founding_writer_assignments.sql', import.meta.url)), 'utf8');
    await client.query(migration);
  }
  const result = await client.query(`
    select
      to_regclass('public.founding_writer_assignments') is not null as ledger_exists,
      (select count(*)::int from pg_trigger where tgname = 'founding_writer_assignments_immutable' and not tgisinternal) as immutable_triggers,
      (select count(*)::int from public.founding_writer_assignments) as assignments
  `);
  if (!result.rows[0]?.ledger_exists || result.rows[0]?.immutable_triggers !== 1) {
    throw new Error(`Founding Writer assignment verification failed: ${JSON.stringify(result.rows[0])}`);
  }
  console.log(JSON.stringify({ target: production ? 'production' : 'staging', ...result.rows[0] }, null, 2));
} finally {
  await client.end().catch(() => {});
}
