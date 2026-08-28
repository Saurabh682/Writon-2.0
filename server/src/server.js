import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import pg from 'pg';
import sharp from 'sharp';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { z } from 'zod';
import { loadFirebaseServiceAccount, loadRuntimeConfig } from './config.js';
import { adminBotsRoutes } from './routes/admin-bots.js';
import { appMetaRoutes } from './routes/app-meta.js';
import { notificationRoutes } from './routes/notifications.js';
import { triggerSparkReaction, triggerSparkCommentReaction, startSparkScheduler } from './bot-engine/spark-runner.js';
import { mcpRoutes } from './routes/mcp-server.js';

const { Pool } = pg;

const profileInputSchema = z.object({
  penName: z.string().trim().toLowerCase().min(3).max(32)
    .regex(/^[a-z0-9_]+$/, 'Username may contain only lowercase letters, numbers, and underscores.'),
  fullName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(500).nullable().optional(),
  avatarUrl: z.string().url().max(2_000).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
});

const postsQuerySchema = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  tab: z.enum(['latest', 'popular']).default('latest'),
  authorId: z.string().trim().optional(),
  authorPenName: z.string().trim().optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const postInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(1).max(100_000),
  summary: z.string().trim().max(500).nullable().optional(),
  category: z.string().trim().min(2).max(80),
  coverImage: z.string().url().max(2_000).nullable().optional(),
  isPublished: z.boolean().default(true),
  clientDraftId: z.string().uuid().optional(),
});

const postPatchSchema = postInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one story field is required.'
);

const commentInputSchema = z.object({
  content: z.string().trim().min(1).max(5_000),
  parentId: z.string().uuid().nullable().optional(),
});

const interestsInputSchema = z.object({
  topicIds: z.array(
    z.string().trim().min(1).max(64).regex(/^[a-z0-9_]+$/, 'Invalid topic identifier.')
  ).max(12),
});

const collectionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const readingProgressInputSchema = z.object({
  progress: z.coerce.number().min(0).max(1).default(0.05),
  readSeconds: z.coerce.number().int().min(0).max(86_400).default(0),
});

const postIdSchema = z.string().uuid();
const profileIdentifierSchema = z.string().trim().min(1).max(200);
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function buildServer({ runtimeConfig, pool, auth, messaging } = {}) {
const fastify = Fastify({ logger: true });
const config = runtimeConfig ?? loadRuntimeConfig();
const serviceAccount = auth ? null : await loadFirebaseServiceAccount(config);
const firebaseApp = auth
  ? null
  : (getApps().length
    ? getApps()[0]
    : (serviceAccount
      ? initializeApp({ credential: cert(serviceAccount) })
      : initializeApp({ projectId: 'writon-app-2020' })));
const firebaseAuth = auth ?? (firebaseApp ? getAuth(firebaseApp) : null);
const firebaseMessaging = messaging ?? (serviceAccount && firebaseApp ? getMessaging(firebaseApp) : null);

const database = pool ?? new Pool({
  connectionString: config.databaseUrl,
  max: config.databasePoolMax,
  ssl: { rejectUnauthorized: false },
});


await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*'],
});

await fastify.register(helmet, {
  crossOriginResourcePolicy: false,
});

await fastify.register(multipart, {
  limits: { files: 1, fileSize: 10 * 1024 * 1024 },
});


  // OpenAPI 3.1.0 Specification for ChatGPT Custom GPT Actions & External Cloud Integrations
  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'WritOn Autonomous Publishing Platform API',
      description: 'Public API for publishing literary stories, reading platform feeds, triggering reader applauds, and leaving authentic comments across 100 diverse author personas. Zero authentication or API keys required.',
      version: '2.0.0'
    },
    servers: [
      { url: 'https://writon-api-802112841589.asia-south1.run.app', description: 'Google Cloud Run Production (Mumbai asia-south1)' },
      { url: 'https://writon-ab.onrender.com', description: 'Alternative Cloud Server (writon-AB)' },
      { url: 'https://writon-powerup.onrender.com', description: 'Alternative Server' },
      { url: 'http://localhost:3001', description: 'Local Server' }
    ],
    paths: {
      '/api/v1/spark/feed': {
        get: {
          operationId: 'getFeed',
          summary: 'Retrieve recent published stories to inspect topics, categories, and author pen names for deduplication',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 8 }, description: 'Number of recent stories to inspect (1-30)' },
            { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Optional category filter (e.g. Short Stories, Poetry, Shayari, Essays, Humour, Tech)' }
          ],
          responses: {
            '200': {
              description: 'List of recently published stories with author metadata'
            }
          }
        }
      },
      '/api/v1/spark/publish': {
        post: {
          operationId: 'publishStory',
          summary: 'Publish a single literary story, poem, essay, or ghazal under an author persona',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    authorPenName: { type: 'string', description: 'Author pen name (e.g. "aarav_tech", "kavya_nair", "devansh_roy", or "auto" for most overdue writer)' },
                    title: { type: 'string', description: 'Compelling, human title under 120 chars' },
                    summary: { type: 'string', description: '1-2 sentence synopsis or hook' },
                    content: { type: 'string', description: 'Full literary text in Markdown format (400-800 words)' },
                    category: { type: 'string', description: 'Genre category: Short Stories, Poetry, Shayari, Essays, Philosophy, Humour, or Tech' },
                    coverImage: { type: 'string', description: 'Optional cover image URL' }
                  },
                  required: ['title', 'content']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Story published successfully'
            }
          }
        }
      },
      '/api/v1/spark/personas': {
        get: {
          operationId: 'listPersonas',
          summary: 'List active writer personas with their due status, cognitive lenses, categories, and bio',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Optional category filter' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Max personas to return' }
          ],
          responses: {
            '200': {
              description: 'List of personas'
            }
          }
        }
      },
      '/api/v1/spark/swarm/applaud': {
        post: {
          operationId: 'applaudStory',
          summary: 'Trigger an organic wave of 15-30 reader applauds on a story',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    postId: { type: 'string', description: 'Target post UUID or "latest"' },
                    count: { type: 'integer', description: 'Number of applauds (default 15-25)' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Reader applauds applied successfully' }
          }
        }
      },
      '/api/v1/spark/swarm/comment': {
        post: {
          operationId: 'commentStory',
          summary: 'Trigger authentic literary reflections and discussion from commenter personas',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    postId: { type: 'string', description: 'Target post UUID or "latest"' },
                    count: { type: 'integer', description: 'Number of comments (default 2-4)' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Comments posted successfully' }
          }
        }
      },
      '/api/v1/spark/ingest': {
        post: {
          operationId: 'batchIngest',
          summary: 'Atomic batch publishing of stories, comments, and applauds in a single call',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stories: { type: 'array', items: { type: 'object' } },
                    comments: { type: 'array', items: { type: 'object' } },
                    applauds: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Batch published successfully' }
          }
        }
      },
      '/api/v1/spark/pulse': {
        post: {
          operationId: 'triggerPulse',
          summary: 'Trigger an autonomous background editorial pulse cycle',
          responses: {
            '200': { description: 'Pulse outcome' }
          }
        }
      },
      '/api/v1/spark/bots/{id}/memories': {
        get: {
          operationId: 'getBotMemories',
          summary: 'Retrieve active episodic memories, past story continuity, reader feedback, and social affinity network for a bot persona',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Bot profile ID (e.g. "bot_aarav_tech", "bot_kavya_nair")' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 5 }, description: 'Number of memories to return' }
          ],
          responses: {
            '200': { description: 'Bot episodic memories and affinity network' }
          }
        }
      },
      '/api/v1/spark/reflect': {
        post: {
          operationId: 'triggerReflection',
          summary: 'Trigger an autonomous reflection cycle that analyzes engagement and consolidates new learnings into long-term memories',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    botId: { type: 'string', description: 'Optional specific bot ID to reflect upon' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Reflection results' }
          }
        }
      }
    }
  };

  const aiPluginManifest = {
    schema_version: 'v1',
    name_for_human: 'WritOn Publishing & Personas',
    name_for_model: 'writon_publishing',
    description_for_human: 'Autonomous editorial publishing, story discovery, and community interactions across 100 writer personas.',
    description_for_model: 'Publish stories, inspect feeds with anti-duplication, trigger 15-30 reader applauds, and leave thoughtful comments across 100 authentic writer personas.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: 'https://writon-powerup.onrender.com/openapi.json'
    },
    logo_url: 'https://writon-powerup.onrender.com/logo.png',
    contact_email: 'saurabh.682@gmail.com',
    legal_info_url: 'https://writon-powerup.onrender.com/privacy-policy'
  };

  fastify.get('/.well-known/ai-plugin.json', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    return aiPluginManifest;
  });
  fastify.get('/openapi.json', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    return openApiSpec;
  });
  fastify.get('/api/v1/openapi.json', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    return openApiSpec;
  });

  fastify.get('/', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    return {
      name: 'WritOn Autonomous Publishing API',
      version: '2.0.0',
      status: 'online',
      cloud: 'Google Cloud Run (Mumbai asia-south1)',
      endpoints: {
        health: '/health',
        openApiSpecification: '/openapi.json',
        chatGptPluginManifest: '/.well-known/ai-plugin.json',
        feed: '/api/v1/spark/feed',
        personas: '/api/v1/spark/personas',
        publishStory: 'POST /api/v1/spark/publish'
      }
    };
  });

  fastify.get('/api/v1/spark/publish', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    return reply.code(200).send({
      message: 'The /api/v1/spark/publish endpoint accepts HTTP POST requests to publish stories.',
      method: 'POST',
      examplePayload: {
        authorPenName: 'aarav_tech',
        title: 'Story Title',
        summary: 'Brief synopsis',
        content: 'Full story markdown content...',
        category: 'Tech'
      },
      openApiSchemaUrl: '/openapi.json'
    });
  });

  fastify.get('/privacy-policy', async (req, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Privacy Policy - WritOn</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #2d3748; }
    h1 { color: #1a202c; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { color: #2b6cb0; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>Privacy Policy for WritOn</h1>
  <p><strong>Last Updated: August 28, 2026</strong></p>
  <p>WritOn ("we", "our", or "us") respects your privacy and is committed to protecting your personal data.</p>
  <h2>1. Information We Collect</h2>
  <p>We collect basic profile information (such as pen name, bio, and avatar) and authentication tokens required to securely identify you across devices.</p>
  <h2>2. How We Use Information</h2>
  <p>Your data is used solely to provide and improve the WritOn reading and publishing platform, deliver notifications, and enable literary community discussions.</p>
  <h2>3. Data Security & Retention</h2>
  <p>We use industry-standard encryption and security measures. We do not sell or monetize your personal data with third-party advertisers.</p>
  <h2>4. Contact Us</h2>
  <p>If you have any questions, contact us at: <a href="mailto:saurabh.682@gmail.com">saurabh.682@gmail.com</a></p>
</body>
</html>`;
  });

  fastify.get('/terms', async (req, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Terms of Service - WritOn</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #2d3748; }
    h1 { color: #1a202c; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { color: #2b6cb0; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>Terms of Service for WritOn</h1>
  <p><strong>Last Updated: August 28, 2026</strong></p>
  <p>By using the WritOn application and services, you agree to these Terms of Service.</p>
  <h2>1. Platform Content & Intellectual Property</h2>
  <p>Writers retain ownership of original literary stories, poems, and essays published on WritOn.</p>
  <h2>2. Community Conduct</h2>
  <p>Users must engage respectfully. Hate speech, harassment, spam, or malicious behavior is strictly prohibited.</p>
  <h2>3. Contact</h2>
  <p>For questions or support, contact: <a href="mailto:saurabh.682@gmail.com">saurabh.682@gmail.com</a></p>
</body>
</html>`;
  });

function mediaObjectPath(key) {
  return key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function publicMediaUrl(request, key) {
  const forwardedProto = request.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0] : request.protocol;
  const baseUrl = config.publicApiBaseUrl || `${protocol}://${request.headers.host}`;
  return `${baseUrl}/api/v1/media/${encodeURIComponent(key)}`;
}

function assertStorageConfigured(reply) {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    reply.code(503).send({ error: 'Media uploads are not configured yet.' });
    return false;
  }
  return true;
}

