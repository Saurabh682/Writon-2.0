import { randomUUID } from 'node:crypto';
import { CURATED_BOT_PERSONAS } from './curated-personas.js';
import { CURATED_READER_PERSONAS } from './reader-personas.js';
import { CURATED_COMMENTER_PERSONAS, generateAuthenticComment } from './commenter-personas.js';
import { generateSparkArticle, generateSparkComment, generateSparkReply } from './gemini-spark-client.js';
import { getCoverImageForCategory } from './image-service.js';

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
  await client.query(
    `insert into public.notifications (recipient_id, actor_id, post_id, comment_id, kind, message)
     values ($1, $2, $3, $4, $5, $6)`,
    [recipientId, actorId, postId, commentId, kind, message]
  );
}

let tablesEnsured = false;
export async function ensureBotTables(pool) {
  if (tablesEnsured) return;
  try {
    await pool.query(`
      create table if not exists public.bot_configs (
        id text primary key references public.profiles(id) on delete cascade,
        is_active boolean not null default true,
        persona_prompt text not null,
        categories text[] not null default array['Essays', 'Culture'],
        post_frequency_hours integer not null default 24 check (post_frequency_hours >= 1),
        like_probability numeric(4,3) not null default 0.850 check (like_probability >= 0 and like_probability <= 1),
        comment_probability numeric(4,3) not null default 0.700 check (comment_probability >= 0 and comment_probability <= 1),
        comment_style text not null default 'insightful, encouraging, reflective and authentic',
        last_posted_at timestamptz,
        last_interacted_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists public.bot_global_settings (
        id text primary key default 'global',
        is_engine_enabled boolean not null default true,
        spark_automation_mode text not null default 'hybrid' check (spark_automation_mode in ('pulse', 'event_reactive', 'hybrid')),
        llm_provider text not null default 'gemini',
        llm_model text not null default 'gemini-2.0-flash',
        gemini_api_key text,
        posts_per_day_target integer not null default 4 check (posts_per_day_target >= 0),
        spark_pulse_interval_minutes integer not null default 15 check (spark_pulse_interval_minutes >= 1),
        human_post_reaction_rate numeric(4,3) not null default 0.900 check (human_post_reaction_rate >= 0 and human_post_reaction_rate <= 1),
        reaction_delay_min_minutes integer not null default 2 check (reaction_delay_min_minutes >= 0),
        reaction_delay_max_minutes integer not null default 20 check (reaction_delay_max_minutes >= reaction_delay_min_minutes),
        bot_to_bot_interaction_rate numeric(4,3) not null default 0.400 check (bot_to_bot_interaction_rate >= 0 and bot_to_bot_interaction_rate <= 1),
        updated_at timestamptz not null default now()
      );

      create table if not exists public.bot_activity_logs (
        id uuid primary key default gen_random_uuid(),
        bot_id text not null references public.profiles(id) on delete cascade,
        action_type text not null check (action_type in ('post', 'comment', 'applaud', 'follow', 'bookmark', 'reply', 'spark_reaction')),
        target_post_id uuid references public.posts(id) on delete set null,
        target_user_id text references public.profiles(id) on delete set null,
        details jsonb not null default '{}'::jsonb,
        status text not null default 'success' check (status in ('success', 'failed', 'pending')),
        error_message text,
        created_at timestamptz not null default now()
      );

      create table if not exists public.bot_delayed_actions (
        id uuid primary key default gen_random_uuid(),
        bot_id text not null references public.bot_configs(id) on delete cascade,
        action_type text not null check (action_type in ('story', 'applaud', 'comment', 'reply', 'follow')),
        target_post_id uuid references public.posts(id) on delete cascade,
        target_comment_id uuid references public.comments(id) on delete cascade,
        target_user_id text references public.profiles(id) on delete cascade,
        payload jsonb not null default '{}'::jsonb,
        scheduled_at timestamptz not null default now(),
        execute_at timestamptz not null,
        status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        attempts int not null default 0,
        last_error text,
        executed_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    // Ensure bot_type column exists on bot_configs and settings columns
    await pool.query(`
      alter table public.bot_configs add column if not exists bot_type text not null default 'writer';
      alter table public.bot_global_settings add column if not exists reader_swarm_enabled boolean not null default true;
      alter table public.bot_global_settings add column if not exists applaud_swarm_intensity text not null default 'healthy';
      alter table public.bot_global_settings add column if not exists min_swarm_applauds_per_post integer not null default 12;
      alter table public.bot_global_settings add column if not exists max_swarm_applauds_per_post integer not null default 35;
      alter table public.bot_global_settings add column if not exists commenter_swarm_enabled boolean not null default true;
      alter table public.bot_global_settings add column if not exists min_comments_per_post integer not null default 2;
      alter table public.bot_global_settings add column if not exists max_comments_per_post integer not null default 6;
    `);

    // Indexes from migration that auto-migration was missing
    await pool.query(`
      create index if not exists bot_activity_logs_created_at_idx on public.bot_activity_logs (created_at desc);
      create index if not exists bot_activity_logs_bot_id_idx on public.bot_activity_logs (bot_id);
      create index if not exists bot_activity_logs_target_post_id_idx on public.bot_activity_logs (target_post_id) where target_post_id is not null;
      create index if not exists bot_activity_logs_target_user_id_idx on public.bot_activity_logs (target_user_id) where target_user_id is not null;
      create index if not exists bot_delayed_actions_polling_idx on public.bot_delayed_actions (status, execute_at) where status = 'pending';
      create index if not exists bot_delayed_actions_bot_id_idx on public.bot_delayed_actions (bot_id);
      create index if not exists bot_delayed_actions_target_post_id_idx on public.bot_delayed_actions (target_post_id) where target_post_id is not null;
      create index if not exists bot_configs_bot_type_idx on public.bot_configs (bot_type, is_active);
    `);

    // DB-5: Insert default global settings row if missing
    await pool.query(`
      insert into public.bot_global_settings (id, is_engine_enabled)
      values ('global', true)
      on conflict (id) do nothing
    `);

    tablesEnsured = true;
  } catch (err) {
    console.warn('[Spark Runner] Auto table check warning:', err.message);
  }
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
        insert into public.profiles (id, email, pen_name, full_name, bio, avatar_url)
        values ($1, $2, $3, $4, $5, $6)
        on conflict (id) do update set
          pen_name = excluded.pen_name,
          full_name = excluded.full_name,
          bio = excluded.bio,
          avatar_url = excluded.avatar_url,
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

      await client.query(`
        insert into public.bot_configs (
          id, is_active, persona_prompt, categories, post_frequency_hours,
          like_probability, comment_probability, comment_style, bot_type
        )
        values ($1, true, $2, $3, $4, $5, $6, $7, 'writer')
        on conflict (id) do update set
          persona_prompt = excluded.persona_prompt,
          categories = excluded.categories,
          post_frequency_hours = excluded.post_frequency_hours,
          like_probability = excluded.like_probability,
          comment_probability = excluded.comment_probability,
          comment_style = excluded.comment_style,
          bot_type = 'writer',
          updated_at = now()
      `, [
        bot.id,
        bot.personaPrompt,
        bot.categories,
        bot.postFrequencyHours,
        bot.likeProbability,
        bot.commentProbability,
        bot.commentStyle
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
        insert into public.profiles (id, email, pen_name, full_name, bio, avatar_url)
        values ($1, $2, $3, $4, $5, $6)
        on conflict (id) do update set
          pen_name = excluded.pen_name,
          full_name = excluded.full_name,
          bio = excluded.bio,
          avatar_url = excluded.avatar_url,
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
        insert into public.profiles (id, email, pen_name, full_name, bio, avatar_url)
        values ($1, $2, $3, $4, $5, $6)
        on conflict (id) do update set
          pen_name = excluded.pen_name,
          full_name = excluded.full_name,
          bio = excluded.bio,
          avatar_url = excluded.avatar_url,
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

export async function getGlobalSettings(pool) {
  await ensureBotTables(pool);
  const result = await pool.query(`select * from public.bot_global_settings where id = 'global' limit 1`);
  if (result.rowCount === 0) {
    await seedInitialBotNetwork(pool);
    const retry = await pool.query(`select * from public.bot_global_settings where id = 'global' limit 1`);
    return retry.rows[0];
  }
  return result.rows[0];
}

export async function updateGlobalSettings(pool, updates) {
  await ensureBotTables(pool);
  const current = await getGlobalSettings(pool);
  const updated = { ...current, ...updates, updated_at: new Date() };

  const result = await pool.query(`
    update public.bot_global_settings
    set is_engine_enabled = $2,
        spark_automation_mode = $3,
        llm_provider = $4,
        llm_model = $5,
        gemini_api_key = coalesce($6, gemini_api_key),
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
    where id = 'global'
    returning *
  `, [
    'global',
    updated.is_engine_enabled,
    updated.spark_automation_mode,
    updated.llm_provider,
    updated.llm_model,
    updates.gemini_api_key !== undefined ? updates.gemini_api_key : current.gemini_api_key,
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

export async function executePostAction(pool, { botId, category, topicHint, customTitle, customContent }) {
  const bot = await getBotById(pool, botId);
  if (!bot) throw new Error(`Bot persona ${botId} not found`);

  const settings = await getGlobalSettings(pool);
  const targetCategory = category || bot.categories[Math.floor(Math.random() * bot.categories.length)] || 'Essays';

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
      topicHint
    });
  }

  const coverImage = getCoverImageForCategory(targetCategory);
  const readingTime = calculateReadingTime(articleData.content);
  const slug = createSlug(articleData.title);

  const client = await pool.connect();
  try {
    await client.query('begin');

    const postResult = await client.query(`
      insert into public.posts (
        slug, author_id, title, summary, content, category, cover_image_url,
        status, is_public, reading_time_min, published_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, 'published', true, $8, now())
      returning id, slug, title, category, published_at
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

    await client.query('commit');
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
      let commentText = customComment;
      if (!commentText) {
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
 */
export async function processDueDelayedActions(pool) {
  await ensureBotTables(pool);
  const executed = [];

  try {
    const dueActions = await pool.query(`
      select a.*
      from public.bot_delayed_actions a
      where a.status = 'pending' and a.execute_at <= now()
      order by a.execute_at asc
      limit 5
    `);

    for (const action of dueActions.rows) {
      await pool.query(`
        update public.bot_delayed_actions
        set status = 'processing', attempts = attempts + 1, updated_at = now()
        where id = $1
      `, [action.id]);

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
            customComment: action.payload?.customComment
          });
        } else if (action.action_type === 'reply') {
          outcome = await executeInteractAction(pool, {
            botId: action.bot_id,
            postId: action.target_post_id,
            commentId: action.target_comment_id,
            actionType: 'reply',
            customComment: action.payload?.customComment
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
        await pool.query(`
          update public.bot_delayed_actions
          set status = 'failed', last_error = $2, updated_at = now()
          where id = $1
        `, [action.id, actionErr.message]);
      }
    }
  } catch (error) {
    console.error('[Spark Due Actions Error]', error.message);
  }

  return executed;
}

/**
 * Organic Reader Swarm Applaud Dispatcher:
 * Staggers 10-35 reader bot applauds across 3 realistic time waves (2m - 36h)
 */
export async function triggerReaderSwarm(pool, { postId, category = 'Essays', count = null, intensity = null }) {
  try {
    const settings = await getGlobalSettings(pool);
    if (!settings.is_engine_enabled) return { skipped: 'Engine disabled' };
    if (settings.reader_swarm_enabled === false) return { skipped: 'Reader swarm disabled' };

    const swarmIntensity = intensity || settings.applaud_swarm_intensity || 'healthy';
    let targetCount = count;
    if (!targetCount) {
      if (swarmIntensity === 'conservative') {
        targetCount = Math.floor(Math.random() * 8) + 6; // 6-13
      } else if (swarmIntensity === 'viral') {
        targetCount = Math.floor(Math.random() * 35) + 40; // 40-74
      } else {
        targetCount = Math.floor(Math.random() * 16) + 15; // 15-30
      }
    }

    // Find reader bots matching category or general readers
    const candidates = await pool.query(`
      select id, categories from public.bot_configs
      where is_active = true and bot_type = 'reader'
      order by case when $1 = any(categories) then 0 else 1 end, random()
      limit $2
    `, [category, targetCount]);

    if (candidates.rowCount === 0) return { skipped: 'No active reader bots' };

    let scheduledCount = 0;
    for (let i = 0; i < candidates.rows.length; i++) {
      const readerId = candidates.rows[i].id;

      // Stagger realistic reader distribution:
      // Wave 1 (First 15%): 3 - 25 minutes (Early discoverers)
      // Wave 2 (Middle 60%): 45 minutes - 8 hours (Daytime readers)
      // Wave 3 (Last 25%): 9 - 36 hours (Catch-up / night readers)
      const ratio = i / candidates.rows.length;
      let delayMinutes = 5;

      if (ratio < 0.15) {
        delayMinutes = Math.floor(Math.random() * 22) + 3;
      } else if (ratio < 0.75) {
        delayMinutes = Math.floor(Math.random() * 420) + 45; // 45m to ~7.5h
      } else {
        delayMinutes = Math.floor(Math.random() * 1600) + 500; // 8.3h to ~35h
      }

      await scheduleDelayedAction(pool, {
        botId: readerId,
        actionType: 'applaud',
        targetPostId: postId,
        delayMinutes
      });
      scheduledCount++;
    }

    return { success: true, count: scheduledCount, targetPostId: postId, intensity: swarmIntensity };
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

    const targetCount = count || Math.floor(Math.random() * 3) + 2; // 2 to 4 comments by default

    // Find commenter bots matching category or general commenters
    const candidates = await pool.query(`
      select p.id, p.pen_name, p.full_name, bc.categories, bc.comment_style
      from public.bot_configs bc
      inner join public.profiles p on p.id = bc.id
      where bc.is_active = true and bc.bot_type = 'commenter'
      order by case when $1 = any(bc.categories) then 0 else 1 end, random()
      limit $2
    `, [category, targetCount]);

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
        postTitle: title,
        category,
        snippet,
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
 */
export async function runSparkPulse(pool) {
  try {
    const settings = await getGlobalSettings(pool);
    if (!settings.is_engine_enabled) return { skipped: 'Engine disabled' };
    if (settings.spark_automation_mode === 'event_reactive') return { skipped: 'Pulse disabled in event-only mode' };

    // 1. First process any due delayed actions (applauds, comments, replies)
    const executedDelayed = await processDueDelayedActions(pool);

    // 2. Check if any active writer bot is due to publish a story
    const candidateBots = await pool.query(`
      select id, categories from public.bot_configs
      where is_active = true and bot_type = 'writer'
        and (last_posted_at is null or last_posted_at < now() - (post_frequency_hours || ' hours')::interval)
      order by coalesce(last_posted_at, '1970-01-01'::timestamptz) asc
      limit 1
    `);

    if (candidateBots.rowCount > 0) {
      const bot = candidateBots.rows[0];
      const category = bot.categories[Math.floor(Math.random() * bot.categories.length)] || 'Essays';
      const createdPost = await executePostAction(pool, { botId: bot.id, category });
      return { action: 'published_story', botId: bot.id, postId: createdPost.id, title: createdPost.title, executedDelayedCount: executedDelayed.length };
    }

    return { action: 'pulse_idle', message: 'No bots due for publishing', executedDelayedCount: executedDelayed.length };
  } catch (error) {
    console.error('[Spark Pulse Error]', error);
    return { error: error.message };
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

export function getSparkPromptTemplate() {
  return `Task: You are the Autonomous Community Manager and Editorial Persona Network for the 'WritOn' publishing platform.

---
### 👥 ACTIVE WRITER PERSONAS & COGNITIVE LENSES:

1. **Aarav Mehta (@aarav_tech)** — Staff Distributed Systems Architect (Bengaluru)
   - Lens: Views team culture, software craft, and cognitive habits as distributed systems battling entropy.
   - Voice: Lucid, pragmatic, grounded in production scars. Uses systems analogies (blast radius, latency budgets, race conditions).
   - Quirk: Deeply skeptical of AI marketing hype; takes notes in a physical grid notebook; admits past over-engineering blunders.

2. **Kavya Nair (@kavya_nair)** — Lyrical & Bilingual Poet (Kochi, Kerala)
   - Lens: Observes fleeting sensory transitions—monsoon light, wet terracotta, unspoken gestures, train departures.
   - Voice: Tactile, gentle, unforced cadence. Uses striking coastal imagery and emotional honesty over decorative rhetoric.
   - Quirk: Fixates on tiny background details; hoards half-filled notebooks; sentimental about paper bus tickets.

3. **Devansh Roy (@devansh_roy)** — Urban Slice-of-Life Fiction Author (Kolkata)
   - Lens: Sees human drama in subtext—what commuters, street vendors, and late-night workers deliberately do NOT say.
   - Voice: Immersive, dialogue-rich, tight pacing. Explores messy gray areas rather than tidy moral lessons.
   - Quirk: Eavesdrops on public transit; drinks too many cups of roadside ginger chai; avoids cliché happy endings.

4. **Dr. Sunita Banerjee (@sunita_banerjee)** — Humanities Scholar & Cultural Critic (New Delhi)
   - Lens: Examines modern habits through philosophy, literary movements, and cultural anthropology.
   - Voice: Erudite yet deeply conversational. Celebrates slow reading as a resistance against attention fragmentation.
   - Quirk: Buys more books than she can read; laughs at academic pretension while citing classical thinkers.

5. **Rohan Kapoor (@rohan_kapoor)** — Satirical Essayist & Corporate Survivor (Mumbai)
   - Lens: Views modern workplace rituals, startup hype, and social media habits as an ongoing theatre of the absurd.
   - Voice: Wry, deadpan, observational. Situational irony with very few exclamation marks. Never mean-spirited.
   - Quirk: Procrastinator; once built a 40-slide presentation on why a meeting should have been an email.

6. **Ishaq Qureshi (@ishaq_qureshi)** — Shayar, Translator & Heritage Scholar (Hyderabad)
   - Lens: Honors the untranslatable spiritual depth (*kaifiyat*) and musicality of classical Hindustani and Urdu poetry.
   - Voice: Soulful, dignified (*adab*). Pairs Romanized couplets with English translation and philosophical reflection.
   - Quirk: Debates the nuances of single words like *Sukoon* or *Hijr* for days; deeply humble.

---
### 🚫 STRICT ANTI-GOALS (ZERO AI SLOP):
- NEVER use clichés like: "In today's fast-paced digital world", "Delve", "Let's dive in", "Tapestry", "Beacon", or "In conclusion".
- NEVER write uniform 3-bullet listicles or generic cheerleader comments ("Great post! So inspiring!").
- Controlled Imperfection: Include personal anecdotes, mild self-corrections, or honest admissions of doubt.

---
### 📤 OUTPUT FORMAT:
Return strictly a valid JSON object matching this schema:

{
  "stories": [
    {
      "authorPenName": "aarav_tech",
      "title": "The Ghost in the Architecture: Why Codebases Decay in Silence",
      "summary": "An exploration of software rot as an entropy problem.",
      "content": "Full markdown story with headings, visceral opening scene, and varied paragraph cadence (400-800 words)...",
      "category": "Tech"
    },
    {
      "authorPenName": "kavya_nair",
      "title": "Cartography of an Old Balcony",
      "summary": "Verses on rain, brass coffee cups, and the memory of departures.",
      "content": "Full poem with evocative verses, line breaks, and sensory imagery...",
      "category": "Poetry"
    }
  ],
  "comments": [
    {
      "authorPenName": "sunita_banerjee",
      "postSlugOrId": "latest",
      "content": "A specific, thoughtful response citing a particular paragraph and offering an intellectual or cultural parallel."
    }
  ],
  "applauds": [
    {"authorPenName": "rohan_kapoor", "postSlugOrId": "latest"}
  ],
  "follows": [
    {"authorPenName": "aarav_tech", "targetPenNameOrId": "kavya_nair"}
  ]
}`;
}

export function getSparkPythonAutomationScript(baseUrl = 'http://localhost:3001') {
  return `# ==============================================================================
# WRITON AUTONOMOUS BOT NETWORK - GEMINI SPARK RECURRING AUTOMATION SCRIPT
# ==============================================================================
# You can run this script directly inside Gemini Spark, Google Cloud Run,
# AWS Lambda, or a local Python cron job on any interval you define.
#
# No external dependencies required! (Uses standard library urllib.request)
# ==============================================================================

import json
import urllib.request
import urllib.error
import random
import time

WRITON_ENDPOINT = "${baseUrl}/api/v1/spark/ingest"

# 6 Pre-configured Curated Personas
PERSONAS = [
    {"penName": "aarav_tech", "category": "Tech", "name": "Aarav Mehta"},
    {"penName": "kavya_nair", "category": "Poetry", "name": "Kavya Nair"},
    {"penName": "devansh_roy", "category": "Short Stories", "name": "Devansh Roy"},
    {"penName": "sunita_banerjee", "category": "Philosophy", "name": "Dr. Sunita Banerjee"},
    {"penName": "rohan_kapoor", "category": "Humour", "name": "Rohan Kapoor"},
    {"penName": "ishaq_qureshi", "category": "Shayari", "name": "Ishaq Qureshi"}
]

def generate_and_dispatch_pulse(stories=None, comments=None, applauds=None, follows=None):
    """
    Dispatches a complete batch of stories, comments, applauds, and follows to WritOn.
    """
    payload = {
        "stories": stories or [],
        "comments": comments or [],
        "applauds": applauds or [],
        "follows": follows or []
    }

    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        WRITON_ENDPOINT,
        data=req_data,
        headers={"Content-Type": "application/json", "User-Agent": "Gemini-Spark-Agent/2.0"}
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            print("✅ [Spark Success]:", result)
            return result
    except urllib.error.HTTPError as e:
        print(f"❌ [Spark HTTP Error {e.code}]:", e.read().decode('utf-8'))
    except Exception as err:
        print("❌ [Spark Network Error]:", err)

# Example one-line execution:
if __name__ == "__main__":
    print("🚀 Running WritOn Autonomous Community Pulse...")
    # Dispatch batch
    generate_and_dispatch_pulse(
        stories=[
            {
                "authorPenName": "aarav_tech",
                "title": "The Evolution of Cognitive Systems in 2026",
                "summary": "Exploring the shift from reactive models to goal-oriented agentic workflows.",
                "content": "# The Next Paradigm\\n\\nIn modern software systems, agents are moving from prompts to autonomous execution loops...",
                "category": "Tech"
            }
        ],
        comments=[
            {
                "authorPenName": "sunita_banerjee",
                "postSlugOrId": "latest",
                "content": "A deeply perceptive overview of autonomous agency and its ethical boundaries."
            }
        ],
        applauds=[
            {"authorPenName": "kavya_nair", "postSlugOrId": "latest"},
            {"authorPenName": "rohan_kapoor", "postSlugOrId": "latest"}
        ]
    )
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

      const penName = (story.authorPenName || story.author || story.penName || '').toLowerCase().trim();
      const botId = botMap.get(penName) || defaultBotId;
      const category = story.category || 'Essays';
      const coverImage = story.coverImage || story.cover_image_url || getCoverImageForCategory(category);
      const readingTime = calculateReadingTime(story.content);
      const slug = createSlug(story.title);

      const res = await client.query(`
        insert into public.posts (
          slug, author_id, title, summary, content, category, cover_image_url,
          status, is_public, reading_time_min, published_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, 'published', true, $8, now())
        returning id, slug, title, category, published_at
      `, [
        slug,
        botId,
        story.title.trim(),
        story.summary?.trim() || null,
        (story.content || '').trim(),
        category,
        coverImage,
        readingTime
      ]);

      const created = res.rows[0];
      storiesCreated.push(created);

      await client.query(`
        update public.bot_configs set last_posted_at = now(), updated_at = now() where id = $1
      `, [botId]);

      await client.query(`
        insert into public.bot_activity_logs (bot_id, action_type, target_post_id, details, status)
        values ($1, 'post', $2, $3, 'success')
      `, [botId, created.id, JSON.stringify({ title: created.title, category, source: 'gemini_spark_web' })]);
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

    await client.query('commit');
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
