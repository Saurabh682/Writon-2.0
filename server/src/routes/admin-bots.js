import { z } from 'zod';
import {
  getBotsList,
  getBotById,
  getGlobalSettings,
  updateGlobalSettings,
  seedInitialBotNetwork,
  seedReaderBotNetwork,
  getReaderBotsList,
  triggerReaderSwarm,
  seedCommenterBotNetwork,
  getCommenterBotsList,
  triggerCommenterWave,
  executePostAction,
  executeInteractAction,
  runSparkPulse,
  ingestSparkBatch,
  getSparkPromptTemplate,
  getSparkPythonAutomationScript,
  getPendingDelayedActions,
  cancelDelayedAction,
  scheduleDelayedAction,
  processDueDelayedActions,
  runReflectionBatch
} from '../bot-engine/spark-runner.js';
import {
  getBotMemories,
  recordStoryMemory,
  recordFeedbackMemory,
  getBotAffinityNetwork,
  runBotReflectionCycle
} from '../bot-engine/learning-service.js';
import { CURATED_BOT_PERSONAS } from '../bot-engine/curated-personas.js';
import { CURATED_COMMENTER_PERSONAS, generateAuthenticComment } from '../bot-engine/commenter-personas.js';

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

const sparkIngestSchema = z.object({
  stories: z.array(z.object({
    authorPenName: z.string().optional(),
    author: z.string().optional(),
    penName: z.string().optional(),
    title: z.string().min(1).max(300),
    summary: z.string().max(1000).optional().nullable(),
    content: z.string().min(1).max(100_000),
    category: z.string().max(100).optional(),
    coverImage: z.string().url().optional(),
  })).optional().default([]),
  comments: z.array(z.object({
    authorPenName: z.string().optional(),
    author: z.string().optional(),
    penName: z.string().optional(),
    postSlugOrId: z.string().optional(),
    postId: z.string().optional(),
    content: z.string().max(5000).optional(),
    text: z.string().max(5000).optional(),
    comment: z.string().max(5000).optional(),
  })).optional().default([]),
  applauds: z.array(z.object({
    authorPenName: z.string().optional(),
    author: z.string().optional(),
    penName: z.string().optional(),
    postSlugOrId: z.string().optional(),
    postId: z.string().optional(),
  })).optional().default([]),
  follows: z.array(z.object({
    authorPenName: z.string().optional(),
    author: z.string().optional(),
    penName: z.string().optional(),
    targetPenNameOrId: z.string().optional(),
    target: z.string().optional(),
  })).optional().default([]),
}).passthrough();

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
  const requireUser = options.requireUser;

  // Scoped Admin Sub-Plugin (Auth hook ONLY applies to routes inside adminScope)
  await fastify.register(async (adminScope) => {
    if (requireUser) {
      adminScope.addHook('preHandler', async (request, reply) => {
        // In development mode, allow unauthenticated access from the UI
        if (process.env.NODE_ENV === 'development' && !request.headers.authorization) {
          request.user = { uid: 'dev-admin', email: 'admin@writon.internal' };
          return;
        }

        // Allow admin secret key in header or Bearer token
        const adminSecret = process.env.ADMIN_SECRET_KEY;
        if (adminSecret) {
          const headerKey = request.headers['x-admin-key'];
          const bearer = request.headers.authorization?.startsWith('Bearer ')
            ? request.headers.authorization.substring(7)
            : null;
          if (headerKey === adminSecret || bearer === adminSecret) {
            request.user = { uid: 'secret-admin', email: 'admin@writon.internal' };
            return;
          }
        }

        return requireUser(request, reply);
      });
    }

    // Overview stats & status
    adminScope.get('/api/v1/admin/bots/overview', async (request, reply) => {
    try {
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
          (select count(*)::int from public.bot_configs where is_active = true and bot_type = 'writer') as "activeBotsCount",
          (select count(*)::int from public.bot_configs where is_active = true and bot_type = 'reader') as "activeReadersCount",
          (select count(*)::int from public.bot_configs where is_active = true and bot_type = 'commenter') as "activeCommentersCount",
          (select count(*)::int from public.bot_delayed_actions where status = 'pending') as "pendingActionsCount"
      `);

      return {
        settings,
        stats: statsResult.rows[0],
        botsCount: bots.length,
        recentLogs: logsResult.rows,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Bot operation failed', message: error.message });
    }
  });

    // Get all writer bot personas
    adminScope.get('/api/v1/admin/bots', async () => {
      const bots = await getBotsList(pool, { botType: 'writer' });
      return { bots };
    });

    // Seed 100 Reader Bot Network
    adminScope.post('/api/v1/admin/bots/seed-readers', async (request, reply) => {
      try {
        const outcome = await seedReaderBotNetwork(pool);
        return { success: true, message: `Successfully seeded ${outcome.count} reader bot personas!`, count: outcome.count };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to seed reader personas', message: error.message });
      }
    });

    // Get paginated reader bots
    adminScope.get('/api/v1/admin/bots/readers', async (request) => {
      const page = Math.max(1, Number(request.query?.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query?.limit) || 50));
      const category = request.query?.category || null;
      return await getReaderBotsList(pool, { page, limit, category });
    });

    // Trigger an on-demand reader applaud swarm on a post
    adminScope.post('/api/v1/admin/bots/trigger-swarm', async (request, reply) => {
      const { postId, count, intensity } = request.body || {};
      if (!postId) {
        return reply.code(400).send({ error: 'postId is required' });
      }
      try {
        const outcome = await triggerReaderSwarm(pool, { postId, count: count ? Number(count) : null, intensity });
        return outcome;
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to trigger reader swarm', message: error.message });
      }
    });

    // Seed 50 Commenter Bot Network
    adminScope.post('/api/v1/admin/bots/seed-commenters', async (request, reply) => {
      try {
        const outcome = await seedCommenterBotNetwork(pool);
        return { success: true, message: `Successfully seeded ${outcome.count} commenter bot personas!`, count: outcome.count };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to seed commenter personas', message: error.message });
      }
    });

    // Get paginated commenter bots
    adminScope.get('/api/v1/admin/bots/commenters', async (request) => {
      const page = Math.max(1, Number(request.query?.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query?.limit) || 50));
      const category = request.query?.category || null;
      return await getCommenterBotsList(pool, { page, limit, category });
    });

    // Trigger an on-demand commenter discussion wave on a post
    adminScope.post('/api/v1/admin/bots/trigger-comment-wave', async (request, reply) => {
    const { postId, category, title, snippet, count } = request.body || {};
    if (!postId) {
      return reply.code(400).send({ error: 'postId is required' });
    }
    try {
      const outcome = await triggerCommenterWave(pool, {
        postId,
        category: category || 'Essays',
        title: title || '',
        snippet: snippet || '',
        count: count ? Number(count) : null
      });
      return outcome;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to trigger commenter wave', message: error.message });
    }
  });

    // Generate test preview comment for a persona
    adminScope.post('/api/v1/admin/bots/preview-comment', async (request, reply) => {
      const { botId, depth, postTitle, category } = request.body || {};
      const persona = CURATED_COMMENTER_PERSONAS.find(c => c.id === botId) || CURATED_COMMENTER_PERSONAS[0];
      const comment = generateAuthenticComment(persona, {
        postTitle: postTitle || 'Sample Story Title',
        category: category || 'Essays',
        depth: depth || 'auto'
      });
      return { botId: persona.id, penName: persona.penName, depth, comment };
    });

    // Create a new bot persona
    adminScope.post('/api/v1/admin/bots', async (request, reply) => {
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
            insert into public.legacy_import_profile_attributes (profile_id, legacy_user_id, quote_of_day)
            values ($1, $2, $3)
            on conflict (profile_id) do update set quote_of_day = excluded.quote_of_day
          `, [botId, botId, data.quoteOfDay]);
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
    adminScope.put('/api/v1/admin/bots/:id', async (request, reply) => {
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
    adminScope.post('/api/v1/admin/bots/:id/toggle', async (request, reply) => {
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
    adminScope.get('/api/v1/admin/bots/settings', async () => {
      const settings = await getGlobalSettings(pool);
      return { settings };
    });

    // Update global settings
    adminScope.put('/api/v1/admin/bots/settings', async (request, reply) => {
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
    adminScope.post('/api/v1/admin/bots/seed', async (request, reply) => {
      try {
        const result = await seedInitialBotNetwork(pool);
        const bots = await getBotsList(pool);
        return { success: true, count: result.count, bots };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Bot operation failed', message: error.message });
      }
    });

    // Trigger on-demand post generation
    adminScope.post('/api/v1/admin/bots/trigger-post', async (request, reply) => {
      try {
        const parsed = triggerPostSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ error: 'Invalid post trigger data', details: parsed.error.flatten().fieldErrors });
        }

        const createdPost = await executePostAction(pool, parsed.data);
        return reply.code(201).send({ post: createdPost });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Bot operation failed', message: error.message });
      }
    });

    // Trigger on-demand interaction (like / comment / follow)
    adminScope.post('/api/v1/admin/bots/trigger-interact', async (request, reply) => {
      try {
        const parsed = triggerInteractSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.code(400).send({ error: 'Invalid interact trigger data', details: parsed.error.flatten().fieldErrors });
        }

        const outcome = await executeInteractAction(pool, parsed.data);
        return { outcome };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Bot operation failed', message: error.message });
      }
    });

    // Trigger pulse execution immediately
    adminScope.post('/api/v1/admin/bots/trigger-pulse', async (request, reply) => {
      try {
        const pulseResult = await runSparkPulse(pool);
        return { pulse: pulseResult };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Bot operation failed', message: error.message });
      }
    });

    // Get pending delayed actions queue
    adminScope.get('/api/v1/admin/bots/delayed-actions', async (request, reply) => {
      try {
        const limit = Math.min(50, Math.max(1, parseInt(request.query.limit, 10) || 20));
        const actions = await getPendingDelayedActions(pool, { limit });
        return { actions };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch delayed actions', message: error.message });
      }
    });

    // Cancel a pending delayed action
    adminScope.post('/api/v1/admin/bots/delayed-actions/:id/cancel', async (request, reply) => {
      try {
        const actionId = request.params.id;
        const cancelled = await cancelDelayedAction(pool, actionId);
        return { success: cancelled };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to cancel action', message: error.message });
      }
    });

    // Process all due actions immediately
    adminScope.post('/api/v1/admin/bots/delayed-actions/process-now', async (request, reply) => {
      try {
        const executed = await processDueDelayedActions(pool);
        return { success: true, count: executed.length, executed };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to process actions', message: error.message });
      }
    });

    // Fetch paginated activity logs
    adminScope.get('/api/v1/admin/bots/logs', async (request) => {
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
  });

  // Get pre-formatted prompt for https://gemini.google.com/spark
  fastify.get('/api/v1/spark/prompt-template', async () => {
    return {
      prompt: getSparkPromptTemplate(),
      instructions: 'Copy this prompt and paste it into https://gemini.google.com/spark to generate stories & comments without an API key.'
    };
  });

  // Get complete runnable Python automation script for Gemini Spark & cron tasks
  fastify.get('/api/v1/spark/automation-script', async (request) => {
    const host = request.headers.host || 'localhost:3001';
    const protocol = request.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;
    return {
      script: getSparkPythonAutomationScript(baseUrl),
      webhookUrl: `${baseUrl}/api/v1/spark/ingest`,
      instructions: 'Run this Python script inside Gemini Spark task automation or any recurring cron runner.'
    };
  });
  // Dedicated Single-Story Publishing Endpoint for ChatGPT Actions & Webhooks (100% Unauthenticated)
  fastify.post('/api/v1/spark/publish', async (request, reply) => {
    const raw = request.body || {};
    try {
      const outcome = await ingestSparkBatch(pool, {
        stories: [
          {
            authorPenName: raw.authorPenName || raw.author || raw.penName || 'auto',
            title: raw.title || 'Untitled Story',
            summary: raw.summary || null,
            content: raw.content || '',
            category: raw.category || 'Essays',
            coverImage: raw.coverImage || raw.coverImageUrl || null,
          }
        ]
      });
      const createdStory = outcome.stories?.[0];
      return reply.code(201).send({ success: true, story: createdStory, outcome });
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Dedicated Single Comment Endpoint
  fastify.post('/api/v1/spark/comment', async (request, reply) => {
    const { authorPenName, postId, content } = request.body || {};
    try {
      let targetPostId = postId;
      if (!targetPostId || targetPostId === 'latest') {
        const latestPost = await pool.query(`select id from public.posts where status = 'published' and is_public = true order by coalesce(published_at, created_at) desc limit 1`);
        targetPostId = latestPost.rows[0]?.id;
      }
      if (!targetPostId) return reply.code(404).send({ error: 'No published stories found to comment on' });

      const outcome = await ingestSparkBatch(pool, {
        comments: [
          {
            authorPenName: authorPenName || 'auto',
            postSlugOrId: targetPostId,
            content: content || 'A wonderfully evocative piece.'
          }
        ]
      });
      return reply.code(201).send({ success: true, comment: outcome.comments?.[0], outcome });
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Dedicated Single Applaud Endpoint
  fastify.post('/api/v1/spark/applaud', async (request, reply) => {
    const { authorPenName, postId } = request.body || {};
    try {
      let targetPostId = postId;
      if (!targetPostId || targetPostId === 'latest') {
        const latestPost = await pool.query(`select id from public.posts where status = 'published' and is_public = true order by coalesce(published_at, created_at) desc limit 1`);
        targetPostId = latestPost.rows[0]?.id;
      }
      if (!targetPostId) return reply.code(404).send({ error: 'No published stories found to applaud' });

      const outcome = await ingestSparkBatch(pool, {
        applauds: [
          {
            authorPenName: authorPenName || 'auto',
            postSlugOrId: targetPostId
          }
        ]
      });
      return reply.code(200).send({ success: true, outcome });
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Dedicated Feed Endpoint
  fastify.get('/api/v1/spark/feed', async (request) => {
    const limit = Math.min(30, Math.max(1, parseInt(request.query?.limit, 10) || 10));
    const category = request.query?.category || null;
    const result = await pool.query(`
      select p.id::text, p.title, p.slug, p.summary, p.category, p.reading_time_min as "readingTimeMin",
             p.likes_count as "likesCount", p.comments_count as "commentsCount",
             coalesce(p.published_at, p.created_at) as "createdAt",
             json_build_object('penName', author.pen_name, 'fullName', author.full_name, 'avatarUrl', author.avatar_url) as author
      from public.posts p
      inner join public.profiles author on author.id = p.author_id
      where p.status = 'published' and p.is_public = true
        and ($1::text is null or lower(p.category) = lower($1))
      order by coalesce(p.published_at, p.created_at) desc
      limit $2
    `, [category, limit]);
    return { count: result.rows.length, stories: result.rows };
  });

  // Spark ingest: open for automated bot publishing / ChatGPT Actions
  fastify.post('/api/v1/spark/ingest', async (request, reply) => {
    const botSecret = process.env.BOT_INGEST_SECRET;
    const headerSecret = request.headers['x-bot-secret'];
    if (botSecret && headerSecret && headerSecret !== botSecret) {
      return reply.code(401).send({ error: 'Invalid bot secret header' });
    }

    const rawPayload = request.body;
    const parsed = sparkIngestSchema.safeParse(rawPayload);
    if (typeof rawPayload === 'object' && !parsed.success) {
      return reply.code(400).send({ error: 'Invalid spark payload', details: parsed.error.flatten().fieldErrors });
    }
    try {
      const outcome = await ingestSparkBatch(pool, rawPayload);
      return reply.code(201).send(outcome);
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
  });

  // Public/Cloud Headless Endpoints for ChatGPT Actions, Plugins & Webhook Automations
  fastify.get('/api/v1/spark/personas', async (request) => {
    const category = request.query?.category || null;
    const limit = Math.min(100, Math.max(1, parseInt(request.query?.limit, 10) || 100));
    const offset = Math.max(0, parseInt(request.query?.offset, 10) || 0);

    const bots = await getBotsList(pool, { botType: 'writer' });
    let filtered = bots;
    if (category) {
      filtered = bots.filter(b => b.categories?.some(c => c.toLowerCase() === category.toLowerCase()));
    }
    const paginated = filtered.slice(offset, offset + limit);
    return {
      totalCount: filtered.length,
      limit,
      offset,
      personas: paginated.map(b => ({
        id: b.id,
        penName: b.penName,
        fullName: b.fullName,
        categories: b.categories,
        location: b.location,
        bio: b.bio,
        lastPostedAt: b.lastPostedAt,
        postFrequencyHours: b.postFrequencyHours,
        storiesCount: b.storiesCount
      }))
    };
  });

  fastify.post('/api/v1/spark/pulse', async (request, reply) => {
    try {
      const pulseResult = await runSparkPulse(pool);
      return { pulse: pulseResult };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Pulse execution failed', message: error.message });
    }
  });

  fastify.post('/api/v1/spark/swarm/applaud', async (request, reply) => {
    const { postId, count, intensity, category } = request.body || {};
    try {
      let targetPostId = postId;
      if (!targetPostId || targetPostId === 'latest') {
        const latestPost = await pool.query(`select id from public.posts where status = 'published' and is_public = true order by coalesce(published_at, created_at) desc limit 1`);
        targetPostId = latestPost.rows[0]?.id;
      }
      if (!targetPostId) return reply.code(404).send({ error: 'No published posts found' });

      const outcome = await triggerReaderSwarm(pool, { postId: targetPostId, count, intensity, category });
      return reply.code(200).send({ success: true, postId: targetPostId, outcome });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Swarm applaud failed', message: error.message });
    }
  });

  fastify.post('/api/v1/spark/swarm/comment', async (request, reply) => {
    const { postId, count, category } = request.body || {};
    try {
      let targetPostId = postId;
      if (!targetPostId || targetPostId === 'latest') {
        const latestPost = await pool.query(`select id, title, summary, category from public.posts where status = 'published' and is_public = true order by coalesce(published_at, created_at) desc limit 1`);
        if (latestPost.rowCount > 0) {
          targetPostId = latestPost.rows[0].id;
          const outcome = await triggerCommenterWave(pool, { postId: targetPostId, count, category: category || latestPost.rows[0].category, title: latestPost.rows[0].title, snippet: latestPost.rows[0].summary });
          return reply.code(200).send({ success: true, postId: targetPostId, outcome });
        }
      }
      if (!targetPostId) return reply.code(404).send({ error: 'No published posts found' });
      const outcome = await triggerCommenterWave(pool, { postId: targetPostId, count, category });
      return reply.code(200).send({ success: true, postId: targetPostId, outcome });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Commenter wave failed', message: error.message });
    }
  });

  // --- MEMORY & LEARNING ENDPOINTS ---

  fastify.get('/api/v1/spark/bots/:id/memories', async (request, reply) => {
    const { id } = request.params;
    const { limit, minImportance, type } = request.query || {};
    try {
      const memories = await getBotMemories(pool, id, {
        limit: Number(limit) || 10,
        minImportance: Number(minImportance) || 0.0,
        memoryType: type || null
      });
      const affinity = await getBotAffinityNetwork(pool, id, { limit: 8 });
      return { botId: id, count: memories.length, memories, affinityNetwork: affinity };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve bot memories', message: error.message });
    }
  });

  fastify.post('/api/v1/spark/bots/:id/memories', async (request, reply) => {
    const { id } = request.params;
    const { memoryType, subject, content, importanceScore, targetPostId } = request.body || {};
    try {
      if (!subject || !content) {
        return reply.code(400).send({ error: 'subject and content are required' });
      }
      const res = await pool.query(`
        insert into public.bot_memories (
          bot_id, memory_type, subject, content, importance_score, target_post_id, created_at, updated_at
        ) values ($1, coalesce($2, 'philosophical_reflection'), $3, $4, coalesce($5, 0.90), $6, now(), now())
        returning *
      `, [id, memoryType, subject, content, importanceScore, targetPostId || null]);
      return reply.code(201).send({ success: true, memory: res.rows[0] });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to record bot memory', message: error.message });
    }
  });

  fastify.post('/api/v1/spark/reflect', async (request, reply) => {
    const { botId } = request.body || {};
    try {
      if (botId) {
        const result = await runBotReflectionCycle(pool, botId);
        return { success: true, result };
      }
      const batchResult = await runReflectionBatch(pool);
      return { success: true, ...batchResult };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Reflection cycle failed', message: error.message });
    }
  });
}