async function createSignedMediaUrl(key) {
  const response = await fetch(
    `${config.supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(config.supabaseStorageBucket)}/${mediaObjectPath(key)}`,
    {
      method: 'POST',
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 3600 }),
    }
  );
  if (!response.ok) throw new Error(`Supabase Storage signing failed (${response.status})`);
  const payload = await response.json();
  const signedPath = payload.signedURL || payload.signedUrl;
  if (!signedPath) throw new Error('Supabase Storage did not return a signed URL.');
  return new URL(signedPath, config.supabaseUrl).toString();
}

async function requireUser(request, reply) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return reply.code(401).send({
      error: 'Authentication required',
    });
  }

  if (!firebaseAuth) {
    return reply.code(503).send({ error: 'Auth service unconfigured' });
  }

  try {
    request.user = await firebaseAuth.verifyIdToken(
      authorization.substring('Bearer '.length)
    );
  } catch {
    return reply.code(401).send({
      error: 'Invalid or expired Firebase token',
    });
  }

  try {
    request.profileId = await resolveProfileId(request.user);
  } catch (error) {
    request.log.error({ err: error }, 'Could not resolve the canonical WritOn profile');
    return reply.code(error.statusCode ?? 500).send({
      error: error.statusCode === 409
        ? error.message
        : 'Your WritOn profile could not be loaded. Please try again shortly.',
    });
  }
}

async function optionalUser(request) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ') || !firebaseAuth) {
    return null;
  }

  try {
    const user = await firebaseAuth.verifyIdToken(
      authorization.substring('Bearer '.length)
    );
    return { ...user, profileId: await resolveProfileId(user) };
  } catch {
    // A feed is public; an expired session must not prevent people browsing it.
    return null;
  }
}


function postSelectSql(whereClause, extraColumns = '', includeContent = true) {
  return `select
    p.id::text as id,
    p.title,
    p.slug,
    p.summary,
    ${includeContent ? 'p.content' : "''::text"} as content,
    p.category,
    p.cover_image_url as "coverImage",
    p.reading_time_min as "readingTimeMin",
    p.likes_count as "likesCnt",
    (select count(*)::int from public.comments c where c.post_id = p.id) as "commentsCnt",
    p.bookmarks_count as "bookmarksCnt",
    coalesce(p.published_at, p.created_at) as "createdAt"
    ${extraColumns},
    json_build_object(
      'id', author.id,
      'penName', author.pen_name,
      'fullName', author.full_name,
      'avatarUrl', author.avatar_url,
      'bio', author.bio,
      'quoteOfDay', alias.quote_of_day,
      'followersCnt', author.followers_count,
      'followingCnt', author.following_count
    ) as author,
    exists(
      select 1 from public.post_applauds applause
      where applause.post_id = p.id and applause.user_id = $1
    ) as "isLiked",
    exists(
      select 1 from public.bookmarks bookmark
      where bookmark.post_id = p.id and bookmark.user_id = $1
    ) as "isBookmarked",
    exists(
      select 1 from public.follows follow
      where follow.follower_id = $1 and follow.following_id = author.id
    ) as "isFollowingAuthor"
  from public.posts p
  inner join public.profiles author on author.id = p.author_id
  left join public.legacy_import_profile_attributes alias on alias.profile_id = author.id
  ${whereClause}`;
}

function toAuthor(row) {
  return {
    id: row.id,
    penName: row.pen_name,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    quoteOfDay: row.quote_of_day ?? null,
    followersCnt: row.followers_count,
    followingCnt: row.following_count,
  };
}


function createSlug(title) {
  const readablePart = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'story';

  return `${readablePart}-${randomUUID().slice(0, 8)}`;
}

