const DEFINITIONS = Object.freeze([
  { key: 'profile_complete', title: 'Your Signature', description: 'Complete your writer profile.', metric: 'profileComplete', target: 1, icon: 'signature' },
  { key: 'first_read', title: 'First Page', description: 'Read your first WritOn story.', metric: 'storiesRead', target: 1, icon: 'book' },
  { key: 'first_applause', title: 'First Applause', description: 'Applaud a story for the first time.', metric: 'applaudsGiven', target: 1, icon: 'applause' },
  { key: 'first_bookmark', title: 'Worth Remembering', description: 'Save your first story.', metric: 'bookmarksGiven', target: 1, icon: 'bookmark' },
  { key: 'first_comment', title: 'Join the Conversation', description: 'Leave your first thoughtful response.', metric: 'commentsGiven', target: 1, icon: 'comment' },
  { key: 'first_story', title: 'Published Voice', description: 'Publish your first story.', metric: 'storiesPublished', target: 1, icon: 'quill' },
  { key: 'three_stories', title: 'Building a Body of Work', description: 'Publish three stories.', metric: 'storiesPublished', target: 3, icon: 'quill' },
  { key: 'first_follower', title: 'First Reader', description: 'Gain your first genuine follower.', metric: 'followers', target: 1, icon: 'reader' },
  { key: 'first_applause_received', title: 'Words That Moved Someone', description: 'Receive your first genuine applause.', metric: 'applaudsReceived', target: 1, icon: 'spark' },
  { key: 'ten_applauds_story', title: 'Resonant Story', description: 'Receive 10 genuine applauds on one story.', metric: 'maxApplaudsOnStory', target: 10, icon: 'spark' },
  { key: 'ten_bookmarks_received', title: 'Remembered Words', description: 'Have your stories saved 10 times.', metric: 'bookmarksReceived', target: 10, icon: 'bookmark' },
  { key: 'five_categories', title: 'Curious Mind', description: 'Read stories across five categories.', metric: 'categoriesExplored', target: 5, icon: 'compass' },
]);

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildMilestoneProgress(metrics, earnedByKey = new Map()) {
  return DEFINITIONS.map((definition) => {
    const progress = Math.min(definition.target, Math.max(0, numeric(metrics[definition.metric])));
    const earnedAt = earnedByKey.get(definition.key) ?? null;
    return {
      key: definition.key,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      progress,
      target: definition.target,
      earned: Boolean(earnedAt),
      earnedAt,
    };
  });
}

export async function getMilestoneJourney(database, profileId) {
  const [metricsResult, earnedResult] = await Promise.all([
    database.query(
      `select
         case when nullif(btrim(profile.full_name), '') is not null
                and nullif(btrim(profile.pen_name), '') is not null
                and nullif(btrim(profile.bio), '') is not null
                and nullif(btrim(profile.avatar_url), '') is not null then 1 else 0 end as "profileComplete",
         (select count(*)::int from public.reading_history h where h.user_id = profile.id) as "storiesRead",
         (select count(*)::int from public.post_applauds a where a.user_id = profile.id) as "applaudsGiven",
         (select count(*)::int from public.bookmarks b where b.user_id = profile.id) as "bookmarksGiven",
         (select count(*)::int from public.comments c where c.author_id = profile.id) as "commentsGiven",
         (select count(*)::int from public.posts p where p.author_id = profile.id and p.status = 'published') as "storiesPublished",
         (select count(*)::int from public.follows f
            where f.following_id = profile.id
              and not exists (select 1 from public.bot_configs bot where bot.id = f.follower_id)) as followers,
         (select count(*)::int from public.post_applauds a
            inner join public.posts p on p.id = a.post_id
            where p.author_id = profile.id
              and not exists (select 1 from public.bot_configs bot where bot.id = a.user_id)) as "applaudsReceived",
         (select coalesce(max(story_applause.total), 0)::int from (
            select count(*)::int as total from public.posts p
            inner join public.post_applauds a on a.post_id = p.id
            where p.author_id = profile.id
              and not exists (select 1 from public.bot_configs bot where bot.id = a.user_id)
            group by p.id
          ) story_applause) as "maxApplaudsOnStory",
         (select count(*)::int from public.bookmarks b
            inner join public.posts p on p.id = b.post_id
            where p.author_id = profile.id
              and not exists (select 1 from public.bot_configs bot where bot.id = b.user_id)) as "bookmarksReceived",
         (select count(distinct p.category)::int from public.reading_history h
            inner join public.posts p on p.id = h.post_id where h.user_id = profile.id) as "categoriesExplored"
       from public.profiles profile where profile.id = $1`,
      [profileId]
    ),
    database.query(
      `select milestone_key as key, earned_at as "earnedAt"
         from public.user_milestones where profile_id = $1`,
      [profileId]
    ),
  ]);

  if (metricsResult.rowCount === 0) return null;
  const metrics = metricsResult.rows[0];
  const previouslyEarned = new Map(earnedResult.rows.map((row) => [row.key, row.earnedAt]));
  const eligibleKeys = DEFINITIONS
    .filter((definition) => numeric(metrics[definition.metric]) >= definition.target)
    .map((definition) => definition.key);
  const newlyEarnedKeys = eligibleKeys.filter((key) => !previouslyEarned.has(key));

  if (eligibleKeys.length > 0) {
    await database.query(
      `insert into public.user_milestones (profile_id, milestone_key)
       select $1, unnest($2::text[])
       on conflict (profile_id, milestone_key) do nothing`,
      [profileId, eligibleKeys]
    );
  }

  const refreshed = eligibleKeys.length > 0
    ? await database.query(
      `select milestone_key as key, earned_at as "earnedAt"
         from public.user_milestones where profile_id = $1`,
      [profileId]
    )
    : earnedResult;
  const earnedByKey = new Map(refreshed.rows.map((row) => [row.key, row.earnedAt]));
  const milestones = buildMilestoneProgress(metrics, earnedByKey);
  return {
    milestones,
    newlyEarned: milestones.filter((item) => newlyEarnedKeys.includes(item.key)),
    summary: {
      earned: milestones.filter((item) => item.earned).length,
      total: milestones.length,
    },
  };
}
