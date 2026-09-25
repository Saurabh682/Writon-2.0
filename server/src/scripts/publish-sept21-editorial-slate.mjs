import fs from 'fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import { validateZeroAISlopEngineBlockers, validateGeneratedArticleIntegrity } from '../bot-engine/editorial-intelligence-service.js';
import { getCoverImageForCategory } from '../bot-engine/image-service.js';
import { recordLedgerEntry } from '../bot-engine/editorial-ledger-service.js';

dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

function createSlug(title) {
  const readable = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'story';
  return `${readable}-${randomUUID().slice(0, 12)}`;
}

function calculateReadingTime(content) {
  const text = (content || '').trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

// 1. Read and parse the approved essays from prompt
const raw = fs.readFileSync('d:/VibeCode/WritOn-PowerUp/scratch/user_prompt_essays.txt', 'utf8');

const p1Start = raw.indexOf('1. The Proofreader Trap: Why Senior Engineers Are Drowning in Synthetic Code');
const p2Start = raw.indexOf('2. The Tactile Sanctuary: Why a Generation Raised on Screens Is Returning to Paper');
const p3Start = raw.indexOf('3. The Glass Cathedral: Why We Queue for a Phone That Can Arrive in Ten Minutes');
const p4Start = raw.indexOf('4. Your App Should Survive Its Server: The Case for Local-First Software');
const endMarker = raw.indexOf('These are ready as editorial drafts.');

function extractPiece(chunk) {
  const lines = chunk.trim().split('\n');
  const titleLine = lines[0].replace(/^\d+\.\s*/, '').trim();
  let tags = [];
  const contentLines = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('Suggested tags:')) {
      tags = l.replace('Suggested tags:', '').split(',').map(t => t.trim());
    } else {
      contentLines.push(l);
    }
  }
  const content = contentLines.join('\n').trim();
  return { title: titleLine, content, tags };
}

const piece1 = extractPiece(raw.slice(p1Start, p2Start));
piece1.category = 'Tech';
piece1.authorId = 'bot_aarav_tech';
piece1.authorPenName = 'aarav_tech';
piece1.summary = 'AI made producing code cheaper. It did not make understanding code cheaper. Senior engineers are drowning in review queues filled with synthetic code.';

const piece2 = extractPiece(raw.slice(p2Start, p3Start));
piece2.category = 'Essays';
piece2.authorId = 'bot_sunita_essays';
piece2.authorPenName = 'sunita_banerjee';
piece2.summary = 'Perhaps the most radical feature of a book is that nothing happens when you touch the page. Why Gen Z is rediscovering paper as a tactile sanctuary.';

const piece3 = extractPiece(raw.slice(p3Start, p4Start));
piece3.category = 'Culture';
piece3.authorId = 'bot_writer_065';
piece3.authorPenName = 'gopal_krishnan_jokes';
piece3.summary = 'Convenience can deliver the object. It cannot always deliver the occasion. Why we queue for a phone that can arrive in ten minutes.';

const piece4 = extractPiece(raw.slice(p4Start, endMarker));
piece4.category = 'Tech';
piece4.authorId = 'bot_aarav_tech';
piece4.authorPenName = 'aarav_tech';
piece4.summary = 'Somewhere along the way, opening your own document became a network request. Your application should still belong to you when the internet goes dark.';

