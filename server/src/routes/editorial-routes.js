/**
 * WritOn Editorial Routes
 *
 * Exposes public reading endpoints (SSR & JSON):
 * - GET /journal (SSR HTML)
 * - GET /journal/:slug (SSR HTML)
 * - GET /updates (SSR HTML)
 * - GET /journal/rss.xml (Journal-specific RSS 2.0 feed)
 * - GET /api/v1/journal
 * - GET /api/v1/journal/:slug
 * - GET /api/v1/updates
 *
 * Exposes protected internal automation endpoints:
 * - POST /internal/editorial/events/release (Idempotent release ingestion)
 * - POST /internal/editorial/run/weekly (Weekly candidate evaluation)
 */

import { z } from 'zod';
import {
  getPublishedJournalPosts,
  getPostBySlug,
  getRecentUpdates,
  ingestReleaseEvent,
  runWeeklyEditorial,
  validateAntiSlop,
  validateLengthClass
} from '../services/editorial/index.js';

const releaseEventSchema = z.object({
  idempotencyKey: z.string().trim().min(3),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
  versionCode: z.coerce.number().int().min(1),
  versionName: z.string().trim().min(1),
  rawPayload: z.record(z.any()).optional().default({}),
  userVisibleChanges: z.array(z.string().trim().min(1)).default([]),
  isMajor: z.boolean().optional().default(false)
});

