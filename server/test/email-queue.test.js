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

    // Verify email_jobs insert query was executed
    const jobQuery = mockQueries.find(q => q.sql.includes('email_jobs'));
    expect(jobQuery).toBeDefined();
    expect(jobQuery.params[1]).toBe('user-new-1');
    expect(jobQuery.params[2]).toBe('newwriter@example.com');
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
  });
});

