import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';
import { runFollowedWriterNotifications } from '../jobs/followed-writer-notifications.js';

const { Pool } = pg;
const STAGING_PROJECT_REF = 'xrfnebvkazewqramkpri';
const certificateUrl = new URL('../../staging/prod-ca-2021.crt', import.meta.url);
const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
  productionDatabaseUrl: process.env.DATABASE_URL,
  allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
  expectedProjectRef: STAGING_PROJECT_REF,
});
const databaseHost = new URL(connectionString).hostname;
const database = new Pool({
  connectionString,
  ssl: ['localhost', '127.0.0.1', '::1'].includes(databaseHost)
    ? false
    : {
        ca: await readFile(fileURLToPath(certificateUrl), 'utf8'),
        rejectUnauthorized: true,
      },
});

const ids = {
  author: 'staging:notification-author',
  reader: 'staging:notification-reader',
  botReader: 'staging:notification-bot-reader',
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await database.query('delete from public.profiles where id = any($1::text[])', [Object.values(ids)]);
  await database.query(
    `insert into public.profiles (id, account_type) values
       ($1, 'human'), ($2, 'human'), ($3, 'editorial_bot')`,
    [ids.author, ids.reader, ids.botReader],
  );
  await database.query(
    `insert into public.follows (follower_id, following_id)
     values ($1, $3), ($2, $3)`,
    [ids.reader, ids.botReader, ids.author],
  );
  await database.query(
    `insert into public.notification_preferences (
       profile_id, publishing_enabled, followed_writer_published_enabled, timezone
     ) values ($1, true, true, 'Asia/Kolkata')`,
    [ids.reader],
  );

  const firstPost = await database.query(
    `insert into public.posts (author_id, title, status, is_public, provenance, published_at)
     values ($1, 'First staging publication', 'published', true, 'human_verified', now())
     returning id`,
    [ids.author],
  );
  await database.query(
    `update public.posts set status = 'published', is_public = true where id = $1`,
    [firstPost.rows[0].id],
  );
  const firstEvents = await database.query(
    `select id::text from public.publication_notification_events where post_id = $1`,
    [firstPost.rows[0].id],
  );
  assert(firstEvents.rowCount === 1, 'Repeated publication state created a duplicate event.');

  await runFollowedWriterNotifications(database, { limit: 1, eventIds: [firstEvents.rows[0].id] });

  const firstDelivery = await database.query(
    `select notification.recipient_id, notification.kind, notification.message, delivery.status
      from public.notifications notification
       join public.notification_delivery_outbox delivery on delivery.notification_id = notification.id
      where notification.recipient_id = $1 and notification.actor_id = $2
        and notification.deduplication_key like 'followed_writer_published:%'`,
    [ids.reader, ids.author],
  );
  assert(firstDelivery.rowCount === 1, 'Expected exactly one human follower notification and outbox row.');
  assert(firstDelivery.rows[0].recipient_id === ids.reader, 'A non-human follower entered publication fan-out.');
  assert(firstDelivery.rows[0].kind === 'followed_writer_published', 'Publication notification did not use its canonical kind.');
  assert(firstDelivery.rows[0].status === 'pending', 'Delivery should remain queued and unsent in staging.');

  const secondPost = await database.query(
    `insert into public.posts (author_id, title, status, is_public, provenance, published_at)
     values ($1, 'Second staging publication', 'published', true, 'human_verified', now())
     returning id`,
    [ids.author],
  );
  const secondEvent = await database.query(
    `select id::text from public.publication_notification_events where post_id = $1`,
    [secondPost.rows[0].id],
  );
  assert(secondEvent.rowCount === 1, 'Second publication did not create one event.');
  await runFollowedWriterNotifications(database, { limit: 1, eventIds: [secondEvent.rows[0].id] });

  const batched = await database.query(
    `select notification.message, count(delivery.id)::int as deliveries
       from public.notifications notification
       left join public.notification_delivery_outbox delivery on delivery.notification_id = notification.id
      where notification.recipient_id = $1 and notification.actor_id = $2
        and notification.deduplication_key like 'followed_writer_published:%'
      group by notification.id`,
    [ids.reader, ids.author],
  );
  assert(batched.rowCount === 1, 'Same-author publications did not remain one local-day notification.');
  assert(batched.rows[0].message === 'published new stories', 'Same-day notification was not converted to a batch.');
  assert(batched.rows[0].deliveries === 1, 'Same-day batching created duplicate delivery work.');

  const recoverablePost = await database.query(
    `insert into public.posts (author_id, title, status, is_public, provenance, published_at)
     values ($1, 'Recoverable staging publication', 'published', true, 'human_verified', now() + interval '1 day')
     returning id`,
    [ids.author],
  );
  const recoverableEvent = await database.query(
    `update public.publication_notification_events
        set status = 'processing', attempts = 1, updated_at = now() - interval '10 minutes'
      where post_id = $1`,
    [recoverablePost.rows[0].id],
  );
  const recoverableEventId = await database.query(
    `select id::text from public.publication_notification_events where post_id = $1`,
    [recoverablePost.rows[0].id],
  );
  assert(recoverableEvent.rowCount === 1 && recoverableEventId.rowCount === 1, 'Recoverable event setup failed.');
  await runFollowedWriterNotifications(database, { limit: 1, eventIds: [recoverableEventId.rows[0].id] });
  const recovered = await database.query(
    `select status, attempts from public.publication_notification_events where post_id = $1`,
    [recoverablePost.rows[0].id],
  );
  assert(recovered.rows[0]?.status === 'done', 'A stale processing fan-out claim was not recovered.');
  assert(recovered.rows[0]?.attempts === 2, 'Recovered fan-out did not record its retry attempt.');

  const exhaustedPost = await database.query(
    `insert into public.posts (author_id, title, status, is_public, provenance, published_at)
     values ($1, 'Exhausted staging publication', 'published', true, 'human_verified', now() + interval '2 days')
     returning id`,
    [ids.author],
  );
  const exhaustedEvent = await database.query(
    `update public.publication_notification_events
        set status = 'processing', attempts = 5, updated_at = now() - interval '10 minutes'
      where post_id = $1`,
    [exhaustedPost.rows[0].id],
  );
  const exhaustedEventId = await database.query(
    `select id::text from public.publication_notification_events where post_id = $1`,
    [exhaustedPost.rows[0].id],
  );
  assert(exhaustedEvent.rowCount === 1 && exhaustedEventId.rowCount === 1, 'Exhausted event setup failed.');
  await runFollowedWriterNotifications(database, { limit: 1, eventIds: [exhaustedEventId.rows[0].id] });
  const exhausted = await database.query(
    `select status, attempts from public.publication_notification_events where post_id = $1`,
    [exhaustedPost.rows[0].id],
  );
  assert(exhausted.rows[0]?.status === 'failed', 'An exhausted stale fan-out claim did not become terminal.');
  assert(exhausted.rows[0]?.attempts === 5, 'Terminal fan-out unexpectedly consumed another attempt.');

  console.log('Staging notification pipeline verified: atomic event capture, human-only batching, stale-claim recovery, terminal attempts, and unsent outbox state pass.');
} finally {
  await database.query('delete from public.profiles where id = any($1::text[])', [Object.values(ids)]).catch(() => {});
  await database.end().catch(() => {});
}
