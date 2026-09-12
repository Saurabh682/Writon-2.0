#!/usr/bin/env node
/**
 * study_human_corpus.mjs
 * 
 * Analyzes WritOn's human-authored writing database:
 * - Offline mode (default): data-exports/json/posts.json & comments.json (630 posts, 804 comments, 176k words)
 * - Live DB mode (--live): Queries PostgreSQL directly for author_id NOT LIKE 'bot_%' (623 human posts)
 * 
 * Calculates mathematical stylometrics (burstiness, sentence cadence, lexical diversity),
 * scans for synthetic AI tropes, and extracts the top-performing human writing exemplars.
 * 
 * Follows Ponytail principle: zero heavy dependencies.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: path.resolve('server/.env') });

const POSTS_PATH = path.resolve('data-exports/json/posts.json');
const COMMENTS_PATH = path.resolve('data-exports/json/comments.json');
const USERS_PATH = path.resolve('data-exports/json/users.json');
const OUTPUT_DIR = path.resolve('data-exports/analysis');

// 35 Common AI words and tropes rarely used in raw, unmannered human prose
const NOTORIOUS_AI_TROPES = [
  'delve', 'delving', 'tapestry', 'beacon', 'testament', 'realm', 'crucial',
  'landscape', 'unwavering', 'bustling', 'pivotal', 'moreover', 'furthermore',
  'in conclusion', 'it is important to remember', 'serves as a reminder',
  'beacon of hope', 'rich tapestry', 'vital role', 'paramount', 'dynamic',
  'multifaceted', 'ever-evolving', 'embark', 'unfurl', 'poignant reminder',
  'testament to', 'game-changer', 'fostering', 'holistic', 'intertwined',
  'nuanced', 'resonates deeply', 'seamlessly', 'shedding light'
];

function splitSentences(text) {
  if (!text) return [];
  const clean = text
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ');

  const raw = clean.match(/[^.!?]+[.!?]+(\s|$)/g) || [clean];
  return raw
    .map(s => s.trim())
    .filter(s => s.length > 3 && /\w/.test(s));
}

function computeStats(numbers) {
  if (!numbers || numbers.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0, median: 0 };
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  const mean = sum / sorted.length;
  const variance = sorted.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);
  const median = sorted[Math.floor(sorted.length / 2)];
  return {
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median
  };
}

function analyzeLexicon(tokens) {
  if (tokens.length === 0) return { totalTokens: 0, uniqueTokens: 0, ttr: 0 };
  const set = new Set(tokens.map(t => t.toLowerCase()));
  const ttr = set.size / tokens.length;
  return {
    totalTokens: tokens.length,
    uniqueTokens: set.size,
    ttr: Number(ttr.toFixed(4))
  };
}

async function loadData(isLive) {
  if (isLive && process.env.DATABASE_URL) {
    console.log('🌐 Querying live PostgreSQL database for human-only posts (author_id NOT LIKE "bot_%")...');
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    try {
      const postsRes = await pool.query(`
        SELECT p.id, p.author_id, p.title, p.category, p.content, 
               p.likes_count as likes_cnt, p.comments_count as comments_cnt, p.bookmarks_count as bookmarks_cnt,
               p.language_code,
               pr.pen_name, pr.full_name
        FROM public.posts p
        LEFT JOIN public.profiles pr ON p.author_id = pr.id
        WHERE p.author_id NOT LIKE 'bot_%'
      `);
      const commentsRes = await pool.query(`
        SELECT c.id, c.post_id, c.author_id, c.content 
        FROM public.comments c
        WHERE c.author_id NOT LIKE 'bot_%'
      `);
      const usersRes = await pool.query(`
        SELECT id, pen_name, full_name, bio FROM public.profiles WHERE id NOT LIKE 'bot_%'
      `);
      return {
        posts: postsRes.rows,
        comments: commentsRes.rows,
        users: usersRes.rows,
        source: 'Live PostgreSQL Database'
      };
    } finally {
      await pool.end();
    }
  }

  console.log('📖 Ingesting from data-exports/json files (offline fallback)...');
  const [postsRaw, commentsRaw, usersRaw] = await Promise.all([
    fs.readFile(POSTS_PATH, 'utf8'),
    fs.readFile(COMMENTS_PATH, 'utf8'),
    fs.readFile(USERS_PATH, 'utf8')
  ]);
  return {
    posts: JSON.parse(postsRaw),
    comments: JSON.parse(commentsRaw),
    users: JSON.parse(usersRaw),
    source: 'data-exports/json'
  };
}

async function run() {
  const isLive = process.argv.includes('--live');
  const { posts, comments, users, source } = await loadData(isLive);
  const userMap = new Map(users.map(u => [u.id, u]));

  console.log(`✅ Loaded ${posts.length} human posts, ${comments.length} human comments, ${users.length} human authors from ${source}.`);

  let allSentenceLengths = [];
  let allWordTokens = [];
  const categoryStats = {};
  const tropeOccurrences = {};
  const punctuationCounts = {
    emDash: 0,
    semicolon: 0,
    colon: 0,
    question: 0,
    ellipsis: 0,
    exclamation: 0
  };

  for (const trope of NOTORIOUS_AI_TROPES) {
    tropeOccurrences[trope] = 0;
  }

  posts.forEach(post => {
    const content = post.content || '';
    const cat = post.category || 'Uncategorized';
    if (!categoryStats[cat]) {
      categoryStats[cat] = {
        count: 0,
        words: 0,
        sentenceLengths: [],
        tokens: []
      };
    }

    // Punctuation
    punctuationCounts.emDash += (content.match(/—|--/g) || []).length;
    punctuationCounts.semicolon += (content.match(/;/g) || []).length;
    punctuationCounts.colon += (content.match(/:/g) || []).length;
    punctuationCounts.question += (content.match(/\?/g) || []).length;
    punctuationCounts.ellipsis += (content.match(/\.{3}|…/g) || []).length;
    punctuationCounts.exclamation += (content.match(/!/g) || []).length;

    // AI Tropes
    const lowerContent = content.toLowerCase();
    for (const trope of NOTORIOUS_AI_TROPES) {
      const regex = new RegExp(`\\b${trope}\\b`, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) {
        tropeOccurrences[trope] += matches.length;
      }
    }

    // Tokens
    const tokens = content.match(/[\p{L}\p{N}']+/gu) || [];
    allWordTokens.push(...tokens);
    categoryStats[cat].tokens.push(...tokens);
    categoryStats[cat].words += tokens.length;
    categoryStats[cat].count += 1;

    // Sentence lengths
    const sentences = splitSentences(content);
    const lengths = sentences.map(s => (s.match(/[\p{L}\p{N}']+/gu) || []).length).filter(l => l > 0);
    allSentenceLengths.push(...lengths);
    categoryStats[cat].sentenceLengths.push(...lengths);
  });

  const overallSentenceStats = computeStats(allSentenceLengths);
  const overallLexicalStats = analyzeLexicon(allWordTokens);

  const categoryReport = {};
  for (const [cat, data] of Object.entries(categoryStats)) {
    categoryReport[cat] = {
      postCount: data.count,
      totalWords: data.words,
      avgWordsPerPost: Math.round(data.words / (data.count || 1)),
      sentenceLengthStats: computeStats(data.sentenceLengths),
      lexicalStats: analyzeLexicon(data.tokens)
    };
  }

  const rankedPosts = posts
    .map(p => {
      const likes = p.likes_cnt || 0;
      const bookmarks = p.bookmarks_cnt || 0;
      const commentsCnt = p.comments_cnt || 0;
      const engagement = likes + bookmarks * 2 + commentsCnt * 3;
      const author = userMap.get(p.author_id);
      return {
        id: p.id,
        title: p.title,
        authorName: p.pen_name || author?.pen_name || p.full_name || author?.full_name || 'Anonymous',
        category: p.category,
        engagement,
        likes,
        bookmarks,
        comments: commentsCnt,
        excerpt: (p.content || '').replace(/<[^>]+>/g, ' ').slice(0, 500).trim()
      };
    })
    .sort((a, b) => b.engagement - a.engagement);

  const commentLengths = comments.map(c => (c.content.match(/[\p{L}\p{N}']+/gu) || []).length);
  const commentStats = computeStats(commentLengths);

  const sortedTropes = Object.entries(tropeOccurrences)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, count]) => count > 0);

  const report = {
    source,
    generatedAt: new Date().toISOString(),
    corpusOverview: {
      totalPosts: posts.length,
      totalComments: comments.length,
      totalWords: allWordTokens.length,
      totalSentences: allSentenceLengths.length,
      avgWordsPerPost: Math.round(allWordTokens.length / posts.length)
    },
    burstinessAndCadence: {
      sentenceLength: overallSentenceStats,
      burstinessIndex: overallSentenceStats.stdDev,
      interpretation: overallSentenceStats.stdDev >= 7.0 
        ? 'High Burstiness: Natural human variance between short punchy statements and long expressive clauses.'
        : 'Low Burstiness: Monotonous machine-like cadence.'
    },
    lexicalRichness: {
      totalWords: overallLexicalStats.totalTokens,
      uniqueWords: overallLexicalStats.uniqueTokens,
      typeTokenRatio: overallLexicalStats.ttr
    },
    punctuationFingerprint: {
      counts: punctuationCounts,
      per1000Words: {
        emDash: Number(((punctuationCounts.emDash / allWordTokens.length) * 1000).toFixed(2)),
        semicolon: Number(((punctuationCounts.semicolon / allWordTokens.length) * 1000).toFixed(2)),
        colon: Number(((punctuationCounts.colon / allWordTokens.length) * 1000).toFixed(2)),
        question: Number(((punctuationCounts.question / allWordTokens.length) * 1000).toFixed(2)),
        ellipsis: Number(((punctuationCounts.ellipsis / allWordTokens.length) * 1000).toFixed(2)),
        exclamation: Number(((punctuationCounts.exclamation / allWordTokens.length) * 1000).toFixed(2))
      }
    },
    aiTropePrevalence: {
      totalTropeHits: sortedTropes.reduce((sum, [_, c]) => sum + c, 0),
      topHits: Object.fromEntries(sortedTropes.slice(0, 10)),
      prevalenceRatePer10kWords: Number(((sortedTropes.reduce((sum, [_, c]) => sum + c, 0) / allWordTokens.length) * 10000).toFixed(2)),
      zeroUsageTropes: NOTORIOUS_AI_TROPES.filter(t => tropeOccurrences[t] === 0)
    },
    categoryBreakdown: categoryReport,
    commentBehavior: {
      count: comments.length,
      lengthStats: commentStats,
      avgWordsPerComment: commentStats.mean
    },
    topExemplars: rankedPosts.slice(0, 25)
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outFileName = isLive ? 'live_db_empirical_craft_report.json' : 'corpus_stylometrics.json';
  const finalOut = path.resolve(OUTPUT_DIR, outFileName);
  await fs.writeFile(finalOut, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n📊 === WRITON HUMAN CORPUS STYLOMETRIC SUMMARY ===');
  console.log(`Source: ${report.source}`);
  console.log(`Total Corpus Size: ${report.corpusOverview.totalWords.toLocaleString()} words across ${report.corpusOverview.totalPosts} human posts`);
  console.log(`Sentence Length Mean: ${report.burstinessAndCadence.sentenceLength.mean} words (Median: ${report.burstinessAndCadence.sentenceLength.median})`);
  console.log(`Burstiness Index (StdDev): ${report.burstinessAndCadence.burstinessIndex} (Benchmark: > 7.0 = authentic human rhythm)`);
  console.log(`Lexical Richness (TTR): ${report.lexicalRichness.typeTokenRatio}`);
  console.log(`Punctuation per 1,000 words: Em-dash: ${report.punctuationFingerprint.per1000Words.emDash} | Question: ${report.punctuationFingerprint.per1000Words.question} | Ellipsis: ${report.punctuationFingerprint.per1000Words.ellipsis}`);
  console.log(`AI Cliches absent entirely in human corpus: ${report.aiTropePrevalence.zeroUsageTropes.length} out of ${NOTORIOUS_AI_TROPES.length}`);
  console.log(`Average Comment Length: ${report.commentBehavior.avgWordsPerComment} words`);
  console.log(`📁 Detailed analysis saved to: ${finalOut}\n`);
}

run().catch(err => {
  console.error('Analysis failed:', err);
  process.exit(1);
});