function escapeXml(unsafe) {
  return String(unsafe ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCategory(cat) {
  const map = {
    'inside-writon': 'Inside WritOn',
    'building-writon': 'Building WritOn',
    'writing-reading': 'Writing & Reading',
    'community': 'Community',
    'writon-updates': 'Updates'
  };
  return map[cat] || cat;
}

function requestOrigin(request, configuredBaseUrl) {
  try {
    if (configuredBaseUrl) return new URL(configuredBaseUrl).origin;
  } catch {}
  const forwardedProtocol = String(request.headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
  const forwardedHost = String(request.headers['x-forwarded-host'] ?? '').split(',')[0].trim();
  const protocol = forwardedProtocol || request.protocol || 'https';
  const host = forwardedHost || request.headers.host;
  return `${protocol}://${host}`;
}

export async function editorialRoutes(fastify, options) {
  const pool = options.pool;
  const config = options.config;

  const cacheHeaders = (reply) => {
    reply.header('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400');
  };

  // --- Public SSR HTML Endpoints ---

  // 1. GET /journal — Editorial Catalog
  fastify.get('/journal', async (request, reply) => {
    const { category, page = 1 } = request.query;
    const origin = requestOrigin(request, config?.publicApiBaseUrl);

    const result = await getPublishedJournalPosts(pool, {
      category: category && category !== 'all' ? category : undefined,
      page: parseInt(page, 10) || 1,
      limit: 20
    });

    const posts = result.posts || [];
    const featured = posts.find(p => p.featured) || posts[0];
    const regularPosts = (category && category !== 'all') ? posts : posts.filter(p => p.id !== featured?.id);

    let featuredHtml = '';
    if (featured && (!category || category === 'all') && (parseInt(page, 10) || 1) === 1) {
      const pubDate = new Date(featured.publishedAt || featured.createdAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      featuredHtml = `
      <a class="featured-card" href="/journal/${encodeURIComponent(featured.slug)}">
        <span class="featured-tag">★ Featured Essay · ${escapeHtml(formatCategory(featured.category))}</span>
        <h2 class="featured-title">${escapeHtml(featured.title)}</h2>
        <p class="featured-excerpt">${escapeHtml(featured.excerpt)}</p>
        <div class="meta-row">
          <span>${escapeHtml(featured.authorName)}</span>
          <span class="bullet">•</span>
          <span>${pubDate}</span>
          <span class="bullet">•</span>
          <span>${featured.estimatedReadMinutes} min read</span>
        </div>
      </a>`;
    }

    let gridHtml = '';
    if (posts.length === 0) {
      gridHtml = `<div style="grid-column: 1/-1; text-align: center; color: var(--muted); padding: 64px 0;">No articles published in this category yet.</div>`;
    } else {
      const displayPosts = ((!category || category === 'all') && (parseInt(page, 10) || 1) === 1) ? regularPosts : posts;
      gridHtml = displayPosts.map(post => {
        const pubDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        });
        return `
        <a class="article-card" href="/journal/${encodeURIComponent(post.slug)}">
          <div class="card-top">
            <div class="card-category">${escapeHtml(formatCategory(post.category))}</div>
            <h3 class="card-title">${escapeHtml(post.title)}</h3>
            <p class="card-excerpt">${escapeHtml(post.excerpt)}</p>
          </div>
          <div class="meta-row">
            <span>${pubDate}</span>
            <span class="bullet">•</span>
            <span>${post.estimatedReadMinutes} min read</span>
          </div>
        </a>`;
      }).join('\n');
    }

    const categories = [
      { id: 'all', label: 'All Pieces' },
      { id: 'inside-writon', label: 'Inside WritOn' },
      { id: 'building-writon', label: 'Building WritOn' },
      { id: 'writing-reading', label: 'Writing & Reading' },
      { id: 'community', label: 'Community' },
      { id: 'writon-updates', label: 'Updates' }
    ];

    const filterPills = categories.map(c => {
      const active = (category === c.id || (!category && c.id === 'all')) ? ' active' : '';
      const href = c.id === 'all' ? '/journal' : `/journal?category=${c.id}`;
      return `<a class="filter-pill${active}" href="${href}">${c.label}</a>`;
    }).join('\n');

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#F7F3EB" />
  <title>WritOn Journal — Essays, Notes &amp; Reflections</title>
  <meta name="description" content="An editorial, reading-first journal exploring literature, craft, the philosophy of slow reading, and behind-the-scenes building of WritOn." />
  <link rel="canonical" href="${origin}/journal" />
  <link rel="alternate" type="application/rss+xml" title="WritOn Journal RSS Feed" href="${origin}/journal/rss.xml" />
  <link rel="alternate" type="application/rss+xml" title="WritOn — Stories &amp; Journal" href="${origin}/rss.xml" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="WritOn" />
  <meta property="og:url" content="${origin}/journal" />
  <meta property="og:title" content="WritOn Journal — Essays, Notes &amp; Reflections" />
  <meta property="og:description" content="An editorial publication dedicated to craft, quiet reading, and the building of WritOn." />
  <meta property="og:image" content="${origin}/assets/hero-banner.webp" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@WritOn_Social" />
  <meta name="twitter:title" content="WritOn Journal — Essays, Notes &amp; Reflections" />
  <meta name="twitter:description" content="An editorial publication dedicated to craft, quiet reading, and the building of WritOn." />
  <meta name="twitter:image" content="${origin}/assets/hero-banner.webp" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48x48.png?v=2" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png?v=2" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F7F3EB;
      --surface: #FFFDF9;
      --surface-hover: #FCF8F2;
      --ink: #26211D;
      --muted: #645C54;
      --primary: #B5442A;
      --primary-dark: #98351E;
      --primary-soft: #F3D5C7;
      --border: #E7DDD1;
      --shadow-sm: 0 2px 8px rgba(38, 33, 29, 0.04);
      --shadow-md: 0 12px 32px rgba(38, 33, 29, 0.08);
      --container: 1040px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: Newsreader, Georgia, serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.7;
      font-size: 19px;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }
    .paper-noise {
      position: fixed; inset: 0; pointer-events: none; z-index: -1; opacity: .18;
      background-image: repeating-radial-gradient(circle at 0 0, transparent 0 2px, rgba(80,60,40,.04) 3px 4px);
      background-size: 9px 9px; mix-blend-mode: multiply;
    }
    .site-header {
      position: sticky; top: 0; z-index: 50;
      backdrop-filter: blur(16px);
      background: color-mix(in srgb, var(--bg) 84%, transparent);
      border-bottom: 1px solid rgba(231,221,209,.8);
    }
    .nav-wrap {
      max-width: var(--container); margin: 0 auto; height: 76px;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px;
    }
    .brand img { width: 136px; height: auto; display: block; }
    .nav-links { display: flex; gap: 24px; align-items: center; font-family: Inter, sans-serif; font-size: 14px; font-weight: 500; }
    .nav-links a { color: var(--muted); text-decoration: none; transition: color .2s ease; }
    .nav-links a:hover, .nav-links a.active { color: var(--primary); }
    .btn-nav-app {
      background: linear-gradient(135deg, #D75D38, var(--primary));
      color: #fff !important; font-weight: 600; padding: 8px 18px; border-radius: 999px;
      box-shadow: var(--shadow-sm);
    }
    main { max-width: var(--container); margin: 0 auto; padding: 56px 24px 100px; }
    .journal-header { margin-bottom: 40px; text-align: center; }
    .eyebrow {
      font-family: Inter, sans-serif; font-size: 12px; font-weight: 700;
      letter-spacing: .18em; color: var(--primary); text-transform: uppercase; margin-bottom: 12px;
    }
    h1 {
      font-size: clamp(38px, 5.5vw, 60px); font-weight: 500; line-height: 1.1;
      letter-spacing: -0.03em; color: var(--ink); margin-bottom: 16px;
    }
    .header-desc { font-size: 21px; color: var(--muted); font-style: italic; max-width: 640px; margin: 0 auto; }
    .filter-bar {
      display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
      margin: 36px 0 48px; font-family: Inter, sans-serif;
    }
    .filter-pill {
      background: rgba(255, 253, 249, 0.7);
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 7px 18px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all .2s ease;
    }
    .filter-pill:hover, .filter-pill.active {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .featured-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 44px 40px;
      margin-bottom: 56px;
      box-shadow: var(--shadow-sm);
      display: block;
      text-decoration: none;
      color: inherit;
      transition: transform .25s ease, box-shadow .25s ease;
    }
    .featured-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-md);
      background: var(--surface-hover);
    }
    .featured-tag {
      display: inline-block;
      font-family: Inter, sans-serif; font-size: 11px; font-weight: 700;
      letter-spacing: .12em; text-transform: uppercase; color: var(--primary);
      margin-bottom: 12px;
    }
    .featured-title {
      font-size: clamp(28px, 4vw, 42px); font-weight: 500; line-height: 1.15;
      margin-bottom: 16px; color: var(--ink);
    }
    .featured-excerpt {
      font-size: 19px; color: var(--muted); line-height: 1.6; margin-bottom: 24px;
    }
    .meta-row {
      display: flex; gap: 16px; align-items: center;
      font-family: Inter, sans-serif; font-size: 13px; color: var(--muted);
    }
    .meta-row span.bullet { opacity: .4; }
    .articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
      gap: 32px;
    }
    .article-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-decoration: none;
      color: inherit;
      box-shadow: var(--shadow-sm);
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .article-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-md);
      background: var(--surface-hover);
    }
    .card-top { margin-bottom: 20px; }
    .card-category {
      font-family: Inter, sans-serif; font-size: 11px; font-weight: 700;
      letter-spacing: .1em; text-transform: uppercase; color: var(--primary);
      margin-bottom: 8px;
    }
    .card-title {
      font-size: 24px; font-weight: 500; line-height: 1.25; margin-bottom: 12px;
      color: var(--ink);
    }
    .card-excerpt {
      font-size: 16px; color: var(--muted); line-height: 1.6;
    }
    .site-footer {
      border-top: 1px solid var(--border); padding: 48px 24px 32px;
      font-family: Inter, sans-serif; font-size: 14px; color: var(--muted);
      text-align: center; background: rgba(255, 253, 249, 0.6);
    }
    .footer-links { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 16px; }
    .footer-links a { color: var(--muted); text-decoration: none; }
    .footer-links a:hover { color: var(--primary); }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "WritOn Journal",
    "description": "An editorial publication exploring literature, craft, and slower reading.",
    "url": "${origin}/journal"
  }
  </script>
