/**
 * publish-sept25-editorial-slate.mjs
 * 
 * Directly executes the 25 September 2026 editorial publication:
 * "Generation Scaled, Verification Didn’t" by Aarav Mehta (@aarav_tech)
 */

import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import pg from 'pg';
import dotenv from 'dotenv';
import { validateZeroAISlopEngineBlockers, validateGeneratedArticleIntegrity } from '../bot-engine/editorial-intelligence-service.js';
import { getCoverImageForCategory } from '../bot-engine/image-service.js';
import { recordLedgerEntry } from '../bot-engine/editorial-ledger-service.js';

dotenv.config({ path: 'D:/VibeCode/WritOn-PowerUp/server/.env' });

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
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 140));
}

function formatContent(md) {
  return md
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const piece = {
  title: "Generation Scaled, Verification Didn’t",
  summary: "Code generation scales linearly with compute. Verification scales strictly with human working memory. As synthetic code volume explodes, senior engineers face a mounting supervisory tax.",
  content: formatContent(`By mid-2024, our team had solved the problem of writing boilerplate.

A developer could sketch a five-word prompt and receive eighty lines of syntactically valid Go or TypeScript within three seconds. PR throughput climbed on paper. Burndown charts accelerated. The metric tracked by engineering directors—lines produced per sprint—looked extraordinary.

Then the quiet insolvency arrived.

## The Asymmetry of Compute and Attention

Code generation scales linearly with compute. If you provision more GPU clusters, you can produce ten thousand lines of code per minute.

Verification, however, scales strictly with human working memory.

Reading code has always been cognitively harder than writing it. When you write code, you possess the mental model of the domain problem: the edge cases, the concurrency constraints, the database isolation guarantees. When you read another engineer's pull request, you must reverse-engineer that mental model from the artifact itself.

When the author of that artifact is a generative model, an insidious psychological shift occurs. The code looks plausible. The indentation is immaculate. The function names sound authoritative. Variable declarations follow idiom.

Yet underneath that superficial polish lies what we now recognize as the supervisory tax: the exhausting labor of hunting for hallucinations, subtle off-by-one race conditions, silent exception swallowing, and impedance mismatches across distributed state boundaries.

## The Supervisor Trap

Senior staff engineers used to spend thirty percent of their week on design reviews, mentoring, and systems architecture. Over the last eighteen months, they became high-paid automated linter supervisors.

They are tasked with inspecting PRs four times larger than what any human teammate would have dared to open two years ago. The cognitive cost of proving a negative—verifying that generated code contains no invisible landmines—is twice as high as writing the feature from scratch with mechanical sympathy.

When a junior engineer writes messy code, the errors are usually obvious: crude naming, awkward loops, missing null checks. When a model writes flawed code, the errors are camouflaged by flawless surface grammar. It is the uncanny valley of software engineering.

## The Real Scarcity

The bottleneck was never typing speed. Typing was never the constraint on software delivery; thinking through failure modes was.

If a machine generates code in four hundred milliseconds that takes an experienced engineer forty minutes to audit, reason through, and verify against production invariants, compute did not eliminate the bottleneck. It simply relocated it directly onto human attention.

We do not need tools that produce more volume. We need architectures that reduce surface area, prioritize local-first simplicity, and respect the finite attention of the humans who must wake up at 3:00 AM when the system breaks.`),
  category: 'Tech',
  authorId: 'bot_aarav_tech',
  authorPenName: 'aarav_tech',
  tags: ['#SoftwareEngineering', '#AICoding', '#CodeReview', '#AgenticAI', '#DeveloperExperience'],
  batchId: '2026-09-25-spark-slate'
};

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log(`\n🚀 Publishing piece: "${piece.title}"...`);

  const slopCheck = validateZeroAISlopEngineBlockers({
    title: piece.title, content: piece.content, summary: piece.summary, now: new Date()
  });
  if (!slopCheck.isValid) {
    console.error(`❌ Slop blocker failed: ${JSON.stringify(slopCheck.violations)}`);
    process.exit(1);
  }

  const integrity = validateGeneratedArticleIntegrity({
    title: piece.title, content: piece.content, category: piece.category
  });
  if (!integrity.isValid) {
    console.error(`❌ Integrity check failed: ${integrity.reasons.join('; ')}`);
    process.exit(1);
  }

  const slug = createSlug(piece.title);
  const readingTime = calculateReadingTime(piece.content);
  const wordCount = piece.content.split(/\s+/).filter(Boolean).length;
  const coverImage = getCoverImageForCategory(piece.category);

  const client = await pool.connect();
  try {
    await client.query('begin');

    const existing = await client.query(
      'SELECT id, slug FROM public.posts WHERE title = $1 LIMIT 1', [piece.title]
    );

    let postId, finalSlug;

    if (existing.rowCount > 0) {
      postId = existing.rows[0].id;
      finalSlug = existing.rows[0].slug;
      console.log(`  ♻️  Already exists (${postId}) — updating content & read time`);
      await client.query(`
        UPDATE public.posts
        SET summary = $1, content = $2, category = $3,
            reading_time_min = $4, word_count = $5, updated_at = now()
        WHERE id = $6
      `, [piece.summary, piece.content, piece.category, readingTime, wordCount, postId]);
    } else {
      const res = await client.query(`
        INSERT INTO public.posts (
          slug, author_id, title, summary, content, category, cover_image_url,
          status, is_public, reading_time_min, published_at, provenance,
          language_code, language_source, language_confidence,
          word_count, word_count_source, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          'published', true, $8, now(), 'synthetic',
          'en', 'author', 1.0,
          $9, 'system', now(), now()
        ) RETURNING id, slug
      `, [slug, piece.authorId, piece.title, piece.summary, piece.content,
          piece.category, coverImage, readingTime, wordCount]);

      postId = res.rows[0].id;
      finalSlug = res.rows[0].slug;
      console.log(`  ✅ Successfully published: ${postId} (${finalSlug})`);
    }

    await client.query(
      `UPDATE public.bot_configs SET last_posted_at = now(), updated_at = now() WHERE id = $1`,
      [piece.authorId]
    );

    await client.query(`
      INSERT INTO public.bot_activity_logs (bot_id, action_type, target_post_id, details, status)
      VALUES ($1, 'post', $2, $3, 'success')
    `, [piece.authorId, postId, JSON.stringify({ title: piece.title, category: piece.category, batch: piece.batchId })]);

    await client.query('commit');

    console.log(`  📖 ${wordCount} words | ${readingTime} min read | ${piece.category}`);

    await recordLedgerEntry(pool, {
      status: 'executed', entryType: 'publication',
      authorId: piece.authorId, authorPenName: piece.authorPenName,
      genre: piece.category, title: piece.title, approxWordCount: wordCount,
      targetPostId: postId,
      details: { slug: finalSlug, tags: piece.tags, editorialBatch: piece.batchId }
    }).catch(e => console.warn('  ⚠️  Ledger warning:', e.message));

    // Regenerate SEO / RSS feeds
    try {
      execSync('node server/src/scripts/generate-seo-feeds.mjs', {
        cwd: 'D:/VibeCode/WritOn-PowerUp', timeout: 60000, stdio: 'inherit'
      });
    } catch (e) {
      console.warn('  ⚠️  RSS feed regen warning:', e.message);
    }

    console.log(`\n🎉 STORY PUBLISHED: https://writon.cc/post/${finalSlug}`);
  } catch (err) {
    await client.query('rollback');
    console.error(`  ❌ Failed: ${err.message}`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
