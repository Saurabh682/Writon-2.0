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

function createPool() {
  return {
    query: async (sql) => {
      if (sql.includes('select now() as database_time')) {
        return { rows: [{ database_time: '2026-08-21T00:00:00.000Z' }] };
      }
      throw new Error(`Unexpected database query in contract test: ${sql}`);
    },
  };
}

const auth = {
  verifyIdToken: async () => ({ uid: 'test-user', email: 'test@example.com' }),
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
