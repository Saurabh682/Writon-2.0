/**
 * Jev Experiment Telemetry & Comparison Logger (Phase 1B: Live Shadow Evaluation)
 * 
 * Records structured evaluation logs for both Trend Triage and Article QA stages.
 * Provides durable in-memory buffered metrics + persistent storage to bot_activity_logs.
 * Computes:
 * - Adjudicated correctness (VALUABLE, LOW_VALUE, DUPLICATE, AMBIGUOUS, NOT_REVIEWED)
 * - False negatives & High-confidence false negatives
 * - Rejection breakdown by reason (duplicate, low_relevance, low_newsworthiness, weak_worth_covering, etc.)
 * - Confidence calibration buckets (0.00-0.49, 0.50-0.69, 0.70-0.79, 0.80-0.89, 0.90-1.00)
 * - Decision margins (topChoice, runnerUp, margin)
 * - True economic cost metrics (actual input/output tokens & LLM model cost)
 * - Latency percentiles (p50, p90, p95, p99) and error categorization
 * - Most Dangerous Decisions (high-confidence auto-reject of qualified/valuable topics)
 * - Best Saves (accurate auto-reject of duplicates/low-value topics confirmed by editorial)
 */

import { randomUUID } from 'node:crypto';

// In-memory ring buffer of evaluation events for fast querying
const MAX_BUFFERED_EVENTS = 1000;
const evaluationEventsBuffer = [];

// Realistic empirical pricing per 1K calls/tokens (as of 2026)
const COST_BENCHMARKS = {
  jevCostPerEvaluation: 0.00025, // ~$0.25 per 1,000 Jev System One evaluations
  // Gemini 3.5 Flash typical generation (~800 prompt tokens, ~600 output tokens): ~$0.005
  geminiFlashTypicalCallCost: 0.005,
  // Gemini 3.1 Pro typical generation: ~$0.025
  geminiProTypicalCallCost: 0.025
};

export const ADJUDICATED_RESULTS = {
  VALUABLE: 'VALUABLE',
  LOW_VALUE: 'LOW_VALUE',
  DUPLICATE: 'DUPLICATE',
  AMBIGUOUS: 'AMBIGUOUS',
  NOT_REVIEWED: 'NOT_REVIEWED'
};

/**
 * Records an experiment evaluation event (both memory buffer and persistent db)
 */
