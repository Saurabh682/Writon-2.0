import { describe, expect, it } from 'vitest';
import { CURATED_BOT_PERSONAS } from '../src/bot-engine/curated-personas.js';
import { generateSparkArticle, generateSparkComment } from '../src/bot-engine/gemini-spark-client.js';
import { getCoverImageForCategory } from '../src/bot-engine/image-service.js';
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
      expect(article.content).toContain('Reflections on');
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

    it('serves /api/v1/admin/bots/overview with engine stats and settings', async () => {
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
        payload: {
          penName: 'INVALID PEN NAME WITH SPACES',
          fullName: 'A',
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('Invalid bot data');
      await app.close();
    });
  });
});
