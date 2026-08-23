import { z } from 'zod';
import {
  getBotsList,
  getBotById,
  getGlobalSettings,
  updateGlobalSettings,
  seedInitialBotNetwork,
  executePostAction,
  executeInteractAction,
  runSparkPulse
} from '../bot-engine/spark-runner.js';
import { CURATED_BOT_PERSONAS } from '../bot-engine/curated-personas.js';

const botUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  fullName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().max(2000).optional(),
  location: z.string().trim().max(120).optional(),
  quoteOfDay: z.string().trim().max(300).optional(),
  personaPrompt: z.string().trim().min(10).optional(),
  categories: z.array(z.string().trim()).min(1).optional(),
  postFrequencyHours: z.coerce.number().int().min(1).max(168).optional(),
  likeProbability: z.coerce.number().min(0).max(1).optional(),
  commentProbability: z.coerce.number().min(0).max(1).optional(),
  commentStyle: z.string().trim().min(5).optional(),
});

const botCreateSchema = z.object({
  penName: z.string().trim().toLowerCase().min(3).max(32).regex(/^[a-z0-9_]+$/),
  fullName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().max(2000).optional(),
  location: z.string().trim().max(120).optional(),
  quoteOfDay: z.string().trim().max(300).optional(),
  personaPrompt: z.string().trim().min(10),
  categories: z.array(z.string().trim()).min(1).default(['Essays', 'Culture']),
  postFrequencyHours: z.coerce.number().int().min(1).max(168).default(24),
  likeProbability: z.coerce.number().min(0).max(1).default(0.85),
  commentProbability: z.coerce.number().min(0).max(1).default(0.70),
  commentStyle: z.string().trim().min(5).default('insightful, constructive and warm'),
});

const globalSettingsSchema = z.object({
  isEngineEnabled: z.boolean().optional(),
  sparkAutomationMode: z.enum(['pulse', 'event_reactive', 'hybrid']).optional(),
  llmProvider: z.string().trim().default('gemini').optional(),
  llmModel: z.string().trim().default('gemini-2.0-flash').optional(),
  geminiApiKey: z.string().trim().nullable().optional(),
  postsPerDayTarget: z.coerce.number().int().min(0).max(50).optional(),
  sparkPulseIntervalMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  humanPostReactionRate: z.coerce.number().min(0).max(1).optional(),
  reactionDelayMinMinutes: z.coerce.number().int().min(0).max(60).optional(),
  reactionDelayMaxMinutes: z.coerce.number().int().min(0).max(120).optional(),
  botToBotInteractionRate: z.coerce.number().min(0).max(1).optional(),
});

const triggerPostSchema = z.object({
  botId: z.string().trim().min(1),
  category: z.string().trim().optional(),
  topicHint: z.string().trim().optional(),
  customTitle: z.string().trim().optional(),
  customContent: z.string().trim().optional(),
});

const triggerInteractSchema = z.object({
  botId: z.string().trim().min(1),
  postId: z.string().uuid(),
  actionType: z.enum(['applaud', 'like', 'comment', 'follow']),
  customComment: z.string().trim().optional(),
});

