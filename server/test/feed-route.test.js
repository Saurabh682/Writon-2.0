import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';

const runtimeConfig = {
  environment: 'test',
  databaseUrl: 'postgres://unused',
  databasePoolMax: 1,
  databaseSslRejectUnauthorized: false,
  corsOrigins: [],
  sparkAutomationEnabled: false,
  pushDeliveryEnabled: false,
  pushDeliveryPollIntervalMs: 30_000,
  latestAppVersionCode: 117,
  publishedAppVersionCode: 117,
  minSupportedAppVersionCode: 101,
  playStoreAppUrl: 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
  feedPersonalizationEnabled: true,
  feedBehaviorRolloutPercent: 0,
  feedHoldoutPercent: 10,
  feedShadowRankingEnabled: true,
  feedGuestLearningEnabled: false,
  feedSessionTtlMinutes: 240,
};

describe('reader feed route boundaries', () => {
  let app;

  afterEach(async () => {
    await app?.close();
  });

  it('rejects invalid feed pagination before touching the database', async () => {
    const pool = { query: async () => { throw new Error('database should not be queried'); } };
    app = await buildServer({ runtimeConfig, pool, auth: { verifyIdToken: async () => ({ uid: 'reader' }) } });
    const response = await app.inject({ method: 'GET', url: '/api/v1/feed?limit=999&language=en' });
    expect(response.statusCode).toBe(400);
  });

  it('requires Firebase authentication for behavioral event batches', async () => {
    const pool = { query: async () => { throw new Error('database should not be queried'); } };
    app = await buildServer({ runtimeConfig, pool, auth: { verifyIdToken: async () => { throw new Error('invalid'); } } });
    const response = await app.inject({ method: 'POST', url: '/api/v1/feed/events', payload: { events: [] } });
    expect(response.statusCode).toBe(401);
  });
});
