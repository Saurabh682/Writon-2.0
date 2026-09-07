import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import pg from 'pg';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Client } = pg;
const migrationUrls = [
  new URL('../../staging/bootstrap/002_api_smoke_dependencies.sql', import.meta.url),
  new URL('../../migrations/20260822_reading_history.sql', import.meta.url),
  new URL('../../migrations/20260827_notification_delivery.sql', import.meta.url),
  new URL('../../migrations/20260830_personalized_reader_feed.sql', import.meta.url),
  new URL('../../migrations/20260905_daily_digest_dispatch_ledger.sql', import.meta.url),
  new URL('../../migrations/20260906_notification_event_deduplication.sql', import.meta.url),
  new URL('../../migrations/20260906_followed_writer_publication_events.sql', import.meta.url),
  new URL('../../migrations/20260906_granular_notification_preferences.sql', import.meta.url),
];

let stagingDbUrl = process.env.STAGING_DATABASE_URL;
if (!stagingDbUrl) {
  try {
    stagingDbUrl = execSync('gcloud secrets versions access latest --secret=writon-database-url-staging --project=writon-app-2020', { encoding: 'utf8' }).trim();
  } catch {}
}

const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: stagingDbUrl,
  productionDatabaseUrl: process.env.DATABASE_URL,
  allowRemoteStaging: true,
});
const databaseHost = new URL(connectionString).hostname;
const client = new Client({
  connectionString,
  ssl: ['localhost', '127.0.0.1', '::1'].includes(databaseHost)
    ? false
    : { rejectUnauthorized: true },
});

try {
  await client.connect();
  for (const migrationUrl of migrationUrls) {
    await client.query(await readFile(fileURLToPath(migrationUrl), 'utf8'));
  }

  const verification = await client.query(`
    select
      to_regclass('public.publication_notification_events') is not null as event_table,
      to_regclass('public.notification_delivery_outbox') is not null as delivery_outbox,
      exists (
        select 1 from pg_indexes
        where schemaname = 'public'
          and indexname = 'notifications_deduplication_key_unique'
      ) as dedup_index,
      exists (
        select 1 from pg_trigger
        where tgname = 'posts_enqueue_publication_notification_event'
          and not tgisinternal
      ) as publication_trigger,
      (select relrowsecurity from pg_class where oid = 'public.publication_notification_events'::regclass) as rls_enabled,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'notification_preferences'
          and column_name = 'daily_digest_enabled' and is_nullable = 'YES'
      ) as granular_preferences
  `);
  const result = verification.rows[0];
  if (!result || Object.values(result).some((value) => value !== true)) {
    throw new Error(`Notification staging migration verification failed: ${JSON.stringify(result)}`);
  }
  console.log('Staging migration verified: notification deduplication and publication fan-out are installed with RLS.');
} finally {
  await client.end().catch(() => {});
}
