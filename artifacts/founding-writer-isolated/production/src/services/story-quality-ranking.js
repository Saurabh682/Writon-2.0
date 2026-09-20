export const QUALITY_MIN_SAMPLE_SIZE = 5;
export const QUALITY_PRIOR_STRENGTH = 8;

function boundedCount(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function clamp(value, minimum = 0, maximum = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.min(maximum, Math.max(minimum, numeric));
}

function cohortKey(candidate) {
  return String(candidate.contentForm || 'other').trim().toLowerCase() || 'other';
}

function percentile(value, population) {
  if (population.length < 2) return 0.5;
  let lower = 0;
  let equal = 0;
  for (const member of population) {
    if (member < value) lower += 1;
    else if (member === value) equal += 1;
  }
  return clamp((lower + ((equal - 1) / 2)) / (population.length - 1));
}

function smoothedRate(successes, trials, priorMean) {
  return (successes + (priorMean * QUALITY_PRIOR_STRENGTH))
    / (trials + QUALITY_PRIOR_STRENGTH);
}

/**
 * Adds decay-free, form-cohort quality evidence for private shadow ranking.
 * Fewer than five human-reader observations remain neutral by design.
 */
export function normalizeStoryQuality(candidates) {
  const prepared = candidates.map((candidate) => {
    const reads = boundedCount(candidate.qualityReadCount);
    return {
      ...candidate,
      qualityReadCount: reads,
      qualityCompletionCount: Math.min(reads, boundedCount(candidate.qualityCompletionCount)),
      qualityBookmarkCount: Math.min(reads, boundedCount(candidate.qualityBookmarkCount)),
      qualityCohort: cohortKey(candidate),
    };
  });

  const cohorts = new Map();
  for (const candidate of prepared) {
    const cohort = cohorts.get(candidate.qualityCohort) ?? [];
    cohort.push(candidate);
    cohorts.set(candidate.qualityCohort, cohort);
  }

  return prepared.map((candidate) => {
    const cohort = cohorts.get(candidate.qualityCohort);
    const totalReads = cohort.reduce((sum, item) => sum + item.qualityReadCount, 0);
    const completionPrior = totalReads > 0
      ? cohort.reduce((sum, item) => sum + item.qualityCompletionCount, 0) / totalReads
      : 0.5;
    const bookmarkPrior = totalReads > 0
      ? cohort.reduce((sum, item) => sum + item.qualityBookmarkCount, 0) / totalReads
      : 0.1;
    const eligible = cohort.filter((item) => item.qualityReadCount >= QUALITY_MIN_SAMPLE_SIZE);
    const completionRates = eligible.map((item) => smoothedRate(
      item.qualityCompletionCount, item.qualityReadCount, completionPrior,
    ));
    const bookmarkRates = eligible.map((item) => smoothedRate(
      item.qualityBookmarkCount, item.qualityReadCount, bookmarkPrior,
    ));

    if (candidate.qualityReadCount < QUALITY_MIN_SAMPLE_SIZE) {
      return { ...candidate, normalizedQuality: 0.5 };
    }

    const completionRate = smoothedRate(
      candidate.qualityCompletionCount, candidate.qualityReadCount, completionPrior,
    );
    const bookmarkRate = smoothedRate(
      candidate.qualityBookmarkCount, candidate.qualityReadCount, bookmarkPrior,
    );
    const evidenceConfidence = candidate.qualityReadCount
      / (candidate.qualityReadCount + QUALITY_PRIOR_STRENGTH);
    const cohortPercentile = (0.8 * percentile(completionRate, completionRates))
      + (0.2 * percentile(bookmarkRate, bookmarkRates));
    return {
      ...candidate,
      normalizedQuality: clamp(0.5 + ((cohortPercentile - 0.5) * evidenceConfidence)),
    };
  });
}
