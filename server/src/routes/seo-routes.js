import { PUBLISHABLE_STORY_CATEGORIES } from '../domain/story-categories.js';

function escapeXml(unsafe) {
  return String(unsafe ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function requestOrigin(request, configuredBaseUrl) {
  try {
    if (configuredBaseUrl) return new URL(configuredBaseUrl).origin;
  } catch {
    // Fall back to request host
  }
  const forwardedProtocol = String(request.headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
  const forwardedHost = String(request.headers['x-forwarded-host'] ?? '').split(',')[0].trim();
  const protocol = forwardedProtocol || request.protocol || 'https';
  const host = forwardedHost || request.headers.host;
  return `${protocol}://${host}`;
}

export function renderDiscoveryDeckHtml({ stories, totalCount, category, origin, playStoreUrl, hasMore }) {
  const normalizedCategory = PUBLISHABLE_STORY_CATEGORIES.find(
    (c) => c.toLowerCase() === String(category || '').trim().toLowerCase()
  ) || null;
  const pageTitle = normalizedCategory ? `${normalizedCategory} Stories & Essays — WritOn` : 'Discover stories, thinking & expertise — WritOn';
  const pageDescription = 'Curated independent essays, craft reflections, poetry, and ideas on modern culture. Read 700+ literary stories on WritOn or get the app on Google Play.';
  const canonicalUrl = normalizedCategory ? `${origin}/stories?category=${encodeURIComponent(normalizedCategory)}` : `${origin}/stories`;
  const initialCategory = normalizedCategory ? normalizedCategory.toLowerCase() : '';

  const categories = PUBLISHABLE_STORY_CATEGORIES;

  // Schema.org ItemList Structured Data for Google Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description: pageDescription,
    url: canonicalUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: stories.length,
      itemListElement: stories.map((s, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'BlogPosting',
          headline: s.title,
          url: `${origin}/stories/${encodeURIComponent(s.slug)}`,
          description: s.summary || s.title,
          datePublished: new Date(s.publishedAt).toISOString(),
          author: {
            '@type': 'Person',
            name: s.authorName,
          },
        },
      })),
    },
    publisher: {
      '@type': 'Organization',
      name: 'WritOn',
      url: origin,
      logo: `${origin}/stories/share.css`,
    },
  };

  const ogLocale = 'en_US';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeXml(pageTitle)}</title>
  <meta name="description" content="${escapeXml(pageDescription)}">
  <link rel="canonical" href="${escapeXml(canonicalUrl)}">
  <link rel="alternate" hreflang="en" href="${canonicalUrl}">
  <link rel="alternate" hreflang="x-default" href="${canonicalUrl}">
  <link rel="alternate" type="application/rss+xml" title="WritOn — Stories &amp; Essays" href="${origin}/feed.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap">
  <link rel="preload" as="image" href="/assets/favicon-48x48.png">
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2">
  <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico?v=2">
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48x48.png?v=2">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png?v=2">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png?v=2">
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png?v=2">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png?v=2">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="WritOn">
  <meta property="og:url" content="${escapeXml(canonicalUrl)}">
  <meta property="og:title" content="${escapeXml(pageTitle)}">
  <meta property="og:description" content="${escapeXml(pageDescription)}">
  <meta property="og:image" content="${origin}/assets/hero-banner.webp">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="WritOn — Discover stories, thinking &amp; expertise">
  <meta property="og:locale" content="${escapeXml(ogLocale)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeXml(pageTitle)}">
  <meta name="twitter:description" content="${escapeXml(pageDescription)}">
  <meta name="twitter:image" content="${origin}/assets/hero-banner.webp">
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
  <style>
    :root {
      --paper: #FAF7F2;
      --card-bg: #FFFFFF;
      --ink: #141618;
      --muted: #6B665F;
      --rust: #E75A2A;
      --rust-light: #FFF0EB;
      --line: #EBE5DB;
      --pill-bg: #F0EAE1;
      --pill-hover: #E4DBD0;
      --shadow-sm: 0 2px 8px rgba(20, 22, 24, 0.04);
      --shadow-md: 0 8px 24px rgba(20, 22, 24, 0.07);
      --shadow-hover: 0 12px 32px rgba(231, 90, 42, 0.12);
      --font-serif: "Newsreader", Georgia, "Times New Roman", serif;
      --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--paper);
      color: var(--ink);
      font-family: var(--font-sans);
      -webkit-font-smoothing: antialiased;
      line-height: 1.5;
      padding-bottom: 90px;
    }

    a { color: inherit; text-decoration: none; }

    /* Top Navigation Bar */
    header.site-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(250, 247, 242, 0.94);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--line);
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 100%;
    }
    .header-inner {
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-logo {
      font-family: var(--font-serif);
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--ink);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .brand-logo span { color: var(--rust); }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .app-badge-btn {
      background: var(--ink);
      color: #FFFDF9;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 999px;
      transition: all 0.2s ease;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .app-badge-btn:hover {
      background: var(--rust);
      transform: translateY(-1px);
    }

    /* Hero Section */
    .hero-container {
      max-width: 1100px;
      margin: 48px auto 32px;
      padding: 0 20px;
    }
    .hero-title {
      font-family: var(--font-serif);
      font-size: clamp(34px, 5.5vw, 56px);
      font-weight: 600;
      line-height: 1.12;
      letter-spacing: -0.025em;
      color: var(--ink);
      max-width: 780px;
      margin-bottom: 16px;
    }
    .hero-title .highlight {
      color: var(--rust);
      font-style: normal;
    }
    .hero-subtitle {
      font-size: clamp(16px, 2vw, 20px);
      color: var(--muted);
      font-family: var(--font-serif);
      line-height: 1.5;
      max-width: 640px;
      margin-bottom: 32px;
    }

    /* Category Filter Pills */
    .filter-pills-bar {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 8px;
      scrollbar-width: none;
      -ms-overflow-style: none;
      margin-bottom: 36px;
    }
    .filter-pills-bar::-webkit-scrollbar { display: none; }
    .pill {
      font-size: 14px;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 999px;
      background: var(--pill-bg);
      color: var(--muted);
      white-space: nowrap;
      transition: all 0.2s ease;
      border: 1px solid transparent;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .pill:hover {
      background: var(--pill-hover);
      color: var(--ink);
    }
    .pill.active {
      background: var(--rust);
      color: #FFFFFF;
    }

    /* Discovery Card Deck Layout */
    .discovery-layout {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .story-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }

    /* Individual Story Card (Matching App Snapshot with Cover Image) */
    .story-card {
      background: var(--card-bg);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: var(--shadow-sm);
      transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }
    .card-cover-wrap {
      width: 100%;
      height: 180px;
      overflow: hidden;
      position: relative;
      background: #f0e6dd;
    }
    .card-cover-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.35s ease;
    }
    .story-card:hover .card-cover-img {
      transform: scale(1.05);
    }
    .card-body {
      padding: 20px 22px 18px;
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
    }
    .story-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-hover);
      border-color: rgba(231, 90, 42, 0.35);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .card-category {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--rust);
      background: var(--rust-light);
      padding: 4px 10px;
      border-radius: 6px;
    }
    .card-readtime {
      font-size: 12px;
      color: var(--muted);
      font-weight: 500;
    }
    .card-title {
      font-family: var(--font-serif);
      font-size: 21px;
      font-weight: 600;
      line-height: 1.28;
      color: var(--ink);
      margin-bottom: 12px;
      letter-spacing: -0.01em;
    }
    .card-title a {
      color: inherit;
    }
    .card-title a:hover {
      color: var(--rust);
    }
    .card-summary {
      font-size: 14px;
      line-height: 1.55;
      color: #4A4641;
      margin-bottom: 22px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex-grow: 1;
    }
    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      margin-top: auto;
    }
    .card-author-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .card-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--pill-bg);
      color: var(--rust);
      display: grid;
      place-items: center;
      font-weight: 700;
      font-size: 13px;
      font-family: var(--font-serif);
      flex-shrink: 0;
    }
    .card-author-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      line-height: 1.2;
    }
    .card-author-handle {
      font-size: 11px;
      color: var(--muted);
    }
    .card-arrow-btn {
      width: 44px;
      height: 44px;
      min-height: 44px;
      min-width: 44px;
      border-radius: 50%;
      background: var(--pill-bg);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--ink);
      font-size: 16px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .story-card:hover .card-arrow-btn {
      background: var(--rust);
      color: #FFFFFF;
      transform: translateX(2px);
    }

    /* App Spotlight Card (Snapshot companion) */
    .app-spotlight-card {
      background: linear-gradient(135deg, #1C1E20 0%, #0F1011 100%);
      color: #FAF7F2;
      border-radius: 20px;
      padding: 36px 32px;
      margin: 40px auto 60px;
      max-width: 1100px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      box-shadow: var(--shadow-md);
    }
    .spotlight-left h3 {
      font-family: var(--font-serif);
      font-size: clamp(24px, 3.5vw, 34px);
      font-weight: 600;
      margin-bottom: 8px;
    }
    .spotlight-left h3 span { color: #FF7E54; }
    .spotlight-left p {
      font-size: 16px;
      color: #B5AEA4;
      max-width: 540px;
      line-height: 1.5;
    }
    .spotlight-cta-btn {
      background: var(--rust);
      color: #FFFFFF;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 28px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .spotlight-cta-btn:hover {
      background: #FF6836;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(231, 90, 42, 0.3);
    }

    /* Lazy Loader Sentinel & Controls */
    .lazy-loader-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 40px 0 60px;
      gap: 16px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--line);
      border-top-color: var(--rust);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: none;
    }
    .spinner.visible { display: block; }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .load-more-btn {
      background: var(--card-bg);
      border: 1px solid var(--line);
      padding: 12px 32px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 999px;
      cursor: pointer;
      color: var(--ink);
      box-shadow: var(--shadow-sm);
      transition: all 0.2s ease;
    }
    .load-more-btn:hover {
      background: var(--pill-bg);
      border-color: var(--muted);
    }
    .end-of-deck-msg {
      font-family: var(--font-serif);
      font-size: 17px;
      font-style: italic;
      color: var(--muted);
      display: none;
    }

    /* Sticky Mobile Conversion Bar */
    .sticky-mobile-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(20, 22, 24, 0.95);
      backdrop-filter: blur(10px);
      color: #FAF7F2;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 999;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .sticky-text {
      font-size: 13px;
      font-weight: 500;
      color: #E2DBD0;
    }
    .sticky-btn {
      background: var(--rust);
      color: #FFF;
      font-size: 13px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 999px;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    @media (min-width: 768px) {
      .sticky-mobile-bar { display: none; }
    }
  </style>
</head>
<body>
  <!-- Top Navigation Header -->
  <header class="site-header" data-nosnippet>
    <div class="header-inner">
      <a href="/stories" class="brand-logo">Writ<span>On</span></a>
      <div class="header-actions">
        <a href="${escapeXml(playStoreUrl)}?utm_source=google_search&utm_medium=web_header&utm_campaign=stories_deck" target="_blank" rel="noopener" class="app-badge-btn">
          📲 Get the App
        </a>
      </div>
    </div>
  </header>

  <main class="discovery-layout">
    <!-- Hero Banner (Matches App Screen) -->
    <div class="hero-container">
      <h1 class="hero-title">Discover stories,<br><span class="highlight">thinking &amp; expertise</span></h1>
      <p class="hero-subtitle">Curated independent essays, craft reflections, and ideas on modern culture.</p>
      
      <!-- Category Filter Pills -->
      <nav class="filter-pills-bar" aria-label="Story categories">
        <a href="/stories" class="pill ${!normalizedCategory ? 'active' : ''}">All Stories</a>
        ${categories.map(c => `
          <a href="/stories?category=${encodeURIComponent(c)}" class="pill ${normalizedCategory?.toLowerCase() === c.toLowerCase() ? 'active' : ''}">${escapeXml(c)}</a>
        `).join('')}
      </nav>
    </div>

    <!-- 20 Initial Server-Rendered Story Cards (Crawlable for Googlebot) -->
    <section class="story-grid" id="stories-grid" aria-label="Stories Feed">
      ${stories.map(s => {
        const initials = String(s.authorName || 'W').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
        const categoryFallbacks = {
          Tech: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
          Essays: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80',
          Poetry: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800&auto=format&fit=crop&q=80',
          Shayari: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80',
          Humour: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&auto=format&fit=crop&q=80',
          Culture: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
          'Short Stories': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
          Philosophy: 'https://images.unsplash.com/photo-1507842229451-7f01be7f612c?w=800&auto=format&fit=crop&q=80'
        };
        const coverUrl = s.coverImage || categoryFallbacks[s.category] || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80';

        return `
        <article class="story-card" data-story-slug="${escapeXml(s.slug)}">
          <div class="card-cover-wrap">
            <img src="${escapeXml(coverUrl)}" alt="Cover artwork for ${escapeXml(s.title)}" class="card-cover-img" loading="lazy" decoding="async" />
          </div>
          <div class="card-body">
            <div class="card-top">
              <span class="card-category">${escapeXml(s.category || 'Story')}</span>
              <span class="card-readtime">${s.readingTimeMin ? `${s.readingTimeMin} min read` : '2 min read'}</span>
            </div>
            <h2 class="card-title">
              <a href="/stories/${encodeURIComponent(s.slug)}" title="${escapeXml(s.title)} — WritOn">${escapeXml(s.title)}</a>
            </h2>
            <p class="card-summary">${escapeXml(s.summary || s.title)}</p>
            <div class="card-bottom">
              <div class="card-author-info">
                <div class="card-avatar">${escapeXml(initials || 'W')}</div>
                <div>
                  <div class="card-author-name">${escapeXml(s.authorName)}</div>
                  <div class="card-author-handle">@${escapeXml(s.authorPenName)}</div>
                </div>
              </div>
              <a href="/stories/${encodeURIComponent(s.slug)}" class="card-arrow-btn" aria-label="Read story: ${escapeXml(s.title)} — WritOn" title="${escapeXml(s.title)} — WritOn">
                &rarr;
              </a>
            </div>
          </div>
        </article>`;
      }).join('')}
    </section>

    <!-- App Spotlight Banner (Matching secondary card in snapshot) -->
    <aside class="app-spotlight-card" data-nosnippet>
      <div class="spotlight-left">
        <h3>Find your voice. <span>Publish today.</span></h3>
        <p>Get distraction-free offline reading, 3-minute swipeable card decks, dark mode, and connect with fellow essayists and poets.</p>
      </div>
      <div>
        <a href="${escapeXml(playStoreUrl)}?utm_source=google_search&utm_medium=spotlight_banner&utm_campaign=stories_deck" target="_blank" rel="noopener" class="spotlight-cta-btn">
          Download on Google Play
        </a>
      </div>
    </aside>

    <!-- Infinite Scroll Lazy Loader Section -->
    <div class="lazy-loader-section" data-nosnippet>
      <div class="spinner" id="spinner" aria-label="Loading more stories..."></div>
      <button class="load-more-btn" id="load-more-btn" ${!hasMore ? 'style="display:none;"' : ''}>Load More Stories</button>
      <p class="end-of-deck-msg" id="end-of-deck-msg" ${!hasMore ? 'style="display:block;"' : ''}>You’ve reached the end of the daily deck &bull; Words worth remembering.</p>
    </div>
  </main>

  <!-- Sticky Conversion Bar for Mobile Browsers -->
  <div class="sticky-mobile-bar" data-nosnippet>
    <div class="sticky-text">📖 Read smoothly in the WritOn app</div>
    <a href="${escapeXml(playStoreUrl)}?utm_source=google_search&utm_medium=sticky_bar&utm_campaign=stories_deck" target="_blank" rel="noopener" class="sticky-btn">Open App</a>
  </div>

  <!-- High-Performance Vanilla JS Lazy Loading Client -->
  <script>
    (function() {
      let currentPage = 1;
      let isLoading = false;
      let hasMoreStories = ${hasMore ? 'true' : 'false'};
      const currentCategory = ${JSON.stringify(normalizedCategory || '')};
      const grid = document.getElementById('stories-grid');
      const spinner = document.getElementById('spinner');
      const loadMoreBtn = document.getElementById('load-more-btn');
      const endMsg = document.getElementById('end-of-deck-msg');

      async function fetchNextPage() {
        if (isLoading || !hasMoreStories) return;
        isLoading = true;
        spinner.classList.add('visible');
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';

        currentPage++;
        try {
          let url = '/api/v1/posts?page=' + currentPage + '&limit=20';
          if (currentCategory) {
            url += '&category=' + encodeURIComponent(currentCategory);
          }

          const res = await fetch(url);
          const data = await res.json();
          const posts = data.posts || [];

          if (posts.length === 0) {
            hasMoreStories = false;
            if (endMsg) endMsg.style.display = 'block';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
          } else {
            posts.forEach(function(s) {
              const card = document.createElement('article');
              card.className = 'story-card';
              card.setAttribute('data-story-slug', s.slug);
              
              const name = s.author?.fullName || s.author?.penName || 'Writer';
              const pen = s.author?.penName || 'writon';
              const initials = (name).trim().split(/\\s+/).slice(0, 2).map(function(p) { return p[0] ? p[0].toUpperCase() : ''; }).join('');
              const categoryBadge = s.category || 'Story';
              const readTime = (s.readingTimeMin || 2) + ' min read';
              const summary = s.summary || s.title;

              const coverUrl = s.coverImage || s.cover_image_url || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80';

              card.innerHTML = 
                '<div class=\"card-cover-wrap\">' +
                  '<img src=\"' + escapeHtml(coverUrl) + '\" alt=\"Cover artwork for ' + escapeHtml(s.title) + '\" class=\"card-cover-img\" loading=\"lazy\" decoding=\"async\" />' +
                '</div>' +
                '<div class=\"card-body\">' +
                  '<div class=\"card-top\">' +
                    '<span class=\"card-category\">' + escapeHtml(categoryBadge) + '</span>' +
                    '<span class=\"card-readtime\">' + escapeHtml(readTime) + '</span>' +
                  '</div>' +
                  '<h2 class=\"card-title\">' +
                    '<a href=\"/stories/' + encodeURIComponent(s.slug) + '\" title=\"' + escapeHtml(s.title) + ' — WritOn\">' + escapeHtml(s.title) + '</a>' +
                  '</h2>' +
                  '<p class=\"card-summary\">' + escapeHtml(summary) + '</p>' +
                  '<div class=\"card-bottom\">' +
                    '<div class=\"card-author-info\">' +
                      '<div class=\"card-avatar\">' + escapeHtml(initials || 'W') + '</div>' +
                      '<div>' +
                        '<div class=\"card-author-name\">' + escapeHtml(name) + '</div>' +
                        '<div class=\"card-author-handle\">@' + escapeHtml(pen) + '</div>' +
                      '</div>' +
                    '</div>' +
                    '<a href=\"/stories/' + encodeURIComponent(s.slug) + '\" class=\"card-arrow-btn\" aria-label=\"Read story: ' + escapeHtml(s.title) + ' — WritOn\" title=\"' + escapeHtml(s.title) + ' — WritOn\">&rarr;</a>' +
                  '</div>' +
                '</div>';
              grid.appendChild(card);
            });

            hasMoreStories = data.pagination?.hasMore ?? (posts.length === 20);
            if (!hasMoreStories) {
              if (endMsg) endMsg.style.display = 'block';
              if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            } else if (loadMoreBtn) {
              loadMoreBtn.style.display = 'block';
            }
          }
        } catch (err) {
          console.error('Failed to lazy load stories:', err);
          if (loadMoreBtn) loadMoreBtn.style.display = 'block';
        } finally {
          isLoading = false;
          spinner.classList.remove('visible');
        }
      }

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\"/g, '&quot;');
      }

      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', fetchNextPage);
      }

      // Auto infinite scroll when nearing the bottom
      if ('IntersectionObserver' in window && spinner) {
        const observer = new IntersectionObserver(function(entries) {
          if (entries[0].isIntersecting && hasMoreStories && !isLoading) {
            fetchNextPage();
          }
        }, { rootMargin: '400px' });
        observer.observe(spinner);
      }
    })();
  </script>
