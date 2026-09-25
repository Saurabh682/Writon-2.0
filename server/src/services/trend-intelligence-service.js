/**
 * Trend Intelligence Service for WritOn
 * 
 * Ingests research telemetry from Gemini Spark, normalizes canonical signals,
 * tracks time-based velocity & dual lifecycle statuses, evaluates independent
 * evidence confidence without SSRF, screens sensitivity, scores WritOn opportunities,
 * ranks candidate personas, and seeds qualified items into the ideas backlog.
 */

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { LEGACY_WRITER_PERSONAS } from '../bot-engine/legacy-writer-personas.js';
import { JevDecisionService } from './jev/jev-service.js';

// Schema for individual source evidence entries
export const trendSourceSchema = z.object({
  platform: z.string().trim().min(1),
  url: z.string().trim().url(),
  title: z.string().trim().optional(),
  observedAt: z.string().datetime({ offset: true }).optional(),
  signalType: z.string().trim().default('OBSERVED')
});

// Schema for individual trend items within Spark payload (supporting both frozen naming and backwards-compatible aliases)
export const trendItemSchema = z.object({
  rank: z.number().int().positive().optional(),
  topic: z.string().trim().min(2).max(300),
  category: z.string().trim().optional(),
  priorityScore: z.number().int().min(0).max(100).optional(),
  score: z.number().int().min(0).max(100).optional(),
  sourceStatus: z.enum(['BREAKOUT', 'RISING', 'GROWING', 'STABLE', 'FALLING']).optional(),
  status: z.enum(['BREAKOUT', 'RISING', 'GROWING', 'STABLE', 'FALLING']).optional(),
  momentum: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  platforms: z.array(z.string().trim()).default([]),
  keywords: z.array(z.string().trim()).default([]),
  longTailKeywords: z.array(z.string().trim()).default([]),
  whyTrending: z.string().trim().optional(),
  contentOpportunity: z.string().trim().optional(),
  recommendedAngles: z.array(z.string().trim()).default([]),
  sources: z.array(trendSourceSchema).default([]),
  urgency: z.enum(['ACT_NOW', 'THIS_WEEK', 'EVERGREEN']).default('THIS_WEEK'),
  sourceConfidence: z.number().min(0.0).max(1.0).optional(),
  confidence: z.number().min(0.0).max(1.0).optional()
}).transform(val => {
  const effectiveScore = val.priorityScore !== undefined ? val.priorityScore : (val.score !== undefined ? val.score : 50);
  let rawStatus = val.sourceStatus || val.status || 'RISING';
  if (rawStatus === 'GROWING') rawStatus = 'RISING';
  const effectiveStatus = rawStatus;
  const effectiveConfidence = val.sourceConfidence !== undefined ? val.sourceConfidence : (val.confidence !== undefined ? val.confidence : 0.5);
  return {
    ...val,
    score: effectiveScore,
    priorityScore: effectiveScore,
    status: effectiveStatus,
    sourceStatus: effectiveStatus,
    confidence: effectiveConfidence,
    sourceConfidence: effectiveConfidence
  };
});

// Full incoming Spark Trend Intelligence payload schema
export const sparkPayloadSchema = z.object({
  externalRunId: z.string().trim().min(1).optional(),
  observedAt: z.string().datetime({ offset: true }).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  region: z.string().trim().default('India'),
  source: z.string().trim().default('gemini-trend-research'),
  runType: z.string().trim().default('daily'),
  schemaVersion: z.string().trim().default('1.0.0'),
  trends: z.array(trendItemSchema).default([])
});

/**
 * Computes deterministic SHA-256 hash of the payload
 */
