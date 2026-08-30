/**
 * WritOn Editorial Ledger & Anti-Repetition Service
 *
 * Provides persistent memory and governance for autonomous editorial cycles:
 * - Real-time AI editorial briefing (dynamic cooldowns based on individual post_frequency_hours, recent themes, avoid lists, community balance)
 * - Planned vs. Executed vs. Deferred vs. Avoid entry tracking with lifecycle state transitions
 * - Anti-repetition phrase and formula guards with server-side validation
 * - Story ideas backlog management with status progression
 */

import { randomUUID } from 'node:crypto';

/**
 * Compile a comprehensive, real-time editorial briefing for AI agents / ChatGPT.
 * Accurately calculates writer cooldowns based on each persona's individual post_frequency_hours.
 */
export async function getEditorialBriefing(pool) {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Persona Cooldown Status (Dynamic per-writer cooldown calculation)
  const cooldownRes = await pool.query(`
    select p.id, p.pen_name as "penName", p.full_name as "fullName",
           bc.categories, coalesce(bc.post_frequency_hours, 24) as "frequencyHours",
           bc.last_posted_at as "lastPostedAt",
           case
             when bc.last_posted_at is null then 'due'
             when bc.last_posted_at + (coalesce(bc.post_frequency_hours, 24) * interval '1 hour') > now() then 'cooling_down'
             else 'ready'
           end as "status",
           case
             when bc.last_posted_at is null then 0
             else greatest(0, round((extract(epoch from (bc.last_posted_at + (coalesce(bc.post_frequency_hours, 24) * interval '1 hour') - now())) / 3600)::numeric, 1))
           end as "cooldownHoursRemaining"
    from public.bot_configs bc
    inner join public.profiles p on p.id = bc.id
    where bc.is_active = true and bc.bot_type = 'writer'
    order by bc.last_posted_at asc nulls first
  `);

  const readyWriters = cooldownRes.rows.filter(r => r.status === 'due' || r.status === 'ready');
  const coolingWriters = cooldownRes.rows.filter(r => r.status === 'cooling_down');

  // 2. Recent 15 published story titles and categories
  const recentStoriesRes = await pool.query(`
    select p.id::text, p.title, p.category, p.summary,
           author.pen_name as "authorPenName", author.full_name as "authorFullName",
           coalesce(p.published_at, p.created_at) as "publishedAt"
    from public.posts p
    inner join public.profiles author on author.id = p.author_id
    where p.status = 'published' and p.is_public = true
    order by coalesce(p.published_at, p.created_at) desc
    limit 15
  `);

  // 3. Active Anti-Repetition Rules
  const antiRepRes = await pool.query(`
    select pattern_type as "patternType", pattern, reason
    from public.editorial_anti_repetition
    where status = 'active'
    order by pattern_type asc, created_at desc
  `);

  // 4. Community Genre Balance (Last 7 days)
  const balanceRes = await pool.query(`
    select category, count(*)::int as count
    from public.posts
    where status = 'published' and is_public = true
      and coalesce(published_at, created_at) >= now() - interval '7 days'
    group by category
    order by count desc
  `);

  // 5. Unexecuted Ideas in Backlog
  const backlogRes = await pool.query(`
    select id::text, target_author_pen_name as "targetPenName", genre, proposed_title as "proposedTitle",
           premise, language_style as "languageStyle", status
    from public.editorial_ideas_backlog
    where status = 'backlog'
    order by created_at asc
    limit 10
  `);

  // 6. Today's Planned and Executed Ledger Entries
  const todayLedgerRes = await pool.query(`
    select id::text, status, entry_type as "entryType", author_pen_name as "authorPenName",
           genre, title, theme, details, avoid_reason as "avoidReason", target_post_id as "targetPostId", created_at as "createdAt"
    from public.editorial_ledger_entries
    where edition_date = $1
    order by created_at desc
  `, [today]);

  return {
    editionDate: today,
    summary: `WritOn Editorial Briefing for ${today}: ${readyWriters.length} writers ready, ${coolingWriters.length} in cooldown.`,
    writerCooldowns: {
      readyToPublishCount: readyWriters.length,
      coolingDownCount: coolingWriters.length,
      topReadyWriters: readyWriters.slice(0, 8).map(w => ({
        penName: w.penName,
        fullName: w.fullName,
        categories: w.categories,
        frequencyHours: w.frequencyHours,
        lastPostedAt: w.lastPostedAt
      })),
      coolingWriters: coolingWriters.slice(0, 6).map(w => ({
        penName: w.penName,
        fullName: w.fullName,
        frequencyHours: w.frequencyHours,
        cooldownHoursRemaining: Number(w.cooldownHoursRemaining),
        lastPostedAt: w.lastPostedAt
      }))
    },
    recentPublications: recentStoriesRes.rows.map(s => ({
      title: s.title,
      author: `@${s.authorPenName}`,
      category: s.category,
      publishedAt: s.publishedAt
    })),
    antiRepetitionAvoidList: antiRepRes.rows,
    communityGenreBalance7Days: balanceRes.rows,
    ideasBacklog: backlogRes.rows,
    todayLedger: todayLedgerRes.rows
  };
}