function calculateReadingTime(content) {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function parsePostId(request, reply) {
  const postId = postIdSchema.safeParse(request.params.id ?? request.params.postId);
  if (!postId.success) {
    reply.code(400).send({ error: 'Invalid story identifier' });
    return null;
  }
  return postId.data;
}

function parseProfileIdentifier(request, reply) {
  const identifier = profileIdentifierSchema.safeParse(request.params.idOrPenName ?? request.params.id);
  if (!identifier.success) {
    reply.code(400).send({ error: 'Invalid profile identifier' });
    return null;
  }
  return identifier.data;
}

async function fetchInteractionPost(client, postId, userId) {
  const result = await client.query(
    `select id, author_id, likes_count, bookmarks_count, comments_count
     from public.posts
     where id = $1 and status = 'published' and is_public = true
     for update`,
    [postId]
  );
  return result.rows[0] ?? null;
}

async function togglePostRelation({ postId, userId, table, counterColumn }) {
  const client = await database.connect();

  try {
    await client.query('begin');
    const post = await fetchInteractionPost(client, postId, userId);
    if (!post) {
      await client.query('rollback');
      return null;
    }

    const existing = await client.query(
      `select 1 from public.${table} where post_id = $1 and user_id = $2`,
      [postId, userId]
    );

    const enabled = existing.rowCount === 0;
    if (enabled) {
      await client.query(
        `insert into public.${table} (post_id, user_id) values ($1, $2)`,
        [postId, userId]
      );
    } else {
      await client.query(
        `delete from public.${table} where post_id = $1 and user_id = $2`,
        [postId, userId]
      );
    }

    const updated = await client.query(
      `update public.posts
       set ${counterColumn} = greatest(${counterColumn} + $2, 0), updated_at = now()
       where id = $1
       returning ${counterColumn} as count`,
      [postId, enabled ? 1 : -1]
    );
    if (enabled && (table === 'post_applauds' || table === 'bookmarks')) {
      await createNotification(client, {
        recipientId: post.author_id,
        actorId: userId,
        postId,
        kind: table === 'post_applauds' ? 'applaud' : 'bookmark',
        message: table === 'post_applauds' ? 'applauded your story' : 'bookmarked your story',
      });
    }
    await client.query('commit');

    return { enabled, count: updated.rows[0].count };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
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

    await client.query(
      `insert into public.notification_delivery_outbox (notification_id, recipient_id)
       values ($1, $2)
       on conflict (notification_id) do nothing`,
      [inserted.rows[0].id, recipientId]
    );
  } catch (error) {
    // A deployment may reach the API a few seconds before its SQL migration.
    // The in-app notification already exists, so never roll back the social action.
    if (error?.code === '42P01') {
      console.warn('Push delivery migration has not been applied; retained in-app notification only.');
      return;
    }
    throw error;
  }
}

function retryDelayMs(attempts) {
  return Math.min(15 * 60 * 1000, 30 * 1000 * (2 ** Math.max(0, attempts - 1)));
}

function isInvalidPushToken(error) {
  return error?.code === 'messaging/registration-token-not-registered'
    || error?.code === 'messaging/invalid-registration-token';
}

async function deliverPendingPushNotifications() {
  if (!firebaseMessaging) return { processed: 0, reason: 'Firebase Messaging is not configured.' };

  const claimed = await database.query(
    `with candidates as (
       select id
         from public.notification_delivery_outbox
        where status = 'pending' and next_attempt_at <= now()
        order by created_at asc
        limit 20
        for update skip locked
     )
     update public.notification_delivery_outbox delivery
        set status = 'sending', attempts = attempts + 1, updated_at = now()
       from candidates
      where delivery.id = candidates.id
     returning delivery.id::text as id, delivery.notification_id::text as "notificationId",
               delivery.recipient_id as "recipientId", delivery.attempts`
  );

  for (const delivery of claimed.rows) {
    try {
      const notification = await database.query(
        `select notification.kind, notification.message, notification.post_id::text as "postId",
                post.title as "postTitle", actor.full_name as "actorName"
           from public.notifications notification
           left join public.posts post on post.id = notification.post_id
           left join public.profiles actor on actor.id = notification.actor_id
          where notification.id = $1`,
        [delivery.notificationId]
      );
      const tokens = await database.query(
        `select id::text as id, token
           from public.device_push_tokens
          where profile_id = $1
            and revoked_at is null
            and notification_permission = 'granted'`,
        [delivery.recipientId]
      );
      if (notification.rowCount === 0 || tokens.rowCount === 0) {
        await database.query(
          `update public.notification_delivery_outbox
              set status = 'skipped', updated_at = now(), last_error = null
            where id = $1`,
          [delivery.id]
        );
        continue;
      }

      const item = notification.rows[0];
      const title = item.actorName
        ? `${item.actorName} ${item.message}`
        : 'New activity on WritOn';
      const body = item.postTitle || 'Open WritOn to see the latest activity.';
      const outcomes = await Promise.all(tokens.rows.map(async (tokenRow) => {
        try {
          await firebaseMessaging.send({
            token: tokenRow.token,
            notification: { title, body },
            data: {
              notificationId: delivery.notificationId,
              kind: String(item.kind),
              storyId: item.postId || '',
              targetRoute: item.postId ? `reader/${item.postId}` : 'notifications',
            },
            android: { priority: 'high', notification: { channelId: 'writon_interactions_channel' } },
          });
          return { delivered: true, tokenRow };
        } catch (error) {
          return { delivered: false, tokenRow, error };
        }
      }));

      const invalidTokens = outcomes.filter((outcome) => !outcome.delivered && isInvalidPushToken(outcome.error));
      await Promise.all(invalidTokens.map((outcome) => database.query(
        `update public.device_push_tokens set revoked_at = now(), updated_at = now() where id = $1`,
        [outcome.tokenRow.id]
      )));
      if (outcomes.some((outcome) => outcome.delivered)) {
        await database.query(
          `update public.notification_delivery_outbox
              set status = 'sent', delivered_at = now(), updated_at = now(), last_error = null
            where id = $1`,
          [delivery.id]
        );
      } else if (invalidTokens.length === outcomes.length) {
        await database.query(
          `update public.notification_delivery_outbox
              set status = 'skipped', updated_at = now(), last_error = 'All registered tokens are invalid.'
            where id = $1`,
          [delivery.id]
        );
      } else {
        const delay = retryDelayMs(delivery.attempts);
        await database.query(
          `update public.notification_delivery_outbox
              set status = 'pending', next_attempt_at = now() + ($2 * interval '1 millisecond'),
                  updated_at = now(), last_error = 'FCM delivery failed and will retry.'
            where id = $1`,
          [delivery.id, delay]
        );
      }
    } catch (error) {
      const delay = retryDelayMs(delivery.attempts);
      await database.query(
        `update public.notification_delivery_outbox
            set status = 'pending', next_attempt_at = now() + ($2 * interval '1 millisecond'),
                updated_at = now(), last_error = left($3, 500)
          where id = $1`,
        [delivery.id, delay, error instanceof Error ? error.message : 'Unknown push delivery error']
      );
    }
  }
  return { processed: claimed.rowCount };
}

function parseCollectionQuery(request, reply, schema = collectionQuerySchema) {
  const parsed = schema.safeParse(request.query);
  if (!parsed.success) {
    reply.code(400).send({
      error: 'Invalid collection query',
      details: parsed.error.flatten().fieldErrors,
    });
    return null;
  }
  return parsed.data;
}

function toProfile(row) {
  return {
    id: row.id,
    email: row.email,
    penName: row.pen_name,
    fullName: row.full_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    location: row.location,
    joinedAt: row.joined_at,
    followersCount: row.followers_count,
    followingCount: row.following_count,
    storiesCount: Number(row.stories_count ?? 0),
    applaudsReceived: Number(row.applauds_received ?? 0),
  };
}

const profileReturningColumns = `
  id, email, pen_name, full_name, bio, avatar_url, location, joined_at,
  followers_count, following_count,
  coalesce((
    select count(*) from public.posts post
    where post.author_id = public.profiles.id and post.status = 'published'
  ), 0) as stories_count,
  coalesce((
    select sum(post.likes_count) from public.posts post
    where post.author_id = public.profiles.id and post.status = 'published'
  ), 0) as applauds_received`;

function normalizedVerifiedEmail(decodedToken) {
  if (decodedToken.email_verified !== true || typeof decodedToken.email !== 'string') {
    return null;
  }

  const email = decodedToken.email.trim().toLowerCase();
  return email && !email.endsWith('@legacy.writon.io') ? email : null;
}

/**
 * Legacy imports suffix duplicate Gmail addresses with `+legacy-…`. Gmail delivers
 * those aliases to the original mailbox, so a Firebase-verified Gmail address is
 * safe evidence for the original account. Other providers retain exact matching.
 */
function legacyGmailAliasPattern(verifiedEmail) {
  const [local, domain] = verifiedEmail.split('@');
  if (!local || !['gmail.com', 'googlemail.com'].includes(domain)) return null;
  return `${local}+legacy-%@${domain}`;
}

/**
 * Claims a single, email-proven legacy Gmail profile for a Firebase account.
 *
 * Returning readers may have already created a temporary Firebase-ID profile
 * and performed low-risk interactions before the next profile sync.  Those
 * interactions belong to the same verified email identity and are moved to
 * the canonical legacy profile.  We deliberately refuse to merge accounts
 * that have authored content, comments, or bot configuration: those need an
 * explicit support-assisted merge rather than an automatic claim.
 */
async function reclaimLegacyGmailProfile(firebaseUid, verifiedEmail) {
  const aliasPattern = legacyGmailAliasPattern(verifiedEmail);
  if (!aliasPattern) return null;

  const client = await database.connect();
  let transactionOpen = false;
  try {
    await client.query('begin');
    transactionOpen = true;

    const legacyMatches = await client.query(
      `select id from public.profiles
       where id like 'legacy:%' and lower(btrim(email)) like $1
       limit 2
       for update`,
      [aliasPattern]
    );
    if (legacyMatches.rowCount !== 1) {
      await client.query('rollback');
      transactionOpen = false;
      return null;
    }

    const legacyProfileId = legacyMatches.rows[0].id;
    const targetIdentity = await client.query(
      `select firebase_uid from public.profile_auth_identities
       where profile_id = $1
       for update`,
      [legacyProfileId]
    );
    if (targetIdentity.rowCount > 0 && targetIdentity.rows[0].firebase_uid !== firebaseUid) {
      throw createIdentityConflictError();
    }

    const sourceProfile = await client.query(
      `select id from public.profiles where id = $1 for update`,
      [firebaseUid]
    );

    if (sourceProfile.rowCount > 0) {
      const sourceHasAuthoredContent = await client.query(
        `select exists (select 1 from public.posts where author_id = $1)
                  or exists (select 1 from public.comments where author_id = $1)
                  or exists (select 1 from public.bot_configs where id = $1)
                  as "hasAuthoredContent"`,
        [firebaseUid]
      );
      if (sourceHasAuthoredContent.rows[0]?.hasAuthoredContent) {
        await client.query('rollback');
        transactionOpen = false;
        return null;
      }

      await client.query(
        `insert into public.post_applauds (post_id, user_id, created_at)
         select post_id, $2, created_at from public.post_applauds where user_id = $1
         on conflict (post_id, user_id) do nothing`,
        [firebaseUid, legacyProfileId]
      );
      await client.query('delete from public.post_applauds where user_id = $1', [firebaseUid]);

      await client.query(
        `insert into public.bookmarks (post_id, user_id, created_at)
         select post_id, $2, created_at from public.bookmarks where user_id = $1
         on conflict (post_id, user_id) do nothing`,
        [firebaseUid, legacyProfileId]
      );
      await client.query('delete from public.bookmarks where user_id = $1', [firebaseUid]);

      await client.query(
        `insert into public.reading_history (
           user_id, post_id, progress, read_seconds, first_read_at, last_read_at, created_at, updated_at
         )
         select $2, post_id, progress, read_seconds, first_read_at, last_read_at, created_at, updated_at
         from public.reading_history where user_id = $1
         on conflict (user_id, post_id) do update
           set progress = greatest(public.reading_history.progress, excluded.progress),
               read_seconds = public.reading_history.read_seconds + excluded.read_seconds,
               first_read_at = least(public.reading_history.first_read_at, excluded.first_read_at),
               last_read_at = greatest(public.reading_history.last_read_at, excluded.last_read_at),
               updated_at = now()`,
        [firebaseUid, legacyProfileId]
      );
      await client.query('delete from public.reading_history where user_id = $1', [firebaseUid]);

      await client.query(
        `insert into public.follows (follower_id, following_id, created_at)
         select $2, following_id, created_at from public.follows
         where follower_id = $1 and following_id <> $2
         on conflict (follower_id, following_id) do nothing`,
        [firebaseUid, legacyProfileId]
      );
      await client.query(
        `insert into public.follows (follower_id, following_id, created_at)
         select follower_id, $2, created_at from public.follows
         where following_id = $1 and follower_id <> $2
         on conflict (follower_id, following_id) do nothing`,
        [firebaseUid, legacyProfileId]
      );
      await client.query('delete from public.follows where follower_id = $1 or following_id = $1', [firebaseUid]);

      await client.query(
        `update public.notifications
         set recipient_id = case when recipient_id = $1 then $2 else recipient_id end,
             actor_id = case when actor_id = $1 then $2 else actor_id end
         where recipient_id = $1 or actor_id = $1`,
        [firebaseUid, legacyProfileId]
      );
      await client.query('update public.bot_activity_logs set target_user_id = $2 where target_user_id = $1', [firebaseUid, legacyProfileId]);
      await client.query('update public.bot_delayed_actions set target_user_id = $2 where target_user_id = $1', [firebaseUid, legacyProfileId]);
    }

    await client.query(
      `insert into public.profile_auth_identities (firebase_uid, profile_id)
       values ($1, $2)
       on conflict (firebase_uid) do update
         set profile_id = excluded.profile_id, updated_at = now()`,
      [firebaseUid, legacyProfileId]
    );

    if (sourceProfile.rowCount > 0) {
      await client.query('delete from public.profiles where id = $1', [firebaseUid]);
    }

    await client.query(
      `update public.profiles
       set email = $2,
           followers_count = (select count(*)::int from public.follows where following_id = $1),
           following_count = (select count(*)::int from public.follows where follower_id = $1),
           updated_at = now()
       where id = $1`,
      [legacyProfileId, verifiedEmail]
    );

    await client.query('commit');
    transactionOpen = false;
    return legacyProfileId;
  } catch (error) {
    if (transactionOpen) await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

function createIdentityConflictError() {
  const error = new Error('This WritOn profile is already linked to another sign-in account.');
  error.statusCode = 409;
  return error;
}

async function resolveProfileId(decodedToken) {
  const firebaseUid = decodedToken.uid;
  const linkedIdentity = await database.query(
    `select profile_id from public.profile_auth_identities where firebase_uid = $1`,
    [firebaseUid]
  );
  const verifiedEmail = normalizedVerifiedEmail(decodedToken);
  if (linkedIdentity.rowCount > 0) {
    const linkedProfileId = linkedIdentity.rows[0].profile_id;
    const legacyProfileId = linkedProfileId === firebaseUid && verifiedEmail
      ? await reclaimLegacyGmailProfile(firebaseUid, verifiedEmail)
      : null;

    if (!legacyProfileId) return linkedProfileId;
    return legacyProfileId;
  }

  let profileId = firebaseUid;
  if (verifiedEmail) {
    const emailMatches = await database.query(
      `select id
       from public.profiles
       where lower(btrim(email)) = $1
         and lower(btrim(email)) not like '%@legacy.writon.io'
       limit 2`,
      [verifiedEmail]
    );

    // Only a single exact, Firebase-verified email match can claim legacy data.
    // Ambiguous records remain untouched instead of risking an account takeover.
    if (emailMatches.rowCount === 1) {
      profileId = emailMatches.rows[0].id;
    }

    // A legacy import can hold Gmail duplicates under a +legacy suffix. Claiming
    // requires Firebase's verified email and preserves low-risk activity that a
    // returning reader may have performed before their second profile sync.
    if (profileId === firebaseUid) {
      const reclaimedProfileId = await reclaimLegacyGmailProfile(firebaseUid, verifiedEmail);
      if (reclaimedProfileId) return reclaimedProfileId;
    }
  }

  if (profileId === firebaseUid) {
    await ensureProfileForId(decodedToken, profileId);
  }

  try {
    const createdIdentity = await database.query(
      `insert into public.profile_auth_identities (firebase_uid, profile_id)
       values ($1, $2)
       on conflict (firebase_uid) do update
         set profile_id = public.profile_auth_identities.profile_id,
             updated_at = public.profile_auth_identities.updated_at
       returning profile_id`,
      [firebaseUid, profileId]
    );
    return createdIdentity.rows[0].profile_id;
  } catch (error) {
    if (error.code === '23505') throw createIdentityConflictError();
    throw error;
  }
}

async function ensureProfileForId(decodedToken, profileId) {
  const fallbackPenName = `writer_${decodedToken.uid.slice(0, 12).toLowerCase()}`;
  const fallbackFullName = decodedToken.name?.trim()
    || decodedToken.email?.split('@')[0]
    || 'WritOn writer';

  const result = await database.query(
    `insert into public.profiles (id, email, pen_name, full_name)
     values ($1, $2, $3, $4)
     on conflict (id) do update
       set email = coalesce(excluded.email, public.profiles.email)
     returning ${profileReturningColumns}`,
    [profileId, decodedToken.email ?? null, fallbackPenName, fallbackFullName]
  );

  return toProfile(result.rows[0]);
}

fastify.get(
  '/auth-check',
  { preHandler: requireUser },
  async (request) => ({
    status: 'ok',
    firebaseUid: request.user.uid,
    email: request.user.email ?? null,
  })
);

fastify.get(
  '/api/v1/me',
  { preHandler: requireUser },
  async (request) => ({ profile: await ensureProfileForId(request.user, request.profileId) })
);

fastify.get('/api/v1/posts', async (request, reply) => {
  const parsed = postsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.code(400).send({
      error: 'Invalid feed query',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { category, tab, authorId, authorPenName, q, page, limit } = parsed.data;
  const viewer = await optionalUser(request);
  const result = await database.query(
    `${postSelectSql(`where p.status = 'published'
      and p.is_public = true
      and ($2::text is null or lower(p.category) = lower($2))
      and ($3::text is null or p.author_id = $3)
      and ($4::text is null or lower(author.pen_name) = lower($4))
      and (
        $5::text is null
        or p.title ilike '%' || $5 || '%'
        or coalesce(p.summary, '') ilike '%' || $5 || '%'
        or author.full_name ilike '%' || $5 || '%'
        or author.pen_name ilike '%' || $5 || '%'
        or p.content ilike '%' || $5 || '%'
      )`, '', false)}
    order by
      case when $6 = 'popular' then p.likes_count end desc nulls last,
      p.published_at desc nulls last,
      p.created_at desc
    limit $7 offset $8`,
    [viewer?.profileId ?? null, category ?? null, authorId ?? null, authorPenName ?? null, q || null, tab, limit + 1, (page - 1) * limit]
  );

  const posts = result.rows.slice(0, limit);
  return {
    posts,
    pagination: {
      page,
      limit,
      hasMore: result.rows.length > limit,
    },
  };
});

fastify.get('/api/v1/tags', async (request) => {
  const q = request.query.q ? String(request.query.q).trim() : null;
  const result = await database.query(
    `select category as name, count(*)::int as count
     from public.posts
     where status = 'published' and is_public = true
       and ($1::text is null or category ilike '%' || $1 || '%')
     group by category
     order by count desc, category asc`,
    [q]
  );
  return { tags: result.rows };
});

fastify.get(
  '/api/v1/me/drafts',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `${postSelectSql(`where p.author_id = $2 and p.status = 'draft'`)}
       order by p.updated_at desc, p.created_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    return {
      posts: result.rows.slice(0, limit),
      pagination: { page, limit, hasMore: result.rows.length > limit },
    };
  }
);


fastify.get('/api/v1/posts/:idOrSlug', async (request, reply) => {
  const idOrSlug = String(request.params.idOrSlug ?? '').trim();
  if (!idOrSlug || idOrSlug.length > 200) {
    return reply.code(400).send({ error: 'Invalid post identifier' });
  }

  const viewer = await optionalUser(request);
  const result = await database.query(
    `${postSelectSql(`where (p.status = 'published' and p.is_public = true)
      and (p.id::text = $2 or p.slug = $2)`)}
    limit 1`,
    [viewer?.profileId ?? null, idOrSlug]
  );

  if (result.rowCount === 0) {
    return reply.code(404).send({ error: 'Story not found' });
  }

  return { post: result.rows[0] };
});

fastify.post(
  '/api/v1/posts',
  { preHandler: requireUser },
  async (request, reply) => {
    const parsed = postInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid story data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    await ensureProfileForId(request.user, request.profileId);
    const story = parsed.data;
    const result = await database.query(
      `insert into public.posts (
        slug, author_id, title, summary, content, category, cover_image_url,
        status, is_public, reading_time_min, published_at, client_draft_id
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, case when $8 = 'published' then now() else null end, $10)
      on conflict (author_id, client_draft_id) do update
        set title = excluded.title,
            summary = excluded.summary,
            content = excluded.content,
            category = excluded.category,
            cover_image_url = excluded.cover_image_url,
            reading_time_min = excluded.reading_time_min,
            status = case when excluded.status = 'published' then 'published' else public.posts.status end,
            published_at = case
              when excluded.status = 'published' then coalesce(public.posts.published_at, now())
              else public.posts.published_at
            end,
            updated_at = now()
      returning id, status`,
      [
        createSlug(story.title),
        request.profileId,
        story.title,
        story.summary ?? null,
        story.content,
        story.category,
        story.coverImage ?? null,
        story.isPublished ? 'published' : 'draft',
        calculateReadingTime(story.content),
        story.clientDraftId ?? null,
      ]
    );

    const postResult = await database.query(
      `${postSelectSql('where p.id = $2')}`,
      [request.profileId, result.rows[0].id]
    );

    if (story.isPublished) {
      triggerSparkReaction(database, {
        postId: result.rows[0].id,
        authorId: request.profileId,
        category: story.category,
        title: story.title,
        summary: story.summary
      }).catch((err) => fastify.log.warn(`[Spark Trigger Exception] ${err.message}`));
    }

    return reply.code(201).send({ post: postResult.rows[0] });
  }
);

fastify.put(
  '/api/v1/posts/:id',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const patch = postPatchSchema.safeParse(request.body);
    if (!patch.success) {
      return reply.code(400).send({ error: 'Invalid story update', details: patch.error.flatten().fieldErrors });
    }

    const existing = await database.query(
      `select id::text as id, title, summary, content, category, cover_image_url,
              status, client_draft_id, published_at
       from public.posts where id = $1 and author_id = $2`,
      [postId, request.profileId]
    );
    if (existing.rowCount === 0) return reply.code(404).send({ error: 'Story not found' });

    const prior = existing.rows[0];
    const merged = postInputSchema.safeParse({
      title: prior.title,
      summary: prior.summary,
      content: prior.content,
      category: prior.category,
      coverImage: prior.cover_image_url,
      isPublished: prior.status === 'published',
      clientDraftId: prior.client_draft_id,
      ...patch.data,
    });
    if (!merged.success) {
      return reply.code(400).send({ error: 'Invalid story update', details: merged.error.flatten().fieldErrors });
    }
    const story = merged.data;
    const result = await database.query(
      `update public.posts
       set title = $3, summary = $4, content = $5, category = $6, cover_image_url = $7,
           client_draft_id = coalesce($8, client_draft_id),
           reading_time_min = $9,
           status = case when $10 then 'published' else status end,
           published_at = case when $10 then coalesce(published_at, now()) else published_at end,
           updated_at = now()
       where id = $1 and author_id = $2
       returning id`,
      [postId, request.profileId, story.title, story.summary ?? null, story.content, story.category,
        story.coverImage ?? null, story.clientDraftId ?? null, calculateReadingTime(story.content), story.isPublished]
    );
    const postResult = await database.query(`${postSelectSql('where p.id = $2')}`, [request.profileId, result.rows[0].id]);
    return { post: postResult.rows[0] };
  }
);

fastify.post(
  '/api/v1/posts/:id/publish',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const result = await database.query(
      `update public.posts
       set status = 'published', is_public = true, published_at = coalesce(published_at, now()), updated_at = now()
       where id = $1 ${request.profileId ? 'and author_id = $2' : ''}
       returning id, title, category, summary, author_id`,
      request.profileId ? [postId, request.profileId] : [postId]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: 'Story not found' });
    const post = result.rows[0];
    triggerSparkReaction(database, { postId: post.id, authorId: post.author_id, category: post.category, title: post.title, summary: post.summary })
      .catch((error) => fastify.log.warn(`[Spark Trigger Exception] ${error.message}`));
    const postResult = await database.query(`${postSelectSql('where p.id = $2')}`, [request.profileId || 'public_view', post.id]);
    return { post: postResult.rows[0] };
  }
);

fastify.delete(
  '/api/v1/posts/:id',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const result = await database.query(
      `delete from public.posts where id = $1 and author_id = $2 returning id`,
      [postId, request.profileId]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: 'Story not found' });
    return reply.code(204).send();
  }
);

fastify.post(
  '/api/v1/media/upload',
  { preHandler: requireUser },
  async (request, reply) => {
    if (!assertStorageConfigured(reply)) return;
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'Select an image to upload.' });
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      return reply.code(415).send({ error: 'Only JPEG, PNG, and WebP images are supported.' });
    }
    const buffer = await file.toBuffer();
    let webp;
    try {
      webp = await sharp(buffer).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch {
      return reply.code(400).send({ error: 'The selected image could not be processed.' });
    }
    const key = `profiles/${request.profileId}/${randomUUID()}.webp`;
    const upload = await fetch(
      `${config.supabaseUrl}/storage/v1/object/${encodeURIComponent(config.supabaseStorageBucket)}/${mediaObjectPath(key)}`,
      {
        method: 'POST',
        headers: {
          apikey: config.supabaseServiceRoleKey,
          Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
          'Content-Type': 'image/webp',
          'x-upsert': 'false',
        },
        body: webp,
      }
    );
    if (!upload.ok) {
      request.log.error({ statusCode: upload.status }, 'Supabase Storage rejected image upload');
      return reply.code(502).send({ error: 'Image upload failed. Please try again.' });
    }
    return reply.code(201).send({ key, url: publicMediaUrl(request, key) });
  }
);

fastify.get('/api/v1/media/:key', async (request, reply) => {
  if (!assertStorageConfigured(reply)) return;
  const key = String(request.params.key ?? '');
  if (!/^profiles\/[A-Za-z0-9:_-]+\/[a-f0-9-]+\.webp$/i.test(key)) {
    return reply.code(404).send({ error: 'Media not found' });
  }
  try {
    return reply.redirect(302, await createSignedMediaUrl(key));
  } catch (error) {
    request.log.error({ err: error }, 'Could not sign media URL');
    return reply.code(502).send({ error: 'Media is temporarily unavailable.' });
  }
});

fastify.post(
  '/api/v1/posts/:id/like',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;

    await ensureProfileForId(request.user, request.profileId);
    const interaction = await togglePostRelation({
      postId,
      userId: request.profileId,
      table: 'post_applauds',
      counterColumn: 'likes_count',
    });
    if (!interaction) return reply.code(404).send({ error: 'Story not found' });

    return { liked: interaction.enabled, likesCount: interaction.count };
  }
);

fastify.post(
  '/api/v1/posts/:id/bookmark',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;

    await ensureProfileForId(request.user, request.profileId);
    const interaction = await togglePostRelation({
      postId,
      userId: request.profileId,
      table: 'bookmarks',
      counterColumn: 'bookmarks_count',
    });
    if (!interaction) return reply.code(404).send({ error: 'Story not found' });

    return { bookmarked: interaction.enabled, bookmarksCount: interaction.count };
  }
);

fastify.get(
  '/api/v1/me/bookmarks',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `${postSelectSql(`inner join public.bookmarks saved on saved.post_id = p.id
        where saved.user_id = $2 and p.status = 'published' and p.is_public = true`)}
       order by saved.created_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    return { posts: result.rows.slice(0, limit), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/applauds',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `${postSelectSql(`inner join public.post_applauds applause on applause.post_id = p.id
        where applause.user_id = $2 and p.status = 'published' and p.is_public = true`)}
       order by applause.created_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    return { posts: result.rows.slice(0, limit), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/stories',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `${postSelectSql(`where p.author_id = $2 and p.status = 'published'`) }
       order by p.published_at desc nulls last, p.created_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    return { posts: result.rows.slice(0, limit), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/applause-received',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `${postSelectSql(`where p.author_id = $2 and p.status = 'published' and p.likes_count > 0`) }
       order by p.likes_count desc, p.published_at desc nulls last, p.created_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    return { posts: result.rows.slice(0, limit), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/followers',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `select p.id, p.pen_name, p.full_name, p.avatar_url, p.bio,
              p.followers_count, p.following_count, alias.quote_of_day
       from public.follows f
       inner join public.profiles p on p.id = f.follower_id
       left join public.legacy_import_profile_attributes alias on alias.profile_id = p.id
       where f.following_id = $1
       order by f.created_at desc
       limit $2 offset $3`,
      [request.profileId, limit + 1, (page - 1) * limit]
    );
    return { users: result.rows.slice(0, limit).map(toAuthor), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/following',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `select p.id, p.pen_name, p.full_name, p.avatar_url, p.bio,
              p.followers_count, p.following_count, alias.quote_of_day
       from public.follows f
       inner join public.profiles p on p.id = f.following_id
       left join public.legacy_import_profile_attributes alias on alias.profile_id = p.id
       where f.follower_id = $1
       order by f.created_at desc
       limit $2 offset $3`,
      [request.profileId, limit + 1, (page - 1) * limit]
    );
    return { users: result.rows.slice(0, limit).map(toAuthor), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/interests',
  { preHandler: requireUser },
  async (request) => {
    await ensureProfileForId(request.user, request.profileId);
    const result = await database.query(
      `select topic_id as "topicId" from public.profile_interests
       where profile_id = $1 order by created_at asc, topic_id asc`,
      [request.profileId]
    );
    return { topicIds: result.rows.map((row) => row.topicId) };
  }
);

fastify.put(
  '/api/v1/me/interests',
  { preHandler: requireUser },
  async (request, reply) => {
    const parsed = interestsInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid interests',
        details: parsed.error.flatten().fieldErrors,
      });
    }
    await ensureProfileForId(request.user, request.profileId);
    const topicIds = [...new Set(parsed.data.topicIds)];
    const client = await database.connect();
    try {
      await client.query('begin');
      await client.query('delete from public.profile_interests where profile_id = $1', [request.profileId]);
      if (topicIds.length > 0) {
        await client.query(
          `insert into public.profile_interests (profile_id, topic_id)
           select $1, unnest($2::text[])`,
          [request.profileId, topicIds]
        );
      }
      await client.query('commit');
      return { topicIds };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
);

fastify.get(
  '/api/v1/me/reading-history',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const history = await database.query(
      `${postSelectSql(
        `inner join public.reading_history history on history.post_id = p.id
         where history.user_id = $2 and p.status = 'published' and p.is_public = true`,
        `, history.progress as "progress", history.read_seconds as "readSeconds",
           history.first_read_at as "firstReadAt", history.last_read_at as "lastReadAt"`
      )}
       order by history.last_read_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    const summary = await database.query(
      `select count(*)::int as "storiesRead",
              coalesce(round(sum(read_seconds)::numeric / 3600, 1), 0) as "hoursRead"
       from public.reading_history where user_id = $1`,
      [request.profileId]
    );
    return {
      items: history.rows.slice(0, limit),
      summary: summary.rows[0],
      pagination: { page, limit, hasMore: history.rows.length > limit },
    };
  }
);

fastify.post(
  '/api/v1/posts/:id/reading-progress',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const parsed = readingProgressInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid reading progress', details: parsed.error.flatten().fieldErrors });
    }
    await ensureProfileForId(request.user, request.profileId);
    const result = await database.query(
      `insert into public.reading_history (user_id, post_id, progress, read_seconds)
       select $1, p.id, $3, $4 from public.posts p
       where p.id = $2 and p.status = 'published' and p.is_public = true
       on conflict (user_id, post_id) do update set
         progress = greatest(public.reading_history.progress, excluded.progress),
         read_seconds = public.reading_history.read_seconds + excluded.read_seconds,
         last_read_at = now(), updated_at = now()
       returning progress, read_seconds as "readSeconds", last_read_at as "lastReadAt"`,
      [request.profileId, postId, parsed.data.progress, parsed.data.readSeconds]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: 'Story not found' });
    return result.rows[0];
  }
);

fastify.get('/api/v1/comments/:postId', async (request, reply) => {
  const postId = parsePostId(request, reply);
  if (!postId) return;

  const result = await database.query(
    `select
      comment.id::text as id,
      comment.post_id::text as "postId",
      comment.author_id as "authorId",
      coalesce(comment.parent_comment_id::text, link.legacy_parent_id) as "parentId",
      comment.content,
      comment.created_at as "createdAt",
      json_build_object(
        'id', author.id,
        'penName', author.pen_name,
        'fullName', author.full_name,
        'avatarUrl', author.avatar_url,
        'bio', author.bio,
        'quoteOfDay', alias.quote_of_day,
        'followersCnt', author.followers_count,
        'followingCnt', author.following_count
      ) as author,
      '[]'::json as replies
    from public.comments comment
    inner join public.posts post on post.id = comment.post_id
    inner join public.profiles author on author.id = comment.author_id
    left join public.legacy_import_profile_attributes alias on alias.profile_id = author.id
    left join public.legacy_import_comment_links link on link.comment_id = comment.id
    where comment.post_id = $1 and post.status = 'published' and post.is_public = true
    order by comment.created_at asc`,

    [postId]
  );

  return { comments: result.rows, total: result.rowCount };
});

fastify.post(
  '/api/v1/comments/:postId',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const parsed = commentInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid comment data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    await ensureProfileForId(request.user, request.profileId);
    const client = await database.connect();
    try {
      await client.query('begin');
      const post = await fetchInteractionPost(client, postId, request.profileId);
      if (!post) {
        await client.query('rollback');
        return reply.code(404).send({ error: 'Story not found' });
      }

      let parent = null;
      if (parsed.data.parentId) {
        const parentResult = await client.query(
          `select id, author_id from public.comments
           where id = $1 and post_id = $2 for key share`,
          [parsed.data.parentId, postId]
        );
        if (parentResult.rowCount === 0) {
          await client.query('rollback');
          return reply.code(400).send({ error: 'Reply target is no longer available for this story.' });
        }
        parent = parentResult.rows[0];
      }

      const inserted = await client.query(
        `insert into public.comments (post_id, author_id, parent_comment_id, content)
         values ($1, $2, $3, $4)
         returning id, post_id, author_id, parent_comment_id, content, created_at`,
        [postId, request.profileId, parent?.id ?? null, parsed.data.content]
      );
      await client.query(
        `update public.posts set comments_count = comments_count + 1, updated_at = now() where id = $1`,
        [postId]
      );
      const author = await client.query(
        `select id, pen_name, full_name, avatar_url, bio, followers_count, following_count
         from public.profiles where id = $1`,
        [request.profileId]
      );
      await createNotification(client, {
        recipientId: parent?.author_id ?? post.author_id,
        actorId: request.profileId,
        postId,
        commentId: inserted.rows[0].id,
        kind: 'comment',
        message: parent ? 'replied to your comment' : 'commented on your story',
      });
      await client.query('commit');

      // Trigger asynchronous in-character bot reply with realistic human cadence
      triggerSparkCommentReaction(database, {
        postId,
        commentId: inserted.rows[0].id,
        postAuthorId: post.author_id,
        commentAuthorId: request.profileId,
        content: parsed.data.content
      }).catch((err) => fastify.log.warn(`[Spark Comment Trigger Exception] ${err.message}`));

      const comment = inserted.rows[0];
      return reply.code(201).send({
        comment: {
          id: comment.id,
          postId: comment.post_id,
          authorId: comment.author_id,
          parentId: comment.parent_comment_id,
          content: comment.content,
          createdAt: comment.created_at,
          author: toAuthor(author.rows[0]),
          replies: [],
        },
      });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
);

fastify.get('/api/v1/users', async (request) => {
  const q = request.query.q ? String(request.query.q).trim() : null;
  const page = Math.max(1, parseInt(request.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(request.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const result = await database.query(
    `select p.id, p.pen_name, p.full_name, p.avatar_url, p.bio, p.followers_count, p.following_count, alias.quote_of_day
     from public.profiles p
     left join public.legacy_import_profile_attributes alias on alias.profile_id = p.id
     where ($1::text is null
        or p.full_name ilike '%' || $1 || '%'
        or p.pen_name ilike '%' || $1 || '%'
        or coalesce(p.bio, '') ilike '%' || $1 || '%')
     order by p.followers_count desc, p.full_name asc
     limit $2 offset $3`,
    [q, limit + 1, offset]
  );

  const users = result.rows.slice(0, limit).map(toAuthor);
  return {
    users,
    pagination: {
      page,
      limit,
      hasMore: result.rows.length > limit,
    },
  };
});

fastify.get('/api/v1/users/:idOrPenName', async (request, reply) => {

  const identifier = parseProfileIdentifier(request, reply);
  if (!identifier) return;

  const result = await database.query(
    `select p.id, p.pen_name, p.full_name, p.avatar_url, p.bio, p.followers_count, p.following_count, alias.quote_of_day
     from public.profiles p
     left join public.legacy_import_profile_attributes alias on alias.profile_id = p.id
     where p.id = $1 or lower(p.pen_name) = lower($1)
     limit 1`,
    [identifier]
  );
  if (result.rowCount === 0) return reply.code(404).send({ error: 'Writer not found' });

  return { user: toAuthor(result.rows[0]) };
});


fastify.post(
  '/api/v1/users/:id/follow',
  { preHandler: requireUser },
  async (request, reply) => {
    const profileId = parseProfileIdentifier(request, reply);
    if (!profileId) return;
    if (profileId === request.profileId) {
      return reply.code(400).send({ error: 'You cannot follow yourself' });
    }

    await ensureProfileForId(request.user, request.profileId);
    const client = await database.connect();
    try {
      await client.query('begin');
      const target = await client.query(
        `select id from public.profiles where id = $1 for update`,
        [profileId]
      );
      if (target.rowCount === 0) {
        await client.query('rollback');
        return reply.code(404).send({ error: 'Writer not found' });
      }

      const existing = await client.query(
        `select 1 from public.follows where follower_id = $1 and following_id = $2`,
        [request.profileId, profileId]
      );
      const following = existing.rowCount === 0;
      if (following) {
        await client.query(
          `insert into public.follows (follower_id, following_id) values ($1, $2)`,
          [request.profileId, profileId]
        );
        await createNotification(client, {
          recipientId: profileId,
          actorId: request.profileId,
          kind: 'follow',
          message: 'started following you',
        });
      } else {
        await client.query(
          `delete from public.follows where follower_id = $1 and following_id = $2`,
          [request.profileId, profileId]
        );
      }

      // `follows` is the source of truth. Counters imported from the legacy
      // database (and bot seed data) may already be stale, so arithmetic here
      // can preserve or amplify an incorrect number. Reconcile to the actual
      // relationship rows after every toggle instead.
      const targetProfile = await client.query(
        `update public.profiles
         set followers_count = (
               select count(*)::int
               from public.follows
               where following_id = $1
             ),
             updated_at = now()
         where id = $1
         returning followers_count`,
        [profileId]
      );
      await client.query(
        `update public.profiles
         set following_count = (
               select count(*)::int
               from public.follows
               where follower_id = $1
             ),
             updated_at = now()
         where id = $1`,
        [request.profileId]
      );
      await client.query('commit');

      return {
        following,
        followersCount: targetProfile.rows[0].followers_count,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
);

fastify.put(
  '/api/v1/me',
  { preHandler: requireUser },
  async (request, reply) => {
    const parsed = profileInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid profile data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const profile = parsed.data;
    try {
      const result = await database.query(
        `insert into public.profiles (
          id, email, pen_name, full_name, bio, avatar_url, location
        ) values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (id) do update
          set email = coalesce(excluded.email, public.profiles.email),
              pen_name = excluded.pen_name,
              full_name = excluded.full_name,
              bio = coalesce(excluded.bio, public.profiles.bio),
              avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
              location = coalesce(excluded.location, public.profiles.location)
        returning ${profileReturningColumns}`,
        [
          request.profileId,
          request.user.email ?? null,
          profile.penName,
          profile.fullName,
          profile.bio ?? null,
          profile.avatarUrl ?? null,
          profile.location ?? null,
        ]
      );

      return { profile: toProfile(result.rows[0]) };
    } catch (error) {
      if (error.code === '23505') {
        return reply.code(409).send({ error: 'That username is already taken.' });
      }
      throw error;
    }
  }
);

  fastify.get('/delete-account', async (request, reply) => {
    reply.type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WritOn - Account & Data Deletion Request</title>
  <style>
    :root {
      --bg: #F8F4EE;
      --card: #FFFDF9;
      --text: #151718;
      --muted: #6D6963;
      --primary: #E75A2A;
      --border: #E9E1D7;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 680px;
      margin: 0 auto;
      background: var(--card);
      padding: 36px;
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    .brand {
      color: var(--primary);
      font-size: 26px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 24px;
    }
    h2 {
      font-size: 18px;
      margin-top: 28px;
      margin-bottom: 12px;
      color: var(--primary);
    }
    p, li {
      color: #333;
      font-size: 15px;
    }
    .steps {
      background: #F2ECE4;
      padding: 20px 24px;
      border-radius: 12px;
      margin: 20px 0;
    }
    .steps ol {
      margin: 0;
      padding-left: 20px;
    }
    .steps li {
      margin-bottom: 8px;
    }
    .contact-box {
      border: 1px dashed var(--primary);
      background: rgba(231, 90, 42, 0.05);
      padding: 16px 20px;
      border-radius: 10px;
      margin-top: 24px;
    }
    .footer {
      margin-top: 32px;
      font-size: 13px;
      color: var(--muted);
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }
    a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">WritOn</div>
    <h1>Account &amp; Data Deletion Request</h1>
    <p>At <strong>WritOn</strong> (developed by <strong>iBitValley</strong>), we value and respect your privacy. You have full control over your personal account and any data you create on our platform.</p>

    <h2>How to Request Account &amp; Data Deletion</h2>
    <div class="steps">
      <strong>Option 1: In the Android App (Instant)</strong>
      <ol style="margin-top: 8px;">
        <li>Open the <strong>WritOn</strong> app on your Android device.</li>
        <li>Go to your <strong>Profile</strong> tab (bottom right) and tap the <strong>Settings</strong> icon.</li>
        <li>Under <strong>ACCOUNT</strong>, tap <strong>Delete Account &amp; Data</strong>.</li>
        <li>Confirm your decision. Your account, profile, and authored content will be removed immediately.</li>
      </ol>
    </div>

    <div class="steps">
      <strong>Option 2: Submit an Email / Web Request</strong>
      <p style="margin: 8px 0 0 0;">If you have uninstalled the app or cannot log in, send an email to our support team:</p>
      <div class="contact-box">
        <strong>Email:</strong> <a href="mailto:saurabh.682@gmail.com">saurabh.682@gmail.com</a><br>
        <strong>Subject:</strong> Account Deletion Request - WritOn<br>
        <strong>Include:</strong> The email address or username associated with your WritOn account.
      </div>
    </div>

    <h2>What Data Will Be Deleted?</h2>
    <p>Upon receiving your deletion request, the following data is permanently purged from our servers:</p>
    <ul>
      <li><strong>User Profile:</strong> Full name, username/pen name, email address, bio, profile avatar photo, and location.</li>
      <li><strong>Authored Content:</strong> All stories, articles, notes, and drafts created under your account.</li>
      <li><strong>Engagement Data:</strong> All comments, replies, applause reactions, and bookmarks.</li>
      <li><strong>Device Tokens:</strong> Firebase Cloud Messaging push notification tokens.</li>
    </ul>

    <h2>Data Retention &amp; Processing Period</h2>
    <ul>
      <li><strong>Processing Time:</strong> In-app deletions are executed immediately. Email requests are verified and permanently purged within <strong>48 to 72 hours</strong>.</li>
      <li><strong>Data Retention:</strong> No personal or identifiable user data is retained after deletion. Standard anonymized server security logs are retained strictly for fraud prevention for up to 30 days, after which they are automatically expunged.</li>
    </ul>

    <div class="footer">
      Developer: <strong>iBitValley</strong> • App: <strong>WritOn</strong> • Contact: <a href="mailto:saurabh.682@gmail.com">saurabh.682@gmail.com</a>
    </div>
  </div>
</body>
</html>`);
  });

  fastify.get('/child-safety', async (request, reply) => {
    reply.type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WritOn - Child Safety &amp; Protection Standards</title>
  <style>
    :root {
      --bg: #F8F4EE;
      --card: #FFFDF9;
      --text: #151718;
      --muted: #6D6963;
      --primary: #E75A2A;
      --border: #E9E1D7;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
      background: var(--card);
      padding: 36px;
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    .brand {
      color: var(--primary);
      font-size: 26px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 18px;
      margin-top: 24px;
      margin-bottom: 12px;
      color: var(--primary);
    }
    p, li {
      color: #333;
      font-size: 15px;
    }
    .alert-box {
      background: #FCE8E6;
      border-left: 4px solid #D93025;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 20px 0;
      color: #C5221F;
      font-weight: 500;
    }
    .contact-box {
      border: 1px dashed var(--primary);
      background: rgba(231, 90, 42, 0.05);
      padding: 16px 20px;
      border-radius: 10px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 32px;
      font-size: 13px;
      color: var(--muted);
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }
    a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">WritOn</div>
    <h1>Child Safety Standards &amp; CSAE Prevention Policy</h1>
    <p>At <strong>WritOn</strong> (developed by <strong>iBitValley</strong>), we maintain a strict, non-negotiable <strong>zero-tolerance policy</strong> regarding Child Sexual Abuse Material (CSAM) and Child Sexual Exploitation and Abuse (CSAE).</p>

    <div class="alert-box">
      Zero Tolerance: Any content, imagery, writing, or communication involving the exploitation, abuse, grooming, or endangerment of minors is strictly prohibited and subject to immediate termination and legal reporting.
    </div>

    <h2>1. Prohibited Content &amp; Behavior</h2>
    <p>WritOn strictly forbids:</p>
    <ul>
      <li>Any visual, written, or implied depiction of Child Sexual Abuse Material (CSAM).</li>
      <li>Child Sexual Exploitation and Abuse (CSAE) in any form.</li>
      <li>Any attempt to groom, solicit, endanger, or inappropriately interact with minors.</li>
      <li>Content promoting, facilitating, or encouraging harm towards children.</li>
    </ul>

    <h2>2. In-App Reporting &amp; Content Moderation</h2>
    <p>We provide immediate mechanisms for users to flag and report any safety concerns:</p>
    <ul>
      <li><strong>In-App Reporting:</strong> Users can report any story, comment, or user profile directly by tapping the more options (3 dots) menu on any post or author profile and selecting <em>Report</em>.</li>
      <li><strong>Rapid Takedown:</strong> Reported content is prioritized, reviewed by our moderation team, and removed immediately upon confirmation.</li>
      <li><strong>Account Termination:</strong> Accounts that violate child safety standards are banned permanently and prohibited from creating new accounts.</li>
    </ul>

    <h2>3. Reporting to Law Enforcement &amp; Authorities</h2>
    <p>WritOn complies fully with all applicable international, national, and regional child safety laws. When CSAM or CSAE is identified:</p>
    <ul>
      <li>We immediately preserve all relevant evidentiary data.</li>
      <li>We file immediate reports with the <strong>National Center for Missing &amp; Exploited Children (NCMEC)</strong> and relevant regional and national law enforcement agencies.</li>
      <li>We cooperate transparently and proactively with legal authorities to aid in child protection investigations.</li>
    </ul>

    <h2>4. Designated Point of Contact</h2>
    <p>For urgent child safety inquiries, reports, or legal inquiries, please contact our dedicated safety team:</p>
    <div class="contact-box">
      <strong>Designated Safety Contact:</strong> Saurabh Kumar (iBitValley)<br>
      <strong>Safety Email:</strong> <a href="mailto:deamonizerr@gmail.com">deamonizerr@gmail.com</a> / <a href="mailto:saurabh.682@gmail.com">saurabh.682@gmail.com</a><br>
      <strong>Response SLA:</strong> Critical child safety reports are prioritized and responded to within 12 hours.
    </div>

    <div class="footer">
      Developer: <strong>iBitValley</strong> • App: <strong>WritOn</strong> • Policy Version: 1.0 (2026)
    </div>
  </div>
</body>
</html>`);
  });

  fastify.delete(
    '/api/v1/me',
    { preHandler: [requireUser] },
    async (request, reply) => {
      const profileId = request.profileId;
      const firebaseUid = request.user.uid;
      await database.query('delete from public.comments where user_id = $1', [profileId]);
      await database.query('delete from public.likes where user_id = $1', [profileId]);
      await database.query('delete from public.bookmarks where user_id = $1', [profileId]);
      await database.query('delete from public.posts where author_id = $1', [profileId]);
      await database.query('delete from public.profiles where id = $1', [profileId]);

      if (firebaseAuth) {
        try {
          await firebaseAuth.deleteUser(firebaseUid);
        } catch (e) {
          request.log.warn({ err: e }, 'Could not delete user from Firebase Auth directly');
        }
      }

      return { success: true, message: 'Account and associated data deleted successfully.' };
    }
  );

  await fastify.register(appMetaRoutes, { config, database });
  await fastify.register(notificationRoutes, {
    database,
    requireUser,
    parseCollectionQuery,
    postIdSchema,
  });
  await fastify.register(adminBotsRoutes, { pool: database, requireUser });
  await fastify.register(mcpRoutes, { pool: database });

  fastify.decorate('deliverPushNotifications', deliverPendingPushNotifications);

  return fastify;
}

const isEntrypoint = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const runtimeConfig = loadRuntimeConfig();
  const database = new Pool({
    connectionString: runtimeConfig.databaseUrl,
    max: runtimeConfig.databasePoolMax,
    ssl: { rejectUnauthorized: false },
  });
  const fastify = await buildServer({ runtimeConfig, pool: database });
  try {
    await fastify.listen({ port: runtimeConfig.port, host: '0.0.0.0' });
    if (runtimeConfig.sparkAutomationEnabled) {
      startSparkScheduler(database, 15);
    }
    const runPushDelivery = async () => {
      try {
        const outcome = await fastify.deliverPushNotifications();
        if (outcome.processed > 0) fastify.log.info(outcome, 'Processed push notification delivery work');
      } catch (error) {
        fastify.log.error({ err: error }, 'Push notification delivery pass failed');
      }
    };
    void runPushDelivery();
    setInterval(() => { void runPushDelivery(); }, runtimeConfig.pushDeliveryPollIntervalMs).unref();
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}