</body>
</html>`;
}

export async function seoRoutes(fastify, { config, database }) {
  // 1. Robots.txt Endpoint
  fastify.get('/robots.txt', async (request, reply) => {
    const origin = requestOrigin(request, config.publicApiBaseUrl);
    const content = [
      'User-agent: *',
      'Allow: /',
      'Allow: /stories',
      'Allow: /stories/*',
      'Allow: /sitemap.xml',
      'Disallow: /api/',
      'Disallow: /admin',
      '',
      `Sitemap: ${origin}/sitemap.xml`,
      `Sitemap: ${origin}/feed.xml`
    ].join('\n');

    return reply
      .header('Cache-Control', 'public, max-age=86400')
      .type('text/plain; charset=utf-8')
      .send(content);
  });

  // Google Site Verification File Handler
  fastify.get('/google422d5cef1d4bc150.html', async (_request, reply) => {
    return reply
      .header('Cache-Control', 'public, max-age=86400')
      .type('text/html; charset=utf-8')
      .send('google-site-verification: google422d5cef1d4bc150.html');
  });

  // Generic Google Site Verification wildcard handler for any Google Search Console token
  fastify.get('/google:code.html', async (request, reply) => {
    const code = String(request.params.code || '').replace(/[^a-zA-Z0-9_-]/g, '');
    return reply
      .header('Cache-Control', 'public, max-age=86400')
      .type('text/html; charset=utf-8')
      .send(`google-site-verification: google${code}.html`);
  });

  // 2. Dynamic XML Sitemap Endpoint
  fastify.get('/sitemap.xml', async (request, reply) => {
    const origin = requestOrigin(request, config.publicApiBaseUrl);
    
    // Fetch all published public stories
    const result = await database.query(`
      select
        p.slug,
        p.title,
        p.summary,
        p.cover_image_url as "coverImage",
        coalesce(p.updated_at, p.published_at, p.created_at) as "lastmod"
      from public.posts p
      where p.status = 'published' and p.is_public = true and p.slug is not null
      order by coalesce(p.published_at, p.created_at) desc
      limit 5000
    `);

    const staticUrls = [
      {
        loc: `${origin}/`,
        priority: '1.0',
        changefreq: 'daily',
        image: {
          loc: `${origin}/assets/writon_wordmark.png`,
          title: 'WritOn — Discover stories, thinking & expertise'
        }
      },
      {
        loc: `${origin}/stories`,
        priority: '0.9',
        changefreq: 'hourly',
        image: {
          loc: `${origin}/assets/writon_app_icon.png`,
          title: 'WritOn Stories & Essays'
        }
      }
    ];

    const categories = PUBLISHABLE_STORY_CATEGORIES;
    const categoryUrls = categories.map(cat => ({
      loc: `${origin}/stories?category=${encodeURIComponent(cat)}`,
      priority: '0.7',
      changefreq: 'daily'
    }));

    const storyUrls = result.rows.map(row => ({
      loc: `${origin}/stories/${encodeURIComponent(row.slug)}`,
      lastmod: new Date(row.lastmod).toISOString(),
      priority: '0.8',
      changefreq: 'weekly',
      image: row.coverImage ? {
        loc: row.coverImage,
        title: row.title || 'WritOn Story',
        caption: row.summary || ''
      } : null
    }));

    const allUrls = [...staticUrls, ...categoryUrls, ...storyUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allUrls.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq || 'weekly'}</changefreq>
    <priority>${u.priority || '0.5'}</priority>${u.image ? `
    <image:image>
      <image:loc>${escapeXml(u.image.loc)}</image:loc>
      <image:title>${escapeXml(u.image.title)}</image:title>${u.image.caption ? `
      <image:caption>${escapeXml(u.image.caption)}</image:caption>` : ''}
    </image:image>` : ''}
  </url>`).join('\n')}
