import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer, sendFoundRedirect, supabaseStorageHeaders } from '../src/server.js';
import { loadRuntimeConfig } from '../src/config.js';

const runtimeConfig = {
  environment: 'test',
  port: 3001,
  databaseUrl: 'postgresql://unused:unused@localhost:5432/test',
  databasePoolMax: 1,
  databaseSslRejectUnauthorized: false,
  corsOrigins: [],
  latestAppVersionCode: 113,
  publishedAppVersionCode: 108,
  minSupportedAppVersionCode: 101,
  playStoreAppUrl: 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
  publicApiBaseUrl: 'https://api.writon.test',
};

it('builds a media redirect without depending on Fastify redirect argument order', () => {
  const calls = [];
  const reply = {
    code(statusCode) {
      calls.push(['code', statusCode]);
      return this;
    },
    header(name, value) {
      calls.push(['header', name, value]);
      return this;
    },
    send() {
      calls.push(['send']);
      return 'sent';
    },
    redirect() {
      throw new Error('The version-specific redirect overload must not be used.');
    },
  };

  expect(sendFoundRedirect(reply, 'https://project.supabase.co/object/sign/avatar')).toBe('sent');
  expect(calls).toEqual([
    ['code', 302],
    ['header', 'Location', 'https://project.supabase.co/object/sign/avatar'],
    ['send'],
  ]);
});

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
    authorAvatarUrl: 'https://api.writon.test/api/v1/media/profiles%2Ftest-user%2F33333333-3333-4333-8333-333333333333.webp',
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
      if (sql.includes('from public.publication_notification_events')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('from public.reader_behavior_events') || sql.includes('from public.reader_feed_sessions')) {
        return { rows: [], rowCount: 0 };
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
    vi.unstubAllGlobals();
  });

  async function createApp(configOverrides = {}) {
    const app = await buildServer({ runtimeConfig: { ...runtimeConfig, ...configOverrides }, pool: createPool(), auth });
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

  it('returns the ordered database category catalog including categories with no stories yet', async () => {
    const categoryRows = [
      { name: 'Reviews', count: 19 },
      { name: 'Journal', count: 0 },
      { name: 'Science & Health', count: 0 },
      { name: 'Business & Finance', count: 0 },
      { name: 'Sports', count: 0 },
      { name: 'Entertainment', count: 0 },
    ];
    const queries = [];
    const pool = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        return { rows: categoryRows, rowCount: categoryRows.length };
      },
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/tags' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ tags: categoryRows });
    expect(queries).toHaveLength(1);
    expect(queries[0].sql).toContain('from public.story_categories category');
    expect(queries[0].sql).toContain("category.category_type = 'content'");
    expect(queries[0].sql).toContain("post.provenance = 'human_verified'");
    expect(queries[0].sql).toContain("author.account_type = 'human'");
    expect(queries[0].sql).toContain('order by category.display_order asc');
    expect(queries[0].params).toEqual([null]);
  });

  it('rejects private library collections before querying the database', async () => {
    const app = await createApp();

    const response = await app.inject({ method: 'GET', url: '/api/v1/me/bookmarks' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Authentication required' });
  });

  it('uses new Supabase secret keys only as API keys while retaining legacy service-role JWT support', () => {
    expect(supabaseStorageHeaders('sb_secret_example', { 'Content-Type': 'image/webp' })).toEqual({
      apikey: 'sb_secret_example',
      'Content-Type': 'image/webp',
    });
    expect(supabaseStorageHeaders('legacy-service-role-jwt')).toEqual({
      apikey: 'legacy-service-role-jwt',
      Authorization: 'Bearer legacy-service-role-jwt',
    });
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

  it('allows request-serving Cloud Run instances to leave push polling to the active worker', () => {
    const baseEnvironment = { DATABASE_URL: runtimeConfig.databaseUrl };

    expect(loadRuntimeConfig(baseEnvironment).pushDeliveryEnabled).toBe(true);
    expect(loadRuntimeConfig({
      ...baseEnvironment,
      PUSH_DELIVERY_ENABLED: 'false',
    }).pushDeliveryEnabled).toBe(false);
  });

  it('keeps the in-process daily digest timer disabled unless explicitly requested', () => {
    const baseEnvironment = { DATABASE_URL: runtimeConfig.databaseUrl };

    expect(loadRuntimeConfig(baseEnvironment).dailyDigestEnabled).toBe(false);
    expect(loadRuntimeConfig({
      ...baseEnvironment,
      DAILY_DIGEST_ENABLED: 'true',
    }).dailyDigestEnabled).toBe(true);
  });

  it('keeps review prompts fail-closed unless deployment explicitly enables them', () => {
    const baseEnvironment = { DATABASE_URL: runtimeConfig.databaseUrl };
    const defaults = loadRuntimeConfig(baseEnvironment);
    expect(defaults.reviewPromptEnabled).toBe(false);
    expect(defaults.reviewPromptRolloutPercent).toBe(0);
    expect(defaults.reviewPromptReaderEnabled).toBe(false);
    expect(defaults.reviewPromptWriterEnabled).toBe(false);

    const enabled = loadRuntimeConfig({
      ...baseEnvironment,
      REVIEW_PROMPT_ENABLED: 'true',
      REVIEW_PROMPT_ROLLOUT_PERCENT: '10',
      REVIEW_PROMPT_READER_ENABLED: 'true',
      REVIEW_PROMPT_WRITER_ENABLED: 'true',
    });
    expect(enabled.reviewPromptEnabled).toBe(true);
    expect(enabled.reviewPromptRolloutPercent).toBe(10);
    expect(enabled.reviewPromptReaderEnabled).toBe(true);
    expect(enabled.reviewPromptWriterEnabled).toBe(true);
  });

  it('renders a WritOn story preview with escaped metadata and the author photo', async () => {
    const app = await createApp();

    const response = await app.inject({ method: 'GET', url: '/stories/monsoon-letters' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('<meta property="og:site_name" content="WritOn">');
    expect(response.body).toContain('Monsoon &lt;Letters&gt; — WritOn');
    expect(response.body).toContain(
      'https://api.writon.test/api/v1/media/profiles%2Ftest-user%2F33333333-3333-4333-8333-333333333333.webp'
    );
    expect(response.body).toContain('Written by');
    expect(response.body).toContain('Kavya Nair');
    expect(response.body).toContain('Open in WritOn');
    expect(response.body).toContain('intent://writon.cc/stories/monsoon-letters#Intent;scheme=https;package=com.ibitvalley.writon;');
    expect(response.body).toContain('Get the app');
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
      reviewPrompt: {
        enabled: false,
        rolloutPercent: 0,
        minimumVersionCode: 120,
        excludedVersionCodes: [],
        eligibilityVersion: 'review_eligibility_v1',
        readerEnabled: false,
        writerEnabled: false,
      },
    });
  });

  it('publishes Android App Link ownership for the signed WritOn app', async () => {
    const app = await createApp();
    const response = await app.inject({ method: 'GET', url: '/.well-known/assetlinks.json' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toEqual([expect.objectContaining({
      relation: ['delegate_permission/common.handle_all_urls'],
      target: expect.objectContaining({
        namespace: 'android_app',
        package_name: 'com.ibitvalley.writon',
        sha256_cert_fingerprints: [
          '2F:C5:3D:AE:26:8C:D2:BE:11:20:00:C1:9E:9A:08:BD:EA:18:A0:D1:6F:0D:CC:CE:F1:C6:0F:86:F8:84:45:7D',
        ],
      }),
    })]);
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

  it('keeps legacy notification preferences and adds effective granular preferences', async () => {
    const effective = {
      interactionsEnabled: false,
      followsEnabled: true,
      editorialEnabled: true,
      publishingEnabled: true,
      firstApplauseEnabled: false,
      commentsRepliesEnabled: true,
      newFollowersEnabled: true,
      followedWriterPublishedEnabled: false,
      readingNudgesEnabled: true,
      draftNudgesEnabled: true,
      weeklyPromptEnabled: true,
      dailyDigestEnabled: true,
    };
    let updateParams = null;
    const pool = {
      query: async (sql, params) => {
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'test-user' }], rowCount: 1 };
        }
        if (sql.includes('from public.notification_preferences where profile_id')) {
          expect(sql).toContain('coalesce(first_applause_enabled, interactions_enabled)');
          return { rows: [effective], rowCount: 1 };
        }
        if (sql.includes('insert into public.notification_preferences')) {
          updateParams = params;
          return { rows: [{ ...effective, commentsRepliesEnabled: false }], rowCount: 1 };
        }
        throw new Error(`Unexpected notification-preference query: ${sql}`);
      },
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/me/notification-preferences',
      headers: { authorization: 'Bearer test-token' },
    });
    const putResponse = await app.inject({
      method: 'PUT',
      url: '/api/v1/me/notification-preferences',
      headers: { authorization: 'Bearer test-token' },
      payload: { commentsRepliesEnabled: false },
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual(effective);
    expect(putResponse.statusCode).toBe(200);
    expect(putResponse.json()).toEqual({ ...effective, commentsRepliesEnabled: false });
    expect(updateParams).toEqual([
      'test-user', null, null, null, null, null, false, null, null, null, null, null, null,
    ]);
  });

  it('accepts legacy and canonical notification kind filters', async () => {
    const seenKinds = [];
    const pool = {
      query: async (sql, params) => {
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'test-user' }], rowCount: 1 };
        }
        if (sql.includes('from public.notifications notification')) {
          seenKinds.push(params[1]);
          return { rows: [], rowCount: 0 };
        }
        throw new Error(`Unexpected notification-filter query: ${sql}`);
      },
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    for (const kind of ['applaud', 'first_applause', 'follow', 'new_follower', 'reply', 'daily_digest']) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/me/notifications?kind=${kind}`,
        headers: { authorization: 'Bearer test-token' },
      });
      expect(response.statusCode).toBe(200);
    }
    expect(seenKinds).toEqual(['applaud', 'first_applause', 'follow', 'new_follower', 'reply', 'daily_digest']);
  });

  it('allows the authenticated scheduler secret to run the daily digest without a user session', async () => {
    // Production defect caught: Cloud Scheduler cannot supply a Firebase user token,
    // so combining requireUser with the scheduler secret makes the job unreachable.
    const pool = {
      query: async (sql) => {
        if (sql.includes("p.status = 'published'") && sql.includes("interval '24 hours'")) {
          return { rows: [{ total: 0, by_category: null }], rowCount: 1 };
        }
        throw new Error(`Unexpected daily-digest query: ${sql}`);
      },
    };
    const app = await buildServer({
      runtimeConfig: { ...runtimeConfig, adminSecretKey: 'scheduler-secret' },
      pool,
      auth,
      messaging: { send: vi.fn() },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/spark/daily-digest/test',
      headers: { 'x-admin-key': 'scheduler-secret' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ skipped: true, reason: 'No new stories today' });
  });

  it('exposes the daily digest on a production internal scheduler route', async () => {
    // Production defect caught: the only trigger route is named as a manual test
    // route, leaving deployment automation without a stable operational contract.
    const pool = {
      query: async () => ({ rows: [{ total: 0, by_category: null }], rowCount: 1 }),
    };
    const app = await buildServer({
      runtimeConfig: { ...runtimeConfig, adminSecretKey: 'scheduler-secret' },
      pool,
      auth,
      messaging: { send: vi.fn() },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/notifications/daily-digest',
      headers: { 'x-admin-key': 'scheduler-secret' },
    });

    expect(response.statusCode).toBe(200);
  });

  it.each([0, 12, 17, 32])('accepts %i reading interests with the unchanged response contract', async (count) => {
    const client = { query: vi.fn(async () => ({ rows: [], rowCount: 0 })), release: vi.fn() };
    const app = await buildServer({ runtimeConfig, auth, pool: { ...createPool(), connect: async () => client } });
    apps.push(app);
    const topicIds = Array.from({ length: count }, (_, index) => `topic_${index}`);
    const response = await app.inject({
      method: 'PUT', url: '/api/v1/me/interests',
      headers: { authorization: 'Bearer test-token' }, payload: { topicIds },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ topicIds });
    expect(client.query).toHaveBeenCalledWith('commit');
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rejects more than 32 interests without replacing saved choices', async () => {
    const connect = vi.fn();
    const app = await buildServer({ runtimeConfig, auth, pool: { ...createPool(), connect } });
    apps.push(app);
    const response = await app.inject({
      method: 'PUT', url: '/api/v1/me/interests',
      headers: { authorization: 'Bearer test-token' },
      payload: { topicIds: Array.from({ length: 33 }, (_, index) => `topic_${index}`) },
    });
    expect(response.statusCode).toBe(400);
    expect(connect).not.toHaveBeenCalled();
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
      app.inject({ method: 'GET', url: '/api/v1/me/engagement-preferences' }),
      app.inject({
        method: 'PUT',
        url: '/api/v1/me/engagement-preferences',
        payload: { primaryIntent: null, onboardingVersion: 0, onboardingCompletedAt: null, preferenceCardState: 'unseen' },
      }),
    ]);

    for (const response of responses) {
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'Authentication required' });
    }
  });

  it('returns compact card data from the feed and leaves full content for the reader endpoint', async () => {
    const queries = [];
    const pool = {
      query: async (sql) => {
        queries.push(sql);
        if (sql.includes('from public.posts p')) return { rows: [feedPostRow()], rowCount: 1 };
        throw new Error(`Unexpected compact-feed query: ${sql}`);
      },
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/posts?limit=1' });

    expect(response.statusCode).toBe(200);
    expect(response.json().posts).toHaveLength(1);
    expect(response.json().posts[0].content).toBe('');
    expect(queries[0]).toContain("p.status = 'published'");
    expect(queries[0]).toContain("p.is_public = true");
    expect(queries[0]).toContain("p.provenance = 'human_verified'");
    expect(queries[0]).toContain("author.account_type = 'human'");
  });

  it('removes legacy third-party avatar URLs from reader-facing feed responses', async () => {
    const pool = {
      query: async (sql) => {
        if (sql.includes('from public.posts p')) {
          return {
            rows: [{
              ...feedPostRow(),
              author: { ...feedPostRow().author, avatarUrl: 'https://tracker.example/reader-pixel.png' },
            }],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected unsafe-avatar feed query: ${sql}`);
      },
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/posts?limit=1' });

    expect(response.statusCode).toBe(200);
    expect(response.json().posts[0].author.avatarUrl).toBeNull();
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

  it('serves encoded profile-media paths through the stable media route', async () => {
    const signedMediaUrl = 'https://project.supabase.co/storage/v1/object/sign/writon-media/profiles/test-user/avatar.webp?token=signed';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ signedURL: signedMediaUrl }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const app = await buildServer({
      runtimeConfig: {
        ...runtimeConfig,
        supabaseUrl: 'https://project.supabase.co',
        supabaseServiceRoleKey: 'sb_secret_test_service_role_key',
        supabaseStorageBucket: 'writon-media',
      },
      pool: createPool(),
      auth,
    });
    apps.push(app);

    const responses = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/api/v1/media/profiles%2Ftest-user%2F11111111-1111-4111-8111-111111111111.webp',
      }),
      app.inject({
        method: 'GET',
        url: '/api/v1/media/profiles/test-user/11111111-1111-4111-8111-111111111111.webp',
      }),
    ]);

    for (const response of responses) {
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(signedMediaUrl);
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/storage/v1/object/sign/writon-media/profiles/test-user/11111111-1111-4111-8111-111111111111.webp',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('streams legacy profile media whose storage key cannot be used in a Supabase signed URL', async () => {
    const image = Buffer.from('RIFF0000WEBP', 'ascii');
    const fetchMock = vi.fn(async () => new Response(image, {
      status: 200,
      headers: { 'Content-Type': 'image/webp' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const app = await buildServer({
      runtimeConfig: {
        ...runtimeConfig,
        supabaseUrl: 'https://project.supabase.co',
        supabaseServiceRoleKey: 'sb_secret_test_service_role_key',
        supabaseStorageBucket: 'writon-media',
      },
      pool: createPool(),
      auth,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/media/profiles%2Flegacy%3Ausr_leg_73%2F11111111-1111-4111-8111-111111111111.webp',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('image/webp');
    expect(response.headers['cache-control']).toContain('max-age=300');
    expect(response.rawPayload).toEqual(image);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/storage/v1/object/authenticated/writon-media/profiles/legacy%3Ausr_leg_73/11111111-1111-4111-8111-111111111111.webp',
      expect.objectContaining({
        headers: expect.objectContaining({ apikey: 'sb_secret_test_service_role_key' }),
      }),
    );
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('accepts an authenticated profile image and stores a normalized WebP object', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const app = await buildServer({
      runtimeConfig: {
        ...runtimeConfig,
        supabaseUrl: 'https://project.supabase.co',
        supabaseServiceRoleKey: 'sb_secret_test_service_role_key',
        supabaseStorageBucket: 'writon-media',
      },
      pool: createPool(),
      auth,
    });
    apps.push(app);

    const boundary = '----writon-profile-photo-boundary';
    const onePixelPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="avatar.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      onePixelPng,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/media/upload',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      key: expect.stringMatching(/^profiles\/test-user\/[a-f0-9-]+\.webp$/),
      url: expect.stringMatching(/^https:\/\/api\.writon\.test\/api\/v1\/media\/profiles%2Ftest-user%2F[a-f0-9-]+\.webp$/),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toMatch(
      /^https:\/\/project\.supabase\.co\/storage\/v1\/object\/writon-media\/profiles\/test-user\/[a-f0-9-]+\.webp$/,
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'image/webp', 'x-upsert': 'false' }),
      body: expect.any(Buffer),
    });
  });

  it.each([
    'http://api.writon.cc/api/v1/media/profiles%2Ftest-user%2F11111111-1111-4111-8111-111111111111.webp',
    'https://tracker.example/avatar.png',
    'file:///data/user/0/com.ibitvalley.writon/private-avatar.png',
  ])('rejects an unsafe profile-photo URL: %s', async (avatarUrl) => {
    const pool = {
      query: async (sql) => {
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'test-user' }], rowCount: 1 };
        }
        throw new Error(`Profile validation should reject the URL before this query: ${sql}`);
      },
    };
    const app = await buildServer({ runtimeConfig, pool, auth });
    apps.push(app);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer test-token' },
      payload: { avatarUrl },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'Invalid profile update' });
  });

  it('canonicalizes a legacy WritOn avatar URL and removes the replaced storage object', async () => {
    const oldKey = 'profiles/test-user/11111111-1111-4111-8111-111111111111.webp';
    const newKey = 'profiles/test-user/22222222-2222-4222-8222-222222222222.webp';
    const legacyAvatarUrl = `https://writon-app-api-canary-rfusi3iwbq-el.a.run.app/api/v1/media/${encodeURIComponent(newKey)}`;
    const expectedAvatarUrl = `https://api.writon.test/api/v1/media/${encodeURIComponent(newKey)}`;
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => [] }));
    vi.stubGlobal('fetch', fetchMock);
    const transactionQueries = [];
    const pool = {
      query: async (sql) => {
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'test-user' }], rowCount: 1 };
        }
        throw new Error(`Unexpected profile replacement query outside transaction: ${sql}`);
      },
      connect: async () => ({
        query: async (sql, params) => {
          transactionQueries.push({ sql, params });
          if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes('update public.profiles')) {
            return {
              rows: [{
                ...profileRow(),
                avatar_url: expectedAvatarUrl,
                previous_avatar_url: `https://api.writon.test/api/v1/media/${encodeURIComponent(oldKey)}`,
              }],
              rowCount: 1,
            };
          }
          throw new Error(`Unexpected profile replacement transaction query: ${sql}`);
        },
        release: () => {},
      }),
    };
    const app = await buildServer({
      runtimeConfig: {
        ...runtimeConfig,
        supabaseUrl: 'https://project.supabase.co',
        supabaseServiceRoleKey: 'sb_secret_test_service_role_key',
        supabaseStorageBucket: 'writon-media',
      },
      pool,
      auth,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer test-token' },
      payload: { avatarUrl: legacyAvatarUrl },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().profile.avatarUrl).toBe(expectedAvatarUrl);
    expect(transactionQueries.find(({ sql }) => sql.includes('update public.profiles')).params[5]).toBe(expectedAvatarUrl);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/storage/v1/object/writon-media',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ prefixes: [oldKey] }),
      }),
    );
  });

  it('keeps desired applause and bookmark state stable when a retry repeats the same request', async () => {
    const postId = '11111111-1111-1111-1111-111111111111';
    const relations = { post_applauds: false, bookmarks: false };
    const counts = { likes_count: 0, bookmarks_count: 0 };
    const applauseEligibilityQueries = [];
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
          if (sql.includes('as eligible') && sql.includes("prior.kind in ('applaud', 'first_applause')")) {
            applauseEligibilityQueries.push(sql);
            return { rows: [{ eligible: false }], rowCount: 1 };
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
    expect(applauseEligibilityQueries).toHaveLength(1);
    expect(applauseEligibilityQueries[0]).toContain("post.provenance = 'human_verified'");
    expect(applauseEligibilityQueries[0]).toContain("actor.account_type = 'human'");
    expect(applauseEligibilityQueries[0]).toContain("reader.account_type = 'human'");
    expect(applauseEligibilityQueries[0]).toContain("prior.kind in ('applaud', 'first_applause')");
  });

  it('delivers an interaction push before the successful mutation response completes', async () => {
    // Production defect caught: Cloud Run can suspend the timer after the HTTP request,
    // leaving a committed interaction notification without a delivery attempt.
    const postId = '11111111-1111-1111-1111-111111111111';
    const notificationId = '22222222-2222-4222-8222-222222222222';
    const deliveryId = '33333333-3333-4333-8333-333333333333';
    let outboxReady = false;
    let deliveryStatus = 'pending';
    let claimedDeliveryLimit = null;
    let notificationInsert = null;
    let notificationDeliveryQuery = null;
    const send = vi.fn(async () => 'projects/test/messages/1');
    const pool = {
      query: async (sql, params) => {
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'reader-user' }], rowCount: 1 };
        }
        if (sql.includes('insert into public.profiles')) {
          return { rows: [profileRow('reader-user')], rowCount: 1 };
        }
        if (sql.includes('with candidates as')) {
          claimedDeliveryLimit = params?.[0] ?? null;
          if (!outboxReady || deliveryStatus !== 'pending') return { rows: [], rowCount: 0 };
          deliveryStatus = 'sending';
          return {
            rows: [{ id: deliveryId, notificationId, recipientId: 'writer-user', attempts: 1 }],
            rowCount: 1,
          };
        }
        if (sql.includes('from public.notifications notification') && sql.includes('where notification.id = $1')) {
          notificationDeliveryQuery = sql;
          return {
            rows: [{
              kind: 'first_applause',
              message: 'gave your story its first applause',
              postId,
              postTitle: 'A story worth reading',
              actorName: 'A Reader',
            }],
            rowCount: 1,
          };
        }
        if (sql.includes('from public.device_push_tokens')) {
          return { rows: [{ id: 'token-row-1', token: 'fcm-token-value' }], rowCount: 1 };
        }
        if (sql.includes("set status = 'sent'")) {
          deliveryStatus = 'sent';
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`Unexpected push-delivery query outside transaction: ${sql}`);
      },
      connect: async () => ({
        query: async (sql, params) => {
          if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes('from public.posts') && sql.includes('for update')) {
            return {
              rows: [{ id: postId, author_id: 'writer-user', likes_count: 0, bookmarks_count: 0, comments_count: 0 }],
              rowCount: 1,
            };
          }
          if (sql.includes('insert into public.post_applauds')) {
            return { rows: [{ inserted: true }], rowCount: 1 };
          }
          if (sql.includes('returning likes_count as count')) {
            return { rows: [{ count: 1 }], rowCount: 1 };
          }
          if (sql.includes('as eligible') && sql.includes("prior.kind in ('applaud', 'first_applause')")) {
            return { rows: [{ eligible: true }], rowCount: 1 };
          }
          if (sql.includes('insert into public.notifications')) {
            notificationInsert = { sql, params };
            return { rows: [{ id: notificationId }], rowCount: 1 };
          }
          if (sql.includes('from public.notification_preferences')) {
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes('insert into public.notification_delivery_outbox')) {
            outboxReady = true;
            return { rows: [], rowCount: 1 };
          }
          throw new Error(`Unexpected push-delivery transaction query: ${sql}`);
        },
        release: () => {},
      }),
    };
    const app = await buildServer({ runtimeConfig, pool, auth, messaging: { send } });
    apps.push(app);

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/posts/${postId}/like`,
      headers: { authorization: 'Bearer test-token' },
      payload: { enabled: true },
    });

    expect(response.statusCode).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(deliveryStatus).toBe('sent');
    expect(claimedDeliveryLimit).toBe(1);
    expect(notificationInsert.sql).toContain('deduplication_key');
    expect(notificationInsert.sql).toContain('on conflict (deduplication_key)');
    expect(notificationInsert.params[6]).toBe(`first_applause:${postId}`);
    // Production defect caught: a push queued while a story was public could still be
    // delivered after that story became private, unpublished, or provenance-ineligible.
    expect(notificationDeliveryQuery).toContain("post.status = 'published'");
    expect(notificationDeliveryQuery).toContain('post.is_public = true');
    expect(notificationDeliveryQuery).toContain("post.provenance = 'human_verified'");
    expect(notificationDeliveryQuery).toContain("post_author.account_type = 'human'");
    expect(send.mock.calls[0][0]).toMatchObject({
      notification: {
        title: 'A Reader gave your story its first applause',
        body: '“A story worth reading”',
      },
      data: {
        kind: 'first_applause',
        actorName: 'A Reader',
        storyTitle: 'A story worth reading',
      },
      fcmOptions: {
        analyticsLabel: 'interaction_first_applause',
      },
      android: {
        fcmOptions: {
          analyticsLabel: 'interaction_first_applause',
        },
        notification: {
          channelId: 'writon_interactions_channel',
          icon: 'ic_stat_writon',
          color: '#E75A2A',
        },
      },
    });
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

  it('removes every stored profile image after account deletion succeeds', async () => {
    const storageCalls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      storageCalls.push({ url, options });
      if (String(url).includes('/object/list/')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { name: '11111111-1111-4111-8111-111111111111.webp' },
            { name: '22222222-2222-4222-8222-222222222222.webp' },
          ],
        };
      }
      return { ok: true, status: 200, json: async () => [] };
    }));
    const pool = {
      query: async (sql) => {
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'legacy-profile' }], rowCount: 1 };
        }
        throw new Error(`Unexpected account-media query outside transaction: ${sql}`);
      },
      connect: async () => ({
        query: async (sql) => {
          if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
            return { rows: [], rowCount: 0 };
          }
          if (sql === 'delete from public.profiles where id = $1 returning id') {
            return { rows: [{ id: 'legacy-profile' }], rowCount: 1 };
          }
          throw new Error(`Unexpected account-media transaction query: ${sql}`);
        },
        release: () => {},
      }),
    };
    const deletionAuth = {
      verifyIdToken: async () => ({ uid: 'account-owner', email: 'owner@example.com', email_verified: true }),
      deleteUser: async () => {},
    };
    const app = await buildServer({
      runtimeConfig: {
        ...runtimeConfig,
        supabaseUrl: 'https://project.supabase.co',
        supabaseServiceRoleKey: 'sb_secret_test_service_role_key',
        supabaseStorageBucket: 'writon-media',
      },
      pool,
      auth: deletionAuth,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer test-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(storageCalls).toHaveLength(2);
    expect(JSON.parse(storageCalls[0].options.body)).toMatchObject({
      prefix: 'profiles/legacy-profile/',
      limit: 1000,
      offset: 0,
    });
    expect(storageCalls[1]).toMatchObject({
      url: 'https://project.supabase.co/storage/v1/object/writon-media',
      options: {
        method: 'DELETE',
        body: JSON.stringify({
          prefixes: [
            'profiles/legacy-profile/11111111-1111-4111-8111-111111111111.webp',
            'profiles/legacy-profile/22222222-2222-4222-8222-222222222222.webp',
          ],
        }),
      },
    });
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

  describe('immutable build & container standards', () => {
    const dockerfilePath = path.resolve(import.meta.dirname, '../../Dockerfile');
    const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');

    it('specifies Node.js 22 alpine as the immutable base image', () => {
      expect(dockerfileContent).toMatch(/^FROM node:22-alpine/m);
    });

    it('enforces reproducible lockfile-based installation with npm ci --omit=dev', () => {
      expect(dockerfileContent).toMatch(/npm ci --omit=dev/);
      expect(dockerfileContent).not.toMatch(/npm install/);
    });

    it('runs as a dedicated non-root user', () => {
      expect(dockerfileContent).toMatch(/adduser -S writon/);
      expect(dockerfileContent).toMatch(/USER writon/);
    });

    it('isolates container filesystem to minimal runtime contents only', () => {
      expect(dockerfileContent).toMatch(/COPY server\/package\*\.json/);
      expect(dockerfileContent).toMatch(/COPY server\/src \.\/src/);
      expect(dockerfileContent).not.toMatch(/COPY server\/test/);
      expect(dockerfileContent).not.toMatch(/COPY docs/);
    });

    it('supports dynamic PORT configuration for Cloud Run', () => {
      const config = loadRuntimeConfig({
        PORT: '8080',
        DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
        ADMIN_SECRET_KEY: 'test-key-1234567890',
      });
      expect(config.port).toBe(8080);
    });
  });

  describe('bounded protected operations & timer standards', () => {
    it('rejects unauthenticated requests to internal operational endpoints with 403', async () => {
      const app = await createApp({ adminSecretKey: 'secret-admin-pass' });

      const resDrain = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/notifications/drain-outbox',
      });
      expect(resDrain.statusCode).toBe(403);

      const resFanout = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/notifications/fanout-publications',
      });
      expect(resFanout.statusCode).toBe(403);

      const resRetention = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/maintenance/feed-retention',
      });
      expect(resRetention.statusCode).toBe(403);
    });

    it('rejects wrong admin key with 403', async () => {
      const app = await createApp({ adminSecretKey: 'secret-admin-pass' });

      const resDrain = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/notifications/drain-outbox',
        headers: { 'x-admin-key': 'wrong-key' },
      });
      expect(resDrain.statusCode).toBe(403);
    });

    it('executes protected endpoints with valid admin key', async () => {
      const app = await createApp({ adminSecretKey: 'secret-admin-pass' });

      const resDrain = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/notifications/drain-outbox',
        headers: { 'x-admin-key': 'secret-admin-pass' },
      });
      expect(resDrain.statusCode).toBe(200);
      const data = resDrain.json();
      expect(data).toHaveProperty('processed');
      expect(data).toHaveProperty('remaining');

      const resFanout = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/notifications/fanout-publications',
        headers: { 'x-admin-key': 'secret-admin-pass' },
      });
      expect(resFanout.statusCode).toBe(200);

      const resRetention = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/maintenance/feed-retention',
        headers: { 'x-admin-key': 'secret-admin-pass' },
      });
      expect(resRetention.statusCode).toBe(200);
    });

    it('parses TIMERS_DISABLED and K_SERVICE environment settings', () => {
      const configWithTimersDisabled = loadRuntimeConfig({
        DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
        TIMERS_DISABLED: 'true',
      });
      expect(configWithTimersDisabled.timersDisabled).toBe(true);

      const configWithDefaults = loadRuntimeConfig({
        DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
        TIMERS_DISABLED: 'false',
      });
      expect(configWithDefaults.timersDisabled).toBe(false);
    });

    it('reverts unprocessed claimed outbox rows to pending when delivery budget expires', async () => {
      const deliveryQueries = [];
      const pool = {
        query: async (sql, params) => {
          deliveryQueries.push({ sql, params });
          if (sql.includes('with candidates as')) {
            return {
              rows: [
                { id: 'delivery-1', notificationId: 'notif-1', recipientId: 'user-1', attempts: 1 },
                { id: 'delivery-2', notificationId: 'notif-2', recipientId: 'user-2', attempts: 1 },
              ],
              rowCount: 2,
            };
          }
          if (sql.includes("set status = 'pending'") && sql.includes("where id = any($1::uuid[])")) {
            return { rows: [], rowCount: 2 };
          }
          if (sql.includes('select count(*)::int as remaining')) {
            return { rows: [{ remaining: 2 }], rowCount: 1 };
          }
          throw new Error(`Unexpected query in outbox timeout test: ${sql}`);
        },
      };
      const app = await buildServer({
        runtimeConfig,
        pool,
        auth,
        messaging: { send: vi.fn() },
      });
      apps.push(app);

      const outcome = await app.deliverPushNotifications({ limit: 2, maxSeconds: 0 });

      expect(outcome.processed).toBe(0);
      const revertQuery = deliveryQueries.find((q) =>
        q.sql.includes("set status = 'pending'") && q.sql.includes("where id = any($1::uuid[]) and status = 'sending'")
      );
      expect(revertQuery).toBeDefined();
      expect(revertQuery.params[0]).toEqual(['delivery-1', 'delivery-2']);
    });
  });
});

