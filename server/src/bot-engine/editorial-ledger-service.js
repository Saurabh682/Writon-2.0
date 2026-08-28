/**
 * WritOn Editorial Ledger & Anti-Repetition Service
 * 
 * Provides persistent memory and governance for autonomous editorial cycles:
 * - Real-time AI editorial briefing (cooldowns, recent themes, avoid lists, community balance)
 * - Planned vs. Executed vs. Deferred vs. Avoid entry tracking
 * - Anti-repetition phrase and formula guards
 * - Story ideas backlog management
 */

import { randomUUID } from 'node:crypto';

/**
 * Compile a comprehensive, real-time editorial briefing for AI agents / ChatGPT.
 */
export async function getEditorialBriefing(pool) {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Persona Cooldown Status (last 48h active vs due)
  const cooldownRes = await pool.query(`
    select p.id, p.pen_name as "penName", p.full_name as "fullName",
           bc.categories, bc.post_frequency_hours as "frequencyHours",
           bc.last_posted_at as "lastPostedAt",
           case 
             when bc.last_posted_at is null then 'due'
             when bc.last_posted_at > now() - interval '48 hours' then 'cooling_down'
             else 'ready'
           end as "status"
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
           premise, language_style as "languageStyle"
    from public.editorial_ideas_backlog
    where status = 'backlog'
    order by created_at asc
    limit 10
  `);

  // 6. Today's Planned and Executed Ledger Entries
  const todayLedgerRes = await pool.query(`
    select id::text, status, entry_type as "entryType", author_pen_name as "authorPenName",
           genre, title, theme, details, avoid_reason as "avoidReason", created_at as "createdAt"
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
        lastPostedAt: w.lastPostedAt
      })),
      coolingWriters: coolingWriters.slice(0, 6).map(w => ({
        penName: w.penName,
        fullName: w.fullName,
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
    returning id::text, target_author_pen_name as "targetPenName", genre, proposed_title as "proposedTitle", premise, status
  `, [targetAuthorPenName || null, genre || 'Essays', proposedTitle, premise, languageStyle]);

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
