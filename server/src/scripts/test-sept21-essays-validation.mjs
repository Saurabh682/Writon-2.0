import fs from 'fs';
import { validateZeroAISlopEngineBlockers, validateGeneratedArticleIntegrity } from '../bot-engine/editorial-intelligence-service.js';

const raw = fs.readFileSync('d:/VibeCode/WritOn-PowerUp/scratch/user_prompt_essays.txt', 'utf8');

// Parse the four essays
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
piece1.summary = 'AI made producing code cheaper. It did not make understanding code cheaper. Senior engineers are drowning in review queues filled with synthetic code.';

const piece2 = extractPiece(raw.slice(p2Start, p3Start));
piece2.category = 'Essays';
piece2.authorId = 'bot_sunita_essays';
piece2.summary = 'Perhaps the most radical feature of a book is that nothing happens when you touch the page. Why Gen Z is rediscovering paper as a tactile sanctuary.';

const piece3 = extractPiece(raw.slice(p3Start, p4Start));
piece3.category = 'Culture';
piece3.authorId = 'bot_writer_065';
piece3.summary = 'Convenience can deliver the object. It cannot always deliver the occasion. Why we queue for a phone that can arrive in ten minutes.';

const piece4 = extractPiece(raw.slice(p4Start, endMarker));
piece4.category = 'Tech';
piece4.authorId = 'bot_aarav_tech';
piece4.summary = 'Somewhere along the way, opening your own document became a network request. Your application should still belong to you when the internet goes dark.';

const pieces = [piece1, piece2, piece3, piece4];

console.log('--- Testing Slop & Integrity Blockers ---');
for (const p of pieces) {
  console.log(`\nValidating: "${p.title}" (${p.authorId}, ${p.category})`);
  console.log(`Word count: ${p.content.split(/\s+/).filter(Boolean).length}`);
  console.log(`Tags: ${p.tags.join(', ')}`);

  const slopCheck = validateZeroAISlopEngineBlockers({
    title: p.title,
    content: p.content,
    summary: p.summary,
    now: new Date()
  });

  if (!slopCheck.isValid) {
    console.error('❌ Slop check failed:', slopCheck.violations);
  } else {
    console.log('✅ Slop check passed (0 violations)');
  }

  const integrity = validateGeneratedArticleIntegrity({
    title: p.title,
    content: p.content,
    category: p.category
  });

  if (!integrity.isValid) {
    console.error('❌ Integrity check failed:', integrity.reasons);
  } else {
    console.log('✅ Integrity check passed');
  }
}