export async function recordJevEvaluation(pool, eventData) {
  const record = {
    id: eventData.id || randomUUID(),
    experiment_id: eventData.experimentId || 'jev_exp_v1',
    experiment_type: 'jev_decision_layer',
    experiment_version: 'phase_1c',
    policy_version: 'phase_1c_baseline_v1',
    timestamp: eventData.timestamp || new Date().toISOString(),
    stage: eventData.stage, // 'trend_triage' | 'article_qa'
    source_item_id: eventData.sourceItemId || null,
    topic: eventData.topic || null,
    jev_model: eventData.jevModel || 'jev-1.13.0',
    input_tokens: eventData.inputTokens || null,
    latency_ms: eventData.latencyMs || 0,
    questions: eventData.questions || {},
    raw_structured_decisions: eventData.rawAnswers || {},
    confidence: Number((eventData.confidence || 0).toFixed(3)),
    policy_result: eventData.policyResult || 'NEEDS_LLM_REVIEW',
    rejection_category: eventData.rejectionCategory || null,
    top_choice_probability: eventData.topChoiceProbability !== undefined ? Number(eventData.topChoiceProbability.toFixed(3)) : null,
    runner_up_probability: eventData.runnerUpProbability !== undefined ? Number(eventData.runnerUpProbability.toFixed(3)) : null,
    decision_margin: eventData.decisionMargin !== undefined ? Number(eventData.decisionMargin.toFixed(3)) : null,
    reasons: eventData.reasons || [],
    existing_system_result: eventData.existingSystemResult || 'unknown',
    production_action_taken: eventData.productionActionTaken || (['qualified', 'seeded'].includes(String(eventData.existingSystemResult).toLowerCase()) ? 'seeded_to_backlog' : 'watchlisted_or_rejected'),
    llm_called: Boolean(eventData.llmCalled),
    estimated_llm_call_avoided: Boolean(eventData.estimatedLlmCallAvoided),
    adjudicated_result: eventData.adjudicatedResult || ADJUDICATED_RESULTS.NOT_REVIEWED,
    adjudication_notes: eventData.adjudicationNotes || null,
    final_real_world_outcome: eventData.finalRealWorldOutcome || null,
    error: eventData.error || null,
    error_type: eventData.errorType || (eventData.error ? (eventData.error.includes('timeout') ? 'timeout' : 'api_error') : null),
    language_script_bypass: Boolean(eventData.languageScriptBypass),
    shadow_mode: eventData.shadowMode !== false
  };

  // Add to in-memory buffer
  evaluationEventsBuffer.unshift(record);
  if (evaluationEventsBuffer.length > MAX_BUFFERED_EVENTS) {
    evaluationEventsBuffer.pop();
  }

  // Attempt database recording if pool is supplied and connected
  if (pool && typeof pool.query === 'function') {
    try {
      await pool.query(`
        insert into public.bot_activity_logs (
          id, bot_id, action_type, details, status, error_message, created_at
        ) values ($1, null, 'spark_reaction', $2, $3, $4, now())
      `, [
        record.id,
        JSON.stringify({ ...record, kind: `jev_experiment_${record.stage}` }),
        record.error ? 'failed' : 'success',
        record.error || null
      ]).catch(err => {
        // Non-blocking telemetry fallback
        console.debug('[Jev Telemetry] DB persistence skipped:', err.message);
      });
    } catch (_) {}
  }

  return record;
}

/**
 * Returns all currently buffered evaluation events
 */
export function getBufferedJevEvents(limit = 100) {
  return evaluationEventsBuffer.slice(0, limit);
}

/**
 * Updates manual adjudication for a specific experiment event
 */
/**
 * Updates manual adjudication for a specific experiment event.
 * Validates event existence, verifies experiment namespace, and keeps raw model evidence immutable.
 */
