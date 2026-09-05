import { randomUUID } from 'node:crypto';
import {
  FEED_RANKING_VERSION,
  composeFeed,
  decodeFeedCursor,
  determineFeedMode,
  encodeFeedCursor,
  normalizeLanguage,
} from './feed-ranking.js';

const SESSION_SNAPSHOT_SIZE = 80;

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizedAffinity(value) {
  return Math.max(0, Math.min(1, asNumber(value) / 20));
}

function freshnessScore(createdAt) {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  return Math.exp(-ageDays / 30);
}

function guestScore(vector, key) {
  return Math.max(0, Math.min(1, asNumber(vector.get(String(key)), 0) / 20));
}

function toCandidate(row, guestVectors) {
  const serverTopic = normalizedAffinity(row.topic_affinity);
  const serverAuthor = normalizedAffinity(row.author_affinity);
  const serverLanguage = normalizedAffinity(row.language_affinity);
  const guestTopic = guestScore(guestVectors.topics, row.topic_id);
  const guestAuthor = guestScore(guestVectors.authors, row.author_id);
  const topicAffinity = Math.max(serverTopic, guestTopic, row.explicit_interest ? 0.85 : 0);
  const authorAffinity = Math.max(serverAuthor, guestAuthor);
  return {
    id: row.id,
    authorId: row.author_id,
    category: row.category,
    languageCode: row.language_code,
    explicitInterest: row.explicit_interest ? 1 : Math.max(guestTopic, 0),
    topicAffinity,
    deepReadFit: Math.max(topicAffinity, authorAffinity, normalizedAffinity(row.deep_read_fit)),
    authorAffinity,
    languageAffinity: Math.max(serverLanguage, guestScore(guestVectors.languages, row.language_code)),
    freshness: freshnessScore(row.created_at),
    humanQuality: Math.max(0, Math.min(1, asNumber(row.human_quality))),
    repetitionPenalty: Math.max(0, Math.min(0.6, asNumber(row.repetition_penalty))),
    quickExitPenalty: Math.max(0, Math.min(0.4, asNumber(row.quick_exit_penalty))),
    exposureCount: Math.max(0, asNumber(row.exposure_count)),
  };
}

