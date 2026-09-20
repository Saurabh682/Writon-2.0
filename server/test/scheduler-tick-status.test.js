import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { adminBotsRoutes } from '../src/routes/admin-bots.js';
import { runMasterSchedulerTick } from '../src/bot-engine/master-scheduler.js';
import { processOutboxEvents } from '../src/bot-engine/outbox-service.js';

vi.mock('../src/bot-engine/master-scheduler.js', () => ({ runMasterSchedulerTick: vi.fn() }));
vi.mock('../src/bot-engine/outbox-service.js', async importOriginal => ({
  ...await importOriginal(), processOutboxEvents: vi.fn()
}));

describe('scheduler tick reports business failures', () => {
  let app;
  beforeEach(async () => {
    vi.stubEnv('BOT_INGEST_SECRET', 'scheduler-test-secret');
    runMasterSchedulerTick.mockResolvedValue({ completed: [], failed: [], skipped: [] });
    processOutboxEvents.mockResolvedValue({ processed: 0, succeeded: 0, failed: 0 });
    app = Fastify();
    await app.register(adminBotsRoutes, { pool: {} });
  });
  afterEach(async () => { await app.close(); vi.unstubAllEnvs(); vi.resetAllMocks(); });
  const request = () => ({ method: 'POST', url: '/api/v1/spark/scheduler/tick', headers: { 'x-bot-secret': 'scheduler-test-secret' } });

  it('reports an idle successful tick without claiming publication', async () => {
    const response = await app.inject(request());
    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
  });
  it('returns retryable failure when a schedule slot fails', async () => {
    runMasterSchedulerTick.mockResolvedValue({ completed: [], failed: ['dawn_digest'], skipped: [] });
    const response = await app.inject(request());
    expect(response.statusCode).toBe(503);
    expect(response.json().success).toBe(false);
    expect(processOutboxEvents).toHaveBeenCalledOnce();
  });
  it('reports failed outbox events', async () => {
    processOutboxEvents.mockResolvedValue({ processed: 2, succeeded: 1, failed: 1 });
    const response = await app.inject(request());
    expect(response.statusCode).toBe(503);
    expect(response.json().outbox.failed).toBe(1);
  });
  it('does not replace an outbox exception with fabricated zero counts', async () => {
    processOutboxEvents.mockRejectedValue(new Error('private database failure detail'));
    const response = await app.inject(request());
    expect(response.statusCode).toBe(503);
    expect(response.json().outbox).toEqual({ processed: null, succeeded: null, failed: null, error: 'Outbox processing failed' });
    expect(response.body).not.toContain('private database failure detail');
  });
  it('rejects unauthenticated requests before execution', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/spark/scheduler/tick' });
    expect(response.statusCode).toBe(401);
    expect(runMasterSchedulerTick).not.toHaveBeenCalled();
  });
});