/**
 * Record an entry into the WritOn Editorial Ledger.
 */
export async function recordLedgerEntry(pool, {
  editionDate = null,
  status = 'executed', // 'planned', 'executed', 'deferred', 'avoid'
  entryType = 'publication', // 'publication', 'comment_wave', 'applaud_swarm', 'reflection', 'anti_repetition_rule', 'future_idea'
  authorId = null,
  authorPenName = null,
  genre = null,
  languageStyle = 'English',
  title = null,
  theme = null,
  approxWordCount = null,
  details = {},
  avoidReason = null,
  targetPostId = null
}) {
  const date = editionDate || new Date().toISOString().slice(0, 10);

  const res = await pool.query(`
    insert into public.editorial_ledger_entries (
      edition_date, status, entry_type, author_id, author_pen_name,
      genre, language_style, title, theme, approx_word_count,
      details, avoid_reason, target_post_id, created_at, updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), now())
    returning *
  `, [
    date,
    status,
    entryType,
    authorId,
    authorPenName,
    genre,
    languageStyle,
    title,
    theme,
    approxWordCount,
    JSON.stringify(details || {}),
    avoidReason,
    targetPostId
  ]);

  return res.rows[0];
}

/**
 * Transition the lifecycle status of an existing ledger entry.
 * E.g., 'planned' -> 'executed', 'deferred', or 'avoid'.
 */
