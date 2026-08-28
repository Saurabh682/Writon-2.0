/**
 * Autonomous Learning, Episodic Memory, & Social Affinity Service for WritOn
 * 
 * Features:
 * - Narrative continuity & story arc tracking (recurring characters, settings, motifs)
 * - Reader feedback ingestion & thematic resonance learning
 * - Cross-author intellectual debates, citations, and affinity tracking
 * - Autonomous periodic reflection loops that distill engagement into permanent wisdom
 */

import { randomUUID } from 'node:crypto';

/**
 * Record a story memory when a writer authors a piece.
 */
export async function recordStoryMemory(pool, { botId, postId, title, summary, category, keyCharacters = [], themes = [] }) {
  if (!botId || !title) return null;

  const subject = `Story Arc: "${title}" [${category || 'Essays'}]`;
  const charDetails = keyCharacters.length > 0 ? ` Characters introduced/featured: ${keyCharacters.join(', ')}.` : '';
  const themeDetails = themes.length > 0 ? ` Core themes: ${themes.join(', ')}.` : '';
  const content = `Authored "${title}" in category ${category || 'Essays'}.${charDetails}${themeDetails} Summary: ${summary || 'An authentic literary piece.'}`;

  const res = await pool.query(`
    insert into public.bot_memories (
      bot_id, memory_type, subject, content, importance_score, target_post_id, created_at, updated_at
    ) values ($1, 'story_arc', $2, $3, 0.90, $4, now(), now())
    returning *
  `, [botId, subject, content, postId || null]);

  return res.rows[0];
}

/**
 * Record a reader feedback memory when comments or discussions engage with the bot's post.
 */
export async function recordFeedbackMemory(pool, { botId, postId, feedbackSummary, commenterPenName, commentContent }) {
  if (!botId || (!feedbackSummary && !commentContent)) return null;

  const subject = `Reader Engagement on Post ${postId ? postId.slice(0, 8) : 'Story'}`;
  const authorRef = commenterPenName ? `@${commenterPenName}` : 'A community reader';
  const content = `${authorRef} commented: "${commentContent || feedbackSummary}". Key takeaway: ${feedbackSummary || 'Valuable community reaction.'}`;

  const res = await pool.query(`
    insert into public.bot_memories (
      bot_id, memory_type, subject, content, importance_score, target_post_id, created_at, updated_at
    ) values ($1, 'reader_feedback', $2, $3, 0.75, $4, now(), now())
    returning *
  `, [botId, subject, content, postId || null]);

  return res.rows[0];
}

/**
 * Record a cross-author interaction (debate, citation, intellectual alignment).
 */
export async function recordCrossAuthorMemory(pool, { sourceBotId, targetBotId, postId, topic, stance = 'agreement' }) {
  if (!sourceBotId || !targetBotId) return null;

  const subject = `Literary Discussion with ${targetBotId}`;
  const content = `Engaged with fellow author ${targetBotId} on topic "${topic || 'craft'}". Stance: ${stance}.`;

  const res = await pool.query(`
    insert into public.bot_memories (
      bot_id, memory_type, subject, content, importance_score, target_post_id, target_user_id, created_at, updated_at
    ) values ($1, 'cross_author_interaction', $2, $3, 0.85, $4, $5, now(), now())
    returning *
  `, [sourceBotId, subject, content, postId || null, targetBotId]);

  return res.rows[0];
}

/**
 * Retrieve active episodic memories for a bot, ordered by importance and recency.
 */
export async function getBotMemories(pool, botId, { limit = 5, minImportance = 0.50, memoryType = null } = {}) {
  if (!botId) return [];

  const res = await pool.query(`
    select id, memory_type as "memoryType", subject, content, importance_score as "importanceScore",
           target_post_id as "targetPostId", created_at as "createdAt"
    from public.bot_memories
    where bot_id = $1
      and importance_score >= $2
      and ($3::text is null or memory_type = $3)
    order by importance_score desc, created_at desc
    limit $4
  `, [botId, minImportance, memoryType, limit]);

  return res.rows;
}

/**
 * Format retrieved memories for injection into Gemini Spark / LLM prompt context.
 */
export function formatMemoriesForPrompt(memories = []) {
  if (!memories || memories.length === 0) return '';

  const lines = [
    '### PAST LITERARY MEMORIES & NARRATIVE CONTINUITY (What you remember from your past writing & community):'
  ];

  for (const m of memories) {
    if (m.memoryType === 'story_arc') {
      lines.push(`• [Past Story]: ${m.content}`);
    } else if (m.memoryType === 'reader_feedback') {
      lines.push(`• [Reader Feedback]: ${m.content}`);
    } else if (m.memoryType === 'cross_author_interaction') {
      lines.push(`• [Fellow Author]: ${m.content}`);
    } else {
      lines.push(`• [Memory]: ${m.content}`);
    }
  }

  lines.push('\nDirective: You may organically reference, build upon, or subtly continue themes/characters from your past memories if fitting. Never force references if unnatural.');
  return lines.join('\n');
}

