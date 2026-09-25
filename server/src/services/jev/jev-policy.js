/**
 * Jev Decision Policy Layer
 * 
 * Takes raw structured evidence from Jev (probabilities, scores, choices, confidence)
 * and applies deterministic application policy rules to produce actionable outcomes:
 * 
 * Possible Policy Results:
 * - AUTO_ACCEPT
 * - NEEDS_LLM_REVIEW
 * - AUTO_REJECT
 * 
 * Separates raw evidence from decision thresholds so thresholds can be tuned
 * cleanly from configuration without changing prompts or models.
 */

export const POLICY_VERSION = 'phase_1c_baseline_v1';

export const DECISION_OUTCOMES = {
  AUTO_ACCEPT: 'AUTO_ACCEPT',
  NEEDS_LLM_REVIEW: 'NEEDS_LLM_REVIEW',
  AUTO_REJECT: 'AUTO_REJECT'
};

const DEFAULT_THRESHOLDS = {
  minRelevance: 0.55,
  minWorthCovering: 0.60,
  maxDuplicateProbability: 0.65,
  minConfidence: 0.60
};

/**
 * Extracts numeric value from Jev answer whether it is a noul, score, or choice
 */
function extractValue(answer) {
  if (!answer || typeof answer !== 'object') return null;
  if (typeof answer.score === 'number') return answer.score;
  if (typeof answer.noul === 'number') return answer.noul;
  if (typeof answer.value === 'number') return answer.value;
  return null;
}

function extractConfidence(answer) {
  if (!answer || typeof answer !== 'object') return 0.5;
  if (typeof answer.confidence === 'number') return answer.confidence;
  return 0.5;
}

/**
 * Evaluates Spark Trend Triage answers against policy
 * 
 * @param {Object} answers - Jev response answers map
 * @param {Object} [thresholds] - Tunable thresholds
 * @returns {{
 *   outcome: 'AUTO_ACCEPT' | 'NEEDS_LLM_REVIEW' | 'AUTO_REJECT',
 *   confidence: number,
 *   reasons: string[],
 *   metrics: {
 *     worthCovering: number,
 *     writonRelevance: number,
 *     newsworthiness: number,
 *     evergreenPotential: number,
 *     likelyDuplicate: number,
 *     recommendedContentType: string
 *   }
 * }}
 */
export function evaluateTrendTriagePolicy(answers = {}, thresholds = {}) {
  const config = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const reasons = [];

  const worthCovering = extractValue(answers.worth_covering) ?? 0.5;
  const writonRelevance = extractValue(answers.writon_relevance) ?? 0.5;
  const newsworthiness = extractValue(answers.newsworthiness) ?? 0.5;
  const evergreenPotential = extractValue(answers.evergreen_potential) ?? 0.5;
  const likelyDuplicate = extractValue(answers.likely_duplicate) ?? 0.0;
  const recommendedContentType = answers.recommended_content_type?.choice || 'essay';

  // Compute aggregate confidence across primary decision questions
  const confidences = [
    extractConfidence(answers.worth_covering),
    extractConfidence(answers.writon_relevance),
    extractConfidence(answers.likely_duplicate)
  ];
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  const metrics = {
    worthCovering,
    writonRelevance,
    newsworthiness,
    evergreenPotential,
    likelyDuplicate,
    recommendedContentType
  };

  // Calculate decision margin for recommended_content_type if probabilities or choices exist
  let topChoiceProbability = 0;
  let runnerUpProbability = 0;
  let decisionMargin = 0;
  const choiceObj = answers.recommended_content_type;
  if (choiceObj && choiceObj.probabilities && typeof choiceObj.probabilities === 'object') {
    const sorted = Object.values(choiceObj.probabilities).sort((a, b) => b - a);
    topChoiceProbability = sorted[0] || 0;
    runnerUpProbability = sorted[1] || 0;
    decisionMargin = Number((topChoiceProbability - runnerUpProbability).toFixed(3));
  } else if (choiceObj && typeof choiceObj.confidence === 'number') {
    topChoiceProbability = choiceObj.confidence;
    runnerUpProbability = Number((1 - topChoiceProbability).toFixed(3));
    decisionMargin = Number((topChoiceProbability - runnerUpProbability).toFixed(3));
  }

  // Categorize primary rejection reason
  let rejectionCategory = null;
  const hasDuplicate = likelyDuplicate > config.maxDuplicateProbability;
  const hasContentTypeSkip = recommendedContentType === 'skip';
  const hasLowRelevance = writonRelevance < config.minRelevance;
  const hasWeakWorth = worthCovering < config.minWorthCovering;
  const hasLowNewsworthiness = newsworthiness < 0.40;

  const failFactorsCount = [hasDuplicate, hasContentTypeSkip, hasLowRelevance, hasWeakWorth, hasLowNewsworthiness].filter(Boolean).length;
  if (failFactorsCount > 1) {
    rejectionCategory = 'combined_policy';
  } else if (hasDuplicate) {
    rejectionCategory = 'duplicate';
  } else if (hasContentTypeSkip) {
    rejectionCategory = 'content_type_skip';
  } else if (hasLowRelevance) {
    rejectionCategory = 'low_relevance';
  } else if (hasWeakWorth) {
    rejectionCategory = 'weak_worth_covering';
  } else if (hasLowNewsworthiness) {
    rejectionCategory = 'low_newsworthiness';
  } else if (avgConfidence < config.minConfidence) {
    rejectionCategory = 'low_confidence';
  }

  // Rule 1: High duplicate probability or explicit 'skip'
  if (likelyDuplicate > config.maxDuplicateProbability) {
    reasons.push(`Likely duplicate probability (${likelyDuplicate.toFixed(2)}) exceeds threshold (${config.maxDuplicateProbability})`);
  }
  if (recommendedContentType === 'skip') {
    reasons.push('Jev recommended skipping this content type');
  }

  // Rule 2: Low relevance or unworthy of coverage
  if (writonRelevance < config.minRelevance) {
    reasons.push(`WritOn relevance (${writonRelevance.toFixed(2)}) is below threshold (${config.minRelevance})`);
  }
  if (worthCovering < config.minWorthCovering) {
    reasons.push(`Worth covering probability (${worthCovering.toFixed(2)}) is below threshold (${config.minWorthCovering})`);
  }

  // Determine outcome based on signals and confidence
  if (reasons.length > 0) {
    // If signals are poor and confidence is high -> AUTO_REJECT
    if (avgConfidence >= config.minConfidence) {
      return {
        outcome: DECISION_OUTCOMES.AUTO_REJECT,
        confidence: avgConfidence,
        reasons,
        rejectionCategory,
        topChoiceProbability,
        runnerUpProbability,
        decisionMargin,
        metrics
      };
    }
    // If signals are poor but confidence is low/ambiguous -> NEEDS_LLM_REVIEW
    return {
      outcome: DECISION_OUTCOMES.NEEDS_LLM_REVIEW,
      confidence: avgConfidence,
      reasons: [...reasons, `Low confidence (${avgConfidence.toFixed(2)}) in rejection`],
      rejectionCategory: rejectionCategory || 'low_confidence',
      topChoiceProbability,
      runnerUpProbability,
      decisionMargin,
      metrics
    };
  }

  // Signals are positive
  if (avgConfidence >= config.minConfidence) {
    return {
      outcome: DECISION_OUTCOMES.AUTO_ACCEPT,
      confidence: avgConfidence,
      reasons: ['Relevance, substantive value, and novelty meet qualification criteria'],
      rejectionCategory: null,
      topChoiceProbability,
      runnerUpProbability,
      decisionMargin,
      metrics
    };
  }

  // Signals are positive but borderline confidence -> NEEDS_LLM_REVIEW
  return {
    outcome: DECISION_OUTCOMES.NEEDS_LLM_REVIEW,
    confidence: avgConfidence,
    reasons: [`Positive signals but confidence (${avgConfidence.toFixed(2)}) is below high-certainty gate (${config.minConfidence})`],
    rejectionCategory: 'low_confidence',
    topChoiceProbability,
    runnerUpProbability,
    decisionMargin,
    metrics
  };
}

