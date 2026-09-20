import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const productionRequested = process.argv.includes('--production');

if (!databaseUrl) throw new Error('DATABASE_URL is required.');
if (!productionRequested || !databaseUrl.includes('rrxaitxeirykmiihgiqj')) {
  throw new Error('Refusing to modify a database without --production and the expected production project reference.');
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

try {
  const before = await pool.query(
    'select kind, count(*)::int as count from public.notifications group by kind order by kind',
  );
  const migration = fs.readFileSync(
    path.resolve('migrations/20260907_notification_kind_contract.sql'),
    'utf8',
  );
  await pool.query(migration);
  const constraint = await pool.query(
    `select pg_get_constraintdef(oid) as definition
       from pg_constraint
      where conrelid = 'public.notifications'::regclass
        and conname = 'notifications_kind_check'`,
  );
  console.log(JSON.stringify({
    applied: true,
    existingKinds: before.rows,
    constraint: constraint.rows[0]?.definition ?? null,
  }));
} finally {
  await pool.end();
}
