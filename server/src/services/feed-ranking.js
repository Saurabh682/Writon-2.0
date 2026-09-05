import { createHash } from 'node:crypto';

export const FEED_RANKING_VERSION = 'writon-feed-v1';
export const SUPPORTED_CONTENT_LANGUAGES = new Set(['en', 'hi', 'bn', 'mr', 'es', 'fr', 'ur', 'und']);

const POOL_PATTERN = [
  'preferred', 'preferred', 'affinity', 'preferred', 'preferred',
  'exploration', 'preferred', 'affinity', 'preferred', 'preferred',
];

function clamp(value, minimum = 0, maximum = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.min(maximum, Math.max(minimum, numeric));
}

function stableUnit(value) {
  const digest = createHash('sha256').update(String(value)).digest();
  return digest.readUInt32BE(0) / 0xffffffff;
}

export function stableBucket(value) {
  return Math.floor(stableUnit(value) * 100);
}

export function normalizeLanguage(language) {
  const normalized = String(language ?? '').trim().toLowerCase().split('-')[0];
  return SUPPORTED_CONTENT_LANGUAGES.has(normalized) ? normalized : 'en';
}

export function determineFeedMode({
  profileId,
  evidenceCount = 0,
  completedStories = 0,
  hasStrongSignal = false,
  behaviorRolloutPercent = 0,
  holdoutPercent = 10,
  shadowEnabled = true,
  guestLearningEnabled = false,
  hasGuestVector = false,
}) {
  if (!profileId) {
    return guestLearningEnabled && hasGuestVector ? 'guest_behavior' : 'guest_base';
  }

  const eligible = evidenceCount >= 5 || completedStories >= 2 || hasStrongSignal;
  if (!eligible) return 'base';

  const bucket = stableBucket(profileId);
  const boundedHoldout = clamp(holdoutPercent, 0, 100);
  const boundedRollout = clamp(behaviorRolloutPercent, 0, 100 - boundedHoldout);
  if (bucket < boundedHoldout) return 'control';
  if (bucket < boundedHoldout + boundedRollout) return 'behavior';
  return shadowEnabled ? 'shadow' : 'base';
}

function visibleScore(candidate, mode, seed) {
  const freshness = clamp(candidate.freshness);
  const humanQuality = clamp(candidate.humanQuality);
  const explicitInterest = clamp(candidate.explicitInterest);
  const topicAffinity = clamp(candidate.topicAffinity);
  const deepReadFit = clamp(candidate.deepReadFit);
  const authorAffinity = clamp(candidate.authorAffinity);
  const penalties = clamp(candidate.repetitionPenalty, 0, 0.6)
    + clamp(candidate.quickExitPenalty, 0, 0.4);
  const jitter = stableUnit(`${seed}:${candidate.id}`) * 0.0001;

  if (mode === 'control') return freshness - penalties + jitter;
  if (mode === 'behavior' || mode === 'guest_behavior') {
    return (
      (0.35 * topicAffinity)
      + (0.30 * deepReadFit)
      + (0.15 * authorAffinity)
      + (0.10 * freshness)
      + (0.10 * humanQuality)
      - penalties
      + jitter
    );
  }
  return (
    (0.50 * explicitInterest)
    + (0.25 * humanQuality)
    + (0.25 * freshness)
    - penalties
    + jitter
  );
}

export function scoreCandidates(candidates, mode, seed) {
  return candidates.map((candidate) => ({
    ...candidate,
    rankingScore: visibleScore(candidate, mode, seed),
    shadowBehaviorScore: mode === 'shadow'
      ? visibleScore(candidate, 'behavior', seed)
      : null,
  }));
}

