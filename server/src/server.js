import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import pg from 'pg';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';
import { loadFirebaseServiceAccount, loadRuntimeConfig } from './config.js';

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
});

const commentInputSchema = z.object({
  content: z.string().trim().min(1).max(5_000),
});

const collectionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const notificationQuerySchema = collectionQuerySchema.extend({
  kind: z.enum(['applaud', 'comment', 'follow', 'bookmark']).optional(),
});

const readingProgressInputSchema = z.object({
  progress: z.coerce.number().min(0).max(1).default(0.05),
  readSeconds: z.coerce.number().int().min(0).max(86_400).default(0),
});

const postIdSchema = z.string().uuid();
const profileIdentifierSchema = z.string().trim().min(1).max(200);

export async function buildServer({ runtimeConfig, pool, auth } = {}) {
const fastify = Fastify({ logger: true });
const config = runtimeConfig ?? loadRuntimeConfig();
const serviceAccount = auth ? null : await loadFirebaseServiceAccount(config);
const firebaseApp = auth
  ? null
  : (getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(serviceAccount) }));
const firebaseAuth = auth ?? getAuth(firebaseApp);

const database = pool ?? new Pool({
  connectionString: config.databaseUrl,
  max: config.databasePoolMax,
  ssl: { rejectUnauthorized: config.databaseSslRejectUnauthorized },
});

await fastify.register(cors, {
  origin: config.environment === 'production' ? config.corsOrigins : true,
});
await fastify.register(helmet);

async function requireUser(request, reply) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return reply.code(401).send({
      error: 'Authentication required',
    });
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
}

async function optionalUser(request) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  try {
    return await firebaseAuth.verifyIdToken(
      authorization.substring('Bearer '.length)
    );
  } catch {
    // A feed is public; an expired session must not prevent people browsing it.
    return null;
  }
}

