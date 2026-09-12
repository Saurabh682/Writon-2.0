#!/usr/bin/env node
/**
 * human_voice_linter.mjs
 * 
 * CLI linter that evaluates draft writing against WritOn's empirical human corpus standards.
 * Calculates Humanity Score (0-100), detects synthetic AI markers, checks burstiness,
 * and flags throat-clearing openings or artificial summary endings.
 * 
 * Usage:
 *   node scripts/human_voice_linter.mjs --text="Your candidate text here"
 *   node scripts/human_voice_linter.mjs --file="path/to/draft.md"
 */

import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';
import {
  extractSentences,
  calculateBurstiness,
  detectAiTropes,
  BANNED_AI_WORDS
} from '../server/src/services/human-voice-prompt.js';

const THROAT_CLEARING_PATTERNS = [
  /^in today'?s/i,
  /^throughout (history|human)/i,
  /^in the (realm|world|landscape|fast-paced)/i,
  /^it is (important|crucial|essential|worth noting) to/i,
  /^we live in an? (world|era|age) where/i,
  /^writing has always been/i
];

const SUMMARY_ENDING_PATTERNS = [
  /in conclusion/i,
  /ultimately,/i,
  /so (next time|remember to|let us)/i,
  /serves as a (testament|reminder)/i,
  /at the end of the day/i
];

function analyzeText(text) {
  const issues = [];
  let score = 100;

  if (!text || text.trim().length === 0) {
    return { score: 0, issues: ['Text is empty'], stats: {} };
  }

  // 1. Check AI Clichés
  const detectedTropes = detectAiTropes(text);
  if (detectedTropes.length > 0) {
    const penalty = Math.min(45, detectedTropes.length * 15);
    score -= penalty;
    issues.push({
      type: 'AI_CLICHE',
      severity: 'HIGH',
      message: `Detected ${detectedTropes.length} forbidden AI trope(s): ${detectedTropes.map(t => `"${t}"`).join(', ')}. Cut or replace with direct physical statements.`
    });
  }

  // 2. Sentences and Burstiness
  const sentences = extractSentences(text);
  const burstiness = calculateBurstiness(sentences);

  if (sentences.length >= 3) {
    if (burstiness.stdDev < 5.0) {
      score -= 25;
      issues.push({
        type: 'MONOTONOUS_CADENCE',
        severity: 'HIGH',
        message: `Low burstiness (StdDev: ${burstiness.stdDev}, benchmark is > 7.0). Sentences are too uniform in length (~${burstiness.mean} words). Interlock short punchy lines with long sensory ones.`
      });
    } else if (burstiness.stdDev < 7.0) {
      score -= 10;
      issues.push({
        type: 'MODERATE_BURSTINESS',
        severity: 'MEDIUM',
        message: `Burstiness is borderline (StdDev: ${burstiness.stdDev}). Increase variance between staccato beats and rolling descriptions.`
      });
    }
  }

  // 3. Opening Hook Inspection
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim();
    const isThroatClearing = THROAT_CLEARING_PATTERNS.some(re => re.test(firstSentence));
    if (isThroatClearing) {
      score -= 20;
      issues.push({
        type: 'THROAT_CLEARING_OPENING',
        severity: 'HIGH',
        message: `The opening sounds like synthetic preamble: "${firstSentence.slice(0, 70)}...". Start in media res on a physical action or concrete observation.`
      });
    }
  }

  // 4. Ending Inspection
  if (sentences.length > 1) {
    const lastSentence = sentences[sentences.length - 1].trim();
    const isSummary = SUMMARY_ENDING_PATTERNS.some(re => re.test(lastSentence));
    if (isSummary) {
      score -= 15;
      issues.push({
        type: 'SUMMARY_ENDING',
        severity: 'MEDIUM',
        message: `The conclusion sounds like an artificial summary: "${lastSentence.slice(0, 70)}...". End on an unresolved sensory detail or quiet action rather than a recap.`
      });
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    stats: {
      sentenceCount: sentences.length,
      meanSentenceLength: burstiness.mean,
      burstinessIndex: burstiness.stdDev,
      sentenceLengths: burstiness.counts,
      wordCount: (text.match(/[\p{L}\p{N}']+/gu) || []).length,
      tropeHits: detectedTropes.length
    },
    issues
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      text: { type: 'string', short: 't' },
      file: { type: 'string', short: 'f' },
      json: { type: 'boolean' }
    }
  });

  let rawContent = values.text;
  if (!rawContent && values.file) {
    rawContent = await fs.readFile(values.file, 'utf8');
  }

  if (!rawContent) {
    console.log(`
Usage:
  node scripts/human_voice_linter.mjs --text="Your text here"
  node scripts/human_voice_linter.mjs --file="path/to/draft.md"
  node scripts/human_voice_linter.mjs --text="..." --json
    `);
    process.exit(1);
  }

  const result = analyzeText(rawContent);

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('\n=============================================');
  console.log('       WRITON HUMAN VOICE LINTER REPORT      ');
  console.log('=============================================');
  
  const scoreColor = result.score >= 80 ? '🟢' : result.score >= 50 ? '🟡' : '🔴';
  console.log(`\nHumanity Score: ${scoreColor} ${result.score} / 100\n`);
  
  console.log('📊 Stylometric Diagnostics:');
  console.log(` - Word Count: ${result.stats.wordCount}`);
  console.log(` - Sentences: ${result.stats.sentenceCount}`);
  console.log(` - Mean Sentence Length: ${result.stats.meanSentenceLength} words`);
  console.log(` - Burstiness (StdDev): ${result.stats.burstinessIndex} (Target: > 7.0)`);
  console.log(` - Sentence Length Pattern: [${result.stats.sentenceLengths.join(', ')}]`);
  console.log(` - AI Clichés Detected: ${result.stats.tropeHits}`);

  if (result.issues.length === 0) {
    console.log('\n✨ Exceptional Craft! This text breathes with authentic human cadence, sensory grounding, and natural rhythm.');
  } else {
    console.log('\n⚠️ Editorial Recommendations:');
    result.issues.forEach((issue, idx) => {
      console.log(`\n [${idx + 1}] ${issue.severity} [${issue.type}]`);
      console.log(`     ${issue.message}`);
    });
  }
  console.log('\n=============================================\n');
}

export { analyzeText };

if (process.argv[1] && process.argv[1].endsWith('human_voice_linter.mjs')) {
  main().catch(e => {
    console.error('Linter error:', e);
    process.exit(1);
  });
}