function orderCandidates(candidates, mode, seed, exploration = false) {
  return scoreCandidates(candidates, mode, seed).sort((left, right) => {
    if (exploration) {
      const exposureDifference = Number(left.exposureCount ?? 0) - Number(right.exposureCount ?? 0);
      if (exposureDifference !== 0) return exposureDifference;
    }
    if (right.rankingScore !== left.rankingScore) return right.rankingScore - left.rankingScore;
    return String(left.id).localeCompare(String(right.id));
  });
}

function respectsDiversity(candidate, selected, pageAuthorCounts) {
  if ((pageAuthorCounts.get(candidate.authorId) ?? 0) >= 2) return false;
  const recentCategories = selected.slice(-9).filter((item) => item.category === candidate.category).length;
  return recentCategories < 3;
}

function takeCandidate(pool, selected, selectedIds, pageAuthorCounts) {
  const index = pool.findIndex((candidate) => (
    !selectedIds.has(candidate.id)
    && respectsDiversity(candidate, selected, pageAuthorCounts)
  ));
  if (index < 0) return null;
  const [candidate] = pool.splice(index, 1);
  return candidate;
}

function classifyFallback(candidate, preferredLanguage) {
  if (candidate.languageCode === preferredLanguage) return 'preferred';
  if (candidate.languageAffinity > 0 || candidate.topicAffinity > 0 || candidate.authorAffinity > 0) {
    return 'affinity';
  }
  return 'fallback';
}

/**
 * Builds a stable session snapshot. With sufficient inventory every ten results
 * contain seven preferred-language, two cross-language affinity, and one
 * exploration story. Diversity is enforced while selecting, never after.
 */
export function composeFeed({ candidates, preferredLanguage, mode, seed, maximumItems = 60 }) {
  const language = normalizeLanguage(preferredLanguage);
  const scored = scoreCandidates(candidates, mode, seed);
  const hasCrossLanguageAffinity = (candidate) => candidate.languageCode !== language && (
    candidate.languageAffinity > 0.05
    || candidate.topicAffinity > 0.10
    || candidate.authorAffinity > 0.10
  );
  const preferred = orderCandidates(
    scored.filter((candidate) => candidate.languageCode === language), mode, seed
  );
  const affinity = orderCandidates(
    scored.filter(hasCrossLanguageAffinity), mode, seed
  );
  const exploration = orderCandidates(
    scored.filter((candidate) => candidate.languageCode !== language && !hasCrossLanguageAffinity(candidate)),
    mode,
    seed,
    true
  );
  const fallback = orderCandidates(scored, mode, seed);
  const pools = { preferred, affinity, exploration };
  const selected = [];
  const selectedIds = new Set();
  let pageAuthorCounts = new Map();

  for (let position = 0; position < maximumItems; position += 1) {
    if (position > 0 && position % 20 === 0) pageAuthorCounts = new Map();
    const requestedPool = POOL_PATTERN[position % POOL_PATTERN.length];
    let candidate = takeCandidate(pools[requestedPool], selected, selectedIds, pageAuthorCounts);
    let candidatePool = requestedPool;

    if (!candidate) {
      candidate = takeCandidate(fallback, selected, selectedIds, pageAuthorCounts);
      if (!candidate) break;
      candidatePool = classifyFallback(candidate, language);
    }

    selectedIds.add(candidate.id);
    pageAuthorCounts.set(candidate.authorId, (pageAuthorCounts.get(candidate.authorId) ?? 0) + 1);
    selected.push({ ...candidate, candidatePool, rankPosition: position });
  }

  return selected;
}

export function encodeFeedCursor(sessionId, nextRank) {
  return Buffer.from(JSON.stringify({ sessionId, nextRank }), 'utf8').toString('base64url');
}

export function decodeFeedCursor(cursor) {
  try {
    const parsed = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    if (!/^[0-9a-f-]{36}$/i.test(parsed.sessionId)) return null;
    if (!Number.isInteger(parsed.nextRank) || parsed.nextRank < 0 || parsed.nextRank > 10_000) return null;
    return parsed;
  } catch {
    return null;
  }
}
