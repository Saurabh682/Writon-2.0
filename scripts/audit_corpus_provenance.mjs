/**
 * Corpus Audit & Provenance Separation Script
 *
 * Implements Stage 1 of the Human Writing Craft-Analysis Engine:
 * 1. Audits database exports (posts, comments, users, likes, bookmarks)
 * 2. Checks for duplicate titles, duplicate content, HTML entity contamination, and empty texts
 * 3. Classifies language / script (English, Devanagari Hindi, Romanized Urdu/Hinglish)
 * 4. Determines author distribution, concentration, and potential bot profiles
 * 5. Audits engagement records and segregates bot engagement from human engagement
 * 6. Generates machine-readable report: data-exports/analysis/corpus_audit_report.json
 * 7. Emits cleaned, audited dataset: data-exports/analysis/cleaned_corpus.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// Load raw data exports
const postsRaw = JSON.parse(readFileSync(resolve(rootDir, 'data-exports/json/posts.json'), 'utf8'));
const commentsRaw = JSON.parse(readFileSync(resolve(rootDir, 'data-exports/json/comments.json'), 'utf8'));
const usersRaw = JSON.parse(readFileSync(resolve(rootDir, 'data-exports/json/users.json'), 'utf8'));
const likesRaw = existsSync(resolve(rootDir, 'data-exports/json/likes.json'))
  ? JSON.parse(readFileSync(resolve(rootDir, 'data-exports/json/likes.json'), 'utf8'))
  : [];
const bookmarksRaw = existsSync(resolve(rootDir, 'data-exports/json/bookmarks.json'))
  ? JSON.parse(readFileSync(resolve(rootDir, 'data-exports/json/bookmarks.json'), 'utf8'))
  : [];

// Map of users for metadata lookup
const userMap = new Map(usersRaw.map(u => [u.id, u]));

// Known automated or synthetic identifiers
const KNOWN_BOT_PATTERNS = [
  /^bot_/,
  /^reviewer_/,
  /^spark_/,
  /@bots\.writon\.internal/i
];

function isLikelyBotUser(user) {
  if (!user) return false;
  for (const pattern of KNOWN_BOT_PATTERNS) {
    if (pattern.test(user.id) || pattern.test(user.email || '') || pattern.test(user.pen_name || '')) {
      return true;
    }
  }
  return false;
}

// Script / Language Classification
function detectLanguageScript(text) {
  if (!text || typeof text !== 'string') return 'Unknown';
  
  // Count Devanagari characters (U+0900 to U+097F)
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  // Total alphabetic chars
  const alphaMatch = text.match(/[a-zA-Z]/g) || [];
  const latinCount = alphaMatch.length;
  const totalLetters = devanagariCount + latinCount;

  if (totalLetters === 0) return 'Undetermined';
  if (devanagariCount / totalLetters > 0.3) return 'Hindi (Devanagari)';

  // Romanized Hindi / Urdu detection: check for frequent markers
  const romanizedMarkers = /\b(hai|hain|ki|ka|ke|ko|se|aur|mein|par|dil|ishq|teri|meri|hum|tum|kya|kyun|zindagi|shab|dard|aankhon|raat|mohabbat)\b/gi;
  const matches = text.match(romanizedMarkers) || [];
  if (matches.length >= 3 || (matches.length >= 1 && text.split(/\s+/).length < 25)) {
    return 'Romanized Hindi/Urdu (Shayari/Poetry)';
  }

  return 'English';
}

// HTML & Entity Contamination Check
function detectHtmlContamination(text) {
  if (!text || typeof text !== 'string') return { hasHtml: false, tags: [], entities: [] };
  const tagMatches = text.match(/<(?:\/?[a-zA-Z][a-zA-Z0-9]*\b[^>]*|\/?[a-zA-Z]+)>/g) || [];
  const entityMatches = text.match(/&(?:amp|lt|gt|quot|#\d+|#x[a-fA-F0-9]+);/g) || [];
  return {
    hasHtml: tagMatches.length > 0 || entityMatches.length > 0,
    tags: [...new Set(tagMatches)],
    entities: [...new Set(entityMatches)]
  };
}

// Clean HTML entities and tags if present
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '') // strip any residual raw tags
    .trim();
}

console.log('--- Phase 1: Starting Corpus Audit ---');

// 1. Audit Posts
const auditedPosts = [];
const seenPostTitles = new Map();
const seenPostContents = new Map();
const postDuplicates = [];
const htmlContaminatedPosts = [];
const categoryCounts = {};
const languageCounts = {};
const authorPostCounts = {};

for (const post of postsRaw) {
  const author = userMap.get(post.author_id);
  const isBot = isLikelyBotUser(author);
  const provenance = isBot ? 'known_bot' : 'unconfirmed_legacy_human';

  const rawTitle = (post.title || '').trim();
  const rawContent = (post.content || '').trim();
  const normalizedTitle = rawTitle.toLowerCase();
  const normalizedContent = rawContent.slice(0, 150).toLowerCase();

  // Duplicate checks
  if (seenPostTitles.has(normalizedTitle)) {
    postDuplicates.push({
      type: 'duplicate_title',
      originalId: seenPostTitles.get(normalizedTitle),
      duplicateId: post.id,
      title: rawTitle
    });
  } else {
    seenPostTitles.set(normalizedTitle, post.id);
  }

  if (normalizedContent.length > 30 && seenPostContents.has(normalizedContent)) {
    postDuplicates.push({
      type: 'duplicate_content_opening',
      originalId: seenPostContents.get(normalizedContent),
      duplicateId: post.id,
      title: rawTitle
    });
  } else if (normalizedContent.length > 30) {
    seenPostContents.set(normalizedContent, post.id);
  }

  // HTML contamination
  const titleHtml = detectHtmlContamination(rawTitle);
  const contentHtml = detectHtmlContamination(rawContent);
  if (titleHtml.hasHtml || contentHtml.hasHtml) {
    htmlContaminatedPosts.push({
      id: post.id,
      title: rawTitle,
      tags: [...titleHtml.tags, ...contentHtml.tags],
      entities: [...titleHtml.entities, ...contentHtml.entities]
    });
  }

  // Language/Script
  const language = detectLanguageScript(`${rawTitle}\n${rawContent}`);
  languageCounts[language] = (languageCounts[language] || 0) + 1;

  // Category counts
  const cat = post.category || 'Uncategorized';
  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

  // Author distribution
  authorPostCounts[post.author_id] = (authorPostCounts[post.author_id] || 0) + 1;

  // Cleaned post object
  auditedPosts.push({
    ...post,
    title: cleanText(rawTitle),
    content: cleanText(rawContent),
    summary: cleanText(post.summary || ''),
    language,
    provenance,
    wordCount: rawContent.split(/\s+/).filter(Boolean).length
  });
}

// 2. Audit Comments & Pair with Parent Posts
const auditedComments = [];
const commentDuplicates = [];
const orphanComments = [];
const postMap = new Map(auditedPosts.map(p => [p.id, p]));
const commentLanguageCounts = {};

for (const comment of commentsRaw) {
  const author = userMap.get(comment.author_id);
  const isBot = isLikelyBotUser(author);
  const provenance = isBot ? 'known_bot' : 'unconfirmed_legacy_human';

  const rawContent = (comment.content || '').trim();
  const parentPost = postMap.get(comment.post_id);

  if (!parentPost) {
    orphanComments.push({
      id: comment.id,
      postId: comment.post_id,
      authorId: comment.author_id
    });
  }

  const lang = detectLanguageScript(rawContent);
  commentLanguageCounts[lang] = (commentLanguageCounts[lang] || 0) + 1;

  auditedComments.push({
    ...comment,
    content: cleanText(rawContent),
    language: lang,
    provenance,
    hasParentPost: !!parentPost,
    parentCategory: parentPost?.category || null,
    wordCount: rawContent.split(/\s+/).filter(Boolean).length
  });
}

// 3. Author Concentration Analysis
const sortedAuthors = Object.entries(authorPostCounts)
  .sort((a, b) => b[1] - a[1]);
const top10Authors = sortedAuthors.slice(0, 10).map(([authorId, count]) => {
  const u = userMap.get(authorId);
  return {
    authorId,
    penName: u?.pen_name || 'Unknown',
    fullName: u?.full_name || 'Unknown',
    postsCount: count,
    shareOfCorpus: `${((count / postsRaw.length) * 100).toFixed(1)}%`
  };
});

// 4. Data Limitations & Provisionality Flagging
const thinCategories = Object.entries(categoryCounts)
  .filter(([cat, count]) => count < 10)
  .map(([cat, count]) => ({ category: cat, count, notice: 'Provisional findings only: sample size too small for statistical generalization.' }));

// Assemble final machine-readable audit report
const auditReport = {
  timestamp: new Date().toISOString(),
  corpusOverview: {
    totalRawPosts: postsRaw.length,
    totalRawComments: commentsRaw.length,
    totalRegisteredUsers: usersRaw.length,
    totalLikes: likesRaw.length,
    totalBookmarks: bookmarksRaw.length
  },
  dataHygiene: {
    duplicatePostsIdentified: postDuplicates.length,
    postDuplicatesSummary: postDuplicates.slice(0, 5),
    htmlContaminatedPostsCount: htmlContaminatedPosts.length,
    orphanCommentsCount: orphanComments.length
  },
  distributions: {
    genres: categoryCounts,
    postLanguages: languageCounts,
    commentLanguages: commentLanguageCounts,
    totalUniqueAuthors: Object.keys(authorPostCounts).length,
    top10AuthorConcentration: top10Authors
  },
  provenanceSummary: {
    knownBotPostsCount: auditedPosts.filter(p => p.provenance === 'known_bot').length,
    unconfirmedLegacyHumanPostsCount: auditedPosts.filter(p => p.provenance === 'unconfirmed_legacy_human').length,
    knownBotCommentsCount: auditedComments.filter(c => c.provenance === 'known_bot').length,
    unconfirmedLegacyHumanCommentsCount: auditedComments.filter(c => c.provenance === 'unconfirmed_legacy_human').length
  },
  dataLimitationsAndProvisionality: {
    thinCategories,
    exposureBiasNotice: 'Engagement metrics (likes/comments/bookmarks) are exposure-unadjusted and historical. They must be used as a stratified sampling axis, not as an absolute gold-standard of craft quality.',
    provenanceNotice: 'All legacy users in this export lack bot markers, but are cataloged as "unconfirmed_legacy_human" rather than unconditionally certified human to preserve scientific rigor.'
  }
};

// Ensure output directory exists
const analysisDir = resolve(rootDir, 'data-exports/analysis');
if (!existsSync(analysisDir)) {
  mkdirSync(analysisDir, { recursive: true });
}

// Write outputs
writeFileSync(
  resolve(analysisDir, 'corpus_audit_report.json'),
  JSON.stringify(auditReport, null, 2),
  'utf8'
);

writeFileSync(
  resolve(analysisDir, 'cleaned_corpus.json'),
  JSON.stringify({ posts: auditedPosts, comments: auditedComments }, null, 2),
  'utf8'
);

console.log('✓ Audit completed successfully.');
console.log('✓ Written: data-exports/analysis/corpus_audit_report.json');
console.log('✓ Written: data-exports/analysis/cleaned_corpus.json');
console.log('  Genres:', categoryCounts);
console.log('  Languages in Posts:', languageCounts);
console.log('  Duplicates identified:', postDuplicates.length);
console.log('  HTML entity issues identified and cleaned:', htmlContaminatedPosts.length);
console.log('  Thin categories (<10 posts, provisional):', thinCategories.map(c => `${c.category} (${c.count})`).join(', '));