export async function adminBotsRoutes(fastify, options) {
  const pool = options.pool;

  // Overview stats & status
  fastify.get('/api/v1/admin/bots/overview', async () => {
    const settings = await getGlobalSettings(pool);
    const bots = await getBotsList(pool);
    const logsResult = await pool.query(`
      select log.id, log.bot_id as "botId", log.action_type as "actionType",
             log.target_post_id as "targetPostId", log.details, log.status,
             log.error_message as "errorMessage", log.created_at as "createdAt",
             p.full_name as "botName", p.avatar_url as "botAvatar"
      from public.bot_activity_logs log
      left join public.profiles p on p.id = log.bot_id
      order by log.created_at desc
      limit 20
    `);

    const statsResult = await pool.query(`
      select
        (select count(*)::int from public.posts where author_id like 'bot_%' and status = 'published') as "totalBotPosts",
        (select count(*)::int from public.comments where author_id like 'bot_%') as "totalBotComments",
        (select count(*)::int from public.post_applauds where user_id like 'bot_%') as "totalBotApplauds",
        (select count(*)::int from public.bot_configs where is_active = true) as "activeBotsCount"
    `);

    return {
      settings,
      stats: statsResult.rows[0],
      botsCount: bots.length,
      recentLogs: logsResult.rows,
    };
  });

  // Get all bot personas
  fastify.get('/api/v1/admin/bots', async () => {
    const bots = await getBotsList(pool);
    return { bots };
  });

  // Create a new bot persona
  fastify.post('/api/v1/admin/bots', async (request, reply) => {
    const parsed = botCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid bot data', details: parsed.error.flatten().fieldErrors });
    }

    const data = parsed.data;
    const botId = `bot_${data.penName}`;

    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`
        insert into public.profiles (id, email, pen_name, full_name, bio, avatar_url, location)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (id) do update set
          pen_name = excluded.pen_name,
          full_name = excluded.full_name,
          bio = excluded.bio,
          avatar_url = excluded.avatar_url,
          location = excluded.location
      `, [
        botId,
        `${data.penName}@bots.writon.internal`,
        data.penName,
        data.fullName,
        data.bio || null,
        data.avatarUrl || null,
        data.location || null
      ]);

      if (data.quoteOfDay) {
        await client.query(`
          insert into public.legacy_import_profile_attributes (profile_id, quote_of_day)
          values ($1, $2)
          on conflict (profile_id) do update set quote_of_day = excluded.quote_of_day
        `, [botId, data.quoteOfDay]);
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
          comment_style = excluded.comment_style
      `, [
        botId,
        data.personaPrompt,
        data.categories,
        data.postFrequencyHours,
        data.likeProbability,
        data.commentProbability,
        data.commentStyle
      ]);

      await client.query('commit');
      const created = await getBotById(pool, botId);
      return reply.code(201).send({ bot: created });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  // Update existing bot persona
  fastify.put('/api/v1/admin/bots/:id', async (request, reply) => {
    const botId = request.params.id;
    const parsed = botUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid update data', details: parsed.error.flatten().fieldErrors });
    }

    const current = await getBotById(pool, botId);
    if (!current) return reply.code(404).send({ error: 'Bot persona not found' });

    const data = parsed.data;
    const client = await pool.connect();
    try {
      await client.query('begin');

      if (data.fullName || data.bio !== undefined || data.avatarUrl !== undefined || data.location !== undefined) {
        await client.query(`
          update public.profiles
          set full_name = coalesce($2, full_name),
              bio = coalesce($3, bio),
              avatar_url = coalesce($4, avatar_url),
              location = coalesce($5, location),
              updated_at = now()
          where id = $1
        `, [
          botId,
          data.fullName || null,
          data.bio !== undefined ? data.bio : null,
          data.avatarUrl !== undefined ? data.avatarUrl : null,
          data.location !== undefined ? data.location : null
        ]);
      }

      if (data.quoteOfDay !== undefined) {
        await client.query(`
          insert into public.legacy_import_profile_attributes (profile_id, quote_of_day)
          values ($1, $2)
          on conflict (profile_id) do update set quote_of_day = excluded.quote_of_day
        `, [botId, data.quoteOfDay]);
      }

      await client.query(`
        update public.bot_configs
        set is_active = coalesce($2, is_active),
            persona_prompt = coalesce($3, persona_prompt),
            categories = coalesce($4, categories),
            post_frequency_hours = coalesce($5, post_frequency_hours),
            like_probability = coalesce($6, like_probability),
            comment_probability = coalesce($7, comment_probability),
            comment_style = coalesce($8, comment_style),
            updated_at = now()
        where id = $1
      `, [
        botId,
        data.isActive !== undefined ? data.isActive : null,
        data.personaPrompt || null,
        data.categories || null,
        data.postFrequencyHours || null,
        data.likeProbability !== undefined ? data.likeProbability : null,
        data.commentProbability !== undefined ? data.commentProbability : null,
        data.commentStyle || null
      ]);

      await client.query('commit');
      const updated = await getBotById(pool, botId);
      return { bot: updated };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  // Toggle active status
  fastify.post('/api/v1/admin/bots/:id/toggle', async (request, reply) => {
    const botId = request.params.id;
    const current = await getBotById(pool, botId);
    if (!current) return reply.code(404).send({ error: 'Bot persona not found' });

    const newActiveState = !current.isActive;
    await pool.query(`update public.bot_configs set is_active = $2, updated_at = now() where id = $1`, [
      botId,
      newActiveState
    ]);
    return { id: botId, isActive: newActiveState };
  });

  // Get global settings
  fastify.get('/api/v1/admin/bots/settings', async () => {
    const settings = await getGlobalSettings(pool);
    return { settings };
  });

  // Update global settings
  fastify.put('/api/v1/admin/bots/settings', async (request, reply) => {
    const parsed = globalSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid settings data', details: parsed.error.flatten().fieldErrors });
    }

    const d = parsed.data;
    const updated = await updateGlobalSettings(pool, {
      is_engine_enabled: d.isEngineEnabled,
      spark_automation_mode: d.sparkAutomationMode,
      llm_provider: d.llmProvider,
      llm_model: d.llmModel,
      gemini_api_key: d.geminiApiKey,
      posts_per_day_target: d.postsPerDayTarget,
      spark_pulse_interval_minutes: d.sparkPulseIntervalMinutes,
      human_post_reaction_rate: d.humanPostReactionRate,
      reaction_delay_min_minutes: d.reactionDelayMinMinutes,
      reaction_delay_max_minutes: d.reactionDelayMaxMinutes,
      bot_to_bot_interaction_rate: d.botToBotInteractionRate,
    });

    return { settings: updated };
  });

  // 1-Click seed starter bots
  fastify.post('/api/v1/admin/bots/seed', async () => {
    const result = await seedInitialBotNetwork(pool);
    const bots = await getBotsList(pool);
    return { success: true, count: result.count, bots };
  });

  // Trigger on-demand post generation
  fastify.post('/api/v1/admin/bots/trigger-post', async (request, reply) => {
    const parsed = triggerPostSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid post trigger data', details: parsed.error.flatten().fieldErrors });
    }

    const createdPost = await executePostAction(pool, parsed.data);
    return reply.code(201).send({ post: createdPost });
  });

  // Trigger on-demand interaction (like / comment / follow)
  fastify.post('/api/v1/admin/bots/trigger-interact', async (request, reply) => {
    const parsed = triggerInteractSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid interact trigger data', details: parsed.error.flatten().fieldErrors });
    }

    const outcome = await executeInteractAction(pool, parsed.data);
    return { outcome };
  });

  // Trigger pulse execution immediately
  fastify.post('/api/v1/admin/bots/trigger-pulse', async () => {
    const pulseResult = await runSparkPulse(pool);
    return { pulse: pulseResult };
  });

  // Fetch paginated activity logs
  fastify.get('/api/v1/admin/bots/logs', async (request) => {
    const page = Math.max(1, parseInt(request.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit, 10) || 30));
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      select log.id, log.bot_id as "botId", log.action_type as "actionType",
             log.target_post_id as "targetPostId", log.details, log.status,
             log.error_message as "errorMessage", log.created_at as "createdAt",
             p.full_name as "botName", p.avatar_url as "botAvatar",
             post.title as "postTitle"
      from public.bot_activity_logs log
      left join public.profiles p on p.id = log.bot_id
      left join public.posts post on post.id = log.target_post_id
      order by log.created_at desc
      limit $1 offset $2
    `, [limit + 1, offset]);

    return {
      logs: result.rows.slice(0, limit),
      pagination: {
        page,
        limit,
        hasMore: result.rows.length > limit
      }
    };
  });
}
