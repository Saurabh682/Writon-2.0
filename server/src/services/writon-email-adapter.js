import { detectMilestones } from '../engagement/milestones.js';

/**
 * Concrete WritOn adapter connecting the email and engagement engine
 * to WritOn's production PostgreSQL schema and Fastify auth middleware.
 */
export function createWritonEmailAdapter(pool, { siteBaseUrl = 'https://writon.cc' } = {}) {
  const base = siteBaseUrl.replace(/\/$/, '');

  return {
    async getWeeklyWriterStats(profileId, { end = new Date(), days = 7 } = {}) {
      const windowEnd = new Date(end);
      const windowStart = new Date(windowEnd.getTime() - days * 86_400_000);

      const [
        storiesRes,
        readersRes,
        applaudsRes,
        commentsRes,
        followersRes,
        sharesRes,
        priorMetricsRes,
        currentMetricsRes,
      ] = await Promise.all([
        pool.query(
          `select count(*)::int as count from public.posts
           where author_id = $1 and status = 'published'
             and coalesce(published_at, created_at) >= $2 and coalesce(published_at, created_at) < $3`,
          [profileId, windowStart, windowEnd],
        ),
        pool.query(
          `select count(distinct h.user_id)::int as count
           from public.reading_history h
           inner join public.posts p on p.id = h.post_id
           where p.author_id = $1
             and h.last_read_at >= $2 and h.last_read_at < $3
             and not exists (select 1 from public.bot_configs bot where bot.id = h.user_id)`,
          [profileId, windowStart, windowEnd],
        ),
        pool.query(
          `select count(*)::int as count
           from public.post_applauds a
           inner join public.posts p on p.id = a.post_id
           where p.author_id = $1
             and a.created_at >= $2 and a.created_at < $3
             and not exists (select 1 from public.bot_configs bot where bot.id = a.user_id)`,
          [profileId, windowStart, windowEnd],
        ),
        pool.query(
          `select count(*)::int as count
           from public.comments c
           inner join public.posts p on p.id = c.post_id
           where p.author_id = $1
             and c.created_at >= $2 and c.created_at < $3
             and not exists (select 1 from public.bot_configs bot where bot.id = c.author_id)`,
          [profileId, windowStart, windowEnd],
        ),
        pool.query(
          `select count(*)::int as count
           from public.follows f
           where f.following_id = $1
             and f.created_at >= $2 and f.created_at < $3
             and not exists (select 1 from public.bot_configs bot where bot.id = f.follower_id)`,
          [profileId, windowStart, windowEnd],
        ),
        pool.query(
          `select count(*)::int as count
           from public.writer_engagement_events e
           where e.profile_id = $1
             and e.event_type = 'story_share_initiated'
             and e.occurred_at >= $2 and e.occurred_at < $3`,
          [profileId, windowStart, windowEnd],
        ),
        pool.query(
          `select
             (select count(*)::int from public.posts p where p.author_id = $1 and p.status = 'published' and coalesce(p.published_at, p.created_at) < $2) as posts,
             (select count(*)::int from public.post_applauds a inner join public.posts p on p.id = a.post_id where p.author_id = $1 and a.created_at < $2 and not exists (select 1 from public.bot_configs b where b.id = a.user_id)) as applauds,
             (select count(*)::int from public.comments c inner join public.posts p on p.id = c.post_id where p.author_id = $1 and c.created_at < $2 and not exists (select 1 from public.bot_configs b where b.id = c.author_id)) as comments,
             (select count(*)::int from public.follows f where f.following_id = $1 and f.created_at < $2 and not exists (select 1 from public.bot_configs b where b.id = f.follower_id)) as followers,
             (select count(distinct h.user_id)::int from public.reading_history h inner join public.posts p on p.id = h.post_id where p.author_id = $1 and h.last_read_at < $2 and not exists (select 1 from public.bot_configs b where b.id = h.user_id)) as "uniqueReaders"`,
          [profileId, windowStart],
        ),
        pool.query(
          `select
             (select count(*)::int from public.posts p where p.author_id = $1 and p.status = 'published' and coalesce(p.published_at, p.created_at) < $2) as posts,
             (select count(*)::int from public.post_applauds a inner join public.posts p on p.id = a.post_id where p.author_id = $1 and a.created_at < $2 and not exists (select 1 from public.bot_configs b where b.id = a.user_id)) as applauds,
             (select count(*)::int from public.comments c inner join public.posts p on p.id = c.post_id where p.author_id = $1 and c.created_at < $2 and not exists (select 1 from public.bot_configs b where b.id = c.author_id)) as comments,
             (select count(*)::int from public.follows f where f.following_id = $1 and f.created_at < $2 and not exists (select 1 from public.bot_configs b where b.id = f.follower_id)) as followers,
             (select count(distinct h.user_id)::int from public.reading_history h inner join public.posts p on p.id = h.post_id where p.author_id = $1 and h.last_read_at < $2 and not exists (select 1 from public.bot_configs b where b.id = h.user_id)) as "uniqueReaders"`,
          [profileId, windowEnd],
        ),
      ]);

      const priorMetrics = priorMetricsRes.rows[0] || {};
      const currentMetrics = currentMetricsRes.rows[0] || {};
      const crossedMilestones = detectMilestones(priorMetrics, currentMetrics);

      return {
        storiesPublished: storiesRes.rows[0]?.count ?? 0,
        uniqueReaders: readersRes.rows[0]?.count ?? 0,
        applauds: applaudsRes.rows[0]?.count ?? 0,
        comments: commentsRes.rows[0]?.count ?? 0,
        followersGained: followersRes.rows[0]?.count ?? 0,
        shareActions: sharesRes.rows[0]?.count ?? 0,
        milestones: crossedMilestones,
      };
    },

    async getTopStory(profileId, { end = new Date(), days = 7 } = {}) {
      const windowEnd = new Date(end);
      const windowStart = new Date(windowEnd.getTime() - days * 86_400_000);

      const result = await pool.query(
        `select p.id::text, p.title, coalesce(nullif(btrim(p.summary), ''), substring(p.content from 1 for 180)) as summary,
                count(distinct h.user_id)::int as reader_count
         from public.posts p
         left join public.reading_history h on h.post_id = p.id
           and h.last_read_at >= $2 and h.last_read_at < $3
           and not exists (select 1 from public.bot_configs bot where bot.id = h.user_id)
         where p.author_id = $1 and p.status = 'published'
         group by p.id, p.title, p.summary, p.content, p.published_at
         order by reader_count desc, p.published_at desc nulls last
         limit 1`,
        [profileId, windowStart, windowEnd],
      );

      const row = result.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        title: row.title,
        summary: row.summary,
      };
    },

    async getRecommendationCandidates(profileId, limit = 3) {
      const result = await pool.query(
        `select p.id::text, p.title, p.slug, author.full_name as author
         from public.posts p
         inner join public.profiles author on author.id = p.author_id
         where p.status = 'published' and p.is_public = true
           and p.author_id != $1
           and author.account_type in ('human', 'editorial_bot')
           and p.provenance in ('human_verified', 'synthetic')
           and coalesce(p.published_at, p.created_at) >= now() - interval '30 days'
         order by coalesce(p.published_at, p.created_at) desc
         limit $2`,
        [profileId, limit],
      );

      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        author: row.author,
        url: `${base}/story/${encodeURIComponent(row.slug || row.id)}`,
      }));
    },

    async getCurrentEmailState(profileId) {
      const result = await pool.query(
        `select id, email, account_type
         from public.profiles
         where id = $1`,
        [profileId],
      );

      if (result.rowCount === 0) {
        return { accountExists: false, verified: false, email: null, emailVersion: 0 };
      }

      const row = result.rows[0];
      const email = row.email ? String(row.email).trim().toLowerCase() : null;
      return {
        accountExists: true,
        verified: Boolean(email && !email.endsWith('@legacy.writon.io')),
        email,
        emailVersion: 1,
      };
    },

    async resolveAuthenticatedProfileId(request) {
      if (!request?.profileId) {
        const err = new Error('Authentication required');
        err.statusCode = 401;
        throw err;
      }
      return request.profileId;
    },
  };
}
