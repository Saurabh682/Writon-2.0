import { randomUUID } from 'node:crypto';
import { CURATED_BOT_PERSONAS } from './curated-personas.js';
import { generateSparkArticle, generateSparkComment } from './gemini-spark-client.js';
import { getCoverImageForCategory } from './image-service.js';

function createSlug(title) {
  const readable = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'story';
  return `${readable}-${randomUUID().slice(0, 8)}`;
}

function calculateReadingTime(content) {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
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

export async function seedInitialBotNetwork(pool) {
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
        insert into public.profiles (id, email, pen_name, full_name, bio, avatar_url, location)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (id) do update set
          pen_name = excluded.pen_name,
          full_name = excluded.full_name,
          bio = excluded.bio,
          avatar_url = excluded.avatar_url,
          location = excluded.location,
          updated_at = now()
      `, [
        bot.id,
        `${bot.penName}@bots.writon.internal`,
        bot.penName,
        bot.fullName,
        bot.bio,
        bot.avatarUrl,
        bot.location
      ]);

      if (bot.quoteOfDay) {
        await client.query(`
          insert into public.legacy_import_profile_attributes (profile_id, quote_of_day)
          values ($1, $2)
          on conflict (profile_id) do update set
            quote_of_day = excluded.quote_of_day
        `, [bot.id, bot.quoteOfDay]);
      }

      await client.query(`
        insert into public.bot_configs (
          id, is_active, persona_prompt, categories, post_frequency_hours,
          like_probability, comment_probability, comment_style
        )
        values ($1, true, $2, $3, $4, $5, $6, $7)
        on conflict (id) do update set
          persona_prompt = excluded.persona_prompt,
          categories = excluded.categories,
          post_frequency_hours = excluded.post_frequency_hours,
          like_probability = excluded.like_probability,
          comment_probability = excluded.comment_probability,
          comment_style = excluded.comment_style,
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

export async function getGlobalSettings(pool) {
  const result = await pool.query(`select * from public.bot_global_settings where id = 'global' limit 1`);
  if (result.rowCount === 0) {
    await seedInitialBotNetwork(pool);
    const retry = await pool.query(`select * from public.bot_global_settings where id = 'global' limit 1`);
    return retry.rows[0];
  }
  return result.rows[0];
}

export async function updateGlobalSettings(pool, updates) {
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
    updated.bot_to_bot_interaction_rate
  ]);

  return result.rows[0];
}

export async function getBotsList(pool) {
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
      bc.persona_prompt as "personaPrompt",
      bc.categories,
      bc.post_frequency_hours as "postFrequencyHours",
      bc.like_probability as "likeProbability",
      bc.comment_probability as "commentProbability",
      bc.comment_style as "commentStyle",
      bc.last_posted_at as "lastPostedAt",
      bc.last_interacted_at as "lastInteractedAt",
      (select count(*)::int from public.posts where author_id = p.id and status = 'published') as "storiesCount"
    from public.bot_configs bc
    inner join public.profiles p on p.id = bc.id
    left join public.legacy_import_profile_attributes alias on alias.profile_id = p.id
    order by p.full_name asc
  `);
  return result.rows;
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
      for update
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
 * Event-Driven Spark Reaction Hook
 * Fired whenever any user creates a new post on the platform.
 */
export async function triggerSparkReaction(pool, { postId, authorId, category, title, summary }) {
  try {
    const settings = await getGlobalSettings(pool);
    if (!settings.is_engine_enabled) return;
    if (settings.spark_automation_mode === 'pulse') return; // Event-reactive disabled in pulse-only mode

    const isHumanPost = !authorId.startsWith('bot_');
    if (!isHumanPost) {
      const roll = Math.random();
      if (roll > Number(settings.bot_to_bot_interaction_rate)) {
        return; // Bot-to-bot interaction roll passed
      }
    } else {
      const roll = Math.random();
      if (roll > Number(settings.human_post_reaction_rate)) {
        return;
      }
    }

    // Find 1-3 active bots that like this category or general bots
    const bots = await pool.query(`
      select id from public.bot_configs
      where is_active = true and id != $1
      order by case when $2 = any(categories) then 0 else 1 end, random()
      limit 3
    `, [authorId, category]);

    if (bots.rowCount === 0) return;

    // Dispatch asynchronous spark reactions with jittered delays
    for (let i = 0; i < bots.rows.length; i++) {
      const botId = bots.rows[i].id;
      // Stagger responses: Bot 0 in 3-8s (or mins in prod), Bot 1 in 8-15s, etc.
      const delayMs = (i + 1) * 4000 + Math.floor(Math.random() * 3000);

      setTimeout(async () => {
        try {
          // Applaud story
          await executeInteractAction(pool, { botId, postId, actionType: 'applaud' });

          // 70% chance to also leave a thoughtful comment
          if (Math.random() < 0.75) {
            setTimeout(async () => {
              try {
                await executeInteractAction(pool, { botId, postId, actionType: 'comment' });
              } catch (err) {
                console.error(`[Spark Trigger Comment Error] bot: ${botId}`, err.message);
              }
            }, 3500);
          }

          // If human writer, 50% chance for bot to follow
          if (isHumanPost && Math.random() < 0.50) {
            setTimeout(async () => {
              try {
                await executeInteractAction(pool, { botId, postId, actionType: 'follow' });
              } catch (err) {
                console.error(`[Spark Trigger Follow Error] bot: ${botId}`, err.message);
              }
            }, 7000);
          }
        } catch (err) {
          console.error(`[Spark Trigger Applaud Error] bot: ${botId}`, err.message);
        }
      }, delayMs);
    }
  } catch (error) {
    console.error('[Spark Trigger Error]', error.message);
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

    // 1. Check if any active bot is due to publish a story
    const candidateBots = await pool.query(`
      select id, categories from public.bot_configs
      where is_active = true
        and (last_posted_at is null or last_posted_at < now() - (post_frequency_hours || ' hours')::interval)
      order by coalesce(last_posted_at, '1970-01-01'::timestamptz) asc
      limit 1
    `);

    if (candidateBots.rowCount > 0) {
      const bot = candidateBots.rows[0];
      const category = bot.categories[Math.floor(Math.random() * bot.categories.length)] || 'Essays';
      const createdPost = await executePostAction(pool, { botId: bot.id, category });
      return { action: 'published_story', botId: bot.id, postId: createdPost.id, title: createdPost.title };
    }

    return { action: 'pulse_idle', message: 'No bots due for publishing' };
  } catch (error) {
    console.error('[Spark Pulse Error]', error);
    return { error: error.message };
  }
}

export function startSparkScheduler(pool, intervalMinutes = 15) {
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
  console.log(`[Gemini Spark] Pulse scheduler initialized (every ${intervalMinutes} min)`);
  const timer = setInterval(() => {
    runSparkPulse(pool).catch((err) => console.error('[Spark Scheduler Pulse Error]', err.message));
  }, intervalMs);

  return () => clearInterval(timer);
}