/**
 * Evaluates Post-Generation Article QA answers against policy
 * 
 * @param {Object} answers - Jev response answers map
 * @param {Object} [thresholds] - Tunable thresholds
 * @returns {{
 *   outcome: 'AUTO_ACCEPT' | 'NEEDS_LLM_REVIEW' | 'AUTO_REJECT',
 *   confidence: number,
 *   reasons: string[],
 *   metrics: Object
 * }}
 */
export function evaluateArticleQAPolicy(answers = {}, thresholds = {}) {
  const reasons = [];

  const personaFit = extractValue(answers.persona_fit) ?? 0.7;
  const topicSpecificity = extractValue(answers.topic_specificity) ?? 0.7;
  const genericAiLanguage = extractValue(answers.generic_ai_language) ?? 0.0;
  const openingIsGeneric = extractValue(answers.opening_is_generic) ?? 0.0;
  const recentContentOverlap = extractValue(answers.recent_content_overlap) ?? 0.0;
  const headlineContentAlignment = extractValue(answers.headline_content_alignment) ?? 0.8;
  const readerValue = extractValue(answers.reader_value) ?? 0.8;
  const requiresAdditionalReview = extractValue(answers.requires_additional_review) ?? 0.0;

  const confidences = [
    extractConfidence(answers.persona_fit),
    extractConfidence(answers.generic_ai_language),
    extractConfidence(answers.reader_value)
  ];
  const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  const metrics = {
    personaFit,
    topicSpecificity,
    genericAiLanguage,
    openingIsGeneric,
    recentContentOverlap,
    headlineContentAlignment,
    readerValue,
    requiresAdditionalReview
  };

  // Red flags for rejection
  if (genericAiLanguage > 0.65) {
    reasons.push(`High generic AI language detected (${genericAiLanguage.toFixed(2)})`);
  }
  if (openingIsGeneric > 0.70) {
    reasons.push(`Opening is generic throat-clearing preamble (${openingIsGeneric.toFixed(2)})`);
  }
  if (personaFit < 0.45) {
    reasons.push(`Poor persona fit score (${personaFit.toFixed(2)})`);
  }
  if (recentContentOverlap > 0.70) {
    reasons.push(`Excessive narrative repetition with recent pieces (${recentContentOverlap.toFixed(2)})`);
  }

  if (reasons.length > 0) {
    return {
      outcome: avgConfidence >= 0.65 ? DECISION_OUTCOMES.AUTO_REJECT : DECISION_OUTCOMES.NEEDS_LLM_REVIEW,
      confidence: avgConfidence,
      reasons,
      metrics
    };
  }

  // Yellow flags for human/critic review
  if (requiresAdditionalReview > 0.50 || topicSpecificity < 0.55 || headlineContentAlignment < 0.60) {
    return {
      outcome: DECISION_OUTCOMES.NEEDS_LLM_REVIEW,
      confidence: avgConfidence,
      reasons: ['Borderline topic specificity or requires additional review flag raised'],
      metrics
    };
  }

  return {
    outcome: DECISION_OUTCOMES.AUTO_ACCEPT,
    confidence: avgConfidence,
    reasons: ['Draft passed persona fit, anti-slop, and craft quality dimensions'],
    metrics
  };
}
