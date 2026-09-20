import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const shouldApply = process.argv.includes('--apply');
const shouldSmoke = process.argv.includes('--smoke');
const shouldCheckToday = process.argv.includes('--today-status');
const shouldCheckEligibility = process.argv.includes('--eligibility-status');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  const before = await pool.query(`
    select to_regclass('public.notification_dispatch_ledger') is not null as exists
  `);

  if (shouldCheckEligibility) {
    const eligible = await pool.query(`
      select count(*)::int as count
      from public.posts p
      inner join public.profiles author
        on author.id = p.author_id and author.account_type = 'human'
      where p.status = 'published' and p.is_public = true
        and p.provenance = 'human_verified'
        and coalesce(p.published_at, p.created_at) >= now() - interval '24 hours'
    `);
    console.log(JSON.stringify({ eligibleStoriesLast24Hours: eligible.rows[0]?.count || 0 }));
  } else if (shouldCheckToday) {
    const today = await pool.query(`
      select status, claimed_at, completed_at, result
      from public.notification_dispatch_ledger
      where dispatch_key = 'daily_digest:'
        || to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD')
    `);
    console.log(JSON.stringify({
      existingClaims: today.rowCount,
      status: today.rows[0]?.status || null,
      claimedAt: today.rows[0]?.claimed_at || null,
      completedAt: today.rows[0]?.completed_at || null,
      result: today.rows[0]?.result || null,
    }));
  } else if (shouldSmoke) {
    if (before.rows[0]?.exists !== true) throw new Error('Dispatch ledger is not installed');
    const dispatchKey = `smoke:daily_digest:${randomUUID()}`;
    const claim = () => pool.query(`
      insert into public.notification_dispatch_ledger (
        dispatch_key, dispatch_kind, status
      ) values ($1, 'smoke_daily_digest', 'claimed')
      on conflict (dispatch_key) do nothing
      returning dispatch_key
    `, [dispatchKey]);
    const claims = await Promise.all([claim(), claim()]);
    const winners = claims.filter((result) => result.rowCount === 1).length;
    await pool.query(`
      update public.notification_dispatch_ledger
         set status = 'completed', completed_at = now(),
             result = '{"smoke":true}'::jsonb, updated_at = now()
       where dispatch_key = $1
    `, [dispatchKey]);
    console.log(JSON.stringify({ atomicClaimWinners: winners, passed: winners === 1 }));
    if (winners !== 1) process.exitCode = 1;
  } else if (!shouldApply) {
    console.log(JSON.stringify({ exists: before.rows[0]?.exists === true, applied: false }));
    process.exitCode = before.rows[0]?.exists === true ? 0 : 2;
  } else {
    const migrationUrl = new URL('../../migrations/20260905_daily_digest_dispatch_ledger.sql', import.meta.url);
    const migration = await readFile(migrationUrl, 'utf8');
    await pool.query(migration);

    const verified = await pool.query(`
      select
        to_regclass('public.notification_dispatch_ledger') is not null as exists,
        c.relrowsecurity as rls_enabled,
        not has_table_privilege('anon', c.oid, 'select') as anon_select_revoked,
        not has_table_privilege('authenticated', c.oid, 'select') as authenticated_select_revoked,
        has_table_privilege('service_role', c.oid, 'select,insert,update') as service_role_access
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'notification_dispatch_ledger'
    `);
    console.log(JSON.stringify({ ...verified.rows[0], applied: true }));
  }
} finally {
  await pool.end();
}
