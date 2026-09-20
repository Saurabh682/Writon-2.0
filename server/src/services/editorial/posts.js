/**
 * Editorial Posts Repository & Lifecycle Management
 *
 * Implements:
 * - Atomic publication transaction (state, published_at, markdown render, HTML sanitize, version bump, source freeze, ledger audit)
 * - Revision history recording (editing published piece creates new revision without overwriting publication record)
 * - Multilingual slug queries
 */

import { formatContentToHtml } from './renderer.js';
import { calculateReadingTime, validateLengthClass, validateAntiSlop } from './voice-validator.js';
import { validateGateTransition } from './publication-gate.js';
import { withTransaction } from '../../db/transaction.js';

/**
 * Creates an editorial post (e.g. idea, candidate, or draft)
 */
export async function createEditorialPost(pool, {
  slug,
  title,
  subtitle = null,
  type = 'journal',
  category = 'inside-writon',
  status = 'idea',
  language = 'en',
  authorName = 'WritOn Editorial',
  authorPenName = 'writon_editorial',
  excerpt = '',
  contentMarkdown = null,
  editorialSignificanceScore = 0,
  editorialSignificanceDetails = {},
  automationMetadata = {}
}) {
  const words = contentMarkdown ? contentMarkdown.trim().split(/\s+/).filter(Boolean).length : 0;
  const readMinutes = words > 0 ? calculateReadingTime(contentMarkdown) : 3;

  const res = await pool.query(`
    INSERT INTO public.editorial_posts (
      slug, title, subtitle, type, category, status,
      language, author_name, author_pen_name, excerpt,
      content_markdown, estimated_read_minutes,
      editorial_significance_score, editorial_significance_details,
      automation_metadata, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12,
      $13, $14,
      $15, NOW(), NOW()
    )
    RETURNING *
  `, [
    slug, title, subtitle, type, category, status,
    language, authorName, authorPenName, excerpt,
    contentMarkdown, readMinutes,
    editorialSignificanceScore, JSON.stringify(editorialSignificanceDetails),
    JSON.stringify(automationMetadata)
  ]);

  const post = res.rows[0];

  // Record creation in ledger
  await pool.query(`
    INSERT INTO public.editorial_ledger (
      post_id, action, from_status, to_status, actor, metadata
    ) VALUES ($1, 'created', null, $2, 'system', $3)
  `, [post.id, status, JSON.stringify({ slug, language, type })]);

  return post;
}

/**
 * Atomic Publication Transaction
 *
 * Executes all 7 critical publishing operations inside a single database transaction:
 * 1. Post lock and validation
 * 2. Gate transition check
 * 3. Canonical Markdown rendering to HTML
 * 4. Status update to 'published' with timestamp
 * 5. Increment render version
 * 6. Record immutable revision entry in editorial_post_revisions
 * 7. Record publication event in editorial_ledger
 */
export async function publishPostAtomic(pool, postId, {
  actor = 'system',
  isAutomated = false,
  changeReason = 'Initial publication'
} = {}) {
  return await withTransaction(pool, async (client) => {
    // 1. Lock post row FOR UPDATE
    const selectRes = await client.query(
      'SELECT * FROM public.editorial_posts WHERE id = $1 FOR UPDATE',
      [postId]
    );
    if (selectRes.rowCount === 0) {
      throw new Error(`Editorial post ${postId} not found`);
    }
    const post = selectRes.rows[0];

    // 2. Validate gate transition
    const gateResult = validateGateTransition({
      post,
      targetStatus: 'published',
      isAutomated
    });
    if (!gateResult.allowed) {
      throw new Error(gateResult.reason);
    }

    // 3. Render and sanitize Markdown
    const renderedHtml = formatContentToHtml(post.content_markdown);
    const nextRenderVersion = (post.content_render_version || 1) + 1;
    const now = new Date();

    // 4. Update post row to published
    const updateRes = await client.query(`
      UPDATE public.editorial_posts
      SET status = 'published',
          content_rendered_html = $1,
          content_render_version = $2,
          published_at = COALESCE(published_at, $3),
          updated_at = $3
      WHERE id = $4
      RETURNING *
    `, [renderedHtml, nextRenderVersion, now, postId]);
    const publishedPost = updateRes.rows[0];

    // 5. Query latest revision number
    const revRes = await client.query(
      'SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_rev FROM public.editorial_post_revisions WHERE post_id = $1',
      [postId]
    );
    const revisionNumber = revRes.rows[0].next_rev;

    // 6. Record immutable revision
    await client.query(`
      INSERT INTO public.editorial_post_revisions (
        post_id, revision_number, title, content_markdown,
        content_rendered_html, source_hash, changed_by, change_reason
      ) VALUES ($1, $2, $3, $4, $5, 'post_v' || $2, $6, $7)
    `, [
      postId, revisionNumber, publishedPost.title, publishedPost.content_markdown,
      renderedHtml, actor, changeReason
    ]);

    // 7. Record ledger entry
    await client.query(`
      INSERT INTO public.editorial_ledger (
        post_id, action, from_status, to_status, actor, metadata
      ) VALUES ($1, 'published', $2, 'published', $3, $4)
    `, [postId, post.status, actor, JSON.stringify({ revisionNumber, changeReason })]);

    return publishedPost;
  });
}

