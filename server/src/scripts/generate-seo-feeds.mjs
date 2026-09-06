import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const API_BASE_URL = 'https://api.writon.cc';
const SITE_BASE_URL = 'https://writon.cc';

function escapeXml(unsafe) {
  return String(unsafe ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function fetchAllPosts() {
  console.log('Fetching all posts from WritOn API...');
  let page = 1;
  const allPosts = [];

  while (true) {
    const url = `${API_BASE_URL}/api/v1/posts?page=${page}&limit=50`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`API returned HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    const posts = data.posts || [];
    if (posts.length === 0) break;

    allPosts.push(...posts);
    console.log(`  Fetched page ${page}: ${posts.length} posts (cumulative: ${allPosts.length})`);

    if (!data.pagination?.hasMore || posts.length < 50) {
      break;
    }
    page++;
  }

  // Deduplicate by slug if any duplicates exist
  const seenSlugs = new Set();
  const deduped = [];
  for (const post of allPosts) {
    if (post.slug && !seenSlugs.has(post.slug)) {
      seenSlugs.add(post.slug);
      deduped.push(post);
    }
  }

  console.log(`Successfully fetched ${deduped.length} unique published posts.`);
  return deduped;
}

function generateRssFeedXml(posts) {
  // Take top 50 most recent stories for the RSS feed
  const recentPosts = posts.slice(0, 50);
  const nowUtc = new Date().toUTCString();

  const itemsXml = recentPosts.map((post) => {
    const storyUrl = `${SITE_BASE_URL}/stories/${encodeURIComponent(post.slug)}`;
    const pubDate = post.createdAt ? new Date(post.createdAt).toUTCString() : nowUtc;
    const authorName = post.author?.fullName || post.author?.penName || 'WritOn Writer';
    const category = post.category || 'Essays';
    const summary = post.summary || post.title;
    const coverUrl = post.coverImage || post.cover_image_url || '';

    let mediaTag = '';
    if (coverUrl) {
      mediaTag = `\n      <media:content url="${escapeXml(coverUrl)}" medium="image" />`;
    }

    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(storyUrl)}</link>
      <guid isPermaLink="true">${escapeXml(storyUrl)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <dc:creator>${escapeXml(authorName)}</dc:creator>
      <category>${escapeXml(category)}</category>
      <description>${escapeXml(summary)}</description>${mediaTag}
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>WritOn — Stories, Thinking &amp; Independent Essays</title>
    <link>${SITE_BASE_URL}/stories</link>
    <description>Curated independent essays, craft reflections, poetry, and ideas on modern culture. Read 700+ literary stories on WritOn.</description>
    <language>en-us</language>
    <lastBuildDate>${nowUtc}</lastBuildDate>
    <atom:link href="${SITE_BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_BASE_URL}/assets/writon_app_icon.png</url>
      <title>WritOn</title>
      <link>${SITE_BASE_URL}/stories</link>
    </image>
${itemsXml}
  </channel>
</rss>
`;
}

function generateFullSitemapXml(posts) {
  const today = new Date().toISOString().split('T')[0];

  const staticUrls = [
    {
      loc: `${SITE_BASE_URL}/`,
      lastmod: today,
      changefreq: 'daily',
      priority: '1.0',
      image: {
        loc: `${SITE_BASE_URL}/assets/writon_wordmark.png`,
        title: 'WritOn — Discover stories, thinking & expertise',
      },
    },
    {
      loc: `${SITE_BASE_URL}/stories`,
      lastmod: today,
      changefreq: 'hourly',
      priority: '0.9',
      image: {
        loc: `${SITE_BASE_URL}/assets/writon_app_icon.png`,
        title: 'WritOn Stories & Essays',
      },
    },
    { loc: `${SITE_BASE_URL}/privacy-policy.html`, lastmod: '2026-08-30', changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_BASE_URL}/terms.html`, lastmod: '2026-08-30', changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_BASE_URL}/child-safety.html`, lastmod: '2026-08-30', changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_BASE_URL}/delete-account.html`, lastmod: '2026-08-30', changefreq: 'monthly', priority: '0.5' },
  ];

  const categories = [
    'Tech',
    'Essays',
    'Poetry',
    'Shayari',
    'Humour',
    'Culture',
    'Short Stories',
    'Philosophy',
    'Science & Health',
    'Business & Finance',
    'Entertainment',
    'Sports',
    'Journalism'
  ];

  const categoryUrls = categories.map((cat) => ({
    loc: `${SITE_BASE_URL}/stories?category=${encodeURIComponent(cat)}`,
    lastmod: today,
    changefreq: 'daily',
    priority: '0.7',
  }));

  const storyUrls = posts.map((post) => {
    const postDate = post.createdAt ? new Date(post.createdAt).toISOString().split('T')[0] : today;
    const coverUrl = post.coverImage || post.cover_image_url || '';
    return {
      loc: `${SITE_BASE_URL}/stories/${encodeURIComponent(post.slug)}`,
      lastmod: postDate,
      changefreq: 'weekly',
      priority: '0.8',
      image: coverUrl ? {
        loc: coverUrl,
        title: post.title || 'WritOn Story',
        caption: post.summary || '',
      } : null,
    };
  });

  const allUrls = [...staticUrls, ...categoryUrls, ...storyUrls];

  const urlsXml = allUrls.map((u) => {
    const imageTag = u.image ? `\n    <image:image>\n      <image:loc>${escapeXml(u.image.loc)}</image:loc>\n      <image:title>${escapeXml(u.image.title)}</image:title>${u.image.caption ? `\n      <image:caption>${escapeXml(u.image.caption)}</image:caption>` : ''}\n    </image:image>` : '';

    return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>${imageTag}\n  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlsXml}
</urlset>
`;
}

async function main() {
  const posts = await fetchAllPosts();

  // 1. Generate public/feed.xml
  const rssXml = generateRssFeedXml(posts);
  const rssPath = path.join(PUBLIC_DIR, 'feed.xml');
  fs.writeFileSync(rssPath, rssXml, 'utf8');
  console.log(`Wrote RSS 2.0 feed to ${rssPath} (${rssXml.length} bytes, 50 latest stories).`);

  // 2. Generate public/sitemap.xml
  const sitemapXml = generateFullSitemapXml(posts);
  const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapXml, 'utf8');
  console.log(`Wrote full sitemap to ${sitemapPath} (${sitemapXml.length} bytes, ${posts.length + 19} total URLs).`);
}

main().catch((err) => {
  console.error('Fatal error generating SEO feeds:', err);
  process.exit(1);
});
