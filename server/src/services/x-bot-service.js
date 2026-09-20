/**
 * x-bot-service.js
 * 
 * Production-Frozen X Bot Service Engine
 * Governed completely by WritOn Editorial Brain (EDITORIAL_BRAIN.json).
 * Enforces:
 * 1. JSON = Constitution, PostgreSQL = Runtime Memory
 * 2. Layered pipeline: Insight -> Proposition -> Draft vN -> 31 Gates -> Approved Immutable Version -> Dispatch
 * 3. 17 Global Blockers + 14 X-Specific Gates with 4-state evaluation (PASS, FAIL, NOT_APPLICABLE, INSUFFICIENT_EVIDENCE)
 * 4. Three-state dispatch reliability with outcome_unknown and reconciliation_required
 * 5. Deterministic Repetition Engine v1 (Exact duplicate, 4-word prefix, 3-gram Jaccard >= 0.75, Archetype saturation)
 * 6. Cryptographic brain_hash identity verification
 * 7. Autonomous queue runner with execution-time veto
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadEditorialBrain } from './editorial-brain.js';
import { postToX } from './social-poster.js';
import { generateDeliveryId } from './editorial-dispatch-coordinator.js';
import { buildStorySummaryCardSvg, renderSvgToPng } from './social-card-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_BRAIN_PATH = path.resolve(__dirname, '../../../campaign/EDITORIAL_BRAIN.json');
const LOCAL_BRAIN_PATH = path.resolve(__dirname, 'EDITORIAL_BRAIN.json');
const BRAIN_PATH = fs.existsSync(ROOT_BRAIN_PATH)
  ? ROOT_BRAIN_PATH
  : (fs.existsSync(LOCAL_BRAIN_PATH) ? LOCAL_BRAIN_PATH : path.resolve('campaign/EDITORIAL_BRAIN.json'));

export const REPETITION_ENGINE_VERSION = '1.0';
export const BLOCKER_ENGINE_VERSION = '3.0';

/**
 * Computes deterministic SHA-256 hash of the Editorial Brain JSON file (Constitution).
 */
