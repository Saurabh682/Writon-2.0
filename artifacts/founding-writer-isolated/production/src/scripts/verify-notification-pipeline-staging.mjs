import 'dotenv/config';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';
import { runFollowedWriterNotifications } from '../jobs/followed-writer-notifications.js';

const { Pool } = pg;
const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
  productionDatabaseUrl: process.env.DATABASE_URL,
  allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
});
const databaseHost = new URL(connectionString).hostname;
const database = new Pool({
  connectionString,
  ssl: ['localhost', '127.0.0.1', '::1'].includes(databaseHost)
    ? false
    : { rejectUnauthorized: true },
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
    `select count(*)::int as count from public.publication_notification_events where post_id = $1`,
    [firstPost.rows[0].id],
  );
  assert(firstEvents.rows[0].count === 1, 'Repeated publication state created a duplicate event.');

  await runFollowedWriterNotifications(database);

  const firstDelivery = await database.query(
    `select notification.recipient_id, notification.kind, notification.message, delivery.status
       from public.notifications notification
       join public.notification_delivery_outbox delivery on delivery.notification_id = notification.id
      where notification.deduplication_key like 'followed_writer_published:%'`,
  );
  assert(firstDelivery.rowCount === 1, 'Expected exactly one human follower notification and outbox row.');
  assert(firstDelivery.rows[0].recipient_id === ids.reader, 'A non-human follower entered publication fan-out.');
  assert(firstDelivery.rows[0].kind === 'followed_writer_published', 'Publication notification did not use its canonical kind.');
  assert(firstDelivery.rows[0].status === 'pending', 'Delivery should remain queued and unsent in staging.');

  await database.query(
    `insert into public.posts (author_id, title, status, is_public, provenance, published_at)
     values ($1, 'Second staging publication', 'published', true, 'human_verified', now())`,
    [ids.author],
  );
  await runFollowedWriterNotifications(database);

  const batched = await database.query(
    `select notification.message, count(delivery.id)::int as deliveries
       from public.notifications notification
       left join public.notification_delivery_outbox delivery on delivery.notification_id = notification.id
      where notification.deduplication_key like 'followed_writer_published:%'
      group by notification.id`,
  );
  assert(batched.rowCount === 1, 'Same-author publications did not remain one local-day notification.');
  assert(batched.rows[0].message === 'published new stories', 'Same-day notification was not converted to a batch.');
  assert(batched.rows[0].deliveries === 1, 'Same-day batching created duplicate delivery work.');

  console.log('Staging notification pipeline verified: atomic event capture, human-only fan-out, batching, and unsent outbox state pass.');
} finally {
  await database.query('delete from public.profiles where id = any($1::text[])', [Object.values(ids)]).catch(() => {});
  await database.end().catch(() => {});
}