</head>
<body>
  <div class="paper-noise" aria-hidden="true"></div>
  <header class="site-header" role="banner">
    <div class="nav-wrap">
      <a class="brand" href="/" aria-label="WritOn home">
        <img src="/assets/writon-logo.webp" alt="WritOn" width="136" height="46" />
      </a>
      <nav class="nav-links" aria-label="Main Navigation">
        <a href="/">Home</a>
        <a href="/journal" class="active">Journal</a>
        <a href="/updates">Updates</a>
        <a href="/about">About</a>
        <a class="btn-nav-app" href="https://play.google.com/store/apps/details?id=com.ibitvalley.writon" target="_blank" rel="noopener noreferrer">Get App</a>
      </nav>
    </div>
  </header>
  <main role="main">
    <div class="journal-header">
      <div class="eyebrow">Editorial Publication</div>
      <h1>The WritOn Journal</h1>
      <p class="header-desc">Essays on craft, deliberate reading, and the architecture of stillness.</p>
    </div>
    <div class="filter-bar">
      ${filterPills}
    </div>
    <div id="featured-container">
      ${featuredHtml}
    </div>
    <div class="articles-grid">
      ${gridHtml}
    </div>
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/journal">Journal</a>
      <a href="/updates">Updates</a>
      <a href="/about">About</a>
      <a href="/privacy-policy">Privacy Policy</a>
      <a href="/terms.html">Terms</a>
      <a href="/journal/rss.xml">Journal RSS</a>
      <a href="/rss.xml">All RSS</a>
    </div>
    <div>© 2026 WritOn (writon.cc). All rights reserved.</div>
  </footer>