const editorialSlate = [piece1, piece2, piece3, piece4];

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log(`Starting publication of September 21, 2026 Editorial Slate (${editorialSlate.length} pieces)...`);

  // Pre-flight validation gate
  for (const piece of editorialSlate) {
    console.log(`\nValidating: "${piece.title}"`);
    const slopCheck = validateZeroAISlopEngineBlockers({
      title: piece.title,
      content: piece.content,
      summary: piece.summary,
      now: new Date()
    });
    if (!slopCheck.isValid) {
      throw new Error(`Slop blocker failed for "${piece.title}": ${JSON.stringify(slopCheck.violations)}`);
    }

    const integrity = validateGeneratedArticleIntegrity({
      title: piece.title,
      content: piece.content,
      category: piece.category
    });
    if (!integrity.isValid) {
      throw new Error(`Integrity check failed for "${piece.title}": ${integrity.reasons.join('; ')}`);
    }
  }
  console.log('\n✅ All 4 pieces passed Zero AI Slop & Article Integrity Gates.\n');

  const client = await pool.connect();
  const publishedStories = [];

  try {
    await client.query('begin');

    for (let i = 0; i < editorialSlate.length; i++) {
      const piece = editorialSlate[i];
      const slug = createSlug(piece.title);
      const readingTime = calculateReadingTime(piece.content);
      const wordCount = piece.content.split(/\s+/).filter(Boolean).length;
      const coverImage = getCoverImageForCategory(piece.category);

      console.log(`[${i + 1}/${editorialSlate.length}] Publishing "${piece.title}" by ${piece.authorPenName} (${piece.authorId})...`);

      // Check if already published with this exact title
      const existing = await client.query(`
        SELECT id, slug, title FROM public.posts WHERE title = $1 LIMIT 1
      `, [piece.title]);

      let postId;
      let finalSlug;

      if (existing.rowCount > 0) {
        postId = existing.rows[0].id;
        finalSlug = existing.rows[0].slug;
        console.log(`  Existing post found: ${postId} (updating content)`);
        await client.query(`
          UPDATE public.posts
          SET summary = $1,
              content = $2,
              category = $3,
              reading_time_min = $4,
              word_count = $5,
              updated_at = now()
          WHERE id = $6
        `, [piece.summary, piece.content, piece.category, readingTime, wordCount, postId]);
      } else {
        const insertRes = await client.query(`
          INSERT INTO public.posts (
            slug, author_id, title, summary, content, category, cover_image_url,
            status, is_public, reading_time_min, published_at, provenance,
            language_code, language_source, language_confidence,
            word_count, word_count_source, created_at, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            'published', true, $8, now(), 'synthetic',
            'en', 'author', 1.0,
            $9, 'system', now(), now()
          )
          RETURNING id, slug, title, category, author_id, published_at
        `, [
          slug,
          piece.authorId,
          piece.title,
          piece.summary,
          piece.content,
          piece.category,
          coverImage,
          readingTime,
          wordCount
        ]);

        postId = insertRes.rows[0].id;
        finalSlug = insertRes.rows[0].slug;
        console.log(`  ✅ Inserted post ID: ${postId} (slug: ${finalSlug})`);
      }

      // Update bot config last_posted_at
      await client.query(`
        UPDATE public.bot_configs
        SET last_posted_at = now(), updated_at = now()
        WHERE id = $1
      `, [piece.authorId]);

      // Record activity log
      await client.query(`
        INSERT INTO public.bot_activity_logs (bot_id, action_type, target_post_id, details, status)
        VALUES ($1, 'post', $2, $3, 'success')
      `, [piece.authorId, postId, JSON.stringify({ title: piece.title, category: piece.category, priority: i + 1 })]);

      publishedStories.push({
        id: postId,
        slug: finalSlug,
        title: piece.title,
        author: piece.authorPenName,
        authorId: piece.authorId,
        category: piece.category,
        readingTime,
        wordCount,
        tags: piece.tags
      });

      // Record in Editorial Ledger
      await recordLedgerEntry(pool, {
        status: 'executed',
        entryType: 'publication',
        authorId: piece.authorId,
        authorPenName: piece.authorPenName,
        genre: piece.category,
        title: piece.title,
        approxWordCount: wordCount,
        targetPostId: postId,
        details: { slug: finalSlug, tags: piece.tags, editorialBatch: '2026-09-21-slate' }
      }).catch(err => console.warn('Ledger recording warning:', err.message));
    }

    await client.query('commit');
    console.log('\n🎉 Successfully committed all 4 posts to database in exact priority order!');
    console.table(publishedStories.map(s => ({
      ID: s.id,
      Author: `${s.author} (${s.authorId})`,
      Category: s.category,
      Words: s.wordCount,
      Title: s.title
    })));

  } catch (err) {
    await client.query('rollback');
    console.error('❌ Failed to publish editorial slate:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
