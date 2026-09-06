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
            {
              slug: 'the-tactile-weight-of-an-air-gapped-terminal-lvcq0',
              title: 'The Tactile Weight of an Air-Gapped Terminal',
              summary: 'A reflection on hardware keys and intentional isolation.',
              coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
              lastmod: new Date('2026-08-31T05:00:00Z')
            },
            {
              slug: 'the-prompter-in-the-third-wing-notes-from-minerva-theatre-w8b0c',
              title: 'The Prompter in the Third Wing',
              summary: 'Notes from Minerva Theatre.',
              coverImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf',
              lastmod: new Date('2026-08-31T06:00:00Z')
            }
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

      // Legacy story query (/stories?storyId=... or id=...)
      if (sql.includes('from public.posts') && sql.includes('id::text = $1')) {
        if (params?.[0] === 'valid-id' || params?.[0] === 'the-tactile-weight-of-an-air-gapped-terminal-lvcq0') {
          return {
            rows: [
              { slug: 'the-tactile-weight-of-an-air-gapped-terminal-lvcq0' }
            ],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
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
                language: 'en',
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
        if (params?.[0] === 'hindi-poetry-kavita-slug') {
          return {
            rows: [
              {
                title: 'चाँद और तन्हाई',
                slug: 'hindi-poetry-kavita-slug',
                summary: 'एक ख़ूबसूरत हिंदी कविता।',
                content: 'रात के सन्नाटे में जब चाँद निकलता है...\n\nशायरी दिल की आवाज़ है।',
                category: 'Poetry',
                language: 'hi',
                coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
                publishedAt: new Date('2026-08-31T05:00:00Z'),
                updatedAt: new Date('2026-08-31T05:00:00Z'),
                authorName: 'कबीर दास',
                authorPenName: 'kabir_das',
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
    expect(res.body).toContain('Sitemap: https://writon.cc/feed.xml');
  });

  it('serves valid XML sitemap with published stories, categories, and image extensions', async () => {
    const res = await app.inject({ method: 'GET', url: '/sitemap.xml' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.body).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(res.body).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    expect(res.body).toContain('<loc>https://writon.cc/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0</loc>');
    expect(res.body).toContain('<loc>https://writon.cc/stories?category=Tech</loc>');
    expect(res.body).toContain('<priority>1.0</priority>');
    expect(res.body).toContain('<image:image>');
    expect(res.body).toContain('<image:loc>https://images.unsplash.com/photo-1518770660439-4636190af475</image:loc>');
    expect(res.body).toContain('<image:title>The Tactile Weight of an Air-Gapped Terminal</image:title>');
    expect(res.body).toContain('<image:caption>A reflection on hardware keys and intentional isolation.</image:caption>');
    expect(res.body).toContain('<image:loc>https://writon.cc/assets/writon_wordmark.png</image:loc>');
    expect(res.body).toContain('<image:loc>https://writon.cc/assets/writon_app_icon.png</image:loc>');
  });

  it('serves valid RSS 2.0 feed at /feed.xml and /rss.xml', async () => {
    const res = await app.inject({ method: 'GET', url: '/feed.xml' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/rss+xml');
    expect(res.body).toContain('<rss version="2.0"');
    expect(res.body).toContain('<title>WritOn — Stories, Thinking &amp; Independent Essays</title>');
    expect(res.body).toContain('<link>https://writon.cc/stories</link>');
    expect(res.body).toContain('<item>');
    expect(res.body).toContain('<guid isPermaLink="true">https://writon.cc/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0</guid>');

    const resRss = await app.inject({ method: 'GET', url: '/rss.xml' });
    expect(resRss.statusCode).toBe(200);
    expect(resRss.headers['content-type']).toContain('application/rss+xml');
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

  it('strips extraneous query params from canonical URL in /stories and /stories/:slug', async () => {
    // /stories with tracking parameters and valid category
    const resStories = await app.inject({
      method: 'GET',
      url: '/stories?utm_source=twitter&fbclid=xyz&category=Tech'
    });
    expect(resStories.statusCode).toBe(200);
    expect(resStories.body).toContain('<link rel="canonical" href="https://writon.cc/stories?category=Tech">');
    expect(resStories.body).toContain('"url":"https://writon.cc/stories?category=Tech"');
    expect(resStories.body).not.toContain('href="https://writon.cc/stories?utm_source');
    expect(resStories.body).not.toContain('fbclid');

    // /stories without category but with tracking parameters
    const resStoriesNoCat = await app.inject({
      method: 'GET',
      url: '/stories?utm_source=twitter&fbclid=xyz'
    });
    expect(resStoriesNoCat.statusCode).toBe(200);
    expect(resStoriesNoCat.body).toContain('<link rel="canonical" href="https://writon.cc/stories">');
    expect(resStoriesNoCat.body).toContain('"url":"https://writon.cc/stories"');

    // /stories/:slug with tracking parameters
    const resSlug = await app.inject({
      method: 'GET',
      url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0?utm_source=twitter&fbclid=xyz'
    });
    expect(resSlug.statusCode).toBe(200);
    expect(resSlug.body).toContain('<link rel="canonical" href="https://writon.cc/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0">');
    expect(resSlug.body).toContain('"url":"https://writon.cc/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0"');
    expect(resSlug.body).not.toContain('href="https://writon.cc/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0?utm_source');
  });

  it('returns 301 redirect for trailing slash on /stories/ and /stories/:slug/', async () => {
    const resStoriesSlash = await app.inject({ method: 'GET', url: '/stories/' });
    expect(resStoriesSlash.statusCode).toBe(301);
    expect(resStoriesSlash.headers.location).toBe('/stories');

    const resStorySlugSlash = await app.inject({
      method: 'GET',
      url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0/'
    });
    expect(resStorySlugSlash.statusCode).toBe(301);
    expect(resStorySlugSlash.headers.location).toBe('/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0');
  });

  it('returns 301 redirect for legacy /stories?storyId=<valid-id>', async () => {
    const resLegacy = await app.inject({
      method: 'GET',
      url: '/stories?storyId=valid-id'
    });
    expect(resLegacy.statusCode).toBe(301);
    expect(resLegacy.headers.location).toBe('/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0');

    // Also verify legacy ?id=<valid-id>
    const resLegacyId = await app.inject({
      method: 'GET',
      url: '/stories?id=valid-id'
    });
    expect(resLegacyId.statusCode).toBe(301);
    expect(resLegacyId.headers.location).toBe('/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0');
  });

  it('includes data-nosnippet on discovery deck and story share boilerplate elements', async () => {
    // 1. Discovery deck /stories
    const resDeck = await app.inject({ method: 'GET', url: '/stories' });
    expect(resDeck.statusCode).toBe(200);
    expect(resDeck.body).toContain('<header class="site-header" data-nosnippet>');
    expect(resDeck.body).toContain('<aside class="app-spotlight-card" data-nosnippet>');
    expect(resDeck.body).toContain('<div class="sticky-mobile-bar" data-nosnippet>');

    // 2. Story share page /stories/:slug
    const resStory = await app.inject({ method: 'GET', url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0' });
    expect(resStory.statusCode).toBe(200);
    expect(resStory.body).toContain('<header class="site-header" data-nosnippet');
    expect(resStory.body).toContain('<div class="app-banner" data-nosnippet');
    expect(resStory.body).toContain('<div class="sticky-app-bar" data-nosnippet>');
    expect(resStory.body).toContain('<footer class="story-footer" data-nosnippet>');
  });

  it('includes high-resolution Open Graph image dimensions (1200x630) on discovery deck and story pages', async () => {
    const resDeck = await app.inject({ method: 'GET', url: '/stories' });
    expect(resDeck.statusCode).toBe(200);
    expect(resDeck.body).toContain('<meta property="og:image:width" content="1200">');
    expect(resDeck.body).toContain('<meta property="og:image:height" content="630">');

    const resStory = await app.inject({ method: 'GET', url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0' });
    expect(resStory.statusCode).toBe(200);
    expect(resStory.body).toContain('<meta property="og:image:width" content="1200">');
    expect(resStory.body).toContain('<meta property="og:image:height" content="630">');
  });

  it('includes full Google Search preview directives in meta robots on discovery deck and story pages', async () => {
    const resDeck = await app.inject({ method: 'GET', url: '/stories' });
    expect(resDeck.statusCode).toBe(200);
    expect(resDeck.body).toContain('max-image-preview:large');
    expect(resDeck.body).toContain('max-snippet:-1');
    expect(resDeck.body).toContain('max-video-preview:-1');

    const resStory = await app.inject({ method: 'GET', url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0' });
    expect(resStory.statusCode).toBe(200);
    expect(resStory.body).toContain('max-image-preview:large');
    expect(resStory.body).toContain('max-snippet:-1');
    expect(resStory.body).toContain('max-video-preview:-1');
  });

  it('renders story cover images with descriptive alt text and decoding="async"', async () => {
    const resDeck = await app.inject({ method: 'GET', url: '/stories' });
    expect(resDeck.statusCode).toBe(200);
    expect(resDeck.body).toContain('alt="Cover artwork for The Tactile Weight of an Air-Gapped Terminal"');
    expect(resDeck.body).toContain('decoding="async"');

    const resStory = await app.inject({ method: 'GET', url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0' });
    expect(resStory.statusCode).toBe(200);
    expect(resStory.body).toContain('alt="Cover artwork for The Tactile Weight of an Air-Gapped Terminal"');
    expect(resStory.body).toContain('decoding="async"');
  });

  it('renders dynamic html lang, hreflang alternates, and x-default on story share pages', async () => {
    // 1. English story share page
    const resEn = await app.inject({
      method: 'GET',
      url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0'
    });
    expect(resEn.statusCode).toBe(200);
    expect(resEn.body).toContain('<html lang="en">');
    expect(resEn.body).toContain('<link rel="alternate" hreflang="en" href="https://writon.cc/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0">');
    expect(resEn.body).toContain('<link rel="alternate" hreflang="x-default" href="https://writon.cc/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0">');
    expect(resEn.body).toContain('<meta property="og:locale" content="en_US">');

    // 2. Hindi story share page
    const resHi = await app.inject({
      method: 'GET',
      url: '/stories/hindi-poetry-kavita-slug'
    });
    expect(resHi.statusCode).toBe(200);
    expect(resHi.body).toContain('<html lang="hi">');
    expect(resHi.body).toContain('<link rel="alternate" hreflang="hi" href="https://writon.cc/stories/hindi-poetry-kavita-slug">');
    expect(resHi.body).toContain('<link rel="alternate" hreflang="x-default" href="https://writon.cc/stories/hindi-poetry-kavita-slug">');
    expect(resHi.body).toContain('<meta property="og:locale" content="hi_IN">');
  });

  it('renders x-default hreflang and og:locale on discovery deck /stories', async () => {
    const resDeck = await app.inject({ method: 'GET', url: '/stories' });
    expect(resDeck.statusCode).toBe(200);
    expect(resDeck.body).toContain('<link rel="alternate" hreflang="en" href="https://writon.cc/stories">');
    expect(resDeck.body).toContain('<link rel="alternate" hreflang="x-default" href="https://writon.cc/stories">');
    expect(resDeck.body).toContain('<meta property="og:locale" content="en_US">');
  });

  it('optimizes mobile viewport with viewport-fit=cover on discovery deck and story pages', async () => {
    const resDeck = await app.inject({ method: 'GET', url: '/stories' });
    expect(resDeck.statusCode).toBe(200);
    expect(resDeck.body).toContain('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');

    const resStory = await app.inject({ method: 'GET', url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0' });
    expect(resStory.statusCode).toBe(200);
    expect(resStory.body).toContain('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
  });

  it('optimizes font resources with preconnect to fonts.googleapis.com and fonts.gstatic.com with crossorigin', async () => {
    const resDeck = await app.inject({ method: 'GET', url: '/stories' });
    expect(resDeck.statusCode).toBe(200);
    expect(resDeck.body).toContain('<link rel="preconnect" href="https://fonts.googleapis.com">');
    expect(resDeck.body).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    expect(resDeck.body).toContain('display=swap');

    const resStory = await app.inject({ method: 'GET', url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0' });
    expect(resStory.statusCode).toBe(200);
    expect(resStory.body).toContain('<link rel="preconnect" href="https://fonts.googleapis.com">');
    expect(resStory.body).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    expect(resStory.body).toContain('display=swap');
  });

  it('preloads critical brand assets on discovery deck and story pages for LCP optimization', async () => {
    const resDeck = await app.inject({ method: 'GET', url: '/stories' });
    expect(resDeck.statusCode).toBe(200);
    expect(resDeck.body).toContain('<link rel="preload" as="image" href="/assets/favicon-48x48.png">');

    const resStory = await app.inject({ method: 'GET', url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0' });
    expect(resStory.statusCode).toBe(200);
    expect(resStory.body).toContain('<link rel="preload" as="image" href="/assets/favicon-48x48.png">');
  });

  it('enforces minimum touch targets (min-height: 44px) for mobile usability and WCAG AA', async () => {
    const resDeck = await app.inject({ method: 'GET', url: '/stories' });
    expect(resDeck.statusCode).toBe(200);
    expect(resDeck.body).toContain('.pill {');
    expect(resDeck.body).toContain('min-height: 44px');
    expect(resDeck.body).toContain('.card-arrow-btn {');
    expect(resDeck.body).toContain('.app-badge-btn {');
  });
});

