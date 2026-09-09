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

      // News sitemap query
      if (sql.includes("interval '48 hours'") || (sql.includes('from public.posts') && sql.includes('language_code') && !sql.includes('where p.slug ='))) {
        return {
          rows: [
            {
              slug: 'the-tactile-weight-of-an-air-gapped-terminal-lvcq0',
              title: 'The Tactile Weight of an Air-Gapped Terminal',
              language: 'en',
              publishedAt: new Date('2026-08-31T05:00:00Z')
            }
          ],
          rowCount: 1
        };
      }

      // /stories directory & RSS feed query
      if (sql.includes('from public.posts p') && (sql.includes('limit 50') || sql.includes('limit 21'))) {
        return {
          rows: [
            {
              title: 'The Tactile Weight of an Air-Gapped Terminal',
              slug: 'the-tactile-weight-of-an-air-gapped-terminal-lvcq0',
              summary: 'A reflection on hardware keys and intentional isolation.',
              content: 'There is a particular acoustic snap when you insert a physical cryptographic key.',
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
        if (params?.[0] === 'code-block-story-slug') {
          return {
            rows: [
              {
                title: 'Code Architecture in TypeScript',
                slug: 'code-block-story-slug',
                summary: 'Deterministic backoff logic.',
                content: 'Here is the implementation:\n\n```typescript\ninterface Config {\n  retryCount: number;\n}\n```\n\nPreserved.',
                category: 'Tech',
                language: 'en',
                coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
                publishedAt: new Date('2026-08-31T05:00:00Z'),
                updatedAt: new Date('2026-08-31T05:00:00Z'),
                authorName: 'Aarav Mehta',
                authorPenName: 'aarav_tech',
                authorAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
              }
            ],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      }

      // Author profile query (/author/:penName)
      if (sql.includes('from public.profiles') && (sql.includes('pen_name') || sql.includes('lower(p.pen_name)'))) {
        const targetPenName = String(params?.[0] || '').toLowerCase();
        if (targetPenName === 'maya_lin_craft') {
          return {
            rows: [
              {
                id: 'profile-maya-lin',
                full_name: 'Maya Lin',
                pen_name: 'maya_lin_craft',
                bio: 'Architect of quiet systems and tactile interfaces.',
                avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
                quote_of_day: 'Simplicity is the prerequisite for reliability.',
                created_at: new Date('2026-08-01T00:00:00Z')
              }
            ],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      }

      // Author published stories query
      if (sql.includes('from public.posts') && sql.includes('author_id = $1')) {
        if (params?.[0] === 'profile-maya-lin') {
          return {
            rows: [
              {
                title: 'The Tactile Weight of an Air-Gapped Terminal',
                slug: 'the-tactile-weight-of-an-air-gapped-terminal-lvcq0',
                summary: 'A reflection on hardware keys and intentional isolation.',
                category: 'Tech',
                cover_image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
                coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
                reading_time_min: 2,
                readingTimeMin: 2,
                published_at: new Date('2026-08-31T05:00:00Z'),
                publishedAt: new Date('2026-08-31T05:00:00Z')
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
    expect(res.body).toContain('Allow: /author/*');
    expect(res.body).toContain('Allow: /news-sitemap.xml');
    expect(res.body).toContain('Sitemap: https://writon.cc/sitemap.xml');
    expect(res.body).toContain('Sitemap: https://writon.cc/news-sitemap.xml');
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

  it('serves valid Google News XML sitemap at /news-sitemap.xml complying with official schema', async () => {
    const res = await app.inject({ method: 'GET', url: '/news-sitemap.xml' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.body).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(res.body).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
    expect(res.body).toContain('<news:news>');
    expect(res.body).toContain('<news:publication>');
    expect(res.body).toContain('<news:name>WritOn</news:name>');
    expect(res.body).toContain('<news:language>en</news:language>');
    expect(res.body).toContain('</news:publication>');
    expect(res.body).toContain('<news:publication_date>2026-08-31T05:00:00.000Z</news:publication_date>');
    expect(res.body).toContain('<news:title>The Tactile Weight of an Air-Gapped Terminal</news:title>');
    expect(res.body).toContain('<loc>https://writon.cc/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0</loc>');
  });

  it('serves valid RSS 2.0 feed at /feed.xml and /rss.xml', async () => {
    const res = await app.inject({ method: 'GET', url: '/feed.xml' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/rss+xml');
    expect(res.body).toContain('<rss version="2.0"');
    expect(res.body).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
    expect(res.body).toContain('<title>WritOn — Stories, Thinking &amp; Independent Essays</title>');
    expect(res.body).toContain('<link>https://writon.cc/stories</link>');
    expect(res.body).toContain('<item>');
    expect(res.body).toContain('<guid isPermaLink="true">https://writon.cc/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0</guid>');
    expect(res.body).toContain('<content:encoded><![CDATA[');
    expect(res.body).toContain('There is a particular acoustic snap when you insert a physical cryptographic key.');

    const resRss = await app.inject({ method: 'GET', url: '/rss.xml' });
    expect(resRss.statusCode).toBe(200);
    expect(resRss.headers['content-type']).toContain('application/rss+xml');
    expect(resRss.body).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
    expect(resRss.body).toContain('<content:encoded><![CDATA[');
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

  it('serves Schema.org FAQPage structured data on /stories for Generative AI Search (GEO/AEO)', async () => {
    const res = await app.inject({ method: 'GET', url: '/stories' });
    expect(res.statusCode).toBe(200);

    const match = res.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match[1]);

    const faq = parsed['@graph']?.find((node) => node['@type'] === 'FAQPage');
    expect(faq).toBeDefined();
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);

    const questions = faq.mainEntity.map((q) => q.name);
    expect(questions).toContain('What is WritOn?');
    expect(questions).toContain('Can I read stories and essays offline on WritOn?');
    expect(questions).toContain('How do authors publish on WritOn?');
    expect(questions).toContain('Is WritOn free to read?');

    faq.mainEntity.forEach((q) => {
      expect(q['@type']).toBe('Question');
      expect(q.acceptedAnswer['@type']).toBe('Answer');
      expect(typeof q.acceptedAnswer.text).toBe('string');
      expect(q.acceptedAnswer.text.length).toBeGreaterThan(20);
    });

    // Also verify visible FAQ section in the HTML body
    expect(res.body).toContain('Frequently Asked Questions');
    expect(res.body).toContain('What is WritOn?');
    expect(res.body).toContain('Can I read stories and essays offline on WritOn?');
  });

  it('enriches Organization and SoftwareApplication entities with sameAs links on /stories and story share pages', async () => {
    // 1. Discovery deck /stories
    const resDeck = await app.inject({ method: 'GET', url: '/stories' });
    expect(resDeck.statusCode).toBe(200);
    const deckMatch = resDeck.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const deckParsed = JSON.parse(deckMatch[1]);

    const collectionPage = deckParsed['@graph']?.find((node) => node['@type'] === 'CollectionPage');
    expect(collectionPage?.publisher?.sameAs).toContain('https://play.google.com/store/apps/details?id=com.ibitvalley.writon');
    expect(collectionPage?.publisher?.sameAs).toContain('https://github.com/Saurabh682/WritOn-PowerUp');

    const appNode = deckParsed['@graph']?.find((node) => node['@type'] === 'SoftwareApplication');
    expect(appNode).toBeDefined();
    expect(appNode.applicationCategory).toBe('BooksAndReferenceApplication');
    expect(appNode.sameAs).toContain('https://play.google.com/store/apps/details?id=com.ibitvalley.writon');
    expect(appNode.sameAs).toContain('https://github.com/Saurabh682/WritOn-PowerUp');

    // 2. Story share page /stories/:slug
    const resStory = await app.inject({ method: 'GET', url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0' });
    expect(resStory.statusCode).toBe(200);
    const storyMatch = resStory.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const storyParsed = JSON.parse(storyMatch[1]);

    const blogPosting = storyParsed['@graph']?.find((node) => node['@type'] === 'BlogPosting');
    expect(blogPosting?.publisher?.sameAs).toContain('https://play.google.com/store/apps/details?id=com.ibitvalley.writon');
    expect(blogPosting?.publisher?.sameAs).toContain('https://github.com/Saurabh682/WritOn-PowerUp');

    const storyAppNode = storyParsed['@graph']?.find((node) => node['@type'] === 'SoftwareApplication');
    expect(storyAppNode).toBeDefined();
    expect(storyAppNode.applicationCategory).toBe('BooksAndReferenceApplication');
    expect(storyAppNode.sameAs).toContain('https://play.google.com/store/apps/details?id=com.ibitvalley.writon');
    expect(storyAppNode.sameAs).toContain('https://github.com/Saurabh682/WritOn-PowerUp');
  });

  it('serves server-side rendered author profile page with Schema.org ProfilePage & Person', async () => {
    const res = await app.inject({ method: 'GET', url: '/author/maya_lin_craft' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');

    // Title and Meta
    expect(res.body).toContain('<title>Maya Lin (@maya_lin_craft) — Author on WritOn</title>');
    expect(res.body).toContain('<link rel="canonical" href="https://writon.cc/author/maya_lin_craft">');
    expect(res.body).toContain('<link rel="alternate" hreflang="x-default" href="https://writon.cc/author/maya_lin_craft">');
    expect(res.body).toContain('<meta property="og:type" content="profile">');
    expect(res.body).toContain('<meta property="og:title" content="Maya Lin (@maya_lin_craft) — Author on WritOn">');

    // Profile Details
    expect(res.body).toContain('Maya Lin');
    expect(res.body).toContain('@maya_lin_craft');
    expect(res.body).toContain('Architect of quiet systems and tactile interfaces.');
    expect(res.body).toContain('Simplicity is the prerequisite for reliability.');

    // Published story card
    expect(res.body).toContain('The Tactile Weight of an Air-Gapped Terminal');
    expect(res.body).toContain('href="/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0"');

    // Navigation and anti-snippet tags
    expect(res.body).toContain('<a href="/stories" class="brand-logo">Writ<span>On</span></a>');
    expect(res.body).toContain('<header class="site-header" data-nosnippet>');
    expect(res.body).toContain('<footer class="site-footer" data-nosnippet>');
    expect(res.body).toContain('<div class="sticky-mobile-bar" data-nosnippet>');

    // JSON-LD Schema.org ProfilePage + Person
    const match = res.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match[1]);
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@type']).toBe('ProfilePage');
    expect(parsed.mainEntity).toBeDefined();
    expect(parsed.mainEntity['@type']).toBe('Person');
    expect(parsed.mainEntity.name).toBe('Maya Lin');
    expect(parsed.mainEntity.alternateName).toBe('@maya_lin_craft');
    expect(parsed.mainEntity.description).toBe('Architect of quiet systems and tactile interfaces.');
    expect(parsed.mainEntity.image).toBe('https://images.unsplash.com/photo-1534528741775-53994a69daeb');
    expect(parsed.mainEntity.url).toBe('https://writon.cc/author/maya_lin_craft');
    expect(parsed.mainEntity.mainEntityOfPage).toBe('https://writon.cc/author/maya_lin_craft');
  });

  it('returns 301 redirect for /authors/:penName and trailing slashes to /author/:penName', async () => {
    // 1. /authors/:penName -> /author/:penName
    const resAuthors = await app.inject({ method: 'GET', url: '/authors/maya_lin_craft' });
    expect(resAuthors.statusCode).toBe(301);
    expect(resAuthors.headers.location).toBe('/author/maya_lin_craft');

    // 2. /authors/:penName/ -> /author/:penName
    const resAuthorsSlash = await app.inject({ method: 'GET', url: '/authors/maya_lin_craft/' });
    expect(resAuthorsSlash.statusCode).toBe(301);
    expect(resAuthorsSlash.headers.location).toBe('/author/maya_lin_craft');

    // 3. /author/:penName/ -> /author/:penName
    const resAuthorSlash = await app.inject({ method: 'GET', url: '/author/maya_lin_craft/' });
    expect(resAuthorSlash.statusCode).toBe(301);
    expect(resAuthorSlash.headers.location).toBe('/author/maya_lin_craft');
  });

  it('links author byline to /author/:penName on story share reader and JSON-LD schema', async () => {
    const res = await app.inject({ method: 'GET', url: '/stories/the-tactile-weight-of-an-air-gapped-terminal-lvcq0' });
    expect(res.statusCode).toBe(200);

    // HTML byline contains clickable author link
    expect(res.body).toContain('href="/author/maya_lin_craft"');

    // JSON-LD schema author object contains author url
    const match = res.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match[1]);
    const blogPosting = parsed['@graph']?.find((node) => node['@type'] === 'BlogPosting');
    expect(blogPosting).toBeDefined();
    expect(blogPosting.author['@type']).toBe('Person');
    expect(blogPosting.author.name).toBe('Maya Lin');
    expect(blogPosting.author.url).toBe('https://writon.cc/author/maya_lin_craft');
  });

  it('links author name/avatar to /author/:penName on discovery deck cards', async () => {
    const res = await app.inject({ method: 'GET', url: '/stories' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('href="/author/maya_lin_craft"');
    expect(res.body).toContain('class="card-author-link"');
  });

  it('returns 404 with clean HTML when author is not found', async () => {
    const res = await app.inject({ method: 'GET', url: '/author/non_existent_author_xyz' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Author not found');
  });

  it('renders fenced code blocks as syntax-styled pre and code elements on story share page', async () => {
    const res = await app.inject({ method: 'GET', url: '/stories/code-block-story-slug' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<pre class="language-typescript"><code>interface Config {\n  retryCount: number;\n}</code></pre>');
  });
});

