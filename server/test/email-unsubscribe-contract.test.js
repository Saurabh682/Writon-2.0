import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildServer } from '../src/server.js';
import { createUnsubscribeToken } from '../src/email/security/unsubscribe-token.js';

const keys = [
  { kid: 'key1', secret: '01234567890123456789012345678901' },
];

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
  email: {
    unsubscribeBaseUrl: 'https://writon.cc/email/unsubscribe',
    unsubscribeKeys: keys,
  },
};

describe('Email unsubscribe Fastify contract (RFC 8058 & Form Support)', () => {
  const apps = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function createMockPool() {
    return {
      query: vi.fn().mockImplementation(async (sql) => {
        if (sql.includes('SELECT * FROM user_email_preferences WHERE profile_id=')) {
          return { rows: [{ reading_enabled: false, activity_enabled: true }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockImplementation(async (sql) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
          if (sql.includes('UPDATE user_email_preferences')) {
            return { rows: [{ reading_enabled: false }], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        }),
        release: vi.fn(),
      }),
    };
  }

  const mockAuth = {
    verifyIdToken: async () => ({ uid: 'test-user', email: 'test@example.com', email_verified: true }),
  };

  it('GET /email/unsubscribe/:token renders confirmation HTML and does not redirect', async () => {
    const pool = createMockPool();
    const app = await buildServer({ runtimeConfig, pool, auth: mockAuth });
    apps.push(app);

    const token = createUnsubscribeToken({ profileId: 'user-123', scope: 'reading' }, keys);
    const response = await app.inject({
      method: 'GET',
      url: `/email/unsubscribe/${token}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Unsubscribe from WritOn emails?');
    expect(response.body).toContain('reading');
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('POST /email/unsubscribe/:token succeeds with application/x-www-form-urlencoded (RFC 8058)', async () => {
    const pool = createMockPool();
    const app = await buildServer({ runtimeConfig, pool, auth: mockAuth });
    apps.push(app);

    const token = createUnsubscribeToken({ profileId: 'user-123', scope: 'reading' }, keys);
    const response = await app.inject({
      method: 'POST',
      url: `/email/unsubscribe/${token}`,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: 'List-Unsubscribe=One-Click',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('unsubscribed from the selected optional WritOn email');
    expect(pool.connect).toHaveBeenCalled();
  });

  it('POST /email/unsubscribe/:token succeeds with empty body', async () => {
    const pool = createMockPool();
    const app = await buildServer({ runtimeConfig, pool, auth: mockAuth });
    apps.push(app);

    const token = createUnsubscribeToken({ profileId: 'user-123', scope: 'all' }, keys);
    const response = await app.inject({
      method: 'POST',
      url: `/email/unsubscribe/${token}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('unsubscribed from the selected optional WritOn email');
    expect(pool.connect).toHaveBeenCalled();
  });

  it('POST /email/unsubscribe/:token rejects invalid token with 400', async () => {
    const pool = createMockPool();
    const app = await buildServer({ runtimeConfig, pool, auth: mockAuth });
    apps.push(app);

    const response = await app.inject({
      method: 'POST',
      url: '/email/unsubscribe/invalid.token.here',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: 'List-Unsubscribe=One-Click',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('invalid or expired');
    expect(pool.connect).not.toHaveBeenCalled();
  });
});
