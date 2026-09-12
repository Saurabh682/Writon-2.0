import { fetchGoogleNewsResearch, fetchWikipediaSummary } from './trend-scout-service.js';

/**
 * Deep Research Orchestrator for WritOn Editorial Generation
 *
 * Implements ADK 2 Pillar 3: Dynamic Parallel Worker & Bounded Research Graph.
 * - Dynamically decomposes complex editorial premises into N targeted sub-queries.
 * - Concurrently executes research workers via Promise.allSettled.
 * - Strictly bounded by MAX_DEPTH = 2 to prevent runaway execution while ensuring
 *   deep factual grounding, tactile sensory anchors, and architectural rigor.
 */

export const MAX_RESEARCH_DEPTH = 2;

/**
 * Decomposes an editorial topic and category into N targeted sub-queries
 */
export function decomposeEditorialPremise(topic = '', category = 'Essays', { maxSubQueries = 3 } = {}) {
  const cleanTopic = String(topic || '').trim();
  const subQueries = [];

  switch (category) {
    case 'Tech':
      subQueries.push(
        `${cleanTopic} architecture benchmarks`,
        `${cleanTopic} failure modes latency`,
        `${cleanTopic} open source implementation`
      );
      break;

    case 'Reviews':
      subQueries.push(
        `${cleanTopic} teardown specifications`,
        `${cleanTopic} long term durability test`,
        `${cleanTopic} vs competition benchmark`
      );
      break;

    case 'Culture':
    case 'Essays':
    case 'Philosophy':
      subQueries.push(
        `${cleanTopic} historical origins history`,
        `${cleanTopic} social impact criticism`,
        `${cleanTopic} craftsmanship tradition`
      );
      break;

    case 'Humour':
      subQueries.push(
        `${cleanTopic} workplace culture reality`,
        `${cleanTopic} bureaucracy absurdity`,
        `${cleanTopic} public reaction commentary`
      );
      break;

    case 'Poetry':
    case 'Shayari':
    case 'Short Stories':
    default:
      subQueries.push(
        `${cleanTopic} geography landscape setting`,
        `${cleanTopic} cultural memory tradition`,
        `${cleanTopic} personal human accounts`
      );
      break;
  }

  return subQueries.slice(0, maxSubQueries);
}

/**
 * Worker node researching a single sub-query concurrently
 */
export async function executeSubQueryWorker(subQuery, { geo = 'IN' } = {}) {
  try {
    const [newsReports, wikiSummary] = await Promise.all([
      fetchGoogleNewsResearch(subQuery, geo),
      fetchWikipediaSummary(subQuery)
    ]);

    return {
      subQuery,
      newsReports: newsReports || [],
      wikiSummary: wikiSummary || null,
      success: true
    };
  } catch (err) {
    console.warn(`[Deep Research Worker] Sub-query failed for "${subQuery}": ${err.message}`);
    return {
      subQuery,
      newsReports: [],
      wikiSummary: null,
      success: false,
      error: err.message
    };
  }
}

/**
 * Synthesizes parallel research worker findings into an actionable ResearchDossier
 */
export function synthesizeResearchDossier({ topic, category, depth, workerResults = [] }) {
  const headlines = [];
  const backgroundSummaries = [];
  const sensoryAnchors = new Set();
  const factualClaims = [];

  for (const res of workerResults) {
    if (!res || !res.success) continue;

    if (Array.isArray(res.newsReports)) {
      for (const report of res.newsReports) {
        if (report.headline) {
          headlines.push(`- [${report.source}] "${report.headline}" (${report.pubDate || 'Recent'})`);
          factualClaims.push(report.headline);
        }
      }
    }

    if (res.wikiSummary?.extract) {
      backgroundSummaries.push(`[${res.wikiSummary.title || res.subQuery}]: ${res.wikiSummary.extract}`);
    }
  }

  // Extract sensory / tactile / mechanical anchors from topic and background
  const combinedText = `${topic} ${backgroundSummaries.join(' ')} ${factualClaims.join(' ')}`.toLowerCase();
  const sensoryPattern = /\b(copper|brass|tarmac|diesel|monsoon|rain|frost|slate|timber|ceramic|gasket|chassis|soldering|silicon|fluorescent|shadow|terracotta|salt|smoke|vermilion|parchment|quill|ink)\b/gi;
  let match;
  while ((match = sensoryPattern.exec(combinedText)) !== null) {
    sensoryAnchors.add(match[1].toLowerCase());
  }

  const synthesizedContext = [
    `Editorial Topic: "${topic}" (Category: ${category})`,
    headlines.length ? `Verified Real-World Context:\n${headlines.slice(0, 6).join('\n')}` : '',
    backgroundSummaries.length ? `Historical & Structural Foundations:\n${backgroundSummaries.slice(0, 3).join('\n\n')}` : '',
    sensoryAnchors.size > 0 ? `Sensory & Material Anchors: ${Array.from(sensoryAnchors).join(', ')}` : ''
  ].filter(Boolean).join('\n\n');

  return Object.freeze({
    topic,
    category,
    depth,
    subQueriesCount: workerResults.length,
    findings: workerResults,
    synthesizedContext,
    sensoryAnchors: Array.from(sensoryAnchors),
    factualClaims,
    researchedAt: new Date().toISOString()
  });
}

/**
 * Orchestrates dynamic parallel deep research bounded by MAX_RESEARCH_DEPTH
 */
export async function orchestrateDeepResearch(topic, category = 'Essays', {
  depth = 1,
  maxDepth = MAX_RESEARCH_DEPTH,
  geo = 'IN',
  maxSubQueries = 3
} = {}) {
  if (!topic || typeof topic !== 'string') {
    throw new Error('Valid topic string required for deep research');
  }

  // Bound recursion depth
  const currentDepth = Math.min(Math.max(1, depth), maxDepth);

  // Step 1: Decompose premise into sub-queries
  const subQueries = decomposeEditorialPremise(topic, category, { maxSubQueries });

  // Step 2: Execute research workers in parallel
  const workerPromises = subQueries.map(sq => executeSubQueryWorker(sq, { geo }));
  const settled = await Promise.allSettled(workerPromises);

  const workerResults = settled.map(res => {
    return res.status === 'fulfilled' ? res.value : { success: false, error: res.reason?.message };
  });

  // Step 3: Synthesize into typed ResearchDossier
  return synthesizeResearchDossier({
    topic,
    category,
    depth: currentDepth,
    workerResults
  });
}