function postSelectSql(whereClause, extraColumns = '') {
  return `select
    p.id::text as id,
    p.title,
    p.slug,
    p.summary,
    p.content,
    p.category,
    p.cover_image_url as "coverImage",
    p.reading_time_min as "readingTimeMin",
    p.likes_count as "likesCnt",
    p.comments_count as "commentsCnt",
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

  await client.query(
    `insert into public.notifications (recipient_id, actor_id, post_id, comment_id, kind, message)
     values ($1, $2, $3, $4, $5, $6)`,
    [recipientId, actorId, postId, commentId, kind, message]
  );
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

async function ensureProfile(decodedToken) {
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
    [decodedToken.uid, decodedToken.email ?? null, fallbackPenName, fallbackFullName]
  );

  return toProfile(result.rows[0]);
}

fastify.get('/health', async () => {
  const result = await database.query('select now() as database_time');

  return {
    status: 'ok',
    database: 'connected',
    databaseTime: result.rows[0].database_time,
  };
});

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
  async (request) => ({ profile: await ensureProfile(request.user) })
);

fastify.get('/api/v1/posts', async (request, reply) => {
  const parsed = postsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.code(400).send({
      error: 'Invalid feed query',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { category, tab, q, page, limit } = parsed.data;
  const viewer = await optionalUser(request);
  const result = await database.query(
    `${postSelectSql(`where p.status = 'published'
      and p.is_public = true
      and ($2::text is null or lower(p.category) = lower($2))
      and (
        $3::text is null
        or p.title ilike '%' || $3 || '%'
        or coalesce(p.summary, '') ilike '%' || $3 || '%'
        or author.full_name ilike '%' || $3 || '%'
        or author.pen_name ilike '%' || $3 || '%'
        or p.content ilike '%' || $3 || '%'
      )`)}
    order by
      case when $4 = 'popular' then p.likes_count end desc nulls last,
      p.published_at desc nulls last,
      p.created_at desc
    limit $5 offset $6`,
    [viewer?.uid ?? null, category ?? null, q || null, tab, limit + 1, (page - 1) * limit]
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
    [viewer?.uid ?? null, idOrSlug]
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

    await ensureProfile(request.user);
    const story = parsed.data;
    const result = await database.query(
      `insert into public.posts (
        slug, author_id, title, summary, content, category, cover_image_url,
        status, is_public, reading_time_min, published_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, case when $8 = 'published' then now() else null end)
      returning id`,
      [
        createSlug(story.title),
        request.user.uid,
        story.title,
        story.summary ?? null,
        story.content,
        story.category,
        story.coverImage ?? null,
        story.isPublished ? 'published' : 'draft',
        calculateReadingTime(story.content),
      ]
    );

    const postResult = await database.query(
      `${postSelectSql('where p.id = $2')}`,
      [request.user.uid, result.rows[0].id]
    );
    return reply.code(201).send({ post: postResult.rows[0] });
  }
);

fastify.post(
  '/api/v1/posts/:id/like',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;

    await ensureProfile(request.user);
    const interaction = await togglePostRelation({
      postId,
      userId: request.user.uid,
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

    await ensureProfile(request.user);
    const interaction = await togglePostRelation({
      postId,
      userId: request.user.uid,
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
      [request.user.uid, request.user.uid, limit + 1, (page - 1) * limit]
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
      [request.user.uid, request.user.uid, limit + 1, (page - 1) * limit]
    );
    return { posts: result.rows.slice(0, limit), pagination: { page, limit, hasMore: result.rows.length > limit } };
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
      [request.user.uid, request.user.uid, limit + 1, (page - 1) * limit]
    );
    const summary = await database.query(
      `select count(*)::int as "storiesRead",
              coalesce(round(sum(read_seconds)::numeric / 3600, 1), 0) as "hoursRead"
       from public.reading_history where user_id = $1`,
      [request.user.uid]
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
    await ensureProfile(request.user);
    const result = await database.query(
      `insert into public.reading_history (user_id, post_id, progress, read_seconds)
       select $1, p.id, $3, $4 from public.posts p
       where p.id = $2 and p.status = 'published' and p.is_public = true
       on conflict (user_id, post_id) do update set
         progress = greatest(public.reading_history.progress, excluded.progress),
         read_seconds = public.reading_history.read_seconds + excluded.read_seconds,
         last_read_at = now(), updated_at = now()
       returning progress, read_seconds as "readSeconds", last_read_at as "lastReadAt"`,
      [request.user.uid, postId, parsed.data.progress, parsed.data.readSeconds]
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
      link.legacy_parent_id as "parentId",
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

    await ensureProfile(request.user);
    const client = await database.connect();
    try {
      await client.query('begin');
      const post = await fetchInteractionPost(client, postId, request.user.uid);
      if (!post) {
        await client.query('rollback');
        return reply.code(404).send({ error: 'Story not found' });
      }

      const inserted = await client.query(
        `insert into public.comments (post_id, author_id, content)
         values ($1, $2, $3)
         returning id, post_id, author_id, content, created_at`,
        [postId, request.user.uid, parsed.data.content]
      );
      await client.query(
        `update public.posts set comments_count = comments_count + 1, updated_at = now() where id = $1`,
        [postId]
      );
      const author = await client.query(
        `select id, pen_name, full_name, avatar_url, bio, followers_count, following_count
         from public.profiles where id = $1`,
        [request.user.uid]
      );
      await createNotification(client, {
        recipientId: post.author_id,
        actorId: request.user.uid,
        postId,
        commentId: inserted.rows[0].id,
        kind: 'comment',
        message: 'commented on your story',
      });
      await client.query('commit');

      const comment = inserted.rows[0];
      return reply.code(201).send({
        comment: {
          id: comment.id,
          postId: comment.post_id,
          authorId: comment.author_id,
          parentId: null,
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
    if (profileId === request.user.uid) {
      return reply.code(400).send({ error: 'You cannot follow yourself' });
    }

    await ensureProfile(request.user);
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
        [request.user.uid, profileId]
      );
      const following = existing.rowCount === 0;
      if (following) {
        await client.query(
          `insert into public.follows (follower_id, following_id) values ($1, $2)`,
          [request.user.uid, profileId]
        );
        await createNotification(client, {
          recipientId: profileId,
          actorId: request.user.uid,
          kind: 'follow',
          message: 'started following you',
        });
      } else {
        await client.query(
          `delete from public.follows where follower_id = $1 and following_id = $2`,
          [request.user.uid, profileId]
        );
      }

      const targetProfile = await client.query(
        `update public.profiles
         set followers_count = greatest(followers_count + $2, 0), updated_at = now()
         where id = $1
         returning followers_count`,
        [profileId, following ? 1 : -1]
      );
      await client.query(
        `update public.profiles
         set following_count = greatest(following_count + $2, 0), updated_at = now()
         where id = $1`,
        [request.user.uid, following ? 1 : -1]
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

fastify.get(
  '/api/v1/me/notifications',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply, notificationQuerySchema);
    if (!query) return;
    const { page, limit, kind } = query;
    const result = await database.query(
      `select notification.id::text as id, notification.kind, notification.message,
              notification.created_at as "createdAt", notification.read_at as "readAt",
              notification.post_id::text as "postId", post.title as "postTitle",
              json_build_object(
                'id', actor.id, 'penName', actor.pen_name, 'fullName', actor.full_name,
                'avatarUrl', actor.avatar_url
              ) as actor
       from public.notifications notification
       left join public.profiles actor on actor.id = notification.actor_id
       left join public.posts post on post.id = notification.post_id
       where notification.recipient_id = $1
         and ($2::text is null or notification.kind = $2)
       order by notification.created_at desc
       limit $3 offset $4`,
      [request.user.uid, kind ?? null, limit + 1, (page - 1) * limit]
    );
    return { notifications: result.rows.slice(0, limit), pagination: { page, limit, hasMore: result.rows.length > limit } };
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
          request.user.uid,
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

  return fastify;
}

const isEntrypoint = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const runtimeConfig = loadRuntimeConfig();
  const fastify = await buildServer({ runtimeConfig });
  try {
    await fastify.listen({ port: runtimeConfig.port, host: '0.0.0.0' });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}