export function calculatePayloadHash(payload) {
  // externalRunId is excluded: it identifies the Spark execution,
  // not the research content. Same content under different run IDs = same hash.
  const { externalRunId, ...content } = payload;
  const normalized = JSON.stringify(content, Object.keys(content).sort());
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Slugs a string for canonical keying
 */
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/**
 * Zero-SSRF purely syntactic evidence evaluation
 * Analyzes structure, protocol, domain diversity, and recognized hostnames
 */
const RECOGNIZED_REPUTABLE_HOSTS = new Set([
  'google.com', 'trends.google.com', 'x.com', 'twitter.com', 'reddit.com',
  'github.com', 'news.ycombinator.com', 'reuters.com', 'bloomberg.com',
  'nytimes.com', 'theverge.com', 'wired.com', 'techcrunch.com', 'nature.com',
  'arxiv.org', 'thehindu.com', 'indianexpress.com', 'scroll.in', 'thewire.in',
  'livemint.com', 'bbc.com', 'economist.com', 'wsj.com', 'substacks.com', 'medium.com',
  'thenewstack.io', 'relevantmagazine.com', 'silentbook.club', 'ndtv.com', 'smashingmagazine.com'
]);

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /\.local$/i,
  /\.internal$/i
];

export function evaluateSyntacticEvidence(sources = []) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return {
      computedEvidenceConfidence: 0.30,
      validSourceCount: 0,
      uniqueDomainsCount: 0,
      reputableDomainMatches: 0
    };
  }

  const validDomains = new Set();
  let reputableMatches = 0;
  let validCount = 0;

  for (const src of sources) {
    if (!src || typeof src.url !== 'string') continue;
    try {
      const parsed = new URL(src.url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') continue;

      // Normalize hostname: lowercase, remove trailing dot
      let hostname = parsed.hostname.toLowerCase();
      if (hostname.endsWith('.')) hostname = hostname.slice(0, -1);

      // Block SSRF, loopback, private IPv4/IPv6, or local domains
      const isBlocked = BLOCKED_HOST_PATTERNS.some(pat => pat.test(hostname)) ||
        hostname.includes(':') || // Raw IPv6 literal or port artifact
        !hostname.includes('.'); // Unqualified single-word host

      if (isBlocked) continue;

      validCount++;

      // Exact domain extraction (e.g. www.reuters.com -> reuters.com, trends.google.com -> google.com)
      const domainParts = hostname.split('.');
      const rootDomain = domainParts.length >= 2 ? domainParts.slice(-2).join('.') : hostname;
      validDomains.add(rootDomain);

      // Strict match against recognized set (hostname exactly or exact root domain)
      if (RECOGNIZED_REPUTABLE_HOSTS.has(hostname) || RECOGNIZED_REPUTABLE_HOSTS.has(rootDomain)) {
        reputableMatches++;
      }
    } catch {
      // Ignore invalid URL parse
    }
  }

  const uniqueDomainsCount = validDomains.size;
  // Multi-factor confidence calculation
  let confidence = 0.35;
  if (validCount >= 1) confidence += 0.15;
  if (validCount >= 3) confidence += 0.15;
  if (uniqueDomainsCount >= 2) confidence += 0.15;
  if (uniqueDomainsCount >= 3) confidence += 0.10;
  if (reputableMatches >= 1) confidence += 0.10;

  const clampedConfidence = Math.min(1.0, Math.max(0.1, Number(confidence.toFixed(2))));

  return {
    computedEvidenceConfidence: clampedConfidence,
    validSourceCount: validCount,
    uniqueDomainsCount,
    reputableDomainMatches: reputableMatches
  };
}

/**
 * Policy-Based Sensitivity Classification
 */
const SENSITIVITY_PATTERNS = {
  crime: /\b(murder|rape|homicide|assault|lynching|arrested|extortion|smuggling|heist|kidnap|robbery)\b/i,
  political: /\b(election|poll|bjp|congress|parliament|lok sabha|mla|mp|minister|party candidate|modi|rahul gandhi|manifesto)\b/i,
  health: /\b(outbreak|epidemic|virus|vaccine death|suicide|overdose|cancer cure|remedy claim|pandemic)\b/i,
  financial: /\b(crypto pump|airdrop|guaranteed return|forex scam|ponzi|get rich|100x gem)\b/i,
  breaking_news: /\b(breaking|urgent|just in|blast|explosion|earthquake|crash|derailment)\b/i,
  reputation_risk: /\b(scam|fraud|leak|defamation|boycott|exposed|lawsuit)\b/i
};

export function classifySensitivity(topic, whyTrending = '', keywords = []) {
  const corpus = `${topic} ${whyTrending} ${keywords.join(' ')}`.toLowerCase();

  for (const [sClass, regex] of Object.entries(SENSITIVITY_PATTERNS)) {
    if (regex.test(corpus)) {
      return sClass;
    }
  }

  return 'safe';
}

