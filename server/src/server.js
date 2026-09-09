import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import pg from 'pg';
import sharp from 'sharp';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { z } from 'zod';
import { loadFirebaseServiceAccount, loadRuntimeConfig } from './config.js';
import { adminBotsRoutes } from './routes/admin-bots.js';
import { adminReviewsRoutes } from './routes/admin-reviews.js';
import { appMetaRoutes } from './routes/app-meta.js';
import { seoRoutes, renderDiscoveryDeckHtml } from './routes/seo-routes.js';
import { notificationRoutes } from './routes/notifications.js';
import { engagementPreferenceRoutes } from './routes/engagement-preferences.js';
import { triggerSparkReaction, triggerSparkCommentReaction, startSparkScheduler } from './bot-engine/spark-runner.js';
import { startMasterDailyScheduler } from './bot-engine/master-scheduler.js';
import { mcpRoutes } from './routes/mcp-server.js';
import { milestoneRoutes } from './routes/milestones.js';
import { campaignRedirectRoutes } from './routes/campaign-redirect.js';
import { feedRoutes } from './routes/feed.js';
import { cleanExpiredFeedData } from './services/feed-service.js';
import { toFcmAnalyticsLabel } from './services/fcm-analytics-label.js';
import { runDailyDigest } from './jobs/daily-digest.js';
import { runDiscoveryNotifications } from './jobs/discovery-notifications.js';
import { runDailyCampaignPublish } from './jobs/social-campaign-publisher.js';
import { runFollowedWriterNotifications } from './jobs/followed-writer-notifications.js';
import { attachHashtagsAndWatermark, stripWatermark } from './bot-engine/watermark-service.js';
import { PUBLISHABLE_STORY_CATEGORIES } from './domain/story-categories.js';
import fs from 'node:fs/promises';

const { Pool } = pg;

const profileMediaKeyPattern = /^profiles\/[A-Za-z0-9:_-]+\/[a-f0-9-]+\.webp$/i;
const trustedWritOnMediaHosts = new Set([
  'api.writon.cc',
  'writon-powerup.onrender.com',
  'writon-api-rfusi3iwbq-el.a.run.app',
  'writon-api-802112841589.asia-south1.run.app',
  'writon-app-api-canary-rfusi3iwbq-el.a.run.app',
]);

function decodedProfileMediaKey(value) {
  try {
    const decoded = decodeURIComponent(String(value ?? '').replace(/^\/+/, ''));
    return profileMediaKeyPattern.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function profileMediaKeyFromUrl(value, configuredBaseUrl) {
  try {
    const url = new URL(value);
    const configuredHost = configuredBaseUrl ? new URL(configuredBaseUrl).hostname.toLowerCase() : null;
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== 'https:'
      || url.username
      || url.password
      || url.search
      || url.hash
      || (!trustedWritOnMediaHosts.has(hostname) && hostname !== configuredHost)
    ) {
      return null;
    }
    const mediaPrefix = '/api/v1/media/';
    if (!url.pathname.startsWith(mediaPrefix)) return null;
    return decodedProfileMediaKey(url.pathname.slice(mediaPrefix.length));
  } catch {
    return null;
  }
}

const profileInputSchema = z.object({
  penName: z.string().trim().toLowerCase().min(3).max(32)
    .regex(/^[a-z0-9_]+$/, 'Username may contain only lowercase letters, numbers, and underscores.'),
  fullName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(500).nullable().optional(),
  avatarUrl: z.string().trim().max(2_000).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
});

const profilePatchSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  avatarUrl: z.string().trim().max(2_000).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  quoteOfDay: z.string().trim().max(280).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one profile field is required.');

const postsQuerySchema = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  tab: z.enum(['latest', 'popular', 'following']).default('latest'),
  authorId: z.string().trim().optional(),
  authorPenName: z.string().trim().optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const postInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(1).max(100_000),
  summary: z.string().trim().max(500).nullable().optional(),
  category: z.enum(PUBLISHABLE_STORY_CATEGORIES),
  coverImage: z.string().url().max(2_000).nullable().optional(),
  isPublished: z.boolean().default(true),
  clientDraftId: z.string().uuid().optional(),
  languageCode: z.enum(['en', 'hi', 'bn', 'mr', 'es', 'fr', 'ur', 'und']).default('und'),
});

const postPatchSchema = postInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one story field is required.'
);

const commentInputSchema = z.object({
  content: z.string().trim().min(1).max(5_000),
  parentId: z.string().uuid().nullable().optional(),
  clientMutationId: z.string().uuid().nullable().optional(),
});

const relationStateInputSchema = z.object({
  enabled: z.boolean(),
});

const interestsInputSchema = z.object({
  topicIds: z.array(
    z.string().trim().min(1).max(64).regex(/^[a-z0-9_]+$/, 'Invalid topic identifier.')
  ).max(32),
});

const collectionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const readingProgressInputSchema = z.object({
  progress: z.coerce.number().min(0).max(1).default(0.05),
  readSeconds: z.coerce.number().int().min(0).max(60).default(0),
});

