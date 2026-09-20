import { randomUUID } from 'node:crypto';
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
import {
  getEditorialBriefing,
  getEditorialState,
  getEditorialCanvas,
  getEditorialCanvasHistory,
  saveEditorialCanvas,
  CanvasRevisionConflict,
  recordLedgerEntry,
  updateLedgerEntryStatus,
  getLedgerEntries,
  addIdeaToBacklog,
  updateBacklogIdeaStatus,
  addAntiRepetitionPattern
} from '../bot-engine/editorial-ledger-service.js';
import { CURATED_BOT_PERSONAS } from '../bot-engine/curated-personas.js';
import { CURATED_COMMENTER_PERSONAS, generateAuthenticComment } from '../bot-engine/commenter-personas.js';
import { getLiveDailyTrends, seedDailyTrendsToBacklog } from '../bot-engine/trend-scout-service.js';
import { runMasterSchedulerTick } from '../bot-engine/master-scheduler.js';
import { processOutboxEvents } from '../bot-engine/outbox-service.js';
import { auditTextQuality } from '../services/human-voice-prompt.js';
import {
  computeBrainHash,
  evaluateBlockers,
  evaluateRepetition,
  generateDraftsFromInsight,
  dispatchCandidateVersion,
  REPETITION_ENGINE_VERSION,
  BLOCKER_ENGINE_VERSION
} from '../services/x-bot-service.js';
import { loadEditorialBrain } from '../services/editorial-brain.js';

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

const ledgerEntryInputSchema = z.object({
  editionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['planned', 'executed', 'deferred', 'avoid']).default('executed'),
  entryType: z.enum(['publication', 'comment_wave', 'applaud_swarm', 'reflection', 'anti_repetition_rule', 'future_idea']).default('publication'),
  authorId: z.string().trim().optional().nullable(),
  authorPenName: z.string().trim().optional().nullable(),
  genre: z.string().trim().optional().nullable(),
  languageStyle: z.string().trim().default('English').optional(),
  title: z.string().trim().max(300).optional().nullable(),
  theme: z.string().trim().max(300).optional().nullable(),
  approxWordCount: z.coerce.number().int().min(0).max(50000).optional().nullable(),
  details: z.record(z.any()).default({}).optional(),
  avoidReason: z.string().trim().max(500).optional().nullable(),
  targetPostId: z.string().uuid().optional().nullable(),
});

const ledgerStatusUpdateSchema = z.object({
  status: z.enum(['planned', 'executed', 'deferred', 'avoid']),
  targetPostId: z.string().uuid().optional().nullable(),
  details: z.record(z.any()).optional().nullable(),
  avoidReason: z.string().trim().max(500).optional().nullable(),
});

const ideaBacklogInputSchema = z.object({
  targetAuthorPenName: z.string().trim().optional().nullable(),
  genre: z.string().trim().default('Essays').optional(),
  proposedTitle: z.string().trim().min(1).max(300),
  premise: z.string().trim().min(1).max(5000),
  languageStyle: z.string().trim().default('English').optional(),
});

const ideaStatusUpdateSchema = z.object({
  status: z.enum(['backlog', 'planned', 'executed', 'discarded']),
});

const antiRepetitionRuleSchema = z.object({
  patternType: z.enum(['title_formula', 'opening_phrase', 'overused_theme', 'cliche_phrase', 'interaction_formula']).default('cliche_phrase'),
  pattern: z.string().trim().min(1).max(300),
  reason: z.string().trim().max(500).optional(),
});

const canvasDocumentIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const canvasEvidenceResultSchema = z.enum(['pending', 'passed', 'not_applicable']);
const canvasEvidenceSchema = z.object({
  rights: canvasEvidenceResultSchema,
  localization: canvasEvidenceResultSchema,
  asset: canvasEvidenceResultSchema,
  link: canvasEvidenceResultSchema,
  qa: canvasEvidenceResultSchema,
});
const governedCanvasStatuses = new Set(['approved', 'scheduled', 'published', 'measured']);
const canvasSlotSchema = z.union([
  z.string().max(10_000), // Legacy caption-only local state.
  z.object({
    caption: z.string().max(10_000).optional(),
    status: z.enum([
      'idea', 'planned_draft', 'ready', 'sourced', 'rights_verified', 'copy_ready',
      'localized', 'designed', 'qa_passed', 'approved', 'scheduled', 'published',
      'measured', 'blocked'
    ]).optional(),
    postedUrl: z.union([z.string().url().max(2_000), z.literal('')]).optional(),
    owner: z.string().trim().max(100).optional(),
    nextAction: z.string().trim().max(500).optional(),
    blockerReason: z.string().trim().max(1_000).optional(),
    evidence: canvasEvidenceSchema.optional(),
  }).passthrough().superRefine((slot, context) => {
    if (slot.status === 'blocked' && !slot.blockerReason) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Blocked deliveries require a reason.', path: ['blockerReason'] });
    }
    if (governedCanvasStatuses.has(slot.status)) {
      if (!slot.evidence || Object.values(slot.evidence).some(result => result === 'pending')) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Approval requires resolved evidence.', path: ['evidence'] });
      }
    }
  }),
]);
const canvasSaveSchema = z.object({
  expectedRevision: z.number().int().min(0),
  state: z.record(canvasSlotSchema).refine(value => Object.keys(value).length <= 250, 'Canvas contains too many entries'),
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
      const settings = await getGlobalSettings(pool, { maskSecrets: true });
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
      return reply.code(500).send({ error: 'Bot operation failed. Please check server logs.' });
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
      const settings = await getGlobalSettings(pool, { maskSecrets: true });
      return { settings };
    });

    // Update global settings
    adminScope.put('/api/v1/admin/bots/settings', async (request, reply) => {
      const parsed = globalSettingsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid settings data', details: parsed.error.flatten().fieldErrors });
      }

      const d = parsed.data;
      await updateGlobalSettings(pool, {
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

      const maskedSettings = await getGlobalSettings(pool, { maskSecrets: true });
      return { settings: maskedSettings };
    });

    // 1-Click seed starter bots
    adminScope.post('/api/v1/admin/bots/seed', async (request, reply) => {
      try {
        const result = await seedInitialBotNetwork(pool);
        const bots = await getBotsList(pool);
        return { success: true, count: result.count, bots };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Bot seeding failed. Please check server logs.' });
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
        return reply.code(500).send({ error: 'Bot post generation failed. Please check server logs.' });
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
        return reply.code(500).send({ error: 'Bot interaction failed. Please check server logs.' });
      }
    });

    // Trigger pulse execution immediately
    adminScope.post('/api/v1/admin/bots/trigger-pulse', async (request, reply) => {
      try {
        const pulseResult = await runSparkPulse(pool);
        return { pulse: pulseResult };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Pulse execution failed. Please check server logs.' });
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
        return reply.code(500).send({ error: 'Failed to fetch delayed actions.' });
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
        return reply.code(500).send({ error: 'Failed to cancel action.' });
      }
    });

    // Process all due actions immediately
    adminScope.post('/api/v1/admin/bots/delayed-actions/process-now', async (request, reply) => {
      try {
        const executed = await processDueDelayedActions(pool);
        return { success: true, count: executed.length, executed };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to process actions.' });
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

  // Human Voice Linter Endpoint — accessible globally for bots, scripts, webhooks, or cloud services
  fastify.post('/api/v1/spark/lint-voice', async (request, reply) => {
    const { text, content } = request.body || {};
    const candidate = text || content;
    if (!candidate || typeof candidate !== 'string') {
      return reply.code(400).send({
        error: 'Missing required field "text" or "content" in request body.'
      });
    }
    const audit = auditTextQuality(candidate);
    return reply.code(200).send({
      success: true,
      humanityScore: audit.score,
      passed: audit.passed,
      status: audit.passed ? 'PASS' : 'FLAGGED',
      stats: audit.stats,
      issues: audit.issues
    });
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
        and ($1::text is null or lower($1) = 'all' or lower(p.category) = lower($1))
      order by coalesce(p.published_at, p.created_at) desc
      limit $2
    `, [category, limit]);
    return { count: result.rows.length, stories: result.rows };
  });

  // Live Daily Trends Discovery (Google Trends & X/Twitter Discourse)
  fastify.get('/api/v1/spark/trends', async () => {
    try {
      const trends = await getLiveDailyTrends();
      return { success: true, ...trends };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Seed Daily Trends directly into Editorial Backlog
  fastify.post('/api/v1/spark/trends/seed', async (request, reply) => {
    try {
      const result = await seedDailyTrendsToBacklog(pool);
      return reply.code(201).send(result);
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
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
      return reply.code(500).send({ error: 'Pulse execution failed. Please check server logs.' });
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
      return reply.code(500).send({ error: 'Swarm applaud failed. Please check server logs.' });
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
      return reply.code(500).send({ error: 'Commenter wave failed. Please check server logs.' });
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
      return reply.code(500).send({ error: 'Failed to retrieve bot memories.' });
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
      return reply.code(500).send({ error: 'Failed to record bot memory.' });
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
      return reply.code(500).send({ error: 'Reflection cycle failed.' });
    }
  });

  // --- EDITORIAL LEDGER & BRIEFING ENDPOINTS ---

  const requireAdminOrBotSecret = async (request, reply) => {
    // In development mode without explicit auth headers, allow local execution
    if (process.env.NODE_ENV === 'development' && !request.headers.authorization && !request.headers['x-admin-key'] && !request.headers['x-bot-secret']) {
      request.user = { uid: 'dev-admin', email: 'admin@writon.internal' };
      return;
    }

    const adminSecret = process.env.ADMIN_SECRET_KEY;
    const botSecret = process.env.BOT_INGEST_SECRET;
    const headerKey = request.headers['x-admin-key'];
    const headerSecret = request.headers['x-bot-secret'];
    const bearer = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.substring(7)
      : null;

    if (adminSecret && (headerKey === adminSecret || bearer === adminSecret)) {
      request.user = { uid: 'secret-admin', email: 'admin@writon.internal' };
      return;
    }
    if (botSecret && (headerSecret === botSecret || bearer === botSecret)) {
      request.user = { uid: 'secret-bot', email: 'bot@writon.internal' };
      return;
    }
    if (request.user) return;

    return reply.code(401).send({ error: 'Authentication required. Provide valid X-Admin-Key, X-Bot-Secret, or Bearer token.' });
  };

  const requireCanvasAdmin = async (request, reply) => {
    if (process.env.NODE_ENV === 'development' && !request.headers.authorization && !request.headers['x-admin-key']) return;
    const adminSecret = process.env.ADMIN_SECRET_KEY;
    const bearer = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.substring(7)
      : null;
    if (adminSecret && (request.headers['x-admin-key'] === adminSecret || bearer === adminSecret)) return;
    return reply.code(401).send({ error: 'Admin authentication required.' });
  };

  fastify.get('/api/v1/admin/editorial/canvas/:documentId', { preHandler: requireCanvasAdmin }, async (request, reply) => {
    const parsedId = canvasDocumentIdSchema.safeParse(request.params.documentId);
    if (!parsedId.success) return reply.code(400).send({ error: 'Invalid canvas document ID.' });
    try {
      return await getEditorialCanvas(pool, parsedId.data);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to load editorial canvas.' });
    }
  });

  fastify.put('/api/v1/admin/editorial/canvas/:documentId', { preHandler: requireCanvasAdmin }, async (request, reply) => {
    const parsedId = canvasDocumentIdSchema.safeParse(request.params.documentId);
    const parsedBody = canvasSaveSchema.safeParse(request.body || {});
    if (!parsedId.success || !parsedBody.success) return reply.code(400).send({ error: 'Invalid canvas state.' });
    try {
      return await saveEditorialCanvas(pool, {
        documentId: parsedId.data,
        ...parsedBody.data,
        changedBy: request.user?.email || request.user?.uid || 'admin-secret',
      });
    } catch (error) {
      if (error instanceof CanvasRevisionConflict) {
        return reply.code(409).send({ error: error.message, currentRevision: error.currentRevision });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to save editorial canvas.' });
    }
  });

  fastify.get('/api/v1/admin/editorial/canvas/:documentId/history', { preHandler: requireCanvasAdmin }, async (request, reply) => {
    const parsedId = canvasDocumentIdSchema.safeParse(request.params.documentId);
    if (!parsedId.success) return reply.code(400).send({ error: 'Invalid canvas document ID.' });
    try {
      return { revisions: await getEditorialCanvasHistory(pool, parsedId.data, request.query?.limit) };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to load canvas history.' });
    }
  });

  // =========================================================================
  // X BOT DEDICATED BRAIN-GOVERNED ENDPOINTS
  // =========================================================================

  // 1. Brain Constitution & Bot Status
  fastify.get('/api/v1/x-bot/brain-status', async (request, reply) => {
    try {
      const brain = loadEditorialBrain();
      const brainHash = computeBrainHash();
      return {
        brain_version: brain.schema_version || '1.0.0',
        brain_hash: brainHash,
        last_updated: brain.last_updated,
        insights_count: (brain.insights || []).length,
        archetypes: Object.keys(brain.proposition_archetypes || {}),
        blocker_engine_version: BLOCKER_ENGINE_VERSION,
        repetition_engine_version: REPETITION_ENGINE_VERSION,
      };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 2. High-Level X Bot Operational Overview
  fastify.get('/api/v1/x-bot/overview', async (request, reply) => {
    try {
      const brain = loadEditorialBrain();
      const brainHash = computeBrainHash();

      let activeCandidates = 0;
      let approvedCandidates = 0;
      let reconciliationCount = 0;
      let totalDispatches = 0;
      let lastDispatch = null;
      let recentDispatches = [];

      try {
        const countsRes = await pool.query(`
          select
            count(*) filter (where status in ('drafted', 'evaluating'))::int as "activeCount",
            count(*) filter (where status = 'approved')::int as "approvedCount",
            count(*) filter (where status = 'reconciliation_required')::int as "reconciliationCount"
          from public.x_bot_candidate_versions
        `);
        if (countsRes.rowCount > 0) {
          activeCandidates = countsRes.rows[0].activeCount || 0;
          approvedCandidates = countsRes.rows[0].approvedCount || 0;
          reconciliationCount = countsRes.rows[0].reconciliationCount || 0;
        }

        const dispRes = await pool.query(`
          select id, candidate_id, candidate_version, published_root_text, published_reply_text,
                 status, dispatched_at, error_message
          from public.x_bot_dispatches
          order by dispatched_at desc
          limit 10
        `);
        recentDispatches = dispRes.rows;
        totalDispatches = dispRes.rowCount;
        lastDispatch = recentDispatches[0] || null;
      } catch {
        // Fallback gracefully if DB tables haven't been seeded yet
      }

      // Next eligible window check (minimum 2h channel cooldown)
      let channelCooldownHours = 0;
      let isChannelEligible = true;
      if (lastDispatch && lastDispatch.status === 'succeeded') {
        const hoursAgo = (Date.now() - new Date(lastDispatch.dispatched_at).getTime()) / (3600 * 1000);
        if (hoursAgo < 2.0) {
          channelCooldownHours = Number((2.0 - hoursAgo).toFixed(1));
          isChannelEligible = false;
        }
      }

      return {
        brain_version: brain.schema_version || '1.0.0',
        brain_hash: brainHash,
        insights_count: (brain.insights || []).length,
        channel_eligible: isChannelEligible,
        cooldown_hours_remaining: channelCooldownHours,
        stats: {
          activeCandidates,
          approvedCandidates,
          reconciliationCount,
          totalDispatches,
          lastDispatchAt: lastDispatch?.dispatched_at || null,
        },
        recentDispatches,
      };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 3. List Candidates with Immutable Versions
  fastify.get('/api/v1/x-bot/candidates', async (request, reply) => {
    try {
      const statusFilter = request.query?.status || null;
      let query = `
        select c.id, c.insight_id, c.active_draft_version,
               v.version, v.brain_version, v.brain_hash, v.proposition, v.hook_type,
               v.text, v.reply_text, v.status, v.provenance, v.evidence_bundle,
               v.created_at, v.approved_at, v.scheduled_for, v.autonomous_allowed
        from public.x_bot_candidates c
        inner join public.x_bot_candidate_versions v
          on v.candidate_id = c.id and v.version = c.active_draft_version
      `;
      const params = [];
      if (statusFilter && statusFilter !== 'all') {
        query += ` where v.status = $1`;
        params.push(statusFilter);
      }
      query += ` order by v.created_at desc limit 50`;

      const result = await pool.query(query, params);
      return { candidates: result.rows };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 4. Generate Fresh X-Native Candidates from Editorial Brain
  fastify.post('/api/v1/x-bot/candidates/generate', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    try {
      const brain = loadEditorialBrain();
      const brainHash = computeBrainHash();
      const generated = [];

      // Query format matching x_root_tweet
      const targetInsights = (brain.insights || []).filter(i =>
        i.provenance?.cross_platform_formats?.includes('x_root_tweet')
      );

      for (const insight of targetInsights.slice(0, 5)) {
        const drafts = generateDraftsFromInsight(insight, brainHash);
        for (const draft of drafts) {
          const candId = `xc_${insight.id.slice(0, 16)}_${draft.hook_type.slice(0, 4)}_${Date.now().toString(36).slice(-4)}`;

          await pool.query(
            `insert into public.x_bot_candidates (id, insight_id, active_draft_version)
             values ($1, $2, 1)
             on conflict (id) do nothing`,
            [candId, insight.id]
          );

          await pool.query(
            `insert into public.x_bot_candidate_versions
               (candidate_id, version, brain_version, brain_hash, proposition, hook_type, text, reply_text, status, provenance, evidence_bundle, source_snapshot_hash)
             values ($1, 1, $2, $3, $4, $5, $6, $7, 'drafted', $8, $9, $10)
             on conflict do nothing`,
            [
              candId,
              brain.schema_version || '1.0.0',
              brainHash,
              draft.proposition,
              draft.hook_type,
              draft.text,
              draft.reply_text || null,
              JSON.stringify({ type: 'editorial_brain', source_id: insight.id }),
              JSON.stringify(draft.evidence_bundle),
              draft.source_snapshot_hash
            ]
          );

          generated.push({ id: candId, version: 1, proposition: draft.proposition, hook_type: draft.hook_type, text: draft.text });
        }
      }

      return reply.code(201).send({ success: true, count: generated.length, generated });
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 5. Direct Operator Compose (Zero Immunity: passes exact 31 blockers)
  fastify.post('/api/v1/x-bot/candidates/compose', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const { text, reply_text, proposition, hook_type, evidence_bundle } = request.body || {};
    if (!text || typeof text !== 'string') {
      return reply.code(400).send({ error: 'Field "text" is required' });
    }

    try {
      const brain = loadEditorialBrain();
      const brainHash = computeBrainHash();
      const candId = `xc_op_${Date.now().toString(36)}_${randomUUID().slice(0, 4)}`;

      const draft = {
        text: text.trim(),
        reply_text: (reply_text || '').trim(),
        proposition: proposition || text.slice(0, 60),
        hook_type: hook_type || 'craft_truth',
        evidence_bundle: evidence_bundle || {
          source_type: 'operator_workbench',
          checked_at: new Date().toISOString(),
          claims: [{ claim: text, verification: 'operator_craft_input' }]
        },
        brain_hash: brainHash
      };

      // Run 31 blockers
      const validation = evaluateBlockers(draft, { currentBrainHash: brainHash });

      await pool.query(
        `insert into public.x_bot_candidates (id, insight_id, active_draft_version)
         values ($1, null, 1)`,
        [candId]
      );

      await pool.query(
        `insert into public.x_bot_candidate_versions
           (candidate_id, version, brain_version, brain_hash, proposition, hook_type, text, reply_text, status, provenance, evidence_bundle, source_snapshot_hash)
         values ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          candId,
          brain.schema_version || '1.0.0',
          brainHash,
          draft.proposition,
          draft.hook_type,
          draft.text,
          draft.reply_text || null,
          validation.passed ? 'drafted' : 'rejected',
          JSON.stringify({ type: 'operator', created_by: request.user?.email || 'operator' }),
          JSON.stringify(draft.evidence_bundle),
          computeTextHash(draft.text)
        ]
      );

      // Record validation run
      await pool.query(
        `insert into public.x_bot_validation_runs
           (candidate_id, draft_version, trigger, brain_version, brain_hash, results, repetition_analysis, passed)
         values ($1, 1, 'manual_validation', $2, $3, $4, $5, $6)`,
        [
          candId,
          brain.schema_version || '1.0.0',
          brainHash,
          JSON.stringify(validation.results),
          JSON.stringify(validation.repetition_analysis),
          validation.passed
        ]
      );

      return reply.code(201).send({
        success: true,
        candidateId: candId,
        version: 1,
        validation
      });
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 6. Edit Candidate (Creates Immutable vN+1)
  fastify.post('/api/v1/x-bot/candidates/:id/edit', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const { id } = request.params;
    const { text, reply_text, proposition, hook_type, evidence_bundle } = request.body || {};

    try {
      const brain = loadEditorialBrain();
      const brainHash = computeBrainHash();

      const candRes = await pool.query(`select * from public.x_bot_candidates where id = $1`, [id]);
      if (candRes.rowCount === 0) {
        return reply.code(404).send({ error: 'Candidate not found' });
      }

      const nextVersion = candRes.rows[0].active_draft_version + 1;
      const cleanText = text ? text.trim() : '';

      const draft = {
        text: cleanText,
        reply_text: (reply_text || '').trim(),
        proposition: proposition || cleanText.slice(0, 60),
        hook_type: hook_type || 'craft_truth',
        evidence_bundle: evidence_bundle || { source_type: 'operator_edit', checked_at: new Date().toISOString() },
        brain_hash: brainHash
      };

      const validation = evaluateBlockers(draft, { currentBrainHash: brainHash });

      await pool.query(
        `insert into public.x_bot_candidate_versions
           (candidate_id, version, brain_version, brain_hash, proposition, hook_type, text, reply_text, status, provenance, evidence_bundle, source_snapshot_hash)
         values ($1, $2, $3, $4, $5, $6, $7, $8, 'drafted', $9, $10, $11)`,
        [
          id,
          nextVersion,
          brain.schema_version || '1.0.0',
          brainHash,
          draft.proposition,
          draft.hook_type,
          draft.text,
          draft.reply_text || null,
          JSON.stringify({ type: 'operator', edited_by: request.user?.email || 'operator' }),
          JSON.stringify(draft.evidence_bundle),
          computeTextHash(draft.text)
        ]
      );

      await pool.query(`update public.x_bot_candidates set active_draft_version = $2, updated_at = now() where id = $1`, [
        id,
        nextVersion
      ]);

      return reply.code(201).send({
        success: true,
        candidateId: id,
        newVersion: nextVersion,
        validation
      });
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 7. Validate Candidate Version
  fastify.post('/api/v1/x-bot/candidates/:id/validate', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const { id } = request.params;
    const version = Number(request.body?.version || 1);

    try {
      const vRes = await pool.query(
        `select * from public.x_bot_candidate_versions where candidate_id = $1 and version = $2`,
        [id, version]
      );
      if (vRes.rowCount === 0) return reply.code(404).send({ error: 'Candidate version not found' });

      const candidateRow = vRes.rows[0];
      const currentBrainHash = computeBrainHash();
      const recentDispatchesRes = await pool.query(
        `select * from public.x_bot_dispatches where status = 'succeeded' order by dispatched_at desc limit 20`
      );

      const validation = evaluateBlockers(candidateRow, {
        currentBrainHash,
        recentDispatches: recentDispatchesRes.rows,
      });

      await pool.query(
        `insert into public.x_bot_validation_runs
           (candidate_id, draft_version, trigger, brain_version, brain_hash, results, repetition_analysis, passed)
         values ($1, $2, 'manual_validation', $3, $4, $5, $6, $7)`,
        [
          id,
          version,
          validation.brain_version,
          currentBrainHash,
          JSON.stringify(validation.results),
          JSON.stringify(validation.repetition_analysis),
          validation.passed
        ]
      );

      return { success: true, validation };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 8. Approve Candidate Version (Freezes immutable revision)
  fastify.post('/api/v1/x-bot/candidates/:id/approve', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const { id } = request.params;
    const version = Number(request.body?.version || 1);

    try {
      const vRes = await pool.query(
        `select * from public.x_bot_candidate_versions where candidate_id = $1 and version = $2`,
        [id, version]
      );
      if (vRes.rowCount === 0) return reply.code(404).send({ error: 'Candidate version not found' });

      const candidateRow = vRes.rows[0];
      const currentBrainHash = computeBrainHash();

      // Ensure blockers pass before approving
      const validation = evaluateBlockers(candidateRow, { currentBrainHash });
      if (!validation.passed) {
        return reply.code(400).send({ error: 'Cannot approve candidate: quality blockers failed', validation });
      }

      await pool.query(
        `update public.x_bot_candidate_versions
           set status = 'approved', approved_at = now(), approved_by = $3
         where candidate_id = $1 and version = $2`,
        [id, version, request.user?.email || 'operator']
      );

      await pool.query(
        `insert into public.x_bot_activity_ledger (candidate_id, event_type, details)
         values ($1, 'candidate_approved', $2)`,
        [id, JSON.stringify({ version, approved_by: request.user?.email || 'operator' })]
      );

      return { success: true, candidateId: id, version, status: 'approved' };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 9. Dry Run Candidate Version
  fastify.post('/api/v1/x-bot/candidates/:id/dry-run', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const { id } = request.params;
    const version = Number(request.body?.version || 1);

    try {
      const outcome = await dispatchCandidateVersion(pool, id, version, { dryRun: true, log: fastify.log });
      return reply.code(outcome.success ? 200 : 400).send(outcome);
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 10. Atomic Idempotent Live Dispatch
  fastify.post('/api/v1/x-bot/candidates/:id/dispatch', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const { id } = request.params;
    const version = Number(request.body?.version || 1);
    const overrideChannelCooldown = Boolean(request.body?.overrideChannelCooldown);

    try {
      const outcome = await dispatchCandidateVersion(pool, id, version, {
        dryRun: false,
        overrideChannelCooldown,
        log: fastify.log
      });
      return reply.code(outcome.success ? 200 : 400).send(outcome);
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 11. Reconcile Unknown Outcome Dispatch (Manual Sentinel Tool)
  fastify.post('/api/v1/x-bot/dispatches/:id/reconcile', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const { id } = request.params;
    const { resolution, confirmedTweetId, notes } = request.body || {};

    try {
      const dispRes = await pool.query(`select * from public.x_bot_dispatches where id = $1`, [id]);
      if (dispRes.rowCount === 0) return reply.code(404).send({ error: 'Dispatch not found' });

      if (resolution === 'mark_succeeded') {
        await pool.query(
          `update public.x_bot_dispatches set status = 'succeeded', completed_at = now() where id = $1`,
          [id]
        );
        await pool.query(
          `update public.x_bot_candidate_versions set status = 'published'
           where candidate_id = $1 and version = $2`,
          [dispRes.rows[0].candidate_id, dispRes.rows[0].candidate_version]
        );
        if (confirmedTweetId) {
          await pool.query(
            `update public.x_bot_dispatch_items set status = 'published', tweet_id = $2 where dispatch_id = $1 and item_type = 'root'`,
            [id, confirmedTweetId]
          );
        }
      } else if (resolution === 'mark_failed_retryable') {
        await pool.query(
          `update public.x_bot_dispatches set status = 'failed', error_message = $2 where id = $1`,
          [id, notes || 'Operator marked as failed']
        );
        await pool.query(
          `update public.x_bot_candidate_versions set status = 'approved'
           where candidate_id = $1 and version = $2`,
          [dispRes.rows[0].candidate_id, dispRes.rows[0].candidate_version]
        );
      }

      await pool.query(
        `insert into public.x_bot_activity_ledger (candidate_id, event_type, details)
         values ($1, 'reconciliation_resolved', $2)`,
        [dispRes.rows[0].candidate_id, JSON.stringify({ dispatchId: id, resolution, confirmedTweetId, notes })]
      );

      return { success: true, dispatchId: id, resolution };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 12. Activity Ledger Query
  fastify.get('/api/v1/x-bot/activity', async (request, reply) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(request.query?.limit, 10) || 30));
      const res = await pool.query(
        `select * from public.x_bot_activity_ledger order by created_at desc limit $1`,
        [limit]
      );
      return { count: res.rowCount, ledger: res.rows };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // 13. Published Posts with Items
  fastify.get('/api/v1/x-bot/posts', async (request, reply) => {
    try {
      const res = await pool.query(`
        select d.id, d.candidate_id, d.candidate_version, d.published_root_text,
               d.published_reply_text, d.status, d.dispatched_at, d.completed_at,
               json_agg(json_build_object('type', i.item_type, 'tweetId', i.tweet_id, 'status', i.status)) as items
        from public.x_bot_dispatches d
        left join public.x_bot_dispatch_items i on i.dispatch_id = d.id
        where d.status in ('succeeded', 'outcome_unknown')
        group by d.id
        order by d.dispatched_at desc
        limit 30
      `);
      return { posts: res.rows };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // --- EDITORIAL LEDGER & BRIEFING ENDPOINTS ---

  // 1. Editorial Briefing (Public GET)
  fastify.get('/api/v1/spark/ledger/briefing', async (request, reply) => {
    try {
      const briefing = await getEditorialBriefing(pool);
      return briefing;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate editorial briefing.' });
    }
  });

  // 2. Ledger History (Public GET)
  fastify.get('/api/v1/spark/ledger', async (request, reply) => {
    const { date, status, limit, offset } = request.query || {};
    try {
      const history = await getLedgerEntries(pool, {
        date: date || null,
        status: status || null,
        limit: Number(limit) || 50,
        offset: Number(offset) || 0
      });
      return history;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to query editorial ledger.' });
    }
  });

  // 3. Record Ledger Entry (Authenticated POST)
  fastify.post('/api/v1/spark/ledger/entries', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const parsed = ledgerEntryInputSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid ledger entry payload', details: parsed.error.flatten().fieldErrors });
    }
    try {
      const entry = await recordLedgerEntry(pool, parsed.data);
      return reply.code(201).send({ success: true, entry });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to record ledger entry.' });
    }
  });

  // 4. Update Ledger Entry Lifecycle Status (Authenticated PATCH)
  fastify.patch('/api/v1/spark/ledger/entries/:id/status', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const { id } = request.params;
    const parsed = ledgerStatusUpdateSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid ledger status update payload', details: parsed.error.flatten().fieldErrors });
    }
    try {
      const updated = await updateLedgerEntryStatus(pool, id, parsed.data);
      return reply.code(200).send({ success: true, entry: updated });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(error.message.includes('not found') ? 404 : 500).send({ error: error.message });
    }
  });

  // 5. Add Idea to Backlog (Authenticated POST)
  fastify.post('/api/v1/spark/ledger/ideas', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const parsed = ideaBacklogInputSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid backlog idea payload', details: parsed.error.flatten().fieldErrors });
    }
    try {
      const idea = await addIdeaToBacklog(pool, parsed.data);
      return reply.code(201).send({ success: true, idea });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to add idea to backlog.' });
    }
  });

  // 6. Update Backlog Idea Status (Authenticated PATCH)
  fastify.patch('/api/v1/spark/ledger/ideas/:id/status', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const { id } = request.params;
    const parsed = ideaStatusUpdateSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid idea status update payload', details: parsed.error.flatten().fieldErrors });
    }
    try {
      const updated = await updateBacklogIdeaStatus(pool, id, parsed.data);
      return reply.code(200).send({ success: true, idea: updated });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(error.message.includes('not found') ? 404 : 500).send({ error: error.message });
    }
  });

  // 7. Add Anti-Repetition Rule (Authenticated POST)
  fastify.post('/api/v1/spark/ledger/avoid', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    const parsed = antiRepetitionRuleSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid anti-repetition rule payload', details: parsed.error.flatten().fieldErrors });
    }
    try {
      const rule = await addAntiRepetitionPattern(pool, parsed.data);
      return reply.code(201).send({ success: true, rule });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to add anti-repetition rule.' });
    }
  });

  // --- UNIFIED EDITORIAL STATE ENDPOINTS (FOR CHATGPT & AUTOMATION) ---

  const handleGetEditorialState = async (request, reply) => {
    const { date } = request.query || {};
    try {
      const state = await getEditorialState(pool, date);
      return state;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve editorial state.' });
    }
  };

  fastify.get('/api/v1/editorial/state', handleGetEditorialState);
  fastify.get('/api/v1/spark/editorial/state', handleGetEditorialState);

  const handlePostEditorialState = async (request, reply) => {
    const body = request.body || {};
    const outcomes = { recordedEntries: [], recordedIdeas: [], recordedRules: [], transitions: [] };

    try {
      // 1. Process single entry or multiple entries
      if (body.entry) {
        const parsed = ledgerEntryInputSchema.safeParse(body.entry);
        if (parsed.success) {
          const entry = await recordLedgerEntry(pool, parsed.data);
          outcomes.recordedEntries.push(entry);
        }
      }
      if (Array.isArray(body.entries)) {
        for (const rawEntry of body.entries) {
          const parsed = ledgerEntryInputSchema.safeParse(rawEntry);
          if (parsed.success) {
            const entry = await recordLedgerEntry(pool, parsed.data);
            outcomes.recordedEntries.push(entry);
          }
        }
      }

      // 2. Process ideas
      if (Array.isArray(body.ideas)) {
        for (const rawIdea of body.ideas) {
          const parsed = ideaBacklogInputSchema.safeParse(rawIdea);
          if (parsed.success) {
            const idea = await addIdeaToBacklog(pool, parsed.data);
            outcomes.recordedIdeas.push(idea);
          }
        }
      }

      // 3. Process avoid rules
      if (Array.isArray(body.avoidRules)) {
        for (const rawRule of body.avoidRules) {
          const parsed = antiRepetitionRuleSchema.safeParse(rawRule);
          if (parsed.success) {
            const rule = await addAntiRepetitionPattern(pool, parsed.data);
            outcomes.recordedRules.push(rule);
          }
        }
      }

      // 4. Process status updates
      if (body.statusUpdate && body.statusUpdate.id && body.statusUpdate.status) {
        if (body.statusUpdate.type === 'backlog_idea') {
          const updated = await updateBacklogIdeaStatus(pool, body.statusUpdate.id, { status: body.statusUpdate.status });
          outcomes.transitions.push({ type: 'backlog_idea', result: updated });
        } else {
          const updated = await updateLedgerEntryStatus(pool, body.statusUpdate.id, {
            status: body.statusUpdate.status,
            targetPostId: body.statusUpdate.targetPostId,
            details: body.statusUpdate.details
          });
          outcomes.transitions.push({ type: 'ledger_entry', result: updated });
        }
      }

      const currentState = await getEditorialState(pool, body.date);
      return reply.code(201).send({
        success: true,
        message: 'Editorial state processed successfully.',
        outcomes,
        state: currentState
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to update editorial state.', message: error.message });
    }
  };

  fastify.post('/api/v1/editorial/state', { preHandler: requireAdminOrBotSecret }, handlePostEditorialState);
  fastify.post('/api/v1/spark/editorial/state', { preHandler: requireAdminOrBotSecret }, handlePostEditorialState);

  // Durable wake-up endpoint for Cloud Scheduler, cron, or another external invoker.
  fastify.post('/api/v1/spark/scheduler/tick', { preHandler: requireAdminOrBotSecret }, async (request, reply) => {
    try {
      const outcome = await runMasterSchedulerTick(pool);
      let outbox;
      try {
        outbox = await processOutboxEvents(pool);
      } catch (error) {
        fastify.log.error(error, 'Scheduler outbox processing failed');
        outbox = { processed: null, succeeded: null, failed: null, error: 'Outbox processing failed' };
      }
      const success = outcome.failed.length === 0 && !outbox.error && outbox.failed === 0;
      return reply.code(success ? 200 : 503).send({ success, outcome, outbox });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Scheduler tick failed. Please check server logs.', message: error.message });
    }
  });
}
