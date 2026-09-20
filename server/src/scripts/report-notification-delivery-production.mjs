import 'dotenv/config';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const PRODUCTION_REF = 'rrxaitxeirykmiihgiqj';
const daysArg = process.argv.find((argument) => argument.startsWith('--days='));
const days = Number.parseInt(daysArg?.split('=')[1] ?? '7', 10);
const connectionString = process.env.DATABASE_URL || execSync(
  'gcloud secrets versions access latest --secret=writon-database-url-production --project=writon-app-2020',
  { encoding: 'utf8', windowsHide: true },
).trim();
if (!process.argv.includes('--production') || !connectionString.includes(PRODUCTION_REF) || !Number.isInteger(days) || days < 1 || days > 31) {
  throw new Error('Notification reporting requires --production and --days=1..31 against the exact production ref.');
}

const certificate = await readFile(fileURLToPath(new URL('../../staging/prod-ca-2021.crt', import.meta.url)), 'utf8');
const database = new pg.Client({ connectionString, ssl: { ca: certificate, rejectUnauthorized: true } });
try {
  await database.connect();
  await database.query('begin transaction read only');
  const result = await database.query(`
    select
      count(*)::int as total,
      count(*) filter (where status = 'sent')::int as sent,
      count(*) filter (where status = 'skipped')::int as skipped,
      count(*) filter (where status = 'failed')::int as failed,
      count(*) filter (where status in ('pending', 'sending'))::int as outstanding,
      count(*) filter (where attempts > 1)::int as retried,
      count(distinct notification_id)::int as distinct_notifications,
      round(percentile_cont(0.95) within group (
        order by extract(epoch from (delivered_at - created_at))
      ) filter (where delivered_at is not null)::numeric, 3)::float8 as delivery_latency_p95_seconds
    from public.notification_delivery_outbox
    where created_at >= now() - ($1::int * interval '1 day')
  `, [days]);
  const reasonResult = await database.query(`
    select case
      when delivery.last_error is not null then left(delivery.last_error, 160)
      when recipient.account_type <> 'human' then 'recipient_not_human'
      when notification.actor_id is not null and actor.account_type is distinct from 'human' then 'actor_not_human'
      when notification.post_id is not null and (
        post.id is null or post.status <> 'published' or post.is_public is distinct from true
        or post.provenance <> 'human_verified' or post_author.account_type is distinct from 'human'
      ) then 'story_not_delivery_eligible'
      when not exists (
        select 1 from public.device_push_tokens token
         where token.profile_id = delivery.recipient_id and token.revoked_at is null
           and token.notification_permission = 'granted'
      ) then 'no_active_permitted_token'
      else 'unclassified'
    end as reason, count(*)::int as count
      from public.notification_delivery_outbox delivery
      join public.notifications notification on notification.id = delivery.notification_id
      join public.profiles recipient on recipient.id = delivery.recipient_id
      left join public.profiles actor on actor.id = notification.actor_id
      left join public.posts post on post.id = notification.post_id
      left join public.profiles post_author on post_author.id = post.author_id
     where delivery.created_at >= now() - ($1::int * interval '1 day') and delivery.status <> 'sent'
     group by 1 order by count(*) desc limit 10
  `, [days]);
  await database.query('rollback');
  const metrics = result.rows[0];
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    windowDays: days,
    population: 'server-side account-targeted notification outbox rows',
    metrics,
    nonDeliveryReasons: reasonResult.rows,
    duplicateOutboxRows: metrics.total - metrics.distinct_notifications,
    interpretation: {
      deliveryAccepted: metrics.sent,
      deviceReceiptMeasured: false,
      visibleDuplicateMeasured: false,
      status: metrics.total > 0 && metrics.sent === 0
        ? 'no_deliveries_observed'
        : (metrics.failed === 0 && metrics.outstanding === 0 ? 'server_pipeline_clear' : 'attention_required'),
    },
    limitations: [
      'FCM acceptance is not proof that Android displayed or opened a notification.',
      'Foreground, background, terminated-state routing and visible duplicates require the two-account physical-device matrix.',
      'Topic broadcasts for guest installations are outside this account-targeted outbox report.',
    ],
  }, null, 2));
} finally {
  await database.end().catch(() => {});
}
