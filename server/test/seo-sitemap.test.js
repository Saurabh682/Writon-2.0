import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../src/server.js';

describe('SEO, Sitemap & Google Search Indexing Endpoints', () => {
  let app;

  const mockDatabase = {
    query: async (text, params) => {
      const sql = String(text).toLowerCase();

      // Health / time check
      if (sql.includes('select now()')) {
        return { rows: [{ database_time: new Date().toISOString() }], rowCount: 1 };
      }

      // Sitemap stories query
      if (sql.includes('from public.posts') && sql.includes('limit 5000')) {
        return {
          rows: [
            { slug: 'the-tactile-weight-of-an-air-gapped-terminal-lvcq0', lastmod: new Date('2026-08-31T05:00:00Z') },
            { slug: 'the-prompter-in-the-third-wing-notes-from-minerva-theatre-w8b0c', lastmod: new Date('2026-08-31T06:00:00Z') }
          ],
          rowCount: 2
        };
      }

      // /stories directory query
      if (sql.includes('from public.posts p') && (sql.includes('limit 50') || sql.includes('limit 21'))) {
        return {
          rows: [
            {
              title: 'The Tactile Weight of an Air-Gapped Terminal',
              slug: 'the-tactile-weight-of-an-air-gapped-terminal-lvcq0',
              summary: 'A reflection on hardware keys and intentional isolation.',
              category: 'Tech',
              readingTimeMin: 2,
              likesCount: 71,
              commentsCount: 4,
              publishedAt: new Date('2026-08-31T05:00:00Z'),
              authorName: 'Maya Lin',
              authorPenName: 'maya_lin_craft'
            }
          ],
          rowCount: 1
        };
      }

      // /stories/:slug query
      if (sql.includes('from public.posts p') && sql.includes('where p.slug = $1')) {
        if (params?.[0] === 'the-tactile-weight-of-an-air-gapped-terminal-lvcq0') {
          return {
            rows: [
              {
                title: 'The Tactile Weight of an Air-Gapped Terminal',
                slug: 'the-tactile-weight-of-an-air-gapped-terminal-lvcq0',
                summary: 'A reflection on hardware keys and intentional isolation.',
                content: 'There is a particular acoustic snap when you insert a physical cryptographic key.\n\n### I. The Architecture of Deliberate Friction\n\nFriction is the only thing that preserves human agency.',
                category: 'Tech',
                coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
                publishedAt: new Date('2026-08-31T05:00:00Z'),
                updatedAt: new Date('2026-08-31T05:00:00Z'),
                authorName: 'Maya Lin',
                authorPenName: 'maya_lin_craft',
                authorAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
              }
            ],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      }

      return { rows: [], rowCount: 0 };
    }
  };

  beforeAll(async () => {
    app = await buildServer({
      runtimeConfig: {
        port: 3001,
        databaseUrl: 'postgres://test:test@localhost:5432/writon_test',
        jwtSecret: 'test_jwt_secret_which_is_at_least_32_characters_long_for_security',
        publicApiBaseUrl: 'https://writon.cc',
        playStoreAppUrl: 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon'
      },
      pool: mockDatabase,
      auth: {},
      messaging: {}
    });
  });

  it('serves valid robots.txt with sitemap directive', async () => {
    const res = await app.inject({ method: 'GET', url: '/robots.txt' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.body).toContain('User-agent: *');
    expect(res.body).toContain('Allow: /stories');
    expect(res.body).toContain('Sitemap: https://writon.cc/sitemap.xml');
  });

  it('serves valid XML sitemap with published stories and categories', async () => {
    const res = await app.inject({ method: 'GET', url: '/sitemap.xml' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(res.body).toContain('<loc>https://writon.cc/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0</loc>');
    expect(res.body).toContain('<loc>https://writon.cc/stories?category=Tech</loc>');
    expect(res.body).toContain('<priority>1.0</priority>');
  });

  it('serves crawlable stories index directory at /stories', async () => {
    const res = await app.inject({ method: 'GET', url: '/stories' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('The Tactile Weight of an Air-Gapped Terminal');
    expect(res.body).toContain('Maya Lin');
    expect(res.body).toContain('@maya_lin_craft');
    expect(res.body).toContain('Discover stories');
    expect(res.body).toContain('id="stories-grid"');
    expect(res.body).toContain('id="load-more-btn"');
    expect(res.body).toContain('href="https://play.google.com/store/apps/details?id=com.ibitvalley.writon');
  });

  it('serves discovery deck on root / for browsers expecting HTML', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { accept: 'text/html,application/xhtml+xml' }
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Discover stories');
    expect(res.body).toContain('The Tactile Weight of an Air-Gapped Terminal');
  });

  it('serves enhanced story share page with JSON-LD, robots meta, and semantic article body', async () => {
    const res = await app.inject({ method: 'GET', url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('<title>The Tactile Weight of an Air-Gapped Terminal — WritOn</title>');
    expect(res.body).toContain('name="robots" content="index, follow, max-image-preview:large');
    expect(res.body).toContain('type="application/ld+json"');
    expect(res.body).toContain('"@type":"BlogPosting"');
    expect(res.body).toContain('"name":"Maya Lin"');
    expect(res.body).toContain('<h3>I. The Architecture of Deliberate Friction</h3>');
    expect(res.body).toContain('<div class="story-body">');
    expect(res.body).toContain('intent://writon.cc/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0#Intent;scheme=https;package=com.ibitvalley.writon;');
    expect(res.body).toContain('utm_source=google_search');
  });

  it('serves Google Search Console verification file', async () => {
    const res = await app.inject({ method: 'GET', url: '/google422d5cef1d4bc150.html' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toBe('google-site-verification: google422d5cef1d4bc150.html');
  });

  it('serves wildcard Google Search Console verification files', async () => {
    const res = await app.inject({ method: 'GET', url: '/googleabcdef1234567890.html' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toBe('google-site-verification: googleabcdef1234567890.html');
  });

  it('returns 404 for non-existent story slug', async () => {
    const res = await app.inject({ method: 'GET', url: '/stories/non-existent-story-slug-xyz' });
    expect(res.statusCode).toBe(404);
  });
});