</body>
</html>`;

    cacheHeaders(reply);
    return reply.type('text/html; charset=utf-8').send(html);
  });

  // 2. GET /journal/:slug — Individual Journal Reader (SSR)
  fastify.get('/journal/:slug', async (request, reply) => {
    const { slug } = request.params;
    const origin = requestOrigin(request, config?.publicApiBaseUrl);
    const post = await getPostBySlug(pool, slug);

    if (!post) {
      return reply.code(404).type('text/html; charset=utf-8').send(`
        <!doctype html>
        <html>
        <head><title>Piece Not Found — WritOn Journal</title></head>
        <body style="font-family: Georgia, serif; background: #F7F3EB; text-align: center; padding: 80px 20px;">
          <h1>Piece not found</h1>
          <p style="color: #645C54;">This journal article may have been archived or does not exist.</p>
          <p><a href="/journal" style="color: #B5442A;">Return to Journal</a></p>
        </body>
        </html>
      `);
    }

    const pubDate = new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
    const isoDate = new Date(post.published_at || post.created_at).toISOString();
    const articleUrl = `${origin}/journal/${encodeURIComponent(post.slug)}`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: articleUrl,
      datePublished: isoDate,
      dateModified: post.updated_at ? new Date(post.updated_at).toISOString() : isoDate,
      author: {
        '@type': 'Person',
        name: post.author_name || 'WritOn Editorial',
        ...(post.author_pen_name ? { url: `${origin}/author/${encodeURIComponent(post.author_pen_name)}` } : {})
      },
      publisher: {
        '@type': 'Organization',
        name: 'WritOn',
        url: origin,
        logo: `${origin}/assets/writon_app_icon.png`
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': articleUrl
      }
    };

    const renderedBody = post.content_rendered_html || `<p>${escapeHtml(post.excerpt)}</p>`;

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#F7F3EB" />
  <title>${escapeHtml(post.title)} — WritOn Journal</title>
  <meta name="description" content="${escapeHtml(post.excerpt)}" />
  <link rel="canonical" href="${articleUrl}" />
  <link rel="alternate" type="application/rss+xml" title="WritOn Journal RSS Feed" href="${origin}/journal/rss.xml" />
  <link rel="alternate" type="application/rss+xml" title="WritOn — Stories &amp; Journal" href="${origin}/rss.xml" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="WritOn" />
  <meta property="og:url" content="${articleUrl}" />
  <meta property="og:title" content="${escapeHtml(post.title)} — WritOn Journal" />
  <meta property="og:description" content="${escapeHtml(post.excerpt)}" />
  <meta property="og:image" content="${origin}/assets/hero-banner.webp" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@WritOn_Social" />
  <meta name="twitter:title" content="${escapeHtml(post.title)} — WritOn Journal" />
  <meta name="twitter:description" content="${escapeHtml(post.excerpt)}" />
  <meta name="twitter:image" content="${origin}/assets/hero-banner.webp" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48x48.png?v=2" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png?v=2" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap" rel="stylesheet">
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
  <style>
    :root {
      --bg: #F7F3EB;
      --surface: #FFFDF9;
      --ink: #26211D;
      --muted: #645C54;
      --primary: #B5442A;
      --primary-dark: #98351E;
      --border: #E7DDD1;
      --shadow-sm: 0 2px 8px rgba(38, 33, 29, 0.04);
      --shadow-md: 0 12px 32px rgba(38, 33, 29, 0.08);
      --container: 740px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: Newsreader, Georgia, serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.85;
      font-size: 21px;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }
    .paper-noise {
      position: fixed; inset: 0; pointer-events: none; z-index: -1; opacity: .18;
      background-image: repeating-radial-gradient(circle at 0 0, transparent 0 2px, rgba(80,60,40,.04) 3px 4px);
      background-size: 9px 9px; mix-blend-mode: multiply;
    }
    .site-header {
      position: sticky; top: 0; z-index: 50;
      backdrop-filter: blur(16px);
      background: color-mix(in srgb, var(--bg) 84%, transparent);
      border-bottom: 1px solid rgba(231,221,209,.8);
    }
    .nav-wrap {
      max-width: 1040px; margin: 0 auto; height: 76px;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px;
    }
    .brand img { width: 136px; height: auto; display: block; }
    .nav-links { display: flex; gap: 24px; align-items: center; font-family: Inter, sans-serif; font-size: 14px; font-weight: 500; }
    .nav-links a { color: var(--muted); text-decoration: none; transition: color .2s ease; }
    .nav-links a:hover, .nav-links a.active { color: var(--primary); }
    .btn-nav-app {
      background: linear-gradient(135deg, #D75D38, var(--primary));
      color: #fff !important; font-weight: 600; padding: 8px 18px; border-radius: 999px;
      box-shadow: var(--shadow-sm);
    }
    main { max-width: var(--container); margin: 0 auto; padding: 56px 24px 100px; }
    .article-header { margin-bottom: 40px; border-bottom: 1px solid var(--border); padding-bottom: 32px; }
    .back-link {
      display: inline-flex; align-items: center; gap: 6px;
      font-family: Inter, sans-serif; font-size: 13px; font-weight: 600;
      color: var(--primary); text-decoration: none; margin-bottom: 20px;
    }
    .back-link:hover { text-decoration: underline; }
    .category-badge {
      font-family: Inter, sans-serif; font-size: 12px; font-weight: 700;
      letter-spacing: .12em; text-transform: uppercase; color: var(--primary);
      margin-bottom: 12px;
    }
    h1 {
      font-size: clamp(34px, 5.5vw, 52px); font-weight: 500; line-height: 1.15;
      letter-spacing: -0.025em; color: var(--ink); margin-bottom: 16px;
    }
    .subtitle {
      font-size: 22px; color: var(--muted); font-style: italic; line-height: 1.5;
      margin-bottom: 24px;
    }
    .byline {
      display: flex; align-items: center; gap: 14px;
      font-family: Inter, sans-serif; font-size: 14px; color: var(--muted);
    }
    .author-name { font-weight: 700; color: var(--ink); }
    .article-body {
      font-size: 20px; line-height: 1.85; color: #2E2721; margin-bottom: 64px;
    }
    .article-body p { margin-bottom: 24px; }
    .article-body h2 {
      font-size: 28px; font-weight: 500; margin: 44px 0 16px; color: var(--ink);
      line-height: 1.25;
    }
    .article-body h3 {
      font-size: 22px; font-weight: 600; margin: 36px 0 14px; color: var(--ink);
      line-height: 1.3;
    }
    .article-body ul, .article-body ol {
      padding-left: 28px; margin-bottom: 24px;
    }
    .article-body li { margin-bottom: 10px; }
    .article-body blockquote {
      margin: 32px 0; padding: 20px 28px; border-left: 3px solid var(--primary);
      background: rgba(200, 90, 60, 0.05); border-radius: 0 12px 12px 0;
      font-style: italic; font-size: 21px; color: var(--ink);
    }
    .article-body strong { font-weight: 600; color: var(--ink); }
    .article-body em { font-style: italic; }
    .article-footer-box {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; padding: 36px 32px; margin-top: 48px;
      box-shadow: var(--shadow-sm); text-align: center;
    }
    .article-footer-box h3 { font-size: 22px; font-weight: 500; margin-bottom: 10px; }
    .article-footer-box p { font-size: 16px; color: var(--muted); font-family: Inter, sans-serif; margin-bottom: 20px; }
    .site-footer {
      border-top: 1px solid var(--border); padding: 48px 24px 32px;
      font-family: Inter, sans-serif; font-size: 14px; color: var(--muted);
      text-align: center; background: rgba(255, 253, 249, 0.6);
    }
    .footer-links { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 16px; }
    .footer-links a { color: var(--muted); text-decoration: none; }
    .footer-links a:hover { color: var(--primary); }
  </style>
</head>
<body>
  <div class="paper-noise" aria-hidden="true"></div>
  <header class="site-header" role="banner">
    <div class="nav-wrap">
      <a class="brand" href="/" aria-label="WritOn home">
        <img src="/assets/writon-logo.webp" alt="WritOn" width="136" height="46" />
      </a>
      <nav class="nav-links" aria-label="Main Navigation">
        <a href="/">Home</a>
        <a href="/journal" class="active">Journal</a>
        <a href="/updates">Updates</a>
        <a href="/about">About</a>
        <a class="btn-nav-app" href="https://play.google.com/store/apps/details?id=com.ibitvalley.writon" target="_blank" rel="noopener noreferrer">Get App</a>
      </nav>
    </div>
  </header>
  <main role="main">
    <article id="article-container">
      <header class="article-header">
        <a class="back-link" href="/journal">← Back to Journal</a>
        <div class="category-badge">${escapeHtml(formatCategory(post.category))}</div>
        <h1>${escapeHtml(post.title)}</h1>
        ${post.subtitle ? `<div class="subtitle">${escapeHtml(post.subtitle)}</div>` : ''}
        <div class="byline">
          <span class="author-name">${escapeHtml(post.author_name || 'WritOn Editorial')}</span>
          <span>•</span>
          <span>${pubDate}</span>
          <span>•</span>
          <span>${post.estimated_read_minutes || 3} min read</span>
        </div>
      </header>
      <div class="article-body">
        ${renderedBody}
      </div>
      <div class="article-footer-box">
        <h3>Carry WritOn with you</h3>
        <p>A quiet space for writers, poets, and story readers. Free on Android.</p>
        <a class="btn-nav-app" href="https://play.google.com/store/apps/details?id=com.ibitvalley.writon" target="_blank" rel="noopener noreferrer">
          Get WritOn on Google Play
        </a>
      </div>
    </article>
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/journal">Journal</a>
      <a href="/updates">Updates</a>
      <a href="/about">About</a>
      <a href="/privacy-policy">Privacy Policy</a>
      <a href="/terms.html">Terms</a>
      <a href="/journal/rss.xml">Journal RSS</a>
      <a href="/rss.xml">All RSS</a>
    </div>
    <div>© 2026 WritOn (writon.cc). All rights reserved.</div>
  </footer>
</body>
</html>`;

    cacheHeaders(reply);
    return reply.type('text/html; charset=utf-8').send(html);
  });

  // 3. GET /updates — Product Changelog (SSR)
  fastify.get('/updates', async (request, reply) => {
    const origin = requestOrigin(request, config?.publicApiBaseUrl);
    const updates = await getRecentUpdates(pool, { limit: 50 });

    const timelineItemsHtml = updates.map(u => {
      const pubDate = new Date(u.publishedAt || u.createdAt).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
      const badge = u.version ? `Build ${escapeHtml(u.version)}` : (u.subtitle ? escapeHtml(u.subtitle) : 'Platform');
      const body = u.contentHtml || `<p>${escapeHtml(u.excerpt)}</p>`;
      return `
      <article class="update-item">
        <div class="update-meta">
          <span class="version-badge">${badge}</span>
          <time datetime="${new Date(u.publishedAt || u.createdAt).toISOString().slice(0, 10)}">${pubDate}</time>
        </div>
        <h2 class="update-title">${escapeHtml(u.title)}</h2>
        <div class="update-body">
          ${body}
        </div>
      </article>`;
    }).join('\n');

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#F7F3EB" />
  <title>Product Updates — WritOn</title>
  <meta name="description" content="A calm, reverse-chronological log of changes, refinements, and fixes shipped to WritOn across web and Android." />
  <link rel="canonical" href="${origin}/updates" />
  <link rel="alternate" type="application/rss+xml" title="WritOn Journal RSS Feed" href="${origin}/journal/rss.xml" />
  <link rel="alternate" type="application/rss+xml" title="WritOn — Stories &amp; Journal" href="${origin}/rss.xml" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="WritOn" />
  <meta property="og:url" content="${origin}/updates" />
  <meta property="og:title" content="Product Updates — WritOn" />
  <meta property="og:description" content="A calm, reverse-chronological log of changes, refinements, and fixes shipped to WritOn across web and Android." />
  <meta property="og:image" content="${origin}/assets/hero-banner.webp" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@WritOn_Social" />
  <meta name="twitter:title" content="Product Updates — WritOn" />
  <meta name="twitter:description" content="A calm, reverse-chronological log of changes, refinements, and fixes shipped to WritOn across web and Android." />
  <meta name="twitter:image" content="${origin}/assets/hero-banner.webp" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48x48.png?v=2" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png?v=2" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #F7F3EB;
      --surface: #FFFDF9;
      --surface-hover: #FCF8F2;
      --ink: #26211D;
      --muted: #645C54;
      --primary: #B5442A;
      --primary-dark: #98351E;
      --primary-soft: #F3D5C7;
      --border: #E7DDD1;
      --shadow-sm: 0 2px 8px rgba(38, 33, 29, 0.04);
      --shadow-md: 0 12px 32px rgba(38, 33, 29, 0.08);
      --container: 1040px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: Newsreader, Georgia, serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.7;
      font-size: 19px;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }
    .paper-noise {
      position: fixed; inset: 0; pointer-events: none; z-index: -1; opacity: .18;
      background-image: repeating-radial-gradient(circle at 0 0, transparent 0 2px, rgba(80,60,40,.04) 3px 4px);
      background-size: 9px 9px; mix-blend-mode: multiply;
    }
    .site-header {
      position: sticky; top: 0; z-index: 50;
      backdrop-filter: blur(16px);
      background: color-mix(in srgb, var(--bg) 84%, transparent);
      border-bottom: 1px solid rgba(231,221,209,.8);
    }
    .nav-wrap {
      max-width: var(--container); margin: 0 auto; height: 76px;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px;
    }
    .brand img { width: 136px; height: auto; display: block; }
    .nav-links { display: flex; gap: 24px; align-items: center; font-family: Inter, sans-serif; font-size: 14px; font-weight: 500; }
    .nav-links a { color: var(--muted); text-decoration: none; transition: color .2s ease; }
    .nav-links a:hover, .nav-links a.active { color: var(--primary); }
    .btn-nav-app {
      background: linear-gradient(135deg, #D75D38, var(--primary));
      color: #fff !important; font-weight: 600; padding: 8px 18px; border-radius: 999px;
      box-shadow: var(--shadow-sm);
    }
    main { max-width: 780px; margin: 0 auto; padding: 56px 24px 100px; }
    .updates-header { margin-bottom: 48px; }
    .eyebrow {
      font-family: Inter, sans-serif; font-size: 12px; font-weight: 700;
      letter-spacing: .18em; color: var(--primary); text-transform: uppercase; margin-bottom: 12px;
    }
    h1 {
      font-size: clamp(34px, 5vw, 52px); font-weight: 500; line-height: 1.15;
      letter-spacing: -0.02em; color: var(--ink); margin-bottom: 14px;
    }
    .header-desc { font-size: 20px; color: var(--muted); font-style: italic; margin: 0; }
    .timeline {
      position: relative;
      border-left: 2px solid var(--border);
      margin-left: 12px;
      padding-left: 32px;
    }
    .update-item {
      position: relative;
      margin-bottom: 52px;
    }
    .update-item::before {
      content: "";
      position: absolute;
      left: calc(-32px - 7px);
      top: 6px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--primary);
      border: 3px solid var(--bg);
    }
    .update-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: Inter, sans-serif;
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 10px;
    }
    .version-badge {
      background: var(--primary-soft);
      color: var(--primary-dark);
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
    }
    .update-title {
      font-size: 26px;
      font-weight: 500;
      line-height: 1.25;
      margin: 0 0 12px 0;
      color: var(--ink);
    }
    .update-body {
      font-size: 18px;
      line-height: 1.65;
      color: var(--ink);
    }
    .update-body p { margin-bottom: 12px; }
    .site-footer {
      border-top: 1px solid var(--border); padding: 48px 24px 32px;
      font-family: Inter, sans-serif; font-size: 14px; color: var(--muted);
      text-align: center; background: rgba(255, 253, 249, 0.6);
    }
    .footer-links { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 16px; }
    .footer-links a { color: var(--muted); text-decoration: none; }
    .footer-links a:hover { color: var(--primary); }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "WritOn Product Updates",
    "description": "A calm, factual log of changes, refinements, and fixes shipped across WritOn web and Android.",
    "url": "${origin}/updates"
  }
  </script>
