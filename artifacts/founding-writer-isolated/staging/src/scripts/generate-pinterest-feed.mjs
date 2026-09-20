import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStoryQuoteCardSvg, renderSvgToPng } from '../services/social-card-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const CARDS_DIR = path.join(PUBLIC_DIR, 'cards');

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

async function fetchLatestPosts(limit = 30) {
  console.log(`Fetching latest ${limit} posts from WritOn API...`);
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

export async function generatePinterestFeed() {
  await fs.mkdir(CARDS_DIR, { recursive: true });

  const posts = await fetchLatestPosts(30);
  const nowUtc = new Date().toUTCString();

  console.log(`Rendering vertical 1080x1350 cards for ${posts.length} stories...`);

  const itemsXml = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const slug = post.slug;
    if (!slug) continue;

    const title = post.title || 'Untitled Story';
    const summary = post.summary || title;
    const authorName = post.author?.fullName || post.author?.penName || 'WritOn Author';
    const authorPenName = post.author?.penName || 'author';
    const category = post.category || 'Literature';
    const readingTime = post.readingTimeMin || 3;
    const pubDate = post.createdAt ? new Date(post.createdAt).toUTCString() : nowUtc;
    const storyUrl = `${SITE_BASE_URL}/stories/${encodeURIComponent(slug)}`;
    const cardFilename = `${slug}.png`;
    const cardLocalPath = path.join(CARDS_DIR, cardFilename);
    const cardPublicUrl = `${SITE_BASE_URL}/cards/${cardFilename}`;

    // Render card if it does not already exist
    try {
      await fs.access(cardLocalPath);
    } catch {
      // Build card SVG and render to PNG
      const cardSvg = buildStoryQuoteCardSvg({
        title,
        summary,
        category,
        authorFullName: authorName,
        authorPenName,
        readingTimeMin: readingTime,
        theme: 'light',
      });
      await renderSvgToPng(cardSvg, cardLocalPath);
      console.log(`  [${i + 1}/${posts.length}] Rendered card: ${cardFilename}`);
    }

    const cleanCategoryTag = category.toLowerCase().replace(/[^a-z0-9]/g, '');
    const pinDescription = `“${summary}”

Written by ${authorName} on WritOn. Discover thoughtful literature, essays, and offline reading.

Read the full piece on WritOn: ${storyUrl}

#writon #${cleanCategoryTag} #storytelling #reading #writers #amwriting #literature`;

    itemsXml.push(`    <item>
      <title>${escapeXml(`${title} — ${authorName}`)}</title>
      <link>${escapeXml(storyUrl)}</link>
      <guid isPermaLink="true">${escapeXml(storyUrl)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <dc:creator>${escapeXml(authorName)}</dc:creator>
      <category>${escapeXml(category)}</category>
      <description><![CDATA[${pinDescription}]]></description>
      <enclosure url="${escapeXml(cardPublicUrl)}" type="image/png" length="180000" />
      <media:content url="${escapeXml(cardPublicUrl)}" medium="image" width="1080" height="1350" />
    </item>`);
  }

  const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>WritOn — Stories, Quotes &amp; Literary Cards</title>
    <link>${SITE_BASE_URL}/stories</link>
    <description>Curated independent stories, poetry, and thought pieces on modern culture formatted for visual reading and inspiration.</description>
    <language>en-us</language>
    <lastBuildDate>${nowUtc}</lastBuildDate>
    <atom:link href="${SITE_BASE_URL}/pinterest-feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_BASE_URL}/assets/writon_app_icon.png</url>
      <title>WritOn</title>
      <link>${SITE_BASE_URL}/stories</link>
    </image>
${itemsXml.join('\n')}
  </channel>
</rss>`;

  const outputPath = path.join(PUBLIC_DIR, 'pinterest-feed.xml');
  await fs.writeFile(outputPath, feedXml, 'utf8');
  console.log(`✅ Successfully generated Pinterest RSS feed with ${itemsXml.length} items at: ${outputPath}`);
}

// Run directly if executed as a script
if (process.argv[1] && process.argv[1].endsWith('generate-pinterest-feed.mjs')) {
  generatePinterestFeed().catch((err) => {
    console.error('Fatal error generating Pinterest feed:', err);
    process.exit(1);
  });
}
