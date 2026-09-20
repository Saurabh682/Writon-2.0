import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const STORIES_DIR = path.join(PUBLIC_DIR, 'stories');

const API_BASE_URL = 'https://api.writon.cc';
const SITE_BASE_URL = 'https://writon.cc';

// Load marked.min.js from public/assets
const markedCode = await fs.readFile(path.join(PUBLIC_DIR, 'assets', 'marked.min.js'), 'utf8');
const vmContext = { globalThis: {} };
vm.createContext(vmContext);
vm.runInContext(markedCode, vmContext);
const marked = vmContext.marked || vmContext.globalThis.marked;

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function fetchLatestPosts(limit = 50) {
  console.log(`Fetching latest ${limit} stories from WritOn API...`);
  const url = `${API_BASE_URL}/api/v1/posts?page=1&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API returned HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  const posts = data.posts || [];
  console.log(`Fetched ${posts.length} posts successfully.`);
  return posts;
}

export async function prerenderStories(limit = 50) {
  const posts = await fetchLatestPosts(limit);
  const templatePath = path.join(STORIES_DIR, 'index.html');
  const baseTemplate = await fs.readFile(templatePath, 'utf8');

  console.log(`Pre-rendering HTML pages for ${posts.length} stories...`);

  let successCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const slug = post.slug;
    if (!slug) continue;

    // Fetch full post details if content is missing from list endpoint
    let fullPost = post;
    try {
      const detailRes = await fetch(`${API_BASE_URL}/api/v1/posts/${encodeURIComponent(slug)}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        fullPost = detailData.post || detailData || post;
      }
    } catch {
      // fallback to list post
    }

    const title = fullPost.title || 'Untitled Story';
    const summary = fullPost.summary || title;
    const authorName = fullPost.author?.fullName || fullPost.author?.penName || 'WritOn Author';
    const authorPenName = fullPost.author?.penName || 'author';
    const authorAvatarUrl = fullPost.author?.avatarUrl || '';
    const category = fullPost.category || 'Literature';
    const readingTime = fullPost.readingTimeMin || 3;
    const coverImg = fullPost.coverImage || fullPost.cover_image_url || '';
    const storyUrl = `${SITE_BASE_URL}/stories/${encodeURIComponent(slug)}`;
    const pubDateIso = fullPost.createdAt ? new Date(fullPost.createdAt).toISOString() : new Date().toISOString();

    // Render markdown content to semantic HTML
    const rawMarkdown = fullPost.content || fullPost.summary || '';
    const contentHtml = marked.parse(rawMarkdown);

    // Initial for fallback avatar
    const initial = (authorName || 'W')[0].toUpperCase();
    const avatarHtml = authorAvatarUrl
      ? `<img class="author-avatar" src="${escapeHtml(authorAvatarUrl)}" alt="Portrait of ${escapeHtml(authorName)}" loading="lazy" decoding="async">`
      : `<div class="author-avatar-fallback">${initial}</div>`;

    const coverHtml = coverImg
      ? `<img class="cover-img" src="${escapeHtml(coverImg)}" alt="Cover artwork for ${escapeHtml(title)}" loading="lazy" decoding="async">`
      : '';

    const appIntentUrl = `intent://writon.cc/stories/${encodeURIComponent(slug)}#Intent;scheme=https;package=com.ibitvalley.writon;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.ibitvalley.writon')};end`;

    // Construct JSON-LD Schema
    const breadcrumbLd = {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://writon.cc/" },
        { "@type": "ListItem", "position": 2, "name": category, "item": `https://writon.cc/stories?category=${encodeURIComponent(category)}` },
        { "@type": "ListItem", "position": 3, "name": title, "item": storyUrl }
      ]
    };

    const blogPostingLd = {
      "@type": "BlogPosting",
      "mainEntityOfPage": { "@type": "WebPage", "@id": storyUrl },
      "headline": title,
      "description": summary,
      "image": coverImg ? [coverImg] : ["https://writon.cc/assets/hero-banner.webp"],
      "datePublished": pubDateIso,
      "author": {
        "@type": "Person",
        "name": authorName,
        "url": `https://writon.cc/stories?author=${encodeURIComponent(authorPenName)}`
      },
      "publisher": {
        "@type": "Organization",
        "name": "WritOn",
        "url": "https://writon.cc",
        "logo": {
          "@type": "ImageObject",
          "url": "https://writon.cc/assets/writon_app_icon.png"
        }
      },
      "articleSection": category
    };

    const schemaJson = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [breadcrumbLd, blogPostingLd]
    });

    // Replace metadata in head
    let html = baseTemplate;

    html = html.replace(/<title id="page-title">.*?<\/title>/, `<title id="page-title">${escapeHtml(title)} — WritOn</title>`);
    html = html.replace(/<link id="canonical-link" rel="canonical" href=".*?" \/>/, `<link id="canonical-link" rel="canonical" href="${escapeHtml(storyUrl)}" />`);
    html = html.replace(/<meta id="meta-desc" name="description" content=".*?" \/>/, `<meta id="meta-desc" name="description" content="${escapeHtml(summary)}" />`);

    html = html.replace(/<meta id="og-title" property="og:title" content=".*?" \/>/, `<meta id="og-title" property="og:title" content="${escapeHtml(title)} — WritOn" />`);
    html = html.replace(/<meta id="og-desc" property="og:description" content=".*?" \/>/, `<meta id="og-desc" property="og:description" content="${escapeHtml(summary)}" />`);
    if (coverImg) {
      html = html.replace(/<meta id="og-img" property="og:image" content=".*?" \/>/, `<meta id="og-img" property="og:image" content="${escapeHtml(coverImg)}" />`);
    }

    html = html.replace(/<meta id="twitter-title" name="twitter:title" content=".*?" \/>/, `<meta id="twitter-title" name="twitter:title" content="${escapeHtml(title)} — WritOn" />`);
    html = html.replace(/<meta id="twitter-desc" name="twitter:description" content=".*?" \/>/, `<meta id="twitter-desc" name="twitter:description" content="${escapeHtml(summary)}" />`);
    if (coverImg) {
      html = html.replace(/<meta id="twitter-img" name="twitter:image" content=".*?" \/>/, `<meta id="twitter-img" name="twitter:image" content="${escapeHtml(coverImg)}" />`);
    }

    // Inject JSON-LD Schema
    html = html.replace('</head>', `  <script id="story-jsonld" type="application/ld+json">${schemaJson}</script>\n</head>`);

    // Replace main body: remove loading spinner, make story-article visible and fully rendered
    const preRenderedMain = `  <main>
    <div id="loading" class="loading-box" style="display:none;" data-nosnippet>
      <p>Loading story...</p>
    </div>

    <article id="story-article" style="display:block;">
      <header class="story-header" data-nosnippet>
        <a href="/" class="brand-badge" aria-label="WritOn home">
          <img src="/assets/writon-nav-logo.webp" alt="WritOn" width="22" height="22" style="border-radius:50%; object-fit:cover; vertical-align:middle;" />
          <span>WritOn</span>
        </a>
        <h1 id="story-title">${escapeHtml(title)}</h1>
        <div class="story-meta-row">
          <div id="author-avatar-wrap">${avatarHtml}</div>
          <div>
            <div id="author-name" class="author-name">${escapeHtml(authorName)}</div>
            <div id="reading-meta" class="reading-meta">${escapeHtml(category)} • ${readingTime} min read</div>
          </div>
        </div>
      </header>

      <div id="cover-wrap">${coverHtml}</div>

      <div id="story-content" class="story-content">
${contentHtml}
      </div>

      <div class="app-cta-card" data-nosnippet>
        <h3>Continue Reading in WritOn</h3>
        <p>Enjoy distraction-free reading, offline library access, and join the writer discussion.</p>
        <div class="cta-buttons">
          <a id="btn-app-intent" class="btn-open" href="${escapeHtml(appIntentUrl)}">Open in App</a>
          <a class="btn-store" href="https://play.google.com/store/apps/details?id=com.ibitvalley.writon" target="_blank">Get WritOn Free</a>
        </div>
      </div>
    </article>
  </main>`;

    html = html.replace(/<main>[\s\S]*?<\/main>/, preRenderedMain);

    // Save to public/stories/${slug}/index.html and public/stories/${slug}.html
    const storyDir = path.join(STORIES_DIR, slug);
    await fs.mkdir(storyDir, { recursive: true });
    await fs.writeFile(path.join(storyDir, 'index.html'), html, 'utf8');
    await fs.writeFile(path.join(STORIES_DIR, `${slug}.html`), html, 'utf8');

    successCount++;
  }

  console.log(`✅ Successfully pre-rendered ${successCount} story HTML pages in public/stories/`);
}

// Run directly if executed as script
if (process.argv[1] && process.argv[1].endsWith('generate-story-prerender.mjs')) {
  prerenderStories(50).catch((err) => {
    console.error('Fatal error pre-rendering stories:', err);
    process.exit(1);
  });
}
