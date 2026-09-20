import 'dotenv/config';
import Fastify from 'fastify';
import pg from 'pg';
import { engagementPreferenceRoutes } from '../routes/engagement-preferences.js';
import { validateStagingDatabaseTarget } from './staging-database-guard.js';

const { Pool } = pg;
const profileId = 'staging:engagement-preferences-smoke-test';
const connectionString = validateStagingDatabaseTarget({
  stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
  productionDatabaseUrl: process.env.DATABASE_URL,
  allowRemoteStaging: process.env.ALLOW_REMOTE_STAGING === 'true',
});
const databaseHost = new URL(connectionString).hostname;
const database = new Pool({
  connectionString,
  max: 2,
  ssl: ['localhost', '127.0.0.1', '::1'].includes(databaseHost)
    ? false
    : { rejectUnauthorized: true },
});
const app = Fastify({ logger: false });

function assertResponse(response, expectedStatus, description) {
  if (response.statusCode !== expectedStatus) {
    throw new Error(`${description} failed with HTTP ${response.statusCode}: ${response.body}`);
  }
}

try {
  await database.query('insert into public.profiles (id) values ($1) on conflict (id) do nothing', [profileId]);
  await engagementPreferenceRoutes(app, {
    database,
    requireUser: async (request) => { request.profileId = profileId; },
    ensureProfile: async () => {},
  });
  await app.ready();

  const defaults = await app.inject({ method: 'GET', url: '/api/v1/me/engagement-preferences' });
  assertResponse(defaults, 200, 'Default preference read');
  if (defaults.json().preferenceCardState !== 'unseen') throw new Error('Unexpected default snapshot.');

  const saved = await app.inject({
    method: 'PUT',
    url: '/api/v1/me/engagement-preferences',
    payload: {
      primaryIntent: 'both',
      onboardingVersion: 2,
      onboardingCompletedAt: '2026-09-06T00:00:00.000Z',
      preferenceCardState: 'completed',
    },
  });
  assertResponse(saved, 200, 'Preference upsert');

  const restored = await app.inject({ method: 'GET', url: '/api/v1/me/engagement-preferences' });
  assertResponse(restored, 200, 'Persisted preference read');
  if (restored.json().primaryIntent !== 'both' || restored.json().onboardingVersion !== 2) {
    throw new Error('Persisted snapshot did not round-trip.');
  }

  const invalid = await app.inject({
    method: 'PUT',
    url: '/api/v1/me/engagement-preferences',
    payload: { primaryIntent: 'invalid', onboardingVersion: 2, onboardingCompletedAt: null, preferenceCardState: 'unseen' },
  });
  assertResponse(invalid, 400, 'Invalid snapshot rejection');

  await database.query('delete from public.profiles where id = $1', [profileId]);
  const cascade = await database.query(
    'select count(*)::int as count from public.profile_engagement_preferences where profile_id = $1',
    [profileId],
  );
  if (cascade.rows[0].count !== 0) throw new Error('Profile deletion did not cascade.');

  console.log('Staging API verified: defaults, persistence, validation, and deletion cascade passed.');
} finally {
  await database.query('delete from public.profiles where id = $1', [profileId]).catch(() => {});
  await app.close().catch(() => {});
  await database.end().catch(() => {});
}
