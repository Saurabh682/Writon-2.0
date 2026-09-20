import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';
import { BUILTIN_VANITY_LINKS } from '../src/routes/vanity-redirects.js';

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
      if (sql.includes('custom_links')) {
        if (params && params[0] === 'custom-test') {
          return { rows: [{ destination_url: 'https://example.com/custom' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

const auth = {
  verifyIdToken: async () => ({ uid: 'test-user', email: 'test@example.com', email_verified: true }),
};

describe('Vanity Redirect Routes', () => {
  let server;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('1. Built-in vanity links redirect with 302 to expected destinations', async () => {
    server = await buildServer({ runtimeConfig, pool: createPool(), auth });

    const checks = [
      { slug: 'instagram', expected: BUILTIN_VANITY_LINKS.instagram },
      { slug: 'ig', expected: BUILTIN_VANITY_LINKS.ig },
      { slug: 'x', expected: BUILTIN_VANITY_LINKS.x },
      { slug: 'twitter', expected: BUILTIN_VANITY_LINKS.twitter },
      { slug: 'threads', expected: BUILTIN_VANITY_LINKS.threads },
      { slug: 'youtube', expected: BUILTIN_VANITY_LINKS.youtube },
      { slug: 'yt', expected: BUILTIN_VANITY_LINKS.yt },
      { slug: 'linkedin', expected: BUILTIN_VANITY_LINKS.linkedin },
      { slug: 'reddit', expected: BUILTIN_VANITY_LINKS.reddit },
      { slug: 'medium', expected: BUILTIN_VANITY_LINKS.medium },
    ];

    for (const check of checks) {
      const response = await server.inject({
        method: 'GET',
        url: `/${check.slug}`,
      });
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(check.expected);
      expect(response.headers['cache-control']).toBe('no-cache, no-store');
    }
  });

  it('2. Increments aggregate click counter for vanity redirects', async () => {
    const observed = [];
    server = await buildServer({
      runtimeConfig,
      pool: createPool((sql, params) => observed.push({ sql, params })),
      auth,
    });

    const response = await server.inject({
      method: 'GET',
      url: '/instagram',
    });

    expect(response.statusCode).toBe(302);
    const clickQuery = observed.find(q => q.sql.includes('campaign_delivery_clicks'));
    expect(clickQuery).toBeDefined();
    expect(clickQuery.params).toEqual(['vanity_instagram', 'instagram']);
  });

  it('3. Custom link from database redirects correctly', async () => {
    server = await buildServer({ runtimeConfig, pool: createPool(), auth });

    const response = await server.inject({
      method: 'GET',
      url: '/custom-test',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('https://example.com/custom');
  });

  it('4. Reserved system paths are not caught by vanity redirect', async () => {
    server = await buildServer({ runtimeConfig, pool: createPool(), auth });

    // /go without parameter returns playstore redirect from campaignRedirectRoutes
    const responseGo = await server.inject({
      method: 'GET',
      url: '/go',
    });
    expect(responseGo.statusCode).toBe(302);
    expect(responseGo.headers.location).toBe(runtimeConfig.playStoreAppUrl);

    // /stories handled by stories route
    const responseStories = await server.inject({
      method: 'GET',
      url: '/stories',
    });
    expect(responseStories.statusCode).toBe(200);

    // /non-existent-link-xyz should 404
    const response404 = await server.inject({
      method: 'GET',
      url: '/non-existent-link-xyz',
    });
    expect(response404.statusCode).toBe(404);
  });
});
