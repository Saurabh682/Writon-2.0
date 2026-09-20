import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// In-memory queue and results store (lightweight, zero-dep)
const jobQueue = [];
const dispatchedJobs = new Map();
const jobResults = new Map();
const MAX_HISTORY = 100;

export const evaluateDraftSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  title: z.string().optional(),
  type: z.enum(['chatgpt_evaluate']).default('chatgpt_evaluate'),
  chatUrl: z.string().url().optional(),
  timeoutMs: z.number().int().min(5000).max(300000).default(120000)
});

export const submitResultSchema = z.object({
  jobId: z.string().min(1),
  success: z.boolean().default(true),
  score: z.number().nullable().optional(),
  verdict: z.string().optional(),
  critique: z.string().optional(),
  error: z.string().optional()
});

export function clearBridgeQueue() {
  jobQueue.length = 0;
  dispatchedJobs.clear();
  jobResults.clear();
}

export function getBridgeState() {
  return {
    queueLength: jobQueue.length,
    dispatchedCount: dispatchedJobs.size,
    resultsCount: jobResults.size
  };
}

export async function extensionBridgeRoutes(fastify, options) {
  // 1. Submit a draft or prompt for evaluation by the browser extension
  fastify.post('/api/v1/extension/evaluate', async (request, reply) => {
    const parseResult = evaluateDraftSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Invalid evaluation request',
        details: parseResult.error.format()
      });
    }

    const { prompt, title, type, chatUrl, timeoutMs } = parseResult.data;
    const jobId = 'job_' + Date.now() + '_' + randomUUID().slice(0, 8);

    const job = {
      id: jobId,
      prompt,
      title: title || 'Untitled Draft',
      type,
      chatUrl: chatUrl || 'https://chatgpt.com/share/6aac49ee-89d8-83ee-927f-b058cd12117c',
      timeoutMs,
      createdAt: new Date().toISOString(),
      status: 'queued'
    };

    jobQueue.push(job);

    return reply.code(202).send({
      success: true,
      message: 'Draft enqueued for browser evaluation',
      jobId,
      status: 'queued'
    });
  });

  // 2. Poll next pending job (called by the extension background service worker)
  fastify.get('/api/v1/extension/poll', async (request, reply) => {
    if (jobQueue.length === 0) {
      return reply.code(200).send({ job: null });
    }

    const nextJob = jobQueue.shift();
    nextJob.status = 'dispatched';
    nextJob.dispatchedAt = new Date().toISOString();
    dispatchedJobs.set(nextJob.id, nextJob);

    return reply.code(200).send({ job: nextJob });
  });

  // 3. Post evaluation result (called by the extension background service worker)
  fastify.post('/api/v1/extension/result', async (request, reply) => {
    const parseResult = submitResultSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Invalid result submission',
        details: parseResult.error.format()
      });
    }

    const { jobId, success, score, verdict, critique, error } = parseResult.data;
    const resultRecord = {
      jobId,
      success,
      score: score ?? null,
      verdict: verdict || (score !== null && score >= 80 ? 'APPROVE' : 'REJECT'),
      critique: critique || '',
      error: error || null,
      receivedAt: new Date().toISOString()
    };

    dispatchedJobs.delete(jobId);
    jobResults.set(jobId, resultRecord);

    // Keep memory bounded
    if (jobResults.size > MAX_HISTORY) {
      const oldestKey = jobResults.keys().next().value;
      jobResults.delete(oldestKey);
    }

    return reply.code(200).send({
      success: true,
      message: 'Result recorded successfully',
      jobId
    });
  });

  // 4. Check status/result of an evaluation job
  fastify.get('/api/v1/extension/result/:jobId', async (request, reply) => {
    const { jobId } = request.params;
    if (jobResults.has(jobId)) {
      return reply.code(200).send({
        status: 'completed',
        result: jobResults.get(jobId)
      });
    }

    if (dispatchedJobs.has(jobId)) {
      return reply.code(200).send({
        status: 'dispatched',
        job: dispatchedJobs.get(jobId)
      });
    }

    // Check if still in queue
    const queuedJob = jobQueue.find(j => j.id === jobId);
    if (queuedJob) {
      return reply.code(200).send({
        status: queuedJob.status,
        job: queuedJob
      });
    }

    return reply.code(404).send({
      error: 'Job not found',
      jobId
    });
  });

  // 5. Bridge health and status check
  fastify.get('/api/v1/extension/status', async (request, reply) => {
    return reply.code(200).send({
      active: true,
      version: '1.0.0',
      queueLength: jobQueue.length,
      dispatchedCount: dispatchedJobs.size,
      completedJobs: jobResults.size
    });
  });

  // 6. Get latest completed result
  fastify.get('/api/v1/extension/latest', async (request, reply) => {
    if (jobResults.size === 0) {
      return reply.code(200).send({ result: null });
    }
    const results = Array.from(jobResults.values());
    const latest = results[results.length - 1];
    return reply.code(200).send({ result: latest });
  });
}