/**
 * Computes domain alignment to WritOn's core editorial genres:
 * Tech, Essays, Culture, Reviews, Philosophy, Short Stories (0–100)
 */
const DOMAIN_KEYWORDS = {
  tech: ['ai', 'software', 'agent', 'code', 'engineer', 'system', 'hardware', 'latency', 'model', 'computing', 'developer', 'architecture', 'database', 'privacy', 'open source', 'robotics'],
  essays_craft: ['writing', 'author', 'book', 'reading', 'essay', 'literature', 'story', 'prose', 'poetry', 'novel', 'language', 'words', 'craft', 'journalism', 'narrative'],
  culture_society: ['delhi', 'bengaluru', 'mumbai', 'india', 'urban', 'workplace', 'generation', 'slow living', 'cinema', 'art', 'music', 'food', 'community', 'craftsmanship', 'heritage', 'monsoon', 'architecture'],
  philosophy: ['solitude', 'attention', 'silence', 'memory', 'time', 'boredom', 'modernity', 'ethics', 'thought', 'distraction', 'reflection', 'stillness']
};

export function calculateWritOnRelevance(topic, category = '', angles = [], keywords = []) {
  const text = `${topic} ${category} ${angles.join(' ')} ${keywords.join(' ')}`.toLowerCase();
  let score = 40; // baseline

  let matchedCategories = 0;
  for (const [dom, wordList] of Object.entries(DOMAIN_KEYWORDS)) {
    let matches = 0;
    for (const word of wordList) {
      if (text.includes(word)) matches++;
    }
    if (matches > 0) {
      matchedCategories++;
      score += Math.min(20, matches * 7);
    }
  }

  // Bonus for multiple intersecting domains (e.g. AI + Writing, Tech + Culture)
  if (matchedCategories >= 2) score += 10;

  return Math.min(100, Math.max(10, score));
}

/**
 * Computes velocity and lifecycle status from observation timestamps
 */
export function computeVelocityAndStatus(currentScore, previousSnapshot, currentObservedAt) {
  if (!previousSnapshot) {
    return {
      scoreDelta: 0,
      elapsedHours: 0,
      velocityPerDay: 0,
      computedStatus: currentScore >= 80 ? 'BREAKOUT' : currentScore >= 60 ? 'RISING' : 'STABLE'
    };
  }

  const prevTime = new Date(previousSnapshot.observed_at || previousSnapshot.snapshot_date).getTime();
  const currTime = new Date(currentObservedAt).getTime();
  const elapsedMillis = Math.max(0, currTime - prevTime);
  const elapsedHours = Number((elapsedMillis / (1000 * 3600)).toFixed(2));

  const scoreDelta = currentScore - previousSnapshot.score;

  // Normalized velocity per 24 hours, clamped to a minimum 6-hour interval
  const effectiveHours = Math.max(6.0, elapsedHours);
  const velocityPerDay = Number(((scoreDelta / effectiveHours) * 24.0).toFixed(2));

  let computedStatus = 'STABLE';
  if (velocityPerDay >= 15 || (scoreDelta >= 20 && elapsedHours <= 48)) {
    computedStatus = 'BREAKOUT';
  } else if (velocityPerDay >= 5 || scoreDelta >= 8) {
    computedStatus = 'RISING';
  } else if (velocityPerDay <= -5 || scoreDelta <= -10) {
    computedStatus = 'FALLING';
  }

  return {
    scoreDelta,
    elapsedHours,
    velocityPerDay,
    computedStatus
  };
}

/**
 * Resolves or merges canonical topic signal
 */
