import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';
import { loadRuntimeConfig } from '../src/config.js';

const runtimeConfig = {
  environment: 'test',
  port: 3001,
  databaseUrl: 'postgresql://unused:unused@localhost:5432/test',
  databasePoolMax: 1,
  databaseSslRejectUnauthorized: false,
  corsOrigins: [],
  latestAppVersionCode: 108,
  minSupportedAppVersionCode: 101,
  playStoreAppUrl: 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
  publicApiBaseUrl: 'https://api.writon.test',
};

function profileRow(id = 'test-user') {
  return {
    id,
    email: 'test@example.com',
    pen_name: 'test_writer',
    full_name: 'Test Writer',
    bio: null,
    avatar_url: null,
    location: null,
    joined_at: '2026-08-24T00:00:00.000Z',
    followers_count: 0,
    following_count: 0,
    stories_count: 0,
    applauds_received: 0,
  };
}

function feedPostRow() {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'A compact feed story',
    slug: 'a-compact-feed-story',
    summary: 'Only card data is returned by the feed.',
    content: '',
    category: 'Essays',
    coverImage: null,
    readingTimeMin: 2,
    likesCnt: 0,
    commentsCnt: 0,
    bookmarksCnt: 0,
    createdAt: '2026-08-26T00:00:00.000Z',
    author: {
      id: 'test-user',
      penName: 'test_writer',
      fullName: 'Test Writer',
      avatarUrl: null,
      bio: null,
      quoteOfDay: null,
      followersCnt: 0,
      followingCnt: 0,
    },
    isLiked: false,
    isBookmarked: false,
    isFollowingAuthor: false,
  };
}

function sharedStoryRow() {
  return {
    title: 'Monsoon <Letters>',
    slug: 'monsoon-letters',
    summary: 'A thoughtful story about rain & memory.',
    content: 'The full story body.',
    category: 'Poetry',
    coverImage: 'https://images.example.com/cover.jpg',
    authorName: 'Kavya Nair',
    authorAvatarUrl: 'https://images.example.com/kavya.jpg',
  };
}

function createPool() {
  return {
    query: async (sql) => {
      if (sql.includes('select now() as database_time')) {
        return { rows: [{ database_time: '2026-08-21T00:00:00.000Z' }] };
      }
      if (sql.includes('select profile_id from public.profile_auth_identities')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('where lower(btrim(email)) = $1')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('insert into public.profiles')) {
        return { rows: [profileRow()], rowCount: 1 };
      }
      if (sql.includes('insert into public.profile_auth_identities')) {
        return { rows: [{ profile_id: 'test-user' }], rowCount: 1 };
      }
      if (sql.includes('where p.slug = $1') && sql.includes('author.full_name as "authorName"')) {
        return { rows: [sharedStoryRow()], rowCount: 1 };
      }
      if (sql.includes('from public.posts p')) {
        if (!sql.includes("''::text as content")) {
          throw new Error('The feed query must not select full story content.');
        }
        return { rows: [feedPostRow()], rowCount: 1 };
      }
      throw new Error(`Unexpected database query in contract test: ${sql}`);
    },
  };
}

const auth = {
  verifyIdToken: async () => ({ uid: 'test-user', email: 'test@example.com', email_verified: true }),
};

