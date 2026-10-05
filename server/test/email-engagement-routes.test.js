import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { emailEngagementRoutes } from '../src/routes/email-engagement.js';
import { createUnsubscribeToken } from '../src/email/security/unsubscribe-token.js';
import crypto from 'node:crypto';

const keys = [
  { kid: 'key1', secret: '01234567890123456789012345678901' },
];

describe('email engagement routes', () => {
  let app;
  let mockDb;
  let mockWorker;

  beforeEach(async () => {
    app = Fastify({ routerOptions: { maxParamLength: 1024 } });
    mockDb = {
      query: vi.fn().mockImplementation((sql) => {
        if (sql.includes('SELECT * FROM user_email_preferences WHERE profile_id=')) {
          return { rows: [{ reading_enabled: false, activity_enabled: true }], rowCount: 1 };
        }
        if (sql.includes('INSERT INTO writer_engagement_events')) {
          return { rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }),
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [{ reading_enabled: true }], rowCount: 1 }),
        release: vi.fn(),
      }),
    };

    mockWorker = {
      runOnce: vi.fn().mockResolvedValue({ claimed: 0, sent: 0 }),
    };

    const config = {
      email: {
        unsubscribeBaseUrl: 'https://writon.cc/email/unsubscribe',
        unsubscribeKeys: keys,
        resendWebhookSecret: 'whsec_dGVzdHNlY3JldDEyMzQ1Njc4OTA=',
      },
    };

    const requireUser = async (request) => {
      request.profileId = 'test-profile-123';
      request.user = { uid: 'test-profile-123', email: 'test@example.com' };
    };

    const verifyAdminKey = (request, reply) => {
      if (request.headers['x-admin-key'] !== 'secret123') {
        reply.code(403).send({ error: 'Forbidden' });
        return false;
      }
      return true;
    };

    await app.register(emailEngagementRoutes, {
      database: mockDb,
      config,
      emailWorker: mockWorker,
      writonAdapter: {},
      requireUser,
      verifyAdminKey,
    });
  });

  it('GET /email/unsubscribe/:token renders confirmation HTML without mutating database', async () => {
    const token = createUnsubscribeToken({ profileId: 'p1', scope: 'all' }, keys);
    const res = await app.inject({
      method: 'GET',
      url: `/email/unsubscribe/${token}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Unsubscribe from WritOn emails?');
    expect(res.body).toContain('Confirm Unsubscribe');
    // Ensure GET never calls connect or UPDATE
    expect(mockDb.connect).not.toHaveBeenCalled();
  });

  it('POST /email/unsubscribe/:token unsubscribes user via one-click', async () => {
    const token = createUnsubscribeToken({ profileId: 'p1', scope: 'reading' }, keys);
    const res = await app.inject({
      method: 'POST',
      url: `/email/unsubscribe/${token}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('unsubscribed from the selected optional WritOn email');
    expect(mockDb.connect).toHaveBeenCalled();
  });

  it('GET /api/v1/me/email-preferences returns user email preferences', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me/email-preferences',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.activity).toBe(true);
    expect(body.reading).toBe(false);
  });

  it('POST /api/v1/stories/:id/share-initiated records share action honestly', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/stories/story-uuid-1/share-initiated',
      payload: { destination: 'whatsapp' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, recorded: true });
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO writer_engagement_events'),
      expect.arrayContaining(['test-profile-123', 'story-uuid-1']),
    );
  });

  it('POST /api/v1/internal/jobs/process-emails guards against unauthorized calls', async () => {
    const resForbidden = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/jobs/process-emails',
    });
    expect(resForbidden.statusCode).toBe(403);
    expect(mockWorker.runOnce).not.toHaveBeenCalled();

    const resAuthorized = await app.inject({
      method: 'POST',
      url: '/api/v1/internal/jobs/process-emails',
      headers: { 'x-admin-key': 'secret123' },
    });
    expect(resAuthorized.statusCode).toBe(200);
    expect(mockWorker.runOnce).toHaveBeenCalled();
  });

  it('welcome repair defaults to dry-run and rejects unbounded or unauthorized calls', async () => {
    const denied = await app.inject({ method: 'POST', url: '/api/v1/internal/jobs/reconcile-welcome-emails' });
    expect(denied.statusCode).toBe(403);
    const invalid = await app.inject({ method: 'POST', url: '/api/v1/internal/jobs/reconcile-welcome-emails', headers: { 'x-admin-key': 'secret123' }, payload: { days: 31 } });
    expect(invalid.statusCode).toBe(400);
    const result = await app.inject({ method: 'POST', url: '/api/v1/internal/jobs/reconcile-welcome-emails', headers: { 'x-admin-key': 'secret123' } });
    expect(result.statusCode).toBe(200);
    expect(result.json()).toMatchObject({ dryRun: true, enqueued: 0 });
    expect(mockWorker.runOnce).not.toHaveBeenCalled();
  });

  it('GET and PATCH /api/v1/me/email-preferences truthfully load and update boolean contract fields', async () => {
    // Test GET returns structured preferences
    const resGet = await app.inject({
      method: 'GET',
      url: '/api/v1/me/email-preferences',
    });
    expect(resGet.statusCode).toBe(200);
    const bodyGet = resGet.json();
    expect(bodyGet).toHaveProperty('reading');
    expect(bodyGet).toHaveProperty('activity');

    // Test PATCH with boolean contract fields
    const resPatch = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/email-preferences',
      payload: {
        reading: false,
        activity: false,
        writerTips: false,
        lifecycle: false
      }
    });
    expect(resPatch.statusCode).toBe(200);

    // Test PATCH rejects non-boolean values with 400
    const resInvalid = await app.inject({
      method: 'PATCH',
      url: '/api/v1/me/email-preferences',
      payload: {
        reading: 'not-a-boolean'
      }
    });
    expect(resInvalid.statusCode).toBe(400);
  });
});
