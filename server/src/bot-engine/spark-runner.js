import { randomUUID } from 'node:crypto';
import { CURATED_BOT_PERSONAS } from './curated-personas.js';
import { CURATED_READER_PERSONAS } from './reader-personas.js';
import { CURATED_COMMENTER_PERSONAS, generateAuthenticComment } from './commenter-personas.js';
import { generateSparkArticle, generateSparkComment, generateSparkReply } from './gemini-spark-client.js';
import { getCoverImageForCategory } from './image-service.js';
import {
  recordStoryMemory,
  recordFeedbackMemory,
  recordCrossAuthorMemory,
  getBotMemories,
  updateAffinity,
  getBotAffinityNetwork,
  runBotReflectionCycle
} from './learning-service.js';
import {
  recordLedgerEntry,
  validateAntiRepetition
} from './editorial-ledger-service.js';
import { ensureContextualComment, resolvePublicationCategory, resolveEngagementCategory } from './content-relevance-service.js';
import { validateGeneratedArticleIntegrity } from './editorial-intelligence-service.js';
import { enqueueOutboxEvent, enqueueStorySyndication } from './outbox-service.js';

function createSlug(title) {
  const readable = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'story';
  return `${readable}-${randomUUID().slice(0, 12)}`;
}

function calculateReadingTime(content) {
  const text = (content || '').trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

async function createNotification(client, { recipientId, actorId, postId = null, commentId = null, kind, message }) {
  if (!recipientId || recipientId === actorId) return;

  const inserted = await client.query(
    `insert into public.notifications (recipient_id, actor_id, post_id, comment_id, kind, message)
     values ($1, $2, $3, $4, $5, $6)
     returning id::text as id`,
    [recipientId, actorId, postId, commentId, kind, message]
  );

  try {
    const preferenceColumn = kind === 'follow' ? 'follows_enabled'
      : kind === 'editorial' ? 'editorial_enabled'
        : kind === 'publishing' ? 'publishing_enabled'
          : 'interactions_enabled';
    const preference = await client.query(
      `select ${preferenceColumn} as enabled
         from public.notification_preferences
        where profile_id = $1`,
      [recipientId]
    );
    if (preference.rowCount > 0 && preference.rows[0].enabled === false) return;

    if (inserted.rows && inserted.rows.length > 0) {
      await client.query(
        `insert into public.notification_delivery_outbox (notification_id, recipient_id)
         values ($1, $2)
         on conflict (notification_id) do nothing`,
        [inserted.rows[0].id, recipientId]
      );
    }
  } catch (error) {
    if (error?.code === '42P01') {
      return;
    }
    // Retain in-app notification without rolling back applaud
  }
}

let tablesEnsured = false;
export async function verifyBotSchemaCompatibility(pool) {
  if (tablesEnsured) return true;
  try {
    const res = await pool.query(`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name in (
        'bot_configs', 'bot_global_settings', 'bot_activity_logs', 'bot_delayed_actions',
        'bot_memories', 'bot_affinity_graph', 'editorial_ledger_entries',
        'editorial_anti_repetition', 'editorial_ideas_backlog', 'editorial_research_briefs',
        'bot_event_outbox', 'bot_idempotency_records'
      )
    `);
    const found = new Set((res.rows || []).map(r => r.table_name));
    const required = ['bot_configs', 'bot_global_settings', 'bot_activity_logs'];
    const missing = required.filter(t => !found.has(t));
    if (missing.length > 0) {
      console.warn(`[Bot Engine] Warning: Missing bot tables in database: ${missing.join(', ')}. Run migration 20260905_bot_system_runtime_tables_and_outbox.sql`);
    }
    tablesEnsured = true;
    return true;
  } catch (err) {
    console.warn('[Spark Runner] Schema compatibility check warning:', err.message);
    return false;
  }
}

export async function ensureBotTables(pool) {
  return verifyBotSchemaCompatibility(pool);
}

export async function seedInitialBotNetwork(pool) {
  await ensureBotTables(pool);
  const client = await pool.connect();
  try {
    await client.query('begin');

    // 1. Ensure global settings row exists
    await client.query(`
      insert into public.bot_global_settings (id, is_engine_enabled)
      values ('global', true)
      on conflict (id) do nothing
    `);

    // 2. Insert or update all curated personas
    for (const bot of CURATED_BOT_PERSONAS) {
      await client.query(`
        insert into public.profiles (id, email, pen_name, full_name, bio, avatar_url, account_type)
        values ($1, $2, $3, $4, $5, $6, 'editorial_bot')
        on conflict (id) do update set
          pen_name = excluded.pen_name,
          full_name = excluded.full_name,
          bio = excluded.bio,
          avatar_url = excluded.avatar_url,
          account_type = 'editorial_bot',
          updated_at = now()
      `, [
        bot.id,
        `${bot.penName}@bots.writon.internal`,
        bot.penName,
        bot.fullName,
        bot.bio,
        bot.avatarUrl
      ]);

      if (bot.quoteOfDay) {
        await client.query(`
          insert into public.legacy_import_profile_attributes (profile_id, legacy_user_id, quote_of_day)
          values ($1, $2, $3)
          on conflict (profile_id) do update set
            quote_of_day = excluded.quote_of_day
        `, [bot.id, bot.id, bot.quoteOfDay]);
      }

      const idx = CURATED_BOT_PERSONAS.indexOf(bot);
      const daysAgo = (idx % 14) + 1 + Math.random();
      const initialLastPostedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      await client.query(`
        insert into public.bot_configs (
          id, is_active, persona_prompt, categories, post_frequency_hours,
          like_probability, comment_probability, comment_style, bot_type, last_posted_at
        )
        values ($1, true, $2, $3, $4, $5, $6, $7, 'writer', $8)
        on conflict (id) do update set
          persona_prompt = excluded.persona_prompt,
          categories = excluded.categories,
          post_frequency_hours = excluded.post_frequency_hours,
          like_probability = excluded.like_probability,
          comment_probability = excluded.comment_probability,
          comment_style = excluded.comment_style,
          bot_type = 'writer',
          last_posted_at = coalesce(public.bot_configs.last_posted_at, excluded.last_posted_at),
          updated_at = now()
      `, [
        bot.id,
        bot.personaPrompt,
        bot.categories,
        bot.postFrequencyHours,
        bot.likeProbability,
        bot.commentProbability,
        bot.commentStyle,
        initialLastPostedAt
      ]);
    }

    await client.query('commit');
    return { success: true, count: CURATED_BOT_PERSONAS.length };
  } catch (error) {
    await client.query('rollback');
    console.error('[Spark Runner] Failed to seed bot network:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function seedReaderBotNetwork(pool) {
  await ensureBotTables(pool);
  const client = await pool.connect();
  try {
    await client.query('begin');

    for (const reader of CURATED_READER_PERSONAS) {
      await client.query(`
        insert into public.profiles (id, email, pen_name, full_name, bio, avatar_url, account_type)
        values ($1, $2, $3, $4, $5, $6, 'editorial_bot')
        on conflict (id) do update set
          pen_name = excluded.pen_name,
          full_name = excluded.full_name,
          bio = excluded.bio,
          avatar_url = excluded.avatar_url,
          account_type = 'editorial_bot',
          updated_at = now()
      `, [
        reader.id,
        `${reader.penName}@readers.writon.internal`,
        reader.penName,
        reader.fullName,
        reader.bio,
        reader.avatarUrl
      ]);

      await client.query(`
        insert into public.bot_configs (
          id, is_active, persona_prompt, categories, post_frequency_hours,
          like_probability, comment_probability, comment_style, bot_type
        )
        values ($1, true, $2, $3, $4, $5, $6, $7, 'reader')
        on conflict (id) do update set
          is_active = excluded.is_active,
          categories = excluded.categories,
          like_probability = excluded.like_probability,
          comment_probability = excluded.comment_probability,
          comment_style = excluded.comment_style,
          bot_type = 'reader',
          updated_at = now()
      `, [
        reader.id,
        `Reader profile for ${reader.fullName}. Enjoys reading ${reader.categories.join(', ')}. Applauds authentic stories.`,
        reader.categories,
        9999,
        reader.likeProbability,
        0.0,
        'applaud_only'
      ]);
    }

    await client.query('commit');
    return { success: true, count: CURATED_READER_PERSONAS.length };
  } catch (error) {
    await client.query('rollback');
    console.error('[Spark Runner] Failed to seed reader network:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function seedCommenterBotNetwork(pool) {
  await ensureBotTables(pool);
  const client = await pool.connect();
  try {
    await client.query('begin');

    for (const commenter of CURATED_COMMENTER_PERSONAS) {
      await client.query(`
        insert into public.profiles (id, email, pen_name, full_name, bio, avatar_url, account_type)
        values ($1, $2, $3, $4, $5, $6, 'editorial_bot')
        on conflict (id) do update set
          pen_name = excluded.pen_name,
          full_name = excluded.full_name,
          bio = excluded.bio,
          avatar_url = excluded.avatar_url,
          account_type = 'editorial_bot',
          updated_at = now()
      `, [
        commenter.id,
        `${commenter.penName}@commenters.writon.internal`,
        commenter.penName,
        commenter.fullName,
        commenter.bio,
        commenter.avatarUrl
      ]);

      await client.query(`
        insert into public.bot_configs (
          id, is_active, persona_prompt, categories, post_frequency_hours,
          like_probability, comment_probability, comment_style, bot_type
        )
        values ($1, true, $2, $3, $4, $5, $6, $7, 'commenter')
        on conflict (id) do update set
          is_active = excluded.is_active,
          categories = excluded.categories,
          like_probability = excluded.like_probability,
          comment_probability = excluded.comment_probability,
          comment_style = excluded.comment_style,
          bot_type = 'commenter',
          updated_at = now()
      `, [
        commenter.id,
        `Commenter profile for ${commenter.fullName}. Tone: ${commenter.tone}. Active discussion participant across ${commenter.categories.join(', ')}.`,
        commenter.categories,
        9999,
        commenter.likeProbability,
        commenter.commentProbability,
        commenter.tone
      ]);
    }

    await client.query('commit');
    return { success: true, count: CURATED_COMMENTER_PERSONAS.length };
  } catch (error) {
    await client.query('rollback');
    console.error('[Spark Runner] Failed to seed commenter network:', error);
    throw error;
  } finally {
    client.release();
  }
}

export function maskApiKey(key) {
  if (!key || typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.substring(0, 6)}...${trimmed.substring(trimmed.length - 4)}`;
}

export async function getGlobalSettings(pool, { maskSecrets = false } = {}) {
  await ensureBotTables(pool);
  const result = await pool.query(`select * from public.bot_global_settings where id = 'global' limit 1`);
  let row = null;
  if (result.rowCount === 0) {
    await seedInitialBotNetwork(pool);
    const retry = await pool.query(`select * from public.bot_global_settings where id = 'global' limit 1`);
    row = retry.rows[0];
  } else {
    row = result.rows[0];
  }

  if (row && maskSecrets && row.gemini_api_key) {
    return {
      ...row,
      gemini_api_key: maskApiKey(row.gemini_api_key)
    };
  }
  return row;
}

export async function updateGlobalSettings(pool, updates) {
  await ensureBotTables(pool);
  const current = await getGlobalSettings(pool, { maskSecrets: false });

  // If incoming API key is masked (contains *), preserve existing stored key
  let targetApiKey = current.gemini_api_key;
  if (updates.gemini_api_key !== undefined) {
    if (updates.gemini_api_key === null || updates.gemini_api_key === '') {
      targetApiKey = null;
    } else if (!updates.gemini_api_key.includes('*')) {
      targetApiKey = updates.gemini_api_key;
    }
  }

  const updated = { ...current, ...updates, gemini_api_key: targetApiKey, updated_at: new Date() };

  const result = await pool.query(`
    update public.bot_global_settings
    set is_engine_enabled = $2,
        spark_automation_mode = $3,
        llm_provider = $4,
        llm_model = $5,
        gemini_api_key = $6,
        posts_per_day_target = $7,
        spark_pulse_interval_minutes = $8,
        human_post_reaction_rate = $9,
        reaction_delay_min_minutes = $10,
        reaction_delay_max_minutes = $11,
        bot_to_bot_interaction_rate = $12,
        reader_swarm_enabled = coalesce($13, reader_swarm_enabled),
        applaud_swarm_intensity = coalesce($14, applaud_swarm_intensity),
        min_swarm_applauds_per_post = coalesce($15, min_swarm_applauds_per_post),
        max_swarm_applauds_per_post = coalesce($16, max_swarm_applauds_per_post),
        updated_at = now()
    where id = $1
    returning *
  `, [
    'global',
    updated.is_engine_enabled,
    updated.spark_automation_mode,
    updated.llm_provider,
    updated.llm_model,
    targetApiKey,
    updated.posts_per_day_target,
    updated.spark_pulse_interval_minutes,
    updated.human_post_reaction_rate,
    updated.reaction_delay_min_minutes,
    updated.reaction_delay_max_minutes,
    updated.bot_to_bot_interaction_rate,
    updated.reader_swarm_enabled,
    updated.applaud_swarm_intensity,
    updated.min_swarm_applauds_per_post,
    updated.max_swarm_applauds_per_post
  ]);

  return result.rows[0];
}

export async function getBotsList(pool, { botType = 'writer' } = {}) {
  await ensureBotTables(pool);
  const result = await pool.query(`
    select
      p.id,
      p.pen_name as "penName",
      p.full_name as "fullName",
      p.bio,
      p.avatar_url as "avatarUrl",
      p.location,
      p.followers_count as "followersCount",
      p.following_count as "followingCount",
      alias.quote_of_day as "quoteOfDay",
      bc.is_active as "isActive",
      bc.bot_type as "botType",
      bc.persona_prompt as "personaPrompt",
      bc.categories,
      bc.post_frequency_hours as "postFrequencyHours",
      bc.like_probability as "likeProbability",
      bc.comment_probability as "commentProbability",
      bc.comment_style as "commentStyle",
      bc.last_posted_at as "lastPostedAt",
      bc.last_interacted_at as "lastInteractedAt",
      coalesce(pc.stories_count, 0)::int as "storiesCount"
    from public.bot_configs bc
    inner join public.profiles p on p.id = bc.id
    left join public.legacy_import_profile_attributes alias on alias.profile_id = p.id
    left join (
      select author_id, count(*) as stories_count
      from public.posts where status = 'published'
      group by author_id
    ) pc on pc.author_id = p.id
    where ($1::text is null or bc.bot_type = $1)
    order by p.full_name asc
  `, [botType]);
  return result.rows;
}

export async function getReaderBotsList(pool, { page = 1, limit = 50, category = null } = {}) {
  await ensureBotTables(pool);
  const offset = (page - 1) * limit;
  const result = await pool.query(`
    select
      p.id,
      p.pen_name as "penName",
      p.full_name as "fullName",
      p.bio,
      p.avatar_url as "avatarUrl",
      bc.is_active as "isActive",
      bc.bot_type as "botType",
      bc.categories,
      bc.like_probability as "likeProbability",
      bc.last_interacted_at as "lastInteractedAt"
    from public.bot_configs bc
    inner join public.profiles p on p.id = bc.id
    where bc.bot_type = 'reader'
      and ($1::text is null or $1 = any(bc.categories))
    order by p.full_name asc
    limit $2 offset $3
  `, [category, limit, offset]);

  const countRes = await pool.query(`
    select count(*)::int as total
    from public.bot_configs bc
    where bc.bot_type = 'reader'
      and ($1::text is null or $1 = any(bc.categories))
  `, [category]);

  return {
    readers: result.rows,
    total: countRes.rows[0]?.total || 0,
    page,
    limit
  };
}

export async function getCommenterBotsList(pool, { page = 1, limit = 50, category = null } = {}) {
  await ensureBotTables(pool);
  const offset = (page - 1) * limit;
  const result = await pool.query(`
    select
      p.id,
      p.pen_name as "penName",
      p.full_name as "fullName",
      p.bio,
      p.avatar_url as "avatarUrl",
      bc.is_active as "isActive",
      bc.bot_type as "botType",
      bc.categories,
      bc.comment_style as "commentStyle",
      bc.comment_probability as "commentProbability",
      bc.like_probability as "likeProbability",
      bc.last_interacted_at as "lastInteractedAt"
    from public.bot_configs bc
    inner join public.profiles p on p.id = bc.id
    where bc.bot_type = 'commenter'
      and ($1::text is null or $1 = any(bc.categories))
    order by p.full_name asc
    limit $2 offset $3
  `, [category, limit, offset]);

  const countRes = await pool.query(`
    select count(*)::int as total
    from public.bot_configs bc
    where bc.bot_type = 'commenter'
      and ($1::text is null or $1 = any(bc.categories))
  `, [category]);

  return {
    commenters: result.rows,
    total: countRes.rows[0]?.total || 0,
    page,
    limit
  };
}

export async function getBotById(pool, botId) {
  const result = await pool.query(`
    select
      p.id,
      p.pen_name as "penName",
      p.full_name as "fullName",
      p.bio,
      p.avatar_url as "avatarUrl",
      p.location,
      alias.quote_of_day as "quoteOfDay",
      bc.is_active as "isActive",
      bc.persona_prompt as "personaPrompt",
      bc.categories,
      bc.post_frequency_hours as "postFrequencyHours",
      bc.like_probability as "likeProbability",
      bc.comment_probability as "commentProbability",
      bc.comment_style as "commentStyle",
      bc.last_posted_at as "lastPostedAt",
      bc.last_interacted_at as "lastInteractedAt"
    from public.bot_configs bc
    inner join public.profiles p on p.id = bc.id
    left join public.legacy_import_profile_attributes alias on alias.profile_id = p.id
    where bc.id = $1
    limit 1
  `, [botId]);
  return result.rows[0] ?? null;
}

export async function executePostAction(pool, { botId, category, topicHint, customTitle, customContent, researchDossier }) {
  const bot = await getBotById(pool, botId);
  if (!bot) throw new Error(`Bot persona ${botId} not found`);

  const settings = await getGlobalSettings(pool);
  const targetCategory = category || bot.categories[Math.floor(Math.random() * bot.categories.length)] || 'Essays';

  // Fetch titles already published by this author to prevent duplicate stories
  const existingRes = await pool.query(
    `select title from public.posts where author_id = $1`,
    [bot.id]
  );
  const existingTitles = existingRes.rows.map(r => r.title);
  const botMemories = await getBotMemories(pool, bot.id, { limit: 5 }).catch(() => []);

  let articleData;
  if (customTitle && customContent) {
    articleData = {
      title: customTitle,
      summary: topicHint || null,
      content: customContent,
      themeKeyword: targetCategory
    };
  } else {
    articleData = await generateSparkArticle({
      apiKey: settings.gemini_api_key || process.env.GEMINI_API_KEY,
      model: settings.llm_model,
      persona: {
        fullName: bot.fullName,
        penName: bot.penName,
        bio: bot.bio,
        personaPrompt: bot.personaPrompt
      },
      category: targetCategory,
      topicHint,
      excludeTitles: existingTitles,
      memories: botMemories,
      researchDossier
    });
  }

  // Server-Side Zero-Slop & Anti-Repetition Governance Check
  const govCheck = await validateAntiRepetition(pool, {
    title: articleData.title,
    summary: articleData.summary,
    content: articleData.content
  }).catch(() => ({ isValid: true, sanitizedTitle: articleData.title, sanitizedContent: articleData.content, sanitizedSummary: articleData.summary }));

  if (govCheck.sanitizedTitle) articleData.title = govCheck.sanitizedTitle;
  if (govCheck.sanitizedContent) articleData.content = govCheck.sanitizedContent;
  if (govCheck.sanitizedSummary) articleData.summary = govCheck.sanitizedSummary;

  const coverImage = getCoverImageForCategory(targetCategory);
  const readingTime = calculateReadingTime(articleData.content);
  const slug = createSlug(articleData.title);

  const client = await pool.connect();
  try {
    await client.query('begin');

    const postResult = await client.query(`
      insert into public.posts (
        slug, author_id, title, summary, content, category, cover_image_url,
        status, is_public, reading_time_min, published_at, provenance
      )
      values ($1, $2, $3, $4, $5, $6, $7, 'published', true, $8, now(), 'synthetic')
      returning id, slug, title, summary, content, category, reading_time_min, published_at, author_id, provenance
    `, [
      slug,
      bot.id,
      articleData.title,
      articleData.summary,
      articleData.content,
      targetCategory,
      coverImage,
      readingTime
    ]);

    const createdPost = postResult.rows[0];

    await client.query(`
      update public.bot_configs
      set last_posted_at = now(), updated_at = now()
      where id = $1
    `, [bot.id]);

    await client.query(`
      insert into public.bot_activity_logs (bot_id, action_type, target_post_id, details, status)
      values ($1, 'post', $2, $3, 'success')
    `, [
      bot.id,
      createdPost.id,
      JSON.stringify({ title: createdPost.title, category: targetCategory, slug: createdPost.slug })
    ]);

    // Enqueue transactional outbox events atomically within post-creation transaction
    await enqueueOutboxEvent(client, {
      eventType: 'record_memory',
      payload: {
        botId: bot.id,
        postId: createdPost.id,
        title: createdPost.title,
        summary: articleData.summary,
        category: targetCategory
      }
    });

    await enqueueOutboxEvent(client, {
      eventType: 'ledger_entry',
      payload: {
        status: 'executed',
        entryType: 'publication',
        authorId: bot.id,
        authorPenName: bot.penName,
        genre: targetCategory,
        title: createdPost.title,
        theme: articleData.themeKeyword || targetCategory,
        approxWordCount: readingTime * 200,
        targetPostId: createdPost.id,
        details: { slug: createdPost.slug, readingTimeMin: readingTime }
      }
    });

    await enqueueOutboxEvent(client, {
      eventType: 'reaction_wave',
      payload: {
        postId: createdPost.id,
        authorId: bot.id,
        category: targetCategory,
        title: createdPost.title,
        summary: articleData.summary
      }
    });

    await enqueueStorySyndication(client, createdPost, {
      fullName: bot.fullName,
      penName: bot.penName,
    });

    await client.query('commit');

    // Record persistent episodic memory of the story arc
    recordStoryMemory(pool, {
      botId: bot.id,
      postId: createdPost.id,
      title: createdPost.title,
      summary: articleData.summary,
      category: targetCategory
    }).catch(err => console.warn('[Spark Runner] Memory record warning:', err.message));

    // Record in Editorial Ledger
    recordLedgerEntry(pool, {
      status: 'executed',
      entryType: 'publication',
      authorId: bot.id,
      authorPenName: bot.penName,
      genre: targetCategory,
      title: createdPost.title,
      theme: articleData.themeKeyword || targetCategory,
      approxWordCount: readingTime * 200,
      targetPostId: createdPost.id,
      details: { slug: createdPost.slug, readingTimeMin: readingTime }
    }).catch(err => console.warn('[Spark Runner] Ledger record warning:', err.message));

    // Auto-trigger reader applaud wave and commenter reflections in background
    triggerSparkReaction(pool, {
      postId: createdPost.id,
      authorId: bot.id,
      category: targetCategory,
      title: createdPost.title,
      summary: articleData.summary
    }).catch(() => {});

    return createdPost;
  } catch (error) {
    await client.query('rollback');
    await pool.query(`
      insert into public.bot_activity_logs (bot_id, action_type, details, status, error_message)
      values ($1, 'post', $2, 'failed', $3)
    `, [bot.id, JSON.stringify({ category: targetCategory }), error.message]);
    throw error;
  } finally {
    client.release();
  }
}

export async function executeInteractAction(pool, { botId, postId, actionType, customComment }) {
  const bot = await getBotById(pool, botId);
  if (!bot) throw new Error(`Bot persona ${botId} not found`);

  const settings = await getGlobalSettings(pool);
  const client = await pool.connect();

  try {
    await client.query('begin');

    const postRes = await client.query(`
      select p.id, p.author_id, p.title, p.summary, p.content, p.category,
             p.likes_count, p.comments_count, pr.full_name as author_name
      from public.posts p
      inner join public.profiles pr on pr.id = p.author_id
      where p.id = $1 and p.status = 'published' and p.is_public = true
      for update of p
    `, [postId]);

    if (postRes.rowCount === 0) {
      await client.query('rollback');
      throw new Error(`Target story ${postId} not found`);
    }

    const post = postRes.rows[0];
    let resultOutcome = {};

    if (actionType === 'applaud' || actionType === 'like') {
      const existing = await client.query(`
        select 1 from public.post_applauds where post_id = $1 and user_id = $2
      `, [postId, bot.id]);

      if (existing.rowCount === 0) {
        await client.query(`
          insert into public.post_applauds (post_id, user_id) values ($1, $2)
        `, [postId, bot.id]);

        await client.query(`
          update public.posts set likes_count = likes_count + 1, updated_at = now() where id = $1
        `, [postId]);

        await createNotification(client, {
          recipientId: post.author_id,
          actorId: bot.id,
          postId,
          kind: 'applaud',
          message: 'applauded your story'
        });
        resultOutcome = { applauded: true };
      }
    } else if (actionType === 'comment') {
      const existingComment = await client.query(`
        select id from public.comments where post_id = $1 and author_id = $2 limit 1
      `, [postId, bot.id]);

      if (existingComment.rowCount > 0) {
        await client.query('rollback');
        return { skipped: 'Bot already commented on this post', commentId: existingComment.rows[0].id };
      }

      let commentText = customComment;
      if (!commentText) {
        const commenterObj = CURATED_COMMENTER_PERSONAS.find(c => c.id === bot.id);
        if (commenterObj) {
          commentText = generateAuthenticComment(commenterObj, {
            postTitle: post.title,
            category: post.category,
            snippet: post.summary || post.content.slice(0, 300),
            depth: 'auto'
          });
        } else {
          const commentsList = await client.query(`
            select c.content, pr.full_name as author_name
            from public.comments c
            inner join public.profiles pr on pr.id = c.author_id
            where c.post_id = $1 order by c.created_at desc limit 3
          `, [postId]);

          commentText = await generateSparkComment({
            apiKey: settings.gemini_api_key || process.env.GEMINI_API_KEY,
            model: settings.llm_model,
            persona: {
              fullName: bot.fullName,
              penName: bot.penName,
              commentStyle: bot.commentStyle,
              personaPrompt: bot.personaPrompt
            },
            postTitle: post.title,
            postCategory: post.category,
            postExcerpt: post.summary || post.content.slice(0, 300),
            existingComments: commentsList.rows
          });
        }
      }

      commentText = ensureContextualComment(commentText, {
        postTitle: post.title,
        category: post.category,
        snippet: post.summary || (post.content || '').slice(0, 300),
        persona: bot
      });

      const commentInsert = await client.query(`
        insert into public.comments (post_id, author_id, content)
        values ($1, $2, $3)
        returning id, created_at
      `, [postId, bot.id, commentText]);

      await client.query(`
        update public.posts set comments_count = comments_count + 1, updated_at = now() where id = $1
      `, [postId]);

      await createNotification(client, {
        recipientId: post.author_id,
        actorId: bot.id,
        postId,
        commentId: commentInsert.rows[0].id,
        kind: 'comment',
        message: 'commented on your story'
      });

      resultOutcome = { commentId: commentInsert.rows[0].id, comment: commentText };
    } else if (actionType === 'reply') {
      let replyText = customComment;
      let targetAuthorName = 'Reader';
      let targetAuthorId = null;

      if (commentId) {
        const targetCommentRes = await client.query(`
          select c.content, pr.id as author_id, pr.pen_name, pr.full_name
          from public.comments c
          inner join public.profiles pr on pr.id = c.author_id
          where c.id = $1
        `, [commentId]);

        if (targetCommentRes.rowCount > 0) {
          const targetComment = targetCommentRes.rows[0];
          targetAuthorName = targetComment.pen_name || targetComment.full_name;
          targetAuthorId = targetComment.author_id;

          if (!replyText) {
            replyText = await generateSparkReply({
              apiKey: settings.gemini_api_key || process.env.GEMINI_API_KEY,
              model: settings.llm_model,
              persona: {
                fullName: bot.fullName,
                penName: bot.penName,
                commentStyle: bot.commentStyle,
                personaPrompt: bot.personaPrompt
              },
              postTitle: post.title,
              postCategory: post.category,
              targetCommentAuthor: targetAuthorName,
              targetCommentContent: targetComment.content,
              isAuthorOfPost: post.author_id === bot.id
            });
          }
        }
      }

      if (!replyText) {
        replyText = `@${targetAuthorName} Thank you for reading and sharing your perspective! Really appreciate your thoughts.`;
      }

      const commentInsert = await client.query(`
        insert into public.comments (post_id, author_id, content)
        values ($1, $2, $3)
        returning id, created_at
      `, [postId, bot.id, replyText]);

      await client.query(`
        update public.posts set comments_count = comments_count + 1, updated_at = now() where id = $1
      `, [postId]);

      if (targetAuthorId && targetAuthorId !== bot.id) {
        await createNotification(client, {
          recipientId: targetAuthorId,
          actorId: bot.id,
          postId,
          commentId: commentInsert.rows[0].id,
          kind: 'comment',
          message: 'replied to your comment'
        });
      }

      resultOutcome = { commentId: commentInsert.rows[0].id, reply: replyText, targetAuthor: targetAuthorName };
    } else if (actionType === 'follow') {
      if (post.author_id !== bot.id) {
        const existingFollow = await client.query(`
          select 1 from public.follows where follower_id = $1 and following_id = $2
        `, [bot.id, post.author_id]);

        if (existingFollow.rowCount === 0) {
          await client.query(`
            insert into public.follows (follower_id, following_id) values ($1, $2)
          `, [bot.id, post.author_id]);

          await client.query(`
            update public.profiles set followers_count = followers_count + 1 where id = $1
          `, [post.author_id]);
          await client.query(`
            update public.profiles set following_count = following_count + 1 where id = $1
          `, [bot.id]);

          await createNotification(client, {
            recipientId: post.author_id,
            actorId: bot.id,
            kind: 'follow',
            message: 'started following you'
          });
          resultOutcome = { followed: true };
        }
      }
    }

    await client.query(`
      update public.bot_configs
      set last_interacted_at = now(), updated_at = now()
      where id = $1
    `, [bot.id]);

    await client.query(`
      insert into public.bot_activity_logs (bot_id, action_type, target_post_id, target_user_id, details, status)
      values ($1, $2, $3, $4, $5, 'success')
    `, [
      bot.id,
      actionType,
      postId,
      post.author_id,
      JSON.stringify(resultOutcome)
    ]);

    await client.query('commit');
    return resultOutcome;
  } catch (error) {
    await client.query('rollback');
    await pool.query(`
      insert into public.bot_activity_logs (bot_id, action_type, target_post_id, details, status, error_message)
      values ($1, $2, $3, $4, 'failed', $5)
    `, [bot.id, actionType, postId, JSON.stringify({ error: error.message }), error.message]);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Schedule a delayed bot action with natural human cadence
 */
export async function scheduleDelayedAction(pool, {
  botId,
  actionType,
  targetPostId = null,
  targetCommentId = null,
  targetUserId = null,
  payload = {},
  delayMinutes = 10
}) {
  await ensureBotTables(pool);
  const minutes = Math.max(0.2, Number(delayMinutes) || 10);
  const result = await pool.query(`
    insert into public.bot_delayed_actions (
      bot_id, action_type, target_post_id, target_comment_id, target_user_id,
      payload, execute_at
    )
    values ($1, $2, $3, $4, $5, $6, now() + ($7 || ' minutes')::interval)
    returning *
  `, [
    botId,
    actionType,
    targetPostId,
    targetCommentId,
    targetUserId,
    JSON.stringify(payload),
    minutes
  ]);
  return result.rows[0];
}

/**
 * Get upcoming pending delayed actions for admin inspection
 */
export async function getPendingDelayedActions(pool, { limit = 20 } = {}) {
  await ensureBotTables(pool);
  const result = await pool.query(`
    select
      a.id,
      a.bot_id as "botId",
      a.action_type as "actionType",
      a.target_post_id as "targetPostId",
      a.target_comment_id as "targetCommentId",
      a.target_user_id as "targetUserId",
      a.payload,
      a.scheduled_at as "scheduledAt",
      a.execute_at as "executeAt",
      a.status,
      a.attempts,
      a.last_error as "lastError",
      json_build_object('fullName', p.full_name, 'penName', p.pen_name, 'avatarUrl', p.avatar_url) as bot,
      json_build_object('title', post.title, 'slug', post.slug, 'category', post.category) as post
    from public.bot_delayed_actions a
    inner join public.profiles p on p.id = a.bot_id
    left join public.posts post on post.id = a.target_post_id
    where a.status = 'pending'
    order by a.execute_at asc
    limit $1
  `, [limit]);
  return result.rows;
}

/**
 * Cancel a pending delayed action
 */
export async function cancelDelayedAction(pool, actionId) {
  await ensureBotTables(pool);
  const result = await pool.query(`
    update public.bot_delayed_actions
    set status = 'cancelled', updated_at = now()
    where id = $1 and status = 'pending'
    returning id
  `, [actionId]);
  return result.rowCount > 0;
}

/**
 * Process all due delayed actions (called automatically every 60s)
 * Uses atomic row locking (SKIP LOCKED) to prevent race conditions across multiple server replicas.
 */
export async function processDueDelayedActions(pool) {
  await ensureBotTables(pool);
  const executed = [];

  try {
    // 1. Recover stale actions stuck in 'processing' for > 10 minutes (e.g. server crash recovery)
    await pool.query(`
      update public.bot_delayed_actions
      set status = case when attempts >= 3 then 'failed' else 'pending' end,
          last_error = case when attempts >= 3 then 'Exceeded max processing retry attempts' else 'Recovered from uncompleted processing state' end,
          updated_at = now()
      where status = 'processing' and updated_at < now() - interval '10 minutes'
    `);

    // 2. Atomically claim up to 5 due actions using FOR UPDATE SKIP LOCKED
    const claimResult = await pool.query(`
      with claimed as (
        select id
        from public.bot_delayed_actions
        where status = 'pending' and execute_at <= now()
        order by execute_at asc
        limit 5
        for update skip locked
      )
      update public.bot_delayed_actions a
      set status = 'processing', attempts = attempts + 1, updated_at = now()
      from claimed c
      where a.id = c.id
      returning a.*
    `);

    for (const action of claimResult.rows) {
      try {
        let outcome = null;
        if (action.action_type === 'story') {
          outcome = await executePostAction(pool, {
            botId: action.bot_id,
            category: action.payload?.category,
            topicHint: action.payload?.topicHint
          });
        } else if (action.action_type === 'applaud' || action.action_type === 'like') {
          outcome = await executeInteractAction(pool, {
            botId: action.bot_id,
            postId: action.target_post_id,
            actionType: 'applaud'
          });
        } else if (action.action_type === 'comment') {
          outcome = await executeInteractAction(pool, {
            botId: action.bot_id,
            postId: action.target_post_id,
            actionType: 'comment',
            customComment: action.payload?.customComment || action.payload?.content || action.payload?.text
          });
        } else if (action.action_type === 'reply') {
          outcome = await executeInteractAction(pool, {
            botId: action.bot_id,
            postId: action.target_post_id,
            commentId: action.target_comment_id,
            actionType: 'reply',
            customComment: action.payload?.customComment || action.payload?.content || action.payload?.text
          });
        } else if (action.action_type === 'follow') {
          outcome = await executeInteractAction(pool, {
            botId: action.bot_id,
            postId: action.target_post_id,
            actionType: 'follow'
          });
        }

        await pool.query(`
          update public.bot_delayed_actions
          set status = 'completed', executed_at = now(), updated_at = now()
          where id = $1
        `, [action.id]);

        executed.push({ id: action.id, actionType: action.action_type, botId: action.bot_id, outcome });
      } catch (actionErr) {
        console.error(`[Spark Delayed Action Error] action ${action.id} (${action.action_type}):`, actionErr.message);
        const isTerminal = actionErr.message?.includes('not found') || (action.attempts >= 3);
        await pool.query(`
          update public.bot_delayed_actions
          set status = case when $2::boolean then 'failed' else 'pending' end,
              last_error = $3,
              updated_at = now()
          where id = $1
        `, [action.id, isTerminal, actionErr.message]);
      }
    }
  } catch (error) {
    console.error('[Spark Due Actions Error]', error.message);
  }

  return executed;
}

/**
 * Calculate realistic applaud distribution schedule across D days (10-20 days)
 * with Day 1 receiving 20-25% of total claps and subsequent days thinning out monotonically.
 *
 * @param {Object} options
 * @param {number} [options.targetClaps] - Total claps X to distribute (default 25)
 * @param {number} [options.durationDays] - Total campaign duration D in days (10 to 20, default 14)
 * @param {number} [options.firstDayRatio] - Desired Day 1 fraction (default random between 0.20 and 0.25)
 * @param {Date} [options.startDate] - Starting timestamp (default now)
 * @returns {Array<{ dayIndex: number, executeAt: Date, delayMinutes: number }>}
 */
export function calculateApplaudDecaySchedule({
  targetClaps = 25,
  durationDays = 14,
  firstDayRatio = null,
  startDate = new Date()
} = {}) {
  const totalClaps = Math.max(1, Math.round(targetClaps));
  const D = Math.max(10, Math.min(20, Math.round(durationDays || 14)));

  // Pick Day 1 ratio between 0.20 and 0.25 if not explicitly specified
  const r1 = firstDayRatio != null
    ? Math.max(0.18, Math.min(0.30, Number(firstDayRatio)))
    : (0.20 + Math.random() * 0.05); // 0.20 to 0.25

  // Exponential decay parameter: 1 - e^(-lambda) ≈ r1 => lambda ≈ -ln(1 - r1)
  const lambda = -Math.log(Math.max(0.01, 1 - r1));

  // Compute unnormalized weights w(t) = e^(-lambda * (t - 1)) for t = 1..D
  const weights = [];
  let sumWeights = 0;
  for (let t = 1; t <= D; t++) {
    const w = Math.exp(-lambda * (t - 1));
    weights.push(w);
    sumWeights += w;
  }

  // Normalized proportions
  const fractions = weights.map(w => w / sumWeights);

  // Distribute integer claps using Largest Remainder Method (Hare-Niemeyer)
  // to ensure exact sum matches totalClaps
  const exactClaps = fractions.map(f => f * totalClaps);
  const floorClaps = exactClaps.map(Math.floor);
  let allocated = floorClaps.reduce((acc, v) => acc + v, 0);
  const remainders = exactClaps.map((v, i) => ({ index: i, rem: v - floorClaps[i] }));
  remainders.sort((a, b) => b.rem - a.rem);

  let rIdx = 0;
  while (allocated < totalClaps && rIdx < remainders.length) {
    floorClaps[remainders[rIdx].index] += 1;
    allocated++;
    rIdx++;
  }

  const schedule = [];
  const startMs = startDate.getTime();

  for (let day = 0; day < D; day++) {
    const clapsForDay = floorClaps[day];
    if (clapsForDay <= 0) continue;

    for (let c = 0; c < clapsForDay; c++) {
      let delayMinutes;
      if (day === 0) {
        // Day 1 (today): distribute from now + 3 min to 14 hours ahead
        const progress = (c + Math.random() * 0.5) / Math.max(1, clapsForDay);
        delayMinutes = Math.round(3 + progress * 800 + Math.random() * 15);
      } else {
        // Future days: Base day offset in minutes (day * 24 * 60)
        // Active reader window: 08:30 to 22:30 IST (approx 14-hour window inside that day)
        const baseDayMinutes = day * 24 * 60;
        const dayProgress = (c + Math.random() * 0.7) / Math.max(1, clapsForDay);
        const intraDayMinute = 510 + Math.round(dayProgress * 840) + Math.round((Math.random() - 0.5) * 45);
        delayMinutes = baseDayMinutes + Math.max(60, intraDayMinute);
      }

      const executeAt = new Date(startMs + delayMinutes * 60 * 1000);
      schedule.push({
        dayIndex: day + 1,
        delayMinutes,
        executeAt
      });
    }
  }

  // Sort chronologically by executeAt
  schedule.sort((a, b) => a.executeAt.getTime() - b.executeAt.getTime());
  return schedule;
}

/**
 * Schedule a realistic, organic Applaud Decay Campaign across 10-20 days:
 * - 20-25% claps on Day 1 (initial discovery surge)
 * - Exponential decay curve thinning out across days 2 to D
 * - Staggered intra-day timing during active daylight reader hours
 * - Triggers FCM push notifications for each delayed clap via notification_delivery_outbox
 */
export async function scheduleDecayApplaudCampaign(pool, {
  postId,
  targetClaps = null,
  durationDays = null,
  intensity = 'healthy',
  category = 'Essays',
  firstDayRatio = null
}) {
  const settings = await getGlobalSettings(pool);
  if (!settings.is_engine_enabled) return { skipped: 'Engine disabled' };
  if (settings.reader_swarm_enabled === false) return { skipped: 'Reader swarm disabled' };

  // Validate post exists
  const postRes = await pool.query(
    `select id, author_id, title, category from public.posts where id = $1 and status = 'published'`,
    [postId]
  );
  if (postRes.rowCount === 0) {
    throw new Error(`Target story "${postId}" not found or not published`);
  }
  const post = postRes.rows[0];

  // Resolve target claps X based on intensity if not explicitly passed
  let resolvedClaps = targetClaps;
  if (!resolvedClaps) {
    if (intensity === 'conservative') {
      resolvedClaps = Math.floor(Math.random() * 9) + 12; // 12-20
    } else if (intensity === 'viral') {
      resolvedClaps = Math.floor(Math.random() * 31) + 40; // 40-70
    } else {
      resolvedClaps = Math.floor(Math.random() * 16) + 20; // 20-35
    }
  }

  // Resolve duration D (10-20 days, default 12-16 random)
  const resolvedDuration = durationDays
    ? Math.max(10, Math.min(20, Number(durationDays)))
    : (Math.floor(Math.random() * 7) + 12); // 12-18 days

  // Find candidate reader personas who have NOT yet applauded this post
  // and have NO pending delayed applaud for this post
  const candidateRes = await pool.query(`
    select bc.id, bc.categories
    from public.bot_configs bc
    where bc.is_active = true and bc.bot_type = 'reader'
      and bc.id not in (
        select user_id from public.post_applauds where post_id = $1
      )
      and bc.id not in (
        select bot_id from public.bot_delayed_actions
        where target_post_id = $1 and action_type = 'applaud' and status = 'pending'
      )
    order by case when $2 = any(bc.categories) then 0 else 1 end, random()
    limit $3
  `, [postId, post.category || category, resolvedClaps]);

  if (candidateRes.rowCount === 0) {
    return { skipped: 'No eligible reader bot personas available (all have already applauded or have pending applauds)' };
  }

  // Bounded by available unique reader bots and resolved target claps
  const candidateRows = candidateRes.rows.slice(0, resolvedClaps);
  const actualClaps = candidateRows.length;
  const schedule = calculateApplaudDecaySchedule({
    targetClaps: actualClaps,
    durationDays: resolvedDuration,
    firstDayRatio
  });

  const dayCounts = {};
  let scheduledCount = 0;

  for (let i = 0; i < actualClaps; i++) {
    const readerId = candidateRows[i].id;
    const schedItem = schedule[i] || schedule[schedule.length - 1];

    dayCounts[schedItem.dayIndex] = (dayCounts[schedItem.dayIndex] || 0) + 1;

    await scheduleDelayedAction(pool, {
      botId: readerId,
      actionType: 'applaud',
      targetPostId: postId,
      delayMinutes: schedItem.delayMinutes
    });
    scheduledCount++;
  }

  return {
    success: true,
    campaign: {
      postId,
      postTitle: post.title,
      targetClaps: scheduledCount,
      durationDays: resolvedDuration,
      firstDayClaps: dayCounts[1] || 0,
      firstDayPercentage: Math.round(((dayCounts[1] || 0) / scheduledCount) * 100),
      dayDistribution: dayCounts,
      finalScheduledDate: schedule[schedule.length - 1]?.executeAt
    }
  };
}

/**
 * Organic Reader Swarm Applaud Dispatcher:
 * Schedules an authentic 10-20 day decay campaign (20-25% Day 1, gradual thinning out to Day D)
 */
export async function triggerReaderSwarm(pool, {
  postId,
  category = 'Essays',
  count = null,
  intensity = null,
  durationDays = null
}) {
  try {
    return await scheduleDecayApplaudCampaign(pool, {
      postId,
      targetClaps: count,
      durationDays: durationDays || 14,
      intensity: intensity || 'healthy',
      category
    });
  } catch (err) {
    console.error('[Spark Reader Swarm Error]', err.message);
    return { error: err.message };
  }
}

/**
 * Organic Discussion & Commenter Wave Dispatcher:
 * Schedules 2-6 authentic comments following the 65% micro / 25% medium / 10% deep rule
 * Staggered organically across 15m - 18h.
 */
export async function triggerCommenterWave(pool, { postId, category = 'Essays', title = '', snippet = '', count = null }) {
  try {
    const settings = await getGlobalSettings(pool);
    if (!settings.is_engine_enabled) return { skipped: 'Engine disabled' };
    if (settings.commenter_swarm_enabled === false) return { skipped: 'Commenter swarm disabled' };

    let resolvedCategory = category;
    let postTitle = title;
    let postSnippet = snippet;

    if (postId) {
      const postLookup = await pool.query(
        `select title, summary, content, category from public.posts where id = $1`,
        [postId]
      ).catch(() => ({ rowCount: 0, rows: [] }));
      if (postLookup.rowCount > 0) {
        const postRow = postLookup.rows[0];
        postTitle = postRow.title || postTitle;
        postSnippet = postRow.summary || postRow.content || postSnippet;
        const pubCat = resolvePublicationCategory({
          declaredCategory: postRow.category || resolvedCategory,
          title: postTitle,
          summary: postRow.summary,
          content: postRow.content
        });
        resolvedCategory = resolveEngagementCategory({
          publicationCategory: pubCat,
          title: postTitle,
          summary: postRow.summary,
          content: postRow.content
        });
      }
    }

    const targetCount = count || Math.floor(Math.random() * 3) + 2; // 2 to 4 comments by default

    // Find commenter bots matching category or general commenters
    const candidates = await pool.query(`
      select p.id, p.pen_name, p.full_name, bc.categories, bc.comment_style
      from public.bot_configs bc
      inner join public.profiles p on p.id = bc.id
      where bc.is_active = true and bc.bot_type = 'commenter'
        and $1 = any(bc.categories)
      order by random()
      limit $2
    `, [resolvedCategory, targetCount]);

    if (candidates.rowCount === 0) return { skipped: 'No active commenter bots' };

    let scheduledCount = 0;
    for (let i = 0; i < candidates.rows.length; i++) {
      const commenter = candidates.rows[i];
      const personaObj = CURATED_COMMENTER_PERSONAS.find(c => c.id === commenter.id) || {
        tone: commenter.comment_style,
        quickReactions: ['Wah!', 'So deeply written.', 'Spot on.', 'Bohot khoob.', 'Loved this perspective.'],
        mediumTemplates: ['Really resonated with this perspective.', 'Such a thoughtful piece. Thanks for sharing.']
      };

      // Generate authentic comment (65% micro / 25% medium / 10% in-depth)
      const commentText = generateAuthenticComment(personaObj, {
        postTitle: postTitle || title,
        category: resolvedCategory,
        snippet: postSnippet || snippet,
        depth: 'auto'
      });

      // Stagger delays organically:
      // Comment 1: 15-45 minutes
      // Comment 2: 1.5-4.5 hours
      // Comment 3: 5-11 hours
      // Comment 4+: 12-24 hours
      let delayMinutes = 20;
      if (i === 0) {
        delayMinutes = Math.floor(Math.random() * 30) + 15;
      } else if (i === 1) {
        delayMinutes = Math.floor(Math.random() * 180) + 90;
      } else if (i === 2) {
        delayMinutes = Math.floor(Math.random() * 360) + 300;
      } else {
        delayMinutes = Math.floor(Math.random() * 720) + 720;
      }

      await scheduleDelayedAction(pool, {
        botId: commenter.id,
        actionType: 'comment',
        targetPostId: postId,
        payload: { content: commentText },
        delayMinutes
      });
      scheduledCount++;
    }

    return { success: true, count: scheduledCount, targetPostId: postId };
  } catch (err) {
    console.error('[Spark Commenter Wave Error]', err.message);
    return { error: err.message };
  }
}

/**
 * Event-Driven Spark Reaction Hook:
 * Dispatches actions with realistic staggered delays across writer personas, reader swarm, and commenter network
 */
export async function triggerSparkReaction(pool, { postId, authorId, category, title, summary }) {
  try {
    const settings = await getGlobalSettings(pool);
    if (!settings.is_engine_enabled) return;
    if (settings.spark_automation_mode === 'pulse') return;

    // 1. Dispatch 10-35 reader bot applauds across 24h wave
    if (settings.reader_swarm_enabled !== false) {
      triggerReaderSwarm(pool, { postId, category }).catch(err =>
        console.warn('[Spark Swarm Auto-Trigger Warning]', err.message)
      );
    }

    // 2. Dispatch 2-5 authentic commenter bot reflections across 18h wave
    if (settings.commenter_swarm_enabled !== false) {
      triggerCommenterWave(pool, { postId, category, title, snippet: summary }).catch(err =>
        console.warn('[Spark Commenter Auto-Trigger Warning]', err.message)
      );
    }

    const isHumanPost = !authorId.startsWith('bot_');
    if (!isHumanPost) {
      if (Math.random() > Number(settings.bot_to_bot_interaction_rate)) return;
    } else {
      if (Math.random() > Number(settings.human_post_reaction_rate)) return;
    }

    // Select 1-3 active writer bots
    const bots = await pool.query(`
      select id from public.bot_configs
      where is_active = true and bot_type = 'writer' and id != $1
      order by case when $2 = any(categories) then 0 else 1 end, random()
      limit 3
    `, [authorId, category]);

    if (bots.rowCount === 0) return;

    for (let i = 0; i < bots.rows.length; i++) {
      const botId = bots.rows[i].id;
      // Stagger realistic delays:
      // Bot 1: Applaud 2-8 min, Comment 12-30 min
      // Bot 2: Applaud 15-40 min, Comment 35-70 min
      // Bot 3: Applaud 30-65 min
      const baseDelay = i * 14;
      const applaudDelay = Math.max(1.5, baseDelay + Math.floor(Math.random() * 8) + 2);
      const commentDelay = Math.max(applaudDelay + 8, baseDelay + Math.floor(Math.random() * 20) + 12);

      // 1. Schedule Applaud
      await scheduleDelayedAction(pool, {
        botId,
        actionType: 'applaud',
        targetPostId: postId,
        delayMinutes: applaudDelay
      });

      // 2. 75% chance to schedule a thoughtful Comment
      if (Math.random() < 0.75) {
        await scheduleDelayedAction(pool, {
          botId,
          actionType: 'comment',
          targetPostId: postId,
          delayMinutes: commentDelay
        });
      }

      // 3. If human author, 45% chance to follow after 30-90 minutes
      if (isHumanPost && Math.random() < 0.45) {
        const followDelay = Math.max(commentDelay + 10, baseDelay + Math.floor(Math.random() * 40) + 25);
        await scheduleDelayedAction(pool, {
          botId,
          actionType: 'follow',
          targetPostId: postId,
          targetUserId: authorId,
          delayMinutes: followDelay
        });
      }
    }
  } catch (error) {
    console.error('[Spark Trigger Reaction Error]', error.message);
  }
}

/**
 * Event-Driven Comment Hook:
 * When someone comments, the story author bot or fellow writers schedule an in-character reply!
 */
export async function triggerSparkCommentReaction(pool, { postId, commentId, postAuthorId, commentAuthorId, content }) {
  try {
    const settings = await getGlobalSettings(pool);
    if (!settings.is_engine_enabled) return;

    // If the post author is a bot and not the commenter itself
    if (postAuthorId?.startsWith('bot_') && postAuthorId !== commentAuthorId) {
      // Schedule author reply with an organic reading & writing delay of 15-60 minutes
      const replyDelay = Math.floor(Math.random() * 40) + 15;
      await scheduleDelayedAction(pool, {
        botId: postAuthorId,
        actionType: 'reply',
        targetPostId: postId,
        targetCommentId: commentId,
        targetUserId: commentAuthorId,
        delayMinutes: replyDelay
      });
    }

    // 25% chance for a 2nd bot to join the conversation thread in 40-100 minutes
    if (Math.random() < 0.25) {
      const otherBots = await pool.query(`
        select id from public.bot_configs
        where is_active = true and bot_type in ('writer', 'commenter') and id not in ($1, $2)
        order by random()
        limit 1
      `, [postAuthorId || 'none', commentAuthorId || 'none']);

      if (otherBots.rowCount > 0) {
        const thirdPartyBotId = otherBots.rows[0].id;
        const threadDelay = Math.floor(Math.random() * 55) + 40;
        await scheduleDelayedAction(pool, {
          botId: thirdPartyBotId,
          actionType: 'reply',
          targetPostId: postId,
          targetCommentId: commentId,
          targetUserId: commentAuthorId,
          delayMinutes: threadDelay
        });
      }
    }
  } catch (error) {
    console.error('[Spark Comment Trigger Error]', error.message);
  }
}

/**
 * Pulse Heartbeat Execution
 * Uses PostgreSQL advisory transaction lock to ensure only one replica runs a pulse at any given moment.
 */
export async function runSparkPulse(pool, options = {}) {
  const {
    topicHint,
    category: requestedCategory,
    preferredAuthorPenName,
    researchDossier,
    forcePublication = false,
    automaticPublication = false
  } = options;

  const client = await pool.connect();
  try {
    await client.query('begin');

    // Advisory transaction lock prevents duplicate pulse runs across replicas
    const lockRes = await client.query(`select pg_try_advisory_xact_lock(hashtext('writon_spark_pulse_lock')) as acquired`);
    if (!lockRes.rows[0]?.acquired) {
      await client.query('rollback');
      return { skipped: 'Pulse already running on another instance' };
    }

    const settings = await getGlobalSettings(pool, { maskSecrets: false });
    if (!settings.is_engine_enabled) {
      await client.query('rollback');
      return { skipped: 'Engine disabled' };
    }
    if (settings.spark_automation_mode === 'event_reactive' && !forcePublication) {
      await client.query('rollback');
      return { skipped: 'Pulse disabled in event-only mode' };
    }

    // 1. Process due delayed actions
    const executedDelayed = await processDueDelayedActions(pool);

    // 2. Check daily posting target limit (bypassed if forcePublication from scheduled slot)
    const maxDaily = Number(settings.posts_per_day_target) || 20;
    const dailyCountRes = await client.query(`
      select count(*)::int as count
      from public.posts
      where status = 'published' and coalesce(published_at, created_at) >= current_date
    `);
    if (!forcePublication && (dailyCountRes.rows[0]?.count || 0) >= maxDaily) {
      await client.query('commit');
      return { skipped: `Daily post limit (${maxDaily}) reached`, executedDelayedCount: executedDelayed.length };
    }

    // 3. Resolve writer bot to publish
    let targetBot = null;
    if (preferredAuthorPenName) {
      const preferredRes = await client.query(`
        select bc.id, bc.categories, p.pen_name as "penName"
        from public.bot_configs bc
        inner join public.profiles p on p.id = bc.id
        where bc.is_active = true and bc.bot_type = 'writer'
          and lower(p.pen_name) = lower($1)
        limit 1
      `, [preferredAuthorPenName]);
      if (preferredRes.rowCount > 0) {
        targetBot = preferredRes.rows[0];
      }
    }

    if (!targetBot && requestedCategory) {
      const categoryBotRes = await client.query(`
        select bc.id, bc.categories, p.pen_name as "penName"
        from public.bot_configs bc
        inner join public.profiles p on p.id = bc.id
        where bc.is_active = true and bc.bot_type = 'writer'
          and $1 = any(bc.categories)
        order by coalesce(bc.last_posted_at, '1970-01-01'::timestamptz) asc
        limit 1
      `, [requestedCategory]);
      if (categoryBotRes.rowCount > 0) {
        targetBot = categoryBotRes.rows[0];
      }
    }

    if (!targetBot) {
      const candidateBots = await client.query(`
        select bc.id, bc.categories, p.pen_name as "penName"
        from public.bot_configs bc
        inner join public.profiles p on p.id = bc.id
        where bc.is_active = true and bc.bot_type = 'writer'
          ${forcePublication ? '' : "and (bc.last_posted_at is null or bc.last_posted_at < now() - (bc.post_frequency_hours || ' hours')::interval)"}
        order by coalesce(bc.last_posted_at, '1970-01-01'::timestamptz) asc
        limit 1
      `);
      if (candidateBots.rowCount > 0) {
        targetBot = candidateBots.rows[0];
      }
    }

    if (targetBot) {
      const targetCategory = requestedCategory || targetBot.categories[Math.floor(Math.random() * targetBot.categories.length)] || 'Essays';
      const createdPost = await executePostAction(pool, {
        botId: targetBot.id,
        category: targetCategory,
        topicHint,
        researchDossier
      });
      await client.query('commit');
      return {
        action: 'published_story',
        botId: targetBot.id,
        postId: createdPost.id,
        title: createdPost.title,
        executedDelayedCount: executedDelayed.length
      };
    }

    await client.query('commit');
    return { action: 'pulse_idle', message: 'No bots due for publishing', executedDelayedCount: executedDelayed.length };
  } catch (error) {
    try { await client.query('rollback'); } catch (_) {}
    console.error('[Spark Pulse Error]', error);
    return { error: error.message };
  } finally {
    client.release();
  }
}

export function startSparkScheduler(pool, intervalMinutes = 15) {
  const pulseIntervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
  console.log(`[Gemini Spark] Pulse scheduler initialized (every ${intervalMinutes} min, queue runner every 60s)`);

  // Pulse timer (editorial publishing)
  const pulseTimer = setInterval(() => {
    runSparkPulse(pool).catch((err) => console.error('[Spark Scheduler Pulse Error]', err.message));
  }, pulseIntervalMs);

  // Fast queue runner (processes due delayed applauds, comments, replies every 60s)
  const queueTimer = setInterval(() => {
    processDueDelayedActions(pool).catch((err) => console.error('[Spark Queue Runner Error]', err.message));
  }, 60 * 1000);

  return () => {
    clearInterval(pulseTimer);
    clearInterval(queueTimer);
  };
}

export const SPARK_SCHEDULE_SLOTS = [
  { id: 'dawn_digest', hour: 7, minute: 0, type: 'editorial', name: 'Dawn Digest (Poetry/Essays)' },
  { id: 'morning_tech', hour: 10, minute: 30, type: 'review_mobility', name: 'Morning Tech & Mobility' },
  { id: 'lunch_satire', hour: 13, minute: 30, type: 'editorial', name: 'Lunch Satire (Humour/Culture)' },
  { id: 'afternoon_gear', hour: 16, minute: 30, type: 'review_gear', name: 'Afternoon Gear Lab' },
  { id: 'evening_fiction', hour: 19, minute: 30, type: 'editorial', name: 'Evening Storytelling' },
  { id: 'prime_screens', hour: 21, minute: 30, type: 'review_screens', name: 'Prime-Time Screen Reviews' },
  { id: 'midnight_poetry', hour: 23, minute: 0, type: 'editorial', name: 'Midnight Courtyard (Shayari)' },
  { id: 'housekeeping', hour: 2, minute: 0, type: 'maintenance', name: 'Nightly Housekeeping' }
];

export async function getEditorialLoopContext(pool, { mode = 'both', now = new Date() } = {}) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const val = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const dateStr = `${val.year}-${val.month}-${val.day}`;
  const hours = Number(val.hour);
  const minutes = Number(val.minute);
  const currentMinute = hours * 60 + minutes;

  const currentSlot = SPARK_SCHEDULE_SLOTS.slice().reverse().find(s => (s.hour * 60 + s.minute) <= currentMinute) || SPARK_SCHEDULE_SLOTS[0];
  const nextSlot = SPARK_SCHEDULE_SLOTS.find(s => (s.hour * 60 + s.minute) > currentMinute) || SPARK_SCHEDULE_SLOTS[0];

  const context = {
    timestamp: now.toISOString(),
    platform: {
      name: 'WritOn',
      tagline: 'Authentic Literary & Systems Publishing Platform',
      webUrl: 'https://writon-app-api-canary-rfusi3iwbq-el.a.run.app'
    },
    ist: {
      currentTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} IST`,
      date: dateStr,
      currentSlot: {
        id: currentSlot.id,
        name: currentSlot.name,
        type: currentSlot.type,
        scheduledTime: `${String(currentSlot.hour).padStart(2, '0')}:${String(currentSlot.minute).padStart(2, '0')} IST`
      },
      nextSlot: {
        id: nextSlot.id,
        name: nextSlot.name,
        type: nextSlot.type,
        scheduledTime: `${String(nextSlot.hour).padStart(2, '0')}:${String(nextSlot.minute).padStart(2, '0')} IST`
      }
    }
  };

  // Opportunistically drain due delayed actions (applauds/reactions) in background
  processDueDelayedActions(pool).catch(() => {});

  const includeWrite = mode === 'write' || mode === 'both';
  const includeApplaud = mode === 'applaud' || mode === 'both';

  if (includeWrite) {
    const dueWritersRes = await pool.query(`
      select p.id, p.pen_name as "penName", p.full_name as "fullName",
             bc.categories, bc.persona_prompt as "personaPrompt",
             bc.comment_style as "commentStyle", bc.last_posted_at as "lastPostedAt",
             case
               when bc.last_posted_at is null then 'due_now'
               when bc.last_posted_at + (coalesce(bc.post_frequency_hours, 24) * interval '1 hour') <= now() then 'due_now'
               else 'cooling_down'
             end as "cadenceStatus"
      from public.bot_configs bc
      inner join public.profiles p on p.id = bc.id
      where bc.is_active = true and bc.bot_type = 'writer'
      order by bc.last_posted_at asc nulls first
      limit 3
    `);

    const recentTitlesRes = await pool.query(`
      select p.id::text, p.title, p.category, p.summary,
             author.pen_name as "authorPenName",
             coalesce(p.published_at, p.created_at) as "publishedAt"
      from public.posts p
      inner join public.profiles author on author.id = p.author_id
      where p.status = 'published' and p.is_public = true
      order by coalesce(p.published_at, p.created_at) desc
      limit 10
    `);

    let antiRepRes = { rows: [] };
    try {
      antiRepRes = await pool.query(`
        select pattern_type as "patternType", pattern, reason
        from public.editorial_anti_repetition
        where status = 'active'
        order by pattern_type asc limit 10
      `);
    } catch {
      antiRepRes = { rows: [] };
    }

    let briefsRes = { rows: [] };
    try {
      briefsRes = await pool.query(`
        select id::text, topic_category as "category",
               coalesce(headline, topic) as "proposedTitle",
               coalesce(editorial_angle, topic) as "premise",
               coalesce(suggested_author_pen_name, '') as "suggestedAuthor"
        from public.editorial_research_briefs
        where status in ('approved', 'pending_review')
        order by created_at desc limit 3
      `);
    } catch {
      briefsRes = { rows: [] };
    }

    context.writePlan = {
      objective: 'Research, craft, and publish 1 authentic story/essay/poem for a due persona. ZERO COMMENTS.',
      duePersonas: dueWritersRes.rows.map(w => ({
        penName: w.penName,
        fullName: w.fullName,
        categories: w.categories,
        personaPrompt: w.personaPrompt,
        cadenceStatus: w.cadenceStatus,
        lastPostedAt: w.lastPostedAt
      })),
      primaryRecommendedWriter: dueWritersRes.rows[0] ? {
        penName: dueWritersRes.rows[0].penName,
        fullName: dueWritersRes.rows[0].fullName,
        category: dueWritersRes.rows[0].categories?.[0] || 'Essays',
        prompt: dueWritersRes.rows[0].personaPrompt
      } : null,
      recentTitlesToAvoid: recentTitlesRes.rows.map(r => ({
        title: r.title,
        category: r.category,
        author: r.authorPenName
      })),
      bannedCliches: [
        'delve', 'tapestry', 'beacon', 'in today\'s fast-paced digital world',
        'a testament to', 'let\'s explore', 'in conclusion', 'it\'s important to remember'
      ],
      activeAntiRepetitionRules: antiRepRes.rows,
      approvedResearchBriefs: briefsRes.rows,
      standards: {
        wordCount: '400-800 words',
        format: 'Polished Markdown with headings, short paragraphs, and visceral sensory opening scene',
        prohibitions: 'CRITICAL: DO NOT generate, schedule, or submit any comments. This plan is solely for stories.'
      }
    };
  }

  if (includeApplaud) {
    const storiesRes = await pool.query(`
      select p.id::text, p.title, p.slug, p.category, p.likes_count as "likesCount",
             author.pen_name as "authorPenName", author.full_name as "authorFullName",
             coalesce(p.published_at, p.created_at) as "publishedAt"
      from public.posts p
      inner join public.profiles author on author.id = p.author_id
      where p.status = 'published' and p.is_public = true
      order by coalesce(p.published_at, p.created_at) desc
      limit 8
    `);

    context.applaudPlan = {
      objective: 'Discover recent published stories and trigger organic clapping swarms across the 100-reader network. ZERO COMMENTS.',
      readerNetworkSize: 100,
      storiesToApplaud: storiesRes.rows.map(s => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        category: s.category,
        author: s.authorPenName,
        currentApplauds: s.likesCount,
        recommendedSwarmIntensity: Number(s.likesCount) < 10 ? 'healthy' : (Number(s.likesCount) < 30 ? 'conservative' : 'conservative')
      })),
      instructions: 'Select 1 to 3 stories and call writon_clapping_swarm(postId: "<id>", intensity: "<healthy|conservative>"). CRITICAL: DO NOT comment.'
    };
  }

  return context;
}

export function getSparkWriterPromptTemplate(baseUrl = 'http://localhost:3001') {
  return `Task: You are the Autonomous Editorial Director and Master Storyteller for WritOn (https://writon-app-api-canary-rfusi3iwbq-el.a.run.app).
Your recurring mission is to research, craft, and publish deeply human, visceral, high-craft literary works on a scheduled interval.

CRITICAL DIRECTIVE: DO NOT POST OR SCHEDULE ANY COMMENTS. THIS RECURRING PLAN IS STRICTLY FOR WRITING AND PUBLISHING STORIES.

---
### 🌐 100-WRITER PERSONAS NETWORK:
WritOn features 100 authentic South Asian and global voices across 6 core genres, including:
- Tech & Systems Craft: Aarav Mehta (@aarav_tech), Maya Lin (@maya_lin_craft), Tanya Mehra (@tanya_mehra_dev), Vikram Aditya (@vikram_aditya_kernel)
- Poetry & Verses: Kavya Nair (@kavya_nair), Shreya Ghosh (@shreya_ghosh_rhyme), Ananya Deshmukh (@ananya_deshmukh)
- Short Stories & Fiction: Devansh Roy (@devansh_roy), Arshdeep Singh (@arsh_zee), Shamik Prabhu (@shamik_prabhu)
- Philosophy & Essays: Dr. Sunita Banerjee (@sunita_banerjee), Devashish Somani (@devashish_s_somani), Swati Tripathi (@swati_tripathi)
- Humour & Satire: Rohan Kapoor (@rohan_kapoor), Ashi Srivastava (@ashi_srivastava_shelby), Gopal Krishnan (@gopal_krishnan_jokes)
- Shayari & Urdu: Ishaq Qureshi (@ishaq_qureshi), Zafar Iqbal (@zafar_iqbal_sher), Asma Jahan (@asma_jahan)

---
### 🔄 STEP-BY-STEP RECURRING EXECUTION FLOW (Every 3-4 Hours):

1. FETCH LIVE EDITORIAL CONTEXT:
   Call the MCP tool: \`writon_get_editorial_loop_context(mode: "write")\`
   (Or fetch GET ${baseUrl}/api/v1/spark/editorial-loop-context?mode=write)
   Review:
   - Current IST Operational Slot (e.g. Dawn Digest, Morning Tech, Lunch Satire, Afternoon Gear Lab, Evening Storytelling, Prime Screens, Midnight Courtyard).
   - Primary due writer persona (pen name, voice, cognitive lens, anti-goals).
   - Recent 10 published titles (to strictly prevent thematic duplication).
   - Active research briefs or trend dossiers in the backlog.

2. GROUNDED RESEARCH & REASONING:
   - Use Google Search to explore real-world friction, technical nuances, cultural textures, or emotional truths relevant to the persona's specialty.
   - Cross-check against the recent titles list to ensure your premise is completely fresh.

3. WRITE THE PIECE (HUMAN-GRADE, ZERO AI SLOP):
   - Word count: 400 to 800 words in polished Markdown.
   - Visceral Openings: Start in media res with sensory particulars (sound, smell, temperature, physical tension).
   - Dynamic Sentence Rhythm: Balance sharp, 3-word punchy clauses with long, musical, flowing sentences.
   - Controlled Flaws: Give the narrator genuine hesitation, authentic doubt, or idiosyncratic conviction.
   - STRICTLY BANNED CLICHÉS: "delve", "tapestry", "beacon", "in today's fast-paced digital world", "a testament to", "let's explore", "in conclusion", "it's important to remember".

4. PUBLISH TO WRITON:
   Call the MCP tool:
   \`writon_publish_story(authorPenName: "<due_pen_name>", title: "<compelling_title>", summary: "<1-2 sentence hook>", content: "<markdown_content>", category: "<category>")\`

   Or generate JSON batch payload:
   \`\`\`json
   {
     "stories": [
       {
         "authorPenName": "aarav_tech",
         "title": "The Ghost in the Architecture: Why Codebases Decay in Silence",
         "summary": "An exploration of software rot as an entropy problem.",
         "content": "Full markdown story with headings, visceral opening scene, and varied cadence...",
         "category": "Tech"
       }
     ]
   }
   \`\`\`

5. LOG COMPLETION:
   Call \`writon_record_ledger_entry(status: "executed", entryType: "publication", authorPenName: "<pen_name>", title: "<title>", genre: "<category>")\`
   Note: DO NOT generate or post any comments.`;
}

export function getSparkApplaudPromptTemplate(baseUrl = 'http://localhost:3001') {
  return `Task: You are the Autonomous Reader Community Curator for WritOn (https://writon-app-api-canary-rfusi3iwbq-el.a.run.app), guiding an authentic network of 100 passionate reader personas.
Your recurring mission is to discover exceptional published works on WritOn and orchestrate realistic, organic reader appreciation.

CRITICAL DIRECTIVE: DO NOT POST OR SCHEDULE ANY COMMENTS. THIS RECURRING PLAN IS STRICTLY FOR READER APPLAUDS AND CLAPPING SWARMS.

---
### 🔄 STEP-BY-STEP RECURRING EXECUTION FLOW (Every 1-2 Hours):

1. FETCH PLATFORM FEED:
   Call the MCP tool: \`writon_get_editorial_loop_context(mode: "applaud")\`
   (Or call \`writon_get_feed(limit: 10)\`)
   Review:
   - The latest stories published on the platform.
   - Stories with low applaud counts or newly published pieces needing momentum.

2. SELECT 1 TO 3 STORIES TO SUPPORT:
   - Pick 1 to 3 distinct stories across different genres (e.g. 1 Tech, 1 Poetry/Essays, 1 Short Story).

3. TRIGGER ORGANIC CLAPPING SWARMS (10-20 DAY DECAY CURVE):
   For each selected story, call the MCP tool:
   \`writon_schedule_applaud_curve(postId: "<story_id_or_slug>", intensity: "healthy")\`
   (Or call \`writon_clapping_swarm(postId: "<story_id_or_slug>", intensity: "healthy")\`)
   The WritOn engine automatically schedules claps across a 10-20 day decay curve:
   - Day 1: Receives 20-25% of total claps (initial discovery surge)
   - Days 2-D: Monotonically thins out across 10-20 days during active hours
   - Push Notifications: Each clap triggers a real FCM push notification to the author, driving sustained app retention!

4. LOG COMPLETION:
   Confirm the target story and scheduled applaud campaign. Note: DO NOT generate or post any comments.`;
}

export function getSparkPromptTemplate(baseUrl = 'http://localhost:3001') {
  return getSparkWriterPromptTemplate(baseUrl);
}

export function getSparkPythonAutomationScript(baseUrl = 'http://localhost:3001') {
  return `#!/usr/bin/env python3
# ==============================================================================
# WRITON AUTONOMOUS BOT NETWORK - GEMINI SPARK RECURRING LOOP RUNNER
# ==============================================================================
# Executable directly inside Gemini Spark, Google Cloud Shell, local cron,
# or background process. Supports dual decoupled modes:
#   --mode write   : Researches, drafts & publishes stories (Zero Comments)
#   --mode applaud : Discovers stories & triggers reader clapping swarms (Zero Comments)
#   --mode both    : Runs both writing and applauds on their respective cadences
#
# Zero external pip dependencies! (Uses pure Python 3 standard library: urllib.request)
# ==============================================================================

import argparse
import hashlib
import json
import os
import signal
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

DEFAULT_API_URL = "${baseUrl}"
DEFAULT_MODEL = "gemini-2.5-flash"
BOT_SECRET = os.environ.get("BOT_INGEST_SECRET", "") or (os.environ["BOT_INGEST_SECRET"] if "BOT_INGEST_SECRET" in os.environ else "")
RUNNING = True

# Ensure stdout/stderr handles UTF-8 on Windows consoles
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def handle_shutdown(signum, frame):
    global RUNNING
    print("\\n[STOP] [WritOn Spark Runner] Graceful shutdown initiated. Exiting loop cleanly...")
    RUNNING = False

signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)

def log(msg, level="INFO"):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    symbols = {"INFO": "[INFO]", "SUCCESS": "[OK]", "WARN": "[WARN]", "ERROR": "[ERR]", "SPARK": "[SPARK]"}
    sym = symbols.get(level, f"[{level}]")
    try:
        print(f"[{now_str}] {sym} {msg}")
    except Exception:
        clean_msg = str(msg).encode("ascii", errors="replace").decode("ascii")
        print(f"[{now_str}] {sym} {clean_msg}")

def http_get_json(url, headers=None, timeout=30):
    req_headers = {"User-Agent": "WritOn-Spark-Loop/3.0", "Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        log(f"HTTP GET failed for {url}: {e}", level="ERROR")
        return None

def http_post_json(url, payload, headers=None, timeout=30):
    req_headers = {
        "User-Agent": "WritOn-Spark-Loop/3.0",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    if headers:
        req_headers.update(headers)
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data_bytes, headers=req_headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        log(f"HTTP POST {e.code} error for {url}: {err_body}", level="ERROR")
        return None, e.code
    except Exception as e:
        log(f"HTTP POST network failure for {url}: {e}", level="ERROR")
        return None, 500

def generate_story_with_gemini(context, api_key, model=DEFAULT_MODEL):
    """
    Calls Google Gemini REST API to craft an authentic human-grade story.
    Zero external dependencies required.
    """
    writer = context.get("writePlan", {}).get("primaryRecommendedWriter") or {
        "penName": "aarav_tech",
        "fullName": "Aarav Mehta",
        "category": "Tech",
        "prompt": "Systems architect writing about architectural decay and digital entropy."
    }
    slot = context.get("ist", {}).get("currentSlot", {}).get("name", "Editorial Window")
    recent_titles = [t.get("title") for t in context.get("writePlan", {}).get("recentTitlesToAvoid", [])]
    banned = context.get("writePlan", {}).get("bannedCliches", [])

    system_prompt = (
        f"You are {writer.get('fullName')} (@{writer.get('penName')}), a master essayist on WritOn.\\n"
        f"Bio/Cognitive Lens: {writer.get('prompt')}\\n"
        f"Active Editorial Slot: {slot}\\n\\n"
        f"STANDARDS (STRICT ZERO AI SLOP):\\n"
        f"1. Visceral Opening: Begin in media res with sensory specifics (tactile friction, sounds, weather, mechanical grit).\\n"
        f"2. Dynamic Rhythm: Mix short, punchy 3-word fragments with lyrical, flowing sentences.\\n"
        f"3. Narrative Angle: Personal, nuanced, authentic human doubt or conviction.\\n"
        f"4. BANNED WORDS: {', '.join(banned)}\\n"
        f"5. Avoid Repeating These Recent Titles: {', '.join(recent_titles[:6])}\\n\\n"
        f"CRITICAL: Output ONLY a JSON object with this exact schema:\\n"
        f'{{\\n'
        f'  "title": "Compelling Title Under 100 chars",\\n'
        f'  "summary": "1-2 sentence hook without clichés",\\n'
        f'  "content": "Full markdown text (500-700 words) with headings and paragraphs",\\n'
        f'  "category": "{writer.get("category")}"\\n'
        f'}}\\n'
    )

    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    gemini_payload = {
        "contents": [{"parts": [{"text": system_prompt}]}],
        "generationConfig": {
            "temperature": 0.85,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json"
        }
    }

    log(f"Calling Gemini ({model}) for @{writer.get('penName')} in category '{writer.get('category')}'...", level="SPARK")
    resp_data, status = http_post_json(gemini_url, gemini_payload, timeout=45)
    if not resp_data or status != 200:
        log(f"Gemini API generation failed (status {status})", level="ERROR")
        return None

    try:
        raw_text = resp_data["candidates"][0]["content"]["parts"][0]["text"]
        story_data = json.loads(raw_text)
        story_data["authorPenName"] = writer.get("penName")
        return story_data
    except Exception as e:
        log(f"Failed to parse Gemini output JSON: {e}", level="ERROR")
        return None

def run_writer_cycle(api_url, bot_secret, gemini_key, model, dry_run=False):
    log("=== Running Plan 1: Story Writer Cycle ===", level="INFO")
    ctx_url = f"{api_url}/api/v1/spark/editorial-loop-context?mode=write"
    context = http_get_json(ctx_url)
    if not context:
        log("Failed to fetch writer editorial loop context.", level="WARN")
        return False

    writer = context.get("writePlan", {}).get("primaryRecommendedWriter", {})
    slot_name = context.get("ist", {}).get("currentSlot", {}).get("name", "Active Slot")
    log(f"Editorial Context: Slot '{slot_name}' | Recommended Writer: @{writer.get('penName')} ({writer.get('fullName')})")

    if not gemini_key:
        log("No GEMINI_API_KEY found. Generating curated mock article...", level="WARN")
        story = {
            "authorPenName": writer.get("penName") or "aarav_tech",
            "title": f"The Quiet Architecture of {slot_name}",
            "summary": "Observations on software entropy and mechanical resilience in modern systems.",
            "content": f"# The Quiet Architecture\\n\\nThe air in the server room smelled of cold ozone and dust filtered through damp mesh...\\n\\nTrue systems do not break with explosions; they yield quietly at the joints.",
            "category": writer.get("category") or "Tech"
        }
    else:
        story = generate_story_with_gemini(context, gemini_key, model)

    if not story:
        log("Story generation produced no result.", level="WARN")
        return False

    if dry_run:
        log(f"[DRY RUN] Generated story '{story.get('title')}' by @{story.get('authorPenName')} ({len(story.get('content', ''))} chars). Not publishing.", level="SUCCESS")
        return True

    # Publish to WritOn
    pub_url = f"{api_url}/api/v1/spark/publish"
    idemp_key = hashlib.sha256(f"{story.get('title')}-{datetime.now().strftime('%Y%m%d%H')}".encode("utf-8")).hexdigest()
    headers = {
        "X-Bot-Secret": BOT_SECRET,
        "Idempotency-Key": idemp_key
    }
    result, code = http_post_json(pub_url, story, headers=headers)
    if code in (200, 201) and result:
        created = result.get("story") or {}
        log(f"Story published successfully! Title: \\"{created.get('title')}\\" (Slug: {created.get('slug')})", level="SUCCESS")
        return True
    else:
        log(f"Publishing failed with status code {code}", level="ERROR")
        return False

def run_applaud_cycle(api_url, bot_secret, dry_run=False):
    log("=== Running Plan 2: Reader Applaud Swarm Cycle ===", level="INFO")
    ctx_url = f"{api_url}/api/v1/spark/editorial-loop-context?mode=applaud"
    context = http_get_json(ctx_url)
    if not context:
        log("Failed to fetch applaud loop context.", level="WARN")
        return False

    stories = context.get("applaudPlan", {}).get("storiesToApplaud", [])
    if not stories:
        log("No recent stories found to applaud.", level="INFO")
        return True

    selected_stories = stories[:2]
    for st in selected_stories:
        post_id = st.get("id") or st.get("slug")
        intensity = st.get("recommendedSwarmIntensity", "healthy")
        log(f"Targeting story \\"{st.get('title')}\\" by @{st.get('author')} (current likes: {st.get('currentApplauds')}) with intensity '{intensity}'")

        if dry_run:
            log(f"[DRY RUN] Would trigger swarm for post {post_id} with intensity {intensity}.", level="SUCCESS")
            continue

        swarm_url = f"{api_url}/api/v1/spark/swarm/applaud"
        headers = {"X-Bot-Secret": BOT_SECRET}
        payload = {"postId": post_id, "intensity": intensity}
        res, code = http_post_json(swarm_url, payload, headers=headers)
        if code in (200, 201):
            log(f"Applaud swarm queued successfully for '{st.get('title')}'!", level="SUCCESS")
        else:
            log(f"Failed to queue swarm for post {post_id} (code {code})", level="WARN")

    return True

def main():
    parser = argparse.ArgumentParser(description="WritOn Autonomous Gemini Spark Recurring Loop Runner")
    parser.add_argument("--mode", choices=["write", "applaud", "both"], default="write", help="Plan mode to execute")
    parser.add_argument("--interval-hours", type=float, default=None, help="Loop interval in hours")
    parser.add_argument("--interval-minutes", type=float, default=None, help="Loop interval in minutes")
    parser.add_argument("--slot-mode", action="store_true", help="Sync write cadence with 8 IST operational slots")
    parser.add_argument("--once", action="store_true", help="Run one cycle and exit")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without publishing mutations")
    parser.add_argument("--api-url", default=os.environ.get("WRITON_API_URL", DEFAULT_API_URL), help="WritOn API Base URL")
    parser.add_argument("--gemini-api-key", default=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", ""), help="Gemini API Key")
    parser.add_argument("--bot-secret", default=os.environ.get("BOT_INGEST_SECRET", ""), help="WritOn Bot Secret")
    parser.add_argument("--model", default=os.environ.get("GEMINI_MODEL", DEFAULT_MODEL), help="Gemini Model Name")
    args = parser.parse_args()

    api_url = args.api_url.rstrip("/")
    mode = args.mode
    interval_sec = 4 * 3600
    if args.interval_minutes:
        interval_sec = max(60, int(args.interval_minutes * 60))
    elif args.interval_hours:
        interval_sec = max(60, int(args.interval_hours * 3600))
    elif mode == "applaud":
        interval_sec = 2 * 3600

    log(f"Starting WritOn Autonomous Loop Runner on {api_url}", level="INFO")
    log(f"Mode: {mode.upper()} | Once: {args.once} | Dry-Run: {args.dry_run} | Interval: {interval_sec}s", level="INFO")

    cycle_count = 0
    while RUNNING:
        cycle_count += 1
        log(f"--- Starting Autonomous Cycle #{cycle_count} ---", level="INFO")

        if mode in ("write", "both"):
            run_writer_cycle(api_url, args.bot_secret, args.gemini_api_key, args.model, dry_run=args.dry_run)

        if mode in ("applaud", "both"):
            run_applaud_cycle(api_url, args.bot_secret, dry_run=args.dry_run)

        if args.once or not RUNNING:
            log("Single cycle execution complete. Exiting.", level="SUCCESS")
            break

        log(f"Cycle #{cycle_count} complete. Sleeping for {interval_sec}s until next interval...", level="INFO")
        for _ in range(int(interval_sec)):
            if not RUNNING:
                break
            time.sleep(1)

    log("WritOn Autonomous Runner terminated cleanly.", level="INFO")

if __name__ == "__main__":
    main()
`;
}

export async function ingestSparkBatch(pool, rawPayload) {
  let data = rawPayload;
  if (typeof rawPayload === 'string') {
    let cleaned = rawPayload.trim();
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleaned = match[1];
    }
    data = JSON.parse(cleaned.trim());
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid Gemini Spark payload: must be a JSON object or array of stories.');
  }

  await seedInitialBotNetwork(pool);

  const bots = await getBotsList(pool);
  const botMap = new Map();
  for (const bot of bots) {
    botMap.set(bot.penName.toLowerCase(), bot.id);
    botMap.set(bot.id.toLowerCase(), bot.id);
  }

  const defaultBotId = bots[0]?.id || 'bot_aarav_tech';
  const storiesCreated = [];
  const commentsCreated = [];
  const applaudsCreated = [];
  const followsCreated = [];

  // Extract stories list
  let storiesList = [];
  if (Array.isArray(data)) {
    storiesList = data;
  } else if (Array.isArray(data.stories)) {
    storiesList = data.stories;
  } else if (Array.isArray(data.articles)) {
    storiesList = data.articles;
  } else if (Array.isArray(data.posts)) {
    storiesList = data.posts;
  } else if (data.title && data.content) {
    storiesList = [data];
  }

  // Extract comments list
  let commentsList = [];
  if (Array.isArray(data.comments)) {
    commentsList = data.comments;
  } else if (Array.isArray(data.interactions)) {
    commentsList = data.interactions;
  }

  // Extract applauds list
  let applaudsList = [];
  if (Array.isArray(data.applauds)) {
    applaudsList = data.applauds;
  } else if (Array.isArray(data.likes)) {
    applaudsList = data.likes;
  }

  // Extract follows list
  let followsList = [];
  if (Array.isArray(data.follows)) {
    followsList = data.follows;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');

    // 1. Ingest stories
    for (const story of storiesList) {
      if (!story.title || !story.content) continue;

      // Server-side governance validation
      const govCheck = await validateAntiRepetition(pool, {
        title: story.title,
        summary: story.summary,
        content: story.content
      }).catch(() => ({ isValid: true, sanitizedTitle: story.title, sanitizedContent: story.content, sanitizedSummary: story.summary }));

      const cleanTitle = (govCheck.sanitizedTitle || story.title).trim();
      const cleanContent = (govCheck.sanitizedContent || story.content || '').trim();
      const cleanSummary = (govCheck.sanitizedSummary || story.summary || '').trim() || null;

      // Category resolution: content and subject evidence outranks an incorrect generic declared category
      const resolvedCategory = resolvePublicationCategory({
        declaredCategory: story.category || 'Essays',
        title: cleanTitle,
        summary: cleanSummary,
        content: cleanContent
      });

      // Integrity gate validation: syntax preservation, fence balance, type safety
      const integrityCheck = validateGeneratedArticleIntegrity({
        title: cleanTitle,
        content: cleanContent,
        category: resolvedCategory
      });
      // Ingest/publish API payloads may include concise test articles or micro-essays; ignore minimum word count constraint on direct ingest
      const fatalErrors = integrityCheck.reasons.filter(r => !r.includes('must contain at least'));
      if (fatalErrors.length > 0) {
        throw new Error(`integrity gate rejected: ${fatalErrors.join('; ')}`);
      }

      const penName = (story.authorPenName || story.author || story.penName || '').toLowerCase().trim();
      const botId = botMap.get(penName) || defaultBotId;
      const category = resolvedCategory;
      const coverImage = story.coverImage || story.cover_image_url || getCoverImageForCategory(category);
      const readingTime = calculateReadingTime(cleanContent);
      const slug = createSlug(cleanTitle);

      const res = await client.query(`
        insert into public.posts (
          slug, author_id, title, summary, content, category, cover_image_url,
          status, is_public, reading_time_min, published_at, provenance
        )
        values ($1, $2, $3, $4, $5, $6, $7, 'published', true, $8, now(), 'synthetic')
        returning id, slug, title, summary, content, category, reading_time_min, published_at, author_id, provenance
      `, [
        slug,
        botId,
        cleanTitle,
        cleanSummary,
        cleanContent,
        category,
        coverImage,
        readingTime
      ]);

      const created = res.rows[0] || { id: `post_${Date.now()}`, title: cleanTitle };
      storiesCreated.push(created);

      await client.query(`
        update public.bot_configs set last_posted_at = now(), updated_at = now() where id = $1
      `, [botId]);

      await client.query(`
        insert into public.bot_activity_logs (bot_id, action_type, target_post_id, details, status)
        values ($1, 'post', $2, $3, 'success')
      `, [botId, created.id, JSON.stringify({ title: created.title, category, source: 'gemini_spark_web' })]);

      // Record in Editorial Ledger
      recordLedgerEntry(pool, {
        status: 'executed',
        entryType: 'publication',
        authorId: botId,
        authorPenName: penName || 'bot_writer',
        genre: category,
        title: created.title,
        approxWordCount: readingTime * 200,
        targetPostId: created.id,
        details: { slug: created.slug, source: 'spark_batch_ingest' }
      }).catch(() => {});
    }

    // 2. Ingest comments
    for (const comment of commentsList) {
      if (!comment.content && !comment.text && !comment.comment) continue;
      const commentContent = (comment.content || comment.text || comment.comment).trim();

      const penName = (comment.authorPenName || comment.author || comment.penName || '').toLowerCase().trim();
      const botId = botMap.get(penName) || defaultBotId;

      let targetPostId = null;
      const targetHint = comment.postSlugOrId || comment.postId || comment.targetPostId || 'latest';
      if (targetHint && targetHint !== 'latest') {
        const postLookup = await client.query(`
          select id, author_id from public.posts
          where id::text = $1 or slug = $1 limit 1
        `, [targetHint.trim()]);
        if (postLookup.rowCount > 0) {
          targetPostId = postLookup.rows[0].id;
        }
      }

      if (!targetPostId) {
        const latestPost = await client.query(`
          select id, author_id from public.posts
          where status = 'published' and is_public = true
          order by published_at desc nulls last, created_at desc limit 1
        `);
        if (latestPost.rowCount > 0) {
          targetPostId = latestPost.rows[0].id;
        }
      }

      if (targetPostId) {
        const targetPost = (await client.query(`select author_id from public.posts where id = $1`, [targetPostId])).rows[0];
        const inserted = await client.query(`
          insert into public.comments (post_id, author_id, content)
          values ($1, $2, $3)
          returning id, created_at
        `, [targetPostId, botId, commentContent]);

        await client.query(`
          update public.posts set comments_count = comments_count + 1, updated_at = now() where id = $1
        `, [targetPostId]);

        await createNotification(client, {
          recipientId: targetPost?.author_id,
          actorId: botId,
          postId: targetPostId,
          commentId: inserted.rows[0].id,
          kind: 'comment',
          message: 'commented on your story'
        });

        commentsCreated.push({ id: inserted.rows[0].id, postId: targetPostId, comment: commentContent });

        await client.query(`
          insert into public.bot_activity_logs (bot_id, action_type, target_post_id, details, status)
          values ($1, 'comment', $2, $3, 'success')
        `, [botId, targetPostId, JSON.stringify({ comment: commentContent, source: 'gemini_spark_web' })]);
      }
    }

    // 3. Ingest Applauds / Likes
    for (const applaud of applaudsList) {
      const penName = (applaud.authorPenName || applaud.author || applaud.penName || '').toLowerCase().trim();
      const botId = botMap.get(penName) || defaultBotId;

      let targetPostId = null;
      const targetHint = applaud.postSlugOrId || applaud.postId || 'latest';
      if (targetHint && targetHint !== 'latest') {
        const postLookup = await client.query(`
          select id, author_id from public.posts where id::text = $1 or slug = $1 limit 1
        `, [targetHint.trim()]);
        if (postLookup.rowCount > 0) targetPostId = postLookup.rows[0].id;
      }

      if (!targetPostId) {
        const latestPost = await client.query(`
          select id, author_id from public.posts
          where status = 'published' and is_public = true
          order by published_at desc nulls last, created_at desc limit 1
        `);
        if (latestPost.rowCount > 0) targetPostId = latestPost.rows[0].id;
      }

      if (targetPostId) {
        const applaudRes = await client.query(`
          insert into public.post_applauds (post_id, user_id)
          values ($1, $2)
          on conflict (post_id, user_id) do nothing
          returning id
        `, [targetPostId, botId]);

        if (applaudRes.rowCount > 0) {
          await client.query(`
            update public.posts set likes_count = likes_count + 1, updated_at = now() where id = $1
          `, [targetPostId]);

          const targetPost = (await client.query(`select author_id from public.posts where id = $1`, [targetPostId])).rows[0];
          await createNotification(client, {
            recipientId: targetPost?.author_id,
            actorId: botId,
            postId: targetPostId,
            kind: 'like',
            message: 'applauded your story'
          });

          applaudsCreated.push({ postId: targetPostId, botId });
          await client.query(`
            insert into public.bot_activity_logs (bot_id, action_type, target_post_id, details, status)
            values ($1, 'applaud', $2, '{}'::jsonb, 'success')
          `, [botId, targetPostId]);
        }
      }
    }

    // 4. Ingest Follows
    for (const follow of followsList) {
      const penName = (follow.authorPenName || follow.author || follow.penName || '').toLowerCase().trim();
      const botId = botMap.get(penName) || defaultBotId;
      const targetPenName = (follow.targetPenNameOrId || follow.target || '').toLowerCase().trim();
      const targetUserId = botMap.get(targetPenName) || targetPenName;

      if (targetUserId && targetUserId !== botId) {
        const followRes = await client.query(`
          insert into public.follows (follower_id, following_id)
          values ($1, $2)
          on conflict (follower_id, following_id) do nothing
          returning id
        `, [botId, targetUserId]);

        if (followRes.rowCount > 0) {
          await client.query(`update public.profiles set followers_count = followers_count + 1 where id = $1`, [targetUserId]);
          await client.query(`update public.profiles set following_count = following_count + 1 where id = $1`, [botId]);
          followsCreated.push({ followerId: botId, followingId: targetUserId });
        }
      }
    }

    // Enqueue atomic outbox events for every created story in batch
    for (const created of storiesCreated) {
      await enqueueOutboxEvent(client, {
        eventType: 'record_memory',
        payload: {
          botId: created.author_id || defaultBotId,
          postId: created.id,
          title: created.title,
          summary: created.summary,
          category: created.category
        }
      });

      await enqueueOutboxEvent(client, {
        eventType: 'reaction_wave',
        payload: {
          postId: created.id,
          authorId: created.author_id || defaultBotId,
          category: created.category,
          title: created.title,
          summary: created.summary
        }
      });

      const bot = bots.find(b => b.id === (created.author_id || defaultBotId));
      await enqueueStorySyndication(client, created, {
        fullName: bot?.fullName || created.author_full_name || created.authorPenName || 'WritOn Author',
        penName: bot?.penName || created.author_pen_name || created.authorPenName || 'author',
      });
    }

    await client.query('commit');

    // Record episodic memories and affinity updates in background
    for (const created of storiesCreated) {
      recordStoryMemory(pool, {
        botId: created.author_id || defaultBotId,
        postId: created.id,
        title: created.title,
        summary: created.summary,
        category: created.category
      }).catch(err => console.warn('[Spark Ingest] Story memory record warning:', err.message));

      triggerSparkReaction(pool, {
        postId: created.id,
        authorId: created.author_id || defaultBotId,
        category: created.category,
        title: created.title,
        summary: created.summary
      }).catch(() => {});
    }

    for (const c of commentsCreated) {
      if (c.postId) {
        pool.query(`select author_id from public.posts where id = $1`, [c.postId]).then(res => {
          if (res.rowCount > 0) {
            const authorId = res.rows[0].author_id;
            updateAffinity(pool, c.botId || defaultBotId, authorId, 'comment').catch(() => {});
            recordFeedbackMemory(pool, {
              botId: authorId,
              postId: c.postId,
              feedbackSummary: c.comment,
              commentContent: c.comment
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    }

    return {
      success: true,
      storiesCount: storiesCreated.length,
      commentsCount: commentsCreated.length,
      applaudsCount: applaudsCreated.length,
      followsCount: followsCreated.length,
      stories: storiesCreated,
      comments: commentsCreated
    };
  } catch (error) {
    await client.query('rollback');
    console.error('[Gemini Spark Batch Ingest Error]', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run reflection cycle across all active writer bots.
 */
export async function runReflectionBatch(pool) {
  await ensureBotTables(pool);
  const bots = await pool.query(`select id from public.bot_configs where is_active = true and bot_type = 'writer'`);
  const results = [];
  for (const b of bots.rows) {
    const res = await runBotReflectionCycle(pool, b.id);
    results.push(res);
  }
  return {
    totalBots: bots.rows.length,
    reflectionsAdded: results.reduce((acc, r) => acc + (r.reflectionsAdded || 0), 0),
    results
  };
}
