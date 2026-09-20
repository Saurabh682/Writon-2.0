import fs from 'node:fs';
import path from 'node:path';

const postsPath = path.resolve('public/journal/posts-data.json');
const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));

const categoryMap = {
  'inside-writon': 'Inside WritOn',
  'building-writon': 'Building WritOn',
  'writing-reading': 'Writing & Reading',
  'community': 'Community',
  'writon-updates': 'Updates'
};

function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 1. Build Featured and Grid HTML
const featuredPost = posts[0];
const featuredPubDate = new Date(featuredPost.published_at).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric'
});

const featuredHtml = `
      <a class="featured-card" data-category="${featuredPost.category}" href="/journal/${encodeURIComponent(featuredPost.slug)}">
        <span class="featured-tag">★ Featured Essay · ${categoryMap[featuredPost.category] || featuredPost.category}</span>
        <h2 class="featured-title">${escapeHtml(featuredPost.title)}</h2>
        <p class="featured-excerpt">${escapeHtml(featuredPost.excerpt)}</p>
        <div class="meta-row">
          <span>${escapeHtml(featuredPost.author_name || 'WritOn Editorial')}</span>
          <span class="bullet">•</span>
          <span>${featuredPubDate}</span>
          <span class="bullet">•</span>
          <span>${featuredPost.estimated_read_minutes || 3} min read</span>
        </div>
      </a>`;

