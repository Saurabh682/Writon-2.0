import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';

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
};

function createPool(queryObserver = () => {}) {
  return {
    query: async (sql, params) => {
      queryObserver(sql, params);
      if (sql.includes('select now() as database_time')) {
        return { rows: [{ database_time: '2026-08-30T00:00:00.000Z' }] };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

const auth = {
  verifyIdToken: async () => ({ uid: 'test-user', email: 'test@example.com', email_verified: true }),
};

describe('Campaign Redirect Route', () => {
  let server;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('1. Valid delivery ID returns 302 with correct Location header containing UTM params', async () => {
    server = await buildServer({ runtimeConfig, pool: createPool(), auth });
    const response = await server.inject({
      method: 'GET',
      url: '/go/2609_d02_ig_story_en_editor'
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('utm_source%3Dinstagram');
    expect(response.headers.location).toContain('utm_medium%3Dorganic_social');
    expect(response.headers.location).toContain('utm_campaign%3Dwriton_growth_2026_09');
    expect(response.headers.location).toContain('utm_content%3D2609_d02_ig_story_en_editor');
  });

  it('2. Valid delivery ID with different platform returns correct utm_source', async () => {
    server = await buildServer({ runtimeConfig, pool: createPool(), auth });
    const response = await server.inject({
      method: 'GET',
      url: '/go/2609_d02_x_post_en_editor'
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('utm_source%3Dx');
  });

  it('3. Invalid/unknown delivery ID returns 302 to plain Play Store URL', async () => {
    server = await buildServer({ runtimeConfig, pool: createPool(), auth });
    const response = await server.inject({
      method: 'GET',
      url: '/go/invalid_delivery_id'
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(runtimeConfig.playStoreAppUrl);
  });

  it('4. Empty delivery ID returns 302 to plain Play Store URL', async () => {
    server = await buildServer({ runtimeConfig, pool: createPool(), auth });
    const response = await server.inject({
      method: 'GET',
      url: '/go'
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(runtimeConfig.playStoreAppUrl);
  });

  it('5. Response has Cache-Control: no-cache, no-store', async () => {
    server = await buildServer({ runtimeConfig, pool: createPool(), auth });
    const response = await server.inject({
      method: 'GET',
      url: '/go/2609_d02_ig_story_en_editor'
    });

    expect(response.headers['cache-control']).toBe('no-cache, no-store');
  });

  it('6. UTM params are correctly URL-encoded in the referrer parameter', async () => {
    server = await buildServer({ runtimeConfig, pool: createPool(), auth });
    const response = await server.inject({
      method: 'GET',
      url: '/go/2609_d02_ig_story_en_editor'
    });

    // The whole referrer string should be encoded
    const location = response.headers.location;
    const url = new URL(location);
    const referrer = url.searchParams.get('referrer');
    
    // The referrer itself shouldn't contain encoded equals because it was decoded by searchParams.get
    // Wait, in Location header:
    // ...?id=com.ibitvalley.writon&referrer=utm_source%3Dinstagram%26utm_medium%3Dorganic_social...
    // The `&` inside referrer should be `%26`. So if we check `location`:
    expect(location).toContain('%26utm_medium');
    expect(location).toContain('utm_source%3Dinstagram');
  });

  it('7. Valid redirects increment a privacy-safe delivery aggregate', async () => {
    const observed = [];
    server = await buildServer({
      runtimeConfig,
      pool: createPool((sql, params) => observed.push({ sql, params })),
      auth,
    });

    const response = await server.inject({
      method: 'GET',
      url: '/go/2609_d02_x_post_en_editor',
    });

    expect(response.statusCode).toBe(302);
    const measurement = observed.find(({ sql }) => sql.includes('campaign_delivery_clicks'));
    expect(measurement.params).toEqual(['2609_d02_x_post_en_editor', 'x']);
    expect(measurement.sql).not.toMatch(/ip|user.?agent|fingerprint|profile_id/i);
  });

  it('8. Redirect still succeeds when aggregate measurement fails', async () => {
    const pool = createPool();
    const originalQuery = pool.query;
    pool.query = async (sql, params) => {
      if (sql.includes('campaign_delivery_clicks')) throw new Error('measurement unavailable');
      return originalQuery(sql, params);
    };
    server = await buildServer({ runtimeConfig, pool, auth });

    const response = await server.inject({
      method: 'GET',
      url: '/go/2609_d02_ig_story_en_editor',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('utm_content%3D2609_d02_ig_story_en_editor');
  });
});