describe('Fastify API contract', () => {
  const apps = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  async function createApp() {
    const app = await buildServer({ runtimeConfig, pool: createPool(), auth });
    apps.push(app);
    return app;
  }

  it('reports health from the configured database connection', async () => {
    const app = await createApp();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      database: 'connected',
      databaseTime: '2026-08-21T00:00:00.000Z',
    });
  });

  it('rejects an unauthenticated story creation request before querying the database', async () => {
    const app = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      payload: {
        title: 'A valid test story',
        content: 'A valid test story body.',
        category: 'Essay',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Authentication required' });
  });

  it('validates feed pagination before querying the database', async () => {
    const app = await createApp();

    const response = await app.inject({ method: 'GET', url: '/api/v1/posts?limit=999' });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('Invalid feed query');
  });

  it('rejects private library collections before querying the database', async () => {
    const app = await createApp();

    const response = await app.inject({ method: 'GET', url: '/api/v1/me/bookmarks' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Authentication required' });
  });

  it('keeps bot automation off by default on Render and on elsewhere', () => {
    const baseEnvironment = { DATABASE_URL: runtimeConfig.databaseUrl };

    expect(loadRuntimeConfig({ ...baseEnvironment, RENDER: 'true' }).sparkAutomationEnabled).toBe(false);
    expect(loadRuntimeConfig(baseEnvironment).sparkAutomationEnabled).toBe(true);
    expect(loadRuntimeConfig({
      ...baseEnvironment,
      RENDER: 'true',
      SPARK_AUTOMATION_ENABLED: 'true',
    }).sparkAutomationEnabled).toBe(true);
  });

  it('renders a WritOn story preview with escaped metadata and the author photo', async () => {
    const app = await createApp();

    const response = await app.inject({ method: 'GET', url: '/stories/monsoon-letters' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('<meta property="og:site_name" content="WritOn">');
    expect(response.body).toContain('Monsoon &lt;Letters&gt; — WritOn');
    expect(response.body).toContain('https://images.example.com/kavya.jpg');
    expect(response.body).toContain('Written by');
    expect(response.body).toContain('Kavya Nair');
    expect(response.body).not.toContain('<h1>Monsoon <Letters></h1>');
  });

  it('publishes an unauthenticated, compact app-update manifest', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/api/v1/app/version' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      latestVersionCode: 108,
      minSupportedVersionCode: 101,
      updateUrl: 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
    });
  });

  it('does not accept a device token or notification preferences without Firebase authentication', async () => {
    const app = await createApp();
    const [token, preferences] = await Promise.all([
      app.inject({
        method: 'PUT',
        url: '/api/v1/me/devices/push-token',
        payload: { token: 'a'.repeat(200), platform: 'android', appVersionCode: 102, notificationPermission: 'granted' },
      }),
      app.inject({ method: 'PUT', url: '/api/v1/me/notification-preferences', payload: { interactionsEnabled: false } }),
    ]);

    for (const response of [token, preferences]) {
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'Authentication required' });
    }
  });

  it('protects profile-stat lists and reading interests before querying the database', async () => {
    const app = await createApp();

    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/me/stories' }),
      app.inject({ method: 'GET', url: '/api/v1/me/applause-received' }),
      app.inject({ method: 'GET', url: '/api/v1/me/followers' }),
      app.inject({ method: 'GET', url: '/api/v1/me/following' }),
      app.inject({ method: 'GET', url: '/api/v1/me/interests' }),
      app.inject({ method: 'PUT', url: '/api/v1/me/interests', payload: { topicIds: ['poetry'] } }),
    ]);

    for (const response of responses) {
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'Authentication required' });
    }
  });

  it('returns compact card data from the feed and leaves full content for the reader endpoint', async () => {
    const app = await createApp();

    const response = await app.inject({ method: 'GET', url: '/api/v1/posts?limit=1' });

    expect(response.statusCode).toBe(200);
    expect(response.json().posts).toHaveLength(1);
    expect(response.json().posts[0].content).toBe('');
  });

  it('requires authentication for the following feed and filters it by followed authors', async () => {
    const queries = [];
    const pool = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'test-user' }], rowCount: 1 };
        }
        if (sql.includes('from public.posts p')) {
          if (!sql.includes('from public.follows')) {
            throw new Error('The following feed must filter by the authenticated reader follows.');
          }
          return { rows: [feedPostRow()], rowCount: 1 };
        }
        throw new Error(`Unexpected following-feed query: ${sql}`);
      },
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    const visitor = await app.inject({ method: 'GET', url: '/api/v1/posts?tab=following' });
    const reader = await app.inject({
      method: 'GET',
      url: '/api/v1/posts?tab=following',
      headers: { authorization: 'Bearer test-token' },
    });

    expect(visitor.statusCode).toBe(401);
    expect(reader.statusCode).toBe(200);
    expect(reader.json().posts).toHaveLength(1);
    expect(queries.find(({ sql }) => sql.includes('from public.posts p')).params[0]).toBe('test-user');
  });

  it('protects draft lifecycle and media upload routes before accessing storage or data', async () => {
    const app = await createApp();

    const [drafts, update, publish, remove, upload] = await Promise.all([
      app.inject({ method: 'GET', url: '/api/v1/me/drafts' }),
      app.inject({ method: 'PUT', url: '/api/v1/posts/00000000-0000-0000-0000-000000000000', payload: {} }),
      app.inject({ method: 'POST', url: '/api/v1/posts/00000000-0000-0000-0000-000000000000/publish' }),
      app.inject({ method: 'DELETE', url: '/api/v1/posts/00000000-0000-0000-0000-000000000000' }),
      app.inject({ method: 'POST', url: '/api/v1/media/upload' }),
    ]);

    for (const response of [drafts, update, publish, remove, upload]) {
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'Authentication required' });
    }
  });

  it('keeps desired applause and bookmark state stable when a retry repeats the same request', async () => {
    const postId = '11111111-1111-1111-1111-111111111111';
    const relations = { post_applauds: false, bookmarks: false };
    const counts = { likes_count: 0, bookmarks_count: 0 };
    const pool = {
      query: async (sql) => {
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'test-user' }], rowCount: 1 };
        }
        if (sql.includes('insert into public.profiles')) {
          return { rows: [profileRow()], rowCount: 1 };
        }
        throw new Error(`Unexpected desired-state query outside transaction: ${sql}`);
      },
      connect: async () => ({
        query: async (sql) => {
          if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes('from public.posts') && sql.includes('for update')) {
            return {
              rows: [{
                id: postId,
                author_id: 'test-user',
                likes_count: counts.likes_count,
                bookmarks_count: counts.bookmarks_count,
                comments_count: 0,
              }],
              rowCount: 1,
            };
          }
          for (const [table, counterColumn] of [
            ['post_applauds', 'likes_count'],
            ['bookmarks', 'bookmarks_count'],
          ]) {
            if (sql.includes(`insert into public.${table}`)) {
              const inserted = !relations[table];
              relations[table] = true;
              counts[counterColumn] = 1;
              return { rows: inserted ? [{ inserted: true }] : [], rowCount: inserted ? 1 : 0 };
            }
            if (sql.includes(`delete from public.${table}`)) {
              const removed = relations[table];
              relations[table] = false;
              counts[counterColumn] = 0;
              return { rows: removed ? [{ removed: true }] : [], rowCount: removed ? 1 : 0 };
            }
            if (sql.includes(`returning ${counterColumn} as count`)) {
              return { rows: [{ count: counts[counterColumn] }], rowCount: 1 };
            }
          }
          throw new Error(`Unexpected desired-state transaction query: ${sql}`);
        },
        release: () => {},
      }),
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    for (const interaction of [
      { path: 'like', responseKey: 'liked', countKey: 'likesCount' },
      { path: 'bookmark', responseKey: 'bookmarked', countKey: 'bookmarksCount' },
    ]) {
      const first = await app.inject({
        method: 'PUT',
        url: `/api/v1/posts/${postId}/${interaction.path}`,
        headers: { authorization: 'Bearer test-token' },
        payload: { enabled: true },
      });
      const retry = await app.inject({
        method: 'PUT',
        url: `/api/v1/posts/${postId}/${interaction.path}`,
        headers: { authorization: 'Bearer test-token' },
        payload: { enabled: true },
      });

      expect(first.statusCode).toBe(200);
      expect(retry.statusCode).toBe(200);
      expect(first.json()).toMatchObject({ [interaction.responseKey]: true, [interaction.countKey]: 1 });
      expect(retry.json()).toEqual(first.json());
    }
  });

  it('returns the original comment and increments the counter once when an idempotent comment is retried', async () => {
    const postId = '11111111-1111-1111-1111-111111111111';
    const mutationId = '22222222-2222-4222-8222-222222222222';
    const commentId = '33333333-3333-4333-8333-333333333333';
    let storedComment = null;
    let counterUpdates = 0;
    const pool = {
      query: async (sql) => {
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'test-user' }], rowCount: 1 };
        }
        if (sql.includes('insert into public.profiles')) {
          return { rows: [profileRow()], rowCount: 1 };
        }
        throw new Error(`Unexpected idempotent-comment query outside transaction: ${sql}`);
      },
      connect: async () => ({
        query: async (sql, params) => {
          if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes('from public.posts') && sql.includes('for update')) {
            return {
              rows: [{ id: postId, author_id: 'test-user', likes_count: 0, bookmarks_count: 0, comments_count: 0 }],
              rowCount: 1,
            };
          }
          if (sql.includes('insert into public.comments')) {
            const inserted = storedComment === null;
            storedComment ??= {
              id: commentId,
              post_id: postId,
              author_id: 'test-user',
              parent_comment_id: null,
              content: 'Retry-safe response',
              created_at: '2026-08-29T00:00:00.000Z',
            };
            expect(params.at(-1)).toBe(mutationId);
            return { rows: [{ ...storedComment, inserted }], rowCount: 1 };
          }
          if (sql.includes('update public.posts set comments_count')) {
            counterUpdates += 1;
            return { rows: [], rowCount: 1 };
          }
          if (sql.includes('from public.profiles where id = $1')) {
            return { rows: [profileRow()], rowCount: 1 };
          }
          throw new Error(`Unexpected idempotent-comment transaction query: ${sql}`);
        },
        release: () => {},
      }),
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    const request = {
      method: 'POST',
      url: `/api/v1/comments/${postId}`,
      headers: { authorization: 'Bearer test-token' },
      payload: { content: 'Retry-safe response', clientMutationId: mutationId },
    };
    const first = await app.inject(request);
    const retry = await app.inject(request);

    expect(first.statusCode).toBe(201);
    expect(retry.statusCode).toBe(200);
    expect(retry.json()).toEqual(first.json());
    expect(counterUpdates).toBe(1);
  });

  it('targets the partial draft-id uniqueness rule when creating a retry-safe post', async () => {
    const clientDraftId = '44444444-4444-4444-8444-444444444444';
    const queries = [];
    const pool = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'test-user' }], rowCount: 1 };
        }
        if (sql.includes('insert into public.profiles')) {
          return { rows: [profileRow()], rowCount: 1 };
        }
        if (sql.includes('insert into public.posts')) {
          if (!sql.includes('where client_draft_id is not null')) {
            throw Object.assign(new Error('no unique or exclusion constraint matching the ON CONFLICT specification'), { code: '42P10' });
          }
          return { rows: [{ id: '11111111-1111-1111-1111-111111111111', status: 'draft' }], rowCount: 1 };
        }
        if (sql.includes('from public.posts p')) {
          return { rows: [feedPostRow()], rowCount: 1 };
        }
        throw new Error(`Unexpected retry-safe post query: ${sql}`);
      },
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/posts',
      headers: { authorization: 'Bearer test-token' },
      payload: {
        title: 'A retry-safe draft',
        content: 'This draft should upsert instead of duplicating.',
        category: 'Essays',
        isPublished: false,
        clientDraftId,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(queries.find(({ sql }) => sql.includes('insert into public.posts')).params.at(-1)).toBe(clientDraftId);
  });

  it('patches the authenticated profile without requiring unchanged registration fields', async () => {
    const transactionQueries = [];
    const pool = {
      query: async (sql) => {
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'test-user' }], rowCount: 1 };
        }
        throw new Error(`Unexpected profile-patch query outside transaction: ${sql}`);
      },
      connect: async () => ({
        query: async (sql, params) => {
          transactionQueries.push({ sql, params });
          if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes('update public.profiles')) {
            return { rows: [profileRow()], rowCount: 1 };
          }
          if (sql.includes('insert into public.legacy_import_profile_attributes')) {
            return { rows: [], rowCount: 1 };
          }
          throw new Error(`Unexpected profile-patch transaction query: ${sql}`);
        },
        release: () => {},
      }),
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer test-token' },
      payload: { fullName: 'Updated Writer', bio: 'Updated bio', quoteOfDay: 'Write what matters.' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().profile).toMatchObject({
      id: 'test-user',
      quoteOfDay: 'Write what matters.',
    });
    expect(transactionQueries.at(-1).sql).toBe('commit');
  });

  it('links a verified Firebase email to its existing canonical WritOn profile', async () => {
    const queries = [];
    const pool = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes('where lower(btrim(email)) = $1')) {
          return { rows: [{ id: 'legacy-profile' }], rowCount: 1 };
        }
        if (sql.includes('insert into public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'legacy-profile' }], rowCount: 1 };
        }
        return {
          rows: [profileRow('legacy-profile')],
          rowCount: 1,
        };
      },
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer test-token' },
      payload: { penName: 'test_writer', fullName: 'Test Writer' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().profile.email).toBe('test@example.com');
    expect(response.json().profile.id).toBe('legacy-profile');
    expect(queries.find((query) => query.sql.includes('where lower(btrim(email)) = $1')).params)
      .toEqual(['test@example.com']);
    expect(queries.find((query) => query.sql.includes('insert into public.profile_auth_identities')).params)
      .toEqual(['test-user', 'legacy-profile']);
    expect(queries.at(-1).params[0]).toBe('legacy-profile');
  });

  it('returns the linked legacy profile through Google profile sync', async () => {
    const queries = [];
    const pool = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes('where lower(btrim(email)) = $1')) {
          return { rows: [{ id: 'legacy-rajesh' }], rowCount: 1 };
        }
        if (sql.includes('insert into public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'legacy-rajesh' }], rowCount: 1 };
        }
        if (sql.includes('insert into public.profiles')) {
          expect(params[0]).toBe('legacy-rajesh');
          return { rows: [profileRow('legacy-rajesh')], rowCount: 1 };
        }
        throw new Error(`Unexpected database query in Google profile sync test: ${sql}`);
      },
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer google-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().profile.id).toBe('legacy-rajesh');
    expect(queries.find((query) => query.sql.includes('insert into public.profile_auth_identities')).params)
      .toEqual(['test-user', 'legacy-rajesh']);
  });

  it('reclaims a temporary Firebase profile for its verified Gmail legacy alias', async () => {
    const queries = [];
    const transactionQueries = [];
    const gmailAuth = {
      verifyIdToken: async () => ({
        uid: 'firebase-user',
        email: 'writer@gmail.com',
        email_verified: true,
      }),
    };
    const pool = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'firebase-user' }], rowCount: 1 };
        }
        if (sql.includes("where id like 'legacy:%'")) {
          return { rows: [{ id: 'legacy:writer-2019' }], rowCount: 1 };
        }
        if (sql.includes('select not exists (select 1 from public.posts')) {
          return { rows: [{ isEmpty: true }], rowCount: 1 };
        }
        if (sql.includes('update public.profile_auth_identities')) {
          return { rows: [], rowCount: 1 };
        }
        return { rows: [profileRow('legacy:writer-2019')], rowCount: 1 };
      },
      connect: async () => ({
        query: async (sql, params) => {
          transactionQueries.push({ sql, params });
          if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes("where id like 'legacy:%'")) {
            return { rows: [{ id: 'legacy:writer-2019' }], rowCount: 1 };
          }
          if (sql.includes('where profile_id = $1')) {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes('select id from public.profiles where id = $1')) {
            return { rows: [{ id: 'firebase-user' }], rowCount: 1 };
          }
          if (sql.includes('as "hasAuthoredContent"')) {
            return { rows: [{ hasAuthoredContent: false }], rowCount: 1 };
          }
          return { rows: [], rowCount: 1 };
        },
        release: () => {},
      }),
    };
    const app = await buildServer({ runtimeConfig, pool, auth: gmailAuth });
    apps.push(app);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer gmail-token' },
      payload: { penName: 'writer', fullName: 'Writer' },
    });

    expect(response.statusCode).toBe(200);
    expect(transactionQueries.find((query) => query.sql.includes("where id like 'legacy:%'")).params)
      .toEqual(['writer+legacy-%@gmail.com']);
    expect(transactionQueries.find((query) => query.sql.includes('insert into public.profile_auth_identities')).params)
      .toEqual(['firebase-user', 'legacy:writer-2019']);
    expect(transactionQueries.some((query) => query.sql.includes('insert into public.bookmarks'))).toBe(true);
    expect(transactionQueries.some((query) => query.sql.includes('insert into public.reading_history'))).toBe(true);
    expect(transactionQueries.at(-1).sql).toBe('commit');
  });

  it('deletes only the authenticated user account data', async () => {
    const queries = [];
    const transactionQueries = [];
    const deletedFirebaseUsers = [];
    const pool = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'legacy-profile' }], rowCount: 1 };
        }
        throw new Error(`Unexpected non-transactional account-deletion query: ${sql}`);
      },
      connect: async () => ({
        query: async (sql, params) => {
          transactionQueries.push({ sql, params });
          if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
            return { rows: [], rowCount: 0 };
          }
          if (sql === 'delete from public.profiles where id = $1 returning id') {
            return { rows: [{ id: 'legacy-profile' }], rowCount: 1 };
          }
          throw new Error(`Unexpected account-deletion transaction query: ${sql}`);
        },
        release: () => {},
      }),
    };
    const deletionAuth = {
      verifyIdToken: async () => ({ uid: 'account-owner', email: 'owner@example.com', email_verified: true }),
      deleteUser: async (userId) => { deletedFirebaseUsers.push(userId); },
    };
    const app = await buildServer({ runtimeConfig, pool, auth: deletionAuth });
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer test-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      message: 'Account and associated data deleted successfully.',
    });
    expect(queries.map((entry) => entry.params)).toEqual([['account-owner']]);
    expect(transactionQueries).toEqual([
      { sql: 'begin', params: undefined },
      { sql: 'delete from public.profiles where id = $1 returning id', params: ['legacy-profile'] },
      { sql: 'commit', params: undefined },
    ]);
    expect(deletedFirebaseUsers).toEqual(['account-owner']);
  });

  it('rolls back account deletion and preserves Firebase access when the database delete fails', async () => {
    const transactionQueries = [];
    const deletedFirebaseUsers = [];
    const pool = {
      query: async (sql) => {
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'legacy-profile' }], rowCount: 1 };
        }
        throw new Error(`Unexpected non-transactional account-deletion query: ${sql}`);
      },
      connect: async () => ({
        query: async (sql) => {
          transactionQueries.push(sql);
          if (sql === 'delete from public.profiles where id = $1 returning id') {
            throw new Error('simulated database failure');
          }
          return { rows: [], rowCount: 0 };
        },
        release: () => {},
      }),
    };
    const deletionAuth = {
      verifyIdToken: async () => ({ uid: 'account-owner', email: 'owner@example.com', email_verified: true }),
      deleteUser: async (userId) => { deletedFirebaseUsers.push(userId); },
    };
    const app = await buildServer({ runtimeConfig, pool, auth: deletionAuth });
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer test-token' },
    });

    expect(response.statusCode).toBe(500);
    expect(transactionQueries).toEqual([
      'begin',
      'delete from public.profiles where id = $1 returning id',
      'rollback',
    ]);
    expect(deletedFirebaseUsers).toEqual([]);
  });

  it('rolls back profile deletion when Firebase refuses to delete the authentication account', async () => {
    const transactionQueries = [];
    const pool = {
      query: async (sql) => {
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'legacy-profile' }], rowCount: 1 };
        }
        throw new Error(`Unexpected non-transactional account-deletion query: ${sql}`);
      },
      connect: async () => ({
        query: async (sql) => {
          transactionQueries.push(sql);
          if (sql === 'delete from public.profiles where id = $1 returning id') {
            return { rows: [{ id: 'legacy-profile' }], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        },
        release: () => {},
      }),
    };
    const deletionAuth = {
      verifyIdToken: async () => ({ uid: 'account-owner', email: 'owner@example.com', email_verified: true }),
      deleteUser: async () => { throw new Error('Firebase unavailable'); },
    };
    const app = await buildServer({ runtimeConfig, pool, auth: deletionAuth });
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer test-token' },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: 'Could not delete the authentication account' });
    expect(transactionQueries).toEqual([
      'begin',
      'delete from public.profiles where id = $1 returning id',
      'rollback',
    ]);
  });

  it('validates story identifiers before recording reading progress', async () => {
    const app = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/posts/not-a-uuid/reading-progress',
      headers: { authorization: 'Bearer test-token' },
      payload: { progress: 2 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Invalid story identifier' });
  });
});