/**
 * Update the social affinity score between a bot and another writer/reader.
 */
export async function updateAffinity(pool, sourceBotId, targetProfileId, interactionType = 'applaud', delta = 0.05) {
  if (!sourceBotId || !targetProfileId || sourceBotId === targetProfileId) return null;

  const res = await pool.query(`
    insert into public.bot_affinity_graph (
      source_bot_id, target_profile_id, affinity_score, interaction_count, last_interaction_type, last_interacted_at
    ) values ($1, $2, least(1.000, 0.100 + $3::numeric), 1, $4, now())
    on conflict (source_bot_id, target_profile_id) do update set
      affinity_score = least(1.000, public.bot_affinity_graph.affinity_score + $3::numeric),
      interaction_count = public.bot_affinity_graph.interaction_count + 1,
      last_interaction_type = $4,
      last_interacted_at = now()
    returning *
  `, [sourceBotId, targetProfileId, delta, interactionType]);

  return res.rows[0];
}

/**
 * Get top closest peers/readers for a bot based on affinity score.
 */
export async function getBotAffinityNetwork(pool, botId, { limit = 8 } = {}) {
  if (!botId) return [];

  const res = await pool.query(`
    select g.target_profile_id as "targetProfileId", g.affinity_score as "affinityScore",
           g.interaction_count as "interactionCount", g.last_interaction_type as "lastInteractionType",
           g.last_interacted_at as "lastInteractedAt",
           p.full_name as "fullName", p.pen_name as "penName", p.avatar_url as "avatarUrl"
    from public.bot_affinity_graph g
    inner join public.profiles p on p.id = g.target_profile_id
    where g.source_bot_id = $1
    order by g.affinity_score desc, g.last_interacted_at desc
    limit $2
  `, [botId, limit]);

  return res.rows;
}

/**
 * Autonomous Reflection Cycle:
 * Analyzes a bot's recent publications, comments received, and engagement metrics,
 * and consolidates these insights into permanent memories.
 */
export async function runBotReflectionCycle(pool, botId) {
  if (!botId) return { success: false, reason: 'Missing botId' };

  // 1. Fetch bot's latest 3 published posts and their comments
  const postsRes = await pool.query(`
    select p.id, p.title, p.category, p.likes_count as "likesCount", p.comments_count as "commentsCount",
           coalesce(p.published_at, p.created_at) as "publishedAt"
    from public.posts p
    where p.author_id = $1 and p.status = 'published'
    order by coalesce(p.published_at, p.created_at) desc
    limit 3
  `, [botId]);

  if (postsRes.rowCount === 0) {
    return { success: true, botId, reflectionsAdded: 0, message: 'No published posts to reflect upon.' };
  }

  let reflectionsCount = 0;

  for (const post of postsRes.rows) {
    // Check if we already reflected on this post
    const existingRef = await pool.query(`
      select id from public.bot_memories
      where bot_id = $1 and target_post_id = $2 and memory_type = 'philosophical_reflection'
      limit 1
    `, [botId, post.id]);

    if (existingRef.rowCount === 0 && (post.likesCount > 5 || post.commentsCount > 0)) {
      // Fetch sample comments on this post
      const commentsRes = await pool.query(`
        select c.content, a.full_name as author
        from public.comments c
        inner join public.profiles a on a.id = c.author_id
        where c.post_id = $1
        order by c.created_at desc
        limit 2
      `, [post.id]);

      const commentSnippets = commentsRes.rows.map(r => `"${r.content}"`).join(' and ');
      const reflectionContent = `My story "${post.title}" [${post.category}] resonated with ${post.likesCount} readers.${commentSnippets ? ` Key reader reflections: ${commentSnippets}.` : ''} Takeaway: Continue exploring nuanced perspectives in this realm.`;

      await pool.query(`
        insert into public.bot_memories (
          bot_id, memory_type, subject, content, importance_score, target_post_id, created_at, updated_at
        ) values ($1, 'philosophical_reflection', $2, $3, 0.80, $4, now(), now())
      `, [botId, `Reflection on "${post.title}"`, reflectionContent, post.id]);

      reflectionsCount++;
    }
  }

  return {
    success: true,
    botId,
    reflectionsAdded: reflectionsCount
  };
}
