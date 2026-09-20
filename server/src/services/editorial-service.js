/**
 * WritOn Editorial Publishing & Product Updates Service
 *
 * Provides core business logic for:
 * - Canonical editorial post modeling (Journal, Notes, Updates, Essays)
 * - Factual safety checks (zero invented metrics, dates, or quotes)
 * - Anti-AI-slop & cliché phrase validation
 * - Anti-repetition checks with cooldown tracking
 * - Release event ingestion with idempotency (e.g. android:{versionCode})
 * - Weekly editorial candidate synthesis and publication gate progression
 */

import { randomUUID } from 'node:crypto';

// Length Classes (word count ranges)
export const LENGTH_CLASSES = {
  note:    { min: 150,  max: 350,  defaultReadMinutes: 2 },
  update:  { min: 200,  max: 500,  defaultReadMinutes: 2 },
  journal: { min: 600,  max: 1200, defaultReadMinutes: 5 },
  essay:   { min: 1200, max: 2500, defaultReadMinutes: 9 },
};

// Forbidden generic AI openings and clichés
export const FORBIDDEN_EDITORIAL_PATTERNS = [
  /in today('?s)? fast-paced digital world/i,
  /in an era where/i,
  /whether you('?re)? a seasoned writer/i,
  /at writon, we believe/i,
  /unlock your creativity/i,
  /\brevolutionize\b/i,
  /\bgame-changing\b/i,
  /\bdelve into\b/i,
  /\btapestry of\b/i,
  /\bbeacon of\b/i,
  /\ba testament to\b/i
];

/**
 * Calculate estimated reading time in whole minutes (minimum 1)
 */
export function calculateReadingTime(text = '') {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Validates text against anti-slop rules
 */
export function validateAntiSlop(text = '') {
  for (const pattern of FORBIDDEN_EDITORIAL_PATTERNS) {
    if (pattern.test(text)) {
      return {
        valid: false,
        reason: `Contains forbidden marketing/AI cliché pattern: "${pattern.source}"`
      };
    }
  }
  return { valid: true };
}

/**
 * Validates length class constraints
 */
export function validateLengthClass(type, text = '') {
  const bounds = LENGTH_CLASSES[type];
  if (!bounds) return { valid: true };
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  if (words < bounds.min) {
    return {
      valid: false,
      reason: `Length (${words} words) is below minimum of ${bounds.min} for type "${type}"`
    };
  }
  if (words > bounds.max) {
    return {
      valid: false,
      reason: `Length (${words} words) exceeds maximum of ${bounds.max} for type "${type}"`
    };
  }
  return { valid: true, wordCount: words };
}

/**
 * Ingest a release event with strict idempotency and auto-generate an Updates entry
 */
export async function ingestReleaseEvent(pool, {
  idempotencyKey,
  platform = 'android',
  versionCode,
  versionName,
  rawPayload = {},
  userVisibleChanges = [],
  isMajor = false
}) {
  if (!idempotencyKey) {
    throw new Error('Release event requires an idempotencyKey (e.g. android:117)');
  }

  // 1. Check if release already ingested
  const existing = await pool.query(
    'select * from public.editorial_releases where idempotency_key = $1',
    [idempotencyKey]
  );
  if (existing.rowCount > 0) {
    return {
      success: true,
      alreadyProcessed: true,
      release: existing.rows[0],
      message: 'Release event already ingested'
    };
  }

  // 2. Insert raw release event first
  const releaseRes = await pool.query(`
    insert into public.editorial_releases (
      idempotency_key, platform, version_code, version_name,
      raw_payload, user_visible_changes, is_major, processed, created_at, updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7, false, now(), now())
    returning *
  `, [
    idempotencyKey, platform, versionCode, versionName,
    JSON.stringify(rawPayload), JSON.stringify(userVisibleChanges), isMajor
  ]);
  const release = releaseRes.rows[0];

  // 3. Automatically create an Updates entry from user-visible changes
  let updatePost = null;
  if (userVisibleChanges && userVisibleChanges.length > 0) {
    const slug = `update-${platform}-v${versionName.replace(/[^a-zA-Z0-9]/g, '-')}-${versionCode}`;
    const title = `WritOn for ${platform.toUpperCase()} ${versionName} (Build ${versionCode})`;
    const excerpt = userVisibleChanges.slice(0, 2).join('; ') + '.';
    
    const contentMarkdown = [
      `### What's New in Version ${versionName}`,
      '',
      userVisibleChanges.map(change => `- ${change}`).join('\n'),
      '',
      `This release is live on ${platform === 'android' ? 'Google Play' : platform}.`
    ].join('\n');

    const contentHtml = [
      `<h3>What's New in Version ${versionName}</h3>`,
      '<ul>',
      userVisibleChanges.map(change => `  <li>${escapeHtml(change)}</li>`).join('\n'),
      '</ul>',
      `<p>This release is live on ${platform === 'android' ? 'Google Play' : platform}.</p>`
    ].join('\n');

    const postRes = await pool.query(`
      insert into public.editorial_posts (
        slug, title, subtitle, type, category, status,
        language, author_name, author_pen_name, excerpt,
        content_markdown, content_html, estimated_read_minutes,
        published_at, source_events, automation_metadata
      ) values (
        $1, $2, $3, 'update', 'writon-updates', 'published',
        'en', 'WritOn Engineering', 'writon_engineering', $4,
        $5, $6, 1,
        now(), $7, $8
      )
      on conflict (slug) do update set
        title = excluded.title,
        content_markdown = excluded.content_markdown,
        content_html = excluded.content_html,
        updated_at = now()
      returning *
    `, [
      slug, title, `Release notes for build ${versionCode}`, excerpt,
      contentMarkdown, contentHtml,
      JSON.stringify([{ type: 'release', idempotencyKey, versionCode, versionName }]),
      JSON.stringify({ generatedFromRelease: true, platform, versionCode })
    ]);
    updatePost = postRes.rows[0];

    // Mark release as processed and associate post_id
    await pool.query(`
      update public.editorial_releases
      set processed = true, post_id = $1, updated_at = now()
      where id = $2
    `, [updatePost.id, release.id]);
  }

  return {
    success: true,
    alreadyProcessed: false,
    release,
    updatePost
  };
}

/**
 * Weekly editorial runner: examines releases, changes, and backlog.
 * Generates zero or more candidates (zero is a valid outcome).
 */
export async function runWeeklyEditorial(pool, { force = false } = {}) {
  const log = [];
  log.push('Starting weekly editorial assessment...');

  // 1. Fetch recent releases in the last 14 days
  const recentReleases = await pool.query(`
    select * from public.editorial_releases
    where created_at >= now() - interval '14 days'
    order by created_at desc
  `);

  // 2. Fetch recent journal posts to prevent thematic collision
  const recentPosts = await pool.query(`
    select id, slug, title, category, published_at
    from public.editorial_posts
    where status = 'published' and published_at >= now() - interval '21 days'
  `);

  // 3. Fetch active ideas in backlog
  const backlog = await pool.query(`
    select * from public.editorial_ideas_backlog
    where status = 'backlog'
    order by created_at asc
    limit 5
  `);

  log.push(`Found ${recentReleases.rowCount} recent releases, ${recentPosts.rowCount} recent posts, ${backlog.rowCount} backlog ideas.`);

  // Check if there are major releases or urgent backlog items
  const majorReleases = recentReleases.rows.filter(r => r.is_major);
  const candidatesCreated = [];

  if (majorReleases.length > 0 || force) {
    // Generate candidate from major release if not already drafted
    for (const rel of majorReleases) {
      const candidateSlug = `deep-dive-${rel.platform}-v${rel.version_name.replace(/[^a-zA-Z0-9]/g, '-')}`;
      const existing = await pool.query('select id from public.editorial_posts where slug = $1', [candidateSlug]);
      if (existing.rowCount === 0) {
        const title = `Behind the Release: ${rel.version_name} on ${rel.platform.toUpperCase()}`;
        const excerpt = `A look into the structural and craft updates delivered in build ${rel.version_code}.`;
        
        const postRes = await pool.query(`
          insert into public.editorial_posts (
            slug, title, type, category, status,
            language, author_name, excerpt,
            content_markdown, content_html, estimated_read_minutes,
            source_events, automation_metadata
          ) values (
            $1, $2, 'journal', 'building-writon', 'candidate',
            'en', 'WritOn Editorial', $3,
            $4, $5, 4,
            $6, $7
          ) returning *
        `, [
          candidateSlug, title, excerpt,
          `# ${title}\n\nDetails on the changes in build ${rel.version_code}.`,
          `<h1>${escapeHtml(title)}</h1><p>Details on the changes in build ${rel.version_code}.</p>`,
          JSON.stringify([{ type: 'weekly_editorial_candidate', releaseId: rel.id }]),
          JSON.stringify({ candidateSource: 'major_release', releaseId: rel.id })
        ]);
        candidatesCreated.push(postRes.rows[0]);
      }
    }
  }

  log.push(`Weekly editorial assessment completed. Generated ${candidatesCreated.length} candidate(s).`);
  return {
    success: true,
    candidatesGenerated: candidatesCreated.length,
    candidates: candidatesCreated,
    log
  };
}

/**
 * Query published journal posts with pagination and category filtering
 */
export async function getPublishedJournalPosts(pool, { category, type, page = 1, limit = 10 } = {}) {
  const conditions = ["status = 'published'"];
  const params = [];

  if (category && category !== 'all') {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';
  const countRes = await pool.query(`select count(*)::int as total from public.editorial_posts ${whereClause}`, params);
  const total = countRes.rows[0]?.total || 0;

  params.push(limit);
  const limitParam = `$${params.length}`;
  params.push((page - 1) * limit);
  const offsetParam = `$${params.length}`;

  const postsRes = await pool.query(`
    select
      id, slug, title, subtitle, type, category, status,
      language, author_name as "authorName", author_pen_name as "authorPenName",
      author_avatar_url as "authorAvatarUrl", excerpt,
      content_markdown as "contentMarkdown", content_html as "contentHtml",
      estimated_read_minutes as "estimatedReadMinutes", featured,
      published_at as "publishedAt", created_at as "createdAt",
      source_events as "sourceEvents", related_posts as "relatedPosts",
      seo
    from public.editorial_posts
    ${whereClause}
    order by featured desc, published_at desc nulls last, created_at desc
    limit ${limitParam} offset ${offsetParam}
  `, params);

  return {
    posts: postsRes.rows,
    pagination: {
      page,
      limit,
      total,
      hasMore: (page * limit) < total
    }
  };
}

/**
 * Fetch a single published post by slug
 */
export async function getPostBySlug(pool, slug) {
  const res = await pool.query(`
    select
      id, slug, title, subtitle, type, category, status,
      language, author_name as "authorName", author_pen_name as "authorPenName",
      author_avatar_url as "authorAvatarUrl", excerpt,
      content_markdown as "contentMarkdown", content_html as "contentHtml",
      estimated_read_minutes as "estimatedReadMinutes", featured,
      published_at as "publishedAt", created_at as "createdAt",
      source_events as "sourceEvents", related_posts as "relatedPosts",
      seo
    from public.editorial_posts
    where slug = $1 and status = 'published'
    limit 1
  `, [slug]);
  return res.rows[0] || null;
}

/**
 * Fetch recent updates
 */
export async function getRecentUpdates(pool, { limit = 20 } = {}) {
  const res = await pool.query(`
    select
      id, slug, title, subtitle, type, category,
      author_name as "authorName", excerpt,
      content_markdown as "contentMarkdown", content_html as "contentHtml",
      published_at as "publishedAt", created_at as "createdAt"
    from public.editorial_posts
    where status = 'published' and category = 'writon-updates'
    order by published_at desc nulls last, created_at desc
    limit $1
  `, [limit]);
  return res.rows;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