export async function updateEventAdjudication(pool, eventId, { adjudicatedResult, adjudicationNotes, reviewerId = null }) {
  if (!eventId || typeof eventId !== 'string') {
    const err = new Error('Invalid event ID provided.');
    err.statusCode = 400;
    throw err;
  }

  if (!Object.values(ADJUDICATED_RESULTS).includes(adjudicatedResult)) {
    const err = new Error(`Invalid adjudicatedResult: ${adjudicatedResult}. Allowed: ${Object.values(ADJUDICATED_RESULTS).join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // Sanitize notes: trim and limit length to 2000 characters
  const cleanNotes = adjudicationNotes ? String(adjudicationNotes).trim().slice(0, 2000) : null;
  const adjudicatedAt = new Date().toISOString();

  // 1. Check in-memory buffer
  const memEvent = evaluationEventsBuffer.find(e => e.id === eventId || e.source_item_id === eventId);
  if (memEvent) {
    if (memEvent.experiment_type && memEvent.experiment_type !== 'jev_decision_layer') {
      const err = new Error('Event does not belong to jev_decision_layer experiment.');
      err.statusCode = 403;
      throw err;
    }
    memEvent.adjudicated_result = adjudicatedResult;
    memEvent.adjudication_notes = cleanNotes;
    memEvent.adjudicated_at = adjudicatedAt;
    if (reviewerId) memEvent.adjudicated_by = reviewerId;
  }

  // 2. Check and update persistent db if connected
  let dbEventFound = false;
  if (pool && typeof pool.query === 'function') {
    try {
      // First verify event exists and belongs to jev_decision_layer
      const checkRes = await pool.query(`
        select id, details from public.bot_activity_logs
        where (id = $1 or details->>'source_item_id' = $1)
        limit 1
      `, [eventId]);

      if (checkRes.rows.length === 0) {
        if (!memEvent) {
          const err = new Error(`Event with ID '${eventId}' not found.`);
          err.statusCode = 404;
          throw err;
        }
      } else {
        const row = checkRes.rows[0];
        const details = typeof row.details === 'object' ? row.details : JSON.parse(row.details || '{}');
        if (details.experiment_type && details.experiment_type !== 'jev_decision_layer') {
          const err = new Error('Event does not belong to jev_decision_layer experiment.');
          err.statusCode = 403;
          throw err;
        }

        // Apply additive adjudication metadata without touching raw answers, questions, or confidence
        await pool.query(`
          update public.bot_activity_logs
          set details = details || $1::jsonb
          where id = $2
        `, [
          JSON.stringify({
            adjudicated_result: adjudicatedResult,
            adjudication_notes: cleanNotes,
            adjudicated_at: adjudicatedAt,
            adjudicated_by: reviewerId || 'editorial_reviewer'
          }),
          row.id
        ]);
        dbEventFound = true;
      }
    } catch (err) {
      if (err.statusCode) throw err;
      console.debug('[Jev Telemetry] DB adjudication update notice:', err.message);
    }
  }

  if (!memEvent && !dbEventFound) {
    const err = new Error(`Event with ID '${eventId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  return memEvent || {
    id: eventId,
    adjudicated_result: adjudicatedResult,
    adjudication_notes: cleanNotes,
    adjudicated_at: adjudicatedAt,
    adjudicated_by: reviewerId || 'editorial_reviewer'
  };
}

/**
 * Calculates percentile of an array of numbers
 */
function calculatePercentile(values, p) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * Computes comprehensive experiment evaluation report with Phase 1B metrics
 */
export function generateExperimentReport(events = null, { filter = null } = {}) {
  let actualEvents = Array.isArray(events) ? events : evaluationEventsBuffer;

  if (filter === 'disagreement') {
    actualEvents = actualEvents.filter(e => {
      const existingAccepted = ['qualified', 'seeded', 'generate', 'candidate'].includes(String(e.existing_system_result).toLowerCase());
      const existingRejected = ['rejected', 'watchlist', 'skip', 'blocked'].includes(String(e.existing_system_result).toLowerCase());
      const jevAccepted = e.policy_result === 'AUTO_ACCEPT';
      const jevRejected = e.policy_result === 'AUTO_REJECT';
      return !((existingAccepted && jevAccepted) || (existingRejected && jevRejected));
    });
  }

  const triageEvents = actualEvents.filter(e => e.stage === 'trend_triage');
  const qaEvents = actualEvents.filter(e => e.stage === 'article_qa');

  function calculateTriageMetrics(items) {
    if (items.length === 0) {
      return {
        totalEvaluated: 0,
        sampleSufficiency: { current: 0, targetMinimum: 100, preferred: 250, percentComplete: 0 },
        agreementRate: 0,
        disagreements: 0,
        adjudicatedAccuracy: 0,
        falseNegativeCount: 0,
        falseNegativeRate: 0,
        highConfidenceFalseNegatives: [],
        llmCallsSaved: 0,
        valuableContentLost: 0,
        uncertainRate: 0,
        latencyPercentiles: { p50: 0, p90: 0, p95: 0, p99: 0 },
        operationalHealth: { timeouts: 0, apiErrors: 0, malformedResponses: 0, successCount: 0 },
        costAnalysis: { jevCost: 0, estimatedLlmCostSaved: 0, netSavings: 0, savingsPer100Trends: 0 },
        rejectionBreakdown: {},
        calibrationBuckets: {},
        mostDangerousDecisions: [],
        bestSaves: [],
        representativeDisagreements: []
      };
    }

    let agreements = 0;
    let disagreements = 0;
    let llmCallsSaved = 0;
    let valuableContentLost = 0;
    let falseNegativeCount = 0;
    let uncertainCount = 0;
    let totalConfidence = 0;
    const latencies = [];
    const highConfidenceFalseNegatives = [];
    const representativeDisagreements = [];
    const mostDangerousDecisions = [];
    const bestSaves = [];

    // Operational counters
    let timeouts = 0;
    let apiErrors = 0;
    let malformedResponses = 0;
    let successCount = 0;

    // Reason breakdown buckets
    const rejectionBreakdown = {
      duplicate: { evaluated: 0, correct: 0, falseFlags: 0, ambiguous: 0 },
      low_relevance: { evaluated: 0, correct: 0, falseFlags: 0, ambiguous: 0 },
      low_newsworthiness: { evaluated: 0, correct: 0, falseFlags: 0, ambiguous: 0 },
      weak_worth_covering: { evaluated: 0, correct: 0, falseFlags: 0, ambiguous: 0 },
      content_type_skip: { evaluated: 0, correct: 0, falseFlags: 0, ambiguous: 0 },
      low_confidence: { evaluated: 0, correct: 0, falseFlags: 0, ambiguous: 0 },
      combined_policy: { evaluated: 0, correct: 0, falseFlags: 0, ambiguous: 0 }
    };

    // Confidence calibration buckets: 0.00-0.49, 0.50-0.69, 0.70-0.79, 0.80-0.89, 0.90-1.00
    const calibrationBuckets = {
      '0.00-0.49': { count: 0, agreements: 0, falsePositives: 0, falseNegatives: 0, adjudicatedCorrect: 0 },
      '0.50-0.69': { count: 0, agreements: 0, falsePositives: 0, falseNegatives: 0, adjudicatedCorrect: 0 },
      '0.70-0.79': { count: 0, agreements: 0, falsePositives: 0, falseNegatives: 0, adjudicatedCorrect: 0 },
      '0.80-0.89': { count: 0, agreements: 0, falsePositives: 0, falseNegatives: 0, adjudicatedCorrect: 0 },
      '0.90-1.00': { count: 0, agreements: 0, falsePositives: 0, falseNegatives: 0, adjudicatedCorrect: 0 }
    };

    function getBucketKey(conf) {
      if (conf < 0.50) return '0.00-0.49';
      if (conf < 0.70) return '0.50-0.69';
      if (conf < 0.80) return '0.70-0.79';
      if (conf < 0.90) return '0.80-0.89';
      return '0.90-1.00';
    }

    let adjudicatedReviewedCount = 0;
    let adjudicatedCorrectCount = 0;

    for (const item of items) {
      if (item.error) {
        if (item.error_type === 'timeout' || item.error.toLowerCase().includes('timeout')) {
          timeouts++;
        } else if (item.error_type === 'malformed' || item.error.toLowerCase().includes('json')) {
          malformedResponses++;
        } else {
          apiErrors++;
        }
        continue;
      }

      successCount++;
      const conf = Number((item.confidence || 0).toFixed(3));
      const lat = item.latency_ms || 0;
      totalConfidence += conf;
      latencies.push(lat);

      const bucketKey = getBucketKey(conf);
      calibrationBuckets[bucketKey].count++;

      const existingAccepted = ['qualified', 'seeded', 'generate', 'candidate'].includes(
        String(item.existing_system_result).toLowerCase()
      );
      const existingRejected = ['rejected', 'watchlist', 'skip', 'blocked'].includes(
        String(item.existing_system_result).toLowerCase()
      );

      const jevAccepted = item.policy_result === 'AUTO_ACCEPT';
      const jevRejected = item.policy_result === 'AUTO_REJECT';
      const jevUncertain = item.policy_result === 'NEEDS_LLM_REVIEW';

      const adjudicated = item.adjudicated_result || ADJUDICATED_RESULTS.NOT_REVIEWED;
      const isAdjudicatedValuable = adjudicated === ADJUDICATED_RESULTS.VALUABLE;
      const isAdjudicatedLowValue = adjudicated === ADJUDICATED_RESULTS.LOW_VALUE || adjudicated === ADJUDICATED_RESULTS.DUPLICATE;

      if (adjudicated !== ADJUDICATED_RESULTS.NOT_REVIEWED) {
        adjudicatedReviewedCount++;
        if ((jevAccepted && isAdjudicatedValuable) || (jevRejected && isAdjudicatedLowValue)) {
          adjudicatedCorrectCount++;
          calibrationBuckets[bucketKey].adjudicatedCorrect++;
        }
      }

      // Check for agreement vs disagreement with existing system
      if (jevUncertain) {
        uncertainCount++;
      } else if ((existingAccepted && jevAccepted) || (existingRejected && jevRejected)) {
        agreements++;
        calibrationBuckets[bucketKey].agreements++;
      } else {
        disagreements++;
        if (representativeDisagreements.length < 20) {
          representativeDisagreements.push({
            id: item.id,
            topic: item.topic || item.source_item_id,
            existingDecision: item.existing_system_result,
            jevDecision: item.policy_result,
            confidence: conf,
            decisionMargin: item.decision_margin,
            rejectionCategory: item.rejection_category,
            reasons: item.reasons || [],
            adjudicatedResult: item.adjudicated_result,
            adjudicationNotes: item.adjudication_notes,
            productionActionTaken: item.production_action_taken
          });
        }
      }

      // False Negatives Tracking: Jev rejects, but editorial or ground truth determined it was VALUABLE
      if (jevRejected && (isAdjudicatedValuable || (adjudicated === ADJUDICATED_RESULTS.NOT_REVIEWED && existingAccepted && item.final_real_world_outcome === 'published_successfully'))) {
        falseNegativeCount++;
        calibrationBuckets[bucketKey].falseNegatives++;
        if (conf >= 0.85) {
          highConfidenceFalseNegatives.push({
            id: item.id,
            topic: item.topic,
            confidence: conf,
            rejectionCategory: item.rejection_category,
            reasons: item.reasons,
            adjudicatedResult: item.adjudicated_result
          });
        }
      }

      // Rejection category accounting
      if (jevRejected && item.rejection_category && rejectionBreakdown[item.rejection_category]) {
        const catStats = rejectionBreakdown[item.rejection_category];
        catStats.evaluated++;
        if (isAdjudicatedLowValue || item.adjudicated_result === ADJUDICATED_RESULTS.DUPLICATE) {
          catStats.correct++;
        } else if (isAdjudicatedValuable) {
          catStats.falseFlags++;
        } else {
          catStats.ambiguous++;
        }
      }

      // Most Dangerous Decisions (High confidence Jev AUTO_REJECT while existing system qualified)
      if (jevRejected && existingAccepted) {
        mostDangerousDecisions.push({
          id: item.id,
          topic: item.topic,
          confidence: conf,
          decisionMargin: item.decision_margin,
          rejectionCategory: item.rejection_category,
          reasons: item.reasons,
          adjudicatedResult: item.adjudicated_result,
          threatScore: Number((conf * (isAdjudicatedValuable ? 2.0 : 1.0)).toFixed(2))
        });
      }

      // Best Saves (WritOn would have called LLM, Jev rejected, and editorial adjudication confirmed low value or duplicate)
      if (jevRejected && existingAccepted && (isAdjudicatedLowValue || item.rejection_category === 'duplicate')) {
        bestSaves.push({
          id: item.id,
          topic: item.topic,
          confidence: conf,
          rejectionCategory: item.rejection_category,
          reasons: item.reasons,
          adjudicatedResult: item.adjudicated_result
        });
      }

      // Economic savings: Jev safely rejected an item where LLM would have been called
      if (existingAccepted && jevRejected) {
        llmCallsSaved++;
      }
      if (existingAccepted && jevRejected && (isAdjudicatedValuable || item.final_real_world_outcome === 'published_successfully')) {
        valuableContentLost++;
      }
    }

    // Sort Most Dangerous Decisions descending by threatScore/confidence
    mostDangerousDecisions.sort((a, b) => (b.threatScore || b.confidence) - (a.threatScore || a.confidence));
    bestSaves.sort((a, b) => b.confidence - a.confidence);

    const validCount = items.length - (timeouts + apiErrors + malformedResponses);
    const avgConfidence = validCount > 0 ? totalConfidence / validCount : 0;
    const agreementRate = (agreements + disagreements) > 0 ? agreements / (agreements + disagreements) : 0;
    const uncertainRate = items.length > 0 ? uncertainCount / items.length : 0;
    const falseNegativeRate = items.length > 0 ? falseNegativeCount / items.length : 0;
    const adjudicatedAccuracy = adjudicatedReviewedCount > 0 ? adjudicatedCorrectCount / adjudicatedReviewedCount : 0;

    // Latency percentiles
    const p50 = calculatePercentile(latencies, 50);
    const p90 = calculatePercentile(latencies, 90);
    const p95 = calculatePercentile(latencies, 95);
    const p99 = calculatePercentile(latencies, 99);

    // Economic costs
    const jevCost = items.length * COST_BENCHMARKS.jevCostPerEvaluation;
    const estimatedLlmCostSaved = llmCallsSaved * COST_BENCHMARKS.geminiFlashTypicalCallCost;
    const netSavings = Math.max(0, estimatedLlmCostSaved - jevCost);
    const savingsPer100 = items.length > 0 ? (netSavings / items.length) * 100 : 0;

    return {
      totalEvaluated: items.length,
      sampleSufficiency: {
        current: items.length,
        targetMinimum: 100,
        preferred: 250,
        percentComplete: Number(((items.length / 100) * 100).toFixed(1))
      },
      agreementRate: Number(agreementRate.toFixed(3)),
      adjudicatedAccuracy: Number(adjudicatedAccuracy.toFixed(3)),
      adjudicatedReviewsCount: adjudicatedReviewedCount,
      falseNegativeCount,
      falseNegativeRate: Number(falseNegativeRate.toFixed(3)),
      highConfidenceFalseNegatives,
      uncertainRate: Number(uncertainRate.toFixed(3)),
      llmCallsSaved,
      valuableContentLost,
      averageConfidence: Number(avgConfidence.toFixed(3)),
      latencyPercentiles: { p50, p90, p95, p99 },
      operationalHealth: {
        successCount,
        timeouts,
        apiErrors,
        malformedResponses,
        errorRate: items.length > 0 ? Number(((timeouts + apiErrors + malformedResponses) / items.length).toFixed(3)) : 0
      },
      costAnalysis: {
        jevCost: Number(jevCost.toFixed(4)),
        estimatedLlmCostSaved: Number(estimatedLlmCostSaved.toFixed(4)),
        netSavings: Number(netSavings.toFixed(4)),
        savingsPer100Trends: Number(savingsPer100.toFixed(4))
      },
      rejectionBreakdown,
      calibrationBuckets,
      mostDangerousDecisions: mostDangerousDecisions.slice(0, 10),
      bestSaves: bestSaves.slice(0, 10),
      representativeDisagreements: representativeDisagreements.slice(0, 20)
    };
  }

  return {
    experimentId: 'jev_exp_v1',
    generatedAt: new Date().toISOString(),
    totalEvaluations: actualEvents.length,
    triageMetrics: calculateTriageMetrics(triageEvents),
    qaMetrics: {
      totalEvaluated: qaEvents.length,
      autoPassed: qaEvents.filter(e => e.policy_result === 'AUTO_ACCEPT').length,
      autoRejected: qaEvents.filter(e => e.policy_result === 'AUTO_REJECT').length,
      reviewRequired: qaEvents.filter(e => e.policy_result === 'NEEDS_LLM_REVIEW').length,
      errors: qaEvents.filter(e => e.error).length
    }
  };
}