</head>
<body>
  <div class="paper-noise" aria-hidden="true"></div>
  <header class="site-header" role="banner">
    <div class="nav-wrap">
      <a class="brand" href="/" aria-label="WritOn home">
        <img src="/assets/writon-logo.webp" alt="WritOn" width="136" height="46" />
      </a>
      <nav class="nav-links" aria-label="Main Navigation">
        <a href="/">Home</a>
        <a href="/journal">Journal</a>
        <a href="/updates" class="active">Updates</a>
        <a href="/about">About</a>
        <a class="btn-nav-app" href="https://play.google.com/store/apps/details?id=com.ibitvalley.writon" target="_blank" rel="noopener noreferrer">Get App</a>
      </nav>
    </div>
  </header>
  <main role="main">
    <div class="updates-header">
      <div class="eyebrow">Product History</div>
      <h1>Product Updates</h1>
      <p class="header-desc">A calm, chronological record of what we build, refine, and simplify.</p>
    </div>
    <div class="timeline">
      ${timelineItemsHtml}
    </div>
  </main>
  <footer class="site-footer" role="contentinfo">
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/journal">Journal</a>
      <a href="/updates">Updates</a>
      <a href="/about">About</a>
      <a href="/privacy-policy">Privacy Policy</a>
      <a href="/terms.html">Terms</a>
      <a href="/journal/rss.xml">Journal RSS</a>
      <a href="/rss.xml">All RSS</a>
    </div>
    <div>© 2026 WritOn (writon.cc). All rights reserved.</div>
  </footer>
