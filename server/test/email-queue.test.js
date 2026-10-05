import { describe, it, expect, vi } from 'vitest';
import { createResendClient, ResendHttpError } from '../src/email/resend-client.js';
import { createEmailWorker } from '../src/email/worker.js';

describe('email queue and worker safety', () => {
  it('blocks sends when delivery is disabled', async () => {
    const client = createResendClient({ enabled: false });
    const result = await client.send({ to: 'test@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi', idempotencyKey: 'k1' });
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('delivery_disabled');
  });

  it('blocks recipients not in test allowlist in internal mode', async () => {
    const client = createResendClient({
      enabled: true,
      mode: 'internal',
      testRecipients: new Set(['allowed@example.com']),
    });
    const result = await client.send({ to: 'random@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi', idempotencyKey: 'k2' });
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('recipient_not_in_internal_allowlist');
  });

  it('tags network errors as deliveryAmbiguous so worker will not blindly retry', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));
    const client = createResendClient({
      enabled: true,
      mode: 'internal',
      testRecipients: new Set(['test@example.com']),
      resendApiKey: 're_test',
      from: 'WritOn <hello@mail.writon.cc>',
    }, mockFetch);

    await expect(client.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
      idempotencyKey: 'idemp_test_1',
    })).rejects.toMatchObject({ deliveryAmbiguous: true });
  });

  it('handles worker pre-send cancellation when account is deleted', async () => {
    const mockPool = {
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: vi.fn(),
      }),
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    const mockResend = { send: vi.fn() };
    const mockWritonAdapter = {
      getCurrentEmailState: vi.fn().mockResolvedValue({ accountExists: false }),
    };

    // Simulate one claimed job
    const worker = createEmailWorker({
      pool: mockPool,
      resend: mockResend,
      config: { email: { batchSize: 1, leaseSeconds: 300, dailyCapacity: 80 } },
      writonAdapter: mockWritonAdapter,
    });

    // Mock claimDueJobs via pool query
    mockPool.connect = vi.fn().mockResolvedValue({
      query: vi.fn().mockImplementation((sql) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
        if (sql.includes('WITH due AS')) {
          return {
            rows: [{
              id: 'job-1',
              profile_id: 'prof-del',
              recipient_email: 'deleted@example.com',
              recipient_email_version: 1,
              category: 'activity',
              template_key: 'weekly_writer_digest',
              template_version: '1',
              event_key: 'ev-1',
              payload: {},
              idempotency_key: 'k-1',
            }],
          };
        }
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    });

    const outcome = await worker.runOnce();
    expect(outcome.claimed).toBe(1);
    expect(outcome.cancelled).toBe(1);
    expect(mockResend.send).not.toHaveBeenCalled();
  });

  it('enqueueWelcomeEmail seeds preferences and queues welcome job for new joiners', async () => {
    const { enqueueWelcomeEmail } = await import('../src/email/queue.js');
    const mockQueries = [];
    const mockPool = {
      query: vi.fn().mockImplementation((sql, params) => {
        mockQueries.push({ sql, params });
        if (sql.includes('SELECT email_version')) {
          return { rows: [{ email_version: 3, lifecycle_enabled: true, withdrawn_at: null }] };
        }
        if (sql.includes('INSERT INTO email_jobs')) {
          return {
            rows: [{
              id: 'job-welcome-1',
              profile_id: params[1],
              recipient_email: params[2],
              category: params[5],
              template_key: params[6],
              status: 'queued',
            }],
          };
        }
        return { rows: [], rowCount: 1 };
      }),
    };

    const config = {
      email: {
        unsubscribeBaseUrl: 'https://writon.cc/email/unsubscribe',
        unsubscribeKeys: [{ kid: 'k1', secret: 'test-secret-32-chars-long-enough!!' }],
      },
    };

    const job = await enqueueWelcomeEmail(mockPool, config, {
      profileId: 'user-new-1',
      recipientEmail: 'newwriter@example.com',
      fullName: 'New Writer',
    });

    expect(job).not.toBeNull();
    expect(job.template_key).toBe('welcome');
    expect(job.category).toBe('lifecycle');

    // Verify preference seed query was executed
    const prefQuery = mockQueries.find(q => q.sql.includes('user_email_preferences'));
    expect(prefQuery).toBeDefined();
    expect(prefQuery.params[0]).toBe('user-new-1');
    expect(prefQuery.sql).toContain('ON CONFLICT (profile_id) DO NOTHING');

    // Verify email_jobs insert query was executed
    const jobQuery = mockQueries.find(q => q.sql.includes('email_jobs'));
    expect(jobQuery).toBeDefined();
    expect(jobQuery.params[1]).toBe('user-new-1');
    expect(jobQuery.params[2]).toBe('newwriter@example.com');
    expect(jobQuery.params[4]).toBe(3);
  });

  it('enqueueWelcomeEmail skips invalid or legacy emails gracefully', async () => {
    const { enqueueWelcomeEmail } = await import('../src/email/queue.js');
    const mockPool = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) };

    const invalid = await enqueueWelcomeEmail(mockPool, {}, {
      profileId: 'user-2',
      recipientEmail: 'not-an-email',
    });
    expect(invalid).toBeNull();

    const legacy = await enqueueWelcomeEmail(mockPool, {}, {
      profileId: 'user-3',
      recipientEmail: 'bot@legacy.writon.io',
    });
    expect(legacy).toBeNull();
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('never re-enables withdrawn or disabled lifecycle preferences', async () => {
    const { enqueueWelcomeEmail } = await import('../src/email/queue.js');
    for (const preference of [
      { lifecycle_enabled: false, email_version: 1 },
      { lifecycle_enabled: true, withdrawn_at: new Date(), email_version: 1 },
    ]) {
      const pool = { query: vi.fn(async sql => ({ rows: sql.includes('SELECT email_version') ? [preference] : [] })) };
      expect(await enqueueWelcomeEmail(pool, {}, { profileId: 'p1', recipientEmail: 'writer@example.com' })).toBeNull();
      expect(pool.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO email_jobs'))).toBe(false);
    }
  });

  it('refuses welcome jobs with unsigned unsubscribe links', async () => {
    const { enqueueWelcomeEmail } = await import('../src/email/queue.js');
    const pool = { query: vi.fn(async sql => ({ rows: sql.includes('SELECT email_version') ? [{ lifecycle_enabled: true, email_version: 1 }] : [] })) };
    await expect(enqueueWelcomeEmail(pool, {}, { profileId: 'p1', recipientEmail: 'writer@example.com' })).rejects.toThrow('No unsubscribe signing keys');
    expect(pool.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO email_jobs'))).toBe(false);
  });

  it('welcome reconciliation defaults to a bounded, consent-gated dry run', async () => {
    const { reconcileWelcomeEmails } = await import('../src/email/queue.js');
    const pool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'p1' }] }) };
    expect(await reconcileWelcomeEmails(pool, {})).toEqual({ evaluated: 1, enqueued: 0, dryRun: true });
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toContain('pref.consented_at IS NOT NULL');
    expect(pool.query.mock.calls[0][0]).toContain('NOT EXISTS');
    await expect(reconcileWelcomeEmails(pool, {}, { days: 31 })).rejects.toThrow('Invalid welcome reconciliation bounds');
  });

  it('does not send optional mail based solely on a signup default', async () => {
    const { reserveSend } = await import('../src/email/queue.js');
    const client = { query: vi.fn(async sql => ({ rows: sql.includes('SELECT * FROM user_email_preferences') ? [{ lifecycle_enabled: true, email_version: 1, consented_at: null }] : [] })), release: vi.fn() };
    const pool = { connect: vi.fn().mockResolvedValue(client) };
    expect(await reserveSend(pool, { profile_id: 'p1', recipient_email_version: 1, category: 'lifecycle' }, 80)).toEqual({ ok: false, reason: 'consent_disabled' });
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO email_daily_capacity'))).toBe(false);
  });

  it('defers a recent welcome while email verification is pending', async () => {
    const job = { id: 'welcome1', profile_id: 'p1', template_key: 'welcome', created_at: new Date().toISOString() };
    const client = { query: vi.fn(async sql => ({ rows: sql.includes('WITH due AS') ? [job] : [] })), release: vi.fn() };
    const pool = { connect: vi.fn().mockResolvedValue(client), query: vi.fn().mockResolvedValue({ rows: [] }) };
    const resend = { send: vi.fn() };
    const worker = createEmailWorker({ pool, resend, config: { email: { batchSize: 1, leaseSeconds: 300 } }, writonAdapter: { getCurrentEmailState: vi.fn().mockResolvedValue({ accountExists: true, verified: false }) } });
    expect(await worker.runOnce()).toMatchObject({ claimed: 1, deferred: 1, cancelled: 0, sent: 0 });
    expect(resend.send).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("status='retry'"), expect.arrayContaining(['awaiting_email_verification']));
  });
});