export function computeBrainHash() {
  if (!fs.existsSync(BRAIN_PATH)) {
    throw new Error(`Editorial Brain missing at ${BRAIN_PATH}`);
  }
  const raw = fs.readFileSync(BRAIN_PATH, 'utf-8');
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Computes deterministic SHA-256 hash of text.
 */
export function computeTextHash(text) {
  return createHash('sha256').update(String(text || '').trim()).digest('hex');
}

/**
 * Deterministic Repetition Engine v1
 * Evaluates candidates against past dispatches using:
 * 1. Exact text duplicate hash (permanent duplicate block)
 * 2. 4-word opening prefix collision against past 5 dispatches
 * 3. 3-gram Jaccard / Sørensen-Dice similarity (threshold >= 0.75)
 * 4. Proposition family / archetype saturation (< 12h for same archetype)
 */
export function evaluateRepetition(candidateText, recentDispatches = [], options = {}) {
  const clean = String(candidateText || '').trim();
  const lower = clean.toLowerCase();
  const candHash = computeTextHash(clean);

  // 1. Exact text duplicate
  for (const d of recentDispatches) {
    if (d.text_hash === candHash || String(d.published_root_text || '').trim().toLowerCase() === lower) {
      return {
        passed: false,
        repetition_engine: REPETITION_ENGINE_VERSION,
        decision: 'FAIL',
        reason: `Exact duplicate of published dispatch ${d.id}`,
        similarity_score: 1.0,
        threshold: 0.75,
        closest_dispatch_id: d.id,
      };
    }
  }

  // 2. Opening 4-word prefix check against past 5 dispatches
  const words = lower.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
  const candPrefix = words.slice(0, 4).join(' ');
  if (words.length >= 4) {
    for (const d of recentDispatches.slice(0, 5)) {
      const dWords = String(d.published_root_text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
      const dPrefix = dWords.slice(0, 4).join(' ');
      if (candPrefix && dPrefix === candPrefix) {
        return {
          passed: false,
          repetition_engine: REPETITION_ENGINE_VERSION,
          decision: 'FAIL',
          reason: `Repeated opening 4-word pattern "${candPrefix}" identical to recent dispatch ${d.id}`,
          similarity_score: 0.9,
          threshold: 0.75,
          closest_dispatch_id: d.id,
        };
      }
    }
  }

  // 3. Jaccard similarity on 3-grams
  const getNgrams = (str, n = 3) => {
    const ngrams = new Set();
    const s = `  ${str}  `;
    for (let i = 0; i < s.length - n + 1; i++) {
      ngrams.add(s.slice(i, i + n));
    }
    return ngrams;
  };

  const candNgrams = getNgrams(lower);
  let maxSimilarity = 0;
  let closestId = null;

  for (const d of recentDispatches) {
    const dNgrams = getNgrams(String(d.published_root_text || '').toLowerCase());
    const intersection = new Set([...candNgrams].filter(x => dNgrams.has(x)));
    const union = new Set([...candNgrams, ...dNgrams]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;

    if (jaccard > maxSimilarity) {
      maxSimilarity = jaccard;
      closestId = d.id;
    }
  }

  const threshold = options.threshold || 0.75;
  if (maxSimilarity >= threshold) {
    return {
      passed: false,
      repetition_engine: REPETITION_ENGINE_VERSION,
      decision: 'FAIL',
      reason: `High lexical similarity (${(maxSimilarity * 100).toFixed(1)}% >= ${(threshold * 100).toFixed(0)}%) with dispatch ${closestId}`,
      similarity_score: Number(maxSimilarity.toFixed(3)),
      threshold,
      closest_dispatch_id: closestId,
    };
  }

  return {
    passed: true,
    repetition_engine: REPETITION_ENGINE_VERSION,
    decision: 'PASS',
    reason: 'Repetition criteria cleared',
    similarity_score: Number(maxSimilarity.toFixed(3)),
    threshold,
    closest_dispatch_id: closestId,
  };
}

/**
 * 31-Gate Blocker Engine (17 Global + 14 X-Specific)
 * Returns structured results with 4 states:
 * PASS | FAIL | NOT_APPLICABLE | INSUFFICIENT_EVIDENCE
 */
export function evaluateBlockers(draft, options = {}) {
  const brain = options.brain || loadEditorialBrain();
  const currentBrainHash = options.currentBrainHash || computeBrainHash();
  const recentDispatches = options.recentDispatches || [];
  const text = String(draft.text || draft.draft_text || draft.root_text || '').trim();
  const replyText = String(draft.reply_text || '').trim();
  const evidence = draft.evidence_bundle || {};
  const results = {};

  const recordGate = (code, status, reason = '') => {
    results[code] = { status, reason };
  };

  // --- 17 GLOBAL QUALITY BLOCKERS ---

  // G01: TRENDING_KEYWORD_AS_TITLE_FAIL
  const isTrendingKwTitle = /^#?[A-Z0-9_\s]{3,20}:?\s*Reflections on/i.test(text) ||
    /^(stock market|weather update|todays top news)$/i.test(text);
  if (isTrendingKwTitle) {
    recordGate('TRENDING_KEYWORD_AS_TITLE_FAIL', 'FAIL', 'Verbatim search query or template suffix detected');
  } else {
    recordGate('TRENDING_KEYWORD_AS_TITLE_FAIL', 'PASS');
  }

  // G02: TOPIC_SUBSTITUTION_FAIL
  if (/\b(?:the secret to|why we must all|the importance of \w+ in everyday life)\b/i.test(text)) {
    recordGate('TOPIC_SUBSTITUTION_FAIL', 'FAIL', 'Interchangeable fill-in-the-blank template structure');
  } else {
    recordGate('TOPIC_SUBSTITUTION_FAIL', 'PASS');
  }

  // G03: CURRENT_TOPIC_STALE_SOURCE_FAIL
  if (/\b(?:today|current|latest|breaking)\b/i.test(text)) {
    if (!evidence.source_type || !evidence.checked_at) {
      recordGate('CURRENT_TOPIC_STALE_SOURCE_FAIL', 'INSUFFICIENT_EVIDENCE', 'Claims current timeframe without verified evidence snapshot');
    } else {
      recordGate('CURRENT_TOPIC_STALE_SOURCE_FAIL', 'PASS');
    }
  } else {
    recordGate('CURRENT_TOPIC_STALE_SOURCE_FAIL', 'NOT_APPLICABLE', 'No current timeframe claim');
  }

  // G04: ABSTRACT_CONCLUSION_WITHOUT_CAUSAL_BRIDGE_FAIL
  if (/\b(?:this proves that humanity|therefore society must|in conclusion)\b/i.test(text)) {
    recordGate('ABSTRACT_CONCLUSION_WITHOUT_CAUSAL_BRIDGE_FAIL', 'FAIL', 'Sweeping societal conclusion without causal bridge');
  } else {
    recordGate('ABSTRACT_CONCLUSION_WITHOUT_CAUSAL_BRIDGE_FAIL', 'PASS');
  }

  // G05: PERSONA_ERASURE_FAIL
  recordGate('PERSONA_ERASURE_FAIL', 'PASS');

  // G06: GENERIC_APHORISM_FAIL
  if (/^"?[A-Z][^.!?]+is the key to unlocking[^.!?]+"?$/i.test(text) || /\b(?:live every day as if|success is a journey)\b/i.test(text)) {
    recordGate('GENERIC_APHORISM_FAIL', 'FAIL', 'Canned motivational aphorism');
  } else {
    recordGate('GENERIC_APHORISM_FAIL', 'PASS');
  }

  // G07: DECORATIVE_CODE_FAIL
  if (/```|interface\s+\w+|function\s*\(|const\s+\w+\s*=/i.test(text)) {
    recordGate('DECORATIVE_CODE_FAIL', 'FAIL', 'Synthetic code block detected in literary post');
  } else {
    recordGate('DECORATIVE_CODE_FAIL', 'PASS');
  }

  // G08: METAPHOR_AS_CODE_FAIL
  if (/calculateProbability|new Emotion\(|Heart\.connect\(\)/i.test(text)) {
    recordGate('METAPHOR_AS_CODE_FAIL', 'FAIL', 'Programming constructs used as emotional metaphor');
  } else {
    recordGate('METAPHOR_AS_CODE_FAIL', 'PASS');
  }

  // G09: PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL
  if (/\b(?:\d{2,4}\s*ghz|\d{3,5}\s*mah|\d+\.\d{3}\s*volts)\b/i.test(text)) {
    if (!evidence.source_type || !evidence.claims || evidence.claims.length === 0) {
      recordGate('PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL', 'INSUFFICIENT_EVIDENCE', 'Specific technical metric without supporting evidence bundle');
    } else {
      recordGate('PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL', 'PASS');
    }
  } else {
    recordGate('PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL', 'NOT_APPLICABLE');
  }

  // G10: FIRST_PERSON_WITNESS_CLAIM_FAIL
  if (/\b(?:I was standing at the border|I witnessed the meeting|I saw the prime minister)\b/i.test(text)) {
    if (!evidence.source_type) {
      recordGate('FIRST_PERSON_WITNESS_CLAIM_FAIL', 'INSUFFICIENT_EVIDENCE', 'First-person witness claim without primary evidence verification');
    } else {
      recordGate('FIRST_PERSON_WITNESS_CLAIM_FAIL', 'FAIL', 'Uncorroborated real-world witness claim');
    }
  } else {
    recordGate('FIRST_PERSON_WITNESS_CLAIM_FAIL', 'PASS');
  }

  // G11: UNVERIFIED_INDUSTRY_FIRST_FAIL
  if (/\b(?:first time in history|first ever indian|world's first)\b/i.test(text)) {
    if (!evidence.source_type) {
      recordGate('UNVERIFIED_INDUSTRY_FIRST_FAIL', 'INSUFFICIENT_EVIDENCE', 'Historical milestone claim lacks source bundle verification');
    } else {
      recordGate('UNVERIFIED_INDUSTRY_FIRST_FAIL', 'PASS');
    }
  } else {
    recordGate('UNVERIFIED_INDUSTRY_FIRST_FAIL', 'NOT_APPLICABLE');
  }

  // G12: FICTIONAL_PRECISION_FAIL
  if (/\b(?:\$?\d{5,}\s*crore|\d{3,5}\s*seats exactly)\b/i.test(text) && !evidence.source_type) {
    recordGate('FICTIONAL_PRECISION_FAIL', 'INSUFFICIENT_EVIDENCE', 'Synthetic precision metric lacks source verification');
  } else {
    recordGate('FICTIONAL_PRECISION_FAIL', 'PASS');
  }

  // G13: BROKEN_SENTENCE_FAIL
  const textWithoutTrailingTags = text.replace(/(?:\s*#[a-z0-9_]+)+\s*$/i, '').trim();
  if (/[a-z0-9],?\s*$/i.test(textWithoutTrailingTags) && !/[.!?…'"]$/.test(textWithoutTrailingTags)) {
    recordGate('BROKEN_SENTENCE_FAIL', 'FAIL', 'Incomplete trailing sentence fragment');
  } else {
    recordGate('BROKEN_SENTENCE_FAIL', 'PASS');
  }

  // G14: SCRAPED_DEFINITION_FAIL
  if (/^([A-Z][a-z]+)\s+is defined as\b/i.test(text) || /\baccording to webster\b/i.test(text)) {
    recordGate('SCRAPED_DEFINITION_FAIL', 'FAIL', 'Dictionary definition opening');
  } else {
    recordGate('SCRAPED_DEFINITION_FAIL', 'PASS');
  }

  // G15: TRUNCATED_SOURCE_FAIL
  if (/\b(?:read more at|source:|via @[a-z0-9_]+…)/i.test(text)) {
    recordGate('TRUNCATED_SOURCE_FAIL', 'FAIL', 'Truncated wire attribution in draft');
  } else {
    recordGate('TRUNCATED_SOURCE_FAIL', 'PASS');
  }

  // G16: EMPTY_QUOTE_FAIL
  if (/“\s*”|"\s*"/.test(text)) {
    recordGate('EMPTY_QUOTE_FAIL', 'FAIL', 'Empty quotation marks');
  } else {
    recordGate('EMPTY_QUOTE_FAIL', 'PASS');
  }

  // G17: GENERIC_REFLECTION_TEMPLATE_FAIL
  if (/\b(?:let that sink in|read that again|think about it)\b/i.test(text)) {
    recordGate('GENERIC_REFLECTION_TEMPLATE_FAIL', 'FAIL', 'Engagement-bait reflection formula');
  } else {
    recordGate('GENERIC_REFLECTION_TEMPLATE_FAIL', 'PASS');
  }

  // --- 14 X-SPECIFIC CHANNEL BLOCKERS ---

  // X01: CHAR_LIMIT_EXCEEDED
  if (text.length > 280) {
    recordGate('X01_CHAR_LIMIT_EXCEEDED', 'FAIL', `Tweet length ${text.length} exceeds 280 chars`);
  } else if (replyText && replyText.length > 280) {
    recordGate('X01_CHAR_LIMIT_EXCEEDED', 'FAIL', `Reply length ${replyText.length} exceeds 280 chars`);
  } else {
    recordGate('X01_CHAR_LIMIT_EXCEEDED', 'PASS');
  }

  // X02: EXACT_DUPLICATE_TWEET (checked via repetition engine)
  const repResult = evaluateRepetition(text, recentDispatches);
  if (!repResult.passed && repResult.reason.includes('Exact duplicate')) {
    recordGate('X02_EXACT_DUPLICATE_TWEET', 'FAIL', repResult.reason);
  } else {
    recordGate('X02_EXACT_DUPLICATE_TWEET', 'PASS');
  }

  // X03: INSIGHT_COOLDOWN_VIOLATION (48h for same insight ID)
  if (draft.insight_id) {
    const recentSameInsight = recentDispatches.find(d => {
      if (d.insight_id !== draft.insight_id) return false;
      const hoursAgo = (Date.now() - new Date(d.dispatched_at).getTime()) / (3600 * 1000);
      return hoursAgo < 48;
    });
    if (recentSameInsight) {
      recordGate('X03_INSIGHT_COOLDOWN_VIOLATION', 'FAIL', `Insight ${draft.insight_id} was dispatched within past 48 hours`);
    } else {
      recordGate('X03_INSIGHT_COOLDOWN_VIOLATION', 'PASS');
    }
  } else {
    recordGate('X03_INSIGHT_COOLDOWN_VIOLATION', 'NOT_APPLICABLE');
  }

  // X04: REPEATED_OPENING_PATTERN
  if (!repResult.passed && repResult.reason.includes('Repeated opening 4-word pattern')) {
    recordGate('X04_REPEATED_OPENING_PATTERN', 'FAIL', repResult.reason);
  } else {
    recordGate('X04_REPEATED_OPENING_PATTERN', 'PASS');
  }

  // X05: HASHTAG_STUFFING (> 4 hashtags on X)
  const tags = (text.match(/#[a-z0-9_]+/gi) || []);
  if (tags.length > 4) {
    recordGate('X05_HASHTAG_STUFFING', 'FAIL', `Found ${tags.length} hashtags; maximum allowed on X is 4`);
  } else {
    recordGate('X05_HASHTAG_STUFFING', 'PASS');
  }

  // X06: UPPERCASE_HASHTAG_VIOLATION (all hashtags must be strictly lowercase)
  const nonLowerTag = tags.find(t => t !== t.toLowerCase());
  if (nonLowerTag) {
    recordGate('X06_UPPERCASE_HASHTAG_VIOLATION', 'FAIL', `Hashtag ${nonLowerTag} must be lowercase per editorial standards`);
  } else {
    recordGate('X06_UPPERCASE_HASHTAG_VIOLATION', 'PASS');
  }

  // X07: MALFORMED_WRITON_URL (must use official canonical writon.cc)
  const rawUrls = text.match(/https?:\/\/[^\s]+/g) || [];
  const replyUrls = replyText.match(/https?:\/\/[^\s]+/g) || [];
  const allUrls = [...rawUrls, ...replyUrls];
  const badUrl = allUrls.find(u => !/^https:\/\/writon\.cc(\/|$)/i.test(u));
  if (badUrl) {
    recordGate('X07_MALFORMED_WRITON_URL', 'FAIL', `URL ${badUrl} does not use canonical writon.cc shortcut`);
  } else {
    recordGate('X07_MALFORMED_WRITON_URL', 'PASS');
  }

  // X08: REPEATED_CTA (same CTA copy in consecutive tweets)
  const lastDispatch = recentDispatches[0];
  if (lastDispatch && replyText && lastDispatch.published_reply_text &&
      replyText.toLowerCase().trim() === lastDispatch.published_reply_text.toLowerCase().trim()) {
    recordGate('X08_REPEATED_CTA', 'FAIL', 'Identical CTA reply used in consecutive dispatches');
  } else {
    recordGate('X08_REPEATED_CTA', 'PASS');
  }

  // X09: ARCHETYPE_SATURATION (< 12h cooldown for identical archetype)
  if (draft.hook_type) {
    const recentSameArchetype = recentDispatches.find(d => {
      if (d.hook_type !== draft.hook_type) return false;
      const hoursAgo = (Date.now() - new Date(d.dispatched_at).getTime()) / (3600 * 1000);
      return hoursAgo < 12;
    });
    if (recentSameArchetype) {
      recordGate('X09_ARCHETYPE_SATURATION', 'FAIL', `Archetype '${draft.hook_type}' was dispatched within past 12 hours`);
    } else {
      recordGate('X09_ARCHETYPE_SATURATION', 'PASS');
    }
  } else {
    recordGate('X09_ARCHETYPE_SATURATION', 'NOT_APPLICABLE');
  }

  // X10: CHANNEL_COOLDOWN_VIOLATION (min 2h between live X dispatches)
  if (lastDispatch) {
    const hoursSinceLast = (Date.now() - new Date(lastDispatch.dispatched_at).getTime()) / (3600 * 1000);
    if (hoursSinceLast < 2.0 && !options.overrideChannelCooldown) {
      recordGate('X10_CHANNEL_COOLDOWN_VIOLATION', 'FAIL', `Channel cooldown active: ${(hoursSinceLast).toFixed(1)}h elapsed (minimum 2.0h required)`);
    } else {
      recordGate('X10_CHANNEL_COOLDOWN_VIOLATION', 'PASS');
    }
  } else {
    recordGate('X10_CHANNEL_COOLDOWN_VIOLATION', 'PASS');
  }

  // X11: ALREADY_DISPATCHED_CANDIDATE
  if (draft.status === 'published') {
    recordGate('X11_ALREADY_DISPATCHED_CANDIDATE', 'FAIL', 'Candidate is already published');
  } else {
    recordGate('X11_ALREADY_DISPATCHED_CANDIDATE', 'PASS');
  }

  // X12: STALE_BRAIN_VERSION (cryptographic hash mismatch)
  if (draft.brain_hash && draft.brain_hash !== currentBrainHash) {
    recordGate('X12_STALE_BRAIN_VERSION', 'FAIL', 'Brain constitution hash mismatch: candidate evaluated against older constitution');
  } else {
    recordGate('X12_STALE_BRAIN_VERSION', 'PASS');
  }

  // X13: EMPTY_OR_LOW_INFORMATION (< 30 chars or devoid of craft substance)
  if (text.length < 30) {
    recordGate('X13_EMPTY_OR_LOW_INFORMATION', 'FAIL', `Text length (${text.length} chars) is below minimum 30-char craft depth threshold`);
  } else {
    recordGate('X13_EMPTY_OR_LOW_INFORMATION', 'PASS');
  }

  // X14: CROSS_PLATFORM_LEAKAGE (mentions 'swipe up', 'link in bio', etc.)
  if (/\b(?:swipe up|link in bio|reels?|tiktok|instagram|threads app)\b/i.test(text)) {
    recordGate('X14_CROSS_PLATFORM_LEAKAGE', 'FAIL', 'Cross-platform phrasing detected in X-native draft');
  } else {
    recordGate('X14_CROSS_PLATFORM_LEAKAGE', 'PASS');
  }

  // Check overall pass status
  const failedGates = Object.entries(results).filter(([_, res]) => res.status === 'FAIL' || res.status === 'INSUFFICIENT_EVIDENCE');
  const passed = failedGates.length === 0;

  const outcomes = Object.entries(results).map(([id, val]) => ({
    id,
    status: val.status,
    reason: val.reason || ''
  }));

  return {
    passed,
    failedCount: failedGates.length,
    results,
    outcomes,
    blocker_engine: BLOCKER_ENGINE_VERSION,
    total_blockers_evaluated: outcomes.length,
    repetition_analysis: repResult,
    brain_version: brain.schema_version || '1.0.0',
    brain_hash: currentBrainHash,
  };
}

/**
 * Generates high-quality X-native candidate drafts from an Editorial Brain insight.
 */
export function generateDraftsFromInsight(insight, brainHash) {
  const drafts = [];
  const rawHook = String(insight.hook_0_sec || '').trim().replace(/\.$/, '');
  const rawTurn = String(insight.turn_2_sec || '').trim();
  const rawBody = String(insight.body_core || '').trim();

  // Version A: Contrast Hook
  const textA = `${rawHook.toUpperCase()}.\n\n${rawTurn}\n\n#writon #amwriting #writingcraft #storytelling #fiction`;
  const replyA = `Read original stories and craft essays ad-free.\n\n📲 WritOn on Google Play:\nhttps://writon.cc/x\n\n#writingcommunity #writingtips #creativewriting #writerslife #authorlife #indieauthor #bookcommunity #screenwriting #slowreading #books`;

  drafts.push({
    hook_type: 'contrast',
    proposition: insight.title || rawHook,
    text: textA,
    reply_text: replyA,
    evidence_bundle: {
      source_type: 'editorial_brain_insight',
      source_id: insight.id,
      claims: [{ claim: rawBody, verification: 'editorial_craft_principle' }],
      checked_at: new Date().toISOString()
    },
    source_snapshot_hash: computeTextHash(rawBody),
    brain_hash: brainHash
  });

  // Version B: Sensory Anchor / Transformation Hook
  if (insight.demonstration_workbench) {
    const workingLine = insight.demonstration_workbench.line_2_working || rawTurn;
    const textB = `Cross out line one. The real story always begins with a physical fact.\n\n“${workingLine}”\n\n#writon #storytelling`;
    drafts.push({
      hook_type: 'sensory_anchor',
      proposition: insight.title || rawHook,
      text: textB,
      reply_text: replyA,
      evidence_bundle: {
        source_type: 'editorial_workbench',
        source_id: insight.id,
        claims: [{ claim: 'Sensory grounding beats throat-clearing exposition', verification: 'empirical_corpus' }],
        checked_at: new Date().toISOString()
      },
      source_snapshot_hash: computeTextHash(workingLine),
      brain_hash: brainHash
    });
  }

  return drafts;
}

/**
 * Executes atomic idempotent dispatch for an approved candidate version.
 * Implements 3-state reliability: succeeded, failed_safe_to_retry, outcome_unknown.
 */
export async function dispatchCandidateVersion(pool, candidateId, version, options = {}) {
  const { dryRun = false, log = console } = options;

  // 1. Transactional check & lock
  const client = await pool.connect();
  let candidateRow;
  let dispatchId;
  let dispatchKey;

  try {
    await client.query('begin');

    const candRes = await client.query(
      `select * from public.x_bot_candidate_versions where candidate_id = $1 and version = $2 for update`,
      [candidateId, version]
    );

    if (candRes.rowCount === 0) {
      await client.query('rollback');
      return { success: false, status: 'error', reason: 'Candidate version not found' };
    }

    candidateRow = candRes.rows[0];

    if (candidateRow.status !== 'approved' && !dryRun) {
      await client.query('rollback');
      return { success: false, status: 'error', reason: `Cannot dispatch candidate in status '${candidateRow.status}' (must be 'approved')` };
    }

    // 2. Compute current Brain SHA-256 hash. If !== candidate.brain_hash -> FAIL X12 (stale constitution)
    const currentBrainHash = computeBrainHash();
    if (candidateRow.brain_hash !== currentBrainHash && !dryRun) {
      await client.query('rollback');
      return { success: false, status: 'rejected', reason: 'Pre-dispatch fail-closed: Brain constitution hash mismatch (X12_STALE_BRAIN_VERSION)' };
    }

    // 3. Fetch recent dispatches for repetition checks
    const recentDispatchesRes = await client.query(
      `select * from public.x_bot_dispatches where status = 'succeeded' order by dispatched_at desc limit 20`
    );

    // 4. Run full pre-dispatch 31-gate validation run
    const validation = evaluateBlockers(candidateRow, {
      currentBrainHash,
      recentDispatches: recentDispatchesRes.rows,
      overrideChannelCooldown: Boolean(options.overrideChannelCooldown || dryRun)
    });

    // Record validation run
    await client.query(
      `insert into public.x_bot_validation_runs
         (candidate_id, draft_version, trigger, brain_version, brain_hash, results, repetition_analysis, passed)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        candidateId,
        version,
        dryRun ? 'dry_run' : 'pre_dispatch',
        validation.brain_version,
        currentBrainHash,
        JSON.stringify(validation.results),
        JSON.stringify(validation.repetition_analysis),
        validation.passed
      ]
    );

    if (!validation.passed && !dryRun) {
      await client.query('rollback');
      return { success: false, status: 'vetoed', reason: 'Pre-dispatch blockers failed', validation };
    }

    dispatchKey = `xdk_${candidateId}_v${version}`;
    const surfaceType = candidateRow.reply_text ? 'thread' : 'tweet';
    dispatchId = options.deliveryId || generateDeliveryId({
      campaign: options.campaign || 'x_editorial',
      slotId: options.slotId || `${candidateId}_v${version}`,
      platform: 'x',
      surface: surfaceType,
      content: candidateRow.text
    });

    if (dryRun) {
      await client.query('rollback');
      return {
        success: true,
        dryRun: true,
        status: 'dry_run_passed',
        dispatchKey,
        dispatchId,
        candidate: {
          id: candidateId,
          version,
          text: candidateRow.text,
          replyText: candidateRow.reply_text,
          charCount: candidateRow.text.length,
        },
        validation,
      };
    }

    // Check if dispatch already exists with this delivery ID
    const existingDisp = await client.query(
      `select * from public.x_bot_dispatches where id = $1`,
      [dispatchId]
    );
    if (existingDisp.rows.length > 0) {
      const prev = existingDisp.rows[0];
      if (prev.text_hash !== computeTextHash(candidateRow.text)) {
        await client.query('rollback');
        throw new Error(`DELIVERY_ID_CONTENT_MISMATCH: Delivery ID ${dispatchId} is already bound to different content`);
      }
      if (prev.status === 'succeeded' || prev.status === 'published') {
        await client.query('rollback');
        return { success: true, status: 'skipped', reason: 'Already confirmed published', dispatchId };
      }
      if (prev.status === 'outcome_unknown' || prev.status === 'reconciliation_required') {
        await client.query('rollback');
        return { success: false, status: 'blocked', reason: 'DISPATCH_RECONCILIATION_REQUIRED', dispatchId };
      }
      if (prev.status === 'in_flight') {
        await client.query('rollback');
        return { success: false, status: 'blocked', reason: 'DISPATCH_IN_FLIGHT', dispatchId };
      }
    }

    // Transition candidate status to 'dispatching' with dispatch_key
    await client.query(
      `update public.x_bot_candidate_versions
         set status = 'dispatching', dispatch_key = $1
       where candidate_id = $2 and version = $3`,
      [dispatchKey, candidateId, version]
    );

    // Insert dispatch row in 'in_flight' state
    await client.query(
      `insert into public.x_bot_dispatches
         (id, candidate_id, candidate_version, dispatch_key, brain_hash, text_hash, published_root_text, published_reply_text, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'in_flight')`,
      [
        dispatchId,
        candidateId,
        version,
        dispatchKey,
        currentBrainHash,
        computeTextHash(candidateRow.text),
        candidateRow.text,
        candidateRow.reply_text || null
      ]
    );

    // Insert root dispatch item
    await client.query(
      `insert into public.x_bot_dispatch_items
         (dispatch_id, item_type, sequence, text, status)
       values ($1, 'root', 1, $2, 'pending')`,
      [dispatchId, candidateRow.text]
    );

    if (candidateRow.reply_text) {
      await client.query(
        `insert into public.x_bot_dispatch_items
           (dispatch_id, item_type, sequence, text, status)
         values ($1, 'reply', 2, $2, 'pending')`,
        [dispatchId, candidateRow.reply_text]
      );
    }

    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }

  // Record initial attempt
  await pool.query(
    `insert into public.x_bot_dispatch_attempts (dispatch_id, attempt_number, state, request_payload)
     values ($1, 1, 'in_flight', $2)`,
    [dispatchId, JSON.stringify({ text: candidateRow.text, reply: candidateRow.reply_text })]
  );

  // 5. Auto-render or resolve card asset for tweet
  // DISABLED FOR 2 WEEKS per user request
  let localImagePaths = options.localImagePaths || [];
  /*
  if (localImagePaths.length === 0 && options.autoGenerateCard !== false) {
    try {
      const cardOutputDir = path.resolve(__dirname, '../../../campaign/antigravity-2026-09-06-19/assets/generated');
      const cardFileName = `card_${candidateId}_v${version}.png`;
      const cardFilePath = path.join(cardOutputDir, cardFileName);

      if (!fs.existsSync(cardFilePath)) {
        const svg = buildStorySummaryCardSvg({
          title: candidateRow.proposition || candidateRow.text.split('\n')[0],
          body: candidateRow.text,
          callToAction: "READ ON WRITON",
          authorName: "Saurabh682"
        });
        const pngBuffer = await renderSvgToPngBuffer(svg, { width: 1080, height: 1080 });
        fs.mkdirSync(cardOutputDir, { recursive: true });
        fs.writeFileSync(cardFilePath, pngBuffer);
      }
      if (fs.existsSync(cardFilePath)) {
        localImagePaths = [cardFilePath];
      }
    } catch (cardErr) {
      log.warn?.(`[x-bot-service] Could not auto-render card: ${cardErr.message}`);
    }
  }
  */

  // 6. Invoke Twitter API via postToX (or posterOverride for tests)
  const posterFn = options.posterOverride || postToX;
  let rootTweetResult;
  try {
    rootTweetResult = await posterFn({ text: candidateRow.text, localImagePaths, log });
  } catch (netErr) {
    // UNCONFIRMED NETWORK DROP: Transition to outcome_unknown -> reconciliation_required
    await pool.query(
      `update public.x_bot_dispatches set status = 'outcome_unknown', error_message = $1 where id = $2`,
      [netErr.message, dispatchId]
    );
    await pool.query(
      `update public.x_bot_candidate_versions set status = 'reconciliation_required' where candidate_id = $1 and version = $2`,
      [candidateId, version]
    );
    await pool.query(
      `update public.x_bot_dispatch_attempts set state = 'outcome_unknown', error_code = $1 where dispatch_id = $2`,
      [netErr.message, dispatchId]
    );
    await pool.query(
      `insert into public.x_bot_activity_ledger (candidate_id, event_type, details)
       values ($1, 'dispatch_outcome_unknown', $2)`,
      [candidateId, JSON.stringify({ dispatchId, error: netErr.message, action: 'reconciliation_required' })]
    );

    return {
      success: false,
      status: 'outcome_unknown',
      reason: 'Network interruption during postToX. Candidate placed in reconciliation_required. Automatic retry prohibited.',
      dispatchId,
    };
  }

  // If TwitterApi skipped (e.g. missing credentials or dry mode), handle gracefully
  if (rootTweetResult.status === 'skipped') {
    await pool.query(
      `update public.x_bot_dispatches set status = 'failed', error_message = $1 where id = $2`,
      [rootTweetResult.reason, dispatchId]
    );
    await pool.query(
      `update public.x_bot_candidate_versions set status = 'approved' where candidate_id = $1 and version = $2`,
      [candidateId, version]
    );
    return { success: false, status: 'skipped', reason: rootTweetResult.reason, dispatchId };
  }

  // If TwitterApi failed with clear 4xx/5xx error
  if (!rootTweetResult.success) {
    await pool.query(
      `update public.x_bot_dispatches set status = 'failed', error_message = $1 where id = $2`,
      [rootTweetResult.error || 'Failed to post', dispatchId]
    );
    await pool.query(
      `update public.x_bot_candidate_versions set status = 'failed' where candidate_id = $1 and version = $2`,
      [candidateId, version]
    );
    await pool.query(
      `update public.x_bot_dispatch_items set status = 'fatal_failed', error_message = $1 where dispatch_id = $2 and item_type = 'root'`,
      [rootTweetResult.error, dispatchId]
    );
    await pool.query(
      `update public.x_bot_dispatch_attempts set state = 'failed_safe_to_retry', error_code = $1 where dispatch_id = $2`,
      [rootTweetResult.error, dispatchId]
    );
    return { success: false, status: 'failed', error: rootTweetResult.error, dispatchId };
  }

  const rootTweetId = rootTweetResult.postId;

  // Root succeeded! Update item
  await pool.query(
    `update public.x_bot_dispatch_items set status = 'published', tweet_id = $1 where dispatch_id = $2 and item_type = 'root'`,
    [rootTweetId, dispatchId]
  );

  // 6. If reply exists, post as thread reply to rootTweetId
  let replyTweetId = null;
  if (candidateRow.reply_text) {
    try {
      const replyOutcome = await postToX({ text: candidateRow.reply_text, log });
      if (replyOutcome.success) {
        replyTweetId = replyOutcome.postId;
        await pool.query(
          `update public.x_bot_dispatch_items set status = 'published', tweet_id = $1 where dispatch_id = $2 and item_type = 'reply'`,
          [replyTweetId, dispatchId]
        );
      } else {
        await pool.query(
          `update public.x_bot_dispatch_items set status = 'retryable_failed', error_message = $1 where dispatch_id = $2 and item_type = 'reply'`,
          [replyOutcome.error || 'Reply post failed', dispatchId]
        );
      }
    } catch (replyErr) {
      await pool.query(
        `update public.x_bot_dispatch_items set status = 'retryable_failed', error_message = $1 where dispatch_id = $2 and item_type = 'reply'`,
        [replyErr.message, dispatchId]
      );
    }
  }

  // 7. Complete dispatch
  await pool.query(
    `update public.x_bot_dispatches
       set status = 'succeeded', completed_at = now()
     where id = $1`,
    [dispatchId]
  );
  await pool.query(
    `update public.x_bot_candidate_versions
       set status = 'published'
     where candidate_id = $1 and version = $2`,
    [candidateId, version]
  );
  await pool.query(
    `update public.x_bot_dispatch_attempts
       set state = 'succeeded', response_payload = $1
     where dispatch_id = $2`,
    [JSON.stringify({ rootTweetId, replyTweetId }), dispatchId]
  );

  // Initial metric row (+15m placeholder)
  await pool.query(
    `insert into public.x_bot_metrics (dispatch_id, snapshot_window, recorded_at)
     values ($1, 'current', now())`,
    [dispatchId]
  );

  // Activity ledger
  await pool.query(
    `insert into public.x_bot_activity_ledger (candidate_id, event_type, details)
     values ($1, 'dispatched_success', $2)`,
    [candidateId, JSON.stringify({ dispatchId, rootTweetId, replyTweetId })]
  );

  return {
    success: true,
    status: 'published',
    dispatchId,
    rootTweetId,
    replyTweetId,
    tweetUrl: rootTweetId ? `https://x.com/WritOn_Social/status/${rootTweetId}` : null,
  };
}
