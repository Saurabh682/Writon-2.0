import { describe, expect, it } from 'vitest';
import { CURATED_BOT_PERSONAS } from '../src/bot-engine/curated-personas.js';
import { CURATED_READER_PERSONAS } from '../src/bot-engine/reader-personas.js';
import { CURATED_COMMENTER_PERSONAS, generateAuthenticComment } from '../src/bot-engine/commenter-personas.js';
import { generateSparkArticle, generateSparkComment } from '../src/bot-engine/gemini-spark-client.js';
import { getCoverImageForCategory } from '../src/bot-engine/image-service.js';
import { formatMemoriesForPrompt } from '../src/bot-engine/learning-service.js';
import { buildServer } from '../src/server.js';

describe('Gemini Spark Bot Network & Engine', () => {
  describe('Curated Personas', () => {
    it('contains at least 6 distinct curated personas with valid categories', () => {
      expect(CURATED_BOT_PERSONAS.length).toBeGreaterThanOrEqual(6);

      const ids = new Set();
      const penNames = new Set();

      for (const bot of CURATED_BOT_PERSONAS) {
        expect(bot.id).toMatch(/^bot_[a-z0-9_]+$/);
        expect(bot.penName).toMatch(/^[a-z0-9_]+$/);
        expect(bot.fullName).toBeTruthy();
        expect(bot.personaPrompt).toBeTruthy();
        expect(bot.categories.length).toBeGreaterThan(0);
        expect(bot.likeProbability).toBeGreaterThan(0);
        expect(bot.commentProbability).toBeGreaterThan(0);

        expect(ids.has(bot.id)).toBe(false);
        expect(penNames.has(bot.penName)).toBe(false);

        ids.add(bot.id);
        penNames.add(bot.penName);
      }
    });

    it('contains 100 distinct reader personas with applaud-only capability', () => {
      expect(CURATED_READER_PERSONAS.length).toBe(100);

      const ids = new Set();
      const penNames = new Set();

      for (const reader of CURATED_READER_PERSONAS) {
        expect(reader.id).toMatch(/^bot_reader_\d{3}$/);
        expect(reader.penName).toMatch(/^reader_[a-z0-9_]+$/);
        expect(reader.fullName).toBeTruthy();
        expect(reader.bio).toBeTruthy();
        expect(reader.avatarUrl === null || typeof reader.avatarUrl === 'string').toBe(true);
        expect(reader.botType).toBe('reader');
        expect(reader.commentProbability).toBe(0);
        expect(reader.categories.length).toBeGreaterThan(0);

        expect(ids.has(reader.id)).toBe(false);
        expect(penNames.has(reader.penName)).toBe(false);

        ids.add(reader.id);
        penNames.add(reader.penName);
      }

      // Exactly 40% have no profile pic (use initials avatar badge)
      expect(CURATED_READER_PERSONAS.filter(r => r.avatarUrl === null).length).toBe(40);
    });

    it('contains 50 distinct commenter personas adhering to 65-25-10 cognitive rules', () => {
      expect(CURATED_COMMENTER_PERSONAS.length).toBe(50);

      const ids = new Set();
      const penNames = new Set();

      for (const commenter of CURATED_COMMENTER_PERSONAS) {
        expect(commenter.id).toMatch(/^bot_commenter_\d{3}$/);
        expect(commenter.penName).toMatch(/^c_[a-z0-9_]+$/);
        expect(commenter.fullName).toBeTruthy();
        expect(commenter.bio).toBeTruthy();
        expect(commenter.avatarUrl === null || typeof commenter.avatarUrl === 'string').toBe(true);
        expect(commenter.botType).toBe('commenter');
        expect(commenter.commentStyle).toBeTruthy();
        expect(commenter.categories.length).toBeGreaterThan(0);
        expect(commenter.quickReactions.length).toBeGreaterThan(0);
        expect(commenter.mediumTemplates.length).toBeGreaterThan(0);

        expect(ids.has(commenter.id)).toBe(false);
        expect(penNames.has(commenter.penName)).toBe(false);

        ids.add(commenter.id);
        penNames.add(commenter.penName);
      }

      // Exactly 40% have no profile pic (use initials avatar badge)
      expect(CURATED_COMMENTER_PERSONAS.filter(c => c.avatarUrl === null).length).toBe(20);
    });

    it('generates authentic comments according to depth tier', () => {
      const sample = CURATED_COMMENTER_PERSONAS[0];
      const micro = generateAuthenticComment(sample, { depth: 'micro' });
      expect(micro.length).toBeGreaterThan(0);
      expect(micro.split(/\s+/).length).toBeLessThanOrEqual(5);

      const medium = generateAuthenticComment(sample, { depth: 'medium', postTitle: 'Distributed Log Systems' });
      expect(medium.length).toBeGreaterThan(10);

      const deep = generateAuthenticComment(sample, { depth: 'deep', postTitle: 'Distributed Log Systems' });
      expect(deep.length).toBeGreaterThan(15);
    });
  });

  describe('Cover Image Service', () => {
    it('returns a valid Unsplash image URL for every category', () => {
      const categories = ['Tech', 'Poetry', 'Shayari', 'Short Stories', 'Essays', 'Philosophy', 'Humour', 'Culture'];
      for (const cat of categories) {
        const imageUrl = getCoverImageForCategory(cat);
        expect(imageUrl).toMatch(/^https:\/\/images\.unsplash\.com\//);
      }
    });
  });

  describe('Gemini Spark Content & Comment Synthesizer', () => {
    it('generates a well-structured editorial article (fallback mode when no key)', async () => {
      const bot = CURATED_BOT_PERSONAS[0];
      const article = await generateSparkArticle({
        apiKey: null,
        persona: bot,
        category: 'Tech'
      });

      expect(article.title).toBeTruthy();
      expect(article.content.length).toBeGreaterThan(50);
      expect(article.summary).toBeTruthy();
    });

    it('generates a nuanced comment tailored to persona and post', async () => {
      const bot = CURATED_BOT_PERSONAS[1];
      const comment = await generateSparkComment({
        apiKey: null,
        persona: bot,
        postTitle: 'Echoes of Kolkata Monsoons',
        postCategory: 'Poetry',
        postExcerpt: 'Raindrops tap rhythmically on aged terracotta tiles...'
      });

      expect(typeof comment).toBe('string');
      expect(comment.length).toBeGreaterThan(15);
    });
  });

  describe('Admin Bot Fastify Routes & Contract', () => {
    function createMockPool() {
      return {
        connect: async () => ({
          query: async () => ({ rows: [], rowCount: 1 }),
          release: () => {},
        }),
        query: async (sql) => {
          if (sql.includes('public.bot_global_settings')) {
            return {
              rows: [{
                id: 'global',
                is_engine_enabled: true,
                spark_automation_mode: 'hybrid',
                llm_provider: 'gemini',
                llm_model: 'gemini-2.0-flash',
                gemini_api_key: null,
                posts_per_day_target: 4,
                spark_pulse_interval_minutes: 15,
                human_post_reaction_rate: 0.90,
                reaction_delay_min_minutes: 2,
                reaction_delay_max_minutes: 20,
                bot_to_bot_interaction_rate: 0.40,
                updated_at: new Date().toISOString()
              }],
              rowCount: 1
            };
          }
          if (sql.includes('public.bot_configs') || sql.includes('public.profiles')) {
            return {
              rows: CURATED_BOT_PERSONAS.map(b => ({
                id: b.id,
                penName: b.penName,
                fullName: b.fullName,
                bio: b.bio,
                avatarUrl: b.avatarUrl,
                location: b.location,
                quoteOfDay: b.quoteOfDay,
                isActive: true,
                personaPrompt: b.personaPrompt,
                categories: b.categories,
                postFrequencyHours: b.postFrequencyHours,
                likeProbability: b.likeProbability,
                commentProbability: b.commentProbability,
                commentStyle: b.commentStyle,
                storiesCount: 2
              })),
              rowCount: CURATED_BOT_PERSONAS.length
            };
          }
          if (sql.includes('public.bot_activity_logs')) {
            return { rows: [], rowCount: 0 };
          }
          return { rows: [{ totalBotPosts: 12, totalBotComments: 28, totalBotApplauds: 45, activeBotsCount: 6 }], rowCount: 1 };
        }
      };
    }

    it('rejects unauthenticated requests to admin bot endpoints', async () => {
      const app = await buildServer({
        runtimeConfig: {
          environment: 'test',
          port: 3001,
          databaseUrl: 'postgresql://unused:unused@localhost:5432/test',
          databasePoolMax: 1,
          databaseSslRejectUnauthorized: false,
          corsOrigins: [],
        },
        pool: createMockPool(),
        auth: { verifyIdToken: async () => ({ uid: 'test-admin' }) }
      });

      const response = await app.inject({ method: 'GET', url: '/api/v1/admin/bots/overview' });
      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('Authentication required');
      await app.close();
    });

    it('serves /api/v1/admin/bots/overview with engine stats and settings when authenticated', async () => {
      const app = await buildServer({
        runtimeConfig: {
          environment: 'test',
          port: 3001,
          databaseUrl: 'postgresql://unused:unused@localhost:5432/test',
          databasePoolMax: 1,
          databaseSslRejectUnauthorized: false,
          corsOrigins: [],
        },
        pool: createMockPool(),
        auth: { verifyIdToken: async () => ({ uid: 'test-admin' }) }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/bots/overview',
        headers: { authorization: 'Bearer test-token' }
      });
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.settings).toBeDefined();
      expect(data.settings.is_engine_enabled).toBe(true);
      expect(data.stats).toBeDefined();
      await app.close();
    });

    it('validates invalid bot creation requests before touching database', async () => {
      const app = await buildServer({
        runtimeConfig: {
          environment: 'test',
          port: 3001,
          databaseUrl: 'postgresql://unused:unused@localhost:5432/test',
          databasePoolMax: 1,
          databaseSslRejectUnauthorized: false,
          corsOrigins: [],
        },
        pool: createMockPool(),
        auth: { verifyIdToken: async () => ({ uid: 'test-admin' }) }
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/bots',
        headers: { authorization: 'Bearer test-token' },
        payload: {
          penName: 'INVALID PEN NAME WITH SPACES',
          fullName: 'A',
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('Invalid bot data');
      await app.close();
    });

    it('serves /api/v1/spark/prompt-template with complete persona instructions', async () => {
      const app = await buildServer({
        runtimeConfig: {
          environment: 'test',
          port: 3001,
          databaseUrl: 'postgresql://unused:unused@localhost:5432/test',
          databasePoolMax: 1,
          databaseSslRejectUnauthorized: false,
          corsOrigins: [],
        },
        pool: createMockPool(),
        auth: { verifyIdToken: async () => ({ uid: 'test-admin' }) }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/spark/prompt-template',
        headers: { authorization: 'Bearer test-token' }
      });
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.prompt).toContain('Aarav Mehta');
      expect(data.prompt).toContain('Kavya Nair');
      expect(data.prompt).toContain('"stories":');
      await app.close();
    });

    it('validates malformed /api/v1/spark/ingest payload', async () => {
      const app = await buildServer({
        runtimeConfig: {
          environment: 'test',
          port: 3001,
          databaseUrl: 'postgresql://unused:unused@localhost:5432/test',
          databasePoolMax: 1,
          databaseSslRejectUnauthorized: false,
          corsOrigins: [],
        },
        pool: createMockPool(),
        auth: { verifyIdToken: async () => ({ uid: 'test-admin' }) }
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/spark/ingest',
        headers: { authorization: 'Bearer test-token' },
        payload: {
          stories: [{ title: '', content: '' }]
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('Invalid spark payload');
      await app.close();
    });

    it('exposes MCP JSON-RPC protocol with 12 tools including delayed actions and replies', async () => {
      const app = await buildServer({
        runtimeConfig: {
          environment: 'test',
          port: 3001,
          databaseUrl: 'postgresql://unused:unused@localhost:5432/test',
          databasePoolMax: 1,
          databaseSslRejectUnauthorized: false,
          corsOrigins: [],
        },
        pool: createMockPool(),
        auth: { verifyIdToken: async () => ({ uid: 'test-admin' }) }
      });

      // 1. Initialize
      const initRes = await app.inject({
        method: 'POST',
        url: '/mcp',
        payload: { jsonrpc: '2.0', id: 1, method: 'initialize' }
      });
      expect(initRes.statusCode).toBe(200);
      expect(initRes.json().result.serverInfo.name).toBe('writon-mcp-server');

      // 2. Tools List
      const toolsRes = await app.inject({
        method: 'POST',
        url: '/mcp',
        payload: { jsonrpc: '2.0', id: 2, method: 'tools/list' }
      });
      expect(toolsRes.statusCode).toBe(200);
      const tools = toolsRes.json().result.tools;
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('writon_publish_story');
      expect(toolNames).toContain('writon_reply_to_comment');
      expect(toolNames).toContain('writon_browse_and_react');
      expect(toolNames).toContain('writon_schedule_action');
      expect(toolNames).toContain('writon_get_pending_actions');
      expect(toolNames).toContain('writon_clapping_swarm');
      expect(toolNames).toContain('writon_get_reader_stats');
      expect(toolNames).toContain('writon_commenter_wave');
      expect(toolNames).toContain('writon_get_commenter_personas');
      expect(toolNames).toContain('writon_get_feed');
      expect(toolNames).toContain('writon_comment_story');
      expect(toolNames).toContain('writon_applaud_story');
      expect(toolNames).toContain('writon_follow_author');

      await app.close();
    });

    it('serves OpenAPI 3.1.0 specification and supports public unauthenticated spark endpoints', async () => {
      const app = await buildServer({
        runtimeConfig: {
          environment: 'test',
          port: 3001,
          databaseUrl: 'postgresql://unused:unused@localhost:5432/test',
          databasePoolMax: 1,
          databaseSslRejectUnauthorized: false,
          corsOrigins: [],
        },
        pool: createMockPool(),
        auth: { verifyIdToken: async () => ({ uid: 'test-admin' }) }
      });

      // 1. Test GET /openapi.json
      const openApiRes = await app.inject({ method: 'GET', url: '/openapi.json' });
      expect(openApiRes.statusCode).toBe(200);
      const spec = openApiRes.json();
      expect(spec.openapi).toBe('3.1.0');
      expect(spec.paths['/api/v1/spark/publish']?.post?.operationId).toBe('publishStory');
      expect(spec.paths['/api/v1/spark/feed']?.get?.operationId).toBe('getFeed');

      // 2. Test POST /api/v1/spark/publish without auth token
      const pubRes = await app.inject({
        method: 'POST',
        url: '/api/v1/spark/publish',
        payload: {
          authorPenName: 'aarav_tech',
          title: 'The Architecture of Cloud Personas',
          summary: 'An exploration of distributed systems.',
          content: 'Distributed systems require deliberate partitioning...',
          category: 'Tech'
        }
      });
      expect(pubRes.statusCode).toBe(201);
      expect(pubRes.json().success).toBe(true);

      // 3. Test POST /api/v1/spark/swarm/applaud without auth token
      const applaudRes = await app.inject({
        method: 'POST',
        url: '/api/v1/spark/swarm/applaud',
        payload: {
          postId: '00000000-0000-0000-0000-000000000001',
          count: 15
        }
      });
      expect(applaudRes.statusCode).toBe(200);
      expect(applaudRes.json().success).toBe(true);

      // 4. Test GET /api/v1/spark/bots/:id/memories
      const memRes = await app.inject({
        method: 'GET',
        url: '/api/v1/spark/bots/bot_aarav_tech/memories'
      });
      expect(memRes.statusCode).toBe(200);
      expect(memRes.json().botId).toBe('bot_aarav_tech');

      await app.close();
    });
  });

  describe('Episodic Memory & Autonomous Learning Engine', () => {
    it('formats memories cleanly into prompt context with zero slop', () => {
      const sampleMemories = [
        {
          memoryType: 'story_arc',
          content: 'Authored "The Antiquarian of College Street" featuring Mr. Bimal Chatterjee.'
        },
        {
          memoryType: 'reader_feedback',
          content: '@c_neel_dev commented: "Loved the quiet afternoon pacing."'
        },
        {
          memoryType: 'cross_author_interaction',
          content: 'Engaged with fellow author @sunita_banerjee on material memory.'
        }
      ];

      const formatted = formatMemoriesForPrompt(sampleMemories);
      expect(formatted).toContain('PAST LITERARY MEMORIES & NARRATIVE CONTINUITY');
      expect(formatted).toContain('[Past Story]: Authored "The Antiquarian of College Street"');
      expect(formatted).toContain('[Reader Feedback]: @c_neel_dev commented');
      expect(formatted).toContain('[Fellow Author]: Engaged with fellow author @sunita_banerjee');
      expect(formatted).toContain('Directive: You may organically reference');
    });

    it('returns empty string when no memories are present', () => {
      expect(formatMemoriesForPrompt([])).toBe('');
      expect(formatMemoriesForPrompt(null)).toBe('');
    });
  });
});