/**
 * Edit an existing post.
 * If the post is already published, records a new revision in the same transaction.
 */
export async function updatePostContent(pool, postId, {
  contentMarkdown,
  title,
  excerpt,
  actor = 'editor',
  changeReason = 'Editorial refinement'
}) {
  return await withTransaction(pool, async (client) => {
    const selectRes = await client.query(
      'SELECT * FROM public.editorial_posts WHERE id = $1 FOR UPDATE',
      [postId]
    );
    if (selectRes.rowCount === 0) {
      throw new Error(`Editorial post ${postId} not found`);
    }
    const post = selectRes.rows[0];

    const newTitle = title || post.title;
    const newMarkdown = contentMarkdown !== undefined ? contentMarkdown : post.content_markdown;
    const newExcerpt = excerpt || post.excerpt;

    let newHtml = post.content_rendered_html;
    if (newMarkdown) {
      newHtml = formatContentToHtml(newMarkdown);
    }
    const readMinutes = newMarkdown ? calculateReadingTime(newMarkdown) : post.estimated_read_minutes;

    const updateRes = await client.query(`
      UPDATE public.editorial_posts
      SET title = $1,
          content_markdown = $2,
          content_rendered_html = $3,
          excerpt = $4,
          estimated_read_minutes = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [newTitle, newMarkdown, newHtml, newExcerpt, readMinutes, postId]);
    const updatedPost = updateRes.rows[0];

    // If published, create revision snapshot
    if (post.status === 'published') {
      const revRes = await client.query(
        'SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_rev FROM public.editorial_post_revisions WHERE post_id = $1',
        [postId]
      );
      const revisionNumber = revRes.rows[0].next_rev;

      await client.query(`
        INSERT INTO public.editorial_post_revisions (
          post_id, revision_number, title, content_markdown,
          content_rendered_html, source_hash, changed_by, change_reason
        ) VALUES ($1, $2, $3, $4, $5, 'rev_' || $2, $6, $7)
      `, [postId, revisionNumber, newTitle, newMarkdown, newHtml, actor, changeReason]);

      await client.query(`
        INSERT INTO public.editorial_ledger (
          post_id, action, from_status, to_status, actor, metadata
        ) VALUES ($1, 'revision_created', 'published', 'published', $2, $3)
      `, [postId, actor, JSON.stringify({ revisionNumber, changeReason })]);
    }

    return updatedPost;
  });
}

/**
 * Retrieve post by language and slug
 */
export async function getPostBySlug(pool, slug, language = 'en') {
  const res = await pool.query(`
    SELECT * FROM public.editorial_posts
    WHERE slug = $1 AND language = $2 AND status = 'published'
    LIMIT 1
  `, [slug, language]);

  return res.rows[0] || null;
}

/**
 * Retrieve published journal posts with pagination
 */
export async function getPublishedJournalPosts(pool, { category, type, language = 'en', page = 1, limit = 10 } = {}) {
  const conditions = ["status = 'published'", "language = $1"];
  const params = [language];

  if (category && category !== 'all') {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  const offset = (page - 1) * limit;
  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const whereClause = conditions.join(' AND ');

  const postsQuery = `
    SELECT
      id, slug, title, subtitle, type, category, status,
      language, author_name as "authorName", author_pen_name as "authorPenName",
      author_avatar_url as "authorAvatarUrl", excerpt,
      estimated_read_minutes as "estimatedReadMinutes", featured,
      published_at as "publishedAt", created_at as "createdAt"
    FROM public.editorial_posts
    WHERE ${whereClause}
    ORDER BY featured DESC, published_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const countQuery = `
    SELECT count(*)::int as total
    FROM public.editorial_posts
    WHERE ${whereClause}
  `;

  const [postsRes, countRes] = await Promise.all([
    pool.query(postsQuery, params),
    pool.query(countQuery, params.slice(0, params.length - 2))
  ]);

  const total = countRes.rows[0]?.total || 0;

  return {
    posts: postsRes.rows,
    pagination: {
      page,
      limit,
      total,
      hasMore: offset + postsRes.rows.length < total
    }
  };
}

/**
 * Retrieve recent product updates
 */
export async function getRecentUpdates(pool, { limit = 20 } = {}) {
  const res = await pool.query(`
    SELECT
      id, slug, title, subtitle, type, category,
      author_name AS "authorName", excerpt,
      content_markdown AS "contentMarkdown",
      COALESCE(content_rendered_html, '') AS "contentHtml",
      published_at AS "publishedAt", created_at AS "createdAt"
    FROM public.editorial_posts
    WHERE status = 'published' AND category = 'writon-updates'
    ORDER BY published_at DESC NULLS LAST, created_at DESC
    LIMIT $1
  `, [limit]);
  return res.rows;
}

