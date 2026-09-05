import { toFcmAnalyticsLabel } from '../services/fcm-analytics-label.js';

function isInvalidPushToken(error) {
  const code = error?.code || error?.message || '';
  return code.includes('messaging/registration-token-not-registered')
    || code.includes('messaging/invalid-registration-token');
}

export async function runDailyDigest(pool, firebaseMessaging, log) {
  let dispatchKey = null;
  try {
    // 1. Count only eligible, verified-human stories published today.
    const countRes = await pool.query(`
      select coalesce(sum(cnt), 0)::int as total,
             json_object_agg(coalesce(category, 'uncategorized'), cnt) as by_category
      from (
        select p.category, count(*)::int as cnt
        from public.posts p
        inner join public.profiles author
          on author.id = p.author_id and author.account_type = 'human'
        where p.status = 'published' and p.is_public = true
          and p.provenance = 'human_verified'
          and coalesce(p.published_at, p.created_at) >= now() - interval '24 hours'
        group by p.category
      ) sub
    `);
    const totalStories = countRes.rows[0]?.total || 0;
    if (totalStories === 0) {
      return { skipped: true, reason: 'No new stories today' };
    }

    // 2. Get the top story of the day
    const topStoryRes = await pool.query(`
      select p.id::text, p.title, p.summary, p.category, p.language_code,
             author.full_name as "authorName", author.pen_name as "authorPenName",
             coalesce(read_quality.deep_read_score, 0) as deep_read_score
      from public.posts p
      inner join public.profiles author
        on author.id = p.author_id and author.account_type = 'human'
      left join lateral (
        select coalesce(sum(
          case when history.read_seconds >= 30 then 2 else 0 end
          + case when history.progress >= 0.70 then 4 else 0 end
          + case when history.progress >= 0.95 then 5 else 0 end
          + case when history.first_read_at::date < history.last_read_at::date then 6 else 0 end
        ), 0)::numeric
        + coalesce((
          select count(*) * 5
          from public.bookmarks bookmark
          inner join public.profiles reader
            on reader.id = bookmark.user_id and reader.account_type = 'human'
          where bookmark.post_id = p.id
        ), 0)::numeric as deep_read_score
        from public.reading_history history
        inner join public.profiles reader
          on reader.id = history.user_id and reader.account_type = 'human'
        where history.post_id = p.id
      ) read_quality on true
      where p.status = 'published' and p.is_public = true
        and p.provenance = 'human_verified'
        and coalesce(p.published_at, p.created_at) >= now() - interval '24 hours'
      order by deep_read_score desc,
               coalesce(p.published_at, p.created_at) desc,
               p.likes_count desc
      limit 1
    `);
    const overallTopStory = topStoryRes.rows[0];
    // Content can disappear between the count and selection queries.
    if (!overallTopStory) {
      return { skipped: true, reason: 'No eligible story available' };
    }

    // Claim the India-local editorial date before the first external FCM call.
    // ON CONFLICT makes concurrent scheduler invocations at-most-once. We do
    // not retry a claimed date automatically because FCM sends cannot be made
    // transactionally atomic with Postgres.
    const claimRes = await pool.query(`
      insert into public.notification_dispatch_ledger (
        dispatch_key, dispatch_kind, status
      ) values (
        'daily_digest:' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD'),
        'daily_digest',
        'claimed'
      )
      on conflict (dispatch_key) do nothing
      returning dispatch_key as "dispatchKey"
    `);
    dispatchKey = claimRes.rows[0]?.dispatchKey || null;
    if (!dispatchKey) {
      return { skipped: true, reason: 'Daily digest already claimed' };
    }

    // 3. Get per-language top stories
    const langTopStoriesRes = await pool.query(`
      select distinct on (p.language_code)
             p.id::text, p.title, p.summary, p.category, p.language_code,
             author.full_name as "authorName",
             coalesce(read_quality.deep_read_score, 0) as deep_read_score
      from public.posts p
      inner join public.profiles author
        on author.id = p.author_id and author.account_type = 'human'
      left join lateral (
        select coalesce(sum(
          case when history.read_seconds >= 30 then 2 else 0 end
          + case when history.progress >= 0.70 then 4 else 0 end
          + case when history.progress >= 0.95 then 5 else 0 end
          + case when history.first_read_at::date < history.last_read_at::date then 6 else 0 end
        ), 0)::numeric
        + coalesce((
          select count(*) * 5
          from public.bookmarks bookmark
          inner join public.profiles reader
            on reader.id = bookmark.user_id and reader.account_type = 'human'
          where bookmark.post_id = p.id
        ), 0)::numeric as deep_read_score
        from public.reading_history history
        inner join public.profiles reader
          on reader.id = history.user_id and reader.account_type = 'human'
        where history.post_id = p.id
      ) read_quality on true
      where p.status = 'published' and p.is_public = true
        and p.provenance = 'human_verified'
        and coalesce(p.published_at, p.created_at) >= now() - interval '24 hours'
      order by p.language_code, deep_read_score desc,
               coalesce(p.published_at, p.created_at) desc,
               p.likes_count desc
    `);
    const langTopStories = {};
    for (const row of langTopStoriesRes.rows) {
      langTopStories[row.language_code] = row;
    }

    // 4. Find eligible recipients
    const recipientsRes = await pool.query(`
      select distinct on (dpt.profile_id)
             dpt.profile_id as "profileId",
             dpt.id::text as "tokenId",
             dpt.token,
             coalesce(rfs.preferred_language, 'en') as "preferredLanguage"
      from public.device_push_tokens dpt
      left join public.notification_preferences np on np.profile_id = dpt.profile_id
      left join lateral (
        select preferred_language
        from public.reader_feed_sessions
        where profile_id = dpt.profile_id
        order by created_at desc limit 1
      ) rfs on true
      where dpt.revoked_at is null
        and dpt.notification_permission = 'granted'
        and coalesce(np.editorial_enabled, true) = true
        and dpt.last_seen_at < now() - interval '6 hours'
      order by dpt.profile_id, dpt.last_seen_at desc
    `);
    const recipients = recipientsRes.rows;

    let sent = 0;
    let skipped = 0;
    let directAttempted = 0;
    let topicAccepted = 0;
    let topicAttempted = 0;

    // 5. Compose and send
    for (const recipient of recipients) {
      const preferredLanguage = recipient.preferredLanguage;
      const topStory = langTopStories[preferredLanguage] || overallTopStory;
      if (!topStory) {
        skipped++;
        continue;
      }

      const remaining = totalStories - 1;
      let title = 'Tonight’s quiet read';
      let body = `“${topStory.title}” — ${topStory.authorName} • ${remaining} more today`;

      if (remaining === 0) {
        body = `“${topStory.title}” — ${topStory.authorName}`;
      }

      if (preferredLanguage === 'hi') {
        title = 'आज का चुनिंदा पाठ';
        body = `“${topStory.title}” — ${topStory.authorName} • आज ${remaining} और रचनाएँ`;
        if (remaining === 0) body = `“${topStory.title}” — ${topStory.authorName}`;
      } else if (preferredLanguage === 'bn') {
        title = 'আজকের বাছাই করা পাঠ';
        body = `“${topStory.title}” — ${topStory.authorName} • আজ আরও ${remaining}টি লেখা`;
        if (remaining === 0) body = `“${topStory.title}” — ${topStory.authorName}`;
      } else if (preferredLanguage === 'mr') {
        title = 'आजचे निवडक वाचन';
        body = `“${topStory.title}” — ${topStory.authorName} • आज आणखी ${remaining} लेखन`;
        if (remaining === 0) body = `“${topStory.title}” — ${topStory.authorName}`;
      }

      const payload = {
        token: recipient.token,
        notification: { title, body },
        data: {
          kind: 'daily_digest',
          storyId: topStory.id,
          storyTitle: topStory.title,
          storySummary: topStory.summary || '',
          authorName: topStory.authorName || 'WritOn',
          targetRoute: `reader/${topStory.id}`,
          dailyCount: String(totalStories),
        },
        fcmOptions: {
          analyticsLabel: toFcmAnalyticsLabel('daily_digest', recipient.preferredLanguage || 'en'),
        },
        android: {
          priority: 'normal',
          notification: {
            channelId: 'writon_editorial_channel',
            icon: 'ic_stat_writon',
            color: '#E75A2A',
          },
          fcmOptions: {
            analyticsLabel: toFcmAnalyticsLabel('daily_digest', recipient.preferredLanguage || 'en'),
          },
        },
      };

      try {
        directAttempted++;
        await firebaseMessaging.send(payload);
        sent++;
      } catch (err) {
        if (recipient.tokenId && isInvalidPushToken(err)) {
          await pool.query(
            `update public.device_push_tokens
                set revoked_at = now(), updated_at = now()
              where id = $1`,
            [recipient.tokenId],
          );
        }
        log.warn({ err }, 'Failed to send daily digest to a registered device');
        skipped++;
      }
    }

    // 6. Broadcast to the general FCM topic 'daily_digest' so all installed readers (including guest readers) receive it
    if (firebaseMessaging && overallTopStory) {
      try {
        const remaining = totalStories - 1;
        const topicPayload = {
          topic: 'daily_digest',
          notification: {
            title: 'Tonight’s quiet read',
            body: remaining > 0
              ? `“${overallTopStory.title}” — ${overallTopStory.authorName} • ${remaining} more today`
              : `“${overallTopStory.title}” — ${overallTopStory.authorName}`,
          },
          data: {
            kind: 'daily_digest',
            storyId: overallTopStory.id,
            storyTitle: overallTopStory.title,
            storySummary: overallTopStory.summary || '',
            authorName: overallTopStory.authorName || 'WritOn',
            targetRoute: `reader/${overallTopStory.id}`,
            dailyCount: String(totalStories),
          },
          fcmOptions: {
            analyticsLabel: toFcmAnalyticsLabel('daily_digest', 'topic'),
          },
          android: {
            priority: 'normal',
            notification: {
              channelId: 'writon_editorial_channel',
              icon: 'ic_stat_writon',
              color: '#E75A2A',
            },
            fcmOptions: {
              analyticsLabel: toFcmAnalyticsLabel('daily_digest', 'topic'),
            },
          },
        };
        topicAttempted++;
        await firebaseMessaging.send(topicPayload);
        topicAccepted++;
      } catch (topicErr) {
        if (typeof log?.warn === 'function') log.warn({ err: topicErr }, 'Failed to broadcast daily digest to FCM topic');
      }
    }

    // FCM acceptance is not device delivery. Topic acceptance counts one request,
    // never the unknown number of devices subscribed to that topic.
    log?.info?.({
      event: 'daily_digest_dispatch_summary',
      eligibleDirectRecipients: recipients.length,
      directAttempted,
      directAccepted: sent,
      directSkippedOrFailed: skipped,
      topicAttempted,
      topicAccepted,
    }, 'Daily digest FCM acceptance summary');

    await pool.query(`
      update public.notification_dispatch_ledger
         set status = 'completed',
             completed_at = now(),
             result = $2::jsonb,
             updated_at = now()
       where dispatch_key = $1
    `, [dispatchKey, JSON.stringify({
      eligibleDirectRecipients: recipients.length,
      directAttempted,
      directAccepted: sent,
      directSkippedOrFailed: skipped,
      topicAttempted,
      topicAccepted,
    })]);
    return { sent, skipped, totalStories, topStory: overallTopStory.title };
  } catch (error) {
    if (dispatchKey) {
      try {
        await pool.query(`
          update public.notification_dispatch_ledger
             set status = 'failed', updated_at = now()
           where dispatch_key = $1
        `, [dispatchKey]);
      } catch (ledgerError) {
        log?.error?.({ err: ledgerError }, 'Failed to record daily digest dispatch failure');
      }
    }
    log.error({ err: error }, 'Error in runDailyDigest');
    throw error;
  }
}