export async function resolveCanonicalSignal(client, topic, keywords = [], category = null) {
  const targetSlug = slugify(topic);
  const cleanKeywords = keywords.map(k => k.toLowerCase().trim()).filter(Boolean);

  // 1. Direct slug match
  const directMatch = await client.query(`
    select * from public.trend_signals where slug = $1 limit 1
  `, [targetSlug]);

  if (directMatch.rows.length > 0) {
    return { signal: directMatch.rows[0], merged: false };
  }

  // 2. Check alias or high keyword overlap in existing signals
  const candidates = await client.query(`
    select * from public.trend_signals
    where $1 = any(aliases)
       or canonical_topic ilike $2
    limit 5
  `, [topic, `%${topic.slice(0, 20)}%`]);

  if (candidates.rows.length > 0) {
    const existing = candidates.rows[0];
    // Merge alias
    await client.query(`
      update public.trend_signals
      set aliases = array_append(aliases, $1)
      where id = $2 and not ($1 = any(aliases))
    `, [topic, existing.id]);

    return { signal: existing, merged: true };
  }

  // 3. Create fresh canonical signal
  const insertRes = await client.query(`
    insert into public.trend_signals (
      slug, canonical_topic, aliases, normalized_keywords, category
    ) values ($1, $2, $3, $4, $5)
    returning *
  `, [targetSlug, topic, [topic], cleanKeywords, category]);

  return { signal: insertRes.rows[0], merged: false };
}

/**
 * Novelty calculation: checks recent occurrences in published posts and backlog
 */
export async function calculateNovelty(client, canonicalTopic, keywords = []) {
  const sampleWords = [canonicalTopic, ...keywords].slice(0, 5);
  let matchCount = 0;

  for (const word of sampleWords) {
    if (!word || word.length < 3) continue;
    const res = await client.query(`
      select count(*)::int as cnt from public.posts
      where created_at >= now() - interval '60 days'
        and (title ilike $1 or summary ilike $1)
    `, [`%${word}%`]);
    matchCount += res.rows[0]?.cnt || 0;
  }

  if (matchCount === 0) return 95;
  if (matchCount <= 2) return 80;
  if (matchCount <= 5) return 60;
  return 35;
}

/**
 * Ranks candidate personas from the 100 WritOn craft personas.
 * Evaluates primary category anchoring, lens/vocabulary alignment, anti-goal adherence,
 * and current run workload distribution to avoid stacking all topics on a single persona.
 */
export function rankPersonaCandidates(topic, category = '', angles = [], limit = 4, assignedCounts = new Map()) {
  const normCategory = (category || '').trim();
  const text = `${topic} ${category} ${angles.join(' ')}`.toLowerCase();

  const scored = LEGACY_WRITER_PERSONAS.map(persona => {
    let affinity = 40; // baseline

    // 1. Strict Category Alignment (Primary Anchor)
    const hasCategory = persona.categories.some(c => c.toLowerCase() === normCategory.toLowerCase());
    if (hasCategory) {
      affinity += 35;
      // Bonus if it's the author's primary (first) category
      if (persona.categories[0]?.toLowerCase() === normCategory.toLowerCase()) {
        affinity += 10;
      }
    } else {
      affinity -= 20; // Category mismatch penalty
    }

    const promptLower = (persona.personaPrompt || '').toLowerCase();
    const bioLower = (persona.bio || '').toLowerCase();

    // 2. Anti-goal negative matching (respecting explicit author constraints)
    if (text.includes('software') || text.includes('ai') || text.includes('mcp') || text.includes('developer')) {
      if (promptLower.includes('never write about startups') || promptLower.includes('never write about software engineering')) {
        affinity -= 45;
      }
    }

    // 3. Domain & Intellectual Lens Matching
    if (normCategory === 'Tech') {
      if (promptLower.includes('backend') || promptLower.includes('systems') || promptLower.includes('distributed')) {
        if (text.includes('burnout') || text.includes('fatigue') || text.includes('tax') || text.includes('concurrency')) affinity += 15;
      }
      if (promptLower.includes('software') || promptLower.includes('craft') || promptLower.includes('codecraft')) {
        if (text.includes('agent') || text.includes('workflow') || text.includes('protocol') || text.includes('editor')) affinity += 15;
      }
      if (promptLower.includes('developer') || promptLower.includes('fullstack')) {
        if (text.includes('agent') || text.includes('workflow') || text.includes('mcp')) affinity += 15;
      }
    } else if (normCategory === 'Short Stories' || normCategory === 'Fiction') {
      if (persona.categories.includes('Short Stories')) {
        if (text.includes('scene') || text.includes('story') || text.includes('trope') || text.includes('fiction') || text.includes('narrative')) {
          affinity += 20;
        }
      }
    } else if (normCategory === 'Essays' || normCategory === 'Philosophy') {
      if (promptLower.includes('scholar') || promptLower.includes('philosophy') || promptLower.includes('slow reading') || bioLower.includes('epistemology')) {
        if (text.includes('humanity') || text.includes('misalignment') || text.includes('prose') || text.includes('algorithm') || text.includes('quiet')) {
          affinity += 20;
        }
      }
    } else if (normCategory === 'Culture') {
      if (text.includes('newsletter') || text.includes('reading') || text.includes('sanctuary') || text.includes('substack') || text.includes('solitude')) {
        if (promptLower.includes('slow') || promptLower.includes('attention') || bioLower.includes('solitude') || bioLower.includes('memory')) {
          affinity += 20;
        }
      }
    }

    // 4. Regional setting affinity
    if (text.includes('delhi') && persona.location?.includes('Delhi')) affinity += 15;
    if (text.includes('bengaluru') && persona.location?.includes('Bengaluru')) affinity += 15;
    if (text.includes('mumbai') && persona.location?.includes('Mumbai')) affinity += 15;
    if (text.includes('kolkata') && persona.location?.includes('Kolkata')) affinity += 15;

    // 5. Workload Distribution: avoid piling all trends onto persona #0 if others are qualified
    const currentAssignments = assignedCounts.get(persona.penName) || 0;
    if (currentAssignments > 0) {
      affinity -= (currentAssignments * 12);
    }

    return {
      penName: persona.penName,
      fullName: persona.fullName,
      affinity: Math.min(99, Math.max(10, affinity)),
      location: persona.location,
      categories: persona.categories
    };
  });

  scored.sort((a, b) => b.affinity - a.affinity);
  return scored.slice(0, limit);
}

