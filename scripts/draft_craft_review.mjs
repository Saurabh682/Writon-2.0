#!/usr/bin/env node
/**
 * Draft Craft Review CLI (Advisory Tool)
 *
 * Implements the advisory craft analysis engine for candidate drafts:
 * 1. Analyzes sentence length distribution, standard deviation, and median.
 * 2. Computes Moving-Average Type-Token Ratio (MATTR-50) and compares with genre benchmark.
 * 3. Scans for contextual stock phrase warnings (delve, tapestry, crucial, realm, testament).
 * 4. Checks opening hook and ending cadence for physical grounding and restraint.
 * 5. Returns non-punitive, evidence-grounded observations and optional suggestions (NO pass/fail grade).
 *
 * Usage:
 *   node scripts/draft_craft_review.mjs --text="Your draft text here" --genre=Essays
 *   node scripts/draft_craft_review.mjs --file=path/to/draft.md --genre="Short Stories"
 */

import { readFileSync } from 'node:fs';

// Parse command line arguments
const args = process.argv.slice(2);
let textInput = '';
let filePath = '';
let genre = 'Essays';

for (const arg of args) {
  if (arg.startsWith('--text=')) {
    textInput = arg.slice('--text='.length);
  } else if (arg.startsWith('--file=')) {
    filePath = arg.slice('--file='.length);
  } else if (arg.startsWith('--genre=')) {
    genre = arg.slice('--genre='.length);
  }
}

