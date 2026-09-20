import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import pg from 'pg';
import Fastify from 'fastify';
import { notificationRoutes } from '../routes/notifications.js';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL || execSync(
    'gcloud secrets versions access latest --secret=writon-database-url-staging --project=writon-app-2020',
    { encoding: 'utf8' }).trim(),
  productionDatabaseUrl: process.env.DATABASE_URL, allowRemoteStaging: true,
});
assert(connectionString.includes('xrfnebvkazewqramkpri'), 'Only the known staging database is permitted.');
const database = new pg.Pool({ connectionString, max: 4,
  connectionTimeoutMillis: 15000, statement_timeout: 15000,
  ssl: { ca: await readFile(new URL('../../staging/prod-ca-2021.crt', import.meta.url), 'utf8'), rejectUnauthorized: true } });
const owner = `staging:discovery:${randomUUID()}`;
const recipient = `profile:${owner}`;
const installation = randomUUID();
const guestRecipient = `installation:${installation}`;
const token = `staging-budget-${randomUUID()}`;
const app = Fastify({ logger: false });
let postId;
try {
  await database.query("insert into public.profiles (id, account_type) values ($1, 'human')", [owner]);
  const post = await database.query(`insert into public.posts (author_id, title, status, is_public, updated_at)
    values ($1, 'Disposable discovery budget check', 'draft', false, now() - interval '6 days') returning id`, [owner]);
  postId = post.rows[0].id;
  const claim = async (date, profile = owner) => (await database.query(
    'select public.claim_discovery_notification($1,$2,null,$3,$4,$5,$6) as claimed',
    [recipient, profile, 'draft_nudge', postId, date, randomUUID()])).rows[0].claimed;
  const date = (await database.query("select (now() at time zone 'Asia/Kolkata')::date::text as today")).rows[0].today;
  assert.equal(await claim(date, 'not-the-owner'), false, 'Another account must not claim this draft.');
  const concurrent = await Promise.allSettled(Array.from({ length: 4 }, () => claim(date)));
  for (const result of concurrent) assert.equal(result.status, 'fulfilled', 'Concurrent claim failed.');
  assert.equal(concurrent.filter(result => result.value === true).length, 1, 'Exactly one concurrent claim may succeed.');
  assert.equal(await claim(date), false, 'Same-day repeat must be blocked.');
  await database.query(`update public.discovery_notification_deliveries
    set local_date = local_date - 1, claimed_at = now() - interval '1 day' where recipient_key = $1`, [recipient]);
  assert.equal(await claim(date), true, 'Second weekly claim must be permitted on a new day.');
  await database.query(`update public.discovery_notification_deliveries
    set local_date = local_date - 3 where recipient_key = $1`, [recipient]);
  assert.equal(await claim(date), false, 'Third claim inside seven days must be blocked.');
  await database.query(`update public.discovery_notification_deliveries
    set claimed_at = now() - interval '8 days' where recipient_key = $1`, [recipient]);
  assert.equal(await claim(date), true, 'Expired weekly history must stop consuming the cap.');
  await database.query('delete from public.discovery_notification_deliveries where recipient_key = $1', [recipient]);
  await database.query(`insert into public.discovery_notification_deliveries
    (recipient_key, installation_id, kind, local_date, run_id)
    values ($1,$2,'reading_nudge',$3,$4)`, [guestRecipient, installation, date, randomUUID()]);
  await database.query(`insert into public.guest_device_push_tokens (installation_id, token, notification_permission)
    values ($1,$2,'granted')`, [installation, token]);
  await app.register(notificationRoutes, { config: { guestPushRegistrationEnabled: true }, database,
    requireUser: async request => { request.profileId = owner; } });
  const registration = await app.inject({ method: 'PUT', url: '/api/v1/me/devices/push-token',
    payload: { token, installationId: installation, notificationPermission: 'granted' } });
  assert.equal(registration.statusCode, 200, registration.body);
  assert.deepEqual(registration.json(), { registered: true });
  assert.equal((await database.query('select 1 from public.guest_device_push_tokens where installation_id=$1', [installation])).rowCount, 0);
  assert.equal(await claim(date), false, 'Signup must not reset the guest daily cap.');
  await database.query('update public.discovery_notification_deliveries set local_date=local_date-1 where recipient_key=$1', [guestRecipient]);
  assert.equal(await claim(date), true);
  await database.query('update public.discovery_notification_deliveries set local_date=local_date-3 where recipient_key=$1', [recipient]);
  assert.equal(await claim(date), false, 'Guest plus account history must consume the weekly cap.');
  const rotated = await app.inject({ method: 'PUT', url: '/api/v1/me/devices/push-token',
    payload: { token: `${token}-rotated`, installationId: installation, notificationPermission: 'granted' } });
  assert.equal(rotated.statusCode, 200);
  assert.equal(await claim(date), false, 'Token rotation must not reset the cap.');
  await database.query('delete from public.discovery_notification_deliveries where recipient_key=any($1::text[])', [[recipient, guestRecipient]]);
  await database.query("update public.posts set status='published', is_public=true, provenance='human_verified' where id=$1", [postId]);
  const mixed = await Promise.allSettled([true, false, true, false].map(async signed =>
    (await database.query('select public.claim_discovery_notification($1,$2,$3,$4,$5,$6,$7) as claimed',
      [signed ? recipient : guestRecipient, signed ? owner : null, signed ? null : installation,
        'reading_nudge', postId, date, randomUUID()])).rows[0].claimed));
  for (const result of mixed) assert.equal(result.status, 'fulfilled');
  assert.equal(mixed.filter(result => result.value === true).length, 1, 'Linked guest/account concurrent claims must have one winner.');
  console.log('PASS: registration contract, signup daily/weekly continuity, token rotation, linked-identity concurrency.');
  console.log('PASS: ownership, concurrent claims, daily cap, weekly cap, expired history. No push sent.');
} finally {
  try {
    await app.close();
    await database.query('delete from public.discovery_notification_deliveries where recipient_key = any($1::text[])', [[recipient, guestRecipient]]);
    await database.query('delete from public.guest_device_push_tokens where installation_id=$1', [installation]);
    if (postId) await database.query('delete from public.posts where id = $1 and author_id = $2', [postId, owner]);
    await database.query('delete from public.profiles where id = $1', [owner]);
    assert.equal((await database.query('select 1 from public.discovery_notification_identities where profile_id=$1', [owner])).rowCount, 0, 'Identity links must cascade on account deletion.');
    const remaining = await database.query('select count(*)::int as count from public.discovery_notification_deliveries where recipient_key = $1', [recipient]);
    assert.equal(remaining.rows[0].count, 0);
    console.log('Cleanup verified: disposable staging records removed.');
  } finally { await database.end(); }
}
