import { toFcmAnalyticsLabel } from '../services/fcm-analytics-label.js';

function isInvalidPushToken(error) {
  const code = error?.code || error?.message || '';
  return code.includes('messaging/registration-token-not-registered')
    || code.includes('messaging/invalid-registration-token');
}

export function resolveDailyDigestSlot(slot, now = new Date()) {
  if (slot === 'morning' || slot === 'evening') return slot;
  const indiaHour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23',
  }).format(now));
  return indiaHour < 14 ? 'morning' : 'evening';
}

function getDigestCopy(slot, language, topStory, totalStories) {
  const remaining = Math.max(0, totalStories - 1);
  const isMorning = slot === 'morning';

  let title = isMorning ? 'Morning Trending Read' : 'Tonight’s quiet read';
  let body = isMorning
    ? (remaining > 0
      ? `“${topStory.title}” — ${topStory.authorName} • Trending on WritOn`
      : `“${topStory.title}” — ${topStory.authorName}`)
    : (remaining > 0
      ? `“${topStory.title}” — ${topStory.authorName} • ${remaining} more today`
      : `“${topStory.title}” — ${topStory.authorName}`);

  if (language === 'hi') {
    title = isMorning ? 'आज सुबह का चर्चित पाठ' : 'आज का चुनिंदा पाठ';
    body = isMorning
      ? (remaining > 0
        ? `“${topStory.title}” — ${topStory.authorName} • राइटऑन पर ट्रेंडिंग`
        : `“${topStory.title}” — ${topStory.authorName}`)
      : (remaining > 0
        ? `“${topStory.title}” — ${topStory.authorName} • आज ${remaining} और रचनाएँ`
        : `“${topStory.title}” — ${topStory.authorName}`);
  } else if (language === 'bn') {
    title = isMorning ? 'সকালের ট্রেন্ডিং পাঠ' : 'আজকের বাছাই করা পাঠ';
    body = isMorning
      ? (remaining > 0
        ? `“${topStory.title}” — ${topStory.authorName} • রাইটঅনে ট্রেন্ডিং`
        : `“${topStory.title}” — ${topStory.authorName}`)
      : (remaining > 0
        ? `“${topStory.title}” — ${topStory.authorName} • আজ আরও ${remaining}টি লেখা`
        : `“${topStory.title}” — ${topStory.authorName}`);
  } else if (language === 'mr') {
    title = isMorning ? 'सकाळचे ट्रेंडिंग वाचन' : 'आजचे निवडक वाचन';
    body = isMorning
      ? (remaining > 0
        ? `“${topStory.title}” — ${topStory.authorName} • राइटऑनवर ट्रेंडिंग`
        : `“${topStory.title}” — ${topStory.authorName}`)
      : (remaining > 0
        ? `“${topStory.title}” — ${topStory.authorName} • आज आणखी ${remaining} लेखन`
        : `“${topStory.title}” — ${topStory.authorName}`);
  }

  return { title, body };
}