if (filePath) {
  try {
    textInput = readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading file: ${filePath} (${err.message})`);
    process.exit(1);
  }
}

if (!textInput || textInput.trim().length === 0) {
  console.log(`
Usage:
  node scripts/draft_craft_review.mjs --text="Draft text..." [--genre=Essays]
  node scripts/draft_craft_review.mjs --file=path/to/draft.md [--genre="Short Stories"]

Available Genres:
  Essays (default), Short Stories, Poetry, Shayari, Humour, Journalism, Reviews
`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// CRAFT BENCHMARKS (from data-exports/analysis/empirical_craft_report.json)
// ─────────────────────────────────────────────────────────────────────────────
const BENCHMARKS = {
  'Essays': { mattrMean: 0.81, medianSentLen: 11, stdDev: 15.4, emDashRate: 2.12 },
  'Short Stories': { mattrMean: 0.74, medianSentLen: 11, stdDev: 29.1, emDashRate: 1.84 },
  'Humour': { mattrMean: 0.81, medianSentLen: 8, stdDev: 12.8, emDashRate: 1.12 },
  'Journalism': { mattrMean: 0.77, medianSentLen: 15, stdDev: 17.1, emDashRate: 0.00 },
  'Poetry': { mattrMean: 0.76, medianSentLen: 10, stdDev: 21.0, emDashRate: 0.86 },
  'Shayari': { mattrMean: 0.79, medianSentLen: 8, stdDev: 11.0, emDashRate: 0.24 },
  'Reviews': { mattrMean: 0.87, medianSentLen: 11, stdDev: 15.6, emDashRate: 0.00 }
};

const activeBenchmark = BENCHMARKS[genre] || BENCHMARKS['Essays'];

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function tokenizeWords(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !/^\d+$/.test(w));
}

function segmentSentences(text) {
  const cleaned = text
    .replace(/^#+\s+[^\n]+/gm, '')
    .replace(/^[-*+]\s+[^\n]+/gm, '')
    .trim();
  return cleaned
    .split(/(?<=[.!?।]["'”’]?)(?:\s+|\n+)/)
    .map(s => s.trim())
    .filter(s => s.length > 2 && /[a-zA-Z\u0900-\u097F]/.test(s));
}

function calculateMATTR(words, windowSize = 50) {
  if (words.length === 0) return 0;
  if (words.length < windowSize) {
    return new Set(words).size / words.length;
  }
  let totalTTR = 0;
  const numWindows = words.length - windowSize + 1;
  for (let i = 0; i < numWindows; i++) {
    totalTTR += new Set(words.slice(i, i + windowSize)).size / windowSize;
  }
  return totalTTR / numWindows;
}

// 1. Lexical & Length Analysis
const words = tokenizeWords(textInput);
const sentences = segmentSentences(textInput);
const mattr = calculateMATTR(words, 50);

const sentenceLengths = sentences.map(s => tokenizeWords(s).length);
const sortedLengths = [...sentenceLengths].sort((a, b) => a - b);
const medianSentLen = sortedLengths.length > 0
  ? (sortedLengths.length % 2 === 0
      ? (sortedLengths[sortedLengths.length / 2 - 1] + sortedLengths[sortedLengths.length / 2]) / 2
      : sortedLengths[Math.floor(sortedLengths.length / 2)])
  : 0;

const meanSentLen = sentenceLengths.length > 0
  ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
  : 0;

const variance = sentenceLengths.length > 1
  ? sentenceLengths.reduce((acc, l) => acc + Math.pow(l - meanSentLen, 2), 0) / (sentenceLengths.length - 1)
  : 0;
const stdDevSentLen = Math.sqrt(variance);

// 2. Contextual Stock Phrase Analysis
const STOCK_PATTERNS = [
  { term: 'delve', warning: 'Often signals throat-clearing announcement. Consider stating the observation directly.' },
  { term: 'tapestry', warning: 'Frequently used as an abstract filler for complexity. Consider naming two conflicting physical elements.' },
  { term: 'crucial', warning: 'High-frequency adjective. Consider showing why it matters through a tangible consequence.' },
  { term: 'realm', warning: 'Generic container metaphor. Consider naming the specific room, street, or discipline.' },
  { term: 'testament', warning: 'Stiff, ceremonial phrasing. Consider describing physical endurance or survival.' },
  { term: 'beacon', warning: 'Familiar cliché. Consider describing a concrete human action.' },
  { term: 'bustling', warning: 'Generic scenic stock phrase. Consider naming the sounds or materials present.' }
];

const foundStockPhrases = [];
const lowerText = textInput.toLowerCase();
for (const pattern of STOCK_PATTERNS) {
  const count = (lowerText.match(new RegExp(`\\b${pattern.term}\\b`, 'g')) || []).length;
  if (count > 0) {
    foundStockPhrases.push({ term: pattern.term, count, suggestion: pattern.warning });
  }
}

// 3. Opening & Ending Craft Checks
const firstSentence = sentences[0] || '';
const lastSentence = sentences[sentences.length - 1] || '';

const openingHasAbstractSetup = /^(?:in today's|in a world where|throughout history|it is often said|when we think about)/i.test(firstSentence);
const endingHasTedTalkSummary = /(?:in conclusion|ultimately|at the end of the day|serves as a reminder|we must all learn)/i.test(lastSentence);

// ─────────────────────────────────────────────────────────────────────────────
// REPORT GENERATION (DESCRIPTIVE & ADVISORY)
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n======================================================`);
console.log(`  WRITON DRAFT CRAFT REVIEW (Advisory Report)`);
console.log(`  Genre Evaluated: ${genre}`);
console.log(`======================================================\n`);

console.log(`1. CADENCE & VOCABULARY PROFILE:`);
console.log(`   - Word Count: ${words.length} words`);
console.log(`   - Sentence Count: ${sentences.length} sentences`);
console.log(`   - Median Sentence Length: ${medianSentLen.toFixed(1)} words (Corpus Benchmark for ${genre}: ${activeBenchmark.medianSentLen} w)`);
console.log(`   - Sentence Standard Deviation: ${stdDevSentLen.toFixed(1)} (Corpus Benchmark: ${activeBenchmark.stdDev})`);
console.log(`   - Lexical Diversity (MATTR-50): ${mattr.toFixed(2)} (Corpus Benchmark: ${activeBenchmark.mattrMean})`);

if (mattr > 0.92 && words.length > 200) {
  console.log(`   * Observation: Very high lexical diversity (${mattr.toFixed(2)}). Check if synonyms are being chosen for ornamental display rather than clarity.`);
} else if (mattr < 0.65) {
  console.log(`   * Observation: Lexical diversity is lower than typical ${genre} writing. Check for unintentional word repetition.`);
} else {
  console.log(`   * Cadence Note: Rhythm and vocabulary variation align comfortably with the ${genre} baseline.`);
}

console.log(`\n2. CONTEXTUAL STOCK PHRASE SCAN:`);
if (foundStockPhrases.length === 0) {
  console.log(`   ✓ No frequent formulaic tropes or throat-clearing expressions detected.`);
} else {
  console.log(`   Found ${foundStockPhrases.length} stock phrase occurrence(s):`);
  for (const item of foundStockPhrases) {
    console.log(`   - "${item.term}" (${item.count}x): ${item.suggestion}`);
  }
}

console.log(`\n3. ARCHETYPE ALIGNMENT & STRUCTURAL EDGES:`);
if (openingHasAbstractSetup) {
  console.log(`   - Opening: Starts with an abstract rhetorical setup ("${firstSentence.slice(0, 60)}..."). Consider opening directly on a physical object, gesture, or observation.`);
} else {
  console.log(`   - Opening: Engages without generic rhetorical throat-clearing.`);
}

if (endingHasTedTalkSummary) {
  console.log(`   - Ending: Concludes with a summarizing takeaway ("${lastSentence.slice(0, 60)}..."). Consider ending on a sensory image or unresolved human tension instead of a moral lesson.`);
} else {
  console.log(`   - Ending: Restrained conclusion that avoids moralizing summary.`);
}

console.log(`\n======================================================\n`);
