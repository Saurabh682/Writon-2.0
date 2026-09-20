import { z } from 'zod';
import { getPersonalizedFeed, recordBehaviorEvents } from '../services/feed-service.js';
import { normalizeLanguage } from '../services/feed-ranking.js';

const feedQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(2_000).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  language: z.string().trim().min(2).max(16).default('en'),
  guestTopics: z.string().trim().max(600).optional(),
  guestAuthors: z.string().trim().max(600).optional(),
  guestLanguages: z.string().trim().max(200).optional(),
});

const behaviorEventSchema = z.object({
  eventId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  storyId: z.string().uuid(),
  feedSessionId: z.string().uuid(),
  eventType: z.enum(['impression', 'open', 'quick_exit', 'share']),
  clientEventTime: z.string().datetime({ offset: true }),
  visibleFraction: z.number().min(0).max(1).optional(),
  visibleMillis: z.number().int().min(0).max(60_000).optional(),
  engagedSeconds: z.number().min(0).max(60).optional(),
}).superRefine((event, context) => {
  if (event.eventType === 'impression'
      && ((event.visibleFraction ?? 0) < 0.5 || (event.visibleMillis ?? 0) < 1_000)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'An impression requires at least 50% visibility for one second.',
    });
  }
  if (event.eventType === 'quick_exit' && (event.engagedSeconds == null || event.engagedSeconds >= 5)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A quick exit requires less than five seconds of engagement.',
    });
  }
});

const behaviorBatchSchema = z.object({
  events: z.array(behaviorEventSchema).min(1).max(50),
});

function parseGuestVector(serialized, maximumEntries) {
  const vector = new Map();
  if (!serialized) return vector;
  for (const item of serialized.split(',').slice(0, maximumEntries)) {
    const separator = item.lastIndexOf(':');
    if (separator <= 0) continue;
    const key = decodeURIComponent(item.slice(0, separator)).trim();
    const score = Number(item.slice(separator + 1));
    if (!key || key.length > 80 || !Number.isFinite(score)) continue;
    vector.set(key, Math.max(-20, Math.min(20, score)));
  }
  return vector;
}

function normalizedEvents(events) {
  return events.map((event) => ({
    id: event.eventId,
    story_id: event.storyId,
    event_type: event.eventType,
    numeric_value: event.eventType === 'impression'
      ? event.visibleMillis
      : (event.eventType === 'quick_exit' ? event.engagedSeconds : 0),
    feed_session_id: event.feedSessionId,
    client_event_time: event.clientEventTime,
    idempotency_key: event.idempotencyKey,
  }));
}

export async function feedRoutes(fastify, options) {
  const { database, optionalUser, requireUser, config, normalizeAvatarUrl = () => null } = options;

  fastify.get('/api/v1/feed', async (request, reply) => {
    const parsed = feedQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid feed query',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const viewer = await optionalUser(request);
    const query = parsed.data;
    const guestVectors = {
      topics: parseGuestVector(query.guestTopics, 8),
      authors: parseGuestVector(query.guestAuthors, 8),
      languages: parseGuestVector(query.guestLanguages, 4),
    };
    const feed = await getPersonalizedFeed(database, {
      profileId: viewer?.profileId ?? null,
      language: normalizeLanguage(query.language),
      cursor: query.cursor,
      limit: query.limit,
      guestVectors,
      behaviorRolloutPercent: config.feedPersonalizationEnabled
        ? config.feedBehaviorRolloutPercent
        : 0,
      holdoutPercent: config.feedHoldoutPercent,
      shadowEnabled: config.feedShadowRankingEnabled,
      guestLearningEnabled: config.feedPersonalizationEnabled && config.feedGuestLearningEnabled,
      sessionTtlMinutes: config.feedSessionTtlMinutes,
    });
    return reply.header('Cache-Control', 'private, no-store').send({
      ...feed,
      items: feed.items.map((item) => ({
        ...item,
        author: item.author
          ? { ...item.author, avatarUrl: normalizeAvatarUrl(item.author.avatarUrl) }
          : item.author,
      })),
    });
  });

  fastify.post(
    '/api/v1/feed/events',
    { preHandler: requireUser },
    async (request, reply) => {
      const parsed = behaviorBatchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid behavior event batch',
          details: parsed.error.flatten().fieldErrors,
        });
      }
      try {
        const outcome = await recordBehaviorEvents(
          database,
          request.profileId,
          normalizedEvents(parsed.data.events)
        );
        return reply.code(202).send(outcome);
      } catch (error) {
        if (error.statusCode === 429) {
          return reply.code(429).send({ error: 'Too many behavior events. Try again shortly.' });
        }
        throw error;
      }
    }
  );
}