export async function runDailyDigest(pool, firebaseMessaging, log, { slot, now = new Date(), forceBypass = false } = {}) {
  let dispatchKey = null;
  const resolvedSlot = resolveDailyDigestSlot(slot, now);
  const isMorning = resolvedSlot === 'morning';

  try {
    // 1. Count eligible stories published in the relevant window.
    // Evening strictly targets verified-human stories.
    // Morning counts published stories eligible for trending (human or verified synthetic).
    const countRes = await pool.query(`
      select coalesce(sum(cnt), 0)::int as total,
             json_object_agg(coalesce(category, 'uncategorized'), cnt) as by_category
      from (
        select p.category, count(*)::int as cnt
        from public.posts p
        inner join public.profiles author
          on author.id = p.author_id
          ${isMorning ? "and author.account_type in ('human', 'editorial_bot')" : "and author.account_type = 'human'"}
        where p.status = 'published' and p.is_public = true
          ${isMorning ? "and p.provenance in ('human_verified', 'synthetic')" : "and p.provenance = 'human_verified'"}
          and coalesce(p.published_at, p.created_at) >= now() - interval '24 hours'
        group by p.category
      ) sub
    `);
    let totalStories = countRes.rows[0]?.total || 0;

    // 2. Get the top story of the day.
    // Morning: Trending story ranked by engagement velocity (likes, recency, deep reading).
    // Evening: Human-written deep reading story.
    // In both slots, stories not pushed in the last 30 days are prioritized first via the ledger cooldown subquery.
    const storySelectFields = `
      p.id::text, p.title, p.summary, p.category, p.language_code,
      author.full_name as "authorName", author.pen_name as "authorPenName",
      coalesce(read_quality.deep_read_score, 0) as deep_read_score
    `;

    const topStoryRes = await pool.query(`
      select ${storySelectFields}
      from public.posts p
      inner join public.profiles author
        on author.id = p.author_id
        ${isMorning ? "and author.account_type in ('human', 'editorial_bot')" : "and author.account_type = 'human'"}
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
        ${isMorning ? "and p.provenance in ('human_verified', 'synthetic')" : "and p.provenance = 'human_verified'"}
        and coalesce(p.published_at, p.created_at) >= now() - interval '24 hours'
      order by (
                 select count(*)
                 from public.notification_dispatch_ledger ndl
                 where ndl.dispatch_kind = 'daily_digest'
                   and ndl.status = 'completed'
                   and ndl.completed_at >= now() - interval '30 days'
                   and ndl.result->>'topStoryId' = p.id::text
               ) asc,
               ${isMorning ? 'p.likes_count desc, deep_read_score desc' : 'deep_read_score desc'},
               coalesce(p.published_at, p.created_at) desc,
               p.likes_count desc
      limit 1
    `);
    let overallTopStory = topStoryRes?.rows?.[0];

    // Fallback if no stories in last 24 hours: pick the best historical human story
    // prioritizing unpushed stories from the last 30 days to ensure daily archive rotation
    if (!overallTopStory) {
      let fallbackRes = await pool.query(`
        select ${storySelectFields}
        from public.posts p
        inner join public.profiles author
          on author.id = p.author_id
          and author.account_type = 'human'
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
        order by (
                   select count(*)
                   from public.notification_dispatch_ledger ndl
                   where ndl.dispatch_kind = 'daily_digest'
                     and ndl.status = 'completed'
                     and ndl.completed_at >= now() - interval '30 days'
                     and ndl.result->>'topStoryId' = p.id::text
                 ) asc,
                 deep_read_score desc,
                 coalesce(p.published_at, p.created_at) desc,
                 p.likes_count desc
        limit 1
      `);
      overallTopStory = fallbackRes?.rows?.[0];

      // If no human-verified post found, fall back to any published story
      if (!overallTopStory) {
        fallbackRes = await pool.query(`
          select p.id::text, p.title, p.summary, p.category, p.language_code,
                 author.full_name as "authorName", author.pen_name as "authorPenName",
                 0 as deep_read_score
          from public.posts p
          inner join public.profiles author
            on author.id = p.author_id
          where p.status = 'published' and p.is_public = true
          order by (
                     select count(*)
                     from public.notification_dispatch_ledger ndl
                     where ndl.dispatch_kind = 'daily_digest'
                       and ndl.status = 'completed'
                       and ndl.completed_at >= now() - interval '30 days'
                       and ndl.result->>'topStoryId' = p.id::text
                   ) asc,
                   p.likes_count desc,
                   coalesce(p.published_at, p.created_at) desc
          limit 1
        `);
        overallTopStory = fallbackRes?.rows?.[0];
      }

      if (overallTopStory) {
        totalStories = 1;
      }
    }

    if (!overallTopStory) {
      return { skipped: true, reason: 'No eligible story available', slot: resolvedSlot };
    }

    // Claim the India-local editorial date and slot before the first external FCM call.
    // Slotted ledger key: 'daily_digest:YYYY-MM-DD:morning' or 'daily_digest:YYYY-MM-DD:evening'
    const localDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
    const targetDispatchKey = forceBypass
      ? `daily_digest:${localDate}:${resolvedSlot}:test_${Date.now()}`
      : `daily_digest:${localDate}:${resolvedSlot}`;

    const claimRes = await pool.query(`
      insert into public.notification_dispatch_ledger (
        dispatch_key, dispatch_kind, status
      ) values (
        $1,
        'daily_digest',
        'claimed'
      )
      on conflict (dispatch_key) do nothing
      returning dispatch_key as "dispatchKey"
    `, [targetDispatchKey]);
    dispatchKey = claimRes.rows[0]?.dispatchKey || null;
    if (!dispatchKey) {
      return { skipped: true, reason: 'Daily digest already claimed', slot: resolvedSlot };
    }

    // 3. Get per-language top stories
    const langTopStoriesRes = await pool.query(`
      select distinct on (p.language_code)
             p.id::text, p.title, p.summary, p.category, p.language_code,
             author.full_name as "authorName",
             coalesce(read_quality.deep_read_score, 0) as deep_read_score
      from public.posts p
      inner join public.profiles author
        on author.id = p.author_id
        ${isMorning ? "and author.account_type in ('human', 'editorial_bot')" : "and author.account_type = 'human'"}
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
        ${isMorning ? "and p.provenance in ('human_verified', 'synthetic')" : "and p.provenance = 'human_verified'"}
        and coalesce(p.published_at, p.created_at) >= now() - interval '24 hours'
      order by p.language_code,
               ${isMorning ? 'p.likes_count desc, deep_read_score desc' : 'deep_read_score desc'},
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
        and coalesce(np.daily_digest_enabled, np.editorial_enabled, true) = true
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

      const copy = getDigestCopy(resolvedSlot, preferredLanguage, topStory, totalStories);

      const payload = {
        token: recipient.token,
        notification: { title: copy.title, body: copy.body },
        data: {
          kind: 'daily_digest',
          edition: resolvedSlot,
          storyId: topStory.id,
          storyTitle: topStory.title,
          storySummary: topStory.summary || '',
          authorName: topStory.authorName || 'WritOn',
          targetRoute: `reader/${topStory.id}`,
          dailyCount: String(totalStories),
        },
        fcmOptions: {
          analyticsLabel: toFcmAnalyticsLabel('daily_digest', resolvedSlot, recipient.preferredLanguage || 'en'),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'writon_editorial_channel',
            icon: 'ic_stat_writon',
            color: '#E75A2A',
          },
          fcmOptions: {
            analyticsLabel: toFcmAnalyticsLabel('daily_digest', resolvedSlot, recipient.preferredLanguage || 'en'),
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
        const topicCopy = getDigestCopy(resolvedSlot, 'en', overallTopStory, totalStories);
        const topicPayload = {
          topic: 'daily_digest',
          notification: {
            title: topicCopy.title,
            body: topicCopy.body,
          },
          data: {
            kind: 'daily_digest',
            edition: resolvedSlot,
            storyId: overallTopStory.id,
            storyTitle: overallTopStory.title,
            storySummary: overallTopStory.summary || '',
            authorName: overallTopStory.authorName || 'WritOn',
            targetRoute: `reader/${overallTopStory.id}`,
            dailyCount: String(totalStories),
          },
          fcmOptions: {
            analyticsLabel: toFcmAnalyticsLabel('daily_digest', resolvedSlot, 'topic'),
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'writon_editorial_channel',
              icon: 'ic_stat_writon',
              color: '#E75A2A',
            },
            fcmOptions: {
              analyticsLabel: toFcmAnalyticsLabel('daily_digest', resolvedSlot, 'topic'),
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
      slot: resolvedSlot,
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
      slot: resolvedSlot,
      eligibleDirectRecipients: recipients.length,
      directAttempted,
      directAccepted: sent,
      directSkippedOrFailed: skipped,
      topicAttempted,
      topicAccepted,
      topStoryId: overallTopStory.id,
      topStoryTitle: overallTopStory.title,
    })]);
    return { sent, skipped, totalStories, topStory: overallTopStory.title, slot: resolvedSlot };
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