/**
 * Master Ingestion Orchestrator
 */
export async function ingestTrendReport(pool, rawPayload, options = {}) {
  const parsed = sparkPayloadSchema.parse(rawPayload);
  const payloadHash = calculatePayloadHash(parsed);
  const observedAt = parsed.observedAt ? new Date(parsed.observedAt) : new Date();
  const externalRunId = parsed.externalRunId || null;
  const jevService = options.jevService || new JevDecisionService({
    config: options.config || {},
    pool
  });

  // 1. Idempotency Check
  const existingRes = await pool.query(`
    select * from public.trend_reports
    where (source = $1 and external_run_id = $2 and external_run_id is not null)
       or (source = $1 and payload_hash = $3)
    order by created_at desc limit 1
  `, [parsed.source, externalRunId, payloadHash]);

  if (existingRes.rows.length > 0) {
    const existing = existingRes.rows[0];

    // Conflict detection: Same external_run_id but different payload_hash
    if (externalRunId && existing.external_run_id === externalRunId && existing.payload_hash !== payloadHash) {
      const err = new Error(`Conflict: external_run_id '${externalRunId}' already exists with a different payload.`);
      err.statusCode = 409;
      throw err;
    }

    // In-flight processing
    if (existing.processing_status === 'processing') {
      return {
        status: 202,
        success: true,
        reportId: existing.id,
        runId: existing.run_id,
        message: 'Trend report is currently being processed.',
        processingStatus: 'processing'
      };
    }

    // Already processed successfully
    if (existing.processing_status === 'processed') {
      return {
        status: 200,
        success: true,
        reportId: existing.id,
        runId: existing.run_id,
        isDuplicate: true,
        ...existing.processing_summary
      };
    }

    // If failed and payload_hash matches, we will retry processing this report record below
  }

  // 2. Connect client to acquire processing ownership and begin domain transaction
  const client = await pool.connect();
  let reportRecord;

  try {
    if (existingRes.rows.length > 0 && existingRes.rows[0].processing_status === 'failed') {
      // Transactional retry serialization with row lock (FOR UPDATE)
      await client.query('BEGIN');
      const lockRes = await client.query(`
        select * from public.trend_reports
        where id = $1
        for update
      `, [existingRes.rows[0].id]);

      const lockedReport = lockRes.rows[0];
      if (!lockedReport || lockedReport.processing_status === 'processing') {
        await client.query('ROLLBACK');
        return {
          status: 202,
          success: true,
          reportId: existingRes.rows[0].id,
          runId: existingRes.rows[0].run_id,
          message: 'Trend report is currently being processed by another worker.',
          processingStatus: 'processing'
        };
      }

      const updateRes = await client.query(`
        update public.trend_reports
        set processing_status = 'processing',
            processing_error = null,
            processed_at = null
        where id = $1
        returning *
      `, [lockedReport.id]);
      reportRecord = updateRes.rows[0];
    } else {
      // Insert new received report then start domain transaction
      const insertRes = await pool.query(`
        insert into public.trend_reports (
          external_run_id, payload_hash, report_date, region, source,
          run_type, schema_version, raw_payload, total_trends,
          processing_status, observed_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'processing', $10)
        returning *
      `, [
        externalRunId, payloadHash, parsed.date, parsed.region, parsed.source,
        parsed.runType, parsed.schemaVersion, JSON.stringify(parsed),
        parsed.trends.length, observedAt
      ]);
      reportRecord = insertRes.rows[0];
      await client.query('BEGIN');
    }

    const metrics = {
      received: parsed.trends.length,
      normalized: 0,
      merged: 0,
      qualified: 0,
      watchlisted: 0,
      rejected: 0,
      ideasCreated: 0,
      duplicatesPrevented: 0,
      cooldownBlocked: 0
    };

    const runPersonaAssignments = new Map();
    for (const trend of parsed.trends) {
      // 1. Resolve canonical signal
      const { signal, merged } = await resolveCanonicalSignal(
        client, trend.topic, trend.keywords, trend.category
      );
      if (merged) metrics.merged++;
      else metrics.normalized++;

      // 2. Query previous snapshot for this signal to compute velocity
      const prevSnapRes = await client.query(`
        select score, observed_at from public.trend_signal_snapshots
        where signal_id = $1
        order by observed_at desc limit 1
      `, [signal.id]);

      const prevSnap = prevSnapRes.rows[0] || null;
      const velocityData = computeVelocityAndStatus(trend.score, prevSnap, observedAt);

      // 3. Syntactic Evidence Scoring (Zero-SSRF safe)
      const evidence = evaluateSyntacticEvidence(trend.sources);

      // 4. WritOn Editorial Relevance & Novelty
      const writonRelevance = calculateWritOnRelevance(trend.topic, trend.category, trend.recommendedAngles, trend.keywords);
      const noveltyScore = await calculateNovelty(client, signal.canonical_topic, trend.keywords);

      // 5. Sensitivity Policy Screening
      const sensitivityClass = classifySensitivity(trend.topic, trend.whyTrending, trend.keywords);

      // Update Signal with computed properties
      const newPeak = Math.max(signal.peak_score || 0, trend.score);
      await client.query(`
        update public.trend_signals
        set latest_score = $1,
            peak_score = $2,
            score_delta = $3,
            velocity_per_day = $4,
            source_status = $5,
            computed_status = $6,
            momentum = $7,
            writon_relevance = $8,
            novelty_score = $9,
            source_confidence = $10,
            computed_evidence_confidence = $11,
            sensitivity_class = $12,
            last_detected_at = $13,
            detection_count = detection_count + 1,
            platforms = array_cat(platforms, $14)
        where id = $15
      `, [
        trend.score, newPeak, velocityData.scoreDelta, velocityData.velocityPerDay,
        trend.status, velocityData.computedStatus, trend.momentum,
        writonRelevance, noveltyScore, trend.confidence,
        evidence.computedEvidenceConfidence, sensitivityClass,
        observedAt, trend.platforms, signal.id
      ]);

      // 6. Insert Snapshot (linked to report_id)
      await client.query(`
        insert into public.trend_signal_snapshots (
          signal_id, report_id, snapshot_date, observed_at, rank, score,
          source_status, computed_status, momentum, score_delta,
          elapsed_hours, velocity_per_day, source_confidence,
          computed_evidence_confidence, why_trending, content_opportunity,
          recommended_angles, keywords, sources, urgency
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        on conflict (signal_id, report_id) do nothing
      `, [
        signal.id, reportRecord.id, parsed.date, observedAt, trend.rank || null,
        trend.score, trend.status, velocityData.computedStatus, trend.momentum,
        velocityData.scoreDelta, velocityData.elapsedHours, velocityData.velocityPerDay,
        trend.confidence, evidence.computedEvidenceConfidence, trend.whyTrending || null,
        trend.contentOpportunity || null, JSON.stringify(trend.recommendedAngles),
        trend.keywords, JSON.stringify(trend.sources), trend.urgency
      ]);

      // 7. Opportunity Scoring & Airlock Evaluation
      const candidatePersonas = rankPersonaCandidates(
        trend.topic, trend.category, trend.recommendedAngles, 4, runPersonaAssignments
      );
      const topPersonaAffinity = candidatePersonas[0]?.affinity || 50;

      // WritOn Opportunity Score formulation
      let oppScore = Math.round(
        (trend.score * 0.35) +
        (writonRelevance * 0.30) +
        (noveltyScore * 0.15) +
        (evidence.computedEvidenceConfidence * 100 * 0.10) +
        (topPersonaAffinity * 0.10)
      );

      // Risk Penalties
      if (sensitivityClass !== 'safe') oppScore -= 25;
      if (evidence.validSourceCount === 0) oppScore -= 15;
      oppScore = Math.min(100, Math.max(0, oppScore));

      // Qualification Gate
      let qualificationStatus = 'candidate';
      let rejectionReason = null;

      if (['unverified_claim', 'reputation_risk', 'crime'].includes(sensitivityClass)) {
        qualificationStatus = 'rejected';
        rejectionReason = `Blocked by sensitivity policy: ${sensitivityClass}`;
        metrics.rejected++;
      } else if (['political', 'breaking_news', 'health', 'financial'].includes(sensitivityClass) || oppScore < 55) {
        qualificationStatus = 'watchlist';
        metrics.watchlisted++;
      } else if (
        (trend.score >= 70 && writonRelevance >= 50 && oppScore >= 65) ||
        (trend.urgency === 'ACT_NOW' && evidence.computedEvidenceConfidence >= 0.60 && writonRelevance >= 60)
      ) {
        qualificationStatus = 'qualified';
        metrics.qualified++;
      } else {
        qualificationStatus = 'watchlist';
        metrics.watchlisted++;
      }

      // Insert into Trend Opportunities (Airlock)
      const oppInsertRes = await client.query(`
        insert into public.trend_opportunities (
          signal_id, report_id, opportunity_score, priority_score,
          writon_relevance, novelty_score, source_confidence,
          computed_evidence_confidence, sensitivity_class,
          qualification_status, rejection_reason, candidate_personas,
          recommended_angles, sources, evaluated_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
        on conflict (signal_id, report_id) do update set
          opportunity_score = excluded.opportunity_score,
          qualification_status = excluded.qualification_status,
          evaluated_at = now()
        returning *
      `, [
        signal.id, reportRecord.id, oppScore, trend.score, writonRelevance,
        noveltyScore, trend.confidence, evidence.computedEvidenceConfidence,
        sensitivityClass, qualificationStatus, rejectionReason,
        JSON.stringify(candidatePersonas), JSON.stringify(trend.recommendedAngles),
        JSON.stringify(trend.sources)
      ]);

      const opportunity = oppInsertRes.rows[0];

      // Jev Decision Layer (Stage 1: Trend Triage in Shadow Mode)
      // Runs side-by-side or asynchronously; evaluates fuzzy editorial suitability
      // without mutating existing deterministic qualificationStatus or blocking backlog seeding.
      if (jevService.isOperational()) {
        jevService.triageTrend({
          trend: { ...trend, id: opportunity?.id, slug: signal?.slug },
          existingStatus: qualificationStatus,
          recentTopics: [signal.canonical_topic]
        }).catch(err => {
          // Guaranteed fail-safe: Jev failure must never break trend ingestion
          console.warn('[Jev Shadow Triage] Non-blocking evaluation error:', err.message);
        });
      }

      // 8. Backlog Seeding Gate for Qualified Opportunities
      if (qualificationStatus === 'qualified') {
        const topPersona = candidatePersonas[0];
        const MIN_PERSONA_AFFINITY = 60; // ponytail: raise if false positives appear in backlog

        // Fail closed: no acceptable persona → do not seed, remain qualified
        if (!topPersona || topPersona.affinity < MIN_PERSONA_AFFINITY) {
          // No persona with sufficient editorial affinity for this topic.
          // Opportunity stays qualified for manual routing by editorial state machine.
        } else {
          // Check if idea already exists for this signal
          const existingIdea = await client.query(`
            select id from public.editorial_ideas_backlog
            where source_trend_signal_id = $1
               or proposed_title ilike $2
               or premise ilike $2
            limit 1
          `, [signal.id, `%${signal.canonical_topic}%`]);

          if (existingIdea.rows.length > 0) {
            metrics.duplicatesPrevented++;
          } else {
            // Check active cooldowns for persona and subject domain
            const domainSlug = slugify(signal.canonical_topic).slice(0, 40);
            const cooldownCheck = await client.query(`
              select * from public.editorial_cooldowns
              where (dimension_value = $1 or dimension_value = $2)
                and expires_at > now()
              limit 1
            `, [domainSlug, signal.canonical_topic]);

            if (cooldownCheck.rows.length > 0) {
              metrics.cooldownBlocked++;
            } else {
              // Seed idea into editorial_ideas_backlog
              const premiseText = `${trend.whyTrending || ''} ${trend.contentOpportunity || ''}`.trim() || signal.canonical_topic;
              const proposedTitle = signal.canonical_topic;
              await client.query(`
                insert into public.editorial_ideas_backlog (
                  target_author_pen_name, proposed_title, premise, genre,
                  source_type, source_trend_signal_id, source_trend_report_id,
                  source_trend_opportunity_id, trend_score, status
                ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'backlog')
              `, [
                topPersona.penName,
                proposedTitle,
                premiseText,
                trend.category ? trend.category.charAt(0).toUpperCase() + trend.category.slice(1) : 'Essays',
                'trend_intelligence',
                signal.id,
                reportRecord.id,
                opportunity.id,
                trend.score
              ]);

              // Mark opportunity as seeded
              await client.query(`
                update public.trend_opportunities
                set qualification_status = 'seeded'
                where id = $1
              `, [opportunity.id]);

              runPersonaAssignments.set(
                topPersona.penName,
                (runPersonaAssignments.get(topPersona.penName) || 0) + 1
              );
              metrics.ideasCreated++;
            }
          }
        }
      }
    }

    const summary = {
      ingestion: {
        received: metrics.received,
        normalized: metrics.normalized,
        merged: metrics.merged
      },
      editorialGate: {
        qualified: metrics.qualified,
        watchlisted: metrics.watchlisted,
        rejected: metrics.rejected
      },
      backlog: {
        ideasCreated: metrics.ideasCreated,
        duplicatesPrevented: metrics.duplicatesPrevented,
        cooldownBlocked: metrics.cooldownBlocked
      }
    };

    // Update report to processed
    await client.query(`
      update public.trend_reports
      set processing_status = 'processed',
          processed_at = now(),
          processing_summary = $1
      where id = $2
    `, [JSON.stringify(summary), reportRecord.id]);

    // Transactional Outbox: Record durable knowledge that cloud replication is required
    await client.query(`
      insert into public.trend_cloud_sync_outbox (
        report_id,
        status,
        gcs_status,
        bigquery_status,
        dirty_tables,
        sync_revision,
        next_attempt_at
      ) values ($1, 'pending', 'pending', 'pending', array['trend_reports', 'trend_signals', 'trend_signal_snapshots', 'trend_opportunities']::text[], 1, now())
      on conflict (report_id) do nothing
    `, [reportRecord.id]);

    await client.query('COMMIT');

    return {
      status: 200,
      success: true,
      reportId: reportRecord.id,
      runId: reportRecord.run_id,
      ...summary
    };
  } catch (err) {
    await client.query('ROLLBACK');
    // Mark report as failed
    await pool.query(`
      update public.trend_reports
      set processing_status = 'failed',
          processing_error = $1
      where id = $2
    `, [err.message, reportRecord.id]);
    throw err;
  } finally {
    client.release();
  }
}
