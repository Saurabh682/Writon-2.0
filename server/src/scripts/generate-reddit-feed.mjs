#!/usr/bin/env node
/**
 * generate-reddit-feed.mjs
 * 
 * Generates a specialized RSS 2.0 feed tailored specifically for Reddit:
 * - Strips all hashtags (Reddit downvotes hashtags).
 * - Formats post bodies in clean Reddit Markdown (blockquotes, bold headers, discussion prompts).
 * - Appends an engagement question to invite comments.
 * - Targets subreddits via <category> tags (e.g., r/writon, r/writing, r/writingprompts).
 * - Outputs to public/reddit-feed.xml for IFTTT / Zapier automated publishing.
 * 
 * Zero dependencies: pure Node.js stdlib (fs, path).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'reddit-feed.xml');
const POSTS_BACKUP_PATH = path.join(ROOT_DIR, 'data-exports/json/posts.json');
const USERS_BACKUP_PATH = path.join(ROOT_DIR, 'data-exports/json/users.json');

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

function stripHashtags(text) {
  if (!text) return '';
  return text.replace(/#\w+/g, '').replace(/\s{2,}/g, ' ').trim();
}

function cleanMarkdown(raw) {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function fetchPosts(limit = 25) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/posts?page=1&limit=${limit}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.posts && data.posts.length > 0) {
        console.log(`Fetched ${data.posts.length} posts from live API.`);
        return data.posts.map(p => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          summary: p.summary,
          content: p.content,
          category: p.category,
          authorName: p.author?.fullName || p.author?.penName || 'WritOn Author',
          authorPenName: p.author?.penName || 'author',
          readingTime: p.readingTimeMin || 3,
          createdAt: p.createdAt
        }));
      }
    }
  } catch (err) {
    console.warn(`Could not reach live API (${err.message}), falling back to local database exports...`);
  }

  // Fallback to local posts.json
  const [postsRaw, usersRaw] = await Promise.all([
    fs.readFile(POSTS_BACKUP_PATH, 'utf8'),
    fs.readFile(USERS_BACKUP_PATH, 'utf8')
  ]);
  const posts = JSON.parse(postsRaw);
  const users = JSON.parse(usersRaw);
  const userMap = new Map(users.map(u => [u.id, u]));

  console.log(`Loaded ${posts.length} posts from local backup.`);
  return posts.slice(0, limit).map(p => {
    const u = userMap.get(p.author_id);
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      content: p.content,
      category: p.category,
      authorName: u?.full_name || u?.pen_name || 'WritOn Author',
      authorPenName: u?.pen_name || 'author',
      readingTime: p.reading_time_min || 3,
      createdAt: p.created_at
    };
  });
}

function mapSubreddit(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('short stories') || cat.includes('story')) return 'writing';
  if (cat.includes('essay') || cat.includes('philosophy')) return 'writon';
  if (cat.includes('tech')) return 'writon';
  if (cat.includes('poetry') || cat.includes('shayari')) return 'poetry';
  return 'writon';
}

function buildRedditBody(post) {
  const cleanTitle = stripHashtags(post.title);
  const storyUrl = `${SITE_BASE_URL}/stories/${encodeURIComponent(post.slug)}`;

  // Extract opening excerpt
  const rawBody = cleanMarkdown(post.content || post.summary || '');
  const excerpt = stripHashtags(rawBody.slice(0, 350)).trim();

  // Pick an engaging discussion prompt based on category
  let prompt = 'How do you approach this in your own writing? What detail or image stood out to you?';
  const cat = (post.category || '').toLowerCase();
  if (cat.includes('poetry') || cat.includes('shayari')) {
    prompt = 'What line resonated most with you? How do you handle silence and rhythm in your verse?';
  } else if (cat.includes('story') || cat.includes('fiction')) {
    prompt = 'What is your take on the opening hook? Where would you take this character next?';
  }

  return `> "${excerpt}..."

---

**Author:** ${post.authorName} (@${post.authorPenName})  
**Genre:** ${post.category || 'Craft'} • ${post.readingTime} min read  
**Full Piece:** [Read on WritOn](${storyUrl})

---

💬 **Craft Discussion:**  
${prompt}`.trim();
}

export async function generateRedditFeed() {
  const posts = await fetchPosts(25);
  const nowUtc = new Date().toUTCString();

  console.log(`Generating Reddit-specific RSS feed for ${posts.length} stories...`);

  const itemsXml = posts.map((post, idx) => {
    const cleanTitle = stripHashtags(post.title || 'Reflections on Craft');
    const storyUrl = `${SITE_BASE_URL}/stories/${encodeURIComponent(post.slug)}`;
    const pubDate = post.createdAt ? new Date(post.createdAt).toUTCString() : nowUtc;
    const targetSubreddit = mapSubreddit(post.category);
    const redditBody = buildRedditBody(post);

    return `    <item>
      <title>${escapeXml(cleanTitle)}</title>
      <link>${escapeXml(storyUrl)}</link>
      <guid isPermaLink="true">${escapeXml(storyUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(post.authorPenName)}@writon.cc (${escapeXml(post.authorName)})</author>
      <category>${escapeXml(targetSubreddit)}</category>
      <description><![CDATA[${redditBody}]]></description>
    </item>`;
  }).join('\n');

  const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>WritOn — Reddit Editorial Craft Feed</title>
    <link>${SITE_BASE_URL}</link>
    <description>Curated literary craft truths, essays, and stories tailored for Reddit creative writing communities. Formatted in native Reddit Markdown with zero hashtags.</description>
    <language>en-us</language>
    <lastBuildDate>${nowUtc}</lastBuildDate>
    <atom:link href="${SITE_BASE_URL}/reddit-feed.xml" rel="self" type="application/rss+xml" />
    <managingEditor>editorial@writon.cc (WritOn Editorial Board)</managingEditor>
${itemsXml}
  </channel>
</rss>
`;

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, feedXml, 'utf8');
  console.log(`✅ Dedicated Reddit feed generated successfully: ${OUTPUT_PATH} (${posts.length} items)`);
  return { path: OUTPUT_PATH, count: posts.length };
}

if (process.argv[1] && process.argv[1].endsWith('generate-reddit-feed.mjs')) {
  generateRedditFeed().catch(err => {
    console.error('Failed to generate Reddit feed:', err);
    process.exit(1);
  });
}
