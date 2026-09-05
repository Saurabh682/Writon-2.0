import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { engagementPreferenceRoutes } from '../src/routes/engagement-preferences.js';

const defaultPreferences = {
  primaryIntent: null,
  onboardingVersion: 0,
  onboardingCompletedAt: null,
  preferenceCardState: 'unseen',
  preferenceCardUpdatedAt: null,
};

async function testApp(database) {
  const app = Fastify();
  await engagementPreferenceRoutes(app, {
    database,
    requireUser: async (request) => { request.profileId = 'profile-1'; },
    ensureProfile: async () => {},
  });
  await app.ready();
  return app;
}

describe('engagement preference routes', () => {
  const apps = [];
  afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

  it('returns stable defaults when a signed-in profile has no saved snapshot', async () => {
    const app = await testApp({ query: async () => ({ rows: [], rowCount: 0 }) });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/api/v1/me/engagement-preferences' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(defaultPreferences);
  });

  it('upserts and returns one complete validated snapshot for the authenticated profile', async () => {
    let captured;
    const app = await testApp({
      query: async (sql, params) => {
        captured = { sql, params };
        return {
          rowCount: 1,
          rows: [{
            primaryIntent: 'write',
            onboardingVersion: 2,
            onboardingCompletedAt: '2026-09-05T12:00:00.000Z',
            preferenceCardState: 'completed',
            preferenceCardUpdatedAt: '2026-09-05T12:00:01.000Z',
          }],
        };
      },
    });
    apps.push(app);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/me/engagement-preferences',
      payload: {
        primaryIntent: 'write',
        onboardingVersion: 2,
        onboardingCompletedAt: '2026-09-05T12:00:00.000Z',
        preferenceCardState: 'completed',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ primaryIntent: 'write', onboardingVersion: 2, preferenceCardState: 'completed' });
    expect(captured.params).toEqual([
      'profile-1', 'write', 2, '2026-09-05T12:00:00.000Z', 'completed',
    ]);
    expect(captured.sql).toContain('on conflict (profile_id) do update');
  });

  it.each([
    { primaryIntent: 'browse', onboardingVersion: 2, onboardingCompletedAt: null, preferenceCardState: 'unseen' },
    { primaryIntent: null, onboardingVersion: -1, onboardingCompletedAt: null, preferenceCardState: 'unseen' },
    { primaryIntent: null, onboardingVersion: 2, onboardingCompletedAt: 'not-a-date', preferenceCardState: 'unseen' },
    { primaryIntent: null, onboardingVersion: 2, onboardingCompletedAt: null, preferenceCardState: 'later' },
  ])('rejects an invalid snapshot without querying the database: %j', async (payload) => {
    let queried = false;
    const app = await testApp({ query: async () => { queried = true; return { rows: [] }; } });
    apps.push(app);

    const response = await app.inject({ method: 'PUT', url: '/api/v1/me/engagement-preferences', payload });

    expect(response.statusCode).toBe(400);
    expect(queried).toBe(false);
  });
});