export async function updateLedgerEntryStatus(pool, id, {
  status,
  targetPostId = null,
  details = null,
  avoidReason = null
}) {
  const validStatuses = ['planned', 'executed', 'deferred', 'avoid'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid ledger status: "${status}". Must be one of: ${validStatuses.join(', ')}`);
  }

  const existingRes = await pool.query(`select * from public.editorial_ledger_entries where id = $1 limit 1`, [id]);
  if (existingRes.rowCount === 0) {
    throw new Error(`Ledger entry with id "${id}" not found.`);
  }

  const existing = existingRes.rows[0];
  const mergedDetails = details ? { ...(existing.details || {}), ...details } : existing.details;

  const res = await pool.query(`
    update public.editorial_ledger_entries
    set status = $2,
        target_post_id = coalesce($3, target_post_id),
        details = $4,
        avoid_reason = coalesce($5, avoid_reason),
        updated_at = now()
    where id = $1
    returning *
  `, [
    id,
    status,
    targetPostId,
    JSON.stringify(mergedDetails || {}),
    avoidReason
  ]);

  return res.rows[0];
}

/**
 * Query historical ledger entries.
 */
export async function getLedgerEntries(pool, { date = null, status = null, limit = 50, offset = 0 } = {}) {
  const res = await pool.query(`
    select id::text, edition_date as "editionDate", status, entry_type as "entryType",
           author_pen_name as "authorPenName", genre, language_style as "languageStyle",
           title, theme, approx_word_count as "approxWordCount", details,
           avoid_reason as "avoidReason", target_post_id as "targetPostId", created_at as "createdAt"
    from public.editorial_ledger_entries
    where ($1::date is null or edition_date = $1)
      and ($2::text is null or status = $2)
    order by created_at desc
    limit $3 offset $4
  `, [date, status, limit, offset]);

  const countRes = await pool.query(`
    select count(*)::int as total
    from public.editorial_ledger_entries
    where ($1::date is null or edition_date = $1)
      and ($2::text is null or status = $2)
  `, [date, status]);

  return {
    count: res.rows.length,
    total: countRes.rows[0]?.total || 0,
    entries: res.rows
  };
}

/**
 * Add a pitch or premise to the story ideas backlog.
 */
export async function addIdeaToBacklog(pool, { targetAuthorPenName, genre, proposedTitle, premise, languageStyle = 'English' }) {
  if (!proposedTitle || !premise) throw new Error('proposedTitle and premise are required');

  const res = await pool.query(`
    insert into public.editorial_ideas_backlog (
      target_author_pen_name, genre, proposed_title, premise, language_style, status, created_at, updated_at
    ) values ($1, $2, $3, $4, $5, 'backlog', now(), now())
    on conflict (proposed_title) do update set
      target_author_pen_name = coalesce(excluded.target_author_pen_name, public.editorial_ideas_backlog.target_author_pen_name),
      genre = coalesce(excluded.genre, public.editorial_ideas_backlog.genre),
      premise = excluded.premise,
      updated_at = now()
    returning id::text, target_author_pen_name as "targetPenName", genre, proposed_title as "proposedTitle", premise, status
  `, [targetAuthorPenName || null, genre || 'Essays', proposedTitle, premise, languageStyle]);

  return res.rows[0];
}

/**
 * Transition the status of a story idea in the backlog.
 * E.g., 'backlog' -> 'planned', 'executed', or 'discarded'.
 */
export async function updateBacklogIdeaStatus(pool, id, { status }) {
  const validStatuses = ['backlog', 'planned', 'executed', 'discarded'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid backlog idea status: "${status}". Must be one of: ${validStatuses.join(', ')}`);
  }

  const res = await pool.query(`
    update public.editorial_ideas_backlog
    set status = $2,
        updated_at = now()
    where id = $1
    returning id::text, target_author_pen_name as "targetPenName", genre, proposed_title as "proposedTitle", premise, status, updated_at as "updatedAt"
  `, [id, status]);

  if (res.rowCount === 0) {
    throw new Error(`Backlog idea with id "${id}" not found.`);
  }

  return res.rows[0];
}

/**
 * Add an anti-repetition rule or blacklisted pattern.
 */
export async function addAntiRepetitionPattern(pool, { patternType = 'cliche_phrase', pattern, reason }) {
  if (!pattern) throw new Error('pattern is required');

  const res = await pool.query(`
    insert into public.editorial_anti_repetition (pattern_type, pattern, reason, status, created_at)
    values ($1, $2, $3, 'active', now())
    on conflict (pattern) do update set reason = excluded.reason, status = 'active'
    returning id::text, pattern_type as "patternType", pattern, reason, status
  `, [patternType, pattern, reason || 'Banned editorial formula']);

  return res.rows[0];
}

/**
 * Server-Side Anti-Repetition & Zero-Slop Governance Validator
 *
 * Inspects proposed title, summary, and content against active rules in public.editorial_anti_repetition.
 * Returns validation results, identified violations, and sanitized strings.
 */