</body>
</html>`;

    cacheHeaders(reply);
    return reply.type('text/html; charset=utf-8').send(html);
  });

  // 4. GET /journal/rss.xml — Dedicated Journal RSS 2.0 Feed
  fastify.get('/journal/rss.xml', async (request, reply) => {
    const origin = requestOrigin(request, config?.publicApiBaseUrl);
    const nowUtc = new Date().toUTCString();

    const res = await pool.query(`
      SELECT
        id, slug, title, subtitle, type, category,
        author_name AS "authorName", excerpt,
        COALESCE(content_rendered_html, '') AS "contentHtml",
        published_at AS "publishedAt"
      FROM public.editorial_posts
      WHERE status = 'published' AND type IN ('journal', 'essay', 'note')
      ORDER BY published_at DESC
      LIMIT 50
    `);

    const itemsXml = res.rows.map(post => {
      const articleUrl = `${origin}/journal/${encodeURIComponent(post.slug)}`;
      const pubDate = post.publishedAt ? new Date(post.publishedAt).toUTCString() : nowUtc;
      const author = post.authorName || 'WritOn Editorial';
      const category = formatCategory(post.category);
      const summary = post.excerpt || post.title;
      const htmlContent = post.contentHtml || `<p>${summary}</p>`;

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(articleUrl)}</link>
      <guid isPermaLink="true">${escapeXml(articleUrl)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <dc:creator>${escapeXml(author)}</dc:creator>
      <category>${escapeXml(category)}</category>
      <description>${escapeXml(summary)}</description>
      <content:encoded><![CDATA[${String(htmlContent).replace(/\]\]>/g, ']]]]><![CDATA[>')}]]></content:encoded>
    </item>`;
    }).join('\n');

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>The WritOn Journal</title>
    <link>${origin}/journal</link>
    <description>Essays on craft, deliberate reading, and the architecture of stillness from WritOn.</description>
    <language>en-us</language>
    <lastBuildDate>${nowUtc}</lastBuildDate>
    <atom:link href="${origin}/journal/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${origin}/assets/writon_app_icon.png</url>
      <title>WritOn Journal</title>
      <link>${origin}/journal</link>
    </image>
