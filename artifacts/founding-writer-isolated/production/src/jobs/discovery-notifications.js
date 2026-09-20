import { randomUUID } from 'node:crypto';
import { toFcmAnalyticsLabel } from '../services/fcm-analytics-label.js';

function isInvalidPushToken(error) {
  const code = error?.code || error?.message || '';
  return code.includes('messaging/registration-token-not-registered')
    || code.includes('messaging/invalid-registration-token');
}

export async function runDiscoveryNotifications(pool, firebaseMessaging, log, {
  dryRun = true, batchSize = 100, runId = randomUUID(), now = new Date(),
} = {}) {
  const indiaHour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23',
  }).format(now));
  if (!dryRun && (indiaHour < 9 || indiaHour >= 21)) {
    log?.info?.({ event: 'discovery_notification_suppressed', runId, reason: 'quiet_hours' });
    return { dryRun: false, skipped: true, reason: 'quiet_hours' };
  }
  const limit = Math.max(1, Math.min(Number(batchSize) || 100, 500));
  const candidates = await pool.query(`
    with profile_devices as (
      select distinct on (token.profile_id) token.profile_id, null::uuid as installation_id,
             'profile:' || token.profile_id as recipient_key, token.id as token_id,
             token.token, token.last_seen_at,
             coalesce(feed.preferred_language, 'en') as preferred_language
        from public.device_push_tokens token
        left join lateral (
          select preferred_language from public.reader_feed_sessions
           where profile_id = token.profile_id order by created_at desc limit 1
        ) feed on true
       where token.revoked_at is null and token.notification_permission = 'granted'
       order by token.profile_id, token.last_seen_at desc
    ), guest_devices as (
      select null::text as profile_id, token.installation_id,
             'installation:' || token.installation_id::text as recipient_key,
             token.id as token_id, token.token, token.last_seen_at, 'en'::text as preferred_language
        from public.guest_device_push_tokens token
       where token.revoked_at is null and token.notification_permission = 'granted'
    ), active_devices as (
      select * from profile_devices union all select * from guest_devices
    ), eligible as (
      select device.*, 'draft_nudge'::text as kind, draft.id as target_post_id, 1 as priority
        from active_devices device
        left join public.notification_preferences preference on preference.profile_id = device.profile_id
        join lateral (select id from public.posts where author_id = device.profile_id
          and status = 'draft' and updated_at <= now() - interval '5 days'
          order by updated_at desc limit 1) draft on true
       where device.profile_id is not null
         and coalesce(preference.draft_nudges_enabled, preference.editorial_enabled, true)
      union all
      select device.*, 'reading_nudge'::text, story.id, 2
        from active_devices device
        left join public.notification_preferences preference on preference.profile_id = device.profile_id
        join lateral (
          select post.id from public.posts post
          join public.profiles author on author.id = post.author_id and author.account_type = 'human'
          left join public.bookmarks bookmark on bookmark.post_id = post.id and bookmark.user_id = device.profile_id
          left join public.reading_history history on history.post_id = post.id and history.user_id = device.profile_id
          where post.status = 'published' and post.is_public = true and post.provenance = 'human_verified'
            and coalesce(history.progress, 0) < 0.95
          order by (bookmark.post_id is not null) desc,
                   (post.language_code = device.preferred_language) desc,
                   coalesce(post.published_at, post.created_at) desc limit 1
        ) story on true
       where device.last_seen_at <= now() - interval '3 days'
         and (device.profile_id is null
           or coalesce(preference.reading_nudges_enabled, preference.editorial_enabled, true))
    )
    select distinct on (recipient_key) profile_id as "profileId", installation_id as "installationId",
           recipient_key as "recipientKey", token_id::text as "tokenId", token,
           preferred_language as "preferredLanguage", kind,
           target_post_id::text as "targetPostId"
      from eligible order by recipient_key, priority limit $1
  `, [limit]);

  if (dryRun) {
    const counts = candidates.rows.reduce((result, row) => {
      result[row.kind] = (result[row.kind] || 0) + 1;
      return result;
    }, {});
    log?.info?.({ event: 'discovery_notification_dry_run', runId, eligible: candidates.rows.length, counts });
    return { dryRun: true, eligible: candidates.rows.length, counts };
  }

  let sent = 0; let suppressed = 0; let failed = 0;
  for (const candidate of candidates.rows) {
    const localDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const recipientKey = candidate.recipientKey || `profile:${candidate.profileId}`;
    const claim = await pool.query(
      'select public.claim_discovery_notification($1, $2, $3, $4, $5, $6, $7) as claimed',
      [recipientKey, candidate.profileId || null, candidate.installationId || null,
        candidate.kind, candidate.targetPostId, localDate, runId],
    );
    if (claim.rows[0]?.claimed !== true) { suppressed++; continue; }

    const isDraft = candidate.kind === 'draft_nudge';
    const title = isDraft ? 'Your draft is waiting' : 'A quiet read for you';
    const body = isDraft ? 'Return when you are ready—your words are still saved.'
      : 'A story worth a few quiet minutes is ready in WritOn.';
    try {
      await firebaseMessaging.send({
        token: candidate.token, notification: { title, body },
        data: { kind: candidate.kind, targetRoute: isDraft ? 'write' : `reader/${candidate.targetPostId}`,
          ...(candidate.targetPostId ? { storyId: candidate.targetPostId } : {}) },
        android: { priority: 'normal', notification: { channelId: 'writon_editorial_channel', icon: 'ic_stat_writon', color: '#E75A2A' },
          fcmOptions: { analyticsLabel: toFcmAnalyticsLabel(candidate.kind, candidate.preferredLanguage) } },
        fcmOptions: { analyticsLabel: toFcmAnalyticsLabel(candidate.kind, candidate.preferredLanguage) },
      });
    } catch (error) {
      failed++;
      await pool.query("update public.discovery_notification_deliveries set status = 'failed', failure_code = $4, updated_at = now() where recipient_key = $1 and local_date = $2 and run_id = $3", [recipientKey, localDate, runId, String(error?.code || 'send_failed').slice(0, 120)]);
      if (candidate.tokenId && isInvalidPushToken(error)) {
        const tokenTable = candidate.installationId ? 'guest_device_push_tokens' : 'device_push_tokens';
        await pool.query(`update public.${tokenTable} set revoked_at = now(), updated_at = now() where id = $1`, [candidate.tokenId]);
      }
      log?.warn?.({ err: error, kind: candidate.kind }, 'Discovery notification was not accepted by FCM');
      continue;
    }
    // Keep the claim reserved if recording an accepted send fails.
    await pool.query("update public.discovery_notification_deliveries set status = 'sent', delivered_at = now(), updated_at = now() where recipient_key = $1 and local_date = $2 and run_id = $3", [recipientKey, localDate, runId]);
    sent++;
  }
  const result = { dryRun: false, eligible: candidates.rows.length, sent, suppressed, failed };
  log?.info?.({ event: 'discovery_notification_dispatch_summary', runId, ...result });
  return result;
}