const postIdSchema = z.string().uuid();
const profileIdentifierSchema = z.string().trim().min(1).max(200);
const storyShareSlugSchema = z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/);
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function supabaseStorageHeaders(apiKey, extraHeaders = {}) {
  const headers = { apikey: apiKey, ...extraHeaders };
  if (!apiKey.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

// Fastify 4 used redirect(statusCode, url), while Fastify 5 uses
// redirect(url, statusCode). Building the response explicitly keeps profile
// media compatible across a rolling deployment where both versions can run.
export function sendFoundRedirect(reply, url) {
  return reply.code(302).header('Location', url).send();
}

export function sendPermanentRedirect(reply, url) {
  return reply.code(301).header('Location', url).send();
}

const storyShareCss = `
:root{color-scheme:light;--paper:#f8f2e9;--ink:#26211d;--muted:#756b61;--rust:#c94724;--line:#ded4c8}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{min-height:100vh;display:grid;place-items:center;padding:32px 20px;padding-bottom:80px}.story{width:min(680px,100%);border-top:4px solid var(--rust);padding:36px 0}
.brand{font:600 18px Georgia,serif;letter-spacing:.02em}.eyebrow{margin:42px 0 14px;color:var(--rust);font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
h1{margin:0;font:600 clamp(36px,6vw,60px)/1.08 Georgia,"Times New Roman",serif;letter-spacing:-.025em}.summary{margin:20px 0 26px;font:400 20px/1.6 Georgia,"Times New Roman",serif;color:#4f4740}
.author{display:flex;align-items:center;gap:14px;padding:18px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.author img,.avatar-fallback{width:56px;height:56px;border-radius:50%;object-fit:cover;background:#eee3d6}
.avatar-fallback{display:grid;place-items:center;color:var(--rust);font:600 20px Georgia,serif}.byline{margin:0 0 2px;color:var(--muted);font-size:12px}.author-name{margin:0;font-weight:700;font-size:15px}.author-link{text-decoration:none;color:inherit;display:flex;align-items:center;gap:14px}.author-link:hover .author-name{color:var(--rust)}
.story-body{margin-top:28px;font:400 18px/1.8 Georgia,"Times New Roman",serif;color:#2c2621}
.story-body h2{margin:36px 0 16px;font:600 26px/1.2 Georgia,serif}
.story-body h3{margin:28px 0 12px;font:600 20px/1.3 Georgia,serif}
.story-body h4{margin:22px 0 10px;font:600 18px/1.3 Georgia,serif}
.story-body p{margin:0 0 20px}
.story-body strong{color:var(--ink);font-weight:700}
.story-body ol{margin:0 0 22px;padding-left:26px;line-height:1.75}
.story-body ol li{margin-bottom:10px;padding-left:4px}
.story-body ul{margin:0 0 22px;padding-left:26px;line-height:1.75}
.story-body ul li{margin-bottom:8px}
.story-body blockquote{margin:28px 0;padding:16px 22px;border-left:3px solid var(--rust);background:rgba(201,71,36,0.05);border-radius:0 10px 10px 0;font:italic 18px/1.65 Georgia,serif;color:#3f3730}
.story-body pre{margin:24px 0;padding:18px 20px;background:#231f1c;color:#f3eee6;border-radius:12px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-size:14px;line-height:1.6;border:1px solid #3c352f}
.story-body pre code{background:transparent;color:inherit;padding:0;border-radius:0;font-size:inherit;display:block;white-space:pre}
.story-body code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;background:#eee3d6;padding:2px 6px;border-radius:4px;font-size:0.9em}
.story-body a{color:var(--rust);text-decoration:underline}
.story-divider{border:none;border-top:1px solid var(--line);margin:36px auto;width:60%}
.story-hashtags{margin-top:24px;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:8px;font:500 14px system-ui,-apple-system,sans-serif}
.story-hashtags .hashtag{color:var(--rust);background:#eee3d6;padding:4px 10px;border-radius:999px;font-weight:600}
.writon-watermark{opacity:0;position:absolute;pointer-events:none;font-size:0;width:0;height:0;overflow:hidden;user-select:none;display:inline-block;line-height:0}
.cta{display:inline-flex;min-height:46px;align-items:center;justify-content:center;padding:0 22px;border-radius:999px;background:var(--rust);color:#fff;text-decoration:none;font-weight:700;font-size:14px}.store-link{display:inline-block;margin-left:16px;color:var(--muted);font-size:14px;text-decoration:underline}.tagline{margin-top:36px;color:var(--muted);font:italic 15px Georgia,serif}
.sticky-app-bar{position:fixed;bottom:0;left:0;right:0;background:rgba(248,242,233,0.96);backdrop-filter:blur(8px);border-top:1px solid var(--line);padding:10px 20px;display:flex;justify-content:space-between;align-items:center;z-index:100;box-shadow:0 -4px 12px rgba(0,0,0,0.06)}
.sticky-app-bar .bar-text{font-size:13px;font-weight:600;color:var(--ink)}
.sticky-app-bar .bar-btn{background:var(--rust);color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:8px 16px;border-radius:999px;min-height:44px;display:inline-flex;align-items:center;justify-content:center}
@media(max-width:520px){main{place-items:start;padding:20px;padding-bottom:70px}.story{padding-top:24px}.eyebrow{margin-top:30px}.summary{font-size:18px}}
`;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeXml(unsafe) {
  return String(unsafe ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

const OG_LOCALES = {
  en: 'en_US',
  hi: 'hi_IN',
  mr: 'mr_IN',
  bn: 'bn_IN',
  es: 'es_ES',
  fr: 'fr_FR',
};

function normalizeStoryLanguage(lang) {
  const normalized = String(lang || '').trim().toLowerCase().split(/[-_]/)[0];
  const supported = ['en', 'hi', 'mr', 'bn', 'es', 'fr'];
  return supported.includes(normalized) ? normalized : 'en';
}

function toOgLocale(lang) {
  return OG_LOCALES[lang] || 'en_US';
}

function formatContentToHtml(rawContent) {
  if (!rawContent) return '';
  const hasWatermark = rawContent.includes('#writon');
  const cleanRaw = rawContent
    .replace(/<!--\s*#writon\s*watermark\s*-->/gi, '')
    .replace(/<span\b[^>]*class=["']writon-watermark["'][^>]*>[\s\S]*?<\/span>/gi, '');

  // Extract fenced code blocks (``` or ~~~) first so syntax and indentation are preserved
  const codeBlocks = [];
  const withPlaceholders = cleanRaw.replace(/(?:^|\n)(?:```|~~~)([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)\r?\n(?:```|~~~)/g, (_match, lang, code) => {
    const token = `\n\nWRITONCODEBLOCK${codeBlocks.length}TOKEN\n\n`;
    codeBlocks.push({ lang: (lang || '').trim(), code });
    return token;
  });

  const escaped = escapeHtml(withPlaceholders);
  const formatted = escaped
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^(?:---|___|\*\*\*)$/gim, '<hr class="story-divider">')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .split(/\n\n+/)
    .map(chunk => {
      const trimmed = chunk.trim();
      if (!trimmed) return '';

      // Check if chunk is a code block placeholder
      const codeMatch = trimmed.match(/^WRITONCODEBLOCK(\d+)TOKEN$/);
      if (codeMatch) {
        const idx = parseInt(codeMatch[1], 10);
        const block = codeBlocks[idx];
        if (block) {
          const escapedCode = escapeHtml(block.code);
          const langClass = block.lang ? ` class="language-${escapeHtml(block.lang)}"` : '';
          return `<pre${langClass}><code>${escapedCode}</code></pre>`;
        }
      }

      if (trimmed.startsWith('<h') || trimmed.startsWith('<hr')) return trimmed;

      // Hashtags block
      if (/^#[a-zA-Z0-9_]+(?:\s+#[a-zA-Z0-9_]+)*$/.test(trimmed)) {
        const tags = trimmed.split(/\s+/).map(t => `<span class="hashtag">${t}</span>`).join(' ');
        return `<div class="story-hashtags">${tags}</div>`;
      }

      const lines = trimmed.split(/\n/);

      // Blockquotes (> or &gt;)
      if (lines.every(l => /^(?:&gt;|>)/.test(l.trim()))) {
        const quoteContent = lines.map(l => l.trim().replace(/^(?:&gt;|>)\s*/, '')).join('<br>');
        return `<blockquote><p>${quoteContent}</p></blockquote>`;
      }

      // Numbered Lists (1. , 2. )
      if (lines.every(l => /^\d+\.\s+/.test(l.trim()))) {
        const items = lines.map(l => `<li>${l.trim().replace(/^\d+\.\s+/, '')}</li>`).join('');
        return `<ol>${items}</ol>`;
      }

      // Unordered Lists (- , * , • )
      if (lines.every(l => /^(?:[-*•]|&bull;)\s+/.test(l.trim()))) {
        const items = lines.map(l => `<li>${l.trim().replace(/^(?:[-*•]|&bull;)\s+/, '')}</li>`).join('');
        return `<ul>${items}</ul>`;
      }

      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  return hasWatermark
    ? `${formatted}\n<span class="writon-watermark" style="opacity:0;position:absolute;pointer-events:none;font-size:0;width:0;height:0;overflow:hidden;user-select:none;display:inline-block;line-height:0;" aria-hidden="true">#writon</span>`
    : formatted;
}

function shareDescription(story) {
  const source = story.summary || story.content || `A story by ${story.authorName}.`;
  const plain = String(source)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_~`>#\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 220 ? `${plain.slice(0, 217).trimEnd()}...` : plain;
}

function safePublicImageUrl(...candidates) {
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
    } catch {
      // Ignore missing, relative, or unsafe image URLs.
    }
  }
  return null;
}

function requestOrigin(request, configuredBaseUrl) {
  try {
    if (configuredBaseUrl) return new URL(configuredBaseUrl).origin;
  } catch {
    // Fall back to the request host when configuration contains an invalid URL.
  }
  const forwardedProtocol = String(request.headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
  const forwardedHost = String(request.headers['x-forwarded-host'] ?? '').split(',')[0].trim();
  const protocol = forwardedProtocol || request.protocol || 'https';
  const host = forwardedHost || request.headers.host;
  return `${protocol}://${host}`;
}

function renderStorySharePage({ story, canonicalUrl, playStoreUrl, origin }) {
  const title = `${story.title} — WritOn`;
  const description = shareDescription(story);
  const authorVisualUrl = safePublicImageUrl(story.authorAvatarUrl, story.coverImage);
  const ogImageUrl = safePublicImageUrl(story.coverImage, story.authorAvatarUrl);
  const authorInitials = String(story.authorName || 'WritOn')
    .trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  const effectiveOgImage = ogImageUrl || `${origin || 'https://writon.cc'}/assets/hero-banner.webp`;
  const imageMetadata = `<meta property="og:image" content="${escapeHtml(effectiveOgImage)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Cover artwork for ${escapeHtml(story.title)}"><meta name="twitter:image" content="${escapeHtml(effectiveOgImage)}">`;
  const authorVisual = authorVisualUrl
    ? `<img src="${escapeHtml(authorVisualUrl)}" alt="Portrait of ${escapeHtml(story.authorName)}" loading="lazy" decoding="async">`
    : `<div class="avatar-fallback" aria-hidden="true">${escapeHtml(authorInitials || 'W')}</div>`;
  const coverVisual = story.coverImage
    ? `<div class="cover-wrap"><img class="cover-img" src="${escapeHtml(story.coverImage)}" alt="Cover artwork for ${escapeHtml(story.title)}" loading="lazy" decoding="async"></div>`
    : '';
  const canonical = new URL(canonicalUrl);
  canonical.search = '';
  canonical.hash = '';
  const pureCanonicalUrl = canonical.toString();
  const storyLang = normalizeStoryLanguage(story.language || story.languageCode || story.language_code || 'en');
  const ogLocale = toOgLocale(storyLang);
  const playStoreTrackingUrl = `${playStoreUrl}?utm_source=google_search&utm_medium=story_web&utm_campaign=${encodeURIComponent(story.slug || 'story')}`;
  const appIntentUrl = `intent://${canonical.host}${canonical.pathname}#Intent;scheme=https;package=com.ibitvalley.writon;S.browser_fallback_url=${encodeURIComponent(playStoreTrackingUrl)};end`;

  const formattedBody = formatContentToHtml(story.content || story.summary || '');
  const publishedDateIso = new Date(story.publishedAt || story.createdAt || Date.now()).toISOString();
  const modifiedDateIso = new Date(story.updatedAt || story.publishedAt || story.createdAt || Date.now()).toISOString();

  // JSON-LD Schema.org Structured Data (BlogPosting + BreadcrumbList)
  const categoryName = story.category || 'Literature';
  const breadcrumbLd = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin || 'https://writon.cc'}/` },
      { '@type': 'ListItem', position: 2, name: categoryName, item: `${origin || 'https://writon.cc'}/stories?category=${encodeURIComponent(categoryName)}` },
      { '@type': 'ListItem', position: 3, name: story.title, item: pureCanonicalUrl }
    ]
  };

  const blogPostingLd = {
    '@type': 'BlogPosting',
    headline: story.title,
    description,
    articleBody: (story.content || story.summary || '').replace(/\s+/g, ' ').trim().slice(0, 5000),
    url: pureCanonicalUrl,
    mainEntityOfPage: pureCanonicalUrl,
    datePublished: publishedDateIso,
    dateModified: modifiedDateIso,
    articleSection: categoryName,
    author: {
      '@type': 'Person',
      name: story.authorName || 'WritOn Author',
      ...(story.authorPenName ? { url: `${origin || 'https://writon.cc'}/author/${encodeURIComponent(story.authorPenName)}` } : {})
    },
    publisher: {
      '@type': 'Organization',
      name: 'WritOn',
      url: origin || 'https://writon.cc',
      logo: `${origin || 'https://writon.cc'}/assets/writon_app_icon.png`,
      sameAs: [
        'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
        'https://github.com/Saurabh682/WritOn-PowerUp'
      ]
    }
  };
  if (ogImageUrl) {
    blogPostingLd.image = [ogImageUrl];
  }

  const softwareAppLd = {
    '@type': 'SoftwareApplication',
    name: 'WritOn',
    operatingSystem: 'Android',
    applicationCategory: 'BooksAndReferenceApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    url: origin || 'https://writon.cc',
    downloadUrl: playStoreUrl || 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
    sameAs: [
      'https://play.google.com/store/apps/details?id=com.ibitvalley.writon',
      'https://github.com/Saurabh682/WritOn-PowerUp'
    ]
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [breadcrumbLd, blogPostingLd, softwareAppLd]
  };

  return `<!doctype html>
<html lang="${escapeXml(storyLang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(pureCanonicalUrl)}">
  <link rel="alternate" hreflang="${escapeXml(storyLang)}" href="${pureCanonicalUrl}">
  <link rel="alternate" hreflang="x-default" href="${pureCanonicalUrl}">
  <link rel="alternate" type="application/rss+xml" title="WritOn — Stories &amp; Essays" href="${origin || 'https://writon.cc'}/feed.xml">
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
  <link rel="stylesheet" href="/stories/share.css">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="WritOn">
  <meta property="og:url" content="${escapeHtml(pureCanonicalUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${imageMetadata}
  <meta property="og:locale" content="${escapeXml(ogLocale)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
</head>
<body>
  <main>
    <article class="story">
      <header class="site-header" data-nosnippet style="display:flex; justify-content:space-between; align-items:baseline;">
        <a href="/stories" class="brand" style="text-decoration:none; color:inherit;">WritOn</a>
        <a href="/stories" style="font-size:13px; color:var(--muted); text-decoration:none; font-weight:600;">&larr; All Stories</a>
      </header>
      <p class="eyebrow">${escapeHtml(story.category || 'Story')}</p>
      <h1>${escapeHtml(story.title)}</h1>
      ${story.summary ? `<p class="summary">${escapeHtml(story.summary)}</p>` : ''}
      <div class="author">
        ${story.authorPenName ? `
        <a href="/author/${encodeURIComponent(story.authorPenName)}" class="author-link">
          ${authorVisual}
          <div>
            <p class="byline">Written by</p>
            <p class="author-name">${escapeHtml(story.authorName)} <span style="font-weight:400; color:var(--muted);">(@${escapeHtml(story.authorPenName)})</span></p>
          </div>
        </a>` : `
        ${authorVisual}
        <div>
          <p class="byline">Written by</p>
          <p class="author-name">${escapeHtml(story.authorName)}</p>
        </div>`}
      </div>

      ${coverVisual}

      <div class="story-body">
        ${formattedBody}
      </div>

      <div class="app-banner" data-nosnippet style="margin-top:48px; padding-top:24px; border-top:1px solid var(--line); display:flex; flex-wrap:wrap; align-items:center; gap:16px;">
        <a class="cta" href="${escapeHtml(appIntentUrl)}">Open in WritOn App</a>
        <a class="store-link" href="${escapeHtml(playStoreTrackingUrl)}" target="_blank" rel="noopener">Get the app on Google Play</a>
      </div>
      <footer class="story-footer" data-nosnippet>
        <p class="tagline">Words worth remembering.</p>
      </footer>
    </article>
  </main>

  <div class="sticky-app-bar" data-nosnippet>
    <div class="bar-text">Read smoothly in WritOn</div>
    <a class="bar-btn" href="${escapeHtml(appIntentUrl)}">Open App</a>
  </div>
</body>
</html>`;
}

export async function buildServer({ runtimeConfig, pool, auth, messaging } = {}) {
const fastify = Fastify({ logger: true });
const config = runtimeConfig ?? loadRuntimeConfig();
const serviceAccount = auth ? null : await loadFirebaseServiceAccount(config);
const firebaseApp = auth
  ? null
  : (getApps().length
    ? getApps()[0]
    : (serviceAccount
      ? initializeApp({ credential: cert(serviceAccount) })
      : initializeApp({ projectId: 'writon-app-2020' })));
const firebaseAuth = auth ?? (firebaseApp ? getAuth(firebaseApp) : null);
// On Google Cloud, Firebase Admin uses Application Default Credentials from the
// Cloud Run service identity. Render can continue supplying an explicit key.
const firebaseMessaging = messaging ?? (firebaseApp ? getMessaging(firebaseApp) : null);

const database = pool ?? new Pool({
  connectionString: config.databaseUrl,
  max: config.databasePoolMax,
  ssl: { rejectUnauthorized: false },
});


await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*'],
});

await fastify.register(helmet, {
  crossOriginResourcePolicy: false,
});

await fastify.register(multipart, {
  limits: { files: 1, fileSize: 10 * 1024 * 1024 },
});


  // OpenAPI 3.1.0 Specification for ChatGPT Custom GPT Actions & External Cloud Integrations
  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'WritOn Autonomous Publishing Platform API',
      description: 'Public API for publishing literary stories, reading platform feeds, triggering reader applauds, and leaving authentic comments across 100 diverse author personas. Zero authentication or API keys required.',
      version: '2.0.0'
    },
    servers: [
      { url: 'https://writon-api-802112841589.asia-south1.run.app', description: 'Google Cloud Run Production (Mumbai asia-south1)' },
      { url: 'https://writon-ab.onrender.com', description: 'Alternative Cloud Server (writon-AB)' },
      { url: 'https://writon-powerup.onrender.com', description: 'Alternative Server' },
      { url: 'http://localhost:3001', description: 'Local Server' }
    ],
    paths: {
      '/api/v1/feed': {
        get: {
          operationId: 'getReaderFeed',
          summary: 'Return a stable, human-only, language-aware reader feed',
          parameters: [
            { name: 'language', in: 'query', schema: { type: 'string', enum: ['en', 'hi', 'bn', 'mr', 'es', 'fr', 'ur', 'und'], default: 'en' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
            { name: 'cursor', in: 'query', schema: { type: 'string' } },
            { name: 'guestTopics', in: 'query', schema: { type: 'string' }, description: 'Optional bounded local guest topic vector.' },
            { name: 'guestAuthors', in: 'query', schema: { type: 'string' }, description: 'Optional bounded local guest author vector.' }
          ],
          responses: {
            '200': { description: 'Feed items, opaque cursor, session ID, and ranking version' },
            '400': { description: 'Invalid feed query' }
          }
        }
      },
      '/api/v1/feed/events': {
        post: {
          operationId: 'recordReaderFeedEvents',
          summary: 'Record idempotent, privacy-bounded feed impressions, opens, quick exits, and shares',
          responses: {
            '202': { description: 'Accepted and duplicate/rejected event counts' },
            '400': { description: 'Invalid event batch' },
            '401': { description: 'Firebase authentication is required' },
            '429': { description: 'Event rate limit exceeded' }
          }
        }
      },
      '/api/v1/me/milestones': {
        get: {
          operationId: 'getMyMilestones',
          summary: 'Return the authenticated reader or writer milestone journey',
          description: 'Calculates progress from verified app activity, records newly earned milestones idempotently, and excludes automated bot engagement from recognition totals.',
          responses: {
            '200': { description: 'Milestone definitions, progress, earned dates, new unlocks, and journey summary' },
            '401': { description: 'Firebase authentication is required' },
            '404': { description: 'Profile not found' }
          }
        }
      },
      '/api/v1/spark/feed': {
        get: {
          operationId: 'getFeed',
          summary: 'Retrieve recent published stories to inspect topics, categories, and author pen names for deduplication',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 8 }, description: 'Number of recent stories to inspect (1-30)' },
            { name: 'category', in: 'query', schema: { type: 'string', enum: PUBLISHABLE_STORY_CATEGORIES }, description: 'Optional canonical story-category filter.' }
          ],
          responses: {
            '200': {
              description: 'List of recently published stories with author metadata'
            }
          }
        }
      },
      '/api/v1/spark/publish': {
        post: {
          operationId: 'publishStory',
          summary: 'Publish a single literary story, poem, essay, or ghazal under an author persona',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    authorPenName: { type: 'string', description: 'Author pen name (e.g. "aarav_tech", "kavya_nair", "devansh_roy", or "auto" for most overdue writer)' },
                    title: { type: 'string', description: 'Compelling, human title under 120 chars' },
                    summary: { type: 'string', description: '1-2 sentence synopsis or hook' },
                    content: { type: 'string', description: 'Full literary text in Markdown format (400-800 words)' },
                    category: { type: 'string', enum: PUBLISHABLE_STORY_CATEGORIES, description: 'Canonical publishable story category.' },
                    coverImage: { type: 'string', description: 'Optional cover image URL' }
                  },
                  required: ['title', 'content']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Story published successfully'
            }
          }
        }
      },
      '/api/v1/spark/personas': {
        get: {
          operationId: 'listPersonas',
          summary: 'List active writer personas with their due status, cognitive lenses, categories, and bio',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Optional category filter' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Max personas to return' }
          ],
          responses: {
            '200': {
              description: 'List of personas'
            }
          }
        }
      },
      '/api/v1/spark/swarm/applaud': {
        post: {
          operationId: 'applaudStory',
          summary: 'Trigger an organic wave of 15-30 reader applauds on a story',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    postId: { type: 'string', description: 'Target post UUID or "latest"' },
                    count: { type: 'integer', description: 'Number of applauds (default 15-25)' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Reader applauds applied successfully' }
          }
        }
      },
      '/api/v1/spark/swarm/comment': {
        post: {
          operationId: 'commentStory',
          summary: 'Trigger authentic literary reflections and discussion from commenter personas',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    postId: { type: 'string', description: 'Target post UUID or "latest"' },
                    count: { type: 'integer', description: 'Number of comments (default 2-4)' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Comments posted successfully' }
          }
        }
      },
      '/api/v1/spark/ingest': {
        post: {
          operationId: 'batchIngest',
          summary: 'Atomic batch publishing of stories, comments, and applauds in a single call',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stories: { type: 'array', items: { type: 'object' } },
                    comments: { type: 'array', items: { type: 'object' } },
                    applauds: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Batch published successfully' }
          }
        }
      },
      '/api/v1/spark/pulse': {
        post: {
          operationId: 'triggerPulse',
          summary: 'Trigger an autonomous background editorial pulse cycle',
          responses: {
            '200': { description: 'Pulse outcome' }
          }
        }
      },
      '/api/v1/spark/bots/{id}/memories': {
        get: {
          operationId: 'getBotMemories',
          summary: 'Retrieve active episodic memories, past story continuity, reader feedback, and social affinity network for a bot persona',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Bot profile ID (e.g. "bot_aarav_tech", "bot_kavya_nair")' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 5 }, description: 'Number of memories to return' }
          ],
          responses: {
            '200': { description: 'Bot episodic memories and affinity network' }
          }
        }
      },
      '/api/v1/spark/reflect': {
        post: {
          operationId: 'triggerReflection',
          summary: 'Trigger an autonomous reflection cycle that analyzes engagement and consolidates new learnings into long-term memories',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    botId: { type: 'string', description: 'Optional specific bot ID to reflect upon' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Reflection results' }
          }
        }
      },
      '/api/v1/spark/ledger/briefing': {
        get: {
          operationId: 'getEditorialBriefing',
          summary: 'Retrieve real-time editorial briefing for today’s edition: author cooldowns, recent titles, anti-repetition avoid list, ideas backlog, and community balance',
          responses: {
            '200': { description: 'Current editorial briefing for AI runner / ChatGPT' }
          }
        }
      },
      '/api/v1/spark/ledger': {
        get: {
          operationId: 'getLedgerHistory',
          summary: 'Query historical editorial ledger entries by date or lifecycle status',
          parameters: [
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Edition date filter (YYYY-MM-DD)' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['planned', 'executed', 'deferred', 'avoid'] }, description: 'Lifecycle status filter' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 }, description: 'Page limit' },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Page offset' }
          ],
          responses: {
            '200': { description: 'Historical ledger entries' }
          }
        }
      },
      '/api/v1/spark/ledger/entries': {
        post: {
          operationId: 'recordLedgerEntry',
          summary: 'Record an entry in the persistent WritOn Editorial Ledger (planned, executed, deferred, or avoid)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    editionDate: { type: 'string', format: 'date' },
                    status: { type: 'string', enum: ['planned', 'executed', 'deferred', 'avoid'] },
                    entryType: { type: 'string', enum: ['publication', 'comment_wave', 'applaud_swarm', 'reflection', 'anti_repetition_rule', 'future_idea'] },
                    authorPenName: { type: 'string' },
                    genre: { type: 'string' },
                    languageStyle: { type: 'string' },
                    title: { type: 'string' },
                    theme: { type: 'string' },
                    approxWordCount: { type: 'integer' },
                    details: { type: 'object' },
                    avoidReason: { type: 'string' },
                    targetPostId: { type: 'string', format: 'uuid' }
                  },
                  required: ['status', 'entryType']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Ledger entry recorded' },
            '401': { description: 'Authentication required' }
          }
        }
      },
      '/api/v1/spark/ledger/entries/{id}/status': {
        patch: {
          operationId: 'updateLedgerEntryStatus',
          summary: 'Transition the lifecycle status of an existing editorial ledger entry',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Ledger entry UUID' }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['planned', 'executed', 'deferred', 'avoid'] },
                    targetPostId: { type: 'string', format: 'uuid' },
                    details: { type: 'object' },
                    avoidReason: { type: 'string' }
                  },
                  required: ['status']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Ledger entry status updated' },
            '401': { description: 'Authentication required' }
          }
        }
      },
      '/api/v1/spark/ledger/ideas': {
        post: {
          operationId: 'addIdeaToBacklog',
          summary: 'Add a new story premise or pitch to the editorial ideas backlog',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    targetAuthorPenName: { type: 'string' },
                    genre: { type: 'string' },
                    proposedTitle: { type: 'string' },
                    premise: { type: 'string' },
                    languageStyle: { type: 'string', default: 'English' }
                  },
                  required: ['proposedTitle', 'premise']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Idea added to backlog' },
            '401': { description: 'Authentication required' }
          }
        }
      },
      '/api/v1/spark/ledger/ideas/{id}/status': {
        patch: {
          operationId: 'updateBacklogIdeaStatus',
          summary: 'Transition a backlog idea status (backlog -> planned -> executed -> discarded)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Backlog idea UUID' }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['backlog', 'planned', 'executed', 'discarded'] }
                  },
                  required: ['status']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Backlog idea status updated' },
            '401': { description: 'Authentication required' }
          }
        }
      },
      '/api/v1/spark/ledger/avoid': {
        post: {
          operationId: 'addAntiRepetitionRule',
          summary: 'Add an anti-repetition rule or banned cliché pattern to editorial governance',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    patternType: { type: 'string', enum: ['title_formula', 'opening_phrase', 'overused_theme', 'cliche_phrase', 'interaction_formula'] },
                    pattern: { type: 'string' },
                    reason: { type: 'string' }
                  },
                  required: ['pattern']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Anti-repetition rule registered' },
            '401': { description: 'Authentication required' }
          }
        }
      },
      '/api/v1/editorial/state': {
        get: {
          operationId: 'getEditorialState',
          summary: 'Retrieve complete unified daily editorial state (today\'s stories, comments, applauds, writer cooldowns, avoid lists, and tomorrow\'s forecast)',
          parameters: [
            { name: 'date', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Optional edition date filter (YYYY-MM-DD)' }
          ],
          responses: {
            '200': { description: 'Full daily editorial state payload' }
          }
        },
        post: {
          operationId: 'submitEditorialState',
          summary: 'Submit an editorial batch, entry, idea, or avoid rule to update platform state',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    date: { type: 'string', format: 'date' },
                    entry: { type: 'object' },
                    entries: { type: 'array', items: { type: 'object' } },
                    ideas: { type: 'array', items: { type: 'object' } },
                    avoidRules: { type: 'array', items: { type: 'object' } },
                    statusUpdate: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Editorial state updated successfully' },
            '401': { description: 'Authentication required' }
          }
        }
      }
    }
  };

  const aiPluginManifest = {
    schema_version: 'v1',
    name_for_human: 'WritOn Publishing & Personas',
    name_for_model: 'writon_publishing',
    description_for_human: 'Autonomous editorial publishing, story discovery, and community interactions across 100 writer personas.',
    description_for_model: 'Publish stories, inspect feeds with anti-duplication, trigger 15-30 reader applauds, and leave thoughtful comments across 100 authentic writer personas.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: 'https://writon-powerup.onrender.com/openapi.json'
    },
    logo_url: 'https://writon-powerup.onrender.com/logo.png',
    contact_email: 'saurabh.682@gmail.com',
    legal_info_url: 'https://writon-powerup.onrender.com/privacy-policy'
  };

  fastify.get('/.well-known/ai-plugin.json', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    return aiPluginManifest;
  });
  fastify.get('/openapi.json', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    return openApiSpec;
  });
  fastify.get('/api/v1/openapi.json', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    return openApiSpec;
  });

  fastify.get('/', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    const acceptHeader = String(req.headers.accept || '').toLowerCase();

    // If request is from a web browser or Googlebot expecting HTML, render Discovery Deck
    if (acceptHeader.includes('text/html') || (!acceptHeader.includes('application/json') && !req.headers['x-api-key'])) {
      const origin = requestOrigin(req, config.publicApiBaseUrl);
      const playStoreUrl = config.playStoreAppUrl || 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon';

      const result = await database.query(`
        select
          p.title,
          p.slug,
          p.summary,
          p.category,
          p.reading_time_min as "readingTimeMin",
          p.likes_count as "likesCount",
          p.comments_count as "commentsCount",
          coalesce(p.published_at, p.created_at) as "publishedAt",
          author.full_name as "authorName",
          author.pen_name as "authorPenName"
        from public.posts p
        inner join public.profiles author on author.id = p.author_id
        where p.status = 'published' and p.is_public = true and p.slug is not null
        order by coalesce(p.published_at, p.created_at) desc
        limit 21
      `);

      const stories = result.rows.slice(0, 20);
      const hasMore = result.rows.length > 20;

      const html = renderDiscoveryDeckHtml({
        stories,
        totalCount: result.rows.length,
        category: null,
        origin,
        playStoreUrl,
        hasMore,
      });

      return reply
        .header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
        .type('text/html; charset=utf-8')
        .send(html);
    }

    return {
      name: 'WritOn Autonomous Publishing API',
      version: '2.0.0',
      status: 'online',
      cloud: 'Google Cloud Run (Mumbai asia-south1)',
      endpoints: {
        health: '/health',
        openApiSpecification: '/openapi.json',
        chatGptPluginManifest: '/.well-known/ai-plugin.json',
        feed: '/api/v1/spark/feed',
        personas: '/api/v1/spark/personas',
        publishStory: 'POST /api/v1/spark/publish'
      }
    };
  });

  fastify.get('/api/v1/spark/publish', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    return reply.code(200).send({
      message: 'The /api/v1/spark/publish endpoint accepts HTTP POST requests to publish stories.',
      method: 'POST',
      examplePayload: {
        authorPenName: 'aarav_tech',
        title: 'Story Title',
        summary: 'Brief synopsis',
        content: 'Full story markdown content...',
        category: 'Tech'
      },
      openApiSchemaUrl: '/openapi.json'
    });
  });

  fastify.get('/privacy-policy', async (req, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Privacy Policy - WritOn</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #2d3748; }
    h1 { color: #1a202c; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { color: #2b6cb0; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>Privacy Policy for WritOn</h1>
  <p><strong>Last Updated: August 30, 2026</strong></p>
  <p>WritOn ("we", "our", or "us") respects your privacy and is committed to protecting your personal data.</p>
  <h2>1. Information We Collect</h2>
  <p>We collect basic profile information (such as pen name, bio, and avatar) and authentication tokens required to securely identify you across devices. For signed-in readers, limited reading signals such as opens, engaged time, progress, bookmarks, rereads, comments, follows, shares, and quick exits support recommendations. Guest preferences remain in local app storage and are not tied to a persistent server-side guest identity.</p>
  <h2>2. How We Use Information</h2>
  <p>Your data is used solely to provide and improve the WritOn reading and publishing platform, deliver notifications, and enable literary community discussions.</p>
  <h2>3. Data Security & Retention</h2>
  <p>We use industry-standard encryption and security measures. Raw signed-in feed events are retained for up to 90 days, feed exposures for up to 30 days, and aggregate preferences until account deletion. Account deletion removes reader-learning data. We do not sell or monetize your personal data with third-party advertisers.</p>
  <h2>4. Personalization Safeguards</h2>
  <p>Recommendations admit verified human-authored stories only. Bot, system, test, and suspicious activity is excluded from ranking quality. Campaign analytics do not include story text, author identity, email, profile name, authentication tokens, device fingerprints, or raw reading history.</p>
  <h2>5. Contact Us</h2>
  <p>If you have any questions, contact us at: <a href="mailto:saurabh.682@gmail.com">saurabh.682@gmail.com</a></p>
</body>
</html>`;
  });

  fastify.get('/terms', async (req, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Terms of Service - WritOn</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #2d3748; }
    h1 { color: #1a202c; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    h2 { color: #2b6cb0; margin-top: 24px; }
  </style>
</head>
<body>
  <h1>Terms of Service for WritOn</h1>
  <p><strong>Last Updated: August 28, 2026</strong></p>
  <p>By using the WritOn application and services, you agree to these Terms of Service.</p>
  <h2>1. Platform Content & Intellectual Property</h2>
  <p>Writers retain ownership of original literary stories, poems, and essays published on WritOn.</p>
  <h2>2. Community Conduct</h2>
  <p>Users must engage respectfully. Hate speech, harassment, spam, or malicious behavior is strictly prohibited.</p>
  <h2>3. Contact</h2>
  <p>For questions or support, contact: <a href="mailto:saurabh.682@gmail.com">saurabh.682@gmail.com</a></p>
</body>
</html>`;
  });

function mediaObjectPath(key) {
  return key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function publicMediaBaseUrl(request) {
  if (config.publicApiBaseUrl) return new URL(config.publicApiBaseUrl).origin;
  if (!request) return 'https://api.writon.cc';
  const forwardedProto = request.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0] : request.protocol;
  return `${protocol}://${request.headers.host}`;
}

function publicMediaUrl(request, key) {
  return `${publicMediaBaseUrl(request)}/api/v1/media/${encodeURIComponent(key)}`;
}

function normalizeStoredAvatarUrl(value) {
  if (value == null) return null;
  const key = profileMediaKeyFromUrl(value, config.publicApiBaseUrl);
  return key ? publicMediaUrl(null, key) : null;
}

function normalizeAvatarInput(value) {
  if (value === null) return { success: true, value: null, key: null };
  const key = profileMediaKeyFromUrl(value, config.publicApiBaseUrl);
  return key
    ? { success: true, value: publicMediaUrl(null, key), key }
    : { success: false, value: null, key: null };
}

function assertStorageConfigured(reply) {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    reply.code(503).send({ error: 'Media uploads are not configured yet.' });
    return false;
  }
  return true;
}

async function createSignedMediaUrl(key) {
  const response = await fetch(
    `${config.supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(config.supabaseStorageBucket)}/${mediaObjectPath(key)}`,
    {
      method: 'POST',
      headers: supabaseStorageHeaders(config.supabaseServiceRoleKey, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ expiresIn: 3600 }),
    }
  );
  if (!response.ok) throw new Error(`Supabase Storage signing failed (${response.status})`);
  const payload = await response.json();
  const signedPath = payload.signedURL || payload.signedUrl;
  if (!signedPath) throw new Error('Supabase Storage did not return a signed URL.');
  return new URL(signedPath, config.supabaseUrl).toString();
}

function requiresAuthenticatedMediaProxy(key) {
  // Supabase currently signs keys containing ':' but rejects the resulting
  // download path as invalid. Imported WritOn profile IDs use a legacy:<id>
  // form, so keep those existing objects readable without exposing the
  // server-side storage credential.
  return key.split('/')[1]?.includes(':') === true;
}

async function fetchAuthenticatedMedia(key) {
  return fetch(
    `${config.supabaseUrl}/storage/v1/object/authenticated/${encodeURIComponent(config.supabaseStorageBucket)}/${mediaObjectPath(key)}`,
    { headers: supabaseStorageHeaders(config.supabaseServiceRoleKey) }
  );
}

async function deleteMediaKeys(keys) {
  const validKeys = [...new Set(keys.filter((key) => profileMediaKeyPattern.test(key)))];
  if (validKeys.length === 0) return;
  const response = await fetch(
    `${config.supabaseUrl}/storage/v1/object/${encodeURIComponent(config.supabaseStorageBucket)}`,
    {
      method: 'DELETE',
      headers: supabaseStorageHeaders(config.supabaseServiceRoleKey, {
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ prefixes: validKeys }),
    }
  );
  if (!response.ok) throw new Error(`Supabase Storage deletion failed (${response.status})`);
}

async function deleteProfileMedia(profileId) {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) return;
  if (!/^[A-Za-z0-9:_-]+$/.test(profileId)) {
    throw new Error('Profile identifier cannot be mapped to a storage prefix.');
  }
  const prefix = `profiles/${profileId}/`;
  const pageSize = 1_000;
  const keys = [];
  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(
      `${config.supabaseUrl}/storage/v1/object/list/${encodeURIComponent(config.supabaseStorageBucket)}`,
      {
        method: 'POST',
        headers: supabaseStorageHeaders(config.supabaseServiceRoleKey, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ prefix, limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' } }),
      }
    );
    if (!response.ok) throw new Error(`Supabase Storage listing failed (${response.status})`);
    const objects = await response.json();
    if (!Array.isArray(objects)) throw new Error('Supabase Storage returned an invalid object list.');
    for (const object of objects) {
      const name = typeof object?.name === 'string' ? object.name.replace(/^\/+/, '') : '';
      const key = name.startsWith(prefix) ? name : `${prefix}${name}`;
      if (profileMediaKeyPattern.test(key)) keys.push(key);
    }
    if (objects.length < pageSize) break;
  }
  for (let index = 0; index < keys.length; index += pageSize) {
    await deleteMediaKeys(keys.slice(index, index + pageSize));
  }
}

async function requireUser(request, reply) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return reply.code(401).send({
      error: 'Authentication required',
    });
  }

  if (!firebaseAuth) {
    return reply.code(503).send({ error: 'Auth service unconfigured' });
  }

  try {
    request.user = await firebaseAuth.verifyIdToken(
      authorization.substring('Bearer '.length)
    );
  } catch {
    return reply.code(401).send({
      error: 'Invalid or expired Firebase token',
    });
  }

  try {
    request.profileId = await resolveProfileId(request.user);
  } catch (error) {
    request.log.error({ err: error }, 'Could not resolve the canonical WritOn profile');
    return reply.code(error.statusCode ?? 500).send({
      error: error.statusCode === 409
        ? error.message
        : 'Your WritOn profile could not be loaded. Please try again shortly.',
    });
  }
}

async function optionalUser(request) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ') || !firebaseAuth) {
    return null;
  }

  try {
    const user = await firebaseAuth.verifyIdToken(
      authorization.substring('Bearer '.length)
    );
    return { ...user, profileId: await resolveProfileId(user) };
  } catch {
    // A feed is public; an expired session must not prevent people browsing it.
    return null;
  }
}


function postSelectSql(whereClause, extraColumns = '', includeContent = true) {
  return `select
    p.id::text as id,
    p.title,
    p.slug,
    p.summary,
    ${includeContent ? 'p.content' : "''::text"} as content,
    p.category,
    p.language_code as "languageCode",
    p.cover_image_url as "coverImage",
    p.reading_time_min as "readingTimeMin",
    p.likes_count as "likesCnt",
    (select count(*)::int from public.comments c where c.post_id = p.id) as "commentsCnt",
    p.bookmarks_count as "bookmarksCnt",
    coalesce(p.published_at, p.created_at) as "createdAt"
    ${extraColumns},
    json_build_object(
      'id', author.id,
      'penName', author.pen_name,
      'fullName', author.full_name,
      'avatarUrl', author.avatar_url,
      'bio', author.bio,
      'quoteOfDay', alias.quote_of_day,
      'followersCnt', author.followers_count,
      'followingCnt', author.following_count
    ) as author,
    exists(
      select 1 from public.post_applauds applause
      where applause.post_id = p.id and applause.user_id = $1
    ) as "isLiked",
    exists(
      select 1 from public.bookmarks bookmark
      where bookmark.post_id = p.id and bookmark.user_id = $1
    ) as "isBookmarked",
    exists(
      select 1 from public.follows follow
      where follow.follower_id = $1 and follow.following_id = author.id
    ) as "isFollowingAuthor"
  from public.posts p
  inner join public.profiles author on author.id = p.author_id
  left join public.legacy_import_profile_attributes alias on alias.profile_id = author.id
  ${whereClause}`;
}

function toAuthor(row) {
  return {
    id: row.id,
    penName: row.pen_name,
    fullName: row.full_name,
    avatarUrl: normalizeStoredAvatarUrl(row.avatar_url),
    bio: row.bio,
    quoteOfDay: row.quote_of_day ?? null,
    followersCnt: row.followers_count,
    followingCnt: row.following_count,
  };
}

function toReaderPost(row) {
  if (!row || typeof row !== 'object' || !row.author || typeof row.author !== 'object') return row;
  const rawContent = row.content || '';
  const cleanContent = stripWatermark(rawContent);
  return {
    ...row,
    language: row.languageCode || row.language || 'en',
    content: cleanContent || row.content,
    author: {
      ...row.author,
      avatarUrl: normalizeStoredAvatarUrl(row.author.avatarUrl),
    },
  };
}

function toReaderComment(row) {
  if (!row || typeof row !== 'object' || !row.author || typeof row.author !== 'object') return row;
  return {
    ...row,
    author: {
      ...row.author,
      avatarUrl: normalizeStoredAvatarUrl(row.author.avatarUrl),
    },
  };
}


function createSlug(title) {
  const readablePart = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'story';

  return `${readablePart}-${randomUUID().slice(0, 8)}`;
}

function calculateReadingTime(content) {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function parsePostId(request, reply) {
  const postId = postIdSchema.safeParse(request.params.id ?? request.params.postId);
  if (!postId.success) {
    reply.code(400).send({ error: 'Invalid story identifier' });
    return null;
  }
  return postId.data;
}

function parseProfileIdentifier(request, reply) {
  const identifier = profileIdentifierSchema.safeParse(request.params.idOrPenName ?? request.params.id);
  if (!identifier.success) {
    reply.code(400).send({ error: 'Invalid profile identifier' });
    return null;
  }
  return identifier.data;
}

async function fetchInteractionPost(client, postId, userId) {
  const result = await client.query(
    `select id, author_id, likes_count, bookmarks_count, comments_count
     from public.posts
     where id = $1 and status = 'published' and is_public = true
     for update`,
    [postId]
  );
  return result.rows[0] ?? null;
}

async function shouldNotifyFirstHumanApplause(client, { postId, actorId }) {
  const result = await client.query(
    `select exists (
       select 1
       from public.posts post
       inner join public.profiles actor on actor.id = $2
       where post.id = $1
         and post.provenance = 'human_verified'
         and actor.account_type = 'human'
         and not exists (
           select 1 from public.notifications prior
           where prior.post_id = post.id and prior.kind in ('applaud', 'first_applause')
         )
         and 1 = (
           select count(*)::int
           from public.post_applauds applause
           inner join public.profiles reader
             on reader.id = applause.user_id and reader.account_type = 'human'
           where applause.post_id = post.id
         )
     ) as eligible`,
    [postId, actorId]
  );
  return result.rows[0]?.eligible === true;
}

async function togglePostRelation({ postId, userId, table, counterColumn }) {
  const client = await database.connect();

  try {
    await client.query('begin');
    const post = await fetchInteractionPost(client, postId, userId);
    if (!post) {
      await client.query('rollback');
      return null;
    }

    const existing = await client.query(
      `select 1 from public.${table} where post_id = $1 and user_id = $2`,
      [postId, userId]
    );

    const enabled = existing.rowCount === 0;
    if (enabled) {
      await client.query(
        `insert into public.${table} (post_id, user_id) values ($1, $2)`,
        [postId, userId]
      );
    } else {
      await client.query(
        `delete from public.${table} where post_id = $1 and user_id = $2`,
        [postId, userId]
      );
    }

    const updated = await client.query(
      `update public.posts
       set ${counterColumn} = greatest(${counterColumn} + $2, 0), updated_at = now()
       where id = $1
       returning ${counterColumn} as count`,
      [postId, enabled ? 1 : -1]
    );
    if (enabled && table === 'post_applauds'
        && await shouldNotifyFirstHumanApplause(client, { postId, actorId: userId })) {
      await createNotification(client, {
        recipientId: post.author_id,
        actorId: userId,
        postId,
        kind: 'first_applause',
        message: 'gave your story its first applause',
        deduplicationKey: `first_applause:${postId}`,
      });
    }
    await client.query('commit');
    await deliverPushAfterCommit();

    return { enabled, count: updated.rows[0].count };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function setPostRelation({ postId, userId, table, counterColumn, enabled }) {
  const client = await database.connect();

  try {
    await client.query('begin');
    const post = await fetchInteractionPost(client, postId, userId);
    if (!post) {
      await client.query('rollback');
      return null;
    }

    const changed = enabled
      ? await client.query(
        `insert into public.${table} (post_id, user_id)
         values ($1, $2)
         on conflict (post_id, user_id) do nothing
         returning true as inserted`,
        [postId, userId]
      )
      : await client.query(
        `delete from public.${table}
         where post_id = $1 and user_id = $2
         returning true as removed`,
        [postId, userId]
      );

    const updated = await client.query(
      `update public.posts
       set ${counterColumn} = (
             select count(*)::int from public.${table} relation where relation.post_id = $1
           ),
           updated_at = now()
       where id = $1
       returning ${counterColumn} as count`,
      [postId]
    );

    if (enabled && changed.rowCount > 0 && table === 'post_applauds'
        && await shouldNotifyFirstHumanApplause(client, { postId, actorId: userId })) {
      await createNotification(client, {
        recipientId: post.author_id,
        actorId: userId,
        postId,
        kind: 'first_applause',
        message: 'gave your story its first applause',
        deduplicationKey: `first_applause:${postId}`,
      });
    }
    await client.query('commit');
    await deliverPushAfterCommit();

    return { enabled, count: updated.rows[0].count };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function createNotification(client, {
  recipientId,
  actorId,
  postId = null,
  commentId = null,
  kind,
  message,
  deduplicationKey = null,
}) {
  if (!recipientId || recipientId === actorId) return;

  const inserted = await client.query(
    `insert into public.notifications (
       recipient_id, actor_id, post_id, comment_id, kind, message, deduplication_key
     ) values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (deduplication_key) where deduplication_key is not null do nothing
     returning id::text as id`,
    [recipientId, actorId, postId, commentId, kind, message, deduplicationKey]
  );
  if (inserted.rowCount === 0) return;

  try {
    const preferenceExpression = {
      first_applause: 'coalesce(first_applause_enabled, interactions_enabled)',
      applaud: 'coalesce(first_applause_enabled, interactions_enabled)',
      comment: 'coalesce(comments_replies_enabled, interactions_enabled)',
      reply: 'coalesce(comments_replies_enabled, interactions_enabled)',
      new_follower: 'coalesce(new_followers_enabled, follows_enabled)',
      follow: 'coalesce(new_followers_enabled, follows_enabled)',
      followed_writer_published: 'coalesce(followed_writer_published_enabled, publishing_enabled)',
      publishing: 'coalesce(followed_writer_published_enabled, publishing_enabled)',
      reading_nudge: 'coalesce(reading_nudges_enabled, editorial_enabled)',
      draft_nudge: 'coalesce(draft_nudges_enabled, editorial_enabled)',
      weekly_prompt_live: 'coalesce(weekly_prompt_enabled, editorial_enabled)',
      daily_digest: 'coalesce(daily_digest_enabled, editorial_enabled)',
      editorial: 'editorial_enabled',
    }[kind] ?? 'interactions_enabled';
    const preference = await client.query(
      `select ${preferenceExpression} as enabled
         from public.notification_preferences
        where profile_id = $1`,
      [recipientId]
    );
    if (preference.rowCount > 0 && preference.rows[0].enabled === false) return;

    await client.query(
      `insert into public.notification_delivery_outbox (notification_id, recipient_id)
       values ($1, $2)
       on conflict (notification_id) do nothing`,
      [inserted.rows[0].id, recipientId]
    );
  } catch (error) {
    // A deployment may reach the API a few seconds before its SQL migration.
    // The in-app notification already exists, so never roll back the social action.
    if (error?.code === '42P01') {
      console.warn('Push delivery migration has not been applied; retained in-app notification only.');
      return;
    }
    throw error;
  }
}

function retryDelayMs(attempts) {
  return Math.min(15 * 60 * 1000, 30 * 1000 * (2 ** Math.max(0, attempts - 1)));
}

function isInvalidPushToken(error) {
  return error?.code === 'messaging/registration-token-not-registered'
    || error?.code === 'messaging/invalid-registration-token';
}

async function deliverPendingPushNotifications({ limit = 20, maxSeconds = 20 } = {}) {
  if (!firebaseMessaging) return { processed: 0, remaining: 0, reason: 'Firebase Messaging is not configured.' };

  const startTime = Date.now();
  const maxDurationMs = maxSeconds * 1000;

  const claimed = await database.query(
    `with candidates as (
       select id
         from public.notification_delivery_outbox
        where status = 'pending' and next_attempt_at <= now()
        order by created_at asc
        limit $1
        for update skip locked
     )
     update public.notification_delivery_outbox delivery
        set status = 'sending', attempts = attempts + 1, updated_at = now()
       from candidates
      where delivery.id = candidates.id
     returning delivery.id::text as id, delivery.notification_id::text as "notificationId",
               delivery.recipient_id as "recipientId", delivery.attempts`,
    [limit]
  );

  let processedCount = 0;
  try {
    for (const delivery of claimed.rows) {
      if (Date.now() - startTime >= maxDurationMs) {
        break;
      }
      processedCount += 1;
      try {

        const notification = await database.query(
          `select notification.kind, notification.message, notification.post_id::text as "postId",
                  post.title as "postTitle", actor.full_name as "actorName"
             from public.notifications notification
             left join public.posts post on post.id = notification.post_id
             left join public.profiles post_author on post_author.id = post.author_id
             left join public.profiles actor on actor.id = notification.actor_id
            where notification.id = $1
              and (
                notification.post_id is null
                or (
                  post.status = 'published'
                  and post.is_public = true
                  and post.provenance = 'human_verified'
                  and post_author.account_type = 'human'
                )
              )`,
          [delivery.notificationId]
        );
        const tokens = await database.query(
          `select id::text as id, token
             from public.device_push_tokens
            where profile_id = $1
              and revoked_at is null
              and notification_permission = 'granted'`,
          [delivery.recipientId]
        );
        if (notification.rowCount === 0 || tokens.rowCount === 0) {
          await database.query(
            `update public.notification_delivery_outbox
                set status = 'skipped', updated_at = now(), last_error = null
              where id = $1`,
            [delivery.id]
          );
          continue;
        }

        const item = notification.rows[0];
        const title = item.actorName
          ? `${item.actorName} ${item.message}`
          : 'New activity on WritOn';
        const body = item.postTitle
          ? `“${item.postTitle}”`
          : item.kind === 'follow'
            ? 'A new reader found your writing.'
            : 'Open WritOn to see the latest activity.';
        const outcomes = await Promise.all(tokens.rows.map(async (tokenRow) => {
          try {
            await firebaseMessaging.send({
              token: tokenRow.token,
              notification: { title, body },
              data: {
                notificationId: delivery.notificationId,
                kind: String(item.kind),
                storyId: item.postId || '',
                storyTitle: item.postTitle || '',
                actorName: item.actorName || '',
                targetRoute: item.postId ? `reader/${item.postId}` : 'notifications',
              },
              fcmOptions: {
                analyticsLabel: toFcmAnalyticsLabel('interaction', item.kind),
              },
              android: {
                priority: 'high',
                notification: {
                  channelId: 'writon_interactions_channel',
                  icon: 'ic_stat_writon',
                  color: '#E75A2A',
                },
                fcmOptions: {
                  analyticsLabel: toFcmAnalyticsLabel('interaction', item.kind),
                },
              },
            });
            return { delivered: true, tokenRow };
          } catch (error) {
            return { delivered: false, tokenRow, error };
          }
        }));

        const invalidTokens = outcomes.filter((outcome) => !outcome.delivered && isInvalidPushToken(outcome.error));
        await Promise.all(invalidTokens.map((outcome) => database.query(
          `update public.device_push_tokens set revoked_at = now(), updated_at = now() where id = $1`,
          [outcome.tokenRow.id]
        )));
        if (outcomes.some((outcome) => outcome.delivered)) {
          await database.query(
            `update public.notification_delivery_outbox
                set status = 'sent', delivered_at = now(), updated_at = now(), last_error = null
              where id = $1`,
            [delivery.id]
          );
        } else if (invalidTokens.length === outcomes.length) {
          await database.query(
            `update public.notification_delivery_outbox
                set status = 'skipped', updated_at = now(), last_error = 'All registered tokens are invalid.'
              where id = $1`,
            [delivery.id]
          );
        } else {
          const delay = retryDelayMs(delivery.attempts);
          await database.query(
            `update public.notification_delivery_outbox
                set status = 'pending', next_attempt_at = now() + ($2 * interval '1 millisecond'),
                    updated_at = now(), last_error = 'FCM delivery failed and will retry.'
              where id = $1`,
            [delivery.id, delay]
          );
        }
      } catch (error) {
        const delay = retryDelayMs(delivery.attempts);
        await database.query(
          `update public.notification_delivery_outbox
              set status = 'pending', next_attempt_at = now() + ($2 * interval '1 millisecond'),
                  updated_at = now(), last_error = left($3, 500)
            where id = $1`,
          [delivery.id, delay, error instanceof Error ? error.message : 'Unknown push delivery error']
        );
      }
    }
  } finally {
    const unhandled = claimed.rows.slice(processedCount);
    if (unhandled.length > 0) {
      try {
        await database.query(
          `update public.notification_delivery_outbox
              set status = 'pending', attempts = greatest(0, attempts - 1), updated_at = now()
            where id = any($1::uuid[]) and status = 'sending'`,
          [unhandled.map((d) => d.id)]
        );
      } catch {}
    }
  }
  let remaining = 0;

  try {
    const remResult = await database.query(
      `select count(*)::int as remaining from public.notification_delivery_outbox where status = 'pending' and next_attempt_at <= now()`
    );
    remaining = remResult.rows[0]?.remaining ?? 0;
  } catch {}
  return { processed: processedCount, remaining };
}


async function deliverPushAfterCommit() {
  try {
    // Keep the mutation response bounded: one request delivers at most one
    // pending notification while the scheduled/worker path drains larger batches.
    const outcome = await deliverPendingPushNotifications({ limit: 1 });
    if (outcome.processed > 0) {
      fastify.log.info(outcome, 'Processed push notification delivery work after commit');
    }
  } catch (error) {
    // The user-visible interaction is already committed. Preserve that successful
    // response while the durable outbox retains retryable delivery work.
    fastify.log.error({ err: error }, 'Push notification delivery after commit failed');
  }
}

function parseCollectionQuery(request, reply, schema = collectionQuerySchema) {
  const parsed = schema.safeParse(request.query);
  if (!parsed.success) {
    reply.code(400).send({
      error: 'Invalid collection query',
      details: parsed.error.flatten().fieldErrors,
    });
    return null;
  }
  return parsed.data;
}

function toProfile(row) {
  return {
    id: row.id,
    email: row.email,
    penName: row.pen_name,
    fullName: row.full_name,
    bio: row.bio,
    avatarUrl: normalizeStoredAvatarUrl(row.avatar_url),
    location: row.location,
    quoteOfDay: row.quote_of_day ?? null,
    joinedAt: row.joined_at,
    followersCount: row.followers_count,
    followingCount: row.following_count,
    storiesCount: Number(row.stories_count ?? 0),
    applaudsReceived: Number(row.applauds_received ?? 0),
  };
}

const profileReturningColumns = `
  id, email, pen_name, full_name, bio, avatar_url, location, joined_at,
  followers_count, following_count,
  (select attributes.quote_of_day
   from public.legacy_import_profile_attributes attributes
   where attributes.profile_id = public.profiles.id) as quote_of_day,
  coalesce((
    select count(*) from public.posts post
    where post.author_id = public.profiles.id and post.status = 'published'
  ), 0) as stories_count,
  coalesce((
    select sum(post.likes_count) from public.posts post
    where post.author_id = public.profiles.id and post.status = 'published'
  ), 0) as applauds_received`;

function normalizedVerifiedEmail(decodedToken) {
  if (decodedToken.email_verified !== true || typeof decodedToken.email !== 'string') {
    return null;
  }

  const email = decodedToken.email.trim().toLowerCase();
  return email && !email.endsWith('@legacy.writon.io') ? email : null;
}

/**
 * Legacy imports suffix duplicate Gmail addresses with `+legacy-…`. Gmail delivers
 * those aliases to the original mailbox, so a Firebase-verified Gmail address is
 * safe evidence for the original account. Other providers retain exact matching.
 */
function legacyGmailAliasPattern(verifiedEmail) {
  const [local, domain] = verifiedEmail.split('@');
  if (!local || !['gmail.com', 'googlemail.com'].includes(domain)) return null;
  return `${local}+legacy-%@${domain}`;
}

/**
 * Claims a single, email-proven legacy Gmail profile for a Firebase account.
 *
 * Returning readers may have already created a temporary Firebase-ID profile
 * and performed low-risk interactions before the next profile sync.  Those
 * interactions belong to the same verified email identity and are moved to
 * the canonical legacy profile.  We deliberately refuse to merge accounts
 * that have authored content, comments, or bot configuration: those need an
 * explicit support-assisted merge rather than an automatic claim.
 */
async function reclaimLegacyGmailProfile(firebaseUid, verifiedEmail) {
  const aliasPattern = legacyGmailAliasPattern(verifiedEmail);
  if (!aliasPattern) return null;

  const client = await database.connect();
  let transactionOpen = false;
  try {
    await client.query('begin');
    transactionOpen = true;

    const legacyMatches = await client.query(
      `select id from public.profiles
       where id like 'legacy:%' and lower(btrim(email)) like $1
       limit 2
       for update`,
      [aliasPattern]
    );
    if (legacyMatches.rowCount !== 1) {
      await client.query('rollback');
      transactionOpen = false;
      return null;
    }

    const legacyProfileId = legacyMatches.rows[0].id;
    const targetIdentity = await client.query(
      `select firebase_uid from public.profile_auth_identities
       where profile_id = $1
       for update`,
      [legacyProfileId]
    );
    if (targetIdentity.rowCount > 0 && targetIdentity.rows[0].firebase_uid !== firebaseUid) {
      throw createIdentityConflictError();
    }

    const sourceProfile = await client.query(
      `select id from public.profiles where id = $1 for update`,
      [firebaseUid]
    );

    if (sourceProfile.rowCount > 0) {
      const sourceHasAuthoredContent = await client.query(
        `select exists (select 1 from public.posts where author_id = $1)
                  or exists (select 1 from public.comments where author_id = $1)
                  or exists (select 1 from public.bot_configs where id = $1)
                  as "hasAuthoredContent"`,
        [firebaseUid]
      );
      if (sourceHasAuthoredContent.rows[0]?.hasAuthoredContent) {
        await client.query('rollback');
        transactionOpen = false;
        return null;
      }

      await client.query(
        `insert into public.post_applauds (post_id, user_id, created_at)
         select post_id, $2, created_at from public.post_applauds where user_id = $1
         on conflict (post_id, user_id) do nothing`,
        [firebaseUid, legacyProfileId]
      );
      await client.query('delete from public.post_applauds where user_id = $1', [firebaseUid]);

      await client.query(
        `insert into public.bookmarks (post_id, user_id, created_at)
         select post_id, $2, created_at from public.bookmarks where user_id = $1
         on conflict (post_id, user_id) do nothing`,
        [firebaseUid, legacyProfileId]
      );
      await client.query('delete from public.bookmarks where user_id = $1', [firebaseUid]);

      await client.query(
        `insert into public.reading_history (
           user_id, post_id, progress, read_seconds, first_read_at, last_read_at, created_at, updated_at
         )
         select $2, post_id, progress, read_seconds, first_read_at, last_read_at, created_at, updated_at
         from public.reading_history where user_id = $1
         on conflict (user_id, post_id) do update
           set progress = greatest(public.reading_history.progress, excluded.progress),
               read_seconds = public.reading_history.read_seconds + excluded.read_seconds,
               first_read_at = least(public.reading_history.first_read_at, excluded.first_read_at),
               last_read_at = greatest(public.reading_history.last_read_at, excluded.last_read_at),
               updated_at = now()`,
        [firebaseUid, legacyProfileId]
      );
      await client.query('delete from public.reading_history where user_id = $1', [firebaseUid]);

      await client.query(
        `insert into public.follows (follower_id, following_id, created_at)
         select $2, following_id, created_at from public.follows
         where follower_id = $1 and following_id <> $2
         on conflict (follower_id, following_id) do nothing`,
        [firebaseUid, legacyProfileId]
      );
      await client.query(
        `insert into public.follows (follower_id, following_id, created_at)
         select follower_id, $2, created_at from public.follows
         where following_id = $1 and follower_id <> $2
         on conflict (follower_id, following_id) do nothing`,
        [firebaseUid, legacyProfileId]
      );
      await client.query('delete from public.follows where follower_id = $1 or following_id = $1', [firebaseUid]);

      await client.query(
        `update public.notifications
         set recipient_id = case when recipient_id = $1 then $2 else recipient_id end,
             actor_id = case when actor_id = $1 then $2 else actor_id end
         where recipient_id = $1 or actor_id = $1`,
        [firebaseUid, legacyProfileId]
      );
      await client.query('update public.bot_activity_logs set target_user_id = $2 where target_user_id = $1', [firebaseUid, legacyProfileId]);
      await client.query('update public.bot_delayed_actions set target_user_id = $2 where target_user_id = $1', [firebaseUid, legacyProfileId]);
    }

    await client.query(
      `insert into public.profile_auth_identities (firebase_uid, profile_id)
       values ($1, $2)
       on conflict (firebase_uid) do update
         set profile_id = excluded.profile_id, updated_at = now()`,
      [firebaseUid, legacyProfileId]
    );

    if (sourceProfile.rowCount > 0) {
      await client.query('delete from public.profiles where id = $1', [firebaseUid]);
    }

    await client.query(
      `update public.profiles
       set email = $2,
           followers_count = (select count(*)::int from public.follows where following_id = $1),
           following_count = (select count(*)::int from public.follows where follower_id = $1),
           updated_at = now()
       where id = $1`,
      [legacyProfileId, verifiedEmail]
    );

    await client.query('commit');
    transactionOpen = false;
    return legacyProfileId;
  } catch (error) {
    if (transactionOpen) await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

function createIdentityConflictError() {
  const error = new Error('This WritOn profile is already linked to another sign-in account.');
  error.statusCode = 409;
  return error;
}

async function resolveProfileId(decodedToken) {
  const firebaseUid = decodedToken.uid;
  const linkedIdentity = await database.query(
    `select profile_id from public.profile_auth_identities where firebase_uid = $1`,
    [firebaseUid]
  );
  const verifiedEmail = normalizedVerifiedEmail(decodedToken);
  if (linkedIdentity.rowCount > 0) {
    const linkedProfileId = linkedIdentity.rows[0].profile_id;
    const legacyProfileId = linkedProfileId === firebaseUid && verifiedEmail
      ? await reclaimLegacyGmailProfile(firebaseUid, verifiedEmail)
      : null;

    if (!legacyProfileId) return linkedProfileId;
    return legacyProfileId;
  }

  let profileId = firebaseUid;
  if (verifiedEmail) {
    const emailMatches = await database.query(
      `select id
       from public.profiles
       where lower(btrim(email)) = $1
         and lower(btrim(email)) not like '%@legacy.writon.io'
       limit 2`,
      [verifiedEmail]
    );

    // Only a single exact, Firebase-verified email match can claim legacy data.
    // Ambiguous records remain untouched instead of risking an account takeover.
    if (emailMatches.rowCount === 1) {
      profileId = emailMatches.rows[0].id;
    }

    // A legacy import can hold Gmail duplicates under a +legacy suffix. Claiming
    // requires Firebase's verified email and preserves low-risk activity that a
    // returning reader may have performed before their second profile sync.
    if (profileId === firebaseUid) {
      const reclaimedProfileId = await reclaimLegacyGmailProfile(firebaseUid, verifiedEmail);
      if (reclaimedProfileId) return reclaimedProfileId;
    }
  }

  if (profileId === firebaseUid) {
    await ensureProfileForId(decodedToken, profileId);
  }

  try {
    const createdIdentity = await database.query(
      `insert into public.profile_auth_identities (firebase_uid, profile_id)
       values ($1, $2)
       on conflict (firebase_uid) do update
         set profile_id = public.profile_auth_identities.profile_id,
             updated_at = public.profile_auth_identities.updated_at
       returning profile_id`,
      [firebaseUid, profileId]
    );
    return createdIdentity.rows[0].profile_id;
  } catch (error) {
    if (error.code === '23505') throw createIdentityConflictError();
    throw error;
  }
}

async function ensureProfileForId(decodedToken, profileId) {
  const fallbackPenName = `writer_${decodedToken.uid.slice(0, 12).toLowerCase()}`;
  const fallbackFullName = decodedToken.name?.trim()
    || decodedToken.email?.split('@')[0]
    || 'WritOn writer';

  const result = await database.query(
    `insert into public.profiles (id, email, pen_name, full_name, account_type)
     values ($1, $2, $3, $4, 'human')
     on conflict (id) do update
       set email = coalesce(excluded.email, public.profiles.email),
           account_type = case
             when public.profiles.account_type = 'unknown'
               and not exists (select 1 from public.bot_configs bot where bot.id = public.profiles.id)
             then 'human'
             else public.profiles.account_type
           end
     returning ${profileReturningColumns}`,
    [profileId, decodedToken.email ?? null, fallbackPenName, fallbackFullName]
  );

  return toProfile(result.rows[0]);
}

fastify.get(
  '/auth-check',
  { preHandler: requireUser },
  async (request) => ({
    status: 'ok',
    firebaseUid: request.user.uid,
    email: request.user.email ?? null,
  })
);

fastify.get(
  '/api/v1/me',
  { preHandler: requireUser },
  async (request) => ({ profile: await ensureProfileForId(request.user, request.profileId) })
);

fastify.get('/api/v1/posts', async (request, reply) => {
  const parsed = postsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.code(400).send({
      error: 'Invalid feed query',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { category, tab, authorId, authorPenName, q, page, limit } = parsed.data;
  const viewer = await optionalUser(request);
  if (tab === 'following' && !viewer) {
    return reply.code(401).send({ error: 'Authentication required' });
  }
  const result = await database.query(
    `${postSelectSql(`where p.status = 'published'
      and p.is_public = true
      and p.provenance in ('human_verified', 'synthetic')
      and author.account_type in ('human', 'editorial_bot')
      and ($2::text is null or lower($2) = 'all' or lower(p.category) = lower($2))
      and ($3::text is null or p.author_id = $3)
      and ($4::text is null or lower(author.pen_name) = lower($4))
      and (
        $5::text is null
        or p.title ilike '%' || $5 || '%'
        or coalesce(p.summary, '') ilike '%' || $5 || '%'
        or author.full_name ilike '%' || $5 || '%'
        or author.pen_name ilike '%' || $5 || '%'
        or p.content ilike '%' || $5 || '%'
      )`, '', false)}
      and (
        $6::text <> 'following'
        or exists (
          select 1 from public.follows followed
          where followed.follower_id = $1 and followed.following_id = p.author_id
        )
      )
    order by
      case when $6 = 'popular' then p.likes_count end desc nulls last,
      p.published_at desc nulls last,
      p.created_at desc
    limit $7 offset $8`,
    [viewer?.profileId ?? null, category ?? null, authorId ?? null, authorPenName ?? null, q || null, tab, limit + 1, (page - 1) * limit]
  );

  const posts = result.rows.slice(0, limit).map(toReaderPost);
  return {
    posts,
    pagination: {
      page,
      limit,
      hasMore: result.rows.length > limit,
    },
  };
});

fastify.get('/api/v1/tags', async (request) => {
  const q = request.query.q ? String(request.query.q).trim() : null;
  const result = await database.query(
    `with story_counts as (
       select post.category, count(*)::int as count
       from public.posts post
       inner join public.profiles author on author.id = post.author_id
       where post.status = 'published'
         and post.is_public = true
         and post.provenance = 'human_verified'
         and author.account_type = 'human'
       group by post.category
     )
     select category.name, coalesce(counts.count, 0)::int as count
     from public.story_categories category
     left join story_counts counts on counts.category = category.name
     where category.is_active = true
       and category.category_type = 'content'
       and ($1::text is null or category.name ilike '%' || $1 || '%')
     order by category.display_order asc, category.name asc`,
    [q]
  );
  return { tags: result.rows };
});

fastify.get(
  '/api/v1/me/drafts',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `${postSelectSql(`where p.author_id = $2 and p.status = 'draft'`)}
       order by p.updated_at desc, p.created_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    return {
      posts: result.rows.slice(0, limit).map(toReaderPost),
      pagination: { page, limit, hasMore: result.rows.length > limit },
    };
  }
);

fastify.get('/stories/share.css', async (_request, reply) => {
  return reply
    .header('Cache-Control', 'public, max-age=86400')
    .type('text/css; charset=utf-8')
    .send(storyShareCss);
});

fastify.get('/stories/', async (request, reply) => {
  const query = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : '';
  return sendPermanentRedirect(reply, `/stories${query}`);
});

fastify.get('/stories/:slug/', async (request, reply) => {
  const parsedSlug = storyShareSlugSchema.safeParse(request.params.slug);
  if (!parsedSlug.success) {
    return reply.code(400).send({ error: 'Invalid story link' });
  }
  const query = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : '';
  return sendPermanentRedirect(reply, `/stories/${encodeURIComponent(parsedSlug.data)}${query}`);
});

fastify.get('/stories/:slug', async (request, reply) => {
  const parsedSlug = storyShareSlugSchema.safeParse(request.params.slug);
  if (!parsedSlug.success) {
    return reply.code(400).send({ error: 'Invalid story link' });
  }

  const result = await database.query(
    `select
       p.title,
       p.slug,
       p.summary,
       p.content,
       p.category,
       coalesce(nullif(p.language_code, 'und'), 'en') as "language",
       p.cover_image_url as "coverImage",
       coalesce(p.published_at, p.created_at) as "publishedAt",
       coalesce(p.updated_at, p.published_at, p.created_at) as "updatedAt",
       author.full_name as "authorName",
       author.pen_name as "authorPenName",
       author.avatar_url as "authorAvatarUrl"
     from public.posts p
     inner join public.profiles author on author.id = p.author_id
     where p.slug = $1 and p.status = 'published' and p.is_public = true
     limit 1`,
    [parsedSlug.data]
  );
  if (result.rowCount === 0) {
    return reply.code(404).type('text/html; charset=utf-8').send(
      '<!doctype html><html><head><title>Story not found — WritOn</title></head><body><main><h1>Story not found</h1><p>This story may no longer be available.</p></main></body></html>'
    );
  }

  const origin = requestOrigin(request, config.publicApiBaseUrl);
  const canonicalUrl = `https://writon.cc/stories/${encodeURIComponent(parsedSlug.data)}`;
  const playStoreUrl = config.playStoreAppUrl || 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon';
  const story = {
    ...result.rows[0],
    authorAvatarUrl: normalizeStoredAvatarUrl(result.rows[0].authorAvatarUrl),
  };
  const html = renderStorySharePage({ story, canonicalUrl, playStoreUrl, origin });

  return reply
    .header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
    .header('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
    .type('text/html; charset=utf-8')
    .send(html);
});


fastify.get('/api/v1/posts/:idOrSlug', async (request, reply) => {
  const idOrSlug = String(request.params.idOrSlug ?? '').trim();
  if (!idOrSlug || idOrSlug.length > 200) {
    return reply.code(400).send({ error: 'Invalid post identifier' });
  }

  const viewer = await optionalUser(request);
  const result = await database.query(
    `${postSelectSql(`where (p.status = 'published' and p.is_public = true)
      and (p.id::text = $2 or p.slug = $2)`)}
    limit 1`,
    [viewer?.profileId ?? null, idOrSlug]
  );

  if (result.rowCount === 0) {
    return reply.code(404).send({ error: 'Story not found' });
  }

  return { post: toReaderPost(result.rows[0]) };
});

fastify.post(
  '/api/v1/posts',
  { preHandler: requireUser },
  async (request, reply) => {
    const parsed = postInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid story data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    await ensureProfileForId(request.user, request.profileId);
    const story = parsed.data;
    const finalContent = story.isPublished
      ? attachHashtagsAndWatermark(story.content, story.category, null)
      : story.content;
    const result = await database.query(
      `insert into public.posts (
        slug, author_id, title, summary, content, category, cover_image_url,
        status, is_public, reading_time_min, published_at, client_draft_id,
        language_code, language_source, language_confidence,
        provenance, provenance_verified_at, provenance_verified_by
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, true, $9,
        case when $8 = 'published' then now() else null end, $11,
        $10, 'author', 1,
        case when (select account_type from public.profiles where id = $2) = 'human'
          then 'human_verified' else 'unknown' end,
        case when (select account_type from public.profiles where id = $2) = 'human'
          then now() else null end,
        case when (select account_type from public.profiles where id = $2) = 'human'
          then $2 else null end
      )
      on conflict (author_id, client_draft_id) where client_draft_id is not null do update
        set title = excluded.title,
            summary = excluded.summary,
            content = excluded.content,
            category = excluded.category,
            cover_image_url = excluded.cover_image_url,
            reading_time_min = excluded.reading_time_min,
            language_code = excluded.language_code,
            language_source = excluded.language_source,
            language_confidence = excluded.language_confidence,
            provenance = excluded.provenance,
            provenance_verified_at = excluded.provenance_verified_at,
            provenance_verified_by = excluded.provenance_verified_by,
            status = case when excluded.status = 'published' then 'published' else public.posts.status end,
            published_at = case
              when excluded.status = 'published' then coalesce(public.posts.published_at, now())
              else public.posts.published_at
            end,
            updated_at = now()
      returning id, status`,
      [
        createSlug(story.title),
        request.profileId,
        story.title,
        story.summary ?? null,
        finalContent,
        story.category,
        story.coverImage ?? null,
        story.isPublished ? 'published' : 'draft',
        calculateReadingTime(finalContent),
        story.languageCode,
        story.clientDraftId ?? null,
      ]
    );

    const postResult = await database.query(
      `${postSelectSql('where p.id = $2')}`,
      [request.profileId, result.rows[0].id]
    );

    if (story.isPublished && config.sparkAutomationEnabled) {
      triggerSparkReaction(database, {
        postId: result.rows[0].id,
        authorId: request.profileId,
        category: story.category,
        title: story.title,
        summary: story.summary
      }).catch((err) => fastify.log.warn(`[Spark Trigger Exception] ${err.message}`));
    }

    return reply.code(201).send({ post: toReaderPost(postResult.rows[0]) });
  }
);

fastify.put(
  '/api/v1/posts/:id',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const patch = postPatchSchema.safeParse(request.body);
    if (!patch.success) {
      return reply.code(400).send({ error: 'Invalid story update', details: patch.error.flatten().fieldErrors });
    }

    const existing = await database.query(
      `select id::text as id, title, summary, content, category, cover_image_url, language_code,
              status, client_draft_id, published_at
       from public.posts where id = $1 and author_id = $2`,
      [postId, request.profileId]
    );
    if (existing.rowCount === 0) return reply.code(404).send({ error: 'Story not found' });

    const prior = existing.rows[0];
    const merged = postInputSchema.safeParse({
      title: prior.title,
      summary: prior.summary,
      content: prior.content,
      category: prior.category,
      coverImage: prior.cover_image_url,
      isPublished: prior.status === 'published',
      clientDraftId: prior.client_draft_id,
      languageCode: prior.language_code,
      ...patch.data,
    });
    if (!merged.success) {
      return reply.code(400).send({ error: 'Invalid story update', details: merged.error.flatten().fieldErrors });
    }
    const story = merged.data;
    const result = await database.query(
      `update public.posts
       set title = $3, summary = $4, content = $5, category = $6, cover_image_url = $7,
           client_draft_id = coalesce($8, client_draft_id),
           reading_time_min = $9,
           status = case when $10 then 'published' else status end,
           published_at = case when $10 then coalesce(published_at, now()) else published_at end,
           language_code = $11, language_source = 'author', language_confidence = 1,
           provenance = case
             when (select account_type from public.profiles where id = $2) = 'human'
             then 'human_verified' else provenance end,
           provenance_verified_at = case
             when (select account_type from public.profiles where id = $2) = 'human'
             then now() else provenance_verified_at end,
           provenance_verified_by = case
             when (select account_type from public.profiles where id = $2) = 'human'
             then $2 else provenance_verified_by end,
           updated_at = now()
       where id = $1 and author_id = $2
       returning id`,
      [postId, request.profileId, story.title, story.summary ?? null, story.content, story.category,
        story.coverImage ?? null, story.clientDraftId ?? null, calculateReadingTime(story.content),
        story.isPublished, story.languageCode]
    );
    const postResult = await database.query(`${postSelectSql('where p.id = $2')}`, [request.profileId, result.rows[0].id]);
    return { post: toReaderPost(postResult.rows[0]) };
  }
);

fastify.post(
  '/api/v1/posts/:id/publish',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const result = await database.query(
      `update public.posts
       set status = 'published', is_public = true, published_at = coalesce(published_at, now()),
           provenance = case
             when (select account_type from public.profiles where id = $2) = 'human'
             then 'human_verified' else provenance end,
           provenance_verified_at = case
             when (select account_type from public.profiles where id = $2) = 'human'
             then coalesce(provenance_verified_at, now()) else provenance_verified_at end,
           provenance_verified_by = case
             when (select account_type from public.profiles where id = $2) = 'human'
             then coalesce(provenance_verified_by, $2) else provenance_verified_by end,
           updated_at = now()
       where id = $1 ${request.profileId ? 'and author_id = $2' : ''}
       returning id, title, category, summary, author_id`,
      request.profileId ? [postId, request.profileId] : [postId]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: 'Story not found' });
    const post = result.rows[0];
    if (config.sparkAutomationEnabled) {
      triggerSparkReaction(database, { postId: post.id, authorId: post.author_id, category: post.category, title: post.title, summary: post.summary })
        .catch((error) => fastify.log.warn(`[Spark Trigger Exception] ${error.message}`));
    }
    const postResult = await database.query(`${postSelectSql('where p.id = $2')}`, [request.profileId || 'public_view', post.id]);
    return { post: toReaderPost(postResult.rows[0]) };
  }
);

fastify.delete(
  '/api/v1/posts/:id',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const result = await database.query(
      `delete from public.posts where id = $1 and author_id = $2 returning id`,
      [postId, request.profileId]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: 'Story not found' });
    return reply.code(204).send();
  }
);

fastify.post(
  '/api/v1/media/upload',
  { preHandler: requireUser },
  async (request, reply) => {
    if (!assertStorageConfigured(reply)) return;
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'Select an image to upload.' });
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      return reply.code(415).send({ error: 'Only JPEG, PNG, and WebP images are supported.' });
    }
    const buffer = await file.toBuffer();
    let webp;
    try {
      webp = await sharp(buffer).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch {
      return reply.code(400).send({ error: 'The selected image could not be processed.' });
    }
    const key = `profiles/${request.profileId}/${randomUUID()}.webp`;
    const upload = await fetch(
      `${config.supabaseUrl}/storage/v1/object/${encodeURIComponent(config.supabaseStorageBucket)}/${mediaObjectPath(key)}`,
      {
        method: 'POST',
        headers: supabaseStorageHeaders(config.supabaseServiceRoleKey, {
          'Content-Type': 'image/webp',
          'x-upsert': 'false',
        }),
        body: webp,
      }
    );
    if (!upload.ok) {
      request.log.error({ statusCode: upload.status }, 'Supabase Storage rejected image upload');
      return reply.code(502).send({ error: 'Image upload failed. Please try again.' });
    }
    return reply.code(201).send({ key, url: publicMediaUrl(request, key) });
  }
);

fastify.get('/api/v1/media/*', async (request, reply) => {
  if (!assertStorageConfigured(reply)) return;
  const key = decodedProfileMediaKey(request.params['*']);
  if (!key) {
    return reply.code(404).send({ error: 'Media not found' });
  }
  try {
    if (requiresAuthenticatedMediaProxy(key)) {
      const media = await fetchAuthenticatedMedia(key);
      if (media.status === 404) return reply.code(404).send({ error: 'Media not found' });
      if (!media.ok) throw new Error(`Supabase Storage download failed (${media.status})`);
      const contentType = media.headers.get('content-type');
      if (contentType !== 'image/webp') throw new Error('Supabase Storage returned an unexpected media type.');
      const content = Buffer.from(await media.arrayBuffer());
      return reply
        .code(200)
        .header('Content-Type', contentType)
        .header('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')
        .send(content);
    }
    return sendFoundRedirect(reply, await createSignedMediaUrl(key));
  } catch (error) {
    request.log.error({ err: error }, 'Could not retrieve media');
    return reply.code(502).send({ error: 'Media is temporarily unavailable.' });
  }
});

fastify.post(
  '/api/v1/posts/:id/like',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;

    await ensureProfileForId(request.user, request.profileId);
    const interaction = await togglePostRelation({
      postId,
      userId: request.profileId,
      table: 'post_applauds',
      counterColumn: 'likes_count',
    });
    if (!interaction) return reply.code(404).send({ error: 'Story not found' });

    return { liked: interaction.enabled, likesCount: interaction.count };
  }
);

fastify.put(
  '/api/v1/posts/:id/like',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const desired = relationStateInputSchema.safeParse(request.body);
    if (!desired.success) {
      return reply.code(400).send({ error: 'Invalid applause state' });
    }

    await ensureProfileForId(request.user, request.profileId);
    const interaction = await setPostRelation({
      postId,
      userId: request.profileId,
      table: 'post_applauds',
      counterColumn: 'likes_count',
      enabled: desired.data.enabled,
    });
    if (!interaction) return reply.code(404).send({ error: 'Story not found' });

    return { liked: interaction.enabled, likesCount: interaction.count };
  }
);

fastify.post(
  '/api/v1/posts/:id/bookmark',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;

    await ensureProfileForId(request.user, request.profileId);
    const interaction = await togglePostRelation({
      postId,
      userId: request.profileId,
      table: 'bookmarks',
      counterColumn: 'bookmarks_count',
    });
    if (!interaction) return reply.code(404).send({ error: 'Story not found' });

    return { bookmarked: interaction.enabled, bookmarksCount: interaction.count };
  }
);