${itemsXml}
  </channel>
</rss>`;

    return reply
      .header('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600')
      .type('application/rss+xml; charset=utf-8')
      .send(rssXml);
  });

  // --- Public APIs ---

  fastify.get('/api/v1/journal', async (request, reply) => {
    const { category, type, page = 1, limit = 10 } = request.query;
    const result = await getPublishedJournalPosts(pool, {
      category,
      type,
      page: parseInt(page, 10) || 1,
      limit: Math.min(50, parseInt(limit, 10) || 10)
    });
    return result;
  });

  fastify.get('/api/v1/journal/:slug', async (request, reply) => {
    const { slug } = request.params;
    const post = await getPostBySlug(pool, slug);
    if (!post) {
      return reply.code(404).send({ error: 'Journal post not found' });
    }
    return { post };
  });

  fastify.get('/api/v1/updates', async (request, reply) => {
    const { limit = 20 } = request.query;
    const updates = await getRecentUpdates(pool, {
      limit: Math.min(100, parseInt(limit, 10) || 20)
    });
    return { updates };
  });

  // --- Protected Internal Automation APIs ---

  const requireAdminAuth = async (request, reply) => {
    if (process.env.NODE_ENV === 'development' && !request.headers.authorization && !request.headers['x-admin-key']) {
      return;
    }
    const adminSecret = process.env.ADMIN_SECRET_KEY || config?.adminSecretKey;
    const headerKey = request.headers['x-admin-key'];
    const bearer = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.substring(7)
      : null;

    if (adminSecret && (headerKey === adminSecret || bearer === adminSecret)) {
      return;
    }
    return reply.code(403).send({ error: 'Unauthorized editorial access' });
  };

  // Ingest release event (Idempotent)
  fastify.post('/internal/editorial/events/release', { preHandler: requireAdminAuth }, async (request, reply) => {
    const parsed = releaseEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid release event payload',
        details: parsed.error.flatten().fieldErrors
      });
    }

    try {
      const result = await ingestReleaseEvent(pool, parsed.data);
      return result;
    } catch (err) {
      request.log.error({ err }, 'Failed to ingest release event');
      return reply.code(500).send({ error: err.message });
    }
  });

  // Run weekly editorial evaluation
  fastify.post('/internal/editorial/run/weekly', { preHandler: requireAdminAuth }, async (request, reply) => {
    const { force = false } = request.body || {};
    try {
      const result = await runWeeklyEditorial(pool, { force });
      return result;
    } catch (err) {
      request.log.error({ err }, 'Failed to run weekly editorial evaluation');
      return reply.code(500).send({ error: err.message });
    }
  });
}