export async function refreshReaderAffinities(database, profileId) {
  const client = await database.connect();
  try {
    await client.query('begin');
    await client.query('delete from public.reader_affinity_scores where profile_id = $1', [profileId]);
    await client.query(
      `with story_signals as (
         select event.profile_id, event.story_id,
                case event.event_type
                  when 'open' then 0.5
                  when 'quick_exit' then -2.0
                  when 'share' then 3.0
                  else 0.0
                end::numeric as weight,
                event.server_received_at as occurred_at
         from public.reader_behavior_events event
         inner join public.profiles reader on reader.id = event.profile_id and reader.account_type = 'human'
         where event.profile_id = $1 and event.server_received_at >= now() - interval '90 days'

         union all

         select history.user_id, history.post_id,
                (case when history.read_seconds >= 30 then 2 else 0 end
                 + case when history.progress >= 0.70 then 4 else 0 end
                 + case when history.progress >= 0.95 then 5 else 0 end
                 + case when history.first_read_at::date < history.last_read_at::date then 6 else 0 end)::numeric,
                history.last_read_at
         from public.reading_history history
         inner join public.profiles reader on reader.id = history.user_id and reader.account_type = 'human'
         where history.user_id = $1 and history.last_read_at >= now() - interval '90 days'

         union all

         select bookmark.user_id, bookmark.post_id, 5::numeric, bookmark.created_at
         from public.bookmarks bookmark
         inner join public.profiles reader on reader.id = bookmark.user_id and reader.account_type = 'human'
         where bookmark.user_id = $1 and bookmark.created_at >= now() - interval '90 days'

         union all

         select comment.author_id, comment.post_id, 3::numeric, max(comment.created_at)
         from public.comments comment
         inner join public.profiles reader on reader.id = comment.author_id and reader.account_type = 'human'
         where comment.author_id = $1 and comment.created_at >= now() - interval '90 days'
         group by comment.author_id, comment.post_id

         union all

         select applause.user_id, applause.post_id, 1::numeric, applause.created_at
         from public.post_applauds applause
         inner join public.profiles reader on reader.id = applause.user_id and reader.account_type = 'human'
         where applause.user_id = $1 and applause.created_at >= now() - interval '90 days'

         union all

         select skipped.profile_id, skipped.story_id,
                (-0.25 * floor(skipped.impressions / 3.0))::numeric,
                skipped.last_impression
         from (
           select impression.profile_id, impression.story_id,
                  count(*)::numeric as impressions,
                  max(impression.server_received_at) as last_impression
           from public.reader_behavior_events impression
           where impression.profile_id = $1
             and impression.event_type = 'impression'
             and impression.server_received_at >= now() - interval '30 days'
             and not exists (
               select 1 from public.reader_behavior_events opened
               where opened.profile_id = impression.profile_id
                 and opened.story_id = impression.story_id
                 and opened.event_type = 'open'
                 and opened.server_received_at >= now() - interval '30 days'
             )
           group by impression.profile_id, impression.story_id
           having count(*) >= 3
         ) skipped
       ), dimensions as (
         select signal.profile_id, 'topic'::text as dimension_type,
                trim(both '_' from regexp_replace(lower(post.category), '[^a-z0-9]+', '_', 'g')) as dimension_value,
                signal.weight, signal.occurred_at
         from story_signals signal
         inner join public.posts post on post.id = signal.story_id and post.provenance = 'human_verified'
         inner join public.profiles author on author.id = post.author_id and author.account_type = 'human'
         union all
         select signal.profile_id, 'author', post.author_id, signal.weight, signal.occurred_at
         from story_signals signal
         inner join public.posts post on post.id = signal.story_id and post.provenance = 'human_verified'
         inner join public.profiles author on author.id = post.author_id and author.account_type = 'human'
         union all
         select signal.profile_id, 'language', post.language_code, signal.weight, signal.occurred_at
         from story_signals signal
         inner join public.posts post on post.id = signal.story_id and post.provenance = 'human_verified'
         inner join public.profiles author on author.id = post.author_id and author.account_type = 'human'
         union all
         select interest.profile_id, 'topic', interest.topic_id, 8::numeric, interest.created_at
         from public.profile_interests interest where interest.profile_id = $1
         union all
         select follow.follower_id, 'author', follow.following_id, 4::numeric, follow.created_at
         from public.follows follow
         inner join public.profiles reader on reader.id = follow.follower_id and reader.account_type = 'human'
         inner join public.profiles author on author.id = follow.following_id and author.account_type = 'human'
         where follow.follower_id = $1
       ), aggregate_scores as (
         select profile_id, dimension_type, dimension_value,
                greatest(-20, least(20, sum(
                  weight * exp(-ln(2) * greatest(0, extract(epoch from (now() - occurred_at)) / 86400) / 30)
                ))) as score,
                count(*)::int as evidence_count,
                count(*) filter (where weight > 0)::int as positive_count,
                count(*) filter (where weight < 0)::int as negative_count
         from dimensions
         where dimension_value is not null and btrim(dimension_value) <> ''
         group by profile_id, dimension_type, dimension_value
       )
       insert into public.reader_affinity_scores (
         profile_id, dimension_type, dimension_value, score, evidence_count,
         positive_evidence_count, negative_evidence_count, last_decay_time, updated_at
       )
       select profile_id, dimension_type, dimension_value, score, evidence_count,
              positive_count, negative_count, now(), now()
       from aggregate_scores`,
      [profileId]
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function getReaderEvidence(database, profileId) {
  if (!profileId) return { evidenceCount: 0, completedStories: 0, hasStrongSignal: false };
  const result = await database.query(
    `select
       ((select count(*) from public.reader_behavior_events event
          where event.profile_id = $1 and event.event_type <> 'impression')
        + (select count(*) from public.reading_history history
          where history.user_id = $1 and (history.read_seconds >= 30 or history.progress >= 0.70))
        + (select count(*) from public.bookmarks bookmark where bookmark.user_id = $1)
        + (select count(*) from public.comments comment where comment.author_id = $1)
        + (select count(*) from public.follows follow where follow.follower_id = $1))::int as "evidenceCount",
       (select count(*)::int from public.reading_history history
          where history.user_id = $1 and history.progress >= 0.95) as "completedStories",
       exists (
         select 1 from public.bookmarks bookmark where bookmark.user_id = $1
         union all select 1 from public.comments comment where comment.author_id = $1
         union all select 1 from public.follows follow where follow.follower_id = $1
         union all select 1 from public.reading_history history
           where history.user_id = $1 and history.first_read_at::date < history.last_read_at::date
       ) as "hasStrongSignal"`,
    [profileId]
  );
  return result.rows[0];
}

export async function loadFeedCandidates(database, profileId, guestVectors) {
  const result = await database.query(
    `with eligible as (
       select post.id::text as id, post.author_id, post.title, post.slug, post.summary, post.category,
              trim(both '_' from regexp_replace(lower(post.category), '[^a-z0-9]+', '_', 'g')) as topic_id,
              post.language_code, coalesce(post.published_at, post.created_at) as created_at
       from public.posts post
       inner join public.profiles author on author.id = post.author_id
       where post.status = 'published' and post.is_public = true
         and ($1::text is null or not exists (
           select 1 from public.reading_history completed
           where completed.user_id = $1 and completed.post_id::text = post.id::text
             and completed.progress >= 0.95
             and completed.last_read_at >= now() - interval '14 days'
         ))
       order by coalesce(post.published_at, post.created_at) desc, post.id
       limit 300
     ), human_quality as (
       select signal.story_id,
              least(1, ln(1 + sum(signal.quality_weight)) / 6)::numeric as quality
       from (
         select history.post_id::text as story_id,
                (case when history.progress >= 0.70 then 4 else 0 end
                 + case when history.progress >= 0.95 then 5 else 0 end
                 + case when history.first_read_at::date < history.last_read_at::date then 6 else 0 end)::numeric as quality_weight
         from public.reading_history history
         inner join public.profiles reader on reader.id = history.user_id
         inner join eligible on eligible.id = history.post_id::text
         union all
         select bookmark.post_id::text as story_id, 5::numeric
         from public.bookmarks bookmark
         inner join public.profiles reader on reader.id = bookmark.user_id
         inner join eligible on eligible.id = bookmark.post_id::text
       ) signal
       group by signal.story_id
     ), recent_exposure as (
       select exposure.story_id::text as story_id, count(*)::int as exposure_count
       from public.feed_exposures exposure
       inner join public.profiles reader on reader.id = exposure.profile_id
       where exposure.shown_at >= now() - interval '7 days'
       group by exposure.story_id
     ), quick_exits as (
       select post.id as story_id, count(*)::int as exit_count
       from eligible post
       inner join public.reader_behavior_events event
         on event.story_id::text = post.id and event.profile_id = $1 and event.event_type = 'quick_exit'
       where event.server_received_at >= now() - interval '30 days'
       group by post.id
     )
     select eligible.*,
            coalesce(quality.quality, 0.05) as human_quality,
            coalesce(exposure.exposure_count, 0) as exposure_count,
            coalesce(topic.score, 0) as topic_affinity,
            coalesce(author_affinity.score, 0) as author_affinity,
            coalesce(language.score, 0) as language_affinity,
            greatest(coalesce(topic.score, 0), coalesce(author_affinity.score, 0)) as deep_read_fit,
            (interest.topic_id is not null) as explicit_interest,
            least(0.4, coalesce(quick.exit_count, 0) * 0.1) as quick_exit_penalty,
            case when coalesce(exposure.exposure_count, 0) >= 3 then 0.1 else 0 end as repetition_penalty
     from eligible
     left join human_quality quality on quality.story_id = eligible.id
     left join recent_exposure exposure on exposure.story_id = eligible.id
     left join quick_exits quick on quick.story_id = eligible.id
     left join public.reader_affinity_scores topic
       on topic.profile_id = $1 and topic.dimension_type = 'topic' and topic.dimension_value = eligible.topic_id
     left join public.reader_affinity_scores author_affinity
       on author_affinity.profile_id = $1 and author_affinity.dimension_type = 'author' and author_affinity.dimension_value = eligible.author_id
     left join public.reader_affinity_scores language
       on language.profile_id = $1 and language.dimension_type = 'language' and language.dimension_value = eligible.language_code
     left join public.profile_interests interest
       on interest.profile_id = $1 and interest.topic_id = eligible.topic_id
     order by eligible.created_at desc, eligible.id`,
    [profileId]
  );
  return result.rows.map((row) => toCandidate(row, guestVectors));
}

async function createFeedSession(database, {
  profileId, preferredLanguage, mode, rankingVersion, expiresAt, items,
}) {
  const sessionId = randomUUID();
  const client = await database.connect();
  try {
    await client.query('begin');
    await client.query(
      `insert into public.reader_feed_sessions (
         id, profile_id, preferred_language, experiment_group, ranking_version, expires_at
       ) values ($1, $2, $3, $4, $5, $6)`,
      [sessionId, profileId, preferredLanguage, mode, rankingVersion, expiresAt]
    );
    if (items.length > 0) {
      await client.query(
        `insert into public.feed_exposures (
           profile_id, feed_session_id, story_id, rank_position, candidate_pool, model_version
         )
         select $1, $2, item.story_id::uuid, item.rank_position, item.candidate_pool, $3
         from jsonb_to_recordset($4::jsonb) as item(
           story_id text, rank_position integer, candidate_pool text
         )`,
        [profileId, sessionId, rankingVersion, JSON.stringify(items.map((item) => ({
          story_id: item.id,
          rank_position: item.rankPosition,
          candidate_pool: item.candidatePool,
        })))]
      );
    }
    await client.query('commit');
    return sessionId;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function loadSessionPage(database, { sessionId, profileId, nextRank, limit }) {
  const sessionResult = await database.query(
    `select id, profile_id, ranking_version, expires_at
     from public.reader_feed_sessions
     where id = $1 and expires_at > now()
       and (($2::text is null and profile_id is null) or profile_id = $2)
     limit 1`,
    [sessionId, profileId]
  );
  if (sessionResult.rowCount === 0) return null;

  const result = await database.query(
    `select
       post.id::text as id, post.title, post.slug, post.summary, ''::text as content,
       post.category, post.language_code as "languageCode",
       post.cover_image_url as "coverImage", post.reading_time_min as "readingTimeMin",
       post.likes_count as "likesCnt",
       (select count(*)::int from public.comments comment where comment.post_id = post.id) as "commentsCnt",
       post.bookmarks_count as "bookmarksCnt",
       coalesce(post.published_at, post.created_at) as "createdAt",
       json_build_object(
         'id', author.id, 'penName', author.pen_name, 'fullName', author.full_name,
         'avatarUrl', author.avatar_url, 'bio', author.bio, 'quoteOfDay', alias.quote_of_day,
         'followersCnt', author.followers_count, 'followingCnt', author.following_count
       ) as author,
       exists(select 1 from public.post_applauds applause where applause.post_id = post.id and applause.user_id = $2) as "isLiked",
       exists(select 1 from public.bookmarks bookmark where bookmark.post_id = post.id and bookmark.user_id = $2) as "isBookmarked",
       exists(select 1 from public.follows follow where follow.follower_id = $2 and follow.following_id = author.id) as "isFollowingAuthor",
       exposure.rank_position as "rankPosition"
     from public.feed_exposures exposure
     inner join public.posts post on post.id = exposure.story_id
     inner join public.profiles author on author.id = post.author_id and author.account_type = 'human'
     left join public.legacy_import_profile_attributes alias on alias.profile_id = author.id
     where exposure.feed_session_id = $1 and exposure.rank_position >= $3
       and post.status = 'published' and post.is_public = true and post.provenance = 'human_verified'
     order by exposure.rank_position
     limit $4`,
    [sessionId, profileId, nextRank, limit + 1]
  );
  const rows = result.rows.slice(0, limit);
  return {
    session: sessionResult.rows[0],
    rows,
    hasMore: result.rows.length > limit,
    nextRank: rows.length > 0 ? asNumber(rows.at(-1).rankPosition) + 1 : nextRank,
  };
}

export async function getPersonalizedFeed(database, {
  profileId,
  language,
  cursor,
  limit,
  guestVectors,
  behaviorRolloutPercent,
  holdoutPercent,
  shadowEnabled,
  guestLearningEnabled,
  sessionTtlMinutes,
}) {
  const preferredLanguage = normalizeLanguage(language);
  const decodedCursor = cursor ? decodeFeedCursor(cursor) : null;
  if (decodedCursor) {
    const existingPage = await loadSessionPage(database, {
      sessionId: decodedCursor.sessionId,
      profileId,
      nextRank: decodedCursor.nextRank,
      limit,
    });
    if (existingPage) {
      return {
        items: existingPage.rows.map(({ rankPosition: _rank, ...item }) => item),
        nextCursor: existingPage.hasMore
          ? encodeFeedCursor(decodedCursor.sessionId, existingPage.nextRank)
          : null,
        feedSessionId: decodedCursor.sessionId,
        rankingVersion: existingPage.session.ranking_version,
      };
    }
  }

  let evidence = { evidenceCount: 0, completedStories: 0, hasStrongSignal: false };
  if (profileId) {
    await refreshReaderAffinities(database, profileId);
    evidence = await getReaderEvidence(database, profileId);
  }
  const hasGuestVector = guestVectors.topics.size > 0 || guestVectors.authors.size > 0;
  const mode = determineFeedMode({
    profileId,
    ...evidence,
    behaviorRolloutPercent,
    holdoutPercent,
    shadowEnabled,
    guestLearningEnabled,
    hasGuestVector,
  });
  const rankingVersion = `${FEED_RANKING_VERSION}-${mode}`;
  const candidates = await loadFeedCandidates(database, profileId, guestVectors);
  const seed = randomUUID();
  const ranked = composeFeed({
    candidates,
    preferredLanguage,
    mode,
    seed,
    maximumItems: SESSION_SNAPSHOT_SIZE,
  });
  const expiresAt = new Date(Date.now() + sessionTtlMinutes * 60_000);
  const sessionId = await createFeedSession(database, {
    profileId,
    preferredLanguage,
    mode,
    rankingVersion,
    expiresAt,
    items: ranked,
  });
  const firstPage = await loadSessionPage(database, {
    sessionId,
    profileId,
    nextRank: 0,
    limit,
  });
  return {
    items: (firstPage?.rows ?? []).map(({ rankPosition: _rank, ...item }) => item),
    nextCursor: firstPage?.hasMore ? encodeFeedCursor(sessionId, firstPage.nextRank) : null,
    feedSessionId: sessionId,
    rankingVersion,
  };
}

export async function recordBehaviorEvents(database, profileId, events) {
  const recent = await database.query(
    `select count(*)::int as count from public.reader_behavior_events
     where profile_id = $1 and server_received_at >= now() - interval '1 minute'`,
    [profileId]
  );
  if (asNumber(recent.rows[0]?.count) + events.length > 180) {
    const error = new Error('Behavior event rate limit exceeded');
    error.statusCode = 429;
    throw error;
  }

  const result = await database.query(
    `with incoming as (
       select * from jsonb_to_recordset($2::jsonb) as event(
         id uuid, story_id uuid, event_type text, numeric_value numeric,
         feed_session_id uuid, client_event_time timestamptz, idempotency_key uuid
       )
     ), validated as (
       select event.*, session.ranking_version
       from incoming event
       inner join public.reader_feed_sessions session
         on session.id = event.feed_session_id and session.profile_id = $1 and session.expires_at > now()
       inner join public.feed_exposures exposure
         on exposure.feed_session_id = session.id and exposure.story_id = event.story_id
       inner join public.posts post
         on post.id = event.story_id and post.status = 'published' and post.is_public = true
            and post.provenance = 'human_verified'
       inner join public.profiles author on author.id = post.author_id and author.account_type = 'human'
       inner join public.profiles reader on reader.id = $1 and reader.account_type = 'human'
       where event.client_event_time between now() - interval '7 days' and now() + interval '5 minutes'
         and (
           event.event_type <> 'quick_exit'
           or exists (
             select 1 from public.reader_behavior_events opened
             where opened.profile_id = $1 and opened.story_id = event.story_id
               and opened.feed_session_id = event.feed_session_id and opened.event_type = 'open'
           )
           or exists (
             select 1 from incoming opened
             where opened.story_id = event.story_id
               and opened.feed_session_id = event.feed_session_id and opened.event_type = 'open'
           )
         )
     ), inserted as (
       insert into public.reader_behavior_events (
         id, profile_id, story_id, event_type, numeric_value, feed_session_id,
         client_event_time, idempotency_key, ranking_model_version
       )
       select id, $1, story_id, event_type, numeric_value, feed_session_id,
              client_event_time, idempotency_key, ranking_version
       from validated
       on conflict (profile_id, idempotency_key) do nothing
       returning id, story_id, event_type, feed_session_id
     )
     select * from inserted`,
    [profileId, JSON.stringify(events)]
  );
  const opened = result.rows.filter((row) => row.event_type === 'open');
  const impressed = result.rows.filter((row) => row.event_type === 'impression');
  if (impressed.length > 0) {
    await database.query(
      `update public.feed_exposures exposure set shown_at = coalesce(shown_at, now())
       from jsonb_to_recordset($2::jsonb) as item(story_id uuid, feed_session_id uuid)
       where exposure.profile_id = $1 and exposure.story_id = item.story_id
         and exposure.feed_session_id = item.feed_session_id`,
      [profileId, JSON.stringify(impressed)]
    );
  }
  if (opened.length > 0) {
    await database.query(
      `update public.feed_exposures exposure set opened_at = coalesce(opened_at, now())
       from jsonb_to_recordset($2::jsonb) as item(story_id uuid, feed_session_id uuid)
       where exposure.profile_id = $1 and exposure.story_id = item.story_id
         and exposure.feed_session_id = item.feed_session_id`,
      [profileId, JSON.stringify(opened)]
    );
  }
  return { accepted: result.rowCount, duplicateOrRejected: events.length - result.rowCount };
}

export async function cleanExpiredFeedData(database) {
  const result = await database.query(
    `with deleted_events as (
       delete from public.reader_behavior_events
       where server_received_at < now() - interval '90 days'
       returning 1
     ), deleted_sessions as (
       delete from public.reader_feed_sessions
       where expires_at < now() - interval '30 days'
       returning 1
     )
     select (select count(*)::int from deleted_events) as "eventsDeleted",
            (select count(*)::int from deleted_sessions) as "sessionsDeleted"`
  );
  return result.rows[0];
}
