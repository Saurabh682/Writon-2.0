import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import pg from 'pg';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';

const { Pool } = pg;

const fastify = Fastify({ logger: true });
const port = Number(process.env.PORT || 3001);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Add it to your .env file.');
}

const serviceAccount = JSON.parse(
  await readFile(
    new URL('../serviceAccountKey.json', import.meta.url),
    'utf8'
  )
);

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
    });

const firebaseAuth = getAuth(firebaseApp);

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

const database = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await fastify.register(cors, { origin: true });
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

function postSelectSql(whereClause) {
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
    coalesce(p.published_at, p.created_at) as "createdAt",
    json_build_object(
      'id', author.id,
      'penName', author.pen_name,
      'fullName', author.full_name,
      'avatarUrl', author.avatar_url,
      'bio', author.bio,
      'quoteOfDay', null,
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
    false as "isFollowingAuthor"
  from public.posts p
  inner join public.profiles author on author.id = p.author_id
  ${whereClause}`;
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
  };
}

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
     returning id, email, pen_name, full_name, bio, avatar_url, location,
       joined_at, followers_count, following_count`,
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
      and ($3::text is null or p.title ilike '%' || $3 || '%'
        or coalesce(p.summary, '') ilike '%' || $3 || '%'
        or author.full_name ilike '%' || $3 || '%'
        or author.pen_name ilike '%' || $3 || '%')`)}
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
        returning id, email, pen_name, full_name, bio, avatar_url, location,
          joined_at, followers_count, following_count`,
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

try {
  await fastify.listen({ port, host: '0.0.0.0' });
} catch (error) {
  fastify.log.error(error);
  process.exit(1);
}
