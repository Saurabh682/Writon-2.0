import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { extensionBridgeRoutes, clearBridgeQueue, getBridgeState } from '../src/routes/extension-bridge.js';

describe('Extension Bridge Routes', () => {
  let app;

  beforeEach(async () => {
    clearBridgeQueue();
    app = Fastify();
    await app.register(extensionBridgeRoutes);
    await app.ready();
  });

  it('GET /api/v1/extension/status returns healthy status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/extension/status'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.active).toBe(true);
    expect(body.queueLength).toBe(0);
    expect(body.completedJobs).toBe(0);
  });

  it('POST /api/v1/extension/evaluate queues a valid draft job', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/extension/evaluate',
      payload: {
        prompt: 'Critique this tennis match essay about Alexander Zverev and Quentin Halys at the US Open.',
        title: 'Four Hours Inside a Foregone Conclusion'
      }
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.jobId).toMatch(/^job_\d+_/);
    expect(body.status).toBe('queued');

    const state = getBridgeState();
    expect(state.queueLength).toBe(1);
  });

  it('GET /api/v1/extension/poll dispatches the queued job to extension', async () => {
    // 1. Enqueue
    await app.inject({
      method: 'POST',
      url: '/api/v1/extension/evaluate',
      payload: {
        prompt: 'Evaluate Sunita Banerjee draft.',
        title: 'Test Draft'
      }
    });

    // 2. Poll
    const pollRes = await app.inject({
      method: 'GET',
      url: '/api/v1/extension/poll'
    });

    expect(pollRes.statusCode).toBe(200);
    const pollBody = JSON.parse(pollRes.body);
    expect(pollBody.job).not.toBeNull();
    expect(pollBody.job.title).toBe('Test Draft');
    expect(pollBody.job.status).toBe('dispatched');

    // 3. Poll again (should be empty)
    const emptyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/extension/poll'
    });
    expect(JSON.parse(emptyRes.body).job).toBeNull();
  });

  it('POST /api/v1/extension/result stores verdict and score', async () => {
    // 1. Queue a job
    const evalRes = await app.inject({
      method: 'POST',
      url: '/api/v1/extension/evaluate',
      payload: {
        prompt: 'Evaluate piece.',
        title: 'Test'
      }
    });
    const { jobId } = JSON.parse(evalRes.body);

    // 2. Post result
    const resultRes = await app.inject({
      method: 'POST',
      url: '/api/v1/extension/result',
      payload: {
        jobId,
        score: 88,
        verdict: 'APPROVE',
        critique: 'Tight prose, grounded courtside sensory details.'
      }
    });

    expect(resultRes.statusCode).toBe(200);
    expect(JSON.parse(resultRes.body).success).toBe(true);

    // 3. Retrieve result
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/extension/result/${jobId}`
    });

    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.body);
    expect(getBody.status).toBe('completed');
    expect(getBody.result.score).toBe(88);
    expect(getBody.result.verdict).toBe('APPROVE');
  });
});