</urlset>`;

    return reply
      .header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
      .type('application/xml; charset=utf-8')
      .send(xml);
  });

  // 3. Dynamic RSS 2.0 / Atom Feed Endpoint (/feed.xml and /rss.xml)
  const rssHandler = async (request, reply) => {
    const origin = requestOrigin(request, config.publicApiBaseUrl);
    const nowUtc = new Date().toUTCString();

    const result = await database.query(`
      select
        p.title,
        p.slug,
        p.summary,
        p.category,
        p.cover_image_url as "coverImage",
        coalesce(p.published_at, p.created_at) as "publishedAt",
        author.full_name as "authorName",
        author.pen_name as "authorPenName"
      from public.posts p
      inner join public.profiles author on author.id = p.author_id
      where p.status = 'published' and p.is_public = true and p.slug is not null
      order by coalesce(p.published_at, p.created_at) desc
      limit 50
    `);

    const itemsXml = result.rows.map(post => {
      const storyUrl = `${origin}/stories/${encodeURIComponent(post.slug)}`;
      const pubDate = post.publishedAt ? new Date(post.publishedAt).toUTCString() : nowUtc;
      const author = post.authorName || post.authorPenName || 'WritOn Writer';
      const category = post.category || 'Essays';
      const summary = post.summary || post.title;
      const coverUrl = post.coverImage || '';
      let mediaTag = '';
      if (coverUrl) {
        mediaTag = `\n      <media:content url="${escapeXml(coverUrl)}" medium="image" />`;
      }

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(storyUrl)}</link>
      <guid isPermaLink="true">${escapeXml(storyUrl)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <dc:creator>${escapeXml(author)}</dc:creator>
      <category>${escapeXml(category)}</category>
      <description>${escapeXml(summary)}</description>${mediaTag}
    </item>`;
    }).join('\n');

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>WritOn — Stories, Thinking &amp; Independent Essays</title>
    <link>${origin}/stories</link>
    <description>Curated independent essays, craft reflections, poetry, and ideas on modern culture. Read 700+ literary stories on WritOn.</description>
    <language>en-us</language>
    <lastBuildDate>${nowUtc}</lastBuildDate>
    <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${origin}/assets/writon_app_icon.png</url>
      <title>WritOn</title>
      <link>${origin}/stories</link>
    </image>
