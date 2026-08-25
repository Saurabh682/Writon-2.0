import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';

const runtimeConfig = {
  environment: 'test',
  port: 3001,
  databaseUrl: 'postgresql://unused:unused@localhost:5432/test',
  databasePoolMax: 1,
  databaseSslRejectUnauthorized: false,
  corsOrigins: [],
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

  it('reclaims a single empty Firebase profile for its verified Gmail legacy alias', async () => {
    const queries = [];
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
    expect(queries.find((query) => query.sql.includes("where id like 'legacy:%'")).params)
      .toEqual(['writer+legacy-%@gmail.com']);
    expect(queries.find((query) => query.sql.includes('update public.profile_auth_identities')).params)
      .toEqual(['firebase-user', 'legacy:writer-2019']);
  });

  it('deletes only the authenticated user account data', async () => {
    const queries = [];
    const deletedFirebaseUsers = [];
    const pool = {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('select profile_id from public.profile_auth_identities')) {
          return { rows: [{ profile_id: 'legacy-profile' }], rowCount: 1 };
        }
        return { rows: [] };
      },
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
    expect(queries.map((entry) => entry.params)).toEqual([
      ['account-owner'],
      ['legacy-profile'],
      ['legacy-profile'],
      ['legacy-profile'],
      ['legacy-profile'],
      ['legacy-profile'],
    ]);
    expect(deletedFirebaseUsers).toEqual(['account-owner']);
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