export async function validateAntiRepetition(pool, { title = '', summary = '', content = '' } = {}) {
  const activeRulesRes = await pool.query(`
    select pattern_type as "patternType", pattern, reason
    from public.editorial_anti_repetition
    where status = 'active'
  `);

  const activeRules = activeRulesRes.rows;
  const violations = [];
  let sanitizedTitle = title || '';
  let sanitizedContent = content || '';
  let sanitizedSummary = summary || '';

  for (const rule of activeRules) {
    const patternLower = rule.pattern.toLowerCase().trim();
    if (!patternLower) continue;

    // Check cliché phrases across title, summary, content
    if (rule.patternType === 'cliche_phrase') {
      const inTitle = sanitizedTitle.toLowerCase().includes(patternLower);
      const inSummary = sanitizedSummary.toLowerCase().includes(patternLower);
      const inContent = sanitizedContent.toLowerCase().includes(patternLower);

      if (inTitle || inSummary || inContent) {
        violations.push({
          pattern: rule.pattern,
          patternType: rule.patternType,
          reason: rule.reason,
          location: inTitle ? 'title' : (inSummary ? 'summary' : 'content')
        });

        // Scrub phrase from content/summary/title case-insensitively
        const regex = new RegExp(rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        sanitizedContent = sanitizedContent.replace(regex, '');
        sanitizedSummary = sanitizedSummary.replace(regex, '');
      }
    }

    // Check banned opening phrases in first 250 characters of content
    if (rule.patternType === 'opening_phrase') {
      const openingSlice = sanitizedContent.slice(0, 250).toLowerCase();
      if (openingSlice.includes(patternLower)) {
        violations.push({
          pattern: rule.pattern,
          patternType: rule.patternType,
          reason: rule.reason,
          location: 'opening'
        });
      }
    }

    // Check title formulas
    if (rule.patternType === 'title_formula') {
      if (sanitizedTitle.toLowerCase().includes(patternLower)) {
        violations.push({
          pattern: rule.pattern,
          patternType: rule.patternType,
          reason: rule.reason,
          location: 'title'
        });
      }
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    sanitizedTitle: sanitizedTitle.trim(),
    sanitizedSummary: sanitizedSummary.trim(),
    sanitizedContent: sanitizedContent.trim()
  };
}

/**
 * Retrieve full persistent daily editorial state for AI agents / ChatGPT.
 * Aggregates today's published stories, community interactions (reads, comments, applauds),
 * persona cooldowns, topic usage, anti-repetition rules, backlog ideas, and tomorrow's forecast.
 */
export async function getEditorialState(pool, targetDate = null) {
  const dateStr = targetDate || new Date().toISOString().slice(0, 10);

  // 1. Stories published on dateStr
  const storiesRes = await pool.query(`
    select p.id::text, p.title, p.slug, p.category, p.summary, p.reading_time_min as "readingTimeMin",
           p.likes_count as "likesCount", p.comments_count as "commentsCount",
           coalesce(p.published_at, p.created_at) as "publishedAt",
           author.id as "authorId", author.pen_name as "authorPenName", author.full_name as "authorFullName"
    from public.posts p
    inner join public.profiles author on author.id = p.author_id
    where p.status = 'published' and p.is_public = true
      and coalesce(p.published_at, p.created_at)::date = $1::date
    order by coalesce(p.published_at, p.created_at) desc
  `, [dateStr]);

  // 2. Comments posted on dateStr
  const commentsRes = await pool.query(`
    select c.id::text, c.content, c.created_at as "createdAt",
           p.id::text as "postId", p.title as "postTitle",
           author.pen_name as "commenterPenName", author.full_name as "commenterFullName"
    from public.comments c
    inner join public.posts p on p.id = c.post_id
    inner join public.profiles author on author.id = c.author_id
    where c.created_at::date = $1::date
    order by c.created_at desc
  `, [dateStr]);

  // 3. Applauds on dateStr
  const applaudsRes = await pool.query(`
    select pa.post_id::text as "postId", p.title as "postTitle",
           count(*)::int as "applaudCount",
           json_agg(json_build_object('id', u.id, 'penName', u.pen_name, 'fullName', u.full_name)) as "applauders"
    from public.post_applauds pa
    inner join public.posts p on p.id = pa.post_id
    inner join public.profiles u on u.id = pa.user_id
    where pa.created_at::date = $1::date
    group by pa.post_id, p.title
  `, [dateStr]);

  // 4. Persona Cooldowns
  const cooldownRes = await pool.query(`
    select p.id, p.pen_name as "penName", p.full_name as "fullName",
           bc.categories, coalesce(bc.post_frequency_hours, 24) as "frequencyHours",
           bc.last_posted_at as "lastPostedAt",
           case
             when bc.last_posted_at is null then 'due'
             when bc.last_posted_at + (coalesce(bc.post_frequency_hours, 24) * interval '1 hour') > now() then 'cooling_down'
             else 'ready'
           end as "status",
           case
             when bc.last_posted_at is null then 0
             else greatest(0, round((extract(epoch from (bc.last_posted_at + (coalesce(bc.post_frequency_hours, 24) * interval '1 hour') - now())) / 3600)::numeric, 1))
           end as "cooldownHoursRemaining"
    from public.bot_configs bc
    inner join public.profiles p on p.id = bc.id
    where bc.is_active = true and bc.bot_type = 'writer'
    order by bc.last_posted_at asc nulls first
  `);

  // 5. Anti-Repetition Rules
  const avoidRes = await pool.query(`
    select id::text, pattern_type as "patternType", pattern, reason
    from public.editorial_anti_repetition
    where status = 'active'
    order by pattern_type asc, created_at desc
  `);

  // 6. Backlog Ideas
  const backlogRes = await pool.query(`
    select id::text, target_author_pen_name as "targetPenName", genre, proposed_title as "proposedTitle",
           premise, language_style as "languageStyle", status
    from public.editorial_ideas_backlog
    where status in ('backlog', 'planned')
    order by created_at desc
  `);

  // 7. Ledger Entries on dateStr
  const ledgerRes = await pool.query(`
    select id::text, status, entry_type as "entryType", author_pen_name as "authorPenName",
           genre, title, theme, approx_word_count as "approxWordCount", target_post_id as "targetPostId",
           details, avoid_reason as "avoidReason", created_at as "createdAt"
    from public.editorial_ledger_entries
    where edition_date = $1::date
    order by created_at desc
  `, [dateStr]);

  // 8. 7-Day Genre & Topic Distribution
  const genreRes = await pool.query(`
    select category, count(*)::int as count
    from public.posts
    where status = 'published' and is_public = true
      and coalesce(published_at, created_at) >= now() - interval '7 days'
    group by category
    order by count desc
  `);

  const readyWriters = cooldownRes.rows.filter(r => r.status === 'due' || r.status === 'ready');
  const coolingWriters = cooldownRes.rows.filter(r => r.status === 'cooling_down');
  const totalApplauds = applaudsRes.rows.reduce((sum, item) => sum + (item.applaudCount || 0), 0);

  return {
    editionDate: dateStr,
    summary: `WritOn Editorial State for ${dateStr}: ${storiesRes.rows.length} stories published, ${commentsRes.rows.length} comments, ${totalApplauds} applauds.`,
    today: {
      date: dateStr,
      storiesPublishedCount: storiesRes.rows.length,
      storiesPublished: storiesRes.rows,
      commentsCount: commentsRes.rows.length,
      comments: commentsRes.rows,
      applaudsCount: totalApplauds,
      applauds: applaudsRes.rows,
      ledgerEntries: ledgerRes.rows
    },
    personaCooldowns: {
      totalWriters: cooldownRes.rows.length,
      readyCount: readyWriters.length,
      coolingDownCount: coolingWriters.length,
      readyWriters: readyWriters.slice(0, 15),
      nextDueWriters: coolingWriters.slice(0, 10).map(w => ({
        penName: w.penName,
        fullName: w.fullName,
        categories: w.categories,
        cooldownHoursRemaining: Number(w.cooldownHoursRemaining)
      }))
    },
    topicsAndGenres: {
      recentThemes: ledgerRes.rows.map(l => l.theme).filter(Boolean),
      recentTitles: storiesRes.rows.map(s => s.title),
      genreDistribution7Days: genreRes.rows
    },
    avoidList: {
      clichePhrases: avoidRes.rows.filter(r => r.patternType === 'cliche_phrase').map(r => r.pattern),
      openingPhrases: avoidRes.rows.filter(r => r.patternType === 'opening_phrase').map(r => r.pattern),
      titleFormulas: avoidRes.rows.filter(r => r.patternType === 'title_formula').map(r => r.pattern),
      allRules: avoidRes.rows
    },
    pendingIdeas: backlogRes.rows,
    tomorrowForecast: {
      dueWriters: coolingWriters.filter(w => Number(w.cooldownHoursRemaining) <= 24).slice(0, 8),
      recommendedGenres: genreRes.rows.slice(-4).map(g => g.category)
    }
  };
}