fastify.put(
  '/api/v1/posts/:id/bookmark',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const desired = relationStateInputSchema.safeParse(request.body);
    if (!desired.success) {
      return reply.code(400).send({ error: 'Invalid bookmark state' });
    }

    await ensureProfileForId(request.user, request.profileId);
    const interaction = await setPostRelation({
      postId,
      userId: request.profileId,
      table: 'bookmarks',
      counterColumn: 'bookmarks_count',
      enabled: desired.data.enabled,
    });
    if (!interaction) return reply.code(404).send({ error: 'Story not found' });

    return { bookmarked: interaction.enabled, bookmarksCount: interaction.count };
  }
);

fastify.get(
  '/api/v1/me/bookmarks',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `${postSelectSql(`inner join public.bookmarks saved on saved.post_id = p.id
        where saved.user_id = $2 and p.status = 'published' and p.is_public = true`)}
       order by saved.created_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    return { posts: result.rows.slice(0, limit).map(toReaderPost), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/applauds',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `${postSelectSql(`inner join public.post_applauds applause on applause.post_id = p.id
        where applause.user_id = $2 and p.status = 'published' and p.is_public = true`)}
       order by applause.created_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    return { posts: result.rows.slice(0, limit).map(toReaderPost), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/stories',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `${postSelectSql(`where p.author_id = $2 and p.status = 'published'`) }
       order by p.published_at desc nulls last, p.created_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    return { posts: result.rows.slice(0, limit).map(toReaderPost), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/applause-received',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `${postSelectSql(`where p.author_id = $2 and p.status = 'published' and p.likes_count > 0`) }
       order by p.likes_count desc, p.published_at desc nulls last, p.created_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    return { posts: result.rows.slice(0, limit).map(toReaderPost), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/followers',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `select p.id, p.pen_name, p.full_name, p.avatar_url, p.bio,
              p.followers_count, p.following_count, alias.quote_of_day
       from public.follows f
       inner join public.profiles p on p.id = f.follower_id
       left join public.legacy_import_profile_attributes alias on alias.profile_id = p.id
       where f.following_id = $1
       order by f.created_at desc
       limit $2 offset $3`,
      [request.profileId, limit + 1, (page - 1) * limit]
    );
    return { users: result.rows.slice(0, limit).map(toAuthor), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/following',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const result = await database.query(
      `select p.id, p.pen_name, p.full_name, p.avatar_url, p.bio,
              p.followers_count, p.following_count, alias.quote_of_day
       from public.follows f
       inner join public.profiles p on p.id = f.following_id
       left join public.legacy_import_profile_attributes alias on alias.profile_id = p.id
       where f.follower_id = $1
       order by f.created_at desc
       limit $2 offset $3`,
      [request.profileId, limit + 1, (page - 1) * limit]
    );
    return { users: result.rows.slice(0, limit).map(toAuthor), pagination: { page, limit, hasMore: result.rows.length > limit } };
  }
);

fastify.get(
  '/api/v1/me/interests',
  { preHandler: requireUser },
  async (request) => {
    await ensureProfileForId(request.user, request.profileId);
    const result = await database.query(
      `select topic_id as "topicId" from public.profile_interests
       where profile_id = $1 order by created_at asc, topic_id asc`,
      [request.profileId]
    );
    return { topicIds: result.rows.map((row) => row.topicId) };
  }
);

fastify.put(
  '/api/v1/me/interests',
  { preHandler: requireUser },
  async (request, reply) => {
    const parsed = interestsInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid interests',
        details: parsed.error.flatten().fieldErrors,
      });
    }
    await ensureProfileForId(request.user, request.profileId);
    const topicIds = [...new Set(parsed.data.topicIds)];
    const client = await database.connect();
    try {
      await client.query('begin');
      await client.query('delete from public.profile_interests where profile_id = $1', [request.profileId]);
      if (topicIds.length > 0) {
        await client.query(
          `insert into public.profile_interests (profile_id, topic_id)
           select $1, unnest($2::text[])`,
          [request.profileId, topicIds]
        );
      }
      await client.query('commit');
      return { topicIds };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
);

fastify.get(
  '/api/v1/me/reading-history',
  { preHandler: requireUser },
  async (request, reply) => {
    const query = parseCollectionQuery(request, reply);
    if (!query) return;
    const { page, limit } = query;
    const history = await database.query(
      `${postSelectSql(
        `inner join public.reading_history history on history.post_id = p.id
         where history.user_id = $2 and p.status = 'published' and p.is_public = true`,
        `, history.progress as "progress", history.read_seconds as "readSeconds",
           history.first_read_at as "firstReadAt", history.last_read_at as "lastReadAt"`
      )}
       order by history.last_read_at desc
       limit $3 offset $4`,
      [request.profileId, request.profileId, limit + 1, (page - 1) * limit]
    );
    const summary = await database.query(
      `select count(*)::int as "storiesRead",
              coalesce(round(sum(read_seconds)::numeric / 3600, 1), 0) as "hoursRead"
       from public.reading_history where user_id = $1`,
      [request.profileId]
    );
    return {
      items: history.rows.slice(0, limit).map(toReaderPost),
      summary: summary.rows[0],
      pagination: { page, limit, hasMore: history.rows.length > limit },
    };
  }
);

fastify.post(
  '/api/v1/posts/:id/reading-progress',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const parsed = readingProgressInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid reading progress', details: parsed.error.flatten().fieldErrors });
    }
    await ensureProfileForId(request.user, request.profileId);
    const result = await database.query(
      `insert into public.reading_history (user_id, post_id, progress, read_seconds)
       select $1, p.id,
              case
                when $3 >= 0.95
                  and coalesce(history.read_seconds, 0) + $4 < greatest(30, p.reading_time_min * 30)
                then 0.94
                else $3
              end,
              $4
       from public.posts p
       left join public.reading_history history on history.user_id = $1 and history.post_id = p.id
       where p.id = $2 and p.status = 'published' and p.is_public = true
       on conflict (user_id, post_id) do update set
         progress = greatest(public.reading_history.progress, excluded.progress),
         read_seconds = public.reading_history.read_seconds + excluded.read_seconds,
         last_read_at = now(), updated_at = now()
       returning progress, read_seconds as "readSeconds", last_read_at as "lastReadAt"`,
      [request.profileId, postId, parsed.data.progress, parsed.data.readSeconds]
    );
    if (result.rowCount === 0) return reply.code(404).send({ error: 'Story not found' });
    return result.rows[0];
  }
);

fastify.get('/api/v1/comments/:postId', async (request, reply) => {
  const postId = parsePostId(request, reply);
  if (!postId) return;

  const result = await database.query(
    `select
      comment.id::text as id,
      comment.post_id::text as "postId",
      comment.author_id as "authorId",
      coalesce(comment.parent_comment_id::text, link.legacy_parent_id) as "parentId",
      comment.content,
      comment.created_at as "createdAt",
      json_build_object(
        'id', author.id,
        'penName', author.pen_name,
        'fullName', author.full_name,
        'avatarUrl', author.avatar_url,
        'bio', author.bio,
        'quoteOfDay', alias.quote_of_day,
        'followersCnt', author.followers_count,
        'followingCnt', author.following_count
      ) as author,
      '[]'::json as replies
    from public.comments comment
    inner join public.posts post on post.id = comment.post_id
    inner join public.profiles author on author.id = comment.author_id
    left join public.legacy_import_profile_attributes alias on alias.profile_id = author.id
    left join public.legacy_import_comment_links link on link.comment_id = comment.id
    where comment.post_id = $1 and post.status = 'published' and post.is_public = true
    order by comment.created_at asc`,

    [postId]
  );

  return { comments: result.rows.map(toReaderComment), total: result.rowCount };
});

fastify.post(
  '/api/v1/comments/:postId',
  { preHandler: requireUser },
  async (request, reply) => {
    const postId = parsePostId(request, reply);
    if (!postId) return;
    const parsed = commentInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid comment data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    await ensureProfileForId(request.user, request.profileId);
    const client = await database.connect();
    try {
      await client.query('begin');
      const post = await fetchInteractionPost(client, postId, request.profileId);
      if (!post) {
        await client.query('rollback');
        return reply.code(404).send({ error: 'Story not found' });
      }

      let parent = null;
      if (parsed.data.parentId) {
        const parentResult = await client.query(
          `select id, author_id from public.comments
           where id = $1 and post_id = $2 for key share`,
          [parsed.data.parentId, postId]
        );
        if (parentResult.rowCount === 0) {
          await client.query('rollback');
          return reply.code(400).send({ error: 'Reply target is no longer available for this story.' });
        }
        parent = parentResult.rows[0];
      }

      const inserted = await client.query(
        `with attempted as (
           insert into public.comments (
             post_id, author_id, parent_comment_id, content, client_mutation_id
           ) values ($1, $2, $3, $4, $5)
           on conflict (author_id, client_mutation_id)
             where client_mutation_id is not null
             do nothing
           returning id, post_id, author_id, parent_comment_id, content, created_at
         )
         select attempted.*, true as inserted from attempted
         union all
         select comment.id, comment.post_id, comment.author_id, comment.parent_comment_id,
                comment.content, comment.created_at, false as inserted
         from public.comments comment
         where comment.author_id = $2 and comment.client_mutation_id = $5
         limit 1`,
        [
          postId,
          request.profileId,
          parent?.id ?? null,
          parsed.data.content,
          parsed.data.clientMutationId ?? null,
        ]
      );
      const wasInserted = inserted.rows[0]?.inserted !== false;
      if (wasInserted) {
        await client.query(
          `update public.posts set comments_count = comments_count + 1, updated_at = now() where id = $1`,
          [postId]
        );
      }
      const author = await client.query(
        `select id, pen_name, full_name, avatar_url, bio, followers_count, following_count
         from public.profiles where id = $1`,
        [request.profileId]
      );
      if (wasInserted) {
        await createNotification(client, {
          recipientId: parent?.author_id ?? post.author_id,
          actorId: request.profileId,
          postId,
          commentId: inserted.rows[0].id,
          kind: parent ? 'reply' : 'comment',
          message: parent ? 'replied to your comment' : 'commented on your story',
          deduplicationKey: `${parent ? 'reply' : 'comment'}:${inserted.rows[0].id}`,
        });
      }
      await client.query('commit');
      await deliverPushAfterCommit();

      // Trigger asynchronous in-character bot reply with realistic human cadence
      if (wasInserted && config.sparkAutomationEnabled) {
        triggerSparkCommentReaction(database, {
          postId,
          commentId: inserted.rows[0].id,
          postAuthorId: post.author_id,
          commentAuthorId: request.profileId,
          content: parsed.data.content
        }).catch((err) => fastify.log.warn(`[Spark Comment Trigger Exception] ${err.message}`));
      }

      const comment = inserted.rows[0];
      return reply.code(wasInserted ? 201 : 200).send({
        comment: {
          id: comment.id,
          postId: comment.post_id,
          authorId: comment.author_id,
          parentId: comment.parent_comment_id,
          content: comment.content,
          createdAt: comment.created_at,
          author: toAuthor(author.rows[0]),
          replies: [],
        },
      });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
);

fastify.get('/api/v1/users', async (request) => {
  const q = request.query.q ? String(request.query.q).trim() : null;
  const page = Math.max(1, parseInt(request.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(request.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const result = await database.query(
    `select p.id, p.pen_name, p.full_name, p.avatar_url, p.bio, p.followers_count, p.following_count, alias.quote_of_day
     from public.profiles p
     left join public.legacy_import_profile_attributes alias on alias.profile_id = p.id
     where p.account_type = 'human'
       and ($1::text is null
        or p.full_name ilike '%' || $1 || '%'
        or p.pen_name ilike '%' || $1 || '%'
        or coalesce(p.bio, '') ilike '%' || $1 || '%')
     order by p.followers_count desc, p.full_name asc
     limit $2 offset $3`,
    [q, limit + 1, offset]
  );

  const users = result.rows.slice(0, limit).map(toAuthor);
  return {
    users,
    pagination: {
      page,
      limit,
      hasMore: result.rows.length > limit,
    },
  };
});

fastify.get('/api/v1/users/:idOrPenName', async (request, reply) => {

  const identifier = parseProfileIdentifier(request, reply);
  if (!identifier) return;

  const result = await database.query(
    `select p.id, p.pen_name, p.full_name, p.avatar_url, p.bio, p.followers_count, p.following_count, alias.quote_of_day
     from public.profiles p
     left join public.legacy_import_profile_attributes alias on alias.profile_id = p.id
     where p.id = $1 or lower(p.pen_name) = lower($1)
     limit 1`,
    [identifier]
  );
  if (result.rowCount === 0) return reply.code(404).send({ error: 'Writer not found' });

  return { user: toAuthor(result.rows[0]) };
});


fastify.post(
  '/api/v1/users/:id/follow',
  { preHandler: requireUser },
  async (request, reply) => {
    const profileId = parseProfileIdentifier(request, reply);
    if (!profileId) return;
    if (profileId === request.profileId) {
      return reply.code(400).send({ error: 'You cannot follow yourself' });
    }

    await ensureProfileForId(request.user, request.profileId);
    const client = await database.connect();
    try {
      await client.query('begin');
      const target = await client.query(
        `select id from public.profiles where id = $1 for update`,
        [profileId]
      );
      if (target.rowCount === 0) {
        await client.query('rollback');
        return reply.code(404).send({ error: 'Writer not found' });
      }

      const existing = await client.query(
        `select 1 from public.follows where follower_id = $1 and following_id = $2`,
        [request.profileId, profileId]
      );
      const following = existing.rowCount === 0;
      if (following) {
        await client.query(
          `insert into public.follows (follower_id, following_id) values ($1, $2)`,
          [request.profileId, profileId]
        );
        await createNotification(client, {
          recipientId: profileId,
          actorId: request.profileId,
          kind: 'new_follower',
          message: 'started following you',
          deduplicationKey: `new_follower:${profileId}:${request.profileId}`,
        });
      } else {
        await client.query(
          `delete from public.follows where follower_id = $1 and following_id = $2`,
          [request.profileId, profileId]
        );
      }

      // `follows` is the source of truth. Counters imported from the legacy
      // database (and bot seed data) may already be stale, so arithmetic here
      // can preserve or amplify an incorrect number. Reconcile to the actual
      // relationship rows after every toggle instead.
      const targetProfile = await client.query(
        `update public.profiles
         set followers_count = (
               select count(*)::int
               from public.follows
               where following_id = $1
             ),
             updated_at = now()
         where id = $1
         returning followers_count`,
        [profileId]
      );
      await client.query(
        `update public.profiles
         set following_count = (
               select count(*)::int
               from public.follows
               where follower_id = $1
             ),
             updated_at = now()
         where id = $1`,
        [request.profileId]
      );
      await client.query('commit');
      await deliverPushAfterCommit();

      return {
        following,
        followersCount: targetProfile.rows[0].followers_count,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
);

fastify.put(
  '/api/v1/me',
  { preHandler: requireUser },
  async (request, reply) => {
    const parsed = profileInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid profile data',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const profile = parsed.data;
    const hasAvatarUrl = Object.hasOwn(profile, 'avatarUrl');
    const normalizedAvatar = hasAvatarUrl ? normalizeAvatarInput(profile.avatarUrl) : null;
    if (normalizedAvatar && !normalizedAvatar.success) {
      return reply.code(400).send({
        error: 'Invalid profile data',
        details: { avatarUrl: ['Use a profile photo uploaded securely through WritOn.'] },
      });
    }
    if (normalizedAvatar) profile.avatarUrl = normalizedAvatar.value;
    try {
      const result = await database.query(
        `with previous as (
           select avatar_url from public.profiles where id = $1
         ), saved as (
           insert into public.profiles (
             id, email, pen_name, full_name, bio, avatar_url, location
           ) values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (id) do update
             set email = coalesce(excluded.email, public.profiles.email),
                 pen_name = excluded.pen_name,
                 full_name = excluded.full_name,
                 bio = coalesce(excluded.bio, public.profiles.bio),
                 avatar_url = case when $8 then excluded.avatar_url else public.profiles.avatar_url end,
                 location = coalesce(excluded.location, public.profiles.location)
           returning ${profileReturningColumns}
         )
         select saved.*, (select avatar_url from previous) as previous_avatar_url from saved`,
        [
          request.profileId,
          request.user.email ?? null,
          profile.penName,
          profile.fullName,
          profile.bio ?? null,
          profile.avatarUrl ?? null,
          profile.location ?? null,
          hasAvatarUrl,
        ]
      );

      const previousKey = profileMediaKeyFromUrl(result.rows[0].previous_avatar_url, config.publicApiBaseUrl);
      if (previousKey && previousKey !== normalizedAvatar?.key) {
        try {
          await deleteMediaKeys([previousKey]);
        } catch (error) {
          request.log.warn({ err: error, key: previousKey }, 'Could not remove replaced profile media');
        }
      }

      return { profile: toProfile(result.rows[0]) };
    } catch (error) {
      if (error.code === '23505') {
        return reply.code(409).send({ error: 'That username is already taken.' });
      }
      throw error;
    }
  }
);

fastify.patch(
  '/api/v1/me',
  { preHandler: requireUser },
  async (request, reply) => {
    const parsed = profilePatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid profile update',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const patch = parsed.data;
    const normalizedAvatar = Object.hasOwn(patch, 'avatarUrl')
      ? normalizeAvatarInput(patch.avatarUrl)
      : null;
    if (normalizedAvatar && !normalizedAvatar.success) {
      return reply.code(400).send({
        error: 'Invalid profile update',
        details: { avatarUrl: ['Use a profile photo uploaded securely through WritOn.'] },
      });
    }
    if (normalizedAvatar) patch.avatarUrl = normalizedAvatar.value;
    const client = await database.connect();
    try {
      await client.query('begin');
      const result = await client.query(
        `with previous as (
           select avatar_url from public.profiles where id = $1
         ), updated as (
           update public.profiles
           set full_name = coalesce($2, full_name),
               bio = case when $3 then $4 else bio end,
               avatar_url = case when $5 then $6 else avatar_url end,
               location = case when $7 then $8 else location end,
               updated_at = now()
           where id = $1
           returning ${profileReturningColumns}
         )
         select updated.*, (select avatar_url from previous) as previous_avatar_url from updated`,
        [
          request.profileId,
          patch.fullName ?? null,
          Object.hasOwn(patch, 'bio'),
          patch.bio ?? null,
          Object.hasOwn(patch, 'avatarUrl'),
          patch.avatarUrl ?? null,
          Object.hasOwn(patch, 'location'),
          patch.location ?? null,
        ]
      );
      if (result.rowCount === 0) {
        await client.query('rollback');
        return reply.code(404).send({ error: 'Profile not found' });
      }

      if (Object.hasOwn(patch, 'quoteOfDay')) {
        await client.query(
          `insert into public.legacy_import_profile_attributes (
             profile_id, legacy_user_id, quote_of_day
           ) values ($1, $1, $2)
           on conflict (profile_id) do update
             set quote_of_day = excluded.quote_of_day`,
          [request.profileId, patch.quoteOfDay ?? null]
        );
      }
      await client.query('commit');

      const previousKey = profileMediaKeyFromUrl(result.rows[0].previous_avatar_url, config.publicApiBaseUrl);
      if (previousKey && previousKey !== normalizedAvatar?.key) {
        try {
          await deleteMediaKeys([previousKey]);
        } catch (error) {
          request.log.warn({ err: error, key: previousKey }, 'Could not remove replaced profile media');
        }
      }

      return {
        profile: {
          ...toProfile(result.rows[0]),
          quoteOfDay: Object.hasOwn(patch, 'quoteOfDay')
            ? (patch.quoteOfDay ?? null)
            : (result.rows[0].quote_of_day ?? null),
        },
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
);

  fastify.get('/delete-account', async (request, reply) => {
    reply.type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>WritOn - Account & Data Deletion Request</title>
  <style>
    :root {
      --bg: #F8F4EE;
      --card: #FFFDF9;
      --text: #151718;
      --muted: #6D6963;
      --primary: #E75A2A;
      --border: #E9E1D7;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 680px;
      margin: 0 auto;
      background: var(--card);
      padding: 36px;
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    .brand {
      color: var(--primary);
      font-size: 26px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 24px;
    }
    h2 {
      font-size: 18px;
      margin-top: 28px;
      margin-bottom: 12px;
      color: var(--primary);
    }
    p, li {
      color: #333;
      font-size: 15px;
    }
    .steps {
      background: #F2ECE4;
      padding: 20px 24px;
      border-radius: 12px;
      margin: 20px 0;
    }
    .steps ol {
      margin: 0;
      padding-left: 20px;
    }
    .steps li {
      margin-bottom: 8px;
    }
    .contact-box {
      border: 1px dashed var(--primary);
      background: rgba(231, 90, 42, 0.05);
      padding: 16px 20px;
      border-radius: 10px;
      margin-top: 24px;
    }
    .footer {
      margin-top: 32px;
      font-size: 13px;
      color: var(--muted);
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }
    a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">WritOn</div>
    <h1>Account &amp; Data Deletion Request</h1>
    <p>At <strong>WritOn</strong> (developed by <strong>iBitValley</strong>), we value and respect your privacy. You have full control over your personal account and any data you create on our platform.</p>

    <h2>How to Request Account &amp; Data Deletion</h2>
    <div class="steps">
      <strong>Option 1: In the Android App (Instant)</strong>
      <ol style="margin-top: 8px;">
        <li>Open the <strong>WritOn</strong> app on your Android device.</li>
        <li>Go to your <strong>Profile</strong> tab (bottom right) and tap the <strong>Settings</strong> icon.</li>
        <li>Under <strong>ACCOUNT</strong>, tap <strong>Delete Account &amp; Data</strong>.</li>
        <li>Confirm your decision. Your account, profile, and authored content will be removed immediately.</li>
      </ol>
    </div>

    <div class="steps">
      <strong>Option 2: Submit an Email / Web Request</strong>
      <p style="margin: 8px 0 0 0;">If you have uninstalled the app or cannot log in, send an email to our support team:</p>
      <div class="contact-box">
        <strong>Email:</strong> <a href="mailto:saurabh.682@gmail.com">saurabh.682@gmail.com</a><br>
        <strong>Subject:</strong> Account Deletion Request - WritOn<br>
        <strong>Include:</strong> The email address or username associated with your WritOn account.
      </div>
    </div>

    <h2>What Data Will Be Deleted?</h2>
    <p>Upon receiving your deletion request, the following data is permanently purged from our servers:</p>
    <ul>
      <li><strong>User Profile:</strong> Full name, username/pen name, email address, bio, profile avatar photo, and location.</li>
      <li><strong>Authored Content:</strong> All stories, articles, notes, and drafts created under your account.</li>
      <li><strong>Engagement Data:</strong> All comments, replies, applause reactions, and bookmarks.</li>
      <li><strong>Device Tokens:</strong> Firebase Cloud Messaging push notification tokens.</li>
    </ul>

    <h2>Data Retention &amp; Processing Period</h2>
    <ul>
      <li><strong>Processing Time:</strong> In-app deletions are executed immediately. Email requests are verified and permanently purged within <strong>48 to 72 hours</strong>.</li>
      <li><strong>Data Retention:</strong> No personal or identifiable user data is retained after deletion. Standard anonymized server security logs are retained strictly for fraud prevention for up to 30 days, after which they are automatically expunged.</li>
    </ul>

    <div class="footer">
      Developer: <strong>iBitValley</strong> • App: <strong>WritOn</strong> • Contact: <a href="mailto:saurabh.682@gmail.com">saurabh.682@gmail.com</a>
    </div>
  </div>
</body>
</html>`);
  });

  fastify.get('/child-safety', async (request, reply) => {
    reply.type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>WritOn - Child Safety &amp; Protection Standards</title>
  <style>
    :root {
      --bg: #F8F4EE;
      --card: #FFFDF9;
      --text: #151718;
      --muted: #6D6963;
      --primary: #E75A2A;
      --border: #E9E1D7;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
      background: var(--card);
      padding: 36px;
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    .brand {
      color: var(--primary);
      font-size: 26px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 18px;
      margin-top: 24px;
      margin-bottom: 12px;
      color: var(--primary);
    }
    p, li {
      color: #333;
      font-size: 15px;
    }
    .alert-box {
      background: #FCE8E6;
      border-left: 4px solid #D93025;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 20px 0;
      color: #C5221F;
      font-weight: 500;
    }
    .contact-box {
      border: 1px dashed var(--primary);
      background: rgba(231, 90, 42, 0.05);
      padding: 16px 20px;
      border-radius: 10px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 32px;
      font-size: 13px;
      color: var(--muted);
      border-top: 1px solid var(--border);
      padding-top: 16px;
    }
    a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">WritOn</div>
    <h1>Child Safety Standards &amp; CSAE Prevention Policy</h1>
    <p>At <strong>WritOn</strong> (developed by <strong>iBitValley</strong>), we maintain a strict, non-negotiable <strong>zero-tolerance policy</strong> regarding Child Sexual Abuse Material (CSAM) and Child Sexual Exploitation and Abuse (CSAE).</p>

    <div class="alert-box">
      Zero Tolerance: Any content, imagery, writing, or communication involving the exploitation, abuse, grooming, or endangerment of minors is strictly prohibited and subject to immediate termination and legal reporting.
    </div>

    <h2>1. Prohibited Content &amp; Behavior</h2>
    <p>WritOn strictly forbids:</p>
    <ul>
      <li>Any visual, written, or implied depiction of Child Sexual Abuse Material (CSAM).</li>
      <li>Child Sexual Exploitation and Abuse (CSAE) in any form.</li>
      <li>Any attempt to groom, solicit, endanger, or inappropriately interact with minors.</li>
      <li>Content promoting, facilitating, or encouraging harm towards children.</li>
    </ul>

    <h2>2. In-App Reporting &amp; Content Moderation</h2>
    <p>We provide immediate mechanisms for users to flag and report any safety concerns:</p>
    <ul>
      <li><strong>In-App Reporting:</strong> Users can report any story, comment, or user profile directly by tapping the more options (3 dots) menu on any post or author profile and selecting <em>Report</em>.</li>
      <li><strong>Rapid Takedown:</strong> Reported content is prioritized, reviewed by our moderation team, and removed immediately upon confirmation.</li>
      <li><strong>Account Termination:</strong> Accounts that violate child safety standards are banned permanently and prohibited from creating new accounts.</li>
    </ul>

    <h2>3. Reporting to Law Enforcement &amp; Authorities</h2>
    <p>WritOn complies fully with all applicable international, national, and regional child safety laws. When CSAM or CSAE is identified:</p>
    <ul>
      <li>We immediately preserve all relevant evidentiary data.</li>
      <li>We file immediate reports with the <strong>National Center for Missing &amp; Exploited Children (NCMEC)</strong> and relevant regional and national law enforcement agencies.</li>
      <li>We cooperate transparently and proactively with legal authorities to aid in child protection investigations.</li>
    </ul>

    <h2>4. Designated Point of Contact</h2>
    <p>For urgent child safety inquiries, reports, or legal inquiries, please contact our dedicated safety team:</p>
    <div class="contact-box">
      <strong>Designated Safety Contact:</strong> Saurabh Kumar (iBitValley)<br>
      <strong>Safety Email:</strong> <a href="mailto:deamonizerr@gmail.com">deamonizerr@gmail.com</a> / <a href="mailto:saurabh.682@gmail.com">saurabh.682@gmail.com</a><br>
      <strong>Response SLA:</strong> Critical child safety reports are prioritized and responded to within 12 hours.
    </div>

    <div class="footer">
      Developer: <strong>iBitValley</strong> • App: <strong>WritOn</strong> • Policy Version: 1.0 (2026)
    </div>
  </div>
</body>
</html>`);
  });

  fastify.delete(
    '/api/v1/me',
    { preHandler: [requireUser] },
    async (request, reply) => {
      const profileId = request.profileId;
      const firebaseUid = request.user.uid;
      try {
        await deleteProfileMedia(profileId);
      } catch (error) {
        request.log.error({ err: error, profileId }, 'Account deletion stopped because profile media could not be removed');
        return reply.code(502).send({ error: 'Could not remove profile media. Please try account deletion again.' });
      }
      const client = await database.connect();
      let authDeletionFailed = false;
      try {
        await client.query('begin');
        const deleted = await client.query(
          'delete from public.profiles where id = $1 returning id',
          [profileId]
        );
        if (deleted.rowCount === 0) {
          await client.query('rollback');
          return reply.code(404).send({ error: 'Profile not found' });
        }
        if (firebaseAuth) {
          try {
            await firebaseAuth.deleteUser(firebaseUid);
          } catch (error) {
            authDeletionFailed = true;
            throw error;
          }
        }
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        if (authDeletionFailed) {
          request.log.warn({ err: error }, 'Authentication deletion failed; profile deletion was rolled back');
          return reply.code(502).send({ error: 'Could not delete the authentication account' });
        }
        throw error;
      } finally {
        client.release();
      }

      return { success: true, message: 'Account and associated data deleted successfully.' };
    }
  );

  await fastify.register(appMetaRoutes, { config, database });
  await fastify.register(seoRoutes, { config, database });
  await fastify.register(notificationRoutes, {
    config,
    database,
    requireUser,
    parseCollectionQuery,
    postIdSchema,
  });
  await fastify.register(engagementPreferenceRoutes, {
    database,
    requireUser,
    ensureProfile: (request) => ensureProfileForId(request.user, request.profileId),
  });
  await fastify.register(milestoneRoutes, { database, requireUser });
  await fastify.register(feedRoutes, {
    database,
    optionalUser,
    requireUser,
    config,
    normalizeAvatarUrl: normalizeStoredAvatarUrl,
  });
  await fastify.register(adminBotsRoutes, { pool: database, requireUser });
  await fastify.register(adminReviewsRoutes, { pool: database });
  await fastify.register(mcpRoutes, { pool: database });
  await fastify.register(campaignRedirectRoutes, { config, database });

  fastify.decorate('deliverPushNotifications', deliverPendingPushNotifications);

  const verifyAdminKey = (request, reply) => {
    if (!config.adminSecretKey || request.headers['x-admin-key'] !== config.adminSecretKey) {
      reply.code(403).send({ error: 'Forbidden' });
      return false;
    }
    return true;
  };

  fastify.post('/api/v1/internal/notifications/drain-outbox', async (request, reply) => {
    if (!verifyAdminKey(request, reply)) return;
    const limit = Number(request.query?.limit || config.outboxDrainBatchSize || 25);
    const maxSeconds = Number(request.query?.maxSeconds || config.outboxDrainMaxSeconds || 20);
    const outcome = await deliverPendingPushNotifications({ limit, maxSeconds });
    return outcome;
  });

  fastify.post('/api/v1/internal/notifications/fanout-publications', async (request, reply) => {
    if (!verifyAdminKey(request, reply)) return;
    const outcome = await runFollowedWriterNotifications(database);
    return outcome;
  });

  fastify.post('/api/v1/internal/maintenance/feed-retention', async (request, reply) => {
    if (!verifyAdminKey(request, reply)) return;
    const outcome = await cleanExpiredFeedData(database);
    return outcome;
  });

  const handleDailyDigestRun = async (request, reply) => {
    if (!verifyAdminKey(request, reply)) return;
    const outcome = await runDailyDigest(database, firebaseMessaging, fastify.log);
    return outcome;
  };
  fastify.post('/api/v1/internal/notifications/daily-digest', handleDailyDigestRun);
  // Temporary compatibility path for existing operator tooling.
  fastify.post('/api/v1/spark/daily-digest/test', handleDailyDigestRun);

  fastify.post('/api/v1/internal/notifications/discovery', async (request, reply) => {
    if (!verifyAdminKey(request, reply)) return;
    const parsed = z.object({
      dryRun: z.enum(['true', 'false']).default('true'),
      limit: z.coerce.number().int().min(1).max(500).default(100),
    }).safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid discovery notification run' });
    const dryRun = parsed.data.dryRun !== 'false';
    if (!dryRun && !config.discoveryNotificationsEnabled) {
      return reply.code(409).send({ error: 'Discovery notification delivery is disabled' });
    }
    return runDiscoveryNotifications(database, firebaseMessaging, fastify.log, {
      dryRun,
      batchSize: parsed.data.limit,
    });
  });


  fastify.get('/campaign-assets/:filename', async (request, reply) => {
    const filename = resolve(request.params.filename);
    const safeBaseName = filename.split(/[\\/]/).pop();
    const filePath = resolve(process.cwd(), '../campaign/fomo-ground-floor/rendered-assets', safeBaseName);
    try {
      const file = await fs.readFile(filePath);
      reply.header('Content-Type', 'image/png');
      reply.header('Cache-Control', 'public, max-age=86400');
      return reply.send(file);
    } catch {
      return reply.code(404).send({ error: 'Campaign asset not found' });
    }
  });

  fastify.post('/api/v1/spark/campaign/publish-now', { preHandler: requireUser }, async (request, reply) => {
    if (!config.adminSecretKey || request.headers['x-admin-key'] !== config.adminSecretKey) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    const day = Number(request.query?.day || request.body?.day || 1);
    const outcome = await runDailyCampaignPublish({ day, config, log: fastify.log });
    return outcome;
  });

  return fastify;
}

const isEntrypoint = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const runtimeConfig = loadRuntimeConfig();
  const database = new Pool({
    connectionString: runtimeConfig.databaseUrl,
    max: runtimeConfig.databasePoolMax,
    ssl: { rejectUnauthorized: false },
  });
  const fastify = await buildServer({ runtimeConfig, pool: database });
  try {
    await fastify.listen({ port: runtimeConfig.port, host: '0.0.0.0' });
    if (runtimeConfig.timersDisabled) {
      fastify.log.info({ service: process.env.K_SERVICE || 'explicit' }, 'In-process background timer loops disabled (relying on Cloud Scheduler)');
    } else {
      if (runtimeConfig.sparkAutomationEnabled) {
        startSparkScheduler(database, 15);
        startMasterDailyScheduler(database);
      }
      if (runtimeConfig.pushDeliveryEnabled) {
        const runPushDelivery = async () => {
          try {
            const outcome = await fastify.deliverPushNotifications();
            if (outcome.processed > 0) fastify.log.info(outcome, 'Processed push notification delivery work');
          } catch (error) {
            fastify.log.error({ err: error }, 'Push notification delivery pass failed');
          }
        };
        void runPushDelivery();
        setInterval(() => { void runPushDelivery(); }, runtimeConfig.pushDeliveryPollIntervalMs).unref();
      }
      if (runtimeConfig.followedWriterNotificationsEnabled) {
        const runPublicationFanout = async () => {
          try {
            const outcome = await runFollowedWriterNotifications(database);
            if (outcome.processed > 0) fastify.log.info(outcome, 'Processed followed-writer publication events');
          } catch (error) {
            fastify.log.error({ err: error }, 'Followed-writer publication fan-out failed');
          }
        };
        void runPublicationFanout();
        setInterval(() => { void runPublicationFanout(); }, runtimeConfig.pushDeliveryPollIntervalMs).unref();
      }
      if (runtimeConfig.dailyDigestEnabled) {
        const scheduleDailyDigest = () => {
          const now = new Date();
          const target = new Date(now);
          target.setUTCHours(runtimeConfig.dailyDigestHourUtc, runtimeConfig.dailyDigestMinuteUtc, 0, 0);
          if (target <= now) target.setDate(target.getDate() + 1);
          const delayMs = target.getTime() - now.getTime();
          fastify.log.info({ nextRunAt: target.toISOString(), delayMs }, 'Daily digest notification scheduled');
          setTimeout(async () => {
            try {
              const firebaseMessaging = getMessaging(getApps()[0]);
              const outcome = await runDailyDigest(database, firebaseMessaging, fastify.log);
              fastify.log.info(outcome, 'Daily digest completed');
            } catch (error) {
              fastify.log.error({ err: error }, 'Daily digest failed');
            }
            scheduleDailyDigest();
          }, delayMs).unref();
        };
        scheduleDailyDigest();
      }
      if (runtimeConfig.socialAutoPublishEnabled) {
        const scheduleSocialCampaign = () => {
          const now = new Date();
          const target = new Date(now);
          target.setUTCHours(runtimeConfig.socialAutoPublishHourUtc, runtimeConfig.socialAutoPublishMinuteUtc, 0, 0);
          if (target <= now) target.setDate(target.getDate() + 1);
          const delayMs = target.getTime() - now.getTime();
          fastify.log.info({ nextRunAt: target.toISOString(), delayMs }, 'Social campaign auto-publisher scheduled');
          setTimeout(async () => {
            try {
              const dayOfCampaign = Math.max(1, Math.min(30, Math.ceil((Date.now() - new Date('2026-09-01T00:00:00Z').getTime()) / (24 * 3600 * 1000))));
              const outcome = await runDailyCampaignPublish({ day: dayOfCampaign, config: runtimeConfig, log: fastify.log });
              fastify.log.info(outcome, 'Social campaign auto-publish pass completed');
            } catch (error) {
              fastify.log.error({ err: error }, 'Social campaign auto-publish failed');
            }
            scheduleSocialCampaign();
          }, delayMs).unref();
        };
        scheduleSocialCampaign();
      }
      const runFeedRetention = async () => {
        try {
          const outcome = await cleanExpiredFeedData(database);
          fastify.log.info(outcome, 'Completed reader-feed retention cleanup');
        } catch (error) {
          fastify.log.error({ err: error }, 'Reader-feed retention cleanup failed');
        }
      };
      void runFeedRetention();
      setInterval(() => { void runFeedRetention(); }, 24 * 60 * 60 * 1_000).unref();
    }

  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}