const gridHtml = posts.map(post => {
  const pubDate = new Date(post.published_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
  return `
      <a class="article-card" data-category="${post.category}" href="/journal/${encodeURIComponent(post.slug)}">
        <div class="card-top">
          <div class="card-category">${categoryMap[post.category] || post.category}</div>
          <h3 class="card-title">${escapeHtml(post.title)}</h3>
          <p class="card-excerpt">${escapeHtml(post.excerpt)}</p>
        </div>
        <div class="meta-row">
          <span>${pubDate}</span>
          <span class="bullet">•</span>
          <span>${post.estimated_read_minutes || 3} min read</span>
        </div>
      </a>`;
}).join('\n');

// 2. Pure Clean public/journal/index.html
const cleanJournalIndexHtml = `<!doctype html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-L3H0RQ5ZQY"></script>
  <script>
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      window['ga-disable-G-L3H0RQ5ZQY'] = true;
    }
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-L3H0RQ5ZQY');
  </script>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#F7F3EB" />

  <title>WritOn Journal — Essays, Notes &amp; Reflections</title>
  <meta name="description" content="An editorial, reading-first journal exploring literature, craft, the philosophy of slow reading, and behind-the-scenes building of WritOn." />
  <link rel="canonical" href="https://writon.cc/journal" />
  <link rel="alternate" type="application/rss+xml" title="WritOn — Stories &amp; Journal" href="https://writon.cc/rss.xml" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="WritOn" />
  <meta property="og:url" content="https://writon.cc/journal" />
  <meta property="og:title" content="WritOn Journal — Essays, Notes &amp; Reflections" />
  <meta property="og:description" content="An editorial publication dedicated to craft, quiet reading, and the building of WritOn." />
  <meta property="og:image" content="https://writon.cc/assets/hero-banner.webp" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@WritOn_Social" />
  <meta name="twitter:title" content="WritOn Journal — Essays, Notes &amp; Reflections" />
  <meta name="twitter:description" content="An editorial publication dedicated to craft, quiet reading, and the building of WritOn." />
  <meta name="twitter:image" content="https://writon.cc/assets/hero-banner.webp" />

  <!-- Favicons -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48x48.png?v=2" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png?v=2" />

  <!-- Fonts -->
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

    /* Category Filter Tabs */
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

    /* Featured Article Card */
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
      font-size: 20px; color: var(--muted); line-height: 1.6; margin-bottom: 24px;
    }
    .meta-row {
      display: flex; align-items: center; gap: 12px;
      font-family: Inter, sans-serif; font-size: 13px; color: var(--muted);
    }
    .bullet { opacity: .6; }

    /* Articles Grid */
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

    /* Pagination */
    .pagination {
      margin-top: 64px; display: flex; justify-content: center; gap: 12px;
      font-family: Inter, sans-serif; font-size: 14px;
    }
    .page-btn {
      padding: 8px 18px; border-radius: 999px; border: 1px solid var(--border);
      background: var(--surface); color: var(--muted); text-decoration: none;
      font-weight: 600; transition: all .2s ease;
    }
    .page-btn:hover { border-color: var(--primary); color: var(--primary); }

    .site-footer {
      border-top: 1px solid var(--border); padding: 48px 24px 32px;
      font-family: Inter, sans-serif; font-size: 14px; color: var(--muted);
      text-align: center; background: rgba(255, 253, 249, 0.6);
    }
    .footer-links { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 16px; }
    .footer-links a { color: var(--muted); text-decoration: none; }
    .footer-links a:hover { color: var(--primary); }
  </style>

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "WritOn Journal",
    "description": "An editorial publication exploring literature, craft, and slower reading.",
    "url": "https://writon.cc/journal"
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

    <!-- Category Filter Tabs -->
    <div class="filter-bar" id="filter-bar">
      <a class="filter-pill active" data-category="all" href="#all">All Pieces</a>
      <a class="filter-pill" data-category="inside-writon" href="#inside-writon">Inside WritOn</a>
      <a class="filter-pill" data-category="building-writon" href="#building-writon">Building WritOn</a>
      <a class="filter-pill" data-category="writing-reading" href="#writing-reading">Writing &amp; Reading</a>
      <a class="filter-pill" data-category="community" href="#community">Community</a>
      <a class="filter-pill" data-category="writon-updates" href="#writon-updates">Updates</a>
    </div>

    <!-- Featured Post Hero -->
    <div id="featured-container">
${featuredHtml}
    </div>

    <!-- Articles Grid -->
    <div class="articles-grid" id="articles-grid">
${gridHtml}
    </div>

    <!-- Pagination -->
    <div class="pagination" id="pagination" style="display: none;"></div>
  </main>

  <footer class="site-footer" role="contentinfo">
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/journal">Journal</a>
      <a href="/updates">Updates</a>
      <a href="/about">About</a>
      <a href="/privacy-policy">Privacy Policy</a>
      <a href="/terms.html">Terms</a>
      <a href="/rss.xml">RSS Feed</a>
    </div>
    <div>© 2026 WritOn (writon.cc). All rights reserved.</div>
  </footer>

  <script>
    const API_BASE = window.location.origin;
    let currentCategory = 'all';

    function filterCards(category) {
      const featCard = document.querySelector('#featured-container .featured-card');
      const cards = document.querySelectorAll('#articles-grid .article-card');

      if (featCard) {
        if (category === 'all') {
          featCard.style.display = 'block';
        } else {
          featCard.style.display = 'none';
        }
      }

      let visibleCount = 0;
      cards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (category === 'all' || cat === category) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      const emptyNotice = document.getElementById('category-empty-notice');
      if (emptyNotice) emptyNotice.remove();

      if (visibleCount === 0) {
        const grid = document.getElementById('articles-grid');
        const notice = document.createElement('div');
        notice.id = 'category-empty-notice';
        notice.style.cssText = 'grid-column: 1/-1; text-align: center; color: var(--muted); padding: 48px 0; font-family: Newsreader, serif; font-size: 20px; font-style: italic;';
        notice.textContent = 'No articles in this section yet.';
        grid.appendChild(notice);
      }
    }

    async function loadJournal(category = 'all') {
      filterCards(category);
      try {
        const query = category !== 'all' ? '?category=' + encodeURIComponent(category) + '&limit=20' : '?limit=20';
        const res = await fetch(API_BASE + '/api/v1/journal' + query);
        if (!res.ok) return;
        const data = await res.json();
      } catch (err) {}
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

    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentCategory = pill.dataset.category;
        window.location.hash = currentCategory === 'all' ? '' : currentCategory;
        loadJournal(currentCategory);
      });
    });

    const hash = window.location.hash.replace('#', '');
    if (hash && ['inside-writon', 'building-writon', 'writing-reading', 'community', 'writon-updates'].includes(hash)) {
      currentCategory = hash;
      const targetPill = document.querySelector('[data-category="' + hash + '"]');
      if (targetPill) {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        targetPill.classList.add('active');
      }
    }

    loadJournal(currentCategory);
  </script>
</body>
</html>`;

fs.writeFileSync(path.resolve('public/journal/index.html'), cleanJournalIndexHtml, 'utf8');
console.log('Successfully wrote pristine public/journal/index.html with pre-baked cards.');

// 3. Pure Clean public/journal/article.html
const postsJsonSafe = JSON.stringify(posts).replace(/</g, '\\u003c');

const cleanArticleHtml = `<!doctype html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-L3H0RQ5ZQY"></script>
  <script>
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      window['ga-disable-G-L3H0RQ5ZQY'] = true;
    }
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-L3H0RQ5ZQY');
  </script>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#F7F3EB" />

  <title id="page-title">WritOn Journal</title>
  <meta id="page-desc" name="description" content="Read thoughtful essays and craft reflections on WritOn Journal." />
  <link id="page-canonical" rel="canonical" href="https://writon.cc/journal" />
  <link rel="alternate" type="application/rss+xml" title="WritOn — Stories &amp; Journal" href="https://writon.cc/rss.xml" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="WritOn" />
  <meta id="og-title" property="og:title" content="WritOn Journal" />
  <meta id="og-desc" property="og:description" content="Read thoughtful essays and craft reflections on WritOn Journal." />
  <meta id="og-url" property="og:url" content="https://writon.cc/journal" />
  <meta id="og-img" property="og:image" content="https://writon.cc/assets/hero-banner.webp" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@WritOn_Social" />
  <meta id="tw-title" name="twitter:title" content="WritOn Journal" />
  <meta id="tw-desc" name="twitter:description" content="Read thoughtful essays and craft reflections on WritOn Journal." />
  <meta id="tw-img" name="twitter:image" content="https://writon.cc/assets/hero-banner.webp" />

  <!-- Favicons -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48x48.png?v=2" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png?v=2" />

  <!-- Fonts & Styles -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap" rel="stylesheet">
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

    /* Article Content Typography */
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

    /* Author / Share Box */
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
    <div id="loading-spinner" style="text-align: center; padding: 64px 0; color: var(--muted); font-family: Inter, sans-serif;">
      Loading article...
    </div>

    <article id="article-container" style="display: none;">
      <header class="article-header">
        <a class="back-link" href="/journal">← Back to Journal</a>
        <div class="category-badge" id="art-category">Inside WritOn</div>
        <h1 id="art-title"></h1>
        <div class="subtitle" id="art-subtitle" style="display: none;"></div>
        <div class="byline">
          <span class="author-name" id="art-author">WritOn Editorial</span>
          <span>•</span>
          <span id="art-date"></span>
          <span>•</span>
          <span id="art-readtime"></span>
        </div>
      </header>

      <div class="article-body" id="art-content"></div>

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
      <a href="/rss.xml">RSS Feed</a>
    </div>
    <div>© 2026 WritOn (writon.cc). All rights reserved.</div>
  </footer>

  <script>
    const PRE_RENDERED_POSTS = ${postsJsonSafe};

    (async function initReader() {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      // pathParts might be ['journal', 'slug']
      const slug = pathParts[1] || new URLSearchParams(window.location.search).get('slug');

      if (!slug) {
        window.location.href = '/journal';
        return;
      }

      function renderPost(post) {
        document.title = \`\${post.title} — WritOn Journal\`;
        const pTitle = document.getElementById('page-title');
        if (pTitle) pTitle.textContent = \`\${post.title} — WritOn Journal\`;
        const pDesc = document.getElementById('page-desc');
        if (pDesc) pDesc.content = post.excerpt;
        const pCanon = document.getElementById('page-canonical');
        if (pCanon) pCanon.href = \`https://writon.cc/journal/\${encodeURIComponent(post.slug)}\`;

        const cat = post.category || 'inside-writon';
        const categoryMap = {
          'inside-writon': 'Inside WritOn',
          'building-writon': 'Building WritOn',
          'writing-reading': 'Writing & Reading',
          'community': 'Community',
          'writon-updates': 'Updates'
        };
        document.getElementById('art-category').textContent = categoryMap[cat] || cat.replace(/-/g, ' ');
        document.getElementById('art-title').textContent = post.title;
        if (post.subtitle) {
          const subEl = document.getElementById('art-subtitle');
          subEl.textContent = post.subtitle;
          subEl.style.display = 'block';
        }
        document.getElementById('art-author').textContent = post.author_name || post.authorName || 'WritOn Editorial';
        const pubDate = new Date(post.published_at || post.publishedAt || post.created_at || post.createdAt).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric'
        });
        document.getElementById('art-date').textContent = pubDate;
        document.getElementById('art-readtime').textContent = \`\${post.estimated_read_minutes || post.estimatedReadMinutes || 3} min read\`;
        document.getElementById('art-content').innerHTML = post.content_rendered_html || post.contentHtml || \`<p>\${post.excerpt || ''}</p>\`;

        // Structured Data Injection
        const ldScript = document.createElement('script');
        ldScript.type = 'application/ld+json';
        ldScript.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": post.excerpt,
          "datePublished": post.published_at || post.created_at,
          "dateModified": post.published_at || post.created_at,
          "author": {
            "@type": "Person",
            "name": post.author_name || "WritOn Editorial"
          },
          "publisher": {
            "@type": "Organization",
            "name": "WritOn",
            "url": "https://writon.cc",
            "logo": "https://writon.cc/assets/writon-logo.webp"
          },
          "mainEntityOfPage": \`https://writon.cc/journal/\${encodeURIComponent(post.slug)}\`
        });
        document.head.appendChild(ldScript);

        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('article-container').style.display = 'block';
      }

      // 1. Check local pre-baked cache first for instantaneous rendering
      const localMatch = PRE_RENDERED_POSTS.find(p => p.slug === slug);
      if (localMatch) {
        renderPost(localMatch);
        return;
      }

      // 2. Fetch from API for dynamically generated/newer posts
      try {
        const res = await fetch(\`/api/v1/journal/\${encodeURIComponent(slug)}\`);
        if (!res.ok) throw new Error('Article not found');
        const { post } = await res.json();
        renderPost(post);
      } catch (err) {
        document.getElementById('loading-spinner').innerHTML = '<h2>Piece Not Found</h2><p style="margin-top: 12px; font-style: italic;">This journal article may have been moved, archived, or does not exist.</p><a class="back-link" style="margin-top: 24px; display: inline-block;" href="/journal">← Return to Journal</a>';
      }
    })();
  </script>
</body>
</html>`;

fs.writeFileSync(path.resolve('public/journal/article.html'), cleanArticleHtml, 'utf8');
console.log('Successfully wrote pristine public/journal/article.html with fallback catalog.');

// 4. Generate standalone pre-rendered article pages for each slug
for (const post of posts) {
  const dir = path.resolve('public/journal/' + post.slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const pubDate = new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const articleUrl = `https://writon.cc/journal/${encodeURIComponent(post.slug)}`;
  const catLabel = categoryMap[post.category] || post.category;

  let pageHtml = cleanArticleHtml;

  pageHtml = pageHtml.replace(/<title id="page-title">.*?<\/title>/, `<title id="page-title">${escapeAttr(post.title)} — WritOn Journal</title>`);
  pageHtml = pageHtml.replace(/<meta id="page-desc" name="description" content=".*?" \/>/, `<meta id="page-desc" name="description" content="${escapeAttr(post.excerpt)}" />`);
  pageHtml = pageHtml.replace(/<link id="page-canonical" rel="canonical" href=".*?" \/>/, `<link id="page-canonical" rel="canonical" href="${articleUrl}" />`);
  pageHtml = pageHtml.replace(/<meta id="og-title" property="og:title" content=".*?" \/>/, `<meta id="og-title" property="og:title" content="${escapeAttr(post.title)} — WritOn Journal" />`);
  pageHtml = pageHtml.replace(/<meta id="og-desc" property="og:description" content=".*?" \/>/, `<meta id="og-desc" property="og:description" content="${escapeAttr(post.excerpt)}" />`);
  pageHtml = pageHtml.replace(/<meta id="og-url" property="og:url" content=".*?" \/>/, `<meta id="og-url" property="og:url" content="${articleUrl}" />`);
  pageHtml = pageHtml.replace(/<meta id="tw-title" name="twitter:title" content=".*?" \/>/, `<meta id="tw-title" name="twitter:title" content="${escapeAttr(post.title)} — WritOn Journal" />`);
  pageHtml = pageHtml.replace(/<meta id="tw-desc" name="twitter:description" content=".*?" \/>/, `<meta id="tw-desc" name="twitter:description" content="${escapeAttr(post.excerpt)}" />`);

  const staticArticleBody = `
    <article id="article-container" style="display: block;">
      <header class="article-header">
        <a class="back-link" href="/journal">← Back to Journal</a>
        <div class="category-badge" id="art-category">${catLabel}</div>
        <h1 id="art-title">${escapeHtml(post.title)}</h1>
        ${post.subtitle ? `<div class="subtitle" id="art-subtitle" style="display: block;">${escapeHtml(post.subtitle)}</div>` : ''}
        <div class="byline">
          <span class="author-name" id="art-author">${escapeHtml(post.author_name || 'WritOn Editorial')}</span>
          <span>•</span>
          <span id="art-date">${pubDate}</span>
          <span>•</span>
          <span id="art-readtime">${post.estimated_read_minutes || 3} min read</span>
        </div>
      </header>

      <div class="article-body" id="art-content">
        ${post.content_rendered_html}
      </div>

      <div class="article-footer-box">
        <h3>Carry WritOn with you</h3>
        <p>A quiet space for writers, poets, and story readers. Free on Android.</p>
        <a class="btn-nav-app" href="https://play.google.com/store/apps/details?id=com.ibitvalley.writon" target="_blank" rel="noopener noreferrer">
          Get WritOn on Google Play
        </a>
      </div>
    </article>
  `;

  pageHtml = pageHtml.replace(/<div id="loading-spinner"[\s\S]*?<\/article>/, staticArticleBody);

  fs.writeFileSync(path.join(dir, 'index.html'), pageHtml, 'utf8');
}
console.log('Successfully generated clean standalone pages for all 10 posts.');