${itemsXml}
  </channel>
</rss>`;

    return reply
      .header('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600')
      .type('application/rss+xml; charset=utf-8')
      .send(rssXml);
  };

  fastify.get('/feed.xml', rssHandler);
  fastify.get('/rss.xml', rssHandler);

  // 4. High-Performance Crawlable Stories Discovery Deck (/stories)
  fastify.get('/stories', async (request, reply) => {
    const legacyStoryId = String(request.query?.storyId || request.query?.id || '').trim();
    if (legacyStoryId) {
      const storyLookup = await database.query(
        `select slug from public.posts where (id::text = $1 or slug = $1) and status = 'published' and is_public = true limit 1`,
        [legacyStoryId]
      );
      if (storyLookup.rowCount > 0 && storyLookup.rows[0]?.slug) {
        return reply.code(301).header('Location', `/stories/${encodeURIComponent(storyLookup.rows[0].slug)}`).send();
      }
      return reply.code(404).type('text/html; charset=utf-8').send(
        '<!doctype html><html><head><title>Story not found — WritOn</title></head><body><main><h1>Story not found</h1><p>This story may no longer be available.</p></main></body></html>'
      );
    }

    const origin = requestOrigin(request, config.publicApiBaseUrl);
    const rawCategory = typeof request.query?.category === 'string' ? request.query.category.trim() : null;
    const category = PUBLISHABLE_STORY_CATEGORIES.find(
      (c) => c.toLowerCase() === String(rawCategory || '').toLowerCase()
    ) || null;

    // Fetch initial 20 stories + 1 extra to determine hasMore
    const result = await database.query(`
      select
        p.title,
        p.slug,
        p.summary,
        p.category,
        p.cover_image_url as "coverImage",
        p.reading_time_min as "readingTimeMin",
        p.likes_count as "likesCount",
        p.comments_count as "commentsCount",
        coalesce(p.published_at, p.created_at) as "publishedAt",
        author.full_name as "authorName",
        author.pen_name as "authorPenName"
      from public.posts p
      inner join public.profiles author on author.id = p.author_id
      where p.status = 'published' and p.is_public = true and p.slug is not null
        and ($1::text is null or lower(p.category) = lower($1))
      order by coalesce(p.published_at, p.created_at) desc
      limit 21
    `, [category]);

    const playStoreUrl = config.playStoreAppUrl || 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon';
    const stories = result.rows.slice(0, 20);
    const hasMore = result.rows.length > 20;

    const html = renderDiscoveryDeckHtml({
      stories,
      totalCount: result.rows.length,
      category,
      origin,
      playStoreUrl,
      hasMore,
    });

    return reply
      .header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
      .type('text/html; charset=utf-8')
      .send(html);
  });
}
